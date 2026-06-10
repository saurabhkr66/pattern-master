# R2 backup target + nightly cron

Set this up once, on the VPS, as the `battle` user. It makes `deploy/backup.sh`
ship a nightly database dump to Cloudflare R2 (off-server = survives a dead VPS).

## 1. Reuse the app's R2 bucket + API token (Cloudflare dashboard)
Backups share the SAME `battle-exam` bucket the app uses for answer photos — they
just live under a `backups/` prefix (answers live under `answers/`). No second
bucket needed.
1. If not already done, R2 → **Create bucket** → `battle-exam`.
2. R2 → **Manage R2 API Tokens** → **Create API token** → permission **Object Read & Write**
   on `battle-exam`. Copy the **Access Key ID**, **Secret Access Key**, and your
   **Account ID** (S3 endpoint = `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).
   You can reuse the same token the app uses (`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`).

## 2. Configure rclone for R2 (on the VPS)
```bash
rclone config
# n) New remote
# name> r2
# Storage> s3
# provider> Cloudflare
# access_key_id> <Access Key ID>
# secret_access_key> <Secret Access Key>
# region> auto
# endpoint> https://<ACCOUNT_ID>.r2.cloudflarestorage.com
# (leave the rest default, y to save)
```
Verify:
```bash
rclone lsd r2:            # should list the battle-exam bucket
```

## 3. Test the backup once, by hand
```bash
cd ~/pattern-master
bash deploy/backup.sh
rclone ls r2:battle-exam/backups/      # confirm a *.sql.gz object appears
tail ~/backup.log
```

## 4. Schedule it nightly (cron, as the `battle` user)
```bash
crontab -e
```
Add this line (runs 02:00 server time daily):
```
0 2 * * * /home/battle/pattern-master/deploy/backup.sh
```

## 5. Retention (R2 lifecycle rules — two prefixes, one bucket)
Cloudflare dashboard → R2 → `battle-exam` → **Settings** → **Object lifecycle rules**.
Add TWO prefix-scoped rules so backups and answer photos expire on their own schedules:
- prefix `backups/` → **delete after 30 days** (DB dumps)
- prefix `answers/` → **delete after 180 days** (student answer photos)

Both prefixes share the 10 GB free tier; dumps are a few MB each so they're negligible.

## Notes
- 500 MB of data dumps to a few MB gzipped; 30 days of nightly dumps is well under R2's
  10 GB free tier — effectively $0.
- An untested backup is not a backup. After setup, do a real restore once (see
  `deploy/RESTORE.md`) to prove the dumps are valid.
