# Telegram daily-PYQ auto-poster

Posts one fresh previous-year question per exam, every day, into that exam's
**Topic** inside a single Telegram supergroup — as a LaTeX-perfect image + a
native quiz poll — then links to the full solution on battleexam.com.

```
📣 BattleExam (supergroup, Topics ON)
├─ 🧪 JEE Main   → daily JEE question + poll + solution link
├─ 🩺 NEET       → daily NEET question + poll + solution link
└─ ⚙️ GATE CS    → daily GATE question + poll + solution link
```

Runs unattended on the VPS via cron. You never touch it after setup.

---

## One-time setup (~15 min)

### 1. Install the browser used to render question images
```bash
npm i -D playwright
npx playwright install --with-deps chromium     # on the VPS
npx playwright install chromium                 # on Windows for local testing
```

### 2. Create the bot
1. Telegram → talk to **@BotFather** → `/newbot` → get the **bot token**.
2. Put it in `.env`:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC-your-token
   ```

### 3. Create the group with Topics
1. Create a **new group**, then in group settings enable **Topics**.
2. Add one Topic per exam (JEE Main, NEET, GATE CS, …).
3. Add your bot to the group and make it an **admin** (needs "post messages").

### 4. Find the chat id + topic ids
In **each** Topic, send a message that mentions the bot (`@YourBotName hi`), then:
```bash
npx tsx --env-file=.env scripts/telegram/discover.ts
```
Copy the printed `TELEGRAM_CHAT_ID` into `.env`, and each Topic's `threadId`
into `scripts/telegram/config.ts` (`EXAM_TOPICS`).

### 5. Choose which exams get a Topic
```bash
npx tsx --env-file=.env scripts/telegram/stats.ts
```
Give a Topic only to exams with a healthy **poll-ready** count. Make the
`examSlug` values in `config.ts` match exactly what this prints.

### 6. Dry-run (renders images, sends nothing)
```bash
npx tsx --env-file=.env scripts/telegram/postDaily.ts --dry-run
```
Check the `preview-<exam>.png` files look good. Then do a real single post:
```bash
npx tsx --env-file=.env scripts/telegram/postDaily.ts --only jee-main
```

---

## Run it daily (VPS cron)

`crontab -e`, then post every day at 09:00 IST (03:30 UTC):
```
30 3 * * *  cd /path/to/pattern-master && DB_DRIVER=standard /usr/bin/npx tsx --env-file=.env scripts/telegram/postDaily.ts >> /var/log/battleexam-telegram.log 2>&1
```
`DB_DRIVER=standard` uses the VPS's long-lived Postgres connection (see `lib/prisma.ts`).

---

## How it stays clean
- **Never repeats** a question — posted ids are remembered in Upstash Redis
  (`tg:posted:<exam-branch>`), or a local `.posted.json` if Redis isn't configured.
- **One exam failing** (empty bank, API hiccup) never blocks the others.
- **Poll-friendly only** — picks 4-option MCQs with an A–D answer, so the image
  carries the full LaTeX and the poll is just A/B/C/D.
- **Figures included** — question diagrams (ImageKit) are rendered into the card.
  A question is skipped only if its text needs a figure but none is stored.
- **GATE is per-branch** — one Topic per branch (`gate` + `branchSlug` in
  config.ts); the site link becomes `gate-cse`, `gate-ece`, etc.

## Files
| file | role |
|------|------|
| `config.ts` | exam → Topic map, site links, env |
| `stats.ts` | count poll-ready PYQs per exam (choose Topics) |
| `discover.ts` | print chat id + Topic thread ids |
| `pickQuestion.ts` | select a fresh MCQ + dedupe store |
| `render.ts` | question → PNG card (KaTeX + Playwright) |
| `telegram.ts` | Bot API wrapper |
| `postDaily.ts` | **the daily cron entry point** |
