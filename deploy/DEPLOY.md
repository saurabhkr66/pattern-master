# Self-hosting BattleExam wholly on a Hetzner VPS

App **and** PostgreSQL on one box, with automated off-server backups to Cloudflare R2.
Phased and reversible: you stay on Vercel + Neon until the VPS proves itself, and you can
switch back later with config + DNS only (no code deletion).

Your laptop stays Windows — you only SSH into the rented Ubuntu server.

---

## Phase 0 — Validate locally (no server yet, prod untouched)
The only app-code change is already done: [lib/prisma.ts](../lib/prisma.ts) now picks its DB
transport from `DB_DRIVER` (default `neon-http` = today's behavior). To rehearse the VPS path
on your laptop against the Neon **dev** branch:

1. `.env.local` already has `DB_DRIVER=standard` (added for this). Remove that line to go back
   to `neon-http` locally anytime.
2. Run and exercise it:
   ```powershell
   npm run dev
   ```
   Sign in, open a pattern, start a test, and **submit** (a write). If that all works, the
   standard/TCP path the VPS uses is good. Optionally `npm run build` to confirm a prod build.
3. Commit. (Deploying to Vercel is safe — it sets no `DB_DRIVER`, so it stays on `neon-http`.)

**Only move to Phase 1 once you're convinced here.**

---

## Phase 1 — Stand up the VPS (Vercel + Neon stay live as fallback)

### Prereqs
- A domain you control (for DNS).
- Your production secret values (from your local `.env`).
- Prod Neon **DIRECT** (non-pooler) URL — for the one-time data copy.

### Steps
1. **Create the VPS** — Hetzner Cloud → **CAX11** (2 vCPU ARM / 4 GB), image **Ubuntu 24.04**,
   location Germany, add your SSH key. Copy the IP.
2. **Connect** (from PowerShell): `ssh root@<IP>`
3. **Bootstrap** (installs Node, PM2, Caddy, PostgreSQL, rclone, firewall; creates the DB):
   ```bash
   bash <(curl -fsSL https://raw.githubusercontent.com/saurabhkr66/pattern-master/master/deploy/setup.sh)
   ```
   **Save the DB password it prints** — you need it next. (Private repo? See note below.)
4. **Configure env + R2 + migrate data** (as the app user):
   ```bash
   su - battle && cd pattern-master
   nano .env                      # from deploy/.env.production.example: DB_DRIVER=standard,
                                  #   the local DATABASE_URL/DIRECT_URL (with the setup password),
                                  #   and all prod SaaS keys (Clerk pk_live_/sk_live_)
   rclone config                  # set up the r2: remote — see deploy/r2-and-cron.md
   npm ci
   bash deploy/migrate-from-neon.sh   # paste the Neon DIRECT url; copies data -> local PG
   ```
   Check the printed row counts match Neon.
5. **Build + run, reboot-safe:**
   ```bash
   npm run build
   pm2 start deploy/ecosystem.config.cjs
   pm2 save && pm2 startup        # run the "sudo env ..." line it prints, as root
   exit                           # back to root
   ```
6. **HTTPS:** as root, `nano /etc/caddy/Caddyfile` → paste [Caddyfile](Caddyfile), set your
   real domain → `systemctl reload caddy`.
7. **DNS cutover:** point your domain's A record at the VPS IP. (Vercel/Neon keep running.)
8. **Backups on a schedule:** add the nightly cron line and test once — see
   [r2-and-cron.md](r2-and-cron.md). Then do a **test restore** ([RESTORE.md](RESTORE.md) §C).
9. **Monitoring:** add the site to UptimeRobot (free) for downtime alerts.

Visit `https://yourdomain.com` — you're live on the VPS.

> **Repo must be public:** the bootstrap fetches `setup.sh` from GitHub and clones the repo
> over HTTPS without auth, so the repo needs to be **public** (it is). No `.env` secrets are in
> the repo or its history — only the source code is exposed. If you make it private later,
> switch the clone to a deploy key or token.

---

## Phase 2 — Wind down the old stack (after ~1–2 weeks stable) — stay reversible
- **Recommended:** leave the Vercel project deployed but idle (hobby tier is free) and keep
  the Neon **dev** branch. Switching back is then instant.
- **Full teardown** (only if certain): delete the Vercel project + Neon prod branch. Reversal
  then costs ~15 min to recreate, not instant.
- **Never** remove the `neon-http` path from [lib/prisma.ts](../lib/prisma.ts) or the Neon
  deps — that's what keeps the switch-back zero-code.

---

## Switching back later (VPS → Neon + Vercel) — config only, no code edits
1. On the VPS: `bash deploy/migrate-to-neon.sh` (copies data VPS → Neon).
2. Set `DB_DRIVER=neon-http` and repoint `DATABASE_URL`/`DIRECT_URL` at Neon.
3. Point DNS back at Vercel. Done — nothing in the app code changes.

---

## Updating the app (after pushing new code)
```bash
ssh battle@<IP>
cd pattern-master && bash deploy/update.sh   # pull, npm ci, prisma db push, build, reload
```

## Handy commands
| What | Command (as `battle`) |
|------|------|
| App status / workers | `pm2 status` |
| Live logs | `pm2 logs battleexam` |
| Restart app | `pm2 restart battleexam` |
| Backup log | `tail ~/backup.log` |
| DB shell | `psql "$(grep ^DATABASE_URL= .env \| cut -d= -f2- \| tr -d '\"')"` |
| Caddy/HTTPS (root) | `systemctl status caddy` |
| Disk / memory | `df -h` / `free -h` |

## Notes for this app
- **Storage, images, Redis, auth, AI stay external SaaS** (free tiers). The VPS holds the app
  + the ~500 MB Postgres. RAM during `next build` is the tightest resource, not disk.
- **Postgres is bound to localhost** and 5432 is never opened in the firewall — the DB is only
  reachable from this box.
- `sharp` and `mupdf` (WASM) install native **ARM64** binaries on `npm ci` automatically.
- Hetzner is in Germany → ~150 ms latency for Indian users on dynamic pages; keep **Cloudflare**
  in front for edge-cached static/ISR pages. To cut that latency later, migrate to a Mumbai VPS
  — it's a 15-min `pg_dump`/restore (this is just Postgres).
