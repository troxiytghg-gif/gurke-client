# 🥒 Gurke Client 1.1 — Windows + SteamOS (.exe + .deb)

Gurke Client is an Electron Minecraft Java launcher. The application uses one codebase for Windows and Linux/SteamOS, with the requested release formats:

- **Windows:** `.exe` NSIS installer
- **Linux / SteamOS:** `.deb` package for x86_64

> You are developing on Windows. You do **not** need SteamOS to work on the source code, but you need a Linux/WSL build environment to produce and test the Linux package reliably.

## Features

- Microsoft login
- Release + snapshot selection
- RAM allocation
- Custom Minecraft/game directory
- Fullscreen + resolution
- JVM arguments
- Minecraft launch arguments
- Java auto-detection
- Java 8 / 17 / 21 selection
- Optional custom Java paths
- Launcher visibility/console settings
- Windows `.exe` installer
- Linux/SteamOS x86_64 `.deb` package
- Versioned build attempts: `v1`, then `v2`, `v3` if a build attempt fails

## Requirements

Node.js 18+ is recommended.

Minecraft Java requires a suitable Java runtime:
- Minecraft 1.20.5+ → Java 21
- Minecraft 1.17–1.20.4 → Java 17
- Older Minecraft versions → Java 8

## Development on Windows

Open PowerShell in the project folder:

```powershell
npm install
npm start
```

This runs the launcher locally on Windows.

## Build the Windows `.exe`

```powershell
npm run build:win
```

This creates an NSIS installer in `dist/`.

For a versioned build attempt:

```powershell
npm run build:versioned -- win
```

The first attempt goes into `dist/v1/`. If it fails, the next attempt is `dist/v2/`, then `v3`, and so on. The counter prevents attempts from overwriting one another; it does not magically repair an underlying build error.

### Optional Windows portable `.exe`

If you also want a portable executable:

```powershell
npm run build:win:portable
```

The main release target remains the normal NSIS `.exe` installer.

## Build the Linux `.deb`

The requested Linux release format is a **Debian package (`.deb`)** for x86_64.

**Important for SteamOS:** SteamOS itself is Arch-based, not Debian-based, so a `.deb` is not the native SteamOS package format and cannot normally be installed directly with `pacman`. I keep the `.deb` because that is the format you requested, and the project also includes an optional AppImage target for actually running Gurke directly on SteamOS.

Because you are developing on Windows, the recommended approach is **WSL2 with Ubuntu** or another Linux build environment.

Inside WSL:

```bash
cd /mnt/c/path/to/gurke-client-electron
npm install
npm run build:linux
```

This produces an x86_64 `.deb` package.

For the versioned fallback builder:

```bash
npm run build:versioned -- linux
```

or:

```bash
npm run build:versioned -- steamdeck
```

The package will be stored in `dist/v1/`, or the first successful version after a failed attempt.

## Installing the `.deb` on SteamOS

Copy the resulting `.deb` to the Steam Deck and switch to Desktop Mode.

In a terminal:

```bash
sudo pacman -Syu
```

Then install the package with the Debian package tooling available in your chosen SteamOS environment. If your SteamOS image does not provide a working `.deb` installation workflow, use the same source to build a native package for that SteamOS image instead.

**Important:** SteamOS is Arch-based rather than Debian-based. A `.deb` is therefore not the native SteamOS package format. This project is configured to produce the `.deb` you requested, but for the most reliable Steam Deck distribution, an AppImage or Arch-compatible package is usually a better technical choice.

## Build both targets

From a suitable environment:

```bash
npm run build:all
```

This requests:

```text
Windows → NSIS .exe
Linux   → x86_64 .deb
```

For repeatable releases, build Windows on Windows and Linux on Linux/WSL.

## Versioned build behavior

The build helper uses a simple attempt counter:

```text
dist/
├── v1/
│   └── BUILD_FAILED.txt
├── v2/
│   └── Gurke-Client-1.1.0-linux-x64.deb
└── ...
```

A failed build is kept as `v1`, and the next attempt is `v2`. Fixing the actual compiler/dependency/configuration problem is still required for the next attempt to succeed.

## Release layout

```text
Gurke Client/
├── Windows/
│   └── Gurke-Client-1.1.0-win-x64.exe
└── SteamOS/
    └── Gurke-Client-1.1.0-linux-x64.deb
```

The launcher source is shared between both platforms.

### SteamOS note

SteamOS is Arch-based. The requested `.deb` is therefore not its native install format. Use `npm run build:steamdeck` for an AppImage that is practical on Steam Deck, while `npm run build:linux` produces the requested `.deb`.
