import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import puppeteer from "puppeteer-core";

/** Directory where generated pin PNGs are stored (cross-platform temp dir). */
export function getPinsDir(): string {
  return path.join(os.tmpdir(), "pins");
}

/** Resolves a Chrome/Chromium executable: env override, then common locations. */
export function getChromiumPath(): string | null {
  const fromEnv =
    process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROMIUM_PATH;
  if (fromEnv) return fromEnv;

  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];

  return candidates.find((p) => existsSync(p)) ?? null;
}

export type PinImageResult =
  | { ok: true; pinImageUrl: string; imageBase64: string; filename: string }
  | { ok: false; error: string };

/**
 * Renders the /pin-template page in a headless browser and saves a PNG.
 * Returns a public URL served by /api/pin-image/[filename].
 */
export async function generatePinImage(params: {
  title: string;
  category: string;
  rating: string | number;
  image: string;
  slug: string;
}): Promise<PinImageResult> {
  const executablePath = getChromiumPath();
  if (!executablePath) {
    return {
      ok: false,
      error:
        "No Chrome/Chromium found. Set PUPPETEER_EXECUTABLE_PATH to your browser executable.",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const templateUrl = `${baseUrl}/pin-template?title=${encodeURIComponent(
    params.title,
  )}&category=${encodeURIComponent(
    params.category,
  )}&rating=${encodeURIComponent(
    String(params.rating),
  )}&image=${encodeURIComponent(params.image)}&headless=1`;

  const browser = await puppeteer.launch({
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1500 });
    await page.goto(templateUrl, { waitUntil: "networkidle0" });

    const screenshotBuffer = await page.screenshot({ type: "png" });

    const pinsDir = getPinsDir();
    await mkdir(pinsDir, { recursive: true });

    const filename = `pin-${params.slug}-${Date.now()}.png`;
    await writeFile(path.join(pinsDir, filename), screenshotBuffer);

    return {
      ok: true,
      filename,
      pinImageUrl: `${baseUrl}/api/pin-image/${filename}`,
      imageBase64: Buffer.from(screenshotBuffer).toString("base64"),
    };
  } finally {
    await browser.close();
  }
}
