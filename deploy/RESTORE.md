# Disaster recovery runbook

If the VPS dies, is wiped, or the database is corrupted/deleted, this restores from
the latest R2 backup onto a fresh box. Worst-case data loss = since the last nightly
dump (≤ 24 h). Target time: ~15 minutes.

## A. Full rebuild (VPS is gone)
1. **Provision a fresh VPS** (Hetzner CAX11, Ubuntu 24.04) and run the bootstrap:
   ```bash
   ssh root@NEW_IP
   bash <(curl -fsSL https://raw.githubusercontent.com/saurabhkr66/pattern-master/master/deploy/setup.sh)
   ```
   Save the new DB password it prints.
2. **As `battle`**, restore env + R2 access:
   ```bash
   su - battle && cd pattern-master
   nano .env                 # paste prod env; set the NEW local DATABASE_URL/DIRECT_URL + DB_DRIVER=standard
   rclone config             # re-create the r2: remote (see r2-and-cron.md)
   ```
3. **Create the schema, then load the newest dump:**
   ```bash
   npm ci
   npx prisma db push        # builds the empty schema in the fresh local Postgres
   LATEST=$(rclone lsf r2:battleexam-backups/ | sort | tail -1)
   rclone copy "r2:battleexam-backups/$LATEST" /tmp/
   LOCAL_URL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')
   gunzip -c "/tmp/$LATEST" | psql "$LOCAL_URL"
   ```
4. **Verify, build, run, re-point DNS, re-enable cron:**
   ```bash
   psql "$LOCAL_URL" -c 'SELECT count(*) FROM "Question";'
   npm run build && pm2 start deploy/ecosystem.config.cjs && pm2 save
   # (root) update /etc/caddy/Caddyfile if domain unchanged -> systemctl reload caddy
   # point the domain's A record at NEW_IP
   crontab -e   # re-add the nightly backup line
   ```

## B. Database-only restore (VPS fine, data bad)
```bash
su - battle && cd pattern-master
LATEST=$(rclone lsf r2:battleexam-backups/ | sort | tail -1)
rclone copy "r2:battleexam-backups/$LATEST" /tmp/
LOCAL_URL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')
# Drop + recreate is cleanest; or restore into a scratch db first to inspect.
gunzip -c "/tmp/$LATEST" | psql "$LOCAL_URL"
pm2 reload battleexam
```

## C. Periodic restore TEST (do this ~monthly — proves backups work)
```bash
sudo -u postgres createdb restore_test
LATEST=$(rclone lsf r2:battleexam-backups/ | sort | tail -1)
rclone copy "r2:battleexam-backups/$LATEST" /tmp/
gunzip -c "/tmp/$LATEST" | sudo -u postgres psql restore_test
sudo -u postgres psql restore_test -c 'SELECT count(*) FROM "Question";'   # sane number?
sudo -u postgres dropdb restore_test
```
An untested backup is not a backup — run section C before you trust the system.
