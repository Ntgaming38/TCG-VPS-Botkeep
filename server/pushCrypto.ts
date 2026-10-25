import crypto from "node:crypto";

/**
 * Web Push primitives implemented on Node's built-in crypto so the app needs
 * no extra dependency: VAPID (RFC 8292, ES256 JWT) and payload encryption
 * (RFC 8291, "aes128gcm" content encoding). Pure functions — no DB, no I/O —
 * so they can be unit-tested against the RFC 8291 example values.
 */

export function base64UrlEncode(input: Buffer | Uint8Array): string {
  return Buffer.from(input).toString("base64url");
}

export function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

export interface VapidKeys {
  /** Uncompressed P-256 public point (0x04 || X || Y), base64url — the value browsers subscribe with. */
  publicKey: string;
  /** EC private key as JWK; persisted server-side only. */
  privateKeyJwk: JsonWebKey;
}

function rawUncompressedPoint(jwk: JsonWebKey): Buffer {
  if (!jwk.x || !jwk.y) throw new Error("EC JWK is missing public coordinates.");
  return Buffer.concat([Buffer.from([0x04]), base64UrlDecode(jwk.x), base64UrlDecode(jwk.y)]);
}

export function generateVapidKeys(): VapidKeys {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
  const publicJwk = publicKey.export({ format: "jwk" }) as JsonWebKey;
  const privateJwk = privateKey.export({ format: "jwk" }) as JsonWebKey;
  return { publicKey: base64UrlEncode(rawUncompressedPoint(publicJwk)), privateKeyJwk: privateJwk };
}

/** Builds the `Authorization: vapid t=<jwt>, k=<publicKey>` header value for one push endpoint. */
export function createVapidAuthorizationHeader(endpoint: string, subject: string, keys: VapidKeys, expiresInSeconds = 12 * 60 * 60): string {
  const audience = new URL(endpoint).origin;
  const headerSegment = base64UrlEncode(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payloadSegment = base64UrlEncode(Buffer.from(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    sub: subject,
  })));
  const signingInput = `${headerSegment}.${payloadSegment}`;
  // The DOM JsonWebKey type and @types/node's differ cosmetically; the shape is identical.
  const key = crypto.createPrivateKey({ key: keys.privateKeyJwk as never, format: "jwk" });
  const signature = crypto.sign("sha256", Buffer.from(signingInput), { key, dsaEncoding: "ieee-p1363" });
  return `vapid t=${signingInput}.${base64UrlEncode(signature)}, k=${keys.publicKey}`;
}

function hmacSha256(key: Buffer, data: Buffer): Buffer {
  return crypto.createHmac("sha256", key).update(data).digest();
}

/** HKDF-Expand for outputs of at most 32 bytes (a single HMAC block), as RFC 8291 uses it. */
function hkdfExpandSingleBlock(prk: Buffer, info: Buffer, length: number): Buffer {
  return hmacSha256(prk, Buffer.concat([info, Buffer.from([0x01])])).subarray(0, length);
}

export interface PushSubscriptionKeys {
  /** Browser's P-256 public key (uncompressed point), base64url. */
  p256dh: string;
  /** Browser's auth secret, base64url. */
  auth: string;
}

export interface EncryptPushOptions {
  /** Test hook: fixed salt instead of a random one. */
  salt?: Buffer;
  /** Test hook: fixed ephemeral (sender) private key instead of a generated one. */
  ephemeralPrivateKeyJwk?: JsonWebKey;
}

const RECORD_SIZE = 4096;

/**
 * Encrypts one push payload for one subscription following RFC 8291:
 * body = salt(16) || rs(4) || idlen(1) || senderPublic(65) || AES-128-GCM record.
 */
export function encryptPushPayload(plaintext: Buffer, subscription: PushSubscriptionKeys, options: EncryptPushOptions = {}): Buffer {
  const uaPublic = base64UrlDecode(subscription.p256dh);
  if (uaPublic.length !== 65 || uaPublic[0] !== 0x04) throw new Error("Invalid p256dh key: expected a 65-byte uncompressed P-256 point.");
  const authSecret = base64UrlDecode(subscription.auth);
  if (authSecret.length < 16) throw new Error("Invalid push auth secret: expected at least 16 bytes.");

  let ephemeralPrivate: crypto.KeyObject;
  let ephemeralPublicRaw: Buffer;
  if (options.ephemeralPrivateKeyJwk) {
    ephemeralPrivate = crypto.createPrivateKey({ key: options.ephemeralPrivateKeyJwk as never, format: "jwk" });
    const ephPubJwk = (options.ephemeralPrivateKeyJwk as JsonWebKey);
    ephemeralPublicRaw = rawUncompressedPoint(ephPubJwk);
  } else {
    const pair = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
    ephemeralPrivate = pair.privateKey;
    ephemeralPublicRaw = rawUncompressedPoint(pair.publicKey.export({ format: "jwk" }) as JsonWebKey);
  }
  const uaPublicKey = crypto.createPublicKey({
    key: { kty: "EC", crv: "P-256", x: base64UrlEncode(uaPublic.subarray(1, 33)), y: base64UrlEncode(uaPublic.subarray(33, 65)) } as never,
    format: "jwk",
  });
  const ecdhSecret = crypto.diffieHellman({ privateKey: ephemeralPrivate, publicKey: uaPublicKey });

  // RFC 8291 section 3.3: combine the ECDH secret with the auth secret.
  const prkKey = hmacSha256(authSecret, ecdhSecret);
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0", "utf8"), uaPublic, ephemeralPublicRaw]);
  const ikm = hkdfExpandSingleBlock(prkKey, keyInfo, 32);

  const salt = options.salt ?? crypto.randomBytes(16);
  if (salt.length !== 16) throw new Error("Push salt must be exactly 16 bytes.");
  const prk = hmacSha256(salt, ikm);
  const cek = hkdfExpandSingleBlock(prk, Buffer.from("Content-Encoding: aes128gcm\0", "utf8"), 16);
  const nonce = hkdfExpandSingleBlock(prk, Buffer.from("Content-Encoding: nonce\0", "utf8"), 12);

  // Single (final) record: plaintext followed by the 0x02 delimiter, no padding.
  const record = Buffer.concat([plaintext, Buffer.from([0x02])]);
  if (record.length + 16 > RECORD_SIZE) throw new Error("Push payload is too large for a single record.");
  const cipher = crypto.createCipheriv("aes-128-gcm", cek, nonce) as crypto.CipherGCM;
  const ciphertext = Buffer.concat([cipher.update(record), cipher.final(), cipher.getAuthTag()]);

  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(RECORD_SIZE, 0);
  return Buffer.concat([salt, recordSize, Buffer.from([ephemeralPublicRaw.length]), ephemeralPublicRaw, ciphertext]);
}
