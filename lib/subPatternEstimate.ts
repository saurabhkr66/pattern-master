// Rough Gemini request count for sorting one chapter (lib/subPatternBuilder.ts).
// Pure — imported by the admin page for its budget line, and by the server to
// refuse a run that won't fit in today's free-tier quota.
//
//   notes    ceil(pending / 15)      summary calls (only PYQs without a note)
//   discover 1
//   assign   ceil(n / 25) + 1        (+1 for the missed-id retry)
//   cleanup  ~6                      splitting big piles + leftovers (varies)
//
// Padded 20% for 429 retries. Batch sizes match the builder defaults.
export function estimateSortCalls(totalPyqs: number, pendingNotes: number): number {
  const notes = Math.ceil(pendingNotes / 15);
  const assign = Math.ceil(totalPyqs / 25) + 1;
  return Math.ceil((notes + 1 + assign + 6) * 1.2);
}
