import { ListSkeleton } from "@/components/coaching/ui";

// Instant skeleton while QuestionsPage resolves auth + loads the question bank.
export default function QuestionsLoading() {
  return <ListSkeleton rows={10} />;
}
