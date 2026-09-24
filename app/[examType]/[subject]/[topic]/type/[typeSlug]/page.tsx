// app/[examType]/[subject]/[topic]/type/[typeSlug]/page.tsx
//
// One question-type (reviewed SubPattern) inside a topic: its method + trick and
// every PYQ of that type, newest first. Linked from the topic page's
// "Question types" box and from each question's type chip.
//
// URL example: /jee-main/physics/rotational-motion/type/rolling-on-incline
//
// ISR like the topic page; admin edits reach here via revalidateTag("patterns").

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { parseExamSlug } from "@/lib/seo";
import { fetchSubPatternPage, combineQuestions, unslug } from "../../_lib/dataFetch";
import QuestionList from "../../_components/QuestionList";
import SignupCTA from "../../_components/SignupCTA";

const BASE = "https://battleexam.com";

interface PageParams {
  examType: string;
  subject: string;
  topic: string;
  typeSlug: string;
}

// 30 days — see the note in ../../page.tsx.
export const revalidate = 2592000;
export const dynamicParams = true;

// See ../../page.tsx — keeps the route classified as ISR.
export async function generateStaticParams(): Promise<PageParams[]> {
  return [];
}

async function load(params: PageParams) {
  const exam = parseExamSlug(params.examType);
  if (!exam) return null;
  const data = await fetchSubPatternPage(exam, unslug(params.subject), params.topic, params.typeSlug);
  return data ? { exam, ...data } : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const p = await params;
  // The 404 must be decided here, before the body streams — see ../../page.tsx.
  const data = await load(p);
  if (!data) notFound();

  const { exam, type, pyqs, labels } = data;
  const years = pyqs.map((q) => q.year);
  const span = `${Math.min(...years)}–${Math.max(...years)}`;
  const canonical = `${BASE}/${p.examType}/${p.subject}/${p.topic}/type/${p.typeSlug}`;
  const title = `${type.name} – ${labels.topicName} ${exam.examLabel} PYQs (${pyqs.length} Questions)`;
  const description = `All ${pyqs.length} ${exam.fullLabel} previous-year questions of the "${type.name}" type in ${labels.topicName} (${span}), with solutions. Method: ${type.method}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: "BattleExam",
      locale: "en_IN",
    },
  };
}

export default async function SubPatternPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const p = await params;
  const data = await load(p);
  if (!data) notFound();

  const { exam, type, pyqs, labels, patternId } = data;
  const topicPath = `/${p.examType}/${p.subject}/${p.topic}`;
  const years = [...new Set(pyqs.map((q) => q.year))].sort((a, b) => a - b);

  const chip = new Map([[type.id, { name: type.name, slug: type.slug, count: pyqs.length }]]);
  const questions = combineQuestions(pyqs as never, [] as never, chip);

  const practiceHref = `/practice?${new URLSearchParams({
    exam: exam.examLabel,
    ...(exam.branch ? { branch: exam.branch } : {}),
    subject: labels.subject,
    patternId,
  }).toString()}`;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <nav
        className="text-xs font-medium mb-6 flex items-center gap-2 flex-wrap"
        style={{ color: "var(--text-secondary)" }}
      >
        <Link href="/" className="hover:underline">Home</Link>
        <span>›</span>
        <Link href={`/${p.examType}/${p.subject}`} className="hover:underline">{labels.subject}</Link>
        <span>›</span>
        <Link href={topicPath} className="hover:underline">{labels.topicName}</Link>
        <span>›</span>
        <span style={{ color: "var(--text-primary)" }}>{type.name}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
          {`${exam.fullLabel} · ${labels.topicName} · Question type`}
        </p>
        <h1 className="text-3xl md:text-4xl font-black mb-3" style={{ color: "var(--text-primary)" }}>
          {`${type.name} – ${exam.examLabel} PYQs`}
        </h1>
        <p className="text-sm font-bold text-orange-400 mb-4">
          {`Asked ${pyqs.length} times in ${exam.examLabel} · ${years.join(", ")}`}
        </p>
        <div
          className="p-4 rounded-2xl border space-y-2"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>
            <span className="font-bold">How to solve: </span>
            {type.method}
          </p>
          {type.trick && (
            <p className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
              <span className="font-bold font-sans">Trick: </span>
              {type.trick}
            </p>
          )}
        </div>
      </header>

      <QuestionList
        pageQuestions={questions}
        start={0}
        examLabel={exam.examLabel}
        practiceHref={practiceHref}
      />

      <Link
        href={topicPath}
        className="mt-10 mb-6 inline-block text-sm font-bold hover:underline"
        style={{ color: "var(--accent)" }}
      >
        {`← All question types in ${labels.topicName}`}
      </Link>

      <SignupCTA topicLabel={labels.topicName} />
    </div>
  );
}
