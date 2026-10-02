import { storagePut } from "./storage";

const MIME_TYPES = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
} as const;

export function parseAvatarDataUrl(imageDataUrl: string) {
  const match = imageDataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Ảnh đại diện không hợp lệ. Hãy dùng PNG, JPEG hoặc WEBP.");

  const [, format, encoded] = match;
  const data = Buffer.from(encoded, "base64");
  if (data.length < 64 || data.length > 3 * 1024 * 1024) {
    throw new Error("Ảnh đại diện cần có dung lượng từ 64 byte đến 3 MB.");
  }

  return {
    extension: format === "jpeg" ? "jpg" : format,
    contentType: MIME_TYPES[format as keyof typeof MIME_TYPES],
    data,
  };
}

export async function uploadUserAvatar(userId: number, imageDataUrl: string) {
  const image = parseAvatarDataUrl(imageDataUrl);
  return storagePut(`user-avatars/${userId}/avatar.${image.extension}`, image.data, image.contentType);
}
