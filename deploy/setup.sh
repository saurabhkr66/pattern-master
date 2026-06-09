#!/usr/bin/env bash
#
# BattleExam — one-time VPS bootstrap for a FRESH Ubuntu 24.04 server.
# Self-hosts EVERYTHING: the Next.js app + PostgreSQL on one box.
# Run this ONCE, as root, right after you SSH into a brand-new VPS:
#
#     bash <(curl -fsSL https://raw.githubusercontent.com/saurabhkr66/pattern-master/master/deploy/setup.sh)
#
# ...or paste the file and run:  bash setup.sh
#
set -euo pipefail

APP_USER="battle"
APP_DIR="/home/${APP_USER}/pattern-master"
REPO="https://github.com/saurabhkr66/pattern-master.git"
DB_NAME="battleexam"
DB_USER="battle"

echo ">> [1/9] Updating system packages..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git ufw ca-certificates gnupg

echo ">> [2/9] Creating app user '${APP_USER}' (runs the app, NOT root)..."
id -u "$APP_USER" &>/dev/null || adduser --disabled-password --gecos "" "$APP_USER"

echo ">> [3/9] Installing Node.js 22 LTS..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
node -v

echo ">> [4/9] Installing PM2 (keeps the app alive + auto-starts on reboot)..."
npm install -g pm2

echo ">> [5/9] Installing PostgreSQL (your self-hosted database)..."
apt-get install -y postgresql postgresql-contrib
systemctl enable --now postgresql
# Postgres listens on localhost only by default — we do NOT change that, and we
# do NOT open port 5432 in the firewall. The DB is reachable only from this box.

echo ">> [5b/9] Creating database '${DB_NAME}' and role '${DB_USER}'..."
DB_PASS="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  END IF;
END \$\$;
SQL
# Create the DB if missing (owned by the app role).
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" \
  | grep -q 1 || sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"

echo ">> [6/9] Installing Caddy (reverse proxy + automatic HTTPS)..."
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update -y
apt-get install -y caddy

echo ">> [7/9] Installing rclone (ships nightly DB backups to Cloudflare R2)..."
apt-get install -y rclone

echo ">> [8/9] Firewall: allow SSH, HTTP, HTTPS only (Postgres stays private)..."
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable

echo ">> [9/9] Cloning the repo into ${APP_DIR}..."
sudo -u "$APP_USER" git clone "$REPO" "$APP_DIR" 2>/dev/null || echo "   (already cloned, skipping)"

cat <<EOF

==================================================================
 Base server ready. PostgreSQL is running and your DB is created.

 >>> SAVE THIS DATABASE PASSWORD (shown once) <<<
     DB:   ${DB_NAME}
     User: ${DB_USER}
     Pass: ${DB_PASS}
     Local URL (use in .env):
       postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public&connection_limit=10

 Next steps:
   1.  su - ${APP_USER}
   2.  cd ${APP_DIR}
   3.  nano .env             # paste production env; set DB_DRIVER=standard and the
                             #   DATABASE_URL/DIRECT_URL above (see deploy/.env.production.example)
   4.  Configure R2 backups: rclone config   (see deploy/r2-and-cron.md)
   5.  bash deploy/migrate-from-neon.sh       # one-time: copy data Neon -> local
   6.  npm ci && npm run build
   7.  pm2 start deploy/ecosystem.config.cjs
   8.  pm2 save && pm2 startup    # run the line it prints (as root) for reboot-safety
   9.  exit                       # back to root
   10. nano /etc/caddy/Caddyfile  # paste deploy/Caddyfile, set your domain
   11. systemctl reload caddy
   12. crontab -e (as ${APP_USER}) -> add the nightly backup line from deploy/r2-and-cron.md
==================================================================
EOF
