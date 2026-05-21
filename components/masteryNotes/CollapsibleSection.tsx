"use client";

import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import { T } from "./types";

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
        <div className="font-mono text-[11px] text-[#ff8a3d] font-bold tracking-tight">0{n}</div>
        <div className="text-[16px] font-bold tracking-tight" style={{ fontFamily: T.serif }}>{title}</div>
        <div className="text-[11px] text-[var(--text-muted)] italic hidden sm:block" style={{ fontFamily: T.serif }}>· {sub}</div>
        <div className="flex-1" />
        {!isOpen && <span className="text-[10px] text-[var(--text-muted)] font-mono opacity-60">Expand</span>}
      </div>
      {isOpen && <div className="pl-6">{children}</div>}
    </div>
  );
}
