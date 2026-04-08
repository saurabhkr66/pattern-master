"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/api/onboarding/route";
import { 
  Check, 
  ChevronRight, 
  GraduationCap, 
  Calendar, 
  Target, 
  BookOpen,
  ArrowLeft
} from "lucide-react";

type OnboardingData = {
  exam_type: string;
  branch: string;
  exam_date: string;
  target_score: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    exam_type: "",
    branch: "",
    exam_date: "",
    target_score: "",
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 3;

  const updateField = (field: keyof OnboardingData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleComplete = async () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await completeOnboarding(formData);
        if (result?.error) {
          setError(result.error);
        } else {
          router.push("/dashboard");
        }
      } catch (err) {
        setError("An unexpected error occurred. Please try again.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
        
        {/* Header & Progress */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-6">
            {step > 1 ? (
              <button 
                onClick={() => setStep(step - 1)} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
                disabled={isPending}
              >
                <ArrowLeft size={20} />
              </button>
            ) : <div className="w-5" />}
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              Step {step} of {totalSteps}
            </span>
            <div className="w-5" />
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 transition-all duration-500 ease-out" 
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl font-bold">
            {error}
          </div>
        )}

        {/* Step 1: Goal & Branch */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Let's set your goal</h1>
              <p className="text-slate-500 mt-2">Which exam and branch are you focusing on?</p>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <GraduationCap size={16} className="text-indigo-600" /> Target Exam
              </label>
              <div className="grid grid-cols-2 gap-3">
                {["GATE", "ESE", "ISRO", "BARC"].map((exam) => (
                  <button
                    key={exam}
                    onClick={() => updateField("exam_type", exam)}
                    className={`py-3 rounded-xl border-2 font-medium transition-all ${
                      formData.exam_type === exam 
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm" 
                      : "border-slate-100 text-slate-500 hover:border-slate-200"
                    }`}
                  >
                    {exam}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <BookOpen size={16} className="text-indigo-600" /> Branch / Stream
              </label>
              <select 
                value={formData.branch}
                onChange={(e) => updateField("branch", e.target.value)}
                className="w-full p-4 bg-slate-50 border-none rounded-xl text-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none appearance-none"
              >
                <option value="">Select your branch</option>
                <option value="CSE">Computer Science</option>
                <option value="IT">Information Technology</option>
                <option value="ECE">Electronics & Comm.</option>
                <option value="ME">Mechanical Engineering</option>
              </select>
            </div>

            <button
              disabled={!formData.exam_type || !formData.branch}
              onClick={() => setStep(2)}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-black disabled:opacity-20 transition-all flex items-center justify-center gap-2"
            >
              Continue <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Step 2: Deadline */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">The Deadline</h1>
              <p className="text-slate-500 mt-2">When is your exam scheduled? We'll build your schedule around it.</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="date"
                  value={formData.exam_date}
                  onChange={(e) => updateField("exam_date", e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>
            </div>

            <button
              disabled={!formData.exam_date}
              onClick={() => setStep(3)}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-black disabled:opacity-20 transition-all flex items-center justify-center gap-2"
            >
              Almost there <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Step 3: Target Score */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Set your Target</h1>
              <p className="text-slate-500 mt-2">What is your dream score for {formData.exam_type}?</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="number"
                  placeholder="e.g. 850 (Gate Score) or 85%"
                  value={formData.target_score}
                  onChange={(e) => updateField("target_score", e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Tip:</strong> Setting a realistic but challenging target score helps our AI prioritize tougher questions for you.
                </p>
              </div>
            </div>

            <button
              onClick={handleComplete}
              disabled={isPending || !formData.target_score}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 disabled:bg-indigo-400 transition-all flex items-center justify-center gap-2"
            >
              {isPending ? "Saving..." : "Start My Journey"}
              {!isPending && <Check size={18} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}