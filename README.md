# Pocket Desk

![Python](https://img.shields.io/badge/Python-3.8%2B-blue?style=flat-square&logo=python&logoColor=white)
![Interface](https://img.shields.io/badge/Interface-Web%20%2B%20Windows%20app-315b4b?style=flat-square)
![Network](https://img.shields.io/badge/Network-Local%20Wi--Fi-596461?style=flat-square)

A private workspace that runs on a Windows computer and opens in a phone or tablet browser over the same Wi-Fi. Use it as a desk clock, timer, game shelf, notebook, drawing pad, and read-only file shelf. No account or cloud service is involved.

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Run Pocket Desk](#run-pocket-desk)
- [Connect a phone or tablet](#connect-a-phone-or-tablet)
- [Files, photos, and saved data](#files-photos-and-saved-data)
- [Project layout](#project-layout)
- [Privacy and limits](#privacy-and-limits)

## Features

### Clock, timer, and themes

- Large clock with date and 12 or 24 hour display.
- Separate countdown timer with pause, resume, reset, and saved timer state in the browser.
- Five themes: Paper, Midnight, Blue hour, Grove, and Rosewood. Theme choice is saved in that browser.

### 18 games

Snake, Finger football, Shoot the hoop, Tic-tac-toe, Memory match, 2048, Reaction test, Rock paper scissors, Simon, Number recall, Word scramble, Higher or lower, Tap sprint, Coin flip, Dice roll, Guess the number, Color match, and Whack-a-dot.

### Notes and drawing pages

- Create, edit, search, and delete text notes.
- Make drawing notes with touch, mouse, or stylus input.
- Add freehand marks, erase, type text onto a page, or draw lines, rectangles, and ellipses.
- Undo the latest mark or clear the current page. More pages are added while scrolling; drawings autosave on the computer.

### Files, photos, and computer status

- Browse one folder selected on the Windows computer. The file shelf is read only.
- Open images, plain text, CSV, and PDF files in the browser; download other formats.
- Optionally send a photo from the phone or tablet to a separate folder chosen on the computer. Uploads are off until a destination is set.
- Check battery, power connection, system memory, free and used space on the drive holding Pocket Desk data, Pocket Desk process memory, processor information, and Windows version. Some readings are unavailable on computers or operating systems that do not report them.

## Requirements

- Windows 10 or newer
- Python 3.8 or newer, with Tcl/Tk enabled for the desktop window
- A phone or tablet browser for remote use

Pocket Desk uses Python's standard library and does not require `pip` packages.

## Run Pocket Desk

1. Install Python from [python.org](https://www.python.org/downloads/) and enable **Add Python to PATH**. Keep **tcl/tk and IDLE** selected.
2. Open the Pocket Desk folder.
3. Double-click `PocketDesk.pyw`. If that does not open, use PowerShell in this folder and run:

   ```powershell
   pyw PocketDesk.pyw
   ```

4. In the desktop window, choose the folder for the read-only file shelf.
5. For computer-only use, leave the address as `127.0.0.1`. To connect a phone or tablet, enter the computer's Wi-Fi IPv4 address. Find it with `ipconfig` in PowerShell under the Wi-Fi adapter.
6. Optionally select a separate photo destination folder. Leave it blank to keep uploads disabled.
7. Click **Start Pocket Desk**. Keep the desktop window open; it shows the web address and a short-lived pairing code.

## Connect a phone or tablet

1. Connect both devices to the same trusted Wi-Fi network.
2. Open the address shown in the desktop window on the phone or tablet. It looks like `http://192.168.1.24:8787/`.
3. Enter the pairing code from the computer.
4. Choose a module from the navigation. On narrow screens, use **Open module**.

Only one browser session can be paired at a time. Disconnect it from the browser or desktop app before pairing another device. Pocket Desk does not change firewall or router settings; some networks block devices from connecting to each other.

## Files, photos, and saved data

The file shelf can only browse inside its selected folder. It does not edit or delete those files. Images, text, CSV, and PDF files have an **Open** action; other types can be downloaded and opened in a compatible app.

Photo uploads accept JPEG, PNG, GIF, WebP, HEIC, and HEIF images up to 8 MB. Each upload gets a new filename so it does not replace an existing photo.

Notes and drawings are stored on Windows at `%LOCALAPPDATA%\PocketDesk\`. Themes and timer preferences are stored in the browser. Photos are written only to the destination folder selected in the desktop app.

## Project layout

```text
Pocket Desk/
├── PocketDesk.pyw  # Windows desktop launcher
├── desktop.py      # Desktop controls and server process
├── server.py       # Local web server, APIs, and file access
├── index.html      # Browser interface and game modules
├── app.js          # Browser behavior and local preferences
├── host.html       # Local pairing controls
├── host.js         # Pairing status and disconnect
├── styles.css      # Responsive layout, themes, and game styles
└── README.md       # Setup and feature guide
```

## Privacy and limits

Pairing codes, notes, drawings, and files travel over unencrypted HTTP on the local network. Use a trusted Wi-Fi network; do not expose the server to the public internet or forward its port. The desktop control page is loopback only.

Microphone recording and live screen mirroring are not included. Phone browsers generally require HTTPS for those features, while this local server uses HTTP. The photo file picker may offer camera capture depending on the device and browser.
