/**
 * src/utils/image-compress.js
 *
 * Shared image compression utility.
 * Compresses an image buffer so the result is ≤ MAX_SIZE_BYTES (1 MB).
 *
 * Strategy:
 *   1. Resize to maxWidth (default 1200px) — never upscales.
 *   2. Try JPEG quality 85 → 75 → 65 → 50.
 *   3. If still too large, drop to 900px and repeat.
 *   4. Last resort: 600px, quality 40.
 *   PNG inputs are converted to JPEG (jewelry photos don't need transparency).
 *   WebP inputs stay WebP.
 */

import sharp from "sharp";

export const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB
const MAX_WIDTH = 1200;

const QUALITY_LADDER = [85, 75, 65, 50];
const WIDTH_LADDER = [MAX_WIDTH, 900, 600];

/**
 * Compress `inputBuffer` to ≤ 1 MB.
 *
 * @param {Buffer} inputBuffer  Raw image bytes
 * @returns {Promise<{ buffer: Buffer, contentType: string, ext: string }>}
 */
export async function compressToUnderOneMB(inputBuffer) {
  const meta = await sharp(inputBuffer).metadata();
  const useWebP = meta.format === "webp";

  for (const width of WIDTH_LADDER) {
    for (const quality of QUALITY_LADDER) {
      let pipeline = sharp(inputBuffer).resize({
        width,
        withoutEnlargement: true,
      });

      const compressed = useWebP
        ? await pipeline.webp({ quality }).toBuffer()
        : await pipeline.flatten({ background: "#ffffff" }).jpeg({ quality, progressive: true }).toBuffer();

      if (compressed.length <= MAX_SIZE_BYTES) {
        return {
          buffer: compressed,
          contentType: useWebP ? "image/webp" : "image/jpeg",
          ext: useWebP ? "webp" : "jpg",
        };
      }
    }
  }

  // Absolute last resort
  const compressed = await sharp(inputBuffer)
    .resize({ width: 400, withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 35, progressive: true })
    .toBuffer();

  return { buffer: compressed, contentType: "image/jpeg", ext: "jpg" };
}
