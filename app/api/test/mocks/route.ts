import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { unstable_cache } from "next/cache";

// Shape of a user's latest attempt on a mock, overlaid onto the shared list.
type SessionOverlay = {
  id: string;
  score: number;
  max_score: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  section_scores: unknown;
  created_at: Date;
};

// The mock template list is identical for every user (exam/branch static data),
// so it's cached ONCE per (exam, branch) — not per userId. Previously the cache
// key included userId and the query nested each user's sessions, so 50 mocks × N
// users created N separate cache entries (thrash + the static list recomputed per
// user). The per-user session state is now overlaid with one small query, exactly
// like app/api/patterns/[id]/questions/route.ts. Tag "mocks" is busted when a mock
// is added/edited (see app/actions/admin.ts, app/api/admin/revalidate-mocks).
const getMocksList = (examType: string, branch: string | null) =>
  unstable_cache(
    () =>
      prisma.mockTestTemplate.findMany({
        where: { exam_type: examType, branch, mode: "seeded" },
        select: {
          id: true,
          mock_number: true,
          title: true,
          total_questions: true,
          max_score: true,
          duration_secs: true,
        },
        orderBy: { mock_number: "asc" },
      }),
    ["mocks-list", examType, branch ?? "null"],
    { revalidate: 600, tags: ["mocks"] }
  )();

const getMockById = (mockId: string) =>
  unstable_cache(
    () =>
      prisma.mockTestTemplate.findUnique({
        where: { id: mockId },
        select: {
          id: true,
          mock_number: true,
          title: true,
          total_questions: true,
          max_score: true,
          duration_secs: true,
          exam_type: true,
          branch: true,
        },
      }),
    ["mock-single", mockId],
    { revalidate: 600, tags: ["mocks"] }
  )();

// Latest session per mock for one user across a set of mock ids — a single query
// on the (user_id, created_at) index. created_at DESC means the first row seen
// for each mock is its most recent attempt.
async function latestSessionsByMock(
  userId: string,
  mockIds: string[]
): Promise<Record<string, SessionOverlay>> {
  if (mockIds.length === 0) return {};
  const rows = await prisma.testSession.findMany({
    where: { user_id: userId, mock_test_id: { in: mockIds } },
    select: {
      id: true,
      mock_test_id: true,
      score: true,
      max_score: true,
      correct_count: true,
      wrong_count: true,
      skipped_count: true,
      section_scores: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
  });

  const byMock: Record<string, SessionOverlay> = {};
  for (const r of rows) {
    if (!r.mock_test_id || byMock[r.mock_test_id]) continue; // keep the latest only
    byMock[r.mock_test_id] = {
      id: r.id,
      score: r.score,
      max_score: r.max_score,
      correct_count: r.correct_count,
      wrong_count: r.wrong_count,
      skipped_count: r.skipped_count,
      section_scores: r.section_scores,
      created_at: r.created_at,
    };
  }
  return byMock;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const examType = searchParams.get("exam_type");
    const branch = searchParams.get("branch") ?? null;

    if (id) {
      const mock = await getMockById(id);
      if (!mock) return NextResponse.json({ error: "Mock test not found" }, { status: 404 });

      const session = (await latestSessionsByMock(userId, [id]))[id] ?? null;
      return NextResponse.json(
        { mock: { ...mock, session } },
        { headers: { "Cache-Control": "private, s-maxage=60, max-age=0" } }
      );
    }

    if (!examType) return NextResponse.json({ error: "exam_type or id required" }, { status: 400 });

    const list = await getMocksList(examType, branch);
    const sessionByMock = await latestSessionsByMock(userId, list.map((m) => m.id));

    return NextResponse.json(
      {
        mocks: list.map((m) => ({
          id: m.id,
          mock_number: m.mock_number,
          title: m.title,
          total_questions: m.total_questions,
          max_score: m.max_score,
          duration_secs: m.duration_secs,
          session: sessionByMock[m.id] ?? null,
        })),
      },
      { headers: { "Cache-Control": "private, s-maxage=60, max-age=0" } }
    );
  } catch (err) {
    console.error("Mocks list error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
