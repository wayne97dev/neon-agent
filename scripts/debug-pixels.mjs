import sharp from "sharp";
const SRC = new URL("../public/logo-grid.jpg", import.meta.url).pathname;

const { data, info } = await sharp(SRC)
  .extract({
    left: Math.round(1024 * 0.2),
    top: Math.round(1024 * 0.25),
    width: Math.round(1024 * 0.6),
    height: Math.round(1024 * 0.6),
  })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const W = info.width;
const H = info.height;
console.log(`Cropped: ${W}x${H}`);

// Check corner + edge samples
const samples = [
  [0, 0, "top-left"],
  [W - 1, 0, "top-right"],
  [0, H - 1, "bot-left"],
  [W - 1, H - 1, "bot-right"],
  [Math.round(W / 2), 0, "top-mid"],
  [0, Math.round(H / 2), "mid-left"],
  [10, 10, "inset-10"],
  [50, 50, "inset-50"],
];

for (const [x, y, label] of samples) {
  const i = (y * W + x) * 4;
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const minRGB = Math.min(r, g, b);
  const maxRGB = Math.max(r, g, b);
  const sat = maxRGB === 0 ? 0 : (maxRGB - minRGB) / maxRGB;
  console.log(`${label.padEnd(12)} @ (${x},${y}) RGB=${r},${g},${b}  min=${minRGB} sat=${sat.toFixed(3)}`);
}
