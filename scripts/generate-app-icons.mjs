// Sinh icon PWA cho TCG Manager.
// Nguon uu tien: client/public/app-logo.png (neu co), nguoc lai dung logo.svg.
// Chay: node scripts/generate-app-icons.mjs
// Muon doi logo: thay file app-logo.png (hoac logo.svg) roi chay lai script nay.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "client", "public");
// Uu tien anh logo tuy chinh; fallback ve logo.svg neu chua co.
const candidates = ["app-logo.png", "app-logo.jpg", "app-logo.jpeg", "app-logo.webp", "logo.svg"];
const found = candidates.find((name) => fs.existsSync(path.join(dir, name)));
if (!found) {
  console.error("Khong tim thay app-logo.(png|jpg|jpeg|webp) trong client/public");
  process.exit(1);
}
const source = path.join(dir, found);
const isSvg = found.endsWith(".svg");
console.log(`Nguon icon: ${found}`);

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "favicon-32.png", size: 32 },
];

for (const t of targets) {
  const pipeline = sharp(source, isSvg ? { density: 384 } : {});
  await pipeline
    // Anh nguon la icon vuong -> cover de fill dung khung, giu nguyen noi dung.
    .resize(t.size, t.size, { fit: "cover" })
    .png()
    .toFile(path.join(dir, t.file));
  console.log(`generated ${t.file} (${t.size}x${t.size})`);
}

