import { type ExamType } from '../lib/examConfigs';

export interface PaperConfig {
  title: string;
  exam_type: ExamType;
  branch: string | null;
  file?: string; 
  sections?: {
    name: string;
    file: string;
  }[];
}

export const PAPER_CONFIGS: PaperConfig[] = [
  {
    "title": "1 Feb 2024 Shift 1",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_1_feb_2024_shift_1_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_1_feb_2024_shift_1_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_1_feb_2024_shift_1_part3.json"
      }
    ]
  },
  {
    "title": "1 Feb 2024 Shift 2",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_1_feb_2024_shift_2_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_1_feb_2024_shift_2_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_1_feb_2024_shift_2_part3.json"
      }
    ]
  },
  {
    "title": "27 Jan 2024 Shift 1",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_27_jan_2024_shift_1_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_27_jan_2024_shift_1_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_27_jan_2024_shift_1_part3.json"
      }
    ]
  },
  {
    "title": "27 Jan 2024 Shift 2",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_27_jan_2024_shift_2_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_27_jan_2024_shift_2_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_27_jan_2024_shift_2_part3.json"
      }
    ]
  },
  {
    "title": "29 Jan 2024 Shift 1",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_29_jan_2024_shift_1_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_29_jan_2024_shift_1_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_29_jan_2024_shift_1_part3.json"
      }
    ]
  },
  {
    "title": "29 Jan 2024 Shift 2",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_29_jan_2024_shift_2_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_29_jan_2024_shift_2_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_29_jan_2024_shift_2_part3.json"
      }
    ]
  },
  {
    "title": "30 Jan 2024 Shift 1",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_30_jan_2024_shift_1_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_30_jan_2024_shift_1_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_30_jan_2024_shift_1_part3.json"
      }
    ]
  },
  {
    "title": "30 Jan 2024 Shift 2",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_30_jan_2024_shift_2_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_30_jan_2024_shift_2_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_30_jan_2024_shift_2_part3.json"
      }
    ]
  },
  {
    "title": "31 Jan 2024 Shift 1",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_31_jan_2024_shift_1_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_31_jan_2024_shift_1_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_31_jan_2024_shift_1_part3.json"
      }
    ]
  },
  {
    "title": "31 Jan 2024 Shift 2",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_31_jan_2024_shift_2_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_31_jan_2024_shift_2_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_31_jan_2024_shift_2_part3.json"
      }
    ]
  },
  {
    "title": "4 Apr 2024 Shift 1",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_4_apr_2024_shift_1_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_4_apr_2024_shift_1_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_4_apr_2024_shift_1_part3.json"
      }
    ]
  },
  {
    "title": "4 Apr 2024 Shift 2",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_4_apr_2024_shift_2_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_4_apr_2024_shift_2_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_4_apr_2024_shift_2_part3.json"
      }
    ]
  },
  {
    "title": "5 Apr 2024 Shift 1",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_5_apr_2024_shift_1_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_5_apr_2024_shift_1_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_5_apr_2024_shift_1_part3.json"
      }
    ]
  },
  {
    "title": "5 Apr 2024 Shift 2",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_5_apr_2024_shift_2_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_5_apr_2024_shift_2_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_5_apr_2024_shift_2_part3.json"
      }
    ]
  },
  {
    "title": "6 Apr 2024 Shift 1",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_6_apr_2024_shift_1_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_6_apr_2024_shift_1_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_6_apr_2024_shift_1_part3.json"
      }
    ]
  },
  {
    "title": "6 Apr 2024 Shift 2",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_6_apr_2024_shift_2_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_6_apr_2024_shift_2_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_6_apr_2024_shift_2_part3.json"
      }
    ]
  },
  {
    "title": "8 Apr 2024 Shift 1",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_8_apr_2024_shift_1_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_8_apr_2024_shift_1_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_8_apr_2024_shift_1_part3.json"
      }
    ]
  },
  {
    "title": "8 Apr 2024 Shift 2",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_8_apr_2024_shift_2_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_8_apr_2024_shift_2_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_8_apr_2024_shift_2_part3.json"
      }
    ]
  },
  {
    "title": "9 Apr 2024 Shift 1",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_9_apr_2024_shift_1_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_9_apr_2024_shift_1_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_9_apr_2024_shift_1_part3.json"
      }
    ]
  },
  {
    "title": "9 Apr 2024 Shift 2",
    "exam_type": "JEE_MAIN" as ExamType,
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_9_apr_2024_shift_2_part1.json"
      },
      {
        "name": "Chemistry",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_9_apr_2024_shift_2_part2.json"
      },
      {
        "name": "Mathematics",
        "file": "../../exam-scraper/data/output/cracku/jee_mains_9_apr_2024_shift_2_part3.json"
      }
    ]
  }
];
