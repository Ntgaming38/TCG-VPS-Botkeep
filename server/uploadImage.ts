/**
 * Validation for the /api/upload-image endpoint.
 *
 * Uploaded files are served back from the same origin under /uploads/,
 * so only real raster images are accepted: SVG (scriptable), HTML and
 * arbitrary binaries must never reach storage, whatever extension or
 * Content-Type the client claims.
 */

export const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB decoded

const IMAGE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export type ValidatedProductImage = {
  /** Safe extension derived from the validated type (jpg is canonical for jpeg). */
  ext: string;
  /** Canonical Content-Type for the validated type. */
  contentType: string;
};

function hasImageMagicBytes(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 12) return false;
  switch (ext) {
    case "png":
      return buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    case "jpg":
    case "jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "gif":
      return buffer.subarray(0, 4).toString("ascii") === "GIF8";
    case "webp":
      return (
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    default:
      return false;
  }
}

/**
 * Validate an uploaded product image by claimed filename/Content-Type AND
 * by its actual magic bytes. Throws an Error with a user-facing message
 * when the upload is not an acceptable image.
 */
export function validateProductImageUpload(input: {
  filename: unknown;
  contentType: unknown;
  buffer: Buffer;
}): ValidatedProductImage {
  const { filename, contentType, buffer } = input;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Empty image data");
  }
  if (buffer.length > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("Image exceeds the 10 MB size limit");
  }
  if (typeof filename !== "string" || !filename.trim()) {
    throw new Error("Missing filename");
  }

  // Only the final extension of the bare file name counts; path segments
  // and double extensions ("evil.png.html") cannot smuggle a type in.
  const baseName = filename.replace(/\\/g, "/").split("/").pop() ?? "";
  const claimedExt = baseName.split(".").pop()?.toLowerCase() ?? "";
  const canonicalContentType = IMAGE_TYPES[claimedExt];
  if (!canonicalContentType) {
    throw new Error("Only PNG, JPEG, WebP or GIF images are allowed");
  }

  // If the client sent a Content-Type it must agree with the extension;
  // the stored type is always the canonical one, never the claimed one.
  if (typeof contentType === "string" && contentType.trim()) {
    const claimedType = contentType.split(";")[0].trim().toLowerCase();
    if (claimedType !== canonicalContentType) {
      throw new Error("Image Content-Type does not match its file extension");
    }
  }

  if (!hasImageMagicBytes(buffer, claimedExt)) {
    throw new Error("File content is not a valid image of the claimed type");
  }

  return {
    ext: claimedExt === "jpeg" ? "jpg" : claimedExt,
    contentType: canonicalContentType,
  };
}
