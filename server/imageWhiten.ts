// Tẩy nền đen ảnh sản phẩm thành nền trắng (self-host).
// Chỉ tẩy vùng tối NỐI LIỀN với viền ảnh (nền studio), giữ nguyên vùng tối
// nằm trong ruột ảnh (viền Card đen, chi tiết sản phẩm tối màu).
// Dùng cho ảnh SNKRDUNK nền đen, chạy theo từng ảnh do người dùng bấm.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_SIDE = 1600;
// Ngưỡng khoảng cách màu RGB so với màu nền đã lấy mẫu (0-441).
const BG_DIST_SEED = 30; // điểm chắc chắn là nền khi nằm ở viền
const BG_DIST_GROW = 64; // lan sang điểm kề gần màu nền (ăn nhiễu xám JPEG)
const FEATHER_DIST = 150; // vành mờ hòa vào trắng theo khoảng cách màu
const DESPECKLE_LUMINANCE = 160; // đốm/nhiễu xám lọt giữa nền trắng
const DESPECKLE_PASSES = 4;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Lấy màu nền = trung vị các điểm tối ở viền ảnh (nền studio đen/xám đậm). */
function sampleBackgroundColor(data: Buffer, w: number, h: number): { r: number; g: number; b: number } | null {
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const collect = (x: number, y: number): void => {
    const o = (y * w + x) * 4;
    if (luminance(data[o], data[o + 1], data[o + 2]) < 100) {
      rs.push(data[o]); gs.push(data[o + 1]); bs.push(data[o + 2]);
    }
  };
  for (let x = 0; x < w; x++) { collect(x, 0); collect(x, h - 1); }
  for (let y = 0; y < h; y++) { collect(0, y); collect(w - 1, y); }
  if (rs.length === 0) return null;
  return { r: median(rs), g: median(gs), b: median(bs) };
}

/** Tải ảnh từ URL local /uploads, https remote hoặc data URL thành Buffer. */
export async function loadImageBuffer(src: string | null | undefined): Promise<Buffer> {
  if (!src) throw new Error("Sản phẩm chưa có ảnh để tẩy nền.");
  if (src.startsWith("data:image/")) {
    const base64 = src.split(",", 2)[1];
    if (!base64) throw new Error("Data URL ảnh không hợp lệ.");
    const buf = Buffer.from(base64, "base64");
    if (buf.length > MAX_IMAGE_BYTES) throw new Error("Ảnh quá lớn (tối đa 8MB).");
    return buf;
  }
  if (src.startsWith("/uploads/")) {
    const fullPath = path.join(path.resolve(ENV.storageDir), src.replace(/^\/uploads\//, ""));
    if (!fs.existsSync(fullPath)) throw new Error("Không tìm thấy file ảnh local.");
    const buf = fs.readFileSync(fullPath);
    if (buf.length > MAX_IMAGE_BYTES) throw new Error("Ảnh quá lớn (tối đa 8MB).");
    return buf;
  }
  if (src.startsWith("/manus-storage/")) {
    throw new Error("Ảnh Manus cũ chưa tải về local. Bấm 'Làm mới ảnh từ SNKR' hoặc Upload lại trước.");
  }
  if (src.startsWith("https://")) {
    const response = await fetch(src, {
      headers: { Accept: "image/*,*/*;q=0.8", "User-Agent": "Mozilla/5.0 (compatible; TCGManager/1.0)" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Không tải được ảnh nguồn (${response.status}).`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("image/")) throw new Error("URL nguồn không phải file ảnh.");
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) throw new Error("Ảnh quá lớn (tối đa 8MB).");
    return Buffer.from(arrayBuffer);
  }
  throw new Error("URL ảnh không hỗ trợ tẩy nền.");
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Đổ nền đen nối viền thành trắng, trả về PNG nền trắng. */
export async function whitenImageBackground(input: Buffer, minFillFraction = 0.005): Promise<Buffer> {
  let pipeline = sharp(input).rotate();
  const meta = await pipeline.metadata();
  if ((meta.width ?? 0) > MAX_SIDE || (meta.height ?? 0) > MAX_SIDE) {
    pipeline = pipeline.resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true });
  }
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  // Lấy mẫu màu nền TRƯỚC khi gọt khung (gọt xong có thể hết viền tối).
  const bgBeforePeel = sampleBackgroundColor(data, w, h);
  // Gọt khung viền tối trước (ảnh thumbnail hay có viền đen tách bởi
  // đường sáng mảnh mà flood-fill không vượt qua). Mỗi phía gọt tối đa
  // 6% cạnh, dừng ngay khi gặp hàng/cột sáng (sản phẩm). Zoom hiển thị
  // 1.12x vốn đã che ~5% viền nên không thấy khác biệt.
  const peelBudget = Math.max(2, Math.round(Math.min(w, h) * 0.08));
  const rowMedianLum = (y: number): number => {
    const lums: number[] = [];
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      lums.push(luminance(data[o], data[o + 1], data[o + 2]));
    }
    return median(lums);
  };
  const colMedianLum = (x: number): number => {
    const lums: number[] = [];
    for (let y = 0; y < h; y++) {
      const o = (y * w + x) * 4;
      lums.push(luminance(data[o], data[o + 1], data[o + 2]));
    }
    return median(lums);
  };
  const whitenRow = (y: number): void => {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      data[o] = 255; data[o + 1] = 255; data[o + 2] = 255; data[o + 3] = 255;
    }
  };
  const whitenCol = (x: number): void => {
    for (let y = 0; y < h; y++) {
      const o = (y * w + x) * 4;
      data[o] = 255; data[o + 1] = 255; data[o + 2] = 255; data[o + 3] = 255;
    }
  };
  const peeled = { top: 0, bottom: 0, left: 0, right: 0 };
  const peeledTotal = (): number => peeled.top + peeled.bottom + peeled.left + peeled.right;
  while (peeled.top < peelBudget && rowMedianLum(peeled.top) < 110) { whitenRow(peeled.top); peeled.top++; }
  while (peeled.bottom < peelBudget && rowMedianLum(h - 1 - peeled.bottom) < 110) { whitenRow(h - 1 - peeled.bottom); peeled.bottom++; }
  while (peeled.left < peelBudget && colMedianLum(peeled.left) < 110) { whitenCol(peeled.left); peeled.left++; }
  while (peeled.right < peelBudget && colMedianLum(w - 1 - peeled.right) < 110) { whitenCol(w - 1 - peeled.right); peeled.right++; }
  // Lấy mẫu lại sau khi gọt: nếu hết viền tối mà đã gọt được khung thì
  // xuất luôn ảnh đã gọt; chưa gọt gì thì ảnh vốn đã nền sáng.
  const bgAfterPeel = sampleBackgroundColor(data, w, h);
  const bg = bgAfterPeel ?? bgBeforePeel;
  if (!bg) {
    if (peeledTotal() > 0) {
      console.log(`[imageWhiten] peel-only peel=${peeled.top}/${peeled.bottom}/${peeled.left}/${peeled.right} ${w}x${h}`);
      return sharp(Buffer.from(data), { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    }
    throw new Error("Không phát hiện nền tối quanh ảnh. Ảnh này có thể đã nền sáng.");
  }
  const bgDistAt = (x: number, y: number): number => {
    const o = (y * w + x) * 4;
    const dr = data[o] - bg.r;
    const dg = data[o + 1] - bg.g;
    const db = data[o + 2] - bg.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };
  const filled = new Uint8Array(w * h);
  const stack: number[] = [];

  // Gieo từ toàn bộ viền ảnh theo màu nền đã lấy mẫu.
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      const i = y * w + x;
      if (!filled[i] && bgDistAt(x, y) <= BG_DIST_SEED) { filled[i] = 1; stack.push(i); }
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) {
      const i = y * w + x;
      if (!filled[i] && bgDistAt(x, y) <= BG_DIST_SEED) { filled[i] = 1; stack.push(i); }
    }
  }
  // Lan rộng 4 hướng trong vùng gần màu nền.
  while (stack.length > 0) {
    const i = stack.pop() as number;
    const x = i % w;
    const y = Math.floor(i / w);
    const neighbors: number[] = [];
    if (x > 0) neighbors.push(i - 1);
    if (x < w - 1) neighbors.push(i + 1);
    if (y > 0) neighbors.push(i - w);
    if (y < h - 1) neighbors.push(i + w);
    for (const n of neighbors) {
      if (filled[n]) continue;
      if (bgDistAt(n % w, Math.floor(n / w)) <= BG_DIST_GROW) { filled[n] = 1; stack.push(n); }
    }
  }

  let filledCount = 0;
  for (let i = 0; i < filled.length; i++) {
    if (!filled[i]) continue;
    filledCount++;
    const o = i * 4;
    data[o] = 255; data[o + 1] = 255; data[o + 2] = 255; data[o + 3] = 255;
  }
  // Lượt 2: khung đen tuyệt đối ở sát viền (ảnh có khung đen riêng tách
  // khỏi nền chính). Chỉ gieo điểm đen tuyền ở viền để không ăn sản phẩm.
  const pureBlackDistAt = (x: number, y: number): number => {
    const o = (y * w + x) * 4;
    return Math.sqrt(data[o] * data[o] + data[o + 1] * data[o + 1] + data[o + 2] * data[o + 2]);
  };
  const frameStack: number[] = [];
  const seedFrame = (x: number, y: number): void => {
    const i = y * w + x;
    if (!filled[i] && lumAtCheck(x, y) <= 24) { filled[i] = 2; frameStack.push(i); }
  };
  const lumAtCheck = (x: number, y: number): number => {
    const o = (y * w + x) * 4;
    return luminance(data[o], data[o + 1], data[o + 2]);
  };
  for (let x = 0; x < w; x++) { seedFrame(x, 0); seedFrame(x, h - 1); }
  for (let y = 0; y < h; y++) { seedFrame(0, y); seedFrame(w - 1, y); }
  while (frameStack.length > 0) {
    const i = frameStack.pop() as number;
    filledCount++;
    const o = i * 4;
    data[o] = 255; data[o + 1] = 255; data[o + 2] = 255; data[o + 3] = 255;
    const x = i % w;
    const y = Math.floor(i / w);
    const neighbors: number[] = [];
    if (x > 0) neighbors.push(i - 1);
    if (x < w - 1) neighbors.push(i + 1);
    if (y > 0) neighbors.push(i - w);
    if (y < h - 1) neighbors.push(i + w);
    for (const n of neighbors) {
      if (filled[n]) continue;
      if (pureBlackDistAt(n % w, Math.floor(n / w)) <= 80) { filled[n] = 2; frameStack.push(n); }
    }
  }
  console.log(`[imageWhiten] bg=(${bg.r},${bg.g},${bg.b}) filled=${((filledCount / (w * h)) * 100).toFixed(1)}% peel=${peeled.top}/${peeled.bottom}/${peeled.left}/${peeled.right} ${w}x${h}`);
  if (filledCount < w * h * minFillFraction) {
    // Gọt khung đã xử lý được viền đen dày thì xuất luôn ảnh đã gọt,
    // không hủy công sức gọt chỉ vì flood-fill không bám thêm.
    if (peeledTotal() > 0) {
      console.log(`[imageWhiten] peel-only output peel=${peeled.top}/${peeled.bottom}/${peeled.left}/${peeled.right}`);
      return sharp(Buffer.from(data), { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    }
    throw new Error("Không phát hiện đủ nền đen quanh ảnh. Ảnh này có thể đã nền sáng.");
  }
  // Làm mềm vành chuyển tiếp: càng gần màu nền càng hòa nhiều vào trắng.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (filled[i]) continue;
      const o = i * 4;
      const dist = bgDistAt(x, y);
      if (dist > FEATHER_DIST) continue;
      const hasFilledNeighbor =
        (x > 0 && filled[i - 1]) || (x < w - 1 && filled[i + 1]) ||
        (y > 0 && filled[i - w]) || (y < h - 1 && filled[i + w]);
      if (hasFilledNeighbor) {
        const blend = 1 - dist / FEATHER_DIST; // 0..1, gần màu nền thì trắng nhiều
        data[o] = Math.round(data[o] + (255 - data[o]) * blend);
        data[o + 1] = Math.round(data[o + 1] + (255 - data[o + 1]) * blend);
        data[o + 2] = Math.round(data[o + 2] + (255 - data[o + 2]) * blend);
        data[o + 3] = 255;
      }
    }
  }
  // Tách nền kiểu screen-blend: điểm xám lọt giữa nền trắng được xem như
  // điểm đen trong suốt một phần, hòa lên trắng theo độ trong suốt của nó.
  // Điểm tối trong ruột sản phẩm (nhiều điểm tối kề nhau) không bị chạm tới.
  for (let pass = 0; pass < DESPECKLE_PASSES; pass++) {
    const snapshot = Buffer.from(data);
    const snapLum = (o: number): number => luminance(snapshot[o], snapshot[o + 1], snapshot[o + 2]);
    const snapWhite = (o: number): boolean =>
      filled[o / 4] === 1 || (snapshot[o] > 200 && snapshot[o + 1] > 200 && snapshot[o + 2] > 200);
    let changed = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (filled[i]) continue;
        const o = i * 4;
        if (snapLum(o) > DESPECKLE_LUMINANCE) continue;
        let whiteNeighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            if (snapWhite((ny * w + nx) * 4)) whiteNeighbors++;
          }
        }
        if (whiteNeighbors >= 5) {
          const r = snapshot[o];
          const g = snapshot[o + 1];
          const b = snapshot[o + 2];
          const alpha = Math.max(r, g, b) / 255;
          if (alpha <= 0.04) {
            data[o] = 255; data[o + 1] = 255; data[o + 2] = 255; data[o + 3] = 255;
          } else {
            // Hòa điểm ảnh lên nền trắng theo độ trong suốt: đen mờ dần,
            // xám nhạt gần như trắng hẳn, viền sản phẩm mịn không răng cưa.
            data[o] = Math.round(r * alpha + 255 * (1 - alpha));
            data[o + 1] = Math.round(g * alpha + 255 * (1 - alpha));
            data[o + 2] = Math.round(b * alpha + 255 * (1 - alpha));
            data[o + 3] = 255;
          }
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return sharp(Buffer.from(data), { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/** Tẩy nền rồi lưu vào storage, trả về URL lưu trữ. */
export async function whitenAndStoreImage(src: string | null | undefined, keyBase: string): Promise<{ url: string; key: string }> {
  const buffer = await loadImageBuffer(src);
  const whitened = await whitenImageBackground(buffer);
  return storagePut(`${keyBase}-white.png`, whitened, "image/png");
}

/** Bản tự động: không bao giờ ném lỗi, trả null khi không tẩy được (giữ ảnh gốc). */
export async function tryWhitenBuffer(buffer: Buffer, minFillFraction = 0.15): Promise<Buffer | null> {
  try {
    return await whitenImageBackground(buffer, minFillFraction);
  } catch (error) {
    console.warn("[imageWhiten] auto-whiten skipped:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

/** Bản tự động: tải + tẩy + lưu, trả URL mới hoặc null để giữ ảnh gốc. */
export async function tryWhitenAndStore(src: string | null | undefined, keyBase: string, minFillFraction = 0.15): Promise<string | null> {
  try {
    const buffer = await loadImageBuffer(src);
    const whitened = await whitenImageBackground(buffer, minFillFraction);
    const stored = await storagePut(`${keyBase}-white.png`, whitened, "image/png");
    return stored.url;
  } catch (error) {
    console.warn("[imageWhiten] auto-whiten skipped:", error instanceof Error ? error.message : String(error));
    return null;
  }
}
