import { prisma } from "@/lib/prisma";

async function main() {
  const rows = await prisma.pattern.findMany({
    select: { exam_slug: true, branch_slug: true },
    distinct: ["exam_slug", "branch_slug"],
    orderBy: [{ exam_slug: "asc" }, { branch_slug: "asc" }],
  });

  rows.forEach((r) => {
    const slug =
      r.branch_slug && r.branch_slug !== "common"
        ? `${r.exam_slug}-${r.branch_slug}`
        : r.exam_slug;
    console.log(slug);
  });

  await prisma.$disconnect();
}

main();
