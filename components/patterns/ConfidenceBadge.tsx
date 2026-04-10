// components/patterns/ConfidenceBadge.tsx
export default function ConfidenceBadge({ accuracy }: { accuracy: number }) {
  if (accuracy === 0) {
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-gray-100 text-gray-400">
        Unstarted
      </span>
    );
  }
  if (accuracy < 50) {
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-red-100 text-red-600">
        Struggling
      </span>
    );
  }
  if (accuracy < 80) {
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-100 text-amber-700">
        Developing
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-100 text-emerald-700">
      Confident
    </span>
  );
}
