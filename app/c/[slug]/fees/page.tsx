import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/studentAuth";
import { getCachedCoachingBySlug } from "@/lib/coachingCache";
import { getStudentFees, type StudentFeePlan } from "@/lib/coachingFeesData";
import type { FeeStatus } from "@/lib/coachingFees";
import StudentHeader from "@/components/coaching/StudentHeader";
import { Card, Pill, display, mono } from "@/components/coaching/ui";
import { ArrowLeft, IndianRupee, Receipt, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const METHOD_LABEL: Record<string, string> = { cash: "Cash", upi: "UPI", bank: "Bank transfer", other: "Other" };
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

function PlanStatusPill({ plan }: { plan: StudentFeePlan }) {
  if (plan.overdueAmount > 0) return <Pill tone="danger">Overdue</Pill>;
  const map: Record<FeeStatus, React.ReactNode> = {
    paid: <Pill tone="success">Paid</Pill>,
    partial: <Pill tone="amber">Partial</Pill>,
    pending: <Pill tone="slate">Pending</Pill>,
  };
  return map[plan.status];
}

export default async function StudentFeesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const coaching = await getCachedCoachingBySlug(slug);
  if (!coaching || !coaching.active) notFound();
  // Feature is off for this coaching → the page doesn't exist for students.
  if (!coaching.fees_visible_to_students) notFound();

  const student = await getCurrentStudent(coaching.id);
  if (!student) redirect(`/c/${slug}/login`);
  // Pending/rejected students don't get the fees view (mirrors the dashboard gate).
  if (student.status !== "approved") redirect(`/c/${slug}/dashboard`);

  const plans = await getStudentFees(coaching.id, student.id);

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#06060c" }}>
      <div
        className="pointer-events-none absolute right-0 top-[-150px] h-[380px] w-[600px]"
        style={{ background: "radial-gradient(60% 100% at 70% 0%, rgba(255,143,0,0.13), transparent 70%)" }}
      />
      <StudentHeader coachingName={coaching.name} studentName={student.name} slug={slug} />

      <main className="relative mx-auto max-w-4xl px-5 py-7 sm:px-12 sm:py-10">
        <Link
          href={`/c/${slug}/dashboard`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <h1 className="mt-4 flex items-center gap-2.5 text-2xl font-bold text-white sm:text-[32px]" style={{ fontFamily: display, letterSpacing: "-0.02em" }}>
          <IndianRupee className="h-6 w-6 text-amber-400" /> Fees
        </h1>
        <p className="mt-1.5 text-sm text-slate-400 sm:text-[15px]">Your fee plan and payment receipts.</p>

        {plans.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl" style={{ background: "rgba(255,255,255,0.025)" }}>
                <Receipt className="h-8 w-8 text-slate-500" strokeWidth={1.5} />
              </span>
              <p className="mt-5 text-[18px] font-bold text-white" style={{ fontFamily: display }}>
                No fee plan yet
              </p>
              <p className="mt-1.5 max-w-[34ch] text-sm text-slate-500">
                When your tutor sets up your fees, they’ll show up here.
              </p>
            </div>
          </Card>
        ) : (
          <div className="mt-8 space-y-8">
            {plans.map((plan) => (
              <section key={plan.planId}>
                <Card glow>
                  {/* Plan header + totals */}
                  <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="truncate text-lg font-bold text-white" style={{ fontFamily: display }}>
                        {plan.title}
                      </h2>
                      <PlanStatusPill plan={plan} />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3">
                      <Amount label="Total" value={inr(plan.total)} color="#94a3b8" />
                      <Amount label="Paid" value={inr(plan.paid)} color="#22c55e" />
                      <Amount label="Due" value={inr(plan.due)} color={plan.due > 0 ? "#f59e0b" : "#22c55e"} />
                    </div>
                    {plan.due > 0 && plan.nextDueDate && (
                      <p className="mt-3 text-xs text-slate-400" style={{ fontFamily: mono }}>
                        {plan.overdueAmount > 0 ? (
                          <span className="text-red-400">{inr(plan.overdueAmount)} overdue</span>
                        ) : (
                          <>Next due {fmtDate(plan.nextDueDate)}</>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Installment schedule */}
                  {plan.installments.length > 0 && (
                    <div className="px-5 py-4 sm:px-6">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Schedule</div>
                      <div className="space-y-2">
                        {plan.installments.map((inst) => (
                          <div key={inst.id} className="flex items-center justify-between gap-3 text-sm">
                            <div className="min-w-0">
                              <span className="text-slate-200">{inst.label}</span>
                              <span className="ml-2 text-xs text-slate-500" style={{ fontFamily: mono }}>
                                due {fmtDate(inst.due_date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="text-slate-300" style={{ fontFamily: mono }}>
                                {inr(inst.paid)} / {inr(inst.amount)}
                              </span>
                              {inst.status === "paid" ? (
                                <Pill tone="success">Paid</Pill>
                              ) : inst.overdue ? (
                                <Pill tone="danger">Overdue</Pill>
                              ) : inst.status === "partial" ? (
                                <Pill tone="amber">Partial</Pill>
                              ) : (
                                <Pill tone="slate">Pending</Pill>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Payment history → receipts */}
                {plan.payments.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-3 text-sm font-bold text-white" style={{ fontFamily: display }}>
                      Receipts
                    </div>
                    <div className="space-y-2.5">
                      {plan.payments.map((p) => (
                        <Link key={p.id} href={`/c/${slug}/fees/receipt/${p.id}`} className="block">
                          <Card className="transition-transform duration-200 hover:-translate-y-0.5">
                            <div className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: "rgba(255,143,0,0.12)", border: "1px solid rgba(255,143,0,0.25)" }}>
                                <Receipt className="h-5 w-5 text-amber-400" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                                  <span>{inr(p.amount)}</span>
                                  <span className="text-xs font-normal text-slate-500">· {METHOD_LABEL[p.method] ?? p.method}</span>
                                </div>
                                <div className="mt-0.5 text-xs text-slate-400" style={{ fontFamily: mono }}>
                                  #{String(p.receiptNo).padStart(5, "0")} · {fmtDate(p.paidAt)} · {p.towards}
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Amount({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl px-3.5 py-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderLeft: `3px solid ${color}` }}>
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-extrabold leading-none text-white" style={{ fontFamily: display }}>
        {value}
      </div>
    </div>
  );
}
