import { ListSkeleton } from "@/components/coaching/ui";

// Instant skeleton while the attempt analysis resolves auth + resolves the
// question set + builds the result data.
export default function AttemptAnalysisLoading() {
  return <ListSkeleton rows={8} />;
}
