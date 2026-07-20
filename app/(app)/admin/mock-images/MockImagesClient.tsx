"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// MathRenderer, not MathText: MathText is raw KaTeX, which renders the stored
// text verbatim. Mock questions store pre-transform LaTeX (`alpha in R`,
// `\{\text{table}` for a cases block), so they only render correctly after
// transformMathContent — which MathRenderer applies and MathText does not.
import MathRenderer from "@/components/ui/MathRenderer";
import type { AuditedMock, MockQuestionDetail } from "@/lib/mockImageAudit";

type Detail = {
  mock: { id: string; title: string; exam_type: string; branch: string | null };
  totalQuestions: number;
  questions: MockQuestionDetail[];
};

type Slot = { qIndex: number; imgIndex: number; expectedRef: string };

// A slot is one broken image on one question — the unit the admin repairs.
const slotKey = (qIndex: number, imgIndex: number) => `${qIndex}:${imgIndex}`;

export default function MockImagesClient({ mocks }: { mocks: AuditedMock[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Slot armed for a paste, so Ctrl/Cmd+V anywhere lands on it.
  const [armed, setArmed] = useState<string | null>(null);
  const armedRef = useRef<Slot | null>(null);

  // Resolved slots, kept client-side so the list updates without a refetch.
  const [replaced, setReplaced] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const loadMock = useCallback(async (mockId: string) => {
    setSelected(mockId);
    setLoading(true);
    setError(null);
    setDetail(null);
    setReplaced({});
    setRemoved(new Set());
    setArmed(null);
    armedRef.current = null;
    try {
      const res = await fetch(`/api/admin/mock-images/${mockId}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      setDetail(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load mock");
    } finally {
      setLoading(false);
    }
  }, []);

  /** Strip refs (the common fix). Batched so "remove all" is one request. */
  const removeSlots = useCallback(
    async (slots: Slot[], busyKey: string) => {
      if (!selected || slots.length === 0) return;
      setBusy(busyKey);
      setError(null);
      try {
        const res = await fetch(`/api/admin/mock-images/${selected}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: slots }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        setRemoved((prev) => {
          const next = new Set(prev);
          slots.forEach((s) => next.add(slotKey(s.qIndex, s.imgIndex)));
          return next;
        });
        setArmed(null);
        armedRef.current = null;
      } catch (e) {
        setError(e instanceof Error ? e.message : "remove failed");
      } finally {
        setBusy(null);
      }
    },
    [selected]
  );

  const upload = useCallback(
    async (slot: Slot, file: File) => {
      if (!selected) return;
      const key = slotKey(slot.qIndex, slot.imgIndex);
      setBusy(key);
      setError(null);
      try {
        const form = new FormData();
        form.append("image", file);
        form.append("qIndex", String(slot.qIndex));
        form.append("imgIndex", String(slot.imgIndex));
        form.append("expectedRef", slot.expectedRef);
        const res = await fetch(`/api/admin/mock-images/${selected}`, { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        setReplaced((prev) => ({ ...prev, [key]: data.url }));
        setArmed(null);
        armedRef.current = null;
      } catch (e) {
        setError(e instanceof Error ? e.message : "upload failed");
      } finally {
        setBusy(null);
      }
    },
    [selected]
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const slot = armedRef.current;
      if (!slot) return;
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (!file) return; // text paste — leave it alone
      e.preventDefault();
      void upload(slot, file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [upload]);

  const isHandled = useCallback(
    (key: string) => key in replaced || removed.has(key),
    [replaced, removed]
  );

  // Bulk target: broken slots on questions with NO figure signal. Flagged
  // questions are deliberately excluded — a wrong bulk delete destroys a figure
  // that can't be recovered from ImageKit.
  const bulkSlots = useMemo<Slot[]>(() => {
    if (!detail) return [];
    return detail.questions
      .filter((q) => q.figureReasons.length === 0)
      .flatMap((q) =>
        q.images
          .filter((i) => i.missing && !isHandled(slotKey(i.qIndex, i.imgIndex)))
          .map((i) => ({ qIndex: i.qIndex, imgIndex: i.imgIndex, expectedRef: i.ref }))
      );
  }, [detail, isHandled]);

  const flaggedCount = detail
    ? detail.questions
        .filter((q) => q.figureReasons.length > 0)
        .reduce(
          (n, q) => n + q.images.filter((i) => i.missing && !isHandled(slotKey(i.qIndex, i.imgIndex))).length,
          0
        )
    : 0;

  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      <aside className="md:sticky md:top-4 md:self-start">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">{mocks.length} mocks</h2>
          <span className="text-xs text-gray-500">{mocks.reduce((n, m) => n + m.count, 0)} images</span>
        </div>
        <ul className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
          {mocks.map((m) => (
            <li key={m.mockId}>
              <button
                onClick={() => loadMock(m.mockId)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                  selected === m.mockId
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{m.title}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {[m.exam_type, m.branch].filter(Boolean).join(" / ")}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-600 dark:text-red-400">
                  {m.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="min-w-0">
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {!selected && (
          <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
            Pick a mock on the left to see its broken images.
          </p>
        )}
        {loading && <p className="text-sm text-gray-500">Re-checking this mock&rsquo;s images…</p>}

        {detail && !loading && (
          <>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">{detail.mock.title}</h2>
                <p className="text-sm text-gray-500">
                  {bulkSlots.length} removable · {flaggedCount} need a look · {detail.totalQuestions} questions in mock
                </p>
              </div>
              {bulkSlots.length > 0 && (
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Remove ${bulkSlots.length} image reference(s) from questions with no figure signal?\n\n` +
                          `${flaggedCount} flagged image(s) will be left alone.\n\n` +
                          `The refs are recorded in scripts/mock-missing-images.csv if you need to undo this.`
                      )
                    ) {
                      void removeSlots(bulkSlots, "bulk");
                    }
                  }}
                  disabled={busy !== null}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {busy === "bulk" ? "Removing…" : `Remove ${bulkSlots.length} unflagged`}
                </button>
              )}
            </div>

            {detail.questions.length === 0 && (
              <p className="rounded-xl border border-green-300 bg-green-50 p-6 text-center text-sm font-semibold text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
                Nothing broken here any more — every image in this mock resolves.
              </p>
            )}

            <div className="space-y-6">
              {detail.questions.map((q) => {
                const flagged = q.figureReasons.length > 0;
                return (
                  <article
                    key={q.qIndex}
                    className={`rounded-xl border bg-white p-4 dark:bg-gray-900 ${
                      flagged
                        ? "border-amber-400 dark:border-amber-700"
                        : "border-gray-200 dark:border-gray-800"
                    }`}
                  >
                    <header className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                      <span>Q{q.qIndex + 1}</span>
                      {q.subject && (
                        <span className="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-800">{q.subject}</span>
                      )}
                      {flagged ? (
                        q.figureReasons.map((r) => (
                          <span
                            key={r}
                            className="rounded bg-amber-500/15 px-2 py-0.5 normal-case text-amber-700 dark:text-amber-300"
                          >
                            {r}
                          </span>
                        ))
                      ) : (
                        <span className="rounded bg-gray-100 px-2 py-0.5 normal-case text-gray-500 dark:bg-gray-800">
                          text stands alone
                        </span>
                      )}
                    </header>

                    <div className="mb-3 text-sm text-gray-800 dark:text-gray-200">
                      <MathRenderer content={q.text || "(no question text stored)"} />
                    </div>

                    {q.options.length > 0 && (
                      <ol className="mb-4 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                        {q.options.map((o, i) => (
                          <li key={i} className="truncate">
                            {o?.trim() ? o : <em className="text-amber-600">(no text — image option)</em>}
                          </li>
                        ))}
                      </ol>
                    )}

                    <div className="flex flex-wrap gap-3">
                      {q.images.map((img) => {
                        const key = slotKey(img.qIndex, img.imgIndex);
                        const slot: Slot = {
                          qIndex: img.qIndex,
                          imgIndex: img.imgIndex,
                          expectedRef: img.ref,
                        };
                        const newUrl = replaced[key];
                        const isRemoved = removed.has(key);
                        const isArmed = armed === key;
                        const isBusy = busy === key;

                        if (isRemoved) {
                          return (
                            <div key={key} className="w-40 rounded-lg border border-gray-300 bg-gray-50 p-2 text-center text-[11px] text-gray-500 dark:border-gray-700 dark:bg-gray-800">
                              reference removed
                            </div>
                          );
                        }
                        if (newUrl) {
                          return (
                            <figure key={key} className="w-40">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={newUrl} alt="" className="h-28 w-full rounded-lg border-2 border-green-500 object-contain" />
                              <figcaption className="mt-1 text-[11px] font-bold text-green-600 dark:text-green-400">
                                replaced &amp; saved
                              </figcaption>
                            </figure>
                          );
                        }
                        if (!img.missing) {
                          return (
                            <figure key={key} className="w-40">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.url} alt="" className="h-28 w-full rounded-lg border border-gray-200 object-contain dark:border-gray-700" />
                              <figcaption className="mt-1 truncate text-[11px] text-gray-400" title={img.ref}>
                                ok · {img.ref.split("/").pop()}
                              </figcaption>
                            </figure>
                          );
                        }

                        return (
                          <div key={key} className="w-44">
                            <div
                              tabIndex={0}
                              role="button"
                              onFocus={() => {
                                setArmed(key);
                                armedRef.current = slot;
                              }}
                              onPaste={(e) => {
                                const file = Array.from(e.clipboardData.files).find((f) =>
                                  f.type.startsWith("image/")
                                );
                                if (!file) return;
                                e.preventDefault();
                                void upload(slot, file);
                              }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                const file = Array.from(e.dataTransfer.files).find((f) =>
                                  f.type.startsWith("image/")
                                );
                                if (file) void upload(slot, file);
                              }}
                              className={`flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-2 text-center text-[11px] outline-none transition ${
                                isArmed
                                  ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                  : "border-red-300 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                              }`}
                            >
                              {isBusy ? (
                                <span className="font-bold">Working…</span>
                              ) : isArmed ? (
                                <>
                                  <span className="font-bold">Ready — Ctrl/Cmd+V</span>
                                  <span className="mt-1 text-gray-500">or drop an image</span>
                                </>
                              ) : (
                                <>
                                  <span className="font-bold">Image missing</span>
                                  <span className="mt-1 text-gray-500">click to paste a replacement</span>
                                </>
                              )}
                            </div>

                            <button
                              onClick={() => void removeSlots([slot], key)}
                              disabled={busy !== null}
                              className="mt-1 w-full rounded-md bg-gray-900 px-2 py-1.5 text-[11px] font-bold text-white transition hover:bg-red-600 disabled:opacity-50 dark:bg-gray-700"
                            >
                              Remove reference
                            </button>
                            <label className="mt-1 block cursor-pointer truncate text-[11px] text-gray-400 hover:text-amber-500" title={img.ref}>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void upload(slot, file);
                                  e.target.value = "";
                                }}
                              />
                              or choose a file · {img.ref.split("/").pop()}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
