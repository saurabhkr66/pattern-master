"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StudentTestRunner from "@/components/coaching/StudentTestRunner";
import type { TestQuestion, DraftState } from "@/components/test/testEngineTypes";
import type { ExamConfig } from "@/lib/examConfigs";

/**
 * Waiting room + pre-stage gate for a scheduled test. The server page renders
 * this thin shell instead of the full paper; the heavy work is split across two
 * endpoints so the T-0 spike stays tiny:
 *
 *   paper (GET, from start−10min): this student's questions, AES-encrypted.
 *     Prefetched here with jitter while the student watches the countdown.
 *   start (POST, from T-0): creates/resumes the attempt and releases the
 *     decryption key — a few hundred bytes, the only per-student call at T-0.
 *
 * The countdown runs on SERVER time: every response carries serverNow and we
 * track the offset, so a wrong device clock can neither start early (the start
 * endpoint re-checks anyway) nor strand the student waiting.
 *
 * Late joiners and mid-test reloads hit the same path with zero wait: both
 * fetches fire immediately and the runner mounts with the restored draft.
 */

const PRELOAD_MS = 10 * 60 * 1000;

type Phase =
  | { name: "waiting" }
  | { name: "starting" }
  | { name: "running"; questions: TestQuestion[]; config: ExamConfig; attemptId: string; serverExpiresAt: string; draft: DraftState | null }
  | { name: "closed" }
  | { name: "error"; message: string };

const b64ToBytes = (b64: string) =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function decryptPaper(
  keyB64: string,
  paper: { iv: string; ct: string }
): Promise<{ questions: TestQuestion[]; config: ExamConfig }> {
  const key = await crypto.subtle.importKey(
    "raw",
    b64ToBytes(keyB64),
    "AES-GCM",
    false,
    ["decrypt"]
  );
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(paper.iv) },
    key,
    b64ToBytes(paper.ct)
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

export default function TestGate({
  slug,
  testId,
  testTitle,
  studentName,
  startAt,
}: {
  slug: string;
  testId: string;
  testTitle: string;
  studentName: string;
  startAt: string | null; // ISO; null = no scheduled start (already open)
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ name: "waiting" });
  const [msLeft, setMsLeft] = useState<number | null>(null);
  const [paperReady, setPaperReady] = useState(false);

  // Server-clock offset (server − client). Starts at 0 (trust the device) and
  // is corrected from every endpoint response's serverNow — including the 425
  // "too early" replies, so a wrong device clock converges on the next contact.
  // The server independently re-gates paper/start, so the offset only affects
  // when we TRY, never what we're allowed to do. Read through a ref so the
  // timers never need re-arming on a state change.
  const offsetRef = useRef(0);
  const startAtMsRef = useRef<number | null>(startAt ? Date.parse(startAt) : null);
  const paperRef = useRef<{ iv: string; ct: string } | null>(null);
  const paperPromiseRef = useRef<Promise<void> | null>(null);
  const startedRef = useRef(false);

  const nowServer = () => Date.now() + offsetRef.current;
  const syncClock = (sn: unknown) => {
    if (typeof sn === "number") offsetRef.current = sn - Date.now();
  };

  // ── Paper prefetch (encrypted; safe to hold before T-0) ────────────────────
  const fetchPaper = useCallback(async (): Promise<void> => {
    // Keep trying until the window closes — a student without the ciphertext at
    // T-0 would stall on the start path's fallback fetch instead.
    let delay = 1000;
    while (!paperRef.current) {
      try {
        const res = await fetch(`/api/student/test/${testId}/paper`);
        const data = await res.json().catch(() => ({}));
        syncClock(data.serverNow);
        if (res.ok && data.iv && data.ct) {
          paperRef.current = { iv: data.iv, ct: data.ct };
          setPaperReady(true);
          return;
        }
        if (res.status === 425) {
          // Raced the preload boundary on a fast clock — wait it out.
          if (data.opensAt) startAtMsRef.current = Date.parse(data.opensAt);
          const startMs = startAtMsRef.current;
          const wait = startMs ? Math.max(startMs - PRELOAD_MS - nowServer(), 1000) : 5000;
          await new Promise((r) => setTimeout(r, Math.min(wait, 60_000)));
          continue;
        }
        if (res.status === 410) {
          setPhase({ name: "closed" });
          return;
        }
        if (res.status === 401) {
          router.replace(`/c/${slug}/login`);
          return;
        }
      } catch {
        // network blip — retry below
      }
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 15_000);
    }
  }, [testId, slug, router]);

  const ensurePaper = useCallback((): Promise<void> => {
    if (!paperPromiseRef.current) paperPromiseRef.current = fetchPaper();
    return paperPromiseRef.current;
  }, [fetchPaper]);

  // ── T-0 start: attempt + key, then decrypt and mount the runner ────────────
  const start = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setPhase({ name: "starting" });

    // Same retry posture as submit: a transient blip at T-0 must not strand the
    // student on an error screen while their timer would be running.
    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try {
        const res = await fetch(`/api/student/test/${testId}/start`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        syncClock(data.serverNow);
        if (res.ok && data.submitted) {
          router.replace(`/c/${slug}/result/${data.attemptId}`);
          return;
        }
        if (res.ok && data.key && data.attemptId) {
          await ensurePaper();
          if (!paperRef.current) return; // closed/redirected inside fetchPaper
          const paper = await decryptPaper(data.key, paperRef.current);
          setPhase({
            name: "running",
            questions: paper.questions,
            config: paper.config,
            attemptId: data.attemptId,
            serverExpiresAt: data.serverExpiresAt,
            draft: data.draft ?? null,
          });
          return;
        }
        if (res.status === 425) {
          // Client clock ran fast — resync and fall back to the countdown.
          if (data.opensAt) startAtMsRef.current = Date.parse(data.opensAt);
          startedRef.current = false;
          setPhase({ name: "waiting" });
          return;
        }
        if (res.status === 410) {
          setPhase({ name: "closed" });
          return;
        }
        if (res.status === 401) {
          router.replace(`/c/${slug}/login`);
          return;
        }
        if (res.status >= 400 && res.status < 500) {
          setPhase({ name: "error", message: data.error ?? "Could not start the test" });
          return;
        }
      } catch {
        // network blip — retry below
      }
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 8000);
    }
    startedRef.current = false;
    setPhase({ name: "error", message: "Could not start the test — check your connection" });
  }, [testId, slug, router, ensurePaper]);

  // ── Scheduler: one ticking interval drives countdown, prefetch and start ───
  useEffect(() => {
    let prefetchTimer: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      const startMs = startAtMsRef.current;
      const left = startMs ? startMs - nowServer() : 0;
      setMsLeft(left > 0 ? left : 0);
      if (left <= 0 && !startedRef.current) {
        // Small jitter so a whole batch's start calls don't land in the same
        // millisecond (server re-checks the window, so jitter is safe).
        const jitter = startMs ? Math.random() * 3000 : 0;
        startedRef.current = true; // block further ticks; start() re-guards
        setTimeout(() => {
          startedRef.current = false;
          void start();
        }, jitter);
      }
    };

    // Prefetch: inside the preload window fetch now (with up to 60s of jitter
    // if there's plenty of time); otherwise arm a timer for the window opening.
    const armPrefetch = () => {
      const startMs = startAtMsRef.current;
      const tts = startMs ? startMs - nowServer() : 0;
      if (tts <= 0) {
        void ensurePaper();
        return;
      }
      const fire = () => {
        const jitter =
          startAtMsRef.current! - nowServer() > 2 * 60 * 1000
            ? Math.random() * 60_000
            : 0;
        prefetchTimer = setTimeout(() => void ensurePaper(), jitter);
      };
      if (tts <= PRELOAD_MS) fire();
      else prefetchTimer = setTimeout(fire, tts - PRELOAD_MS);
    };

    armPrefetch();
    tick();
    const interval = setInterval(tick, 1000);
    return () => {
      clearInterval(interval);
      if (prefetchTimer) clearTimeout(prefetchTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase.name === "running") {
    return (
      <StudentTestRunner
        slug={slug}
        testId={testId}
        attemptId={phase.attemptId}
        questions={phase.questions}
        config={phase.config}
        serverExpiresAt={phase.serverExpiresAt}
        studentName={studentName}
        initialState={phase.draft}
      />
    );
  }

  if (phase.name === "closed") {
    return (
      <Shell title="Test closed">
        <p className="mt-2 text-slate-400">The submission window has ended.</p>
      </Shell>
    );
  }

  if (phase.name === "error") {
    return (
      <Shell title="Could not start">
        <p className="mt-2 text-slate-400">{phase.message}</p>
        <button
          onClick={() => {
            startedRef.current = false;
            void start();
          }}
          className="mt-6 rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-500"
        >
          Try again
        </button>
      </Shell>
    );
  }

  // msLeft === null only before the first client tick (SSR paint + hydration
  // instant) — show a neutral state, not a countdown we haven't computed.
  if (msLeft === null) {
    return (
      <Shell title={testTitle}>
        <p className="mt-2 animate-pulse text-slate-400">Preparing…</p>
      </Shell>
    );
  }

  if (phase.name === "starting" || msLeft <= 0) {
    return (
      <Shell title={testTitle}>
        <p className="mt-2 animate-pulse text-slate-400">Starting your test…</p>
      </Shell>
    );
  }

  return (
    <Shell title={testTitle}>
      <p className="mt-2 text-slate-400">Test starts in</p>
      <p className="mt-3 font-mono text-5xl font-bold tabular-nums text-white">
        {formatCountdown(msLeft)}
      </p>
      {/* The prefetch is deliberately jittered (up to 60s) to spread a batch's
          downloads, so don't say "loading" — it implies something is stuck. */}
      <p className="mt-6 text-sm text-slate-500">
        {paperReady
          ? "✓ Question paper loaded — the test starts automatically. Keep this page open."
          : "The question paper downloads automatically before the start — keep this page open."}
      </p>
    </Shell>
  );
}

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center">
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      {children}
    </div>
  );
}
