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
    "title": "NEET 2014",
    "exam_type": "NEET",
    "branch": null,
    "sections": [
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2014\\neet_bio\\biology\\neet_bio_biology.json"
      },
      {
        "name": "Chemistry",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2014\\neet_phy_chem\\chemistry\\neet_phy_chem_chemistry.json"
      },
      {
        "name": "Physics",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2014\\neet_phy_chem\\physics\\neet_phy_chem_physics.json"
      }
    ]
  },
  {
    "title": "NEET 2015",
    "exam_type": "NEET",
    "branch": null,
    "sections": [
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2015\\neet_bio\\biology\\neet_bio_biology.json"
      },
      {
        "name": "Chemistry",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2015\\neet_phy_chem\\chemistry\\neet_phy_chem_chemistry.json"
      },
      {
        "name": "Physics",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2015\\neet_phy_chem\\physics\\neet_phy_chem_physics.json"
      }
    ]
  },
  {
    "title": "NEET 2015 Cancelled",
    "exam_type": "NEET",
    "branch": null,
    "sections": [
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2015\\neet_bio_cancel\\biology\\neet_bio_cancel_biology.json"
      },
      {
        "name": "Chemistry",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2015\\neet_phy_chem_cancel\\chemistry\\neet_phy_chem_cancel_chemistry.json"
      },
      {
        "name": "Physics",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2015\\neet_phy_chem_cancel\\physics\\neet_phy_chem_cancel_physics.json"
      }
    ]
  },
  {
    "title": "NEET 2016 Phase 1",
    "exam_type": "NEET",
    "branch": null,
    "sections": [
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2016\\neet_bio_1\\biology\\neet_bio_1_biology.json"
      },
      {
        "name": "Chemistry",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2016\\neet_phy_chem_1\\chemistry\\neet_phy_chem_1_chemistry.json"
      },
      {
        "name": "Physics",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2016\\neet_phy_chem_1\\physics\\neet_phy_chem_1_physics.json"
      }
    ]
  },
  {
    "title": "NEET 2016 Phase 2",
    "exam_type": "NEET",
    "branch": null,
    "sections": [
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2016\\neet_bio_2\\biology\\neet_bio_2_biology.json"
      },
      {
        "name": "Chemistry",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2016\\neet_phy_chem_2\\chemistry\\neet_phy_chem_2_chemistry.json"
      },
      {
        "name": "Physics",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2016\\neet_phy_chem_2\\physics\\neet_phy_chem_2_physics.json"
      }
    ]
  },
  {
    "title": "NEET 2017",
    "exam_type": "NEET",
    "branch": null,
    "sections": [
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2017\\neet_bio\\biology\\neet_bio_biology.json"
      },
      {
        "name": "Chemistry",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2017\\neet_phy_chem\\chemistry\\neet_phy_chem_chemistry.json"
      },
      {
        "name": "Physics",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2017\\neet_phy_chem\\physics\\neet_phy_chem_physics.json"
      }
    ]
  },
  {
    "title": "NEET 2018",
    "exam_type": "NEET",
    "branch": null,
    "sections": [
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2018\\neet_bio\\biology\\neet_bio_biology.json"
      },
      {
        "name": "Chemistry",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2018\\neet_phy_chem\\chemistry\\neet_phy_chem_chemistry.json"
      },
      {
        "name": "Physics",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2018\\neet_phy_chem\\physics\\neet_phy_chem_physics.json"
      }
    ]
  },
  {
    "title": "NEET 2019",
    "exam_type": "NEET",
    "branch": null,
    "sections": [
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2019\\neet_bio\\biology\\neet_bio_biology.json"
      },
      {
        "name": "Chemistry",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2019\\neet_phy_chem\\chemistry\\neet_phy_chem_chemistry.json"
      },
      {
        "name": "Physics",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2019\\neet_phy_chem\\physics\\neet_phy_chem_physics.json"
      }
    ]
  },
  {
    "title": "NEET 2019 Odisha",
    "exam_type": "NEET",
    "branch": null,
    "sections": [
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2019\\neet_bio_od\\biology\\neet_bio_od_biology.json"
      },
      {
        "name": "Chemistry",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2019\\neet_phy_chem_od\\chemistry\\neet_phy_chem_od_chemistry.json"
      },
      {
        "name": "Physics",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2019\\neet_phy_chem_od\\physics\\neet_phy_chem_od_physics.json"
      }
    ]
  },
  {
    "title": "NEET 2020",
    "exam_type": "NEET",
    "branch": null,
    "sections": [
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2020\\neet_bio\\biology\\neet_bio_biology.json"
      },
      {
        "name": "Chemistry",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2020\\neet_phy_chem\\chemistry\\neet_phy_chem_chemistry.json"
      },
      {
        "name": "Physics",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2020\\neet_phy_chem\\physics\\neet_phy_chem_physics.json"
      }
    ]
  },
  {
    "title": "NEET 2021",
    "exam_type": "NEET",
    "branch": null,
    "sections": [
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2021\\neet_bio\\biology\\neet_bio_biology.json"
      },
      {
        "name": "Chemistry",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2021\\neet_phy_chem\\chemistry\\neet_phy_chem_chemistry.json"
      },
      {
        "name": "Physics",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2021\\neet_phy_chem\\physics\\neet_phy_chem_physics.json"
      }
    ]
  },
  {
    "title": "NEET 2022",
    "exam_type": "NEET",
    "branch": null,
    "sections": [
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2022\\neet_bio\\biology\\neet_bio_biology.json"
      },
      {
        "name": "Chemistry",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2022\\neet_phy_chem\\chemistry\\neet_phy_chem_chemistry.json"
      },
      {
        "name": "Physics",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2022\\neet_phy_chem\\physics\\neet_phy_chem_physics.json"
      }
    ]
  },
  {
    "title": "NEET 2022 Re-Exam",
    "exam_type": "NEET",
    "branch": null,
    "sections": [
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2022\\neet_bio_re\\biology\\neet_bio_re_biology.json"
      },
      {
        "name": "Chemistry",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2022\\neet_phy_chem_re\\chemistry\\neet_phy_chem_re_chemistry.json"
      },
      {
        "name": "Physics",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2022\\neet_phy_chem_re\\physics\\neet_phy_chem_re_physics.json"
      }
    ]
  },
  {
    "title": "NEET 2023 C4",
    "exam_type": "NEET",
    "branch": null,
    "sections": [
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2023\\neet_bio_c4\\biology\\neet_bio_c4_biology.json"
      },
      {
        "name": "Chemistry",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2023\\neet_phy_chem_c4\\chemistry\\neet_phy_chem_c4_chemistry.json"
      },
      {
        "name": "Physics",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2023\\neet_phy_chem_c4\\physics\\neet_phy_chem_c4_physics.json"
      }
    ]
  },
  {
    "title": "NEET 2023 Phase 1 F1",
    "exam_type": "NEET",
    "branch": null,
    "sections": [
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2023\\neet_bio_f1\\biology\\neet_bio_f1_biology.json"
      },
      {
        "name": "Chemistry",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2023\\neet_phy_chem_f1\\chemistry\\neet_phy_chem_f1_chemistry.json"
      },
      {
        "name": "Physics",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2023\\neet_phy_chem_f1\\physics\\neet_phy_chem_f1_physics.json"
      },

    ]
  },
  {
    "title": "NEET 2024 Q3",
    "exam_type": "NEET",
    "branch": null,
    "sections": [
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2024\\neet_bio_q3\\botany\\neet_bio_q3_botany.json"
      },
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2024\\neet_bio_q3\\zoology\\neet_bio_q3_zoology.json"
      },
      {
        "name": "Chemistry",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2024\\neet_phy_chem_q3\\chemistry\\neet_phy_chem_q3_chemistry.json"
      },
      {
        "name": "Physics",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2024\\neet_phy_chem_q3\\physics\\neet_phy_chem_q3_physics.json"
      }
    ]
  },
  {
    "title": "NEET 2024 Re-Exam",
    "exam_type": "NEET",
    "branch": null,
    "sections": [
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2024\\neet_bio_re\\botany\\neet_bio_re_botany.json"
      },
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2024\\neet_bio_re\\zoology\\neet_bio_re_zoology.json"
      },
      {
        "name": "Chemistry",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2024\\neet_phy_chem_re\\chemistry\\neet_phy_chem_re_chemistry.json"
      },
      {
        "name": "Physics",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2024\\neet_phy_chem_re\\physics\\neet_phy_chem_re_physics.json"
      }
    ]
  },
  {
    "title": "NEET 2025",
    "exam_type": "NEET",
    "branch": null,
    "sections": [
      {
        "name": "Biology",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2025\\neet_bio\\biology\\neet_bio_biology.json"
      },
      {
        "name": "Chemistry",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2025\\neet_phy_chem\\chemistry\\neet_phy_chem_chemistry.json"
      },
      {
        "name": "Physics",
        "file": "C:\\Users\\saura\\OneDrive\\Desktop\\projects\\pattern-master\\scratch\\neet\\2025\\neet_phy_chem\\physics\\neet_phy_chem_physics.json"
      }
    ]
  }

];
