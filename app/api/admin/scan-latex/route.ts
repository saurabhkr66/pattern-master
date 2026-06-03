import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/admin";
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

    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();

    if (!isAdmin(userEmail)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Scan a limited set for the live report
    const limit = 200;
    
    // Only pull the fields the LaTeX checker touches (question_text,
    // explanation, options) and a minimal pattern reference for context.
    // Previously used `include` which downloaded every column — Hindi
    // translations, images, and the heavy pattern.atomic_logic/short_notes
    // text columns — ~5–10 MB per scan.
    const scanSelect = {
      id: true,
      question_text: true,
      explanation: true,
      options: true,
    } as const;

    const [pyqs, generated] = await Promise.all([
      prisma.pYQ.findMany({
        take: limit,
        select: {
          ...scanSelect,
          pattern: { select: { subject: true, topic_name: true } },
        },
      }),
      prisma.generatedQuestion.findMany({
        take: limit,
        select: {
          ...scanSelect,
          pattern: { select: { subject: true, topic_name: true } },
        },
      }),
    ]);

    const results: any[] = [];

    const processSet = (set: any[], type: "PYQ" | "GeneratedQuestion") => {
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
          const reportKey = type === "GeneratedQuestion" ? "question" : "pyq";
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

    processSet(pyqs, "PYQ");
    processSet(generated, "GeneratedQuestion");

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[SCAN_LATEX] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
