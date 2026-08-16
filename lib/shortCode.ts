import "server-only";
import crypto from "crypto";

// Shared human-facing short-code generator.
//
// Previously duplicated verbatim in app/api/admin/coachings/route.ts and
// app/api/coaching/apply/route.ts, both using Math.random(). That was marginal
// for a coaching join code (typed by hand, scoped to one coaching) but wrong for
// anything that appears in a shareable URL: Math.random() is seeded from a
// predictable source and is not designed to resist guessing, so codes minted in
// the same tick are correlated.

/** No ambiguous glyphs: I/O/0/1 are absent so a code can be read aloud or typed
 *  off a screenshot without confusion. Exactly 32 characters — see below. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Cryptographically random short code.
 *
 * `byte % ALPHABET.length` is bias-free here because 256 is an exact multiple of
 * 32, so every character is equally likely. The rejection guard below only
 * matters if someone changes the alphabet to a non-power-of-two length — at
 * which point modulo would quietly favour the early characters.
 *
 * Length guidance: 6 (~1.1e9) is fine for a code scoped to one coaching;
 * use 8 (~1.1e12) for anything enumerable from the open internet.
 */
export function randomCode(len = 6): string {
  const n = ALPHABET.length;
  const limit = Math.floor(256 / n) * n; // largest bias-free byte value
  let out = "";
  while (out.length < len) {
    const buf = crypto.randomBytes(len - out.length + 8); // small over-draw
    for (const byte of buf) {
      if (out.length === len) break;
      if (byte >= limit) continue; // no-op for a 32-char alphabet; guards a future change
      out += ALPHABET[byte % n];
    }
  }
  return out;
}
