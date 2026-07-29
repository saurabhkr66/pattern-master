"use client";

import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import MathInline from "@/components/ui/MathInline";
import { T } from "./types";
import { htmlToMarkdown } from "./mathText";

interface Props {
  id: string;
  n: number;
  title: string;
  sub: string;
  open?: boolean;
  children: React.ReactNode;
}

export default function CollapsibleSection({ id, n, title, sub, open = false, children }: Props) {
  const [isOpen, setIsOpen] = useState(open);
  return (
    <div id={`sec-${id}`} className="mb-4 scroll-mt-24">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-baseline gap-2.5 py-2 cursor-pointer transition-all border-b border-transparent
          ${!isOpen ? 'border-[var(--border)]' : 'mb-3'}`}
      >
        <ChevronRight
          size={12}
          className={`transition-transform duration-200 mt-1 flex-shrink-0 text-[var(--text-muted)]
            ${isOpen ? 'rotate-90' : ''}`}
        />
        <div className="font-mono text-[11px] text-[#ff8a3d] font-bold tracking-tight">{String(n).padStart(2, '0')}</div>
        <div className="text-[16px] font-bold tracking-tight" style={{ fontFamily: T.serif }}>
          <MathInline content={htmlToMarkdown(title)} />
        </div>
        {!!sub?.trim() && (
          <div className="text-[11px] text-[var(--text-muted)] italic hidden sm:block" style={{ fontFamily: T.serif }}>
            · <MathInline content={htmlToMarkdown(sub)} />
          </div>
        )}
        <div className="flex-1" />
        {!isOpen && <span className="text-[10px] text-[var(--text-muted)] font-mono opacity-60">Expand</span>}
      </div>
      {isOpen && <div className="pl-6">{children}</div>}
    </div>
  );
}
