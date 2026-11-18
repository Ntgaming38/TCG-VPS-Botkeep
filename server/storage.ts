// Self-host storage: local disk (Oracle VPS free) with Forge fallback.
// Uploads go to STORAGE_DIR (default ./uploads — deliberately outside dist/,
// whose contents the vite build wipes on every start) and are served as /uploads/{key}.

import fs from "node:fs";
import path from "node:path";
import { ENV } from "./_core/env";

function useForge(): boolean {
  return Boolean(ENV.forgeApiUrl && ENV.forgeApiKey);
}

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  if (!useForge()) {
    const dir = path.resolve(ENV.storageDir);
    fs.mkdirSync(dir, { recursive: true });
    const safeKey = key.replace(/[^a-zA-Z0-9._/-]/g, "_");
    const fullPath = path.join(dir, safeKey);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    const buf = typeof data === "string" ? Buffer.from(data) : Buffer.from(data as Uint8Array);
    fs.writeFileSync(fullPath, buf);
    return { key: safeKey, url: `/uploads/${safeKey}` };
  }
  const { forgeUrl, forgeKey } = getForgeConfig();

  // 1. Get presigned PUT URL from Forge
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  // 2. PUT file directly to S3
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

/** True when an image value points at a locally stored upload ("/uploads/..."). */
export function isLocalUploadImageUrl(image: string | null | undefined): boolean {
  return Boolean(image?.startsWith("/uploads/"));
}

/**
 * True when an image value is a local upload whose file is missing on disk.
 * A missing file means the stored URL can only render as a broken image, so
 * callers should re-create the image from its source instead of keeping the
 * dead path. Forge ("/manus-storage/") images are not local files and are
 * never reported missing here.
 */
export function isMissingLocalUploadImage(image: string | null | undefined): boolean {
  if (!isLocalUploadImageUrl(image)) return false;
  const relKey = (image as string).slice("/uploads/".length);
  if (!relKey || relKey.includes("..")) return true;
  try {
    return !fs.existsSync(path.join(path.resolve(ENV.storageDir), relKey));
  } catch {
    return true;
  }
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  if (key.startsWith("uploads/") || !useForge()) return { key, url: `/uploads/${key}` };
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  if (key.startsWith("uploads/") || !useForge()) return `/uploads/${key}`;
  const { forgeUrl, forgeKey } = getForgeConfig();

  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}
