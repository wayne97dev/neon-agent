// Extract clean pill from logo-grid.jpg (which is actually pill-on-black)
// Flood-fill black background from edges -> transparent, preserving pill interior
import sharp from "sharp";

const SRC = new URL("../public/logo-grid.jpg", import.meta.url).pathname;
const OUT = new URL("../public/logo.png", import.meta.url).pathname;

// Is pixel near-black (dark background)?
function isBackground(r, g, b) {
  // Very dark = background. Use max channel as the brightest signal.
  const maxRGB = Math.max(r, g, b);
  return maxRGB < 35; // threshold: anything brighter is pill content (incl. cyan glow)
}

async function main() {
  const input = sharp(SRC);
  const { width, height } = await input.metadata();
  console.log(`Source: ${width}x${height}`);

  // Tight crop around the pill (pill is in middle, diagonal)
  const cropW = Math.round(width * 0.6);
  const cropH = Math.round(height * 0.6);
  const cropX = Math.round(width * 0.2);
  const cropY = Math.round(height * 0.25);
  console.log(`Crop: ${cropX},${cropY} ${cropW}x${cropH}`);

  const { data, info } = await input
    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const W = info.width;
  const H = info.height;
  const total = W * H;

  // Flood-fill from edges: mark connected black pixels as transparent
  const visited = new Uint8Array(total);
  const queue = [];

  // Seed edge pixels
  const seed = (x, y) => {
    const i = y * W + x;
    const off = i * 4;
    if (!visited[i] && isBackground(data[off], data[off + 1], data[off + 2])) {
      visited[i] = 1;
      queue.push(i);
    }
  };

  for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
  for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }

  const dx = [1, -1, 0, 0, 1, 1, -1, -1];
  const dy = [0, 0, 1, -1, 1, -1, 1, -1];

  while (queue.length > 0) {
    const i = queue.shift();
    const x = i % W;
    const y = Math.floor(i / W);

    for (let d = 0; d < 8; d++) {
      const nx = x + dx[d];
      const ny = y + dy[d];
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
      const ni = ny * W + nx;
      if (visited[ni]) continue;
      const noff = ni * 4;
      if (isBackground(data[noff], data[noff + 1], data[noff + 2])) {
        visited[ni] = 1;
        queue.push(ni);
      }
    }
  }

  // Apply transparency to flood-filled pixels with soft anti-aliasing at edges
  // Pass 1: hard transparent for all visited
  for (let i = 0; i < total; i++) {
    if (visited[i]) data[i * 4 + 3] = 0;
  }

  // Pass 2: soft edge feathering — for opaque pixels bordering transparent,
  // fade alpha proportionally to number of transparent neighbors
  const originalAlpha = new Uint8Array(total);
  for (let i = 0; i < total; i++) originalAlpha[i] = data[i * 4 + 3];

  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (visited[i]) continue;

      let transCount = 0;
      for (let d = 0; d < 8; d++) {
        const ni = (y + dy[d]) * W + (x + dx[d]);
        if (visited[ni]) transCount++;
      }

      if (transCount >= 6) {
        // surrounded by transparent -> fully transparent
        data[i * 4 + 3] = 0;
      } else if (transCount >= 3) {
        // edge feather
        data[i * 4 + 3] = Math.min(255, 180);
      }
    }
  }

  await sharp(data, {
    raw: { width: W, height: H, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(OUT);

  const visitedCount = visited.reduce((s, v) => s + v, 0);
  console.log(
    `Saved. Transparent: ${visitedCount}/${total} (${((visitedCount / total) * 100).toFixed(1)}%)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
