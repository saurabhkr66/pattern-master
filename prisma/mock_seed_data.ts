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
    "title": "GATE EE 2017 Set 1",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2017_set1.json"
  },
  {
    "title": "GATE EE 2017 Set 2",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2017_set2.json"
  },
  {
    "title": "GATE EE 2018",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2018.json"
  },
  {
    "title": "GATE EE 2019",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2019.json"
  },
  {
    "title": "GATE EE 2020",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2020.json"
  },
  {
    "title": "GATE EE 2021",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2021.json"
  },
  {
    "title": "GATE EE 2022",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2022.json"
  },
  {
    "title": "GATE EE 2023",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2023.json"
  },
  {
    "title": "GATE EE 2024",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2024.json"
  },
  {
    "title": "GATE EE 2025",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2025.json"
  },
]
