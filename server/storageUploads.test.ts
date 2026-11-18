import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ENV } from "./_core/env";
import { isLocalUploadImageUrl, isMissingLocalUploadImage } from "./storage";

function readServerFile(rel: string): string {
  return readFileSync(new URL(rel, import.meta.url), "utf8");
}

describe("upload storage location", () => {
  it("defaults STORAGE_DIR outside the vite build output so builds cannot wipe uploads", () => {
    const envSource = readServerFile("./_core/env.ts");
    expect(envSource).toContain('?? "./uploads"');
    expect(envSource).not.toContain("dist/public/uploads");
  });

  it("keeps the sample env and Botkeep deploy doc on the safe location", () => {
    const example = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
    expect(example).toContain("STORAGE_DIR=./uploads");
    const deployDoc = readFileSync(new URL("../DEPLOY_BOTKEEP.md", import.meta.url), "utf8");
    expect(deployDoc).toContain("STORAGE_DIR=./uploads");
  });
});

describe("isLocalUploadImageUrl", () => {
  it("matches only /uploads/ paths", () => {
    expect(isLocalUploadImageUrl("/uploads/products/1-white_ab12.png")).toBe(true);
    expect(isLocalUploadImageUrl("https://cdn.snkrdunk.com/upload_bg_removed/x.webp?size=s")).toBe(false);
    expect(isLocalUploadImageUrl("/manus-storage/products/1.png")).toBe(false);
    expect(isLocalUploadImageUrl(null)).toBe(false);
    expect(isLocalUploadImageUrl(undefined)).toBe(false);
    expect(isLocalUploadImageUrl("")).toBe(false);
  });
});

describe("isMissingLocalUploadImage", () => {
  const probeDir = path.join(path.resolve(ENV.storageDir), "products", "__probe__");
  const probeUrl = "/uploads/products/__probe__/probe.png";

  afterAll(() => {
    rmSync(probeDir, { recursive: true, force: true });
  });

  it("never reports remote or forge images as missing", () => {
    expect(isMissingLocalUploadImage("https://cdn.snkrdunk.com/upload_bg_removed/x.webp?size=s")).toBe(false);
    expect(isMissingLocalUploadImage("/manus-storage/products/1.png")).toBe(false);
    expect(isMissingLocalUploadImage(null)).toBe(false);
    expect(isMissingLocalUploadImage(undefined)).toBe(false);
  });

  it("reports a local upload whose file is absent", () => {
    expect(isMissingLocalUploadImage("/uploads/products/definitely-not-there-12345.png")).toBe(true);
  });

  it("treats path traversal as missing instead of reading outside the storage dir", () => {
    expect(isMissingLocalUploadImage("/uploads/../secret.txt")).toBe(true);
  });

  it("reports an existing local upload as present", () => {
    mkdirSync(probeDir, { recursive: true });
    writeFileSync(path.join(probeDir, "probe.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    expect(isMissingLocalUploadImage(probeUrl)).toBe(false);
  });
});

describe("db image flows heal missing local uploads", () => {
  const dbSource = readServerFile("./db.ts");

  it("consults the missing-file check in attach, refresh and price-sync flows", () => {
    expect(dbSource).toContain("isMissingLocalUploadImage } from './storage'");
    const uses = dbSource.split("isMissingLocalUploadImage(product.image)").length - 1;
    expect(uses).toBeGreaterThanOrEqual(3);
  });

  it("refresh keeps a storage image only while its file exists", () => {
    expect(dbSource).toContain("!isMissingLocalUploadImage(product.image)");
    expect(dbSource).toContain("keepsCurrentStorageImage");
  });

  it("price sync re-stores a whitened copy when the local file was lost", () => {
    expect(dbSource).toContain("const imageFileMissing = isMissingLocalUploadImage(product.image);");
    expect(dbSource).toContain("if (sourceImage && imageFileMissing)");
  });
});
