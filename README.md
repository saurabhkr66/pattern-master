# 🏆 BattleExam

> **AI-Powered GATE, ISRO, BARC & ESE Exam Preparation Platform**

BattleExam is a production-grade, full-stack web & mobile application built for serious competitive exam aspirants. It combines an AI question engine, pattern-based learning methodology, real-time progress tracking, and an offline-capable native Android app — all in a single cohesive platform.

**Live Site:** [https://battleexam.com](https://battleexam.com)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture Overview](#-architecture-overview)
- [Database Schema](#-database-schema)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Local Development Setup](#-local-development-setup)
- [Database Management](#-database-management)
- [Seeding the Database](#-seeding-the-database)
- [Deployment (Vercel)](#-deployment-vercel)
- [Mobile App (Android / Play Store)](#-mobile-app-android--play-store)
- [API Routes](#-api-routes)
- [Analytics & SEO](#-analytics--seo)
- [Contributing](#-contributing)

---

## ✨ Features

### Core Learning Engine
- **Pattern-Based Questions**: Each topic is decomposed into an "atomic logic" — the core reasoning pattern behind all GATE questions on that topic.
- **AI-Generated Questions**: Powered by Google Gemini Pro, questions are generated dynamically per topic, ensuring an endless and fresh question bank.
- **Previous Year Questions (PYQs)**: Real GATE questions from past years (MCQ, MSQ, and NAT types) are seeded and tracked separately.
- **Subject-Level Practice**: Comprehensive subject-wide practice modes for boards like ISRO/BARC that test broad subject knowledge.
- **Flashcard Review Deck**: Spaced-repetition style flashcard review for mastery notes and key concepts.
- **Mock Test System**: Timed, full-length mock tests with automatic scoring, section analysis, and a detailed results breakdown.

### Progress & Analytics
- **Real-Time Dashboard**: Displays total questions attempted, accuracy %, and current streak.
- **GitHub-style Activity Heatmap**: Visualizes your daily practice activity over the last 6 months.
- **Critical Review Queue**: Automatically surfaces the 15 most recently failed questions for targeted revision.
- **Mistake Tracker**: Dedicated `/mistakes` page with drill-down into wrong answers, correct answers, and AI explanations.

### User Experience
- **Dark/Light Mode**: System-aware theme with localStorage persistence; no flash on load.
- **LaTeX Rendering**: Full mathematical notation support via KaTeX for equations in questions and explanations.
- **Image Support**: Questions with diagrams are fully supported via a `public/` image directory.
- **Mobile-First**: Fully responsive design — every feature works on small phone screens.
- **Smart Search**: Full-text search across topics and questions via a dedicated search modal.

### Authentication & Security
- **Clerk Authentication**: Email/password and Google OAuth via Clerk's production instance.
- **Middleware Protection**: All `/dashboard`, `/practice`, `/review`, `/test`, and `/mistakes` routes require authentication.
- **Cascading Deletes**: User deletion cascades to all attempt records automatically.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Server Components) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 |
| **Database** | PostgreSQL (hosted on Supabase) |
| **ORM** | Prisma v6 |
| **Auth** | Clerk (v7) |
| **AI - Primary** | Google Gemini Pro (`@google/generative-ai`) |
| **AI - Secondary** | DeepSeek / OpenRouter |
| **Math Rendering** | KaTeX + remark-math + rehype-katex |
| **State Management** | TanStack React Query v5 |
| **Analytics** | Google Analytics 4 + Microsoft Clarity |
| **Deployment** | Vercel |
| **Native Mobile** | Capacitor v8 (Android & iOS) |
| **Fonts** | Geist Sans + Geist Mono (via `next/font`) |

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────┐
│              Next.js App Router            │
│                                            │
│  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │   RSC    │  │ Server   │  │  Edge   │  │
│  │ (Pages)  │  │ Actions  │  │ Middleware│ │
│  └──────────┘  └──────────┘  └─────────┘  │
│         │             │            │       │
│         ▼             ▼            ▼       │
│  ┌─────────────────────────────────────┐   │
│  │            Prisma ORM               │   │
│  └─────────────────────────────────────┘   │
│                      │                     │
└──────────────────────┼─────────────────────┘
                       │
              ┌────────▼────────┐
              │  Supabase PG    │
              │  (PostgreSQL)   │
              └─────────────────┘
```

**Data Flow:**
1. All pages are **Server Components** by default, fetching data directly from Prisma.
2. Expensive, repeated queries are wrapped in `unstable_cache` from Next.js for per-user caching.
3. Questions are submitted via **React Query mutations** hitting `/api/save-attempt`.
4. Auth state is managed by **Clerk Middleware** (`middleware.ts`) globally across all routes.

---

## 🗄️ Database Schema

The application uses **7 database models**:

```
User
 └── Attempt (many)

Pattern
 ├── GeneratedQuestion (many)
 │    └── Attempt (many)
 └── PYQ (many)
      └── Attempt (many)

SubjectPattern
 └── SubjectPYQ (many)
      └── Attempt (many)

MockTestTemplate
 └── TestSession (many)
```

### Model Summary

| Model | Purpose |
|---|---|
| `User` | Authenticated user record synced from Clerk on first login |
| `Pattern` | Core topic unit with atomic logic — the heart of the system |
| `GeneratedQuestion` | AI-generated MCQ/MSQ/NAT questions tied to a Pattern |
| `PYQ` | Official Previous Year Questions by exam and year |
| `SubjectPattern` | Top-level subject grouping (for ISRO/BARC subject practice) |
| `SubjectPYQ` | Subject-level PYQs not tied to a specific topic Pattern |
| `Attempt` | Records every question submission (correct/incorrect, user answer) |
| `MockTestTemplate` | Reusable template for a full-length mock test configuration |
| `TestSession` | A completed instance of a mock test, with score and per-question answers |

### Key Indexes (Performance)

```sql
-- Fast user attempt lookups
@@index([user_id, is_correct, created_at(sort: Desc)])

-- Fast topic pattern lookups for the Practice page
@@index([exam_type, branch, subject], name: "pattern_subject_lookup")

-- Fast PYQ lookups by year
@@index([pattern_id, year(sort: Desc)])
```

---

## 📁 Project Structure

```
pattern-master/
├── app/
│   ├── (app)/                      # Protected routes (auth required)
│   │   ├── layout.tsx              # Auto-syncs user to DB on entry
│   │   ├── dashboard/page.tsx      # Progress heatmap, streak, review queue
│   │   ├── practice/page.tsx       # Main topic & PYQ practice board
│   │   ├── review/                 # Flashcard review deck
│   │   ├── mistakes/               # Wrong answer drill-down
│   │   └── test/                   # Timed mock test interface
│   ├── (auth)/                     # sign-in, sign-up (Clerk hosted)
│   ├── [examType]/                 # Public SEO question pages (e.g. /gate-cse/...)
│   ├── api/
│   │   ├── generate-question/      # Calls Gemini to generate a new question
│   │   ├── save-attempt/           # Logs a user's question submission
│   │   ├── patterns/[id]/          # Fetches questions for a given pattern
│   │   └── search/                 # Full-text search across topics
│   ├── layout.tsx                  # Root layout: fonts, ClerkProvider, meta, analytics
│   ├── page.tsx                    # Landing page (public)
│   ├── manifest.ts                 # PWA manifest (for Play Store)
│   ├── sitemap.ts                  # Auto-generated SEO sitemap
│   └── robots.ts                   # robots.txt rules
│
├── components/
│   ├── Header.tsx                  # Responsive nav with theme toggle + auth state
│   ├── ThemeProvider.tsx           # Dark/light mode context
│   ├── dashboard/                  # ActivityHeatmap component
│   ├── patterns/                   # PatternTable, PatternRow, ExamSwitcher
│   ├── question/                   # Question display, answer logic
│   ├── review/                     # FlashcardDeck component
│   ├── test/                       # MockTest UI components
│   ├── search/                     # SearchModal component
│   └── ui/                         # MathRenderer, shared primitive components
│
├── lib/
│   ├── prisma.ts                   # Prisma client singleton (prevents connection leaks)
│   ├── gemini.ts                   # Google Gemini API client
│   ├── deepseek.ts                 # DeepSeek API client (via OpenRouter)
│   ├── prompts.ts                  # AI system prompts for question generation
│   ├── seo.ts                      # JSON-LD schema builders, URL slug utilities
│   └── hash.ts                     # Semantic hash utility for deduplication
│
├── prisma/
│   ├── schema.prisma               # Full database schema
│   ├── seed.ts                     # Base pattern seeder
│   ├── seed_questions.ts           # AI-generated question seeder
│   ├── seed_pyqs.ts                # Previous Year Question seeder
│   ├── seed_notes.ts               # Mastery notes / short notes seeder
│   └── seed_subjects.ts            # Subject-level practice seeder
│
├── middleware.ts                   # Clerk auth middleware (public vs protected routes)
├── capacitor.config.ts             # Android/iOS native app configuration
└── package.json
```

---

## 🔑 Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# ─── Supabase Database ──────────────────────────────────────
# Transaction pooling (for serverless — use port 6543)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (for migrations and seeding only)
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# ─── Clerk Authentication ───────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# ─── AI APIs ────────────────────────────────────────────────
GEMINI_API_KEY=AIza...
DEEPSEEK_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-v1-...

# ─── Analytics ──────────────────────────────────────────────
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_CLARITY_ID=xxxxxxxxxx
```

> ⚠️ **Important**: Never commit your `.env` file. All of these must also be added manually in the **Vercel Dashboard → Settings → Environment Variables** before deploying.

---

## 💻 Local Development Setup

### Prerequisites
- Node.js v18+
- npm v9+
- A Supabase project (free tier works)
- Android Studio (only for mobile development)

### Step-by-Step

```bash
# 1. Clone the repository
git clone https://github.com/your-username/battleexam.git
cd battleexam

# 2. Install dependencies
npm install

# 3. Set up your environment
cp .env.example .env
# Edit .env with your actual keys

# 4. Generate the Prisma client
npx prisma generate

# 5. Push the schema to your database
npx prisma db push

# 6. Start the development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

---

## 🗃️ Database Management

### Common Commands

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Push schema changes to the database (no migration file)
npx prisma db push

# Open Prisma Studio (visual DB browser)
npx prisma studio

# Reset the entire database (⚠️ DESTRUCTIVE)
npx prisma db push --force-reset
```

### Connection Architecture

```
Vercel Serverless Functions
        │
        │ (port 6543 — transaction pooler)
        ▼
   Supabase PgBouncer
        │
        │ (direct connection)
        ▼
   PostgreSQL Database
```

> The `DATABASE_URL` must use **port 6543** with `?pgbouncer=true` for serverless environments. Using port 5432 directly will cause connection pool exhaustion and timeout errors on Vercel.

---

## 🌱 Seeding the Database

The project has several specialized seed scripts:

```bash
# Seed base topic patterns (exam type, subject, atomic logic)
npx tsx prisma/seed.ts

# Seed AI-generated practice questions for patterns
npx tsx prisma/seed_questions.ts

# Seed real Previous Year Questions
npx tsx prisma/seed_pyqs.ts

# Seed mastery/short notes for AI-generated topics
npx tsx prisma/seed_notes.ts

# Seed subject-level patterns (e.g., for ISRO practice)
npx tsx prisma/seed_subjects.ts
```

> **Recommended seed order**: `seed.ts` → `seed_questions.ts` → `seed_pyqs.ts` → `seed_notes.ts` → `seed_subjects.ts`

---

## 🚀 Deployment (Vercel)

### Initial Setup

1. Connect your GitHub repo to a new Vercel project.
2. Set the **Root Directory** to `pattern-master/` (or `.` if already in the root).
3. Add all environment variables from your `.env` file in **Settings → Environment Variables**.
4. Deploy.

### Build Command

The `package.json` build script runs `prisma generate` before every build to ensure the Prisma client is always in sync with your latest schema:

```json
"build": "prisma generate && next build"
```

> ⚠️ **Common Pitfall**: If you remove or add database columns and deploy without running `prisma generate`, Vercel will use a stale client and crash at runtime with `PrismaClientKnownRequestError`.

### Custom Domain Setup

After deploying on Vercel:
1. Go to **Settings → Domains** and add `battleexam.com`.
2. In your domain registrar, add the CNAME record Vercel provides.
3. In **Supabase → Authentication → URL Configuration**, add `https://battleexam.com` to "Redirect URLs".
4. In your **Clerk Dashboard → Domains**, add `battleexam.com` as a production domain.

---

## 📱 Mobile App (Android / Play Store)

BattleExam uses **Capacitor v8** to wrap the live website in a native Android WebView, enabling Play Store distribution.

### How It Works

The app shell loads the live `https://battleexam.com` URL inside a native WebView, with a custom User Agent to ensure mobile-optimized rendering. Authentication (Clerk), navigation, and all features work identically to the website.

### Configuration (`capacitor.config.ts`)

```typescript
const config: CapacitorConfig = {
  appId: 'com.battleexam.app',
  appName: 'BattleExam',
  overrideUserAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7)...",
  webDir: 'public',
  server: {
    url: 'https://battleexam.com',
    cleartext: true,
    allowNavigation: [
      'battleexam.com',
      '*.battleexam.com',
      '*.clerk.accounts.dev',  // Clerk fallback auth
      '*.clerk.services',      // Clerk API
      'accounts.google.com',   // Google OAuth
      '*.google.com'
    ]
  }
};
```

### Building the Android App

```bash
# Step 1: Install Android support
npm install @capacitor/android
npx cap add android

# Step 2: Sync the web configuration to native
npx cap sync

# Step 3: Open in Android Studio for APK/AAB generation
npx cap open android
```

**In Android Studio:**
1. `Build → Generate Signed Bundle / APK`
2. Choose **Android App Bundle (.aab)**
3. Create or use an existing keystore
4. Build in **Release** mode

### Uploading to Play Store

1. Go to [Google Play Console](https://play.google.com/console) and create a new app.
2. Upload the `.aab` file to the **Internal Testing** track first.
3. Fill in store listing details (title, description, screenshots).
4. Promote to **Production** once testing is complete.

### Required Play Store Assets

| Asset | Size | Notes |
|---|---|---|
| App Icon | 512×512 px PNG | Use your `icon.png` |
| Feature Graphic | 1024×500 px | Banner image for the store |
| Screenshots | Min 2 per device | Phone + Tablet recommended |

---

## 🔌 API Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/generate-question` | `POST` | Required | Generates a new AI question for a pattern |
| `/api/save-attempt` | `POST` | Required | Saves a user's answer attempt |
| `/api/patterns/[id]/questions` | `GET` | Optional | Lists questions for a specific pattern |
| `/api/search` | `GET` | Optional | Full-text search across patterns |
| `/api/test` | `POST` | Required | Creates a new mock test session |

---

## 📊 Analytics & SEO

### Analytics

- **Google Analytics 4** (`G-C5G2VW8JTK`): Page views, user sessions, event tracking.
- **Microsoft Clarity** (`wb3ybfec5s`): Heatmaps, session recordings, and rage-click detection.

Both are loaded via `next/script` with `strategy="afterInteractive"` to avoid blocking page render.

### SEO Architecture

- **`app/sitemap.ts`**: Auto-generates a sitemap for all seeded question pages.
- **`app/robots.ts`**: Allows all bots access except admin routes.
- **`lib/seo.ts`**: Builds JSON-LD schema for `Organization`, `WebSite`, and `Quiz` types.
- **Metadata**: Every page exports a `metadata` object with optimized `title`, `description`, `openGraph`, and `twitter` fields.

---

## 🔐 Auth & Middleware

```typescript
// middleware.ts — Public routes (no auth required)
const isPublicRoute = createRouteMatcher([
  "/",                     // Landing page
  "/sign-in(.*)",          // Clerk sign-in
  "/sign-up(.*)",          // Clerk sign-up
  "/api/cron/(.*)",        // Cron jobs
  "/api/maintenance/(.*)", // Maintenance endpoints
  "/:examType/:subject/:topic/:questionId", // Public SEO pages
]);
```

All other routes (including `/dashboard`, `/practice`, `/test`) are protected by Clerk's `auth.protect()` automatically.

---

## 📄 License

Proprietary — All rights reserved © 2026 BattleExam.
