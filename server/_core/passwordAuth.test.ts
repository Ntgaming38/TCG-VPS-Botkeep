import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./passwordAuth";

describe("local password credentials", () => {
  it("hashes passwords and verifies only the matching password", async () => {
    const encoded = await hashPassword("a-long-password-123");
    expect(encoded).not.toContain("a-long-password-123");
    await expect(verifyPassword("a-long-password-123", encoded)).resolves.toBe(true);
    await expect(verifyPassword("different-password", encoded)).resolves.toBe(false);
  });

  it("rejects malformed credential hashes", async () => {
    await expect(verifyPassword("anything", "plain-text-password")).resolves.toBe(false);
  });
});