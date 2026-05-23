import { type ExamType } from '../lib/examConfigs';

export interface PaperConfig {
  title: string;
  exam_type: string;
  branch: string | null;
  file?: string;
  sections?: {
    name: string;
    file: string;
  }[];
}

export const PAPER_CONFIGS: PaperConfig[] = [
 
 
  {
    title: "GATE CSE 2026 Shift 1",
    exam_type: "GATE",
    branch: "CSE",
    file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate-cs-1-question-paper-08-feb-2026-shift-1-69c640b57782ba3e456826d5.json"
  },
];
