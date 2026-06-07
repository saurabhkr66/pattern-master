import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

// Folder tree for the question bank: grade(exam/class) → subject(section) →
// set_name(set/mock) with per-node counts. One groupBy (not the whole bank) drives
// the bank's folder browser, the test picker cascade, and the add-form's combobox
// suggestions. Nulls are preserved (rendered as "Uncategorized" / "No section" /
// "No set" client-side). The third level is the SET — that grouping is what keeps
// newly-added questions from getting lost in a flat pile.

export type SetNode = { set: string | null; count: number };
export type SubjectNode = { subject: string | null; sets: SetNode[]; count: number };
export type GradeNode = { grade: string | null; subjects: SubjectNode[]; count: number };

// The tree is identical for every viewer of a coaching and only changes when a
// question is added/edited/deleted — yet the groupBy + nested assembly + 3-level
// sort is pure CPU that otherwise re-runs on every admin questions page load and
// every test-wizard open (Vercel Fluid active-CPU). Cache the computed tree and
// bust it on question CUD via `invalidateCoachingTaxonomy`. The 600s revalidate
// is a safety net so a missed invalidation self-heals within 10 minutes.
const taxonomyTag = (coachingId: string) => `coaching-taxonomy:${coachingId}`;

export function getCoachingTaxonomy(coachingId: string): Promise<GradeNode[]> {
  return unstable_cache(
    () => buildCoachingTaxonomy(coachingId),
    ["coaching-taxonomy", coachingId],
    { revalidate: 600, tags: [taxonomyTag(coachingId)] }
  )();
}

/** Mark a coaching's cached taxonomy stale after a question add/edit/delete. */
export function invalidateCoachingTaxonomy(coachingId: string): void {
  revalidateTag(taxonomyTag(coachingId), "max");
}

async function buildCoachingTaxonomy(coachingId: string): Promise<GradeNode[]> {
  const groups = await prisma.coachingQuestion.groupBy({
    by: ["grade", "subject", "set_name"],
    where: { coaching_id: coachingId },
    _count: { _all: true },
  });

  // Assemble the flat (grade, subject, set_name, count) combos into a nested tree,
  // rolling counts up to subject and grade.
  const gradeMap = new Map<string | null, GradeNode>();

  for (const g of groups) {
    const count = g._count._all;
    let grade = gradeMap.get(g.grade);
    if (!grade) {
      grade = { grade: g.grade, subjects: [], count: 0 };
      gradeMap.set(g.grade, grade);
    }
    grade.count += count;

    let subject = grade.subjects.find((s) => s.subject === g.subject);
    if (!subject) {
      subject = { subject: g.subject, sets: [], count: 0 };
      grade.subjects.push(subject);
    }
    subject.count += count;

    subject.sets.push({ set: g.set_name, count });
  }

  // Sort: known values alphabetically, nulls (Uncategorized buckets) last.
  const byLabel =
    <T>(key: (t: T) => string | null) =>
    (a: T, b: T) => {
      const ka = key(a);
      const kb = key(b);
      if (ka === kb) return 0;
      if (ka === null) return 1;
      if (kb === null) return -1;
      return ka.localeCompare(kb);
    };

  const tree = [...gradeMap.values()].sort(byLabel((g) => g.grade));
  for (const g of tree) {
    g.subjects.sort(byLabel((s) => s.subject));
    for (const s of g.subjects) s.sets.sort(byLabel((t) => t.set));
  }
  return tree;
}
