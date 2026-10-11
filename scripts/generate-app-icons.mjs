// Sinh icon PWA cho TCG Manager tu client/public/logo.svg bang sharp.
// Chay: node scripts/generate-app-icons.mjs
// Muon doi logo: thay file client/public/logo.svg roi chay lai script nay.
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "client", "public");
const svg = path.join(dir, "logo.svg");

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "favicon-32.png", size: 32 },
];

for (const t of targets) {
  await sharp(svg, { density: 384 })
    .resize(t.size, t.size, { fit: "contain", background: { r: 11, g: 18, b: 32, alpha: 1 } })
    .flatten({ background: "#0b1220" })
    .png()
    .toFile(path.join(dir, t.file));
  console.log(`generated ${t.file} (${t.size}x${t.size})`);
}
