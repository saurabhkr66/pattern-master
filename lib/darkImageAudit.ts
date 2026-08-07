import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Worklist for the "Dark Image" report category on /admin/reports — questions
// whose figure is mostly black, i.e. an inverted or destroyed scan.
//
// Same split of responsibilities as lib/mockImageAudit.ts: the WORKLIST comes
// from a committed audit JSON (scripts/audit-dark-images.mjs writes it), because
// re-measuring ~21k images on page load would take many minutes.
//
// Consequence worth knowing: the list is a SNAPSHOT. Replacing an image fixes
// the pixels but writes nothing to the DB, so a repaired image keeps appearing
// here until the audit is re-run. Re-running is the "mark resolved" step.

export type DarkImageRow = { model: "pYQ" | "generatedQuestion" | "MockTestTemplate"; id: string };
export type DarkImageEntry = { ref: string; ratio: number; rows: DarkImageRow[] };

type DarkImageFile = {
  generatedAt?: string;
  minRatio?: number;
  lumaCutoff?: number;
  images?: DarkImageEntry[];
};

export type DarkImageWorklist = {
  generatedAt: string | null;
  entries: DarkImageEntry[];
  /** ref -> black ratio, for labelling a report without re-scanning the list. */
  ratioByRef: Map<string, number>;
};

const EMPTY: DarkImageWorklist = { generatedAt: null, entries: [], ratioByRef: new Map() };

/** The committed worklist. Empty (not an error) if the audit never ran. */
export async function loadDarkImageWorklist(limit = 60): Promise<DarkImageWorklist> {
  try {
    const raw = await readFile(path.join(process.cwd(), "data", "dark-images.json"), "utf8");
    const parsed = JSON.parse(raw) as DarkImageFile;
    const all = (parsed.images ?? []).filter((e) => e?.ref && Array.isArray(e.rows));

    // Worst first, then capped: the tail of the distribution is dense diagrams
    // and icons that are legitimately dark, and burying real defects under them
    // is how a report page stops getting read.
    const entries = all.sort((a, b) => b.ratio - a.ratio).slice(0, limit);

    return {
      generatedAt: parsed.generatedAt ?? null,
      entries,
      ratioByRef: new Map(entries.map((e) => [e.ref, e.ratio])),
    };
  } catch (e) {
    // Silence here is how "no dark reports" becomes indistinguishable from "the
    // worklist never shipped" — the file must be committed AND deployed, so say
    // which one failed.
    console.warn("[darkImageAudit] no worklist at data/dark-images.json —", (e as Error)?.message);
    return EMPTY;
  }
}

/**
 * Which of a question's images are on the dark list, and how bad the worst one
 * is. Mirrors the ref extraction in lib/mockImageAudit.refOf — filename/url/
 * src/path only, never arbitrary fields like `type`.
 */
export function darkRefsOf(
  images: unknown,
  ratioByRef: Map<string, number>
): { refs: string[]; worst: number } {
  if (!Array.isArray(images)) return { refs: [], worst: 0 };

  const refs: string[] = [];
  let worst = 0;
  for (const img of images) {
    let ref: string | null = null;
    if (typeof img === "string") ref = img;
    else if (img && typeof img === "object") {
      const o = img as Record<string, unknown>;
      const candidate = o.filename ?? o.url ?? o.src ?? o.path;
      if (typeof candidate === "string") ref = candidate;
    }
    if (!ref) continue;
    const ratio = ratioByRef.get(ref);
    if (ratio === undefined) continue;
    refs.push(ref);
    if (ratio > worst) worst = ratio;
  }
  return { refs, worst };
}

/** Human label for a report row, e.g. "99.6% black". */
export function darkLabel(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}% black`;
}
