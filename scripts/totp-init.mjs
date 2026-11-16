// Prints a new TOTP secret and the otpauth:// link for the authenticator app.
// Run it yourself (`npm run totp:init`), keep the secret out of chat and out of git: it goes into the
// ADMIN_TOTP_SECRET environment variable.
import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
let bits = 0, value = 0, secret = "";
for (const byte of randomBytes(20)) {
  value = (value << 8) | byte; bits += 8;
  while (bits >= 5) { secret += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
}
const label = encodeURIComponent("SiteWitness Admin");
console.log(`\nADMIN_TOTP_SECRET=${secret}\n`);
console.log(`Add it to your authenticator app (manual entry, or paste this link into a QR generator you trust):`);
console.log(`otpauth://totp/${label}?secret=${secret}&issuer=${label}&algorithm=SHA1&digits=6&period=30\n`);
