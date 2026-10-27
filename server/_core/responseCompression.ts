import compression from "compression";
import type { RequestHandler } from "express";

/**
 * Response compression for everything this server sends.
 *
 * The production bundle ships a multi-MB JS file (~3 MB) plus CSS and the
 * SPA shell, and Botkeep's connection is slow — without compression every
 * first visit downloads all of it raw. The `compression` middleware
 * negotiates the encoding from Accept-Encoding (gzip/deflate), compresses
 * only compressible content types above the threshold (JS/CSS/HTML/JSON;
 * images and archives are skipped by its default filter), and adds
 * `Vary: Accept-Encoding` so caches keep the variants apart.
 */
export function createResponseCompression(): RequestHandler {
  return compression({ threshold: 1024 });
}
