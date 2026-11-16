import test from "node:test";
import assert from "node:assert/strict";
import { base32Decode, base32Encode, hotp, verifyTotp } from "../lib/totp.ts";
import { createSessionToken, verifySessionToken, SESSION_TTL_MS } from "../lib/session-token.ts";

// RFC 6238 appendix B: secret "12345678901234567890", SHA-1, T=59 s → 94287082 (8 digits) → 287082 (6 digits)
const SECRET = base32Encode(Buffer.from("12345678901234567890"));

test("base32 round trip", () => {
  assert.equal(base32Decode(SECRET).toString(), "12345678901234567890");
});

test("hotp matches the RFC 6238 vectors", () => {
  const key = Buffer.from("12345678901234567890");
  assert.equal(hotp(key, Math.floor(59 / 30)), "287082");
  assert.equal(hotp(key, Math.floor(1111111109 / 30)), "081804");
});

test("verifyTotp accepts the current and adjacent steps, rejects the rest, and returns the counter", () => {
  const now = 59_000;
  assert.equal(verifyTotp(SECRET, "287082", now), 1);
  assert.equal(verifyTotp(SECRET, "287082", now + 30_000), 1); // one step late
  assert.equal(verifyTotp(SECRET, "287082", now + 90_000), null); // too old
  assert.equal(verifyTotp(SECRET, "000000", now), null);
  assert.equal(verifyTotp(SECRET, "28708", now), null);
  assert.equal(verifyTotp("", "287082", now), null);
});

test("session tokens expire and can't be forged", () => {
  const t = createSessionToken("secret", 1000);
  assert.equal(verifySessionToken(t, "secret", 1000 + 1), true);
  assert.equal(verifySessionToken(t, "secret", 1000 + SESSION_TTL_MS + 1), false);
  assert.equal(verifySessionToken(t, "other", 1001), false);
  assert.equal(verifySessionToken(t.replace(/.$/, "x"), "secret", 1001), false);
  assert.equal(verifySessionToken(undefined, "secret"), false);
  assert.equal(verifySessionToken(t, undefined), false);
});
