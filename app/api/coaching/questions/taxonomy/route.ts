import { NextResponse } from "next/server";
import { withCoachingContext } from "@/lib/withCoachingContext";
import { getCoachingTaxonomy } from "@/lib/coachingTaxonomy";

// GET /api/coaching/questions/taxonomy — grade → subject → topic folder tree
// with counts. See lib/coachingTaxonomy for the assembly.
export const GET = withCoachingContext(async (_req, { coachingId }) => {
  const taxonomy = await getCoachingTaxonomy(coachingId);
  return NextResponse.json({ taxonomy });
});
