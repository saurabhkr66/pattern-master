/**
 * Device-local memory of which coachings this student has joined.
 *
 * Coaching students authenticate per-coaching (phone + PIN → a single signed
 * cookie that holds ONE coaching at a time — see lib/studentAuth.ts). So the
 * app can't ask the server "which coachings is this device in?" without a
 * login. Instead we remember the joined coachings here, on the device, purely
 * for navigation: it powers the coaching home screen's tappable cards so a
 * returning student never has to re-type their join code.
 *
 * This is NOT auth — it's a convenience list. Tapping a card still goes through
 * the normal /c/[slug] login/session check.
 */

export type CoachingMembership = {
  slug: string;
  name: string;
  ts: number; // last-seen epoch ms; used to order most-recent-first
};

const KEY = "be_coachings";
const MAX = 12;

function isMembership(v: unknown): v is CoachingMembership {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as CoachingMembership).slug === "string" &&
    typeof (v as CoachingMembership).name === "string"
  );
}

/** All remembered coachings, most-recent first. Empty on the server or on error. */
export function getMemberships(): CoachingMembership[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(isMembership).sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
  } catch {
    return [];
  }
}

/** Record (or refresh) a joined coaching. Dedupes on slug; keeps newest name. */
export function addMembership(m: { slug: string; name: string }) {
  if (typeof window === "undefined") return;
  try {
    const list = getMemberships().filter((x) => x.slug !== m.slug);
    list.unshift({ slug: m.slug, name: m.name, ts: Date.now() });
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* storage unavailable (private mode, quota) — non-fatal */
  }
}

/** Forget a coaching (the student tapped "remove" on its card). */
export function removeMembership(slug: string) {
  if (typeof window === "undefined") return;
  try {
    const next = getMemberships().filter((x) => x.slug !== slug);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* non-fatal */
  }
}
