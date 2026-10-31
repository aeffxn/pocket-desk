# 🗄️ Pocket Desk

![Python](https://img.shields.io/badge/Python-3.8%2B-496b54?style=flat-square)
![Target browser](https://img.shields.io/badge/Target-iOS%209%20Safari-b46c50?style=flat-square)
![Dependencies](https://img.shields.io/badge/Runtime%20dependencies-none-8b8066?style=flat-square)

A small local desk for an old iPad and a Windows laptop. It has a laptop window, a big desk clock, a timer, three small games, five saved themes, quick notes, a read-only file shelf, laptop battery status, and an optional photo drop. No account or cloud service.

## 📑 In this drawer

- [What works](#-what-works)
- [Run it on Windows](#-run-it-on-windows)
- [Connect the iPad](#-connect-the-ipad)
- [Use the photo drop](#-use-the-photo-drop)
- [Limits of an old iPad](#-limits-of-an-old-ipad)
- [Privacy and network boundaries](#-privacy-and-network-boundaries)
- [Project structure](#-project-structure)
- [iOS 9 Safari check](#-ios-9-safari-check)

## 🧰 What works

| Tool | What it does |
|---|---|
| **Quick notes** | Add, edit, search, and remove notes saved on the laptop. |
| **File shelf** | Browse and download from one folder chosen in the laptop app. Read-only. |
| **Laptop battery** | Ask Windows for the current battery percent and whether it is plugged in. Desktops may report no battery. |
| **Photo drop** | Optional. If you choose a separate destination folder in the laptop window, the paired iPad can choose an image and confirm sending it there. |
| **Desk clock** | A large live clock with date and 12/24-hour display. |
| **Timer** | Start, pause, reset, and resume a countdown. Its end time is saved in Safari so it can recover after a reload. |
| **Themes** | Paper, Midnight, Blue hour, Grove, and Rosewood. The choice is saved on the iPad. |
| **Games** | Snake, penalty-kick Finger football, and a timed Shoot the hoop reflex game. |
| **Pairing** | A six-digit code expires after five minutes. One iPad can pair for up to eight hours; disconnect it from the laptop window. |

## 🪟 Run it on Windows

1. Install Python 3.8 or later from [python.org](https://www.python.org/downloads/). In the installer, enable **Add Python to PATH**.
2. Open the `Pocket Desk` folder you downloaded or cloned.
3. Double-click **`PocketDesk.pyw`**. A small Pocket Desk window opens; there is no terminal to operate.
4. Under **Folder the iPad can browse**, choose one existing folder. This shelf is read-only on the iPad.
5. For laptop-only testing, leave the address as `127.0.0.1`. For iPad access, open PowerShell and run `ipconfig`; find the **IPv4 Address** under your Wi-Fi adapter and enter that address in the window (for example, `192.168.1.24`).
6. Optionally choose a separate **Photo destination**. Leaving it blank keeps uploads disabled.
7. Click **Start Pocket Desk**. The window shows the iPad address and pairing code. Keep it open while using Pocket Desk. Click **Stop Pocket Desk** or close the window to stop the server.

The desktop window and server use only Python's standard library. If double-clicking does not open the window, open PowerShell in the project folder and run `pyw PocketDesk.pyw` (or `pythonw PocketDesk.pyw`).

## 📱 Connect the iPad

1. Join the same trusted Wi-Fi network as the laptop.
2. Open the iPad address shown by the laptop window in Safari, for example `http://192.168.1.24:8787/`.
3. Type the six-digit code shown in the laptop window.
4. The desk opens on the giant centered clock. **Timer** is its own tab. **Themes** is available in the tab row and as a shortcut at the top of the desk. The code expires after five minutes; only one iPad can pair at a time.

Use regular Safari if an access point opens a captive sign-in window. Pocket Desk does not imitate a hotspot or change router settings.

## 📷 Use the photo drop

Photo sending is off until you choose a destination folder in the laptop window before starting the server. This folder is separate from the read-only shelf. On the iPad, open **Photo**, choose an image, and confirm the upload. The server accepts JPEG, PNG, or GIF images up to 8 MB and gives each a new filename, so it will not overwrite an existing picture.

The iOS 9 file picker may offer the camera or photo library depending on the iPad. Safari decides what appears; Pocket Desk cannot force the camera to open. If the picker does not expose a picture, use the iPad’s built-in tools to make it available first. Uploads are sent over local plain HTTP, so use a Wi-Fi network you trust.

## 📼 Limits of an old iPad

The iPad mini 1's iOS 9 Safari does not provide the browser APIs for in-page voice recording or live screen capture/mirroring. The **Voice & screen** module explains this on the iPad. Use the iPad's built-in Voice Memos or Apple screen-mirroring controls instead; Pocket Desk cannot receive those recordings or mirror either screen.

The clock and games use standard browser timers and drawing. Safari may pause a page that is backgrounded or the iPad goes to sleep. The timer saves its deadline, so it can show an elapsed timer when reopened, but a browser page cannot guarantee an audible alarm while suspended. Keep the clock page open and the iPad awake when using it as a desk clock.

The photo module asks Safari's native picker for an image; it is not a live camera preview. A modern browser cannot access the laptop camera from this plain-HTTP local address either. Pocket Desk does not secretly access a camera or microphone.

## 🔒 Privacy and network boundaries

- The iPad server binds only to the exact IPv4 address you enter. Laptop controls bind to `127.0.0.1` only.
- Notes are saved at `%LOCALAPPDATA%\PocketDesk\notes.json` on Windows (or `~/.pocket-desk/notes.json` elsewhere), outside the project folder.
- Pairing is meant for a trusted local network, not strong authentication. Pairing codes, session tokens, notes, and selected photos travel over unencrypted HTTP. Do not use public Wi-Fi or forward these ports to the internet.
- File paths are resolved inside the chosen shelf. Traversal is rejected and symlinks pointing outside are skipped. The shelf has no write or delete feature.
- Photo upload requires an explicit laptop-selected destination and iPad confirmation. The server does not accept arbitrary paths from the iPad.
- No cloud sync, telemetry, analytics, external runtime assets, or automatic firewall/router changes.

## 📂 Project structure

```text
Pocket Desk/
├── PocketDesk.pyw  # double-click Windows launcher
├── desktop.py      # Tkinter laptop window
├── server.py       # local API, pairing, file shelf, photo saving
├── index.html      # iPad desk modules, clock, timer, and games
├── app.js          # ES5 iPad client and local preferences
├── host.html       # loopback-only browser controls
├── host.js         # local pairing status and disconnect
├── styles.css      # old-Safari-friendly layout
└── README.md       # setup and device limitations
```

## ⚙️ How it works

`PocketDesk.pyw` opens a Python Tkinter window and starts the local server when requested. Notes and paired-device state are held by the server; notes are written through a temporary file and rename. A random six-digit code pairs one browser session. The file shelf only reads from its chosen directory. Photo saves use a separate, optional chosen directory and unique generated names. The iPad client uses ES5 JavaScript and `XMLHttpRequest` for old Safari compatibility.

## ✅ iOS 9 Safari check

I do not have a physical iPad mini 1 in this environment. Check these steps on the actual device:

- [ ] Open the laptop's shown address in Safari while both devices use the same Wi-Fi.
- [ ] Pair with the current code and confirm a wrong/expired code is rejected.
- [ ] Add, edit, search, delete, and reload notes.
- [ ] Browse and download a file from the selected shelf.
- [ ] Check battery status; a desktop may have no reading.
- [ ] Change themes, close and reopen Safari, and confirm the choice stays saved.
- [ ] Try the clock's 12/24-hour switch, start/pause/reset a timer, and play each game.
- [ ] Leave a timer running, reload the desk, and confirm its remaining time is restored.
- [ ] With an optional destination selected, choose a small image, confirm upload, and check the laptop folder.
- [ ] Verify photo saving remains disabled when no destination was selected.
- [ ] Confirm Voice & screen explains the old-browser limits without requesting microphone or screen access.
- [ ] Disconnect and confirm pairing is required again.
