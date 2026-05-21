"use client";

import React from "react";

interface Option {
  v: string;
  label: string;
  icon?: React.ReactNode;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}

export default function Segmented({ value, onChange, options }: Props) {
  return (
    <div className="flex gap-0.5 p-0.5 bg-white/5 rounded-lg border border-[var(--border)]">
      {options.map(o => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all
              ${active ? 'bg-white/10 text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'}`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
