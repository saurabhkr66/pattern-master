import { ListSkeleton } from "@/components/coaching/ui";

// Instant skeleton while TestsPage resolves auth + loads coaching tests.
export default function TestsLoading() {
  return <ListSkeleton rows={8} />;
}
