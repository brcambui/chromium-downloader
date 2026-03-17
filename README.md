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

### Download a specific version or revision

Pass a full Chromium version string or a raw integer branch-position revision:

```sh
# by version string (resolved via ChromiumDash)
yarn dev -- -v 145.0.7632.160

# by raw revision / branch position
yarn dev -- -v 1234567

# combine with platform and build type
yarn dev -- -v 145.0.7632.160 -p Mac_Arm -b snapshots
```

When a version string is supplied it is looked up against the ChromiumDash API to obtain the corresponding `chromium_main_branch_position`. A plain integer is used directly as the revision.

If the exact revision has no snapshot in the selected build type, the tool automatically advances to the nearest revision that does and logs a message before downloading.

Alternatively, build first and run the compiled CLI:

```sh
yarn build
node dist/index.js -- -b snapshots -p Linux_x64
node dist/index.js -- -v 145.0.7632.160 -p Linux_x64
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
- -v, --version <version>
  - A specific Chromium version string (e.g. `145.0.7632.160`) or a raw integer revision/branch-position
  - When omitted, the latest revision for the selected build type and platform is downloaded
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
2. Determine the target revision:
   - **No `--version` flag:** fetches the latest revision from
     `https://commondatastorage.googleapis.com/chromium-browser-{build-type}/{platform}/LAST_CHANGE`
   - **`--version` is a plain integer:** used directly as the revision
   - **`--version` is a version string:** resolved to a `chromium_main_branch_position` via
     `https://chromiumdash.appspot.com/fetch_version?version={version}`
3. Find the nearest available snapshot: queries the GCS bucket for objects with prefix `{platform}/{revision}/` and advances to the first revision `>=` the target that contains the requested zip file
4. Build the download URL:
   - `https://commondatastorage.googleapis.com/chromium-browser-{build-type}/{platform}/{revision}/{zip-name}`
5. Stream the download to disk, showing progress when `content-length` is available

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
