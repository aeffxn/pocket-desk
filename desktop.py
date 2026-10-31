import ipaddress
import os
import subprocess
import sys
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from urllib.error import URLError
from urllib.request import urlopen


class PocketDeskWindow:
    def __init__(self, root):
        self.root = root
        self.root.title("Pocket Desk")
        self.root.geometry("610x610")
        self.root.minsize(560, 570)
        self.process = None
        self.shared = tk.StringVar()
        self.photos = tk.StringVar()
        self.host = tk.StringVar(value="127.0.0.1")
        self.address = tk.StringVar(value="Start Pocket Desk to see the iPad address.")
        self.code = tk.StringVar(value="——————")
        self.state = tk.StringVar(value="OFF")
        self.build()
        self.root.protocol("WM_DELETE_WINDOW", self.close)
        self.poll()

    def build(self):
        self.root.configure(bg="#f3efe5")
        frame = ttk.Frame(self.root, padding=28)
        frame.pack(fill="both", expand=True)
        ttk.Label(frame, text="POCKET DESK", font=("Georgia", 24, "bold")).pack(anchor="w")
        ttk.Label(frame, text="A small local desk for your iPad and laptop", foreground="#66736b").pack(anchor="w", pady=(3, 20))
        self.field(frame, "FOLDER THE IPAD CAN BROWSE", self.shared, self.choose_shared)
        self.field(frame, "OPTIONAL PHOTO DESTINATION (UPLOADS OFF IF EMPTY)", self.photos, self.choose_photos)
        ttk.Label(frame, text="LAPTOP WI-FI IPv4 ADDRESS", font=("Segoe UI", 9, "bold")).pack(anchor="w", pady=(15, 5))
        ttk.Entry(frame, textvariable=self.host).pack(fill="x")
        ttk.Label(frame, text="Use 127.0.0.1 for laptop-only testing. For iPad access, enter the Wi-Fi IPv4 shown by ipconfig.", wraplength=540, foreground="#66736b").pack(anchor="w", pady=(5, 14))
        self.start_button = ttk.Button(frame, text="Start Pocket Desk", command=self.start)
        self.start_button.pack(anchor="w", pady=(0, 14))
        ttk.Separator(frame).pack(fill="x", pady=8)
        ttk.Label(frame, text="STATUS", font=("Segoe UI", 9, "bold")).pack(anchor="w", pady=(6, 3))
        ttk.Label(frame, textvariable=self.state, font=("Segoe UI", 12, "bold")).pack(anchor="w")
        ttk.Label(frame, text="IPAD ADDRESS", font=("Segoe UI", 9, "bold")).pack(anchor="w", pady=(14, 3))
        ttk.Label(frame, textvariable=self.address, font=("Consolas", 11)).pack(anchor="w")
        ttk.Label(frame, text="PAIRING CODE", font=("Segoe UI", 9, "bold")).pack(anchor="w", pady=(14, 3))
        ttk.Label(frame, textvariable=self.code, font=("Consolas", 29, "bold")).pack(anchor="w")
        self.disconnect_button = ttk.Button(frame, text="Disconnect iPad", command=self.disconnect, state="disabled")
        self.disconnect_button.pack(anchor="w", pady=(9, 12))
        ttk.Label(frame, text="The photo folder is separate from the read-only shelf. Choose it only if you want to allow confirmed photo uploads. Nothing changes your firewall or router.", wraplength=540, foreground="#66736b").pack(anchor="w")

    def field(self, parent, label, variable, action):
        ttk.Label(parent, text=label, font=("Segoe UI", 9, "bold")).pack(anchor="w", pady=(9, 5))
        row = ttk.Frame(parent)
        row.pack(fill="x")
        ttk.Entry(row, textvariable=variable).pack(side="left", fill="x", expand=True)
        ttk.Button(row, text="Choose…", command=action).pack(side="left", padx=(7, 0))

    def choose_shared(self):
        choice = filedialog.askdirectory(title="Choose the read-only file shelf")
        if choice:
            self.shared.set(choice)

    def choose_photos(self):
        choice = filedialog.askdirectory(title="Choose where confirmed iPad photos will be saved")
        if choice:
            self.photos.set(choice)

    def start(self):
        shared = self.shared.get().strip()
        host = self.host.get().strip()
        if not shared or not os.path.isdir(shared):
            messagebox.showerror("Choose a folder", "Choose an existing folder for the read-only file shelf.")
            return
        try:
            address = ipaddress.ip_address(host)
            if address.version != 4 or address.is_unspecified or address.is_multicast:
                raise ValueError()
        except ValueError:
            messagebox.showerror("Check the address", "Enter a specific IPv4 address, such as 192.168.1.24, or 127.0.0.1 for laptop-only use.")
            return
        if self.photos.get().strip() and not os.path.isdir(self.photos.get().strip()):
            messagebox.showerror("Check the photo folder", "Choose an existing folder, or clear the field to keep uploads off.")
            return
        command = [sys.executable, os.path.join(os.path.dirname(__file__), "server.py"), "--share-folder", shared, "--host", host]
        if self.photos.get().strip():
            command.extend(["--photo-folder", self.photos.get().strip()])
        try:
            self.process = subprocess.Popen(command, cwd=os.path.dirname(__file__), stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except OSError as error:
            messagebox.showerror("Could not start", str(error))
            return
        self.host.set(host)
        self.address.set("http://%s:8787/" % host)
        self.state.set("STARTING…")
        self.start_button.configure(text="Stop Pocket Desk", command=self.stop)

    def stop(self):
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.process.kill()
        self.process = None
        self.state.set("OFF")
        self.address.set("Start Pocket Desk to see the iPad address.")
        self.code.set("——————")
        self.start_button.configure(text="Start Pocket Desk", command=self.start)
        self.disconnect_button.configure(state="disabled")

    def disconnect(self):
        try:
            from urllib.request import Request
            request = Request("http://127.0.0.1:8788/api/disconnect", data=b"{}", headers={"Content-Type": "application/json"}, method="POST")
            urlopen(request, timeout=2).close()
            self.state.set("READY TO PAIR")
        except (URLError, OSError, ValueError):
            self.state.set("Could not disconnect. Try again.")

    def poll(self):
        if self.process and self.process.poll() is not None:
            self.state.set("STOPPED — check the selected folders and address")
            self.process = None
            self.start_button.configure(text="Start Pocket Desk", command=self.start)
            self.disconnect_button.configure(state="disabled")
        elif self.process:
            try:
                import json
                response = urlopen("http://127.0.0.1:8788/api/status", timeout=1)
                status = json.loads(response.read().decode("utf-8"))
                response.close()
                if status.get("paired"):
                    self.state.set("IPAD PAIRED")
                    self.code.set("CONNECTED")
                    self.disconnect_button.configure(state="normal")
                else:
                    self.state.set("READY TO PAIR")
                    self.code.set(status.get("code", "——————"))
                    self.disconnect_button.configure(state="disabled")
            except (URLError, OSError, ValueError):
                self.state.set("STARTING…")
        self.root.after(1000, self.poll)

    def close(self):
        self.stop()
        self.root.destroy()


def main():
    root = tk.Tk()
    PocketDeskWindow(root)
    root.mainloop()


if __name__ == "__main__":
    main()
