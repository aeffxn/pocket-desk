# 🗄️ Pocket Desk

![Python](https://img.shields.io/badge/Python-3.8%2B-496b54?style=flat-square)
![Target browser](https://img.shields.io/badge/Target-iOS%209%20Safari-b46c50?style=flat-square)
![Dependencies](https://img.shields.io/badge/Runtime%20dependencies-none-8b8066?style=flat-square)

A small second desk for an old iPad and a laptop on the same Wi-Fi. Keep quick notes, fetch a file from one folder you chose, and leave the laptop camera alone. No account or cloud service in the middle.

## 📑 In this drawer

- [What works](#-what-works)
- [Requirements](#-requirements)
- [Start the desk](#-start-the-desk)
- [Connect the iPad](#-connect-the-ipad)
- [Privacy and network boundaries](#-privacy-and-network-boundaries)
- [Project structure](#-project-structure)
- [How it works](#-how-it-works)
- [The paper, not the dashboard](#-the-paper-not-the-dashboard)
- [iOS 9 Safari check](#-ios-9-safari-check)

## 🧰 What works

| Tool | What it does |
|---|---|
| **Quick notes** | Add, edit, search, and remove short notes. They are saved on the laptop in your user data folder. |
| **File shelf** | Browse and download files below one folder you selected when starting the server. The iPad cannot upload, overwrite, or delete files. |
| **Pairing** | A six-digit code appears in the laptop control page and terminal. It expires after five minutes; one iPad session lasts up to eight hours and can be disconnected from the laptop. |
| **Camera** | Not available in this setup. Pocket Desk never asks for camera or microphone permission. |

## 🛠 Requirements

- Python 3.8 or later. The server uses only the Python standard library.
- A laptop and iPad on the same trusted Wi-Fi network.
- iPad mini 1 with iOS 9-era Safari. The layout uses ordinary flow and inline-block controls; the client uses ES5 JavaScript and `XMLHttpRequest` rather than `fetch`.
- One existing folder you are comfortable sharing as read-only.

## 🚪 Start the desk

Find the laptop's Wi-Fi IPv4 address (on Windows, run `ipconfig` and look for the wireless adapter's IPv4 Address). Make a small folder for the files you want on the iPad; do not choose your whole user folder or drive.

From the Pocket Desk folder, run this in PowerShell, replacing the folder and address with yours:

```powershell
python server.py --share-folder "C:\Users\you\Pocket Shelf" --host 192.168.1.24
```

The server binds only to that exact IPv4 address. Without `--host`, it binds to `127.0.0.1`, which is laptop-only. It does not open firewall ports or change your router. If Windows or the network blocks the connection, check those settings yourself; Pocket Desk will not change them.

The terminal prints the iPad address and a temporary pairing code. On the laptop, open the control page:

```text
http://127.0.0.1:8788/host.html
```

The control page listens on loopback only. Keep the terminal window open while using the desk; press **Ctrl+C** there to stop both local servers.

## 📱 Connect the iPad

1. Join the same trusted Wi-Fi as the laptop.
2. Open the printed address in Safari, for example `http://192.168.1.24:8787/`.
3. Type the code shown on the laptop control page. The code changes after five minutes and can only pair one iPad at a time.
4. Use **Notes** or **File shelf**. The laptop's control page has a **Disconnect iPad** button; the iPad also has a local disconnect button.

An access point can choose to show a captive sign-in window, but a web app cannot make iOS open one. Use the same address in regular Safari if the captive window does not show the app or gets in the way. Pocket Desk does not imitate a public hotspot, intercept traffic, or modify router settings. There is no QR image in this first version; the local address is printed in the terminal for copying.

## 🔒 Privacy and network boundaries

- The laptop page and iPad page use two small HTTP servers: the iPad server binds to the exact address you pass, and laptop controls bind to `127.0.0.1` only.
- Notes are stored at `%LOCALAPPDATA%\PocketDesk\notes.json` on Windows (or `~/.pocket-desk/notes.json` elsewhere), not in this project folder.
- Pairing is a convenience barrier for a trusted local network, not strong authentication. The code and session travel over plain HTTP, and the session token is kept in the iPad browser's local storage. Anyone who can observe or join that Wi-Fi may be able to inspect traffic. Do not use an untrusted or public network, and do not forward these ports to the internet.
- File paths are resolved under the selected folder. Requests containing traversal paths are rejected, and symlinks that point outside the selected folder are skipped. The file shelf is read-only.
- There is no upload, cloud sync, telemetry, analytics, audio, camera capture, QR service, or external asset request.

## 📂 Project structure

```text
Pocket Desk/
├── server.py   # local file and notes API, pairing, and two server bindings
├── index.html  # iPad desk and its three small tool panels
├── app.js      # ES5 client for pairing, notes, and the read-only shelf
├── host.html   # loopback-only laptop status and disconnect page
├── host.js     # laptop pairing-code display and session control
├── styles.css  # old-Safari-friendly paper, ink, and layout rules
└── README.md   # setup, boundaries, and manual iPad checklist
```

## ⚙️ How it works

`server.py` uses Python's built-in HTTP server. The iPad side and the laptop controls run on separate ports; the control side is bound to loopback, so it is not available from the iPad. A random six-digit code pairs one browser session, and a random session token expires after eight hours. Pair attempts are limited after repeated mistakes.

Notes are plain JSON on the laptop, updated through a temporary file and rename so a normal save does not leave a half-written file. The browser builds note and file rows with `textContent`, so note text and filenames are displayed as text rather than interpreted as markup.

The file shelf has no write route. Each requested path is checked after resolving symlinks and must remain inside the selected folder. It only lists regular files and folders; it does not provide a file manager for the rest of the laptop.

## 🎨 The paper, not the dashboard

Pocket Desk uses warm paper, green desk-lamp ink, and a small rust-colored stamp. The tabs are simply numbered like drawers. There are no charts, tiles, login screens, remote services, or animated effects to slow down an old iPad.

The camera panel is intentionally honest. WebKit announced WebRTC camera support with Safari 11 on macOS and iOS 11, later than the iPad mini 1's iOS 9 Safari ([WebKit: A Closer Look Into WebRTC](https://webkit.org/blog/7763/a-closer-look-into-webrtc/)). The desk is served over local HTTP, which is not a secure context for camera access in current browsers either ([W3C Secure Contexts](https://www.w3.org/TR/secure-contexts/)). A camera feature would need a different, explicitly approved laptop-side capture design; this version makes no camera request and captures nothing.

## ✅ iOS 9 Safari check

I do not have a physical iPad mini 1 in this environment, so this is a manual checklist for the real device:

- [ ] Open the laptop's printed LAN address in regular Safari while both devices are on the same Wi-Fi.
- [ ] Pair with the current code; wait five minutes and confirm an expired code is rejected.
- [ ] Add a note, edit it, search it, delete it, and reload Safari to check that it remains saved on the laptop.
- [ ] Open a folder, download a file, go back up, and confirm no upload or delete control is present.
- [ ] Disconnect from either side; confirm the iPad must pair again with a new code.
- [ ] Open **Camera** and confirm the page explains the limitation without requesting camera or microphone access.
- [ ] If the access point opens a captive window, try the same address in regular Safari.
