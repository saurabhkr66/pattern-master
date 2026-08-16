import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCoachingActor } from "@/lib/coachingAuth";
import { randomCode } from "@/lib/shortCode";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function requireSuperAdmin() {
  const actor = await getCoachingActor();
  return actor?.isSuperAdmin ? actor : null;
}

// GET /api/admin/coachings — list all coachings with counts.
export async function GET() {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const coachings = await prisma.coaching.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      owner_email: true,
      join_code: true,
      price_per_test: true,
      active: true,
      created_at: true,
      _count: { select: { students: true, tests: true } },
    },
    orderBy: { created_at: "desc" },
  });
  return NextResponse.json({ coachings });
}

// POST /api/admin/coachings — create a coaching.
// Body: { name, city?, ownerEmail, examTypes?, billingMode?, pricePerTest?, monthlyFee? }
export async function POST(req: NextRequest) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { name, city, ownerEmail, examTypes, billingMode, pricePerTest, monthlyFee } = await req.json();
  const mode = billingMode === "monthly" ? "monthly" : "per_test";

  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!ownerEmail?.trim()) {
    return NextResponse.json({ error: "owner email is required" }, { status: 400 });
  }

  // Unique slug — append a short suffix on collision.
  let slug = slugify(name);
  if (!slug) slug = `coaching-${randomCode(4).toLowerCase()}`;
  if (await prisma.coaching.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${slug}-${randomCode(4).toLowerCase()}`;
  }

  // Unique join code.
  let joinCode = randomCode();
  while (await prisma.coaching.findUnique({ where: { join_code: joinCode }, select: { id: true } })) {
    joinCode = randomCode();
  }

  const coaching = await prisma.coaching.create({
    data: {
      name: name.trim(),
      slug,
      city: city?.trim() || null,
      owner_email: ownerEmail.trim().toLowerCase(),
      exam_types: Array.isArray(examTypes) ? examTypes : [],
      join_code: joinCode,
      billing_mode: mode,
      price_per_test: Number.isFinite(Number(pricePerTest)) ? Number(pricePerTest) : 15,
      monthly_fee: Number.isFinite(Number(monthlyFee)) ? Number(monthlyFee) : 0,
    },
    select: { id: true, slug: true, join_code: true },
  });

  return NextResponse.json({ ok: true, coaching });
}
