# Pocket Desk

A private workspace that runs on your computer and opens in a phone or tablet browser over the same Wi-Fi network. It includes notes, a read-only file shelf, a clock, a timer, themes, and 13 small games. There is no account or cloud service.

## Features

- **Clock and timer:** Large local clock, date, 12/24-hour display, and a separate countdown timer.
- **Games:** Snake, Finger football, Shoot the hoop, Tic-tac-toe, Memory match, 2048, Reaction test, Rock paper scissors, Simon, Number recall, Word scramble, Higher or lower, and Tap sprint.
- **Themes:** Paper, Midnight, Blue hour, Grove, and Rosewood. The selection is saved in the browser.
- **Notes:** Create, edit, search, and delete notes stored on the computer.
- **Drawing notes:** Draw with touch, mouse, or a stylus; add typed text, lines, rectangles, and ellipses. More pages append as you scroll. Drawings autosave on the computer.
- **File shelf:** Browse one selected folder. Open images, text, CSV files, and PDFs in the browser; download other formats or save a copy.
- **Photo drop:** Optional image upload to a separate folder chosen on the computer. The user confirms each upload.
- **Connection:** A short-lived pairing code connects one browser session at a time.

## Start on Windows

1. Install Python 3.8 or newer from [python.org](https://www.python.org/downloads/) and enable **Add Python to PATH**.
2. Open the Pocket Desk folder.
3. Double-click `PocketDesk.pyw` to open the desktop window.
4. Choose a folder for the read-only file shelf.
5. To use Pocket Desk on this computer only, leave the network address at `127.0.0.1`. To connect a phone or tablet, enter the computer's Wi-Fi IPv4 address. Find it in PowerShell with `ipconfig` under the Wi-Fi adapter.
6. Optionally choose a separate photo destination. Leave it blank to keep uploads off.
7. Click **Start Pocket Desk**. The window shows the address and pairing code. Keep the window open while connected.

Close the window or click **Stop Pocket Desk** to stop. If double-clicking does not work, open PowerShell in this folder and run `pyw PocketDesk.pyw`.

## Connect a phone or tablet

1. Connect both devices to the same trusted Wi-Fi network.
2. On the phone or tablet, open the workspace address shown in the desktop window, such as `http://192.168.1.24:8787/`.
3. Enter the pairing code shown on the computer.
4. On a narrow screen, use **Open module** to switch between Clock, Timer, Games, Themes, Notes, Files, Photo, Laptop status, and Audio & screen.

Pocket Desk does not change firewall or router settings. If the network blocks device-to-device connections, the app cannot bypass that restriction.

## Files and photos

The file shelf only reads inside the one folder chosen in the desktop window. Images, plain text, CSV, and PDF files have an **Open** action; every file can be downloaded. Office documents and other formats need a compatible app on the phone or tablet after download.

Photo uploads are off unless a separate destination folder is selected. JPEG, PNG, GIF, WebP, HEIC, and HEIF images up to 8 MB are accepted. Each image gets a new name, so existing files are not overwritten.

## Compatibility and privacy

The interface uses ordinary HTML, CSS, and ES5 JavaScript for broad mobile-browser compatibility. File pickers, image formats, and native previews vary by device and browser. Microphone and screen capture are not enabled: most browsers require a secure HTTPS page for those features, while this local server uses plain HTTP.

The workspace is intended for a trusted local network. Pairing codes, notes, files, and selected photos travel over unencrypted HTTP. Do not use public Wi-Fi or forward the ports to the internet. The server binds to the specific IPv4 address you enter; its desktop control page is loopback-only. It does not configure your firewall or router.

Notes and drawings are stored outside the project in `%LOCALAPPDATA%\PocketDesk\` on Windows. Photo uploads are saved only to the selected destination. No telemetry, analytics, or cloud sync is included.

## Project files

```text
Pocket Desk/
├── PocketDesk.pyw  # Windows launcher
├── desktop.py      # desktop controls
├── server.py       # local server, notes, file shelf, and photo upload
├── index.html      # browser interface and game modules
├── app.js          # ES5 client and local preferences
├── host.html       # local-only pairing controls
├── host.js         # pairing status and disconnect
├── styles.css      # responsive layout and themes
└── README.md       # setup and feature guide
```
