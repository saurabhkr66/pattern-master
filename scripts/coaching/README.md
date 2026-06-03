# Coaching scripts

Owner-run scripts for the B2B coaching layer. Kept separate from the consumer
`scripts/` and `prisma/` seeders.

## Bulk-insert questions into one coaching

```bash
node --env-file=.env scripts/coaching/seed-coaching-questions.mjs <coaching-slug> <questions.json>
```

Example:

```bash
node --env-file=.env scripts/coaching/seed-coaching-questions.mjs saurav-coaching-classes scripts/coaching/sample-questions.json
```

- `<coaching-slug>` selects the target coaching (see the slug in /admin/coachings).
- `<questions.json>` is a JSON array — see `sample-questions.json`.

### Question JSON shape

| field          | required        | notes                                                        |
|----------------|-----------------|--------------------------------------------------------------|
| question_type  | no (default mcq)| `mcq` \| `nat` \| `subjective`                               |
| question_text  | yes             | LaTeX ok (`$...$`)                                            |
| options        | mcq only        | `["A text","B text",...]` (auto-labelled) or `[{label,text}]`|
| correct_answer | mcq/nat         | letter (`"A"`) for mcq; number string (`"40"`) for nat       |
| nat_tolerance  | nat optional    | acceptable ± error (default 0)                               |
| max_marks      | no (default 1)  | positive number                                              |
| solution       | no              | LaTeX ok                                                     |
| subject/topic/difficulty | no    | strings                                                      |

Invalid rows are skipped and reported; valid rows are inserted. Runs against
whatever `DATABASE_URL` you pass via `--env-file` (currently `.env` = prod).
