import { storagePut } from "./storage";

const MIME_TYPES = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
} as const;

export function parseLoginBackgroundDataUrl(imageDataUrl: string) {
  const match = imageDataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Ảnh nền không hợp lệ. Hãy dùng PNG, JPEG hoặc WEBP.");

  const [, format, encoded] = match;
  const data = Buffer.from(encoded, "base64");
  if (data.length < 64 || data.length > 4_000_000) throw new Error("Ảnh nền phải có dung lượng từ 64 byte đến 4 MB.");

  return { data, extension: format, contentType: MIME_TYPES[format as keyof typeof MIME_TYPES] };
}

export async function uploadLoginBackground(userId: number, imageDataUrl: string) {
  const image = parseLoginBackgroundDataUrl(imageDataUrl);
  return storagePut(`login-backgrounds/${userId}/background.${image.extension}`, image.data, image.contentType);
}
