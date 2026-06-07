import { ListSkeleton } from "@/components/coaching/ui";

// Instant skeleton while StudentsPage resolves auth + loads students/batches.
export default function StudentsLoading() {
  return <ListSkeleton rows={10} />;
}
