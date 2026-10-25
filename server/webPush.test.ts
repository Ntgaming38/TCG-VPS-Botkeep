import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  base64UrlDecode,
  base64UrlEncode,
  createVapidAuthorizationHeader,
  encryptPushPayload,
  generateVapidKeys,
} from "./pushCrypto";
import { buildSnkrPriceChangePush } from "./push";

/** Independent RFC 8291 decryption, written from the spec to cross-check encryptPushPayload. */
function decryptPushBody(body: Buffer, uaPrivateJwk: JsonWebKey, authSecretB64: string): Buffer {
  const salt = body.subarray(0, 16);
  const senderPublicLength = body[20];
  const senderPublic = body.subarray(21, 21 + senderPublicLength);
  const ciphertext = body.subarray(21 + senderPublicLength);
  const senderKey = crypto.createPublicKey({
    key: { kty: "EC", crv: "P-256", x: base64UrlEncode(senderPublic.subarray(1, 33)), y: base64UrlEncode(senderPublic.subarray(33, 65)) } as never,
    format: "jwk",
  });
  const uaPrivate = crypto.createPrivateKey({ key: uaPrivateJwk as never, format: "jwk" });
  const uaPublicJwk = crypto.createPublicKey(uaPrivate).export({ format: "jwk" }) as JsonWebKey;
  const uaPublic = Buffer.concat([Buffer.from([0x04]), base64UrlDecode(uaPublicJwk.x!), base64UrlDecode(uaPublicJwk.y!)]);
  const ecdhSecret = crypto.diffieHellman({ privateKey: uaPrivate, publicKey: senderKey });
  const hmac = (key: Buffer, data: Buffer) => crypto.createHmac("sha256", key).update(data).digest();
  const expand = (prk: Buffer, info: Buffer, length: number) => hmac(prk, Buffer.concat([info, Buffer.from([0x01])])).subarray(0, length);
  const prkKey = hmac(base64UrlDecode(authSecretB64), ecdhSecret);
  const ikm = expand(prkKey, Buffer.concat([Buffer.from("WebPush: info\0", "utf8"), uaPublic, Buffer.from(senderPublic)]), 32);
  const prk = hmac(salt, ikm);
  const cek = expand(prk, Buffer.from("Content-Encoding: aes128gcm\0", "utf8"), 16);
  const nonce = expand(prk, Buffer.from("Content-Encoding: nonce\0", "utf8"), 12);
  const decipher = crypto.createDecipheriv("aes-128-gcm", cek, nonce) as crypto.DecipherGCM;
  decipher.setAuthTag(ciphertext.subarray(ciphertext.length - 16));
  return Buffer.concat([decipher.update(ciphertext.subarray(0, ciphertext.length - 16)), decipher.final()]);
}

describe("Web Push encryption (RFC 8291)", () => {
  // Official example values from RFC 8291 (plaintext, keys, salt).
  const rfcPlaintext = Buffer.from("When I grow up, I want to be a watermelon", "utf8");
  const rfcAuth = "BTBZMqHH6r4Tts7J_aSIgg";
  const rfcUaPublic = "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4";
  const rfcUaPrivateD = "q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94";
  const rfcSalt = base64UrlDecode("DGv6ra1nlYgDCS1FRnbzlw");
  const rfcSenderPublic = "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
  const rfcSenderPrivateD = "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw";

  function jwkFromRawPoint(rawPointB64: string, d?: string): JsonWebKey {
    const raw = base64UrlDecode(rawPointB64);
    return {
      kty: "EC",
      crv: "P-256",
      x: base64UrlEncode(raw.subarray(1, 33)),
      y: base64UrlEncode(raw.subarray(33, 65)),
      ...(d ? { d } : {}),
    };
  }

  it("produces the RFC 8291 body layout: salt || rs(4096) || idlen || sender key", () => {
    const body = encryptPushPayload(rfcPlaintext, { p256dh: rfcUaPublic, auth: rfcAuth }, {
      salt: rfcSalt,
      ephemeralPrivateKeyJwk: jwkFromRawPoint(rfcSenderPublic, rfcSenderPrivateD),
    });
    expect(body.subarray(0, 16).equals(rfcSalt)).toBe(true);
    expect(body.readUInt32BE(16)).toBe(4096);
    expect(body[20]).toBe(65);
    expect(body.subarray(21, 86).equals(base64UrlDecode(rfcSenderPublic))).toBe(true);
  });

  it("ciphertext round-trips through an independent spec decryption", () => {
    const body = encryptPushPayload(rfcPlaintext, { p256dh: rfcUaPublic, auth: rfcAuth }, {
      salt: rfcSalt,
      ephemeralPrivateKeyJwk: jwkFromRawPoint(rfcSenderPublic, rfcSenderPrivateD),
    });
    const decrypted = decryptPushBody(body, jwkFromRawPoint(rfcUaPublic, rfcUaPrivateD), rfcAuth);
    expect(decrypted.subarray(0, decrypted.length - 1).equals(rfcPlaintext)).toBe(true);
    expect(decrypted[decrypted.length - 1]).toBe(0x02);
  });

  it("encrypts a JSON payload for a freshly generated subscription", () => {
    const ua = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
    const uaPubJwk = ua.publicKey.export({ format: "jwk" }) as JsonWebKey;
    const uaPrivJwk = ua.privateKey.export({ format: "jwk" }) as JsonWebKey;
    const uaPublicRaw = Buffer.concat([Buffer.from([0x04]), base64UrlDecode(uaPubJwk.x!), base64UrlDecode(uaPubJwk.y!)]);
    const auth = base64UrlEncode(crypto.randomBytes(16));
    const payload = Buffer.from(JSON.stringify({ title: "TCG Manager", body: "Giá đổi", url: "/shop-snkr" }), "utf8");
    const body = encryptPushPayload(payload, { p256dh: base64UrlEncode(uaPublicRaw), auth });
    const decrypted = decryptPushBody(body, uaPrivJwk, auth);
    expect(decrypted.subarray(0, decrypted.length - 1).equals(payload)).toBe(true);
  });

  it("rejects malformed subscription keys", () => {
    expect(() => encryptPushPayload(Buffer.from("x"), { p256dh: "AAAA", auth: rfcAuth })).toThrow();
    expect(() => encryptPushPayload(Buffer.from("x"), { p256dh: rfcUaPublic, auth: "AA" })).toThrow();
  });
});

describe("VAPID (RFC 8292)", () => {
  it("generates a 65-byte uncompressed public key and signs a verifiable ES256 JWT", () => {
    const keys = generateVapidKeys();
    const rawPublic = base64UrlDecode(keys.publicKey);
    expect(rawPublic.length).toBe(65);
    expect(rawPublic[0]).toBe(0x04);

    const authorization = createVapidAuthorizationHeader("https://fcm.googleapis.com/fcm/send/abc123", "mailto:admin@example.com", keys);
    expect(authorization).toContain(`, k=${keys.publicKey}`);
    const token = authorization.slice("vapid t=".length, authorization.indexOf(","));
    const [headerSegment, payloadSegment, signatureSegment] = token.split(".");
    const header = JSON.parse(base64UrlDecode(headerSegment).toString("utf8"));
    const payload = JSON.parse(base64UrlDecode(payloadSegment).toString("utf8"));
    expect(header).toEqual({ typ: "JWT", alg: "ES256" });
    expect(payload.aud).toBe("https://fcm.googleapis.com");
    expect(payload.sub).toBe("mailto:admin@example.com");
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));

    const verifyKey = crypto.createPublicKey({
      key: { kty: "EC", crv: "P-256", x: base64UrlEncode(rawPublic.subarray(1, 33)), y: base64UrlEncode(rawPublic.subarray(33, 65)) } as never,
      format: "jwk",
    });
    const valid = crypto.verify(
      "sha256",
      Buffer.from(`${headerSegment}.${payloadSegment}`),
      { key: verifyKey, dsaEncoding: "ieee-p1363" },
      base64UrlDecode(signatureSegment),
    );
    expect(valid).toBe(true);
  });
});

describe("SNKR price-change push summary", () => {
  it("returns null when nothing changed", () => {
    expect(buildSnkrPriceChangePush([])).toBeNull();
  });

  it("describes a single change with prices and percentage", () => {
    const push = buildSnkrPriceChangePush([{ name: "Box A", oldPrice: 10000, newPrice: 12000 }]);
    expect(push?.title).toBe("Biến động giá Shop SNKR");
    expect(push?.body).toContain("Box A");
    expect(push?.body).toContain("¥10,000");
    expect(push?.body).toContain("¥12,000");
    expect(push?.body).toContain("▲20.0%");
    expect(push?.url).toBe("/shop-snkr");
  });

  it("aggregates many changes into one notification led by the biggest mover", () => {
    const push = buildSnkrPriceChangePush([
      { name: "Box A", oldPrice: 10000, newPrice: 11000 },
      { name: "Box B", oldPrice: 20000, newPrice: 10000 },
      { name: "Box C", oldPrice: 5000, newPrice: 5100 },
    ]);
    expect(push?.body).toContain("3 sản phẩm đổi giá");
    expect(push?.body).toContain("Box B");
    expect(push?.body).toContain("▼50.0%");
  });
});
