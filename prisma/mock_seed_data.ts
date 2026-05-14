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
       "title": "02 SEP S1 2020",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Chemistry",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/02_sep_s1/chemistry/02_sep_s1_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/02_sep_s1/mathematics/02_sep_s1_mathematics.json"
      },
      {
        "name": "Physics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/02_sep_s1/physics/02_sep_s1_physics.json"
      }
    ]
  },
  {
    "title": "02 SEP S2 2020",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Chemistry",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/02_sep_s2/chemistry/02_sep_s2_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/02_sep_s2/mathematics/02_sep_s2_mathematics.json"
      },
      {
        "name": "Physics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/02_sep_s2/physics/02_sep_s2_physics.json"
      }
    ]
  },
  {
    "title": "03 SEP S1 2020",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Chemistry",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/03_sep_s1/chemistry/03_sep_s1_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/03_sep_s1/mathematics/03_sep_s1_mathematics.json"
      },
      {
        "name": "Physics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/03_sep_s1/physics/03_sep_s1_physics.json"
      }
    ]
  },
  {
    "title": "03 SEP S2 2020",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Chemistry",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/03_sep_s2/chemistry/03_sep_s2_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/03_sep_s2/mathematics/03_sep_s2_mathematics.json"
      },
      {
        "name": "Physics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/03_sep_s2/physics/03_sep_s2_physics.json"
      }
    ]
  },
  {
    "title": "04 SEP S1 2020",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Chemistry",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/04_sep_s1/chemistry/04_sep_s1_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/04_sep_s1/mathematics/04_sep_s1_mathematics.json"
      },
      {
        "name": "Physics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/04_sep_s1/physics/04_sep_s1_physics.json"
      }
    ]
  },
  {
    "title": "04 SEP S2 2020",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Chemistry",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/04_sep_s2/chemistry/04_sep_s2_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/04_sep_s2/mathematics/04_sep_s2_mathematics.json"
      },
      {
        "name": "Physics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/04_sep_s2/physics/04_sep_s2_physics.json"
      }
    ]
  },
  {
    "title": "05 SEP S1 2020",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Chemistry",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/05_sep_s1/chemistry/05_sep_s1_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/05_sep_s1/mathematics/05_sep_s1_mathematics.json"
      },
      {
        "name": "Physics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/05_sep_s1/physics/05_sep_s1_physics.json"
      }
    ]
  },
  {
    "title": "05 SEP S2 2020",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Chemistry",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/05_sep_s2/chemistry/05_sep_s2_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/05_sep_s2/mathematics/05_sep_s2_mathematics.json"
      },
      {
        "name": "Physics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/05_sep_s2/physics/05_sep_s2_physics.json"
      }
    ]
  },
  {
    "title": "06 SEP S1 2020",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Chemistry",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/06_sep_s1/chemistry/06_sep_s1_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/06_sep_s1/mathematics/06_sep_s1_mathematics.json"
      },
      {
        "name": "Physics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/06_sep_s1/physics/06_sep_s1_physics.json"
      }
    ]
  },
  {
    "title": "06 SEP S2 2020",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Chemistry",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/06_sep_s2/chemistry/06_sep_s2_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/06_sep_s2/mathematics/06_sep_s2_mathematics.json"
      },
      {
        "name": "Physics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/06_sep_s2/physics/06_sep_s2_physics.json"
      }
    ]
  },
  {
    "title": "07 JAN S1 2020",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Chemistry",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/07_jan_s1/chemistry/07_jan_s1_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/07_jan_s1/mathematics/07_jan_s1_mathematics.json"
      },
      {
        "name": "Physics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/07_jan_s1/physics/07_jan_s1_physics.json"
      }
    ]
  },
  {
    "title": "07 JAN S2 2020",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Chemistry",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/07_jan_s2/chemistry/07_jan_s2_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/07_jan_s2/mathematics/07_jan_s2_mathematics.json"
      },
      {
        "name": "Physics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/07_jan_s2/physics/07_jan_s2_physics.json"
      }
    ]
  },
  {
    "title": "08 JAN S1 2020",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Chemistry",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/08_jan_s1/chemistry/08_jan_s1_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/08_jan_s1/mathematics/08_jan_s1_mathematics.json"
      },
      {
        "name": "Physics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/08_jan_s1/physics/08_jan_s1_physics.json"
      }
    ]
  },
  {
    "title": "08 JAN S2 2020",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Chemistry",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/08_jan_s2/chemistry/08_jan_s2_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/08_jan_s2/mathematics/08_jan_s2_mathematics.json"
      },
      {
        "name": "Physics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/08_jan_s2/physics/08_jan_s2_physics.json"
      }
    ]
  },
  {
    "title": "09 JAN S1 2020",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Chemistry",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/09_jan_s1/chemistry/09_jan_s1_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/09_jan_s1/mathematics/09_jan_s1_mathematics.json"
      },
      {
        "name": "Physics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/09_jan_s1/physics/09_jan_s1_physics.json"
      }
    ]
  },
  {
    "title": "09 JAN S2 2020",
 "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Chemistry",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/09_jan_s2/chemistry/09_jan_s2_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/09_jan_s2/mathematics/09_jan_s2_mathematics.json"
      },
      {
        "name": "Physics",
        "file": "C:/Users/saura/OneDrive/Desktop/projects/pattern-master/scratch/jeemains/09_jan_s2/physics/09_jan_s2_physics.json"
      }
    ]
  },
  {
    "title": "8 Apr 2023 Shift 1",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "c:/Users/saura/OneDrive/Desktop/jee main/2023/8_apr_s1/physics/8_apr_s1_physics.json"
      },
      {
        "name": "Chemistry",
        "file": "c:/Users/saura/OneDrive/Desktop/jee main/2023/8_apr_s1/chemistry/8_apr_s1_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "c:/Users/saura/OneDrive/Desktop/jee main/2023/8_apr_s1/mathematics/8_apr_s1_mathematics.json"
      }
    ]
  },
  {
    "title": "8 Apr 2023 Shift 2",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "c:/Users/saura/OneDrive/Desktop/jee main/2023/8_apr_s2/physics/8_apr_s2_physics.json"
      },
      {
        "name": "Chemistry",
        "file": "c:/Users/saura/OneDrive/Desktop/jee main/2023/8_apr_s2/chemistry/8_apr_s2_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "c:/Users/saura/OneDrive/Desktop/jee main/2023/8_apr_s2/mathematics/8_apr_s2_mathematics.json"
      }
    ]
  },
  {
    "title": "8 Apr 2023 Shift 1",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "c:/Users/saura/OneDrive/Desktop/jee main/2023/8_apr_s1/physics/8_apr_s1_physics.json"
      },
      {
        "name": "Chemistry",
        "file": "c:/Users/saura/OneDrive/Desktop/jee main/2023/8_apr_s1/chemistry/8_apr_s1_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "c:/Users/saura/OneDrive/Desktop/jee main/2023/8_apr_s1/mathematics/8_apr_s1_mathematics.json"
      }
    ]
  },
  {
    "title": "8 Apr 2023 Shift 2",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "c:/Users/saura/OneDrive/Desktop/jee main/2023/8_apr_s2/physics/8_apr_s2_physics.json"
      },
      {
        "name": "Chemistry",
        "file": "c:/Users/saura/OneDrive/Desktop/jee main/2023/8_apr_s2/chemistry/8_apr_s2_chemistry.json"
      },
     
      {
        "name": "Mathematics",
        "file": "c:/Users/saura/OneDrive/Desktop/jee main/2023/6_apr_s2/mathematics/6_apr_s2_mathematics.json"
      }
    ]
  },
  {
    "title": "8 Apr 2023 Shift 1",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "c:/Users/saura/OneDrive/Desktop/jee main/2023/8_apr_s1/physics/8_apr_s1_physics.json"
      },
      {
        "name": "Chemistry",
        "file": "c:/Users/saura/OneDrive/Desktop/jee main/2023/8_apr_s1/chemistry/8_apr_s1_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "c:/Users/saura/OneDrive/Desktop/jee main/2023/8_apr_s1/mathematics/8_apr_s1_mathematics.json"
      }
    ]
  },
  {
    "title": "8 Apr 2023 Shift 2",
    "exam_type": "JEE_MAIN",
    "branch": null,
    "sections": [
      {
        "name": "Physics",
        "file": "c:/Users/saura/OneDrive/Desktop/jee main/2023/8_apr_s2/physics/8_apr_s2_physics.json"
      },
      {
        "name": "Chemistry",
        "file": "c:/Users/saura/OneDrive/Desktop/jee main/2023/8_apr_s2/chemistry/8_apr_s2_chemistry.json"
      },
      {
        "name": "Mathematics",
        "file": "c:/Users/saura/OneDrive/Desktop/jee main/2023/8_apr_s2/mathematics/8_apr_s2_mathematics.json"
      }
    ]
  }
];
