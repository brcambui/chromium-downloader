import { Command } from "commander";
import axios from "axios";
import fs from "fs";

const LAST_REVISION_TEMPLATE = "https://commondatastorage.googleapis.com/chromium-browser-{build-type}/{platform}/LAST_CHANGE";
const LAST_BUILD_TEMPLATE = "https://commondatastorage.googleapis.com/chromium-browser-{build-type}/{platform}/{revision}/{zip-name}";

const PLATFORMS = [
  "Win",
  "Win_x64",
  "Mac",
  "Mac_Arm",
  "Linux",
  "Linux_x64",
  "Linux_ChromiumOS_Full",
  "Linux_ARM_Cross-Compile",
  "Android",
  "Android_Arm64"
];

type BuildType = "continuous" | "official" | "snapshots";
type ChromiumPlatform = "Win"
  | "Win_x64"
  | "Mac"
  | "Mac_Arm"
  | "Linux"
  | "Linux_x64"
  | "Linux_ChromiumOS_Full"
  | "Linux_ARM_Cross-Compile"
  | "Android"
  | "Android_Arm64";

const getZipName = (platform: ChromiumPlatform): string => {
  switch (platform) {
    case "Win":
    case "Win_x64":
      return "chrome-win.zip";
    case "Mac":
    case "Mac_Arm":
      return "chrome-mac.zip";
    case "Linux":
    case "Linux_x64":
    case "Linux_ARM_Cross-Compile":
      return "chrome-linux.zip";
    case "Linux_ChromiumOS_Full":
      return "chrome-chromeos.zip";
    case "Android":
    case "Android_Arm64":
      return "chrome-android.zip";
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
};

const getLastRevisionUrl = (buildType: BuildType, platform: ChromiumPlatform) => {
  return LAST_REVISION_TEMPLATE
    .replace("{build-type}", buildType)
    .replace("{platform}", platform);
};

const getLastBuildUrl = (buildType: BuildType, platform: ChromiumPlatform, revision: number, zipName: string) => {
  return LAST_BUILD_TEMPLATE
    .replace("{build-type}", buildType)
    .replace("{platform}", platform)
    .replace("{revision}", revision.toString())
    .replace("{zip-name}", zipName);
};

const getLastRevision = async (buildType: BuildType, platform: ChromiumPlatform): Promise<number> => {
  const url = getLastRevisionUrl(buildType, platform);
  const response = await axios.get(url);
  return response.data;
};

const getLastBuild = async (buildType: BuildType, platform: ChromiumPlatform, revision: number, zipName: string): Promise<string> => {
  return getLastBuildUrl(buildType, platform, revision, zipName);
};

const getCurrentPlatform = (): ChromiumPlatform => {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === "win32") return arch === "x64" ? "Win_x64" : "Win";
  if (platform === "darwin") return arch === "arm64" ? "Mac_Arm" : "Mac";
  if (platform === "linux") return arch === "x64" ? "Linux_x64" : "Linux";
  // Default to Win if unknown
  return "Win";
};

const downloadChromium = async (buildType: BuildType, platform: ChromiumPlatform) => {
  try {
    const zipName = getZipName(platform);

    // Fetch the latest revision and build URL
    const revision = await getLastRevision(buildType, platform);
    const downloadUrl = await getLastBuild(buildType, platform, revision, zipName);
    console.log(`Latest Chromium build for ${platform} (${buildType}):`);
    console.log(`Revision: ${revision}`);
    console.log(`Download URL: ${downloadUrl}`);

    // Prepare download directory
    const dir = "./chromium-downloads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = `${dir}/${zipName}`;
    console.log(`Downloading: ${downloadUrl}`);
    console.log(`Saving to: ${filePath}`);

    // Download with progress
    const response = await axios.get(downloadUrl, { responseType: "stream" });
    const total = Number(response.headers["content-length"] || 0);
    const writer = fs.createWriteStream(filePath);

    let downloaded = 0;
    let lastLogged = 0;

    response.data.on("data", (chunk: Buffer) => {
      downloaded += chunk.length;
      const now = Date.now();
      if (now - lastLogged > 250 || downloaded === total) {
        if (total > 0) {
          const percent = Math.floor((downloaded / total) * 100);
          process.stdout.write(
            `\rProgress: ${percent}% (${(downloaded / 1048576).toFixed(2)}/${(total / 1048576).toFixed(2)} MB)`
          );
        } else {
          process.stdout.write(`\rDownloaded ${(downloaded / 1048576).toFixed(2)} MB`);
        }
        lastLogged = now;
      }
    });

    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
      response.data.on("error", reject);
    });

    process.stdout.write("\n");
    console.log("Download finished.");
  } catch (error) {
    console.error(`Failed to download Chromium for ${platform} (${buildType}):`, error);
  }
};

const program = new Command();

program
  .option('-b, --build-type <type>', 'Build type ("continuous", "official", "snapshots")', "snapshots")
  .option('-p, --platform <platform>', `Platform (${PLATFORMS.join(", ")})`, getCurrentPlatform())
  .option('--list-platforms', 'List all supported platforms', () => {
    console.log("Supported platforms:");
    PLATFORMS.forEach(p => console.log(`- ${p}`));
    process.exit(0);
  })
  .option('--list-build-types', 'List all supported build types', () => {
    console.log("Supported build types:");
    ["continuous", "official", "snapshots"].forEach(bt => console.log(`- ${bt}`));
    process.exit(0);
  });

program.parse(process.argv);
const options = program.opts();

downloadChromium(options.buildType, options.platform);