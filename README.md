# Chromium Downloader

A tiny CLI that fetches the latest Chromium build zip for a given platform from the official Google Storage buckets and saves it locally with a simple progress bar.

It queries the LAST_CHANGE for a platform/build-type, constructs the download URL for that revision, and downloads the corresponding zip into `./chromium-downloads/`.

## Requirements

- Node.js 18+ (recommended)
- Yarn 4 (this repo uses `packageManager: "yarn@4.9.1"`)

## Install

```sh
# install dependencies
yarn install
```

## Quick start

Run directly from source with tsx:

```sh
yarn dev
```

By default it:
- Detects your current OS/arch and chooses an appropriate Chromium platform
- Uses build type `snapshots`
- Downloads the zip to `./chromium-downloads/`

### Choose build type and platform

```sh
# list supported platforms
yarn dev -- --list-platforms

# list supported build types
yarn dev -- --list-build-types

# download for a specific platform and build type
yarn dev -- -b snapshots -p Mac_Arm
```

Alternatively, build first and run the compiled CLI:

```sh
yarn build
node dist/index.js -- -b snapshots -p Linux_x64
```

Tip: When running through a package script, pass CLI args after `--` so they reach the program.

## CLI options

- -b, --build-type <type>
  - One of: `continuous`, `official`, `snapshots` (default: `snapshots`)
- -p, --platform <platform>
  - One of:
    - Win, Win_x64
    - Mac, Mac_Arm
    - Linux, Linux_x64, Linux_ChromiumOS_Full, Linux_ARM_Cross-Compile
    - Android, Android_Arm64
  - Defaults to a best-effort detection based on your OS and CPU arch
- --list-platforms
  - Prints all supported platform identifiers and exits
- --list-build-types
  - Prints all supported build types and exits

## What gets downloaded?

The zip filename depends on platform:
- Windows: `chrome-win.zip`
- macOS (Intel/Apple Silicon): `chrome-mac.zip`
- Linux (incl. ARM Cross-Compile): `chrome-linux.zip`
- ChromeOS (full): `chrome-chromeos.zip`
- Android (incl. arm64): `chrome-android.zip`

Files are saved under `./chromium-downloads/` without extraction.

## How it works

1. Resolve the platform and zip name
2. Get the latest revision number from:
   - `https://commondatastorage.googleapis.com/chromium-browser-{build-type}/{platform}/LAST_CHANGE`
3. Build the download URL:
   - `https://commondatastorage.googleapis.com/chromium-browser-{build-type}/{platform}/{revision}/{zip-name}`
4. Stream the download to disk, showing progress when `content-length` is available

## Notes and caveats

- Availability varies: not every build-type/platform combination exists for every revision. A 404 usually means that combo isn’t published. Try another build type (most users want `snapshots`).
- Downloads can be large (hundreds of MB). Ensure you have bandwidth and disk space.
- This tool only downloads; it doesn’t extract or install Chromium.
- Proxy/corporate networks: you may need to configure proxy settings for Node.js/axios (e.g., environment variables like `HTTPS_PROXY`).

## Troubleshooting

- 404 Not Found
  - The selected build-type/platform likely isn’t available. Try `snapshots` or a different platform.
- ECONNRESET / ETIMEDOUT
  - Network issues or proxies/firewalls. Retry on a stable network or configure proxy.
- EACCES / permission errors
  - Ensure you have write access to the working directory or change the output path.

## License

MIT © Brendon Cambui

## Acknowledgments

- Chromium builds hosted on Google Cloud Storage by the Chromium project.
- The download helper at https://download-chromium.appspot.com/ (https://github.com/beaufortfrancois/download-chromium).
