// components/patterns/ConfidenceBadge.tsx
export default function ConfidenceBadge({ accuracy }: { accuracy: number }) {
  let color = "bg-gray-100 text-gray-600";
  let label = "Unstarted";

  if (accuracy > 0 && accuracy < 50) {
    color = "bg-red-100 text-red-700";
    label = "Struggling";
  } else if (accuracy >= 50 && accuracy < 80) {
    color = "bg-yellow-100 text-yellow-700";
    label = "Developing";
  } else if (accuracy >= 80) {
    color = "bg-green-100 text-green-700";
    label = "Confident";
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${color}`}>
      {label}
    </span >
  );
}