import "server-only";
import crypto from "crypto";

/**
 * Pre-stage encryption for test papers. During the waiting room (before T-0)
 * the client downloads the paper as AES-256-GCM ciphertext; the key is only
 * handed out by the `start` endpoint once the window is open. So the heavy
 * payload moves out of the start spike, but a student poking devtools before
 * T-0 holds bytes they cannot read.
 *
 * The key is DERIVED, not stored: HMAC-SHA256(STUDENT_SESSION_SECRET, testId).
 * Deterministic derivation means every PM2 cluster worker agrees on the key
 * with no Redis round trip and no set-NX race, and there is nothing to expire.
 * A student can't compute it without the server secret, and once the window
 * opens the key is deliberately public to that test's students anyway.
 *
 * Web Crypto's AES-GCM expects the 16-byte auth tag appended to the
 * ciphertext, so encryptPaper returns ct = ciphertext||tag — the client
 * decrypts with subtle.decrypt({ name: "AES-GCM", iv }, key, ct) directly.
 */

function getSecret(): string {
  const s = process.env.STUDENT_SESSION_SECRET;
  if (!s) {
    throw new Error(
      "STUDENT_SESSION_SECRET is not set — required to derive paper keys."
    );
  }
  return s;
}

/** 32-byte AES key for one test, stable across workers/restarts. */
export function derivePaperKey(testId: string): Buffer {
  return crypto.createHmac("sha256", getSecret()).update(`paper:${testId}`).digest();
}

/** Base64 form of the key, as the start endpoint returns it to the client. */
export function paperKeyB64(testId: string): string {
  return derivePaperKey(testId).toString("base64");
}

export type EncryptedPaper = {
  iv: string; // base64, 12 bytes
  ct: string; // base64, ciphertext || 16-byte GCM tag
};

export function encryptPaper(testId: string, payload: unknown): EncryptedPaper {
  const key = derivePaperKey(testId);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return { iv: iv.toString("base64"), ct: ct.toString("base64") };
}
