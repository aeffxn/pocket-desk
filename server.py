import argparse
import datetime
import hmac
import http.server
import ipaddress
import json
import mimetypes
import os
import secrets
import threading
import time
from pathlib import Path
from urllib.parse import parse_qs, quote, urlsplit


APP_DIR = Path(__file__).resolve().parent
SESSION_SECONDS = 8 * 60 * 60
PAIR_SECONDS = 5 * 60
MAX_BODY = 16000


def data_directory():
    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        return Path(local_app_data) / "PocketDesk"
    return Path.home() / ".pocket-desk"


def now_stamp():
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def inside(root, candidate):
    try:
        root_name = os.path.normcase(str(root))
        candidate_name = os.path.normcase(str(candidate))
        return os.path.commonpath([root_name, candidate_name]) == root_name
    except (ValueError, OSError):
        return False


class DeskState:
    def __init__(self, shared_folder, notes_path):
        self.shared_folder = Path(shared_folder).resolve(strict=True)
        if not self.shared_folder.is_dir():
            raise ValueError("The shared folder must be an existing directory.")
        self.notes_path = Path(notes_path)
        self.notes_path.parent.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.notes = self.read_notes()
        self.pair_code = ""
        self.code_expires = 0
        self.session_token = ""
        self.session_expires = 0
        self.failures = {}
        self.new_pair_code()

    def read_notes(self):
        try:
            with self.notes_path.open("r", encoding="utf-8") as file_obj:
                saved = json.load(file_obj)
            if isinstance(saved, list) and all(self.valid_note(note) for note in saved):
                return saved[:500]
        except (OSError, ValueError, TypeError):
            pass
        return []

    @staticmethod
    def valid_note(note):
        return (isinstance(note, dict) and isinstance(note.get("id"), str)
                and isinstance(note.get("title"), str) and isinstance(note.get("body"), str)
                and isinstance(note.get("updated"), str)
                and len(note.get("title", "")) <= 80 and len(note.get("body", "")) <= 1200)

    def write_notes(self):
        temporary = self.notes_path.with_suffix(".tmp")
        try:
            with temporary.open("w", encoding="utf-8", newline="\n") as file_obj:
                json.dump(self.notes, file_obj, ensure_ascii=False, indent=2)
                file_obj.write("\n")
            os.replace(str(temporary), str(self.notes_path))
            return True
        except OSError:
            try:
                temporary.unlink()
            except OSError:
                pass
            return False

    def new_pair_code(self):
        with self.lock:
            self.pair_code = "%06d" % secrets.randbelow(1000000)
            self.code_expires = time.time() + PAIR_SECONDS

    def expire_session(self):
        if self.session_token and time.time() >= self.session_expires:
            self.session_token = ""
            self.session_expires = 0
            self.new_pair_code()

    def status(self):
        with self.lock:
            self.expire_session()
            if not self.session_token and time.time() >= self.code_expires:
                self.new_pair_code()
            return {
                "paired": bool(self.session_token),
                "code": "" if self.session_token else self.pair_code,
                "seconds_left": max(0, int(self.code_expires - time.time()))
            }

    def pair(self, supplied_code, address):
        with self.lock:
            self.expire_session()
            current = time.time()
            history = self.failures.get(address, [])
            history = [stamp for stamp in history if current - stamp < 60]
            self.failures[address] = history
            if len(history) >= 5:
                return None, "Too many tries. Wait a minute and ask the laptop for a fresh code."
            if self.session_token:
                return None, "An iPad is already paired. Disconnect it from the laptop first."
            if current >= self.code_expires or not hmac.compare_digest(str(supplied_code), self.pair_code):
                history.append(current)
                self.failures[address] = history
                return None, "That code is wrong or has expired. Check the laptop control page."
            self.session_token = secrets.token_urlsafe(24)
            self.session_expires = current + SESSION_SECONDS
            self.pair_code = ""
            self.code_expires = 0
            self.failures[address] = []
            return self.session_token, ""

    def is_paired(self, supplied_token):
        with self.lock:
            self.expire_session()
            if not self.session_token or not supplied_token:
                return False
            return hmac.compare_digest(str(supplied_token), self.session_token)

    def disconnect(self):
        with self.lock:
            self.session_token = ""
            self.session_expires = 0
            self.new_pair_code()

    def safe_path(self, relative_path):
        if not isinstance(relative_path, str) or "\x00" in relative_path or "\\" in relative_path:
            raise ValueError("That shelf path is not valid.")
        if relative_path.startswith("/"):
            raise ValueError("That shelf path is not valid.")
        parts = relative_path.split("/") if relative_path else []
        if any(part in ("", ".", "..") for part in parts):
            raise ValueError("That shelf path is not valid.")
        candidate = self.shared_folder.joinpath(*parts).resolve(strict=True)
        if not inside(self.shared_folder, candidate):
            raise ValueError("That path is outside the shared folder.")
        return candidate

    def list_files(self, relative_path):
        folder = self.safe_path(relative_path)
        if not folder.is_dir():
            raise ValueError("That shelf item is not a folder.")
        entries = []
        for child in folder.iterdir():
            try:
                target = child.resolve(strict=True)
                if not inside(self.shared_folder, target):
                    continue
                if not (target.is_dir() or target.is_file()):
                    continue
                relative = target.relative_to(self.shared_folder).as_posix()
                if target.is_dir():
                    entries.append({"name": child.name, "path": relative, "type": "folder", "size_label": "FOLDER"})
                else:
                    size = target.stat().st_size
                    entries.append({"name": child.name, "path": relative, "type": "file", "size_label": self.size_label(size)})
            except (OSError, ValueError):
                continue
        entries.sort(key=lambda entry: (entry["type"] != "folder", entry["name"].casefold()))
        display = "Shared folder" if not relative_path else "Shared folder / " + relative_path
        return {"items": entries, "display_path": display}

    @staticmethod
    def size_label(size):
        if size < 1024:
            return str(size) + " B"
        if size < 1024 * 1024:
            return "%.1f KB" % (size / 1024.0)
        return "%.1f MB" % (size / (1024.0 * 1024.0))


class BaseHandler(http.server.SimpleHTTPRequestHandler):
    server_version = "PocketDesk/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise ValueError("The request length is not valid.")
        if length < 0 or length > MAX_BODY:
            raise ValueError("That request is too large.")
        try:
            value = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, ValueError):
            raise ValueError("The request was not valid JSON.")
        if not isinstance(value, dict):
            raise ValueError("The request must contain a JSON object.")
        return value

    def bearer_token(self):
        value = self.headers.get("Authorization", "")
        if value.startswith("Bearer "):
            return value[7:]
        return ""

    def auth_required(self):
        if self.server.state.is_paired(self.bearer_token()):
            return True
        self.send_json(401, {"error": "This iPad is not paired anymore."})
        return False

    def api_path(self):
        return urlsplit(self.path).path

    def query(self):
        return parse_qs(urlsplit(self.path).query, keep_blank_values=True)

    def log_message(self, format_string, *args):
        super().log_message(format_string, *args)


class DeskHandler(BaseHandler):
    def do_GET(self):
        path = self.api_path()
        query = self.query()
        if path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        if path.startswith("/api/"):
            if path == "/api/files" or path == "/api/files/download":
                if not self.auth_required():
                    return
                try:
                    if path == "/api/files":
                        directory = query.get("dir", [""])[0]
                        self.send_json(200, self.server.state.list_files(directory))
                    else:
                        relative = query.get("path", [""])[0]
                        target = self.server.state.safe_path(relative)
                        if not target.is_file():
                            raise ValueError("That shelf item is not a file.")
                        self.send_download(target)
                except (OSError, ValueError) as error:
                    self.send_json(400, {"error": str(error) or "That shelf item is unavailable."})
                return
            if path == "/api/notes":
                if not self.auth_required():
                    return
                with self.server.state.lock:
                    self.send_json(200, {"notes": list(self.server.state.notes)})
                return
            self.send_json(404, {"error": "That desk route does not exist."})
            return
        if path in ("/host.html", "/host.js"):
            self.send_error(404)
            return
        super().do_GET()

    def do_POST(self):
        path = self.api_path()
        if path == "/api/pair":
            try:
                supplied = self.read_json().get("code", "")
                token, error = self.server.state.pair(supplied, self.client_address[0])
                if not token:
                    self.send_json(429 if "Too many tries" in error else 403, {"error": error})
                else:
                    self.send_json(200, {"token": token, "expires_in": SESSION_SECONDS})
            except ValueError as error:
                self.send_json(400, {"error": str(error)})
            return
        if path == "/api/unpair":
            if not self.auth_required():
                return
            self.server.state.disconnect()
            self.send_json(200, {"disconnected": True})
            return
        if path == "/api/notes":
            if not self.auth_required():
                return
            try:
                data = self.read_json()
                title = data.get("title", "")
                body = data.get("body", "")
                if not isinstance(title, str) or not isinstance(body, str):
                    raise ValueError("Title and note must be text.")
                title = title.strip()[:80]
                body = body.strip()
                if not body:
                    raise ValueError("Write a note before saving.")
                if len(body) > 1200:
                    raise ValueError("Notes can be up to 1,200 characters.")
                with self.server.state.lock:
                    if len(self.server.state.notes) >= 500:
                        raise ValueError("This desk has reached its 500 note limit.")
                    note = {"id": secrets.token_hex(8), "title": title, "body": body, "updated": now_stamp()}
                    self.server.state.notes.insert(0, note)
                    if not self.server.state.write_notes():
                        self.server.state.notes.pop(0)
                        self.send_json(500, {"error": "The laptop could not save this note to disk."})
                        return
                self.send_json(201, {"note": note})
            except ValueError as error:
                self.send_json(400, {"error": str(error)})
            return
        self.send_json(404, {"error": "That desk route does not exist."})

    def do_PUT(self):
        path = self.api_path()
        prefix = "/api/notes/"
        if not path.startswith(prefix) or not self.auth_required():
            if not path.startswith(prefix):
                self.send_json(404, {"error": "That desk route does not exist."})
            return
        note_id = path[len(prefix):]
        if not note_id or "/" in note_id:
            self.send_json(400, {"error": "That note address is not valid."})
            return
        try:
            data = self.read_json()
            title = data.get("title", "")
            body = data.get("body", "")
            if not isinstance(title, str) or not isinstance(body, str):
                raise ValueError("Title and note must be text.")
            title = title.strip()[:80]
            body = body.strip()
            if not body:
                raise ValueError("Write a note before saving.")
            if len(body) > 1200:
                raise ValueError("Notes can be up to 1,200 characters.")
            with self.server.state.lock:
                note = next((item for item in self.server.state.notes if item["id"] == note_id), None)
                if note is None:
                    self.send_json(404, {"error": "That note has already gone."})
                    return
                old_note = dict(note)
                note.update({"title": title, "body": body, "updated": now_stamp()})
                if not self.server.state.write_notes():
                    note.update(old_note)
                    self.send_json(500, {"error": "The laptop could not save this note to disk."})
                    return
            self.send_json(200, {"note": note})
        except ValueError as error:
            self.send_json(400, {"error": str(error)})

    def do_DELETE(self):
        path = self.api_path()
        prefix = "/api/notes/"
        if not path.startswith(prefix) or not self.auth_required():
            if not path.startswith(prefix):
                self.send_json(404, {"error": "That desk route does not exist."})
            return
        note_id = path[len(prefix):]
        with self.server.state.lock:
            original = self.server.state.notes
            self.server.state.notes = [item for item in original if item["id"] != note_id]
            if len(self.server.state.notes) == len(original):
                self.server.state.notes = original
                self.send_json(404, {"error": "That note has already gone."})
                return
            if not self.server.state.write_notes():
                self.server.state.notes = original
                self.send_json(500, {"error": "The laptop could not update its notes file."})
                return
        self.send_json(200, {"removed": True})

    def send_download(self, target):
        try:
            size = target.stat().st_size
            mime = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
            safe_name = "".join(character if 32 <= ord(character) < 127 and character not in '"\\' else "_" for character in target.name)
            encoded = quote(target.name.encode("utf-8"))
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(size))
            self.send_header("Content-Disposition", 'attachment; filename="%s"; filename*=UTF-8\'\'%s' % (safe_name, encoded))
            self.end_headers()
            with target.open("rb") as file_obj:
                while True:
                    chunk = file_obj.read(65536)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
        except OSError:
            self.send_json(404, {"error": "That shelf item is no longer available."})


class ControlHandler(BaseHandler):
    def local_request(self):
        expected_host = "127.0.0.1:%d" % self.server.server_port
        expected_origin = "http://" + expected_host
        if self.headers.get("Host", "").lower() != expected_host:
            self.send_error(403)
            return False
        origin = self.headers.get("Origin")
        if origin and origin != expected_origin:
            self.send_error(403)
            return False
        return True

    def do_GET(self):
        if not self.local_request():
            return
        path = self.api_path()
        if path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
        elif path == "/api/status":
            self.send_json(200, self.server.state.status())
        elif path in ("/host.html", "/host.js", "/styles.css"):
            super().do_GET()
        else:
            self.send_error(404)

    def do_POST(self):
        if not self.local_request():
            return
        if self.api_path() != "/api/disconnect":
            self.send_json(404, {"error": "That control route does not exist."})
            return
        try:
            self.read_json()
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
            return
        self.server.state.disconnect()
        self.send_json(200, {"disconnected": True})


def parse_args():
    parser = argparse.ArgumentParser(description="A small private desk for an iPad and laptop on your own Wi-Fi.")
    parser.add_argument("--share-folder", required=True, help="The one existing folder the iPad may browse and download from.")
    parser.add_argument("--host", default="127.0.0.1", help="Exact laptop IPv4 address to bind. Default: 127.0.0.1 (laptop only).")
    parser.add_argument("--port", type=int, default=8787, help="iPad page port (default 8787).")
    parser.add_argument("--control-port", type=int, default=8788, help="Laptop-only control page port (default 8788).")
    return parser.parse_args()


def main():
    args = parse_args()
    try:
        host_ip = ipaddress.ip_address(args.host)
        if host_ip.version != 4 or host_ip.is_unspecified or host_ip.is_multicast:
            raise ValueError("Use a specific laptop IPv4 address, not 0.0.0.0 or a multicast address.")
        if not (1 <= args.port <= 65535 and 1 <= args.control_port <= 65535):
            raise ValueError("Ports must be between 1 and 65535.")
        if args.port == args.control_port:
            raise ValueError("The iPad and laptop control pages need different ports.")
        state = DeskState(args.share_folder, data_directory() / "notes.json")
        lan_server = http.server.ThreadingHTTPServer((str(host_ip), args.port), DeskHandler)
        lan_server.state = state
        control_server = http.server.ThreadingHTTPServer(("127.0.0.1", args.control_port), ControlHandler)
        control_server.state = state
    except (OSError, ValueError) as error:
        raise SystemExit("Pocket Desk could not start: %s" % error)

    thread = threading.Thread(target=control_server.serve_forever, name="pocket-desk-control", daemon=True)
    thread.start()
    print("Pocket Desk is ready.")
    print("iPad address: http://%s:%d/" % (host_ip, args.port))
    print("Laptop controls: http://127.0.0.1:%d/host.html" % args.control_port)
    print("Pairing code: %s (expires in five minutes)" % state.pair_code)
    print("Shared folder: %s" % state.shared_folder)
    print("Notes file: %s" % state.notes_path)
    print("This server does not change your firewall or router. Press Ctrl+C here to stop it.")
    try:
        lan_server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Pocket Desk…")
    finally:
        lan_server.shutdown()
        lan_server.server_close()
        control_server.shutdown()
        control_server.server_close()


if __name__ == "__main__":
    main()
