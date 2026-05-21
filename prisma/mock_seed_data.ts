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
    title: "GATE PI 2011",
    exam_type: "GATE",
    branch: "PI",
    file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scrapers\\prepp-gate\\output\\gate-pi-question-paper-13-feb-2011-shift-1-69833866fb85db4f1a79ada7.json"
  },
  {
    title: "GATE PI 2012",
    exam_type: "GATE",
    branch: "PI",
    file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scrapers\\prepp-gate\\output\\gate-pi-question-paper-12-feb-2012-shift-1-697fa6633fb1e425fe2b7327.json"
  },
  {
    title: "GATE PI 2013",
    exam_type: "GATE",
    branch: "PI",
    file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scrapers\\prepp-gate\\output\\gate-pi-question-paper-10-feb-2013-shift-1-697de8227c2d2ec5d3f956a4.json"
  },
  {
    title: "GATE PI 2014",
    exam_type: "GATE",
    branch: "PI",
    file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scrapers\\prepp-gate\\output\\gate-pi-question-paper-02-feb-2014-shift-2-663361700368feeaa57a3ed5.json"
  },
  {
    title: "GATE PI 2015",
    exam_type: "GATE",
    branch: "PI",
    file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scrapers\\prepp-gate\\output\\gate-pi-question-paper-01-feb-2015-shift-2-663361640368feeaa57a3cc4.json"
  },
  {
    title: "GATE PI 2016",
    exam_type: "GATE",
    branch: "PI",
    file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scrapers\\prepp-gate\\output\\gate-pi-question-paper-07-feb-2016-shift-1-663361590368feeaa57a3b11.json"
  },
  {
    title: "GATE PI 2017",
    exam_type: "GATE",
    branch: "PI",
    file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scrapers\\prepp-gate\\output\\gate-pi-question-paper-05-feb-2017-shift-1-663361490368feeaa57a38bc.json"
  },
  {
    title: "GATE PI 2018",
    exam_type: "GATE",
    branch: "PI",
    file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scrapers\\prepp-gate\\output\\gate-pi-question-paper-03-feb-2018-shift-2-6633613c0368feeaa57a36a0.json"
  },
  {
    title: "GATE PI 2019",
    exam_type: "GATE",
    branch: "PI",
    file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scrapers\\prepp-gate\\output\\gate-pi-question-paper-03-feb-2019-shift-2-663361350368feeaa57a34a8.json"
  },
  {
    title: "GATE PI 2020",
    exam_type: "GATE",
    branch: "PI",
    file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scrapers\\prepp-gate\\output\\gate-pi-question-paper-01-feb-2020-shift-2-6633612e0368feeaa57a32e3.json"
  },
  {
    title: "GATE PI 2021",
    exam_type: "GATE",
    branch: "PI",
    file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scrapers\\prepp-gate\\output\\gate-pi-question-paper-07-feb-2021-shift-2-6633611b0368feeaa57a3059.json"
  },
  {
    title: "GATE PI 2022",
    exam_type: "GATE",
    branch: "PI",
    file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scrapers\\prepp-gate\\output\\gate-pi-question-paper-06-feb-2022-shift-2-6960ac2c75c14676614b13d6.json"
  },
  {
    title: "GATE PI 2023",
    exam_type: "GATE",
    branch: "PI",
    file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scrapers\\prepp-gate\\output\\gate-pi-question-paper-11-feb-2023-shift-2-695ed066f9fe3b539d206169.json"
  },
  {
    title: "GATE PI 2024",
    exam_type: "GATE",
    branch: "PI",
    file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scrapers\\prepp-gate\\output\\gate-pi-question-paper-03-feb-2024-shift-1-69521d3ff4967d4f10983321.json"
  },
  {
    title: "GATE PI 2026",
    exam_type: "GATE",
    branch: "PI",
    file: "c:\\Users\\saura\\Desktop\\projects\\pattern-master\\scrapers\\prepp-gate\\output\\gate-pi-question-paper-14-feb-2026-shift-1-69ca17775fb0637c265c52ca.json"
  },
];
