# Mastery Notes — authoring guide

One file per topic. `npx tsx prisma/seed_notes.ts` writes each file into
`Pattern.short_notes` for every pattern whose `topic_name` matches.

```
divide-and-conquer.md        -> short_notes        (English)
divide-and-conquer.hi.md     -> short_notes_hindi  (Hindi)
asymptotic-analysis.json     -> short_notes        (structured cards)
README.md, _draft-*.md       -> ignored
```

The topic comes from front-matter `topic:` (markdown) or the top-level `"topic"`
key (JSON). Without either, the filename is de-slugified: `divide-and-conquer.md`
→ `Divide and Conquer`.

## Writing math

Write real LaTeX. **Every** field is rendered through KaTeX — section headings,
card titles, glosses, hints, ladder rungs, table cells, prose. There is no field
left where `$…$` leaks as literal dollar signs, so you never need unicode
lookalikes (`≤ Θ ⁿ ₀ ·`). Avoid them: they don't kern, don't scale with the
surrounding text, and break under font fallback.

| | |
|---|---|
| Inline math | `$T(n) = 2T(n/2) + \Theta(n)$` |
| Display math | `$$` on its own line, blank line before it |
| Don't | `T(n) ≤ 2·T(n/2) + Θ(n)` |

Display math **must** be block-level:

```markdown
The recurrence solves to:

$$
T(n) = \Theta(n \log n)
$$

which is the comparison-sort lower bound.
```

An inline `$$…$$` is silently ignored by remark-math and prints as raw LaTeX.
The seeder rewrites `$$` onto its own line automatically, but writing it
correctly keeps the source readable.

**Do not use `\\[4pt]`-style row spacing.** `lib/math/transform.ts` rewrites the
legacy `\[ … \]` display delimiters to `$$`, so a `\\[4pt]` inside an `aligned`
or `cases` block is torn in half and the whole span fails to render. Use a plain
`\\` row break; the seeder's validator catches this if you forget.

Inside the structured card slots (`name`, `title`, `bound`, `hint`, ladder rungs)
only inline `$…$` is supported — those render into a `<span>`, so display math is
downgraded to inline. Put real display math in a `markdown` block.

## Structure

`##`-and-shallower headings open a collapsible section. `###` and deeper stay
inside the section body, so sub-points keep their hierarchy instead of exploding
into dozens of one-line sections.

```markdown
---
topic: Divide and Conquer
---

## Core Recurrence          <- section
### Master Theorem cases    <- stays in the body
```

## Validation

The seeder renders every `$…$` span with `katex` at `throwOnError: true` and
**refuses to write a file that errors**. That check is the reason the notes tab
can be trusted to render cleanly — broken LaTeX never reaches the database.

```bash
npx tsx prisma/seed_notes.ts --dry-run        # validate only
npx tsx prisma/seed_notes.ts --topic="Divide and Conquer"
npx tsx prisma/seed_notes.ts --force          # store despite errors (last resort)
```

To sweep LaTeX already in the database, use `scripts/audit-math-errors.ts`.
