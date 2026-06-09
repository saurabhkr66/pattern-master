# R2 backup target + nightly cron

Set this up once, on the VPS, as the `battle` user. It makes `deploy/backup.sh`
ship a nightly database dump to Cloudflare R2 (off-server = survives a dead VPS).

## 1. Create the R2 bucket + API token (Cloudflare dashboard)
1. Cloudflare dashboard → **R2** → **Create bucket** → name it `battleexam-backups`.
2. R2 → **Manage R2 API Tokens** → **Create API token** → permission **Object Read & Write**,
   scoped to that bucket. Copy the **Access Key ID**, **Secret Access Key**, and your
   **Account ID** (the S3 endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).

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
rclone lsd r2:            # should list the battleexam-backups bucket
```

## 3. Test the backup once, by hand
```bash
cd ~/pattern-master
bash deploy/backup.sh
rclone ls r2:battleexam-backups/      # confirm a *.sql.gz object appears
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

## 5. 30-day retention (R2 lifecycle rule)
Cloudflare dashboard → R2 → `battleexam-backups` → **Settings** → **Object lifecycle rules**
→ add a rule: **delete objects older than 30 days**. This prunes old dumps automatically so
storage stays within R2's free tier.

## Notes
- 500 MB of data dumps to a few MB gzipped; 30 days of nightly dumps is well under R2's
  10 GB free tier — effectively $0.
- An untested backup is not a backup. After setup, do a real restore once (see
  `deploy/RESTORE.md`) to prove the dumps are valid.
