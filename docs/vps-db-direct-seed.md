# Run seed script from VSCode → writes to VPS database

## Step 1 — Open the SSH tunnel

Open a terminal and run:
```
ssh -L 5433:localhost:5432 root@<VPS_IP>
```
Keep this terminal open. Don't close it while running scripts.

---

## Step 2 — Switch .env to VPS

Open `.env` in the project root.

**Comment out** the 3 Option 1 lines (Neon):
```
# DB_DRIVER=neon-http
# DATABASE_URL="postgresql://neondb_owner:..."
# DIRECT_URL="postgresql://neondb_owner:..."
```

**Uncomment** the 3 Option 2 lines (VPS):
```
DB_DRIVER=standard
DATABASE_URL="postgresql://battle:iBbOjqQJhDLDwPSbqf89YZkY@localhost:5433/battleexam?schema=public&connection_limit=10"
DIRECT_URL="postgresql://battle:iBbOjqQJhDLDwPSbqf89YZkY@localhost:5433/battleexam?schema=public"
```

---

## Step 3 — Run the script

Open a **second** terminal (not the SSH one) and run whichever script you need:

```powershell
# seed EE images
npx ts-node --project tsconfig.seed.json prisma/seed_from_json.ts

# fix image extensions
node scripts/fix-ext-allfolders.js

# seed coaching questions
node --env-file=.env scripts/coaching/seed-coaching-questions.mjs <slug> <file.json>
```

---

## Step 4 — Switch .env back to Neon

**Uncomment** the 3 Option 1 lines (Neon):
```
DB_DRIVER=neon-http
DATABASE_URL="postgresql://neondb_owner:..."
DIRECT_URL="postgresql://neondb_owner:..."
```

**Comment out** the 3 Option 2 lines (VPS):
```
# DB_DRIVER=standard
# DATABASE_URL="postgresql://battle:..."
# DIRECT_URL="postgresql://battle:..."
```

---

## Step 5 — Close the SSH tunnel

Go to the SSH terminal and press `Ctrl+C` or type `exit`.

---

## Important

- Do Step 4 (restore Neon) before restarting the dev server, otherwise the app will try to connect to VPS through a closed tunnel and fail.
- Port `5433` is your local tunnel — the VPS itself uses `5432`. Don't mix them up.
