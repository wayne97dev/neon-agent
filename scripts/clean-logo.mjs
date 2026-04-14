// Extract clean pill from logo-grid.jpg, remove white background
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";

const SRC = new URL("../public/logo-grid.jpg", import.meta.url).pathname;
const OUT = new URL("../public/logo.png", import.meta.url).pathname;

async function main() {
  // Load source
  const input = sharp(SRC);
  const { width, height } = await input.metadata();
  console.log(`Source: ${width}x${height}`);

  // Pill is diagonal in the image — give it lots of padding
  // Wider crop: 60% wide, 60% tall, slightly off-center
  const cropW = Math.round(width * 0.6);
  const cropH = Math.round(height * 0.6);
  const cropX = Math.round(width * 0.2);
  const cropY = Math.round(height * 0.25);

  console.log(`Crop: ${cropX},${cropY} ${cropW}x${cropH}`);

  // Extract the crop
  const cropped = await input
    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = cropped;
  const px = info.width * info.height;

  // Remove near-white pixels (make them transparent)
  // threshold: if pixel is very bright + low saturation => transparent
  for (let i = 0; i < px; i++) {
    const off = i * 4;
    const r = data[off];
    const g = data[off + 1];
    const b = data[off + 2];

    // Brightness check (min of channels high = near white)
    const minRGB = Math.min(r, g, b);
    const maxRGB = Math.max(r, g, b);
    const saturation = maxRGB === 0 ? 0 : (maxRGB - minRGB) / maxRGB;

    // If pixel is very bright and low saturation => white background
    if (minRGB > 200 && saturation < 0.12) {
      // Fade alpha based on brightness
      const t = (minRGB - 200) / 55; // 0..1
      data[off + 3] = Math.max(0, Math.round(255 * (1 - t)));
    }
  }

  // Save as PNG with transparency
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(OUT);

  console.log(`Saved clean logo to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
