import { ListSkeleton } from "@/components/coaching/ui";

// Instant skeleton while the student profile resolves auth + loads history.
export default function StudentProfileLoading() {
  return <ListSkeleton rows={8} />;
}
