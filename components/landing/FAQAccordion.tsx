"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type FAQ = { q: string; a: string };

export default function FAQAccordion({ faqs }: { faqs: FAQ[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {faqs.map((faq, i) => (
        <div
          key={faq.q}
          className="rounded-xl border overflow-hidden"
          style={{
            borderColor: open === i ? "rgba(99,102,241,0.3)" : "var(--border)",
            background: "var(--bg-surface)",
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity select-none"
          >
            <span
              className="font-semibold text-sm leading-snug"
              style={{ color: "var(--text-primary)" }}
            >
              {faq.q}
            </span>
            <ChevronDown
              size={15}
              className={`shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
              style={{ color: "var(--text-muted)" }}
            />
          </button>
          {open === i && (
            <div className="px-5 pb-4">
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {faq.a}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
