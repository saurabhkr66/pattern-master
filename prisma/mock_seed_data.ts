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
    title: "NEET 2024",
    exam_type: "NEET",
    branch: null,
    sections: [
      { name: "Physics",   file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scratch\\neet\\neet-ug-question-paper-05-may-2024-68779e355991c463c6687c45_physics.json" },
      { name: "Chemistry", file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scratch\\neet\\neet-ug-question-paper-05-may-2024-68779e355991c463c6687c45_chemistry.json" },
      { name: "Botany",    file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scratch\\neet\\neet-ug-question-paper-05-may-2024-68779e355991c463c6687c45_botany.json" },
      { name: "Zoology",   file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scratch\\neet\\neet-ug-question-paper-05-may-2024-68779e355991c463c6687c45_zoology.json" },
    ],
  },

];
