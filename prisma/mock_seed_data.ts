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
    "title": "GATE EE 2010",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2010.json"
  },
  {
    "title": "GATE EE 2011",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2011.json"
  },
  {
    "title": "GATE EE 2012",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2012.json"
  },
  {
    "title": "GATE EE 2013",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2013.json"
  },
  {
    "title": "GATE EE 2014 Set 1",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2014_set1.json"
  },
  {
    "title": "GATE EE 2014 Set 2",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2014_set2.json"
  },
  {
    "title": "GATE EE 2014 Set 3",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2014_set3.json"
  },
  {
    "title": "GATE EE 2015 Set 1",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2015_set1.json"
  },
  {
    "title": "GATE EE 2015 Set 2",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2015_set2.json"
  },
  {
    "title": "GATE EE 2016 Set 1",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2016_set1.json"
  },
  {
    "title": "GATE EE 2016 Set 2",
    "exam_type": "GATE",
    "branch": "EE",
    "file": "c:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\jeemains\\gate_ee_2016_set2.json"
  },
];
