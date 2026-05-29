import { parseExamSlug } from "../lib/seo";
import { fetchPattern, unslug } from "../app/[examType]/[subject]/[topic]/_lib/dataFetch";

async function main() {
  const examType = "gate-ee", subject = "electrical-machines", topic = "dc-machines";
  const exam = parseExamSlug(examType)!;
  const subjectLabel = unslug(subject);
  console.log("exam:", exam.examType, "branch:", exam.branch, "subjectLabel:", subjectLabel);
  try {
    const pattern = await fetchPattern(exam, subjectLabel, topic, 1, 20);
    console.log("fetchPattern result:", pattern ? `FOUND id=${pattern.id}, totalQ=${pattern.totalQ}` : "NULL → would 404");
  } catch (e) {
    console.log("fetchPattern THREW:", (e as Error).message);
  }
}
main().catch(console.error).finally(() => process.exit(0));
