"use client";

import { useEffect, useRef, useState } from "react";
import { BE } from "@/lib/theme";
import { suppressTabSwitch } from "./tabSwitchSuppress";
import type { TestQuestion } from "./testEngineTypes";

// Photo answer capture for SUBJECTIVE questions (coaching tests). The student
// writes on paper, photographs it (≤3 photos), and we upload each photo
// DIRECTLY to R2 via a presigned PUT from the upload endpoint — the app server
// never proxies image bytes. Only the resulting object KEYS travel through the
// engine's answer state / draft / submit payload.
//
// Order matters: compress FIRST, then presign — the content length is part of
// the presigned signature, so the byte count must be final before asking.

const MAX_PHOTOS = 3;

type SlotState = { key: string; previewUrl: string | null };

export default function SubjectiveAnswerInput({
  question,
  attemptId,
  uploadEndpoint,
  keys,
  onChange,
}: {
  question: TestQuestion;
  attemptId: string;
  uploadEndpoint: string;
  keys: string[];
  onChange: (q: TestQuestion, keys: string[]) => void;
}) {
  const [slots, setSlots] = useState<SlotState[]>(() =>
    keys.map((k) => ({ key: k, previewUrl: null }))
  );
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);

  // Keep slots in sync when the engine swaps questions (same mounted component,
  // different question id → different keys array).
  const qid = question.id;
  const keysSig = keys.join(";");
  useEffect(() => {
    setSlots(keys.map((k) => ({ key: k, previewUrl: null })));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qid, keysSig]);

  // Draft-resume previews: any slot without a preview gets a short-lived signed
  // GET URL (fresh uploads use a local object URL instead, set on upload).
  useEffect(() => {
    const missing = slots.filter((s) => !s.previewUrl).map((s) => s.key);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(uploadEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "view", attemptId, keys: missing }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.urls) return;
        setSlots((prev) =>
          prev.map((s) => (s.previewUrl ? s : { ...s, previewUrl: data.urls[s.key] ?? null }))
        );
      } catch {
        /* previews are best-effort; the keys themselves are safe */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSig]);

  // Revoke local object URLs on unmount.
  useEffect(
    () => () => {
      objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
    },
    []
  );

  // The camera hides the page → would count as a tab switch. Suppress around the
  // picker; window focus fires when the user returns (picked OR cancelled).
  function openPicker(ref: React.RefObject<HTMLInputElement | null>) {
    setError(null);
    suppressTabSwitch(true);
    const clear = () => {
      // Small delay: on Android, focus can land before visibilitychange settles.
      setTimeout(() => suppressTabSwitch(false), 1500);
      window.removeEventListener("focus", clear);
    };
    window.addEventListener("focus", clear);
    ref.current?.click();
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    if (slots.length >= MAX_PHOTOS) return;
    setUploading(true);
    setError(null);
    try {
      // 1. Compress in the browser (phone photos are 3–8MB; Gemini needs far
      // less). Also normalizes iPhone HEIC → JPEG.
      setProgress("Compressing…");
      const { default: imageCompression } = await import("browser-image-compression");
      const blob = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 2000,
        fileType: "image/jpeg",
        useWebWorker: true,
      });

      // 2. Presign with the final byte count.
      setProgress("Preparing upload…");
      const presignRes = await fetch(uploadEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "put",
          attemptId,
          questionId: question.id,
          index: slots.length,
          contentType: "image/jpeg",
          sizeBytes: blob.size,
        }),
      });
      const presign = await presignRes.json().catch(() => ({}));
      if (!presignRes.ok || !presign?.url || !presign?.key) {
        throw new Error(presign?.error ?? "Could not start the upload");
      }

      // 3. Direct PUT to R2.
      setProgress("Uploading…");
      const putRes = await fetch(presign.url, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!putRes.ok) throw new Error("Upload failed — check your connection and retry");

      // 4. Record the key + a local preview.
      const previewUrl = URL.createObjectURL(blob);
      objectUrls.current.push(previewUrl);
      const next = [...slots, { key: presign.key, previewUrl }];
      setSlots(next);
      onChange(question, next.map((s) => s.key));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed — please retry");
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

  function removeSlot(i: number) {
    // The R2 object is orphaned on purpose — the bucket lifecycle rule cleans it
    // up; a synchronous delete here only adds failure modes mid-test.
    const next = slots.filter((_, j) => j !== i);
    setSlots(next);
    onChange(question, next.map((s) => s.key));
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div
        style={{
          padding: "14px 16px",
          borderRadius: 12,
          border: `1px dashed ${BE.line}`,
          background: BE.surface,
        }}
      >
        <p style={{ fontSize: 13, color: BE.textDim, marginBottom: 12 }}>
          Write your answer on paper, then photograph it clearly. Up to {MAX_PHOTOS} photos
          for long answers.
        </p>

        {/* Uploaded photo thumbnails */}
        {slots.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            {slots.map((s, i) => (
              <div key={s.key} style={{ position: "relative" }}>
                <div
                  style={{
                    width: 96,
                    height: 128,
                    borderRadius: 8,
                    overflow: "hidden",
                    border: `1px solid ${BE.line}`,
                    background: "rgba(255,255,255,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {s.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.previewUrl}
                      alt={`Answer page ${i + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ fontSize: 11, color: BE.textMute }}>Page {i + 1}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeSlot(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#dc2626",
                    color: "#fff",
                    fontSize: 13,
                    lineHeight: "20px",
                    border: "2px solid var(--bg-base)",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Capture / upload actions */}
        {slots.length < MAX_PHOTOS && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={uploading}
              onClick={() => openPicker(cameraRef)}
              style={{
                padding: "10px 18px",
                borderRadius: 9,
                background: BE.accent,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading
                ? progress ?? "Uploading…"
                : slots.length === 0
                  ? "📷 Photograph answer"
                  : "📷 Add another page"}
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => openPicker(galleryRef)}
              className="be-btn"
              style={{ fontSize: 13, opacity: uploading ? 0.6 : 1 }}
            >
              Upload from gallery
            </button>
          </div>
        )}
        {slots.length >= MAX_PHOTOS && (
          <p style={{ fontSize: 12, color: BE.textMute }}>
            Maximum {MAX_PHOTOS} photos. Remove one to replace it.
          </p>
        )}

        {error && (
          <p style={{ marginTop: 10, fontSize: 12, color: "#f87171" }}>{error}</p>
        )}

        {/* Hidden inputs: camera (capture) and gallery. Value reset so picking the
            same file twice still fires onChange. */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          style={{ display: "none" }}
          onChange={(e) => {
            handleFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          style={{ display: "none" }}
          onChange={(e) => {
            handleFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
