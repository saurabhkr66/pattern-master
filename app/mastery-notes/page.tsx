import MasteryNotes from "@/components/MasteryNotes";

export default function MasteryNotesPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-black mb-4">Mastery Notes</h1>
        <p className="text-[var(--text-secondary)] text-lg max-w-2xl">
          A premium, high-density study component designed for GATE preparation. 
          Blends pattern-based learning with deep-dive technical notes.
        </p>
      </div>

      <div className="border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl">
        <MasteryNotes />
      </div>

      <div className="mt-12 p-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface-2)]">
        <h2 className="text-xl font-bold mb-4">Implementation Notes</h2>
        <ul className="space-y-3 text-[var(--text-secondary)] text-sm">
          <li className="flex gap-2">
            <span className="text-[#ff8a3d] font-bold">01</span>
            <span>Mapped original hex tokens to <code>var(--bg-base)</code>, <code>var(--text-primary)</code>, and <code>var(--border)</code> for automatic theme support.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#ff8a3d] font-bold">02</span>
            <span>Replaced custom SVG paths with <code>lucide-react</code> icons for consistency while preserving the premium feel.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#ff8a3d] font-bold">03</span>
            <span>Added responsive grid layouts so the sidebar stacks on mobile devices.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#ff8a3d] font-bold">04</span>
            <span>Used <code>"use client"</code> and TypeScript interfaces for robust Next.js integration.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
