import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import katex from "katex";

export const dynamic = "force-dynamic";

function checkMath(text: string | null): { isBroken: boolean; errors: string[] } {
  if (!text) return { isBroken: false, errors: [] };
  
  const errors: string[] = [];
  let isBroken = false;

  // Normalization logic
  let t = text
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...');

  const patterns = [
    /\\\[([\s\S]*?)\\\]/g,
    /\\\(([\s\S]*?)\\\)/g,
    /\$\$([^$]+?)\$\$/g,
    /\$([^$\n]+?)\$/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(t)) !== null) {
      const math = match[1].trim();
      try {
        katex.renderToString(math, { throwOnError: true });
      } catch (e: any) {
        isBroken = true;
        errors.push(`Error in "${math}": ${e.message}`);
      }
    }
  }

  return { isBroken, errors };
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    const userEmail = dbUser?.email?.toLowerCase();
    const adminEmails = (process.env.ADMIN_EMAILS || "").toLowerCase().split(",");
    
    if (!userEmail || (!adminEmails.includes(userEmail) && userEmail !== "sauravkum4200@gmail.com")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Scan a limited set for the live report
    const limit = 200;
    
    const [subjectPyqs, pyqs, generated] = await Promise.all([
      prisma.subjectPYQ.findMany({ take: limit, include: { subject_pattern: true } }),
      prisma.pYQ.findMany({ take: limit, include: { pattern: true } }),
      prisma.generatedQuestion.findMany({ take: limit, include: { pattern: true } })
    ]);

    const results: any[] = [];

    const processSet = (set: any[], type: "PYQ" | "SubjectPYQ" | "GeneratedQuestion") => {
      for (const q of set) {
        const qCheck = checkMath(q.question_text);
        const eCheck = checkMath(q.explanation);
        
        let optionsBroken = false;
        const optionErrors: string[] = [];
        if (Array.isArray(q.options)) {
          for (const opt of q.options) {
            const oCheck = checkMath(opt);
            if (oCheck.isBroken) {
              optionsBroken = true;
              optionErrors.push(...oCheck.errors);
            }
          }
        }

        if (qCheck.isBroken || eCheck.isBroken || optionsBroken) {
          const reportKey = type === "GeneratedQuestion" ? "question" : (type === "SubjectPYQ" ? "subject_pyq" : "pyq");
          results.push({
            id: `auto-latex-${q.id}`,
            reason: "LaTeX Error",
            status: "pending",
            created_at: new Date(),
            user: { email: "LaTeX Validator" },
            details: [
              ...(qCheck.isBroken ? ["Question: " + qCheck.errors.join(", ")] : []),
              ...(eCheck.isBroken ? ["Explanation: " + eCheck.errors.join(", ")] : []),
              ...(optionsBroken ? ["Options: " + optionErrors.join(", ")] : [])
            ].join("\n"),
            [`${reportKey}_id`]: q.id,
            [reportKey]: q,
          });
        }
      }
    };

    processSet(subjectPyqs, "SubjectPYQ");
    processSet(pyqs, "PYQ");
    processSet(generated, "GeneratedQuestion");

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[SCAN_LATEX] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
