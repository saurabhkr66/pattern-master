/**
 * seed_mock_questions.ts
 *
 * Seeds whole exam papers directly as seeded MockTestTemplates.
 * Each paper name (title) becomes a separate mock paper in the UI.
 *
 * HOW TO ADD A PAPER
 * ───────────────────
 * Add an entry to the `papers` array below.
 *
 *   {
 *     title:     "NEET 2025",          ← unique name shown in UI
 *     exam_type: "NEET",               ← "GATE"|"JEE_MAIN"|"JEE_ADVANCED"|"NEET"
 *     branch:    null,                 ← null for JEE/NEET; "CSE"/"ECE"/… for GATE
 *     sections: [
 *       {
 *         name: "Physics",             ← must match section name in examConfigs.ts
 *         questions: [ ...paste here... ],
 *       },
 *       { name: "Chemistry", questions: [...] },
 *       ...
 *     ],
 *   },
 *
 * QUESTION SHAPE (same format as neet_2025.json / seed_pyqs.ts)
 * ───────────────────────────────────────────────────────────────
 *   {
 *     question_text:  "...",
 *     options:        ["A. ...", "B. ...", "C. ...", "D. ..."],  // [] for NAT
 *     correct_answer: "A",        // letter for MCQ/MSQ, number string for NAT
 *     explanation:    "...",
 *     year:           2025,
 *     marks:          4,          // 1|2 for GATE; 4 for JEE/NEET
 *     question_type:  "MCQ",      // "MCQ" | "MSQ" | "NAT"
 *     images:         [],         // [{index:1, filename:"path/img.webp"}] or []
 *   }
 *
 * OPTIONAL QUESTIONS (Section B)
 * ───────────────────────────────
 *   NEET   : per section — first 35 mandatory, last 15 optional (attempt any 10)
 *   JEE Main: per section — first 20 MCQ mandatory, last 10 NAT optional (attempt any 5)
 *   GATE   : all mandatory
 *
 * HOW TO RUN
 * ───────────
 *   npx tsx prisma/seed_mock_questions.ts
 *
 * Papers are upserted by title+exam_type+branch — safe to re-run.
 * mock_number is auto-assigned (1st paper per exam = #1, 2nd = #2 …).
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID }   from 'crypto';
import { getExamConfig, type ExamType } from '../lib/examConfigs';

const prisma = new PrismaClient();

/* ═══════════════════════════════════════════════════════════════════
   TYPE
═══════════════════════════════════════════════════════════════════ */
interface RawQuestion {
  question_text:  string;
  options:        string[];
  correct_answer: string;
  explanation:    string;
  year:           number;
  marks:          number;
  question_type:  'MCQ' | 'MSQ' | 'NAT';
  images?:        { index: number; filename: string; type?: string }[];
  topic_name?:    string;
  exam_type?:     string;
}

interface PaperSection {
  name:      string;    // must match ExamConfig section name
  questions: RawQuestion[];
}

interface Paper {
  title:     string;
  exam_type: ExamType;
  branch:    string | null;
  sections:  PaperSection[];
}

/* ═══════════════════════════════════════════════════════════════════
   PAPERS  ← add your papers here
═══════════════════════════════════════════════════════════════════ */

const papers: Paper[] = [

  /* ──────────────────────────────────────────────────────────
     NEET 2025
     Physics   : 35 mandatory MCQ + 15 optional MCQ = 50 Qs
     Chemistry : 35 mandatory MCQ + 15 optional MCQ = 50 Qs
     Botany    : 35 mandatory MCQ + 15 optional MCQ = 50 Qs
     Zoology   : 35 mandatory MCQ + 15 optional MCQ = 50 Qs
     Total     : 200 Qs, 720 marks, 3h 20min
  ────────────────────────────────────────────────────────── */
  {
    title:     'NEET 2025',
    exam_type: 'NEET',
    branch:    null,
    sections: [
      {
        name: 'Physics',
        questions: []
      },
      {
        name: 'Chemistry',
        questions: []
      },
      {
        name: 'Biology',
        questions: []
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     NEET 2024
  ────────────────────────────────────────────────────────── */
  {
    title:     'NEET 2024',
    exam_type: 'NEET',
    branch:    null,
    sections: [
      { name: 'Physics',   questions: [ /* paste here */ ] },
      { name: 'Chemistry', questions: [ /* paste here */ ] },
      { name: 'Biology',   questions: [ /* paste here */ ] },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     JEE MAIN 2025 (Jan)
     Physics / Chemistry / Mathematics
     20 MCQ (mandatory) + 10 NAT (optional, attempt 5) per subject
     Total: 90 Qs, 300 marks, 3h
  ────────────────────────────────────────────────────────── */

  {
    title: 'JEE Main 2026 April 8 shift 2',
    exam_type: 'JEE_MAIN',
    branch: null,
    sections: [
      {
        name: 'Physics',
        questions: [
          {
            "question_text": "A new unit ($$\\alpha$$) of length is chosen such that it is equal to the speed of light in vacuum. What is the distance between Venus and Earth in terms of $$\\alpha$$ units if light takes 6 min. 40 s to cover this distance?",
            "images": [],
            "options": [
              "A. $$200\\alpha$$",
              "B. $$400\\alpha$$",
              "C. $$300\\alpha$$",
              "D. $$500\\alpha$$"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Consider the equation $$H = \\frac{x^p \\epsilon^q E^r}{t^s}$$ Where $$H$$ = magnetic field; $$E$$ = electric field, $$\\epsilon$$ = permittivity, $$x$$ = distance, $$t$$ = time. The values of $$p, q, r$$ and $$s$$ respectively are :",
            "images": [],
            "options": [
              "A. 1, 1, 1, 1",
              "B. $$-1, 1, 2, 1$$",
              "C. $$1, -1, -2, 1$$",
              "D. $$-1, -2, -2, 1$$"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A car moving with a speed of 54 km/h takes a turn of radius 20 m. A simple pendulum is suspended from the ceiling of the car. Determine the angle made by the string of the pendulum with the vertical during the turning. (Take $$g = 10$$ m/s$$^2$$)",
            "images": [],
            "options": [
              "A. $$\\tan^{-1}(0.5)$$",
              "B. $$\\tan^{-1}(0.75)$$",
              "C. $$\\tan^{-1}(1.125)$$",
              "D. $$\\tan^{-1}(0.25)$$"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A gas balloon is going up with a constant velocity of 10 m/s. When this balloon reached a height of 75 m, a stone is dropped from it and balloon keeps moving up with the same velocity. The height of the balloon when the stone hits the ground is __________ m. (Take $$g = 10$$ m/s$$^2$$)",
            "images": [],
            "options": [
              "A. 85",
              "B. 150",
              "C. 129",
              "D. 125"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A thin biconvex lens is prepared from the glass ($$\\mu = 1.5$$) both curved surfaces of which have equal radii of 20 cm each. Left side surface of the lens is silvered from outside to make it reflecting. To have the position of image and object at the same place, the object should be placed, from the lens at a distance of __________ cm.",
            "images": [],
            "options": [
              "A. 10",
              "B. 12.5",
              "C. 13",
              "D. 13.5"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Two identical bodies, projected with the same speed at two different angles cover the same horizontal range $$R$$. If the time of flight of these bodies are 5 s and 10 s, respectively, then the value of $$R$$ is __________ m. (Take $$g = 10$$ m/s$$^2$$)",
            "images": [],
            "options": [
              "A. 250",
              "B. 25",
              "C. 500",
              "D. 125"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A solid cylinder having radius $$R$$ and length $$L$$ is slipping on a rough horizontal plane. At time $$t = 0$$ the cylinder has a translational velocity $$v_0 = 49$$ m/s, perpendicular to its axis and a rotational velocity $$v_0/4R$$ about the centre. The time taken by the cylinder to start rolling is __________ seconds. (coefficient of kinetic friction $$\\mu_K = 0.25$$ and $$g = 9.8$$ m/s$$^2$$)",
            "images": [],
            "options": [
              "A. 15",
              "B. 5",
              "C. 10",
              "D. 7.5"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A liquid of density 600 kg/m$$^3$$ flowing steadily in a tube of varying cross-section. The cross-section at a point $$A$$ is 1.0 cm$$^2$$ and that at $$B$$ is 20 mm$$^2$$. Both the points $$A$$ and $$B$$ are in same horizontal plane, the speed of the liquid at $$A$$ is 10 cm/s. The difference in pressures at $$A$$ and $$B$$ points is __________ Pa.",
            "images": [],
            "options": [
              "A. 18",
              "B. 144",
              "C. 36",
              "D. 72"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A spherical liquid drop of radius $$R$$ acquires the terminal velocity $$v_1$$ when falls through a gas of viscosity $$\\eta$$. Now the drop is broken into 64 identical droplets and each droplet acquires terminal velocity $$v_2$$ falling through the same gas. The ratio of terminal velocities $$v_1/v_2$$ is __________.",
            "images": [],
            "options": [
              "A. 4",
              "B. 0.25",
              "C. 32",
              "D. 16"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "One mole of diatomic gas having rotational modes only is kept in a cylinder with a piston system. The cross-section area of the cylinder is 4 cm$$^2$$. The gas is heated slowly to raise the temperature by 1.2 $$^\\circ$$C during which the piston moves by 25 mm. The amount of heat supplied to the gas is __________ J. (Atmospheric pressure = 100 kPa, $$R = 8.3$$ J/mol. K) (Neglect mass of the piston)",
            "images": [],
            "options": [
              "A. 24.8",
              "B. 25",
              "C. 15.04",
              "D. 29.98"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Initial pressure and volume of a monoatomic ideal gas are $$P$$ and $$V$$. The change in internal energy of this gas in adiabatic expansion to volume $$V_{final} = 27V$$ is __________ J.",
            "images": [],
            "options": [
              "A. $$-2PV(3\\sqrt{3} - 1)$$",
              "B. $$\\frac{4}{3}PV$$",
              "C. $$-\\frac{4}{3}PV$$",
              "D. $$\\frac{3}{4}PV$$"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The frequency of oscillation of a mass $$m$$ suspended by a spring is $$v_1$$. If the length of the spring is cut to half, the same mass oscillates with frequency $$v_2$$. The value of $$\\frac{v_2}{v_1}$$ is __________.",
            "images": [],
            "options": [
              "A. 1",
              "B. 2",
              "C. $$\\sqrt{2}$$",
              "D. $$\\sqrt{3}$$"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A monochromatic source of light operating at 15 kW emits $$2.5 \\times 10^{22}$$ photons/s. The region of an electromagnetic spectrum to which the emitted electromagnetic radiation belongs to __________. (Take $$h = 6.6 \\times 10^{-34}$$ J.s and $$c = 3 \\times 10^8$$ m/s).",
            "images": [],
            "options": [
              "A. Microwave",
              "B. Infrared",
              "C. Visible",
              "D. Ultraviolet"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A current carrying circular loop of radius 2 cm with unit normal $$\\hat{n} = \\frac{\\hat{k} + \\hat{i}}{\\sqrt{2}}$$ is placed in a magnetic field, $$\\vec{B} = B_0(3\\hat{i} + 2\\hat{k})$$. If $$B_0 = 4 \\times 10^{-3}$$ T and current $$I = 100\\sqrt{2}$$ A, the torque experienced by the loop is __________ Wb.A. ($$\\pi = 3.14$$)",
            "images": [],
            "options": [
              "A. $$16 \\times 10^{-5} \\hat{k}$$",
              "B. $$5024 \\times 10^{-7} \\hat{k}$$",
              "C. $$5024 \\times 10^{-7} \\hat{i}$$",
              "D. $$5024 \\times 10^{-7} \\hat{j}$$"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A 30 cm long solenoid has 10 turns per cm and area of 5 cm$$^2$$. The current through the solenoid coil varies from 2 A to 4 A in 3.14 s. The e.m.f. induced in the coil is $$\\alpha \\times 10^{-5}$$ V. The value of $$\\alpha$$ is __________.",
            "images": [],
            "options": [
              "A. 60",
              "B. 12",
              "C. 120",
              "D. 34"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Two point charges $$q_1 = 3 \\, \\mu C$$ and $$q_2 = -4 \\, \\mu C$$ are placed at points $$(2\\hat{i} + 3\\hat{j} + 3\\hat{k})$$ and $$(\\hat{i} + \\hat{j} + \\hat{k})$$ respectively. Force on charge $$q_2$$ is __________ N. $$\\left(\\text{Take } \\frac{1}{4\\pi\\epsilon_0} = 9 \\times 10^9 \\text{ SI Units}\\right)$$",
            "images": [],
            "options": [
              "A. $$(12\\hat{i} + 24\\hat{j} + 24\\hat{k}) \\times 10^{-3}$$",
              "B. $$(4\\hat{i} + 8\\hat{j} + 8\\hat{k}) \\times 10^{-3}$$",
              "C. $$(3\\hat{i} + 6\\hat{j} + 6\\hat{k}) \\times 10^{-3}$$",
              "D. $$(-4\\hat{i} - 8\\hat{j} - 8\\hat{k}) \\times 10^{-3}$$"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Light ray incident along a vector $$\\vec{AO}$$ ($$\\vec{AO} = 2\\hat{i} - 3\\hat{j}$$) emerges out along vector $$\\vec{OB}$$ ($$\\vec{OB} = C\\hat{i} - 4\\hat{j}$$) as shown in the figure below. The value of C is __________.",
            "images": [
              {
                "index": 1,
                "filename": "cracku/light-ray-incident-along-a-vector-v_img1.png"
              }
            ],
            "options": [
              "A. 1.6",
              "B. 0.16",
              "C. 11.6",
              "D. 16"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "$$K_1$$ and $$K_2$$ be the maximum kinetic energies of photoelectrons emitted from a surface of a given material for the light of wavelength $$\\lambda_1$$ and $$\\lambda_2$$, respectively. If $$\\lambda_1 = 2\\lambda_2$$ then the work function of material is given by :",
            "images": [],
            "options": [
              "A. $$K_2 + 2K_1$$",
              "B. $$2K_2 - K_1$$",
              "C. $$K_1 - 2K_2$$",
              "D. $$K_2 - 2K_1$$"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Two radioactive substances A and B of mass numbers 200 and 212 respectively, shows spontaneous $$\\alpha$$-decay with same Q value of 1 MeV. The ratio of energies of $$\\alpha$$-rays produced by A and B is __________.",
            "images": [],
            "options": [
              "A. $$\\frac{2548}{2650}$$",
              "B. $$\\frac{2706}{2646}$$",
              "C. $$\\frac{2597}{2600}$$",
              "D. $$\\frac{2862}{2499}$$"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The output $$Y$$ for the given inputs $$A$$ and $$B$$ to the circuit is :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/the-output-y-for-the-given-inputs-a_img1.png"
              },
              {
                "index": 2,
                "filename": "cracku/the-output-y-for-the-given-inputs-a_opta_img2.png"
              },
              {
                "index": 3,
                "filename": "cracku/the-output-y-for-the-given-inputs-a_optb_img3.png"
              },
              {
                "index": 4,
                "filename": "cracku/the-output-y-for-the-given-inputs-a_optc_img4.png"
              },
              {
                "index": 5,
                "filename": "cracku/the-output-y-for-the-given-inputs-a_optd_img5.png"
              }
            ],
            "options": [
              "A",
              "B",
              "C",
              "D"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A parallel plate capacitor is having separation between plates 0.885 mm. It has a capacitance of 1 $$\\mu$$F when the space between the plates is filled with an insulating material of resistivity $$1 \\times 10^{13}$$ $$\\Omega$$m and resistance $$17.7 \\times 10^{14}$$ $$\\Omega$$. Relative permittivity of the insulating material is $$a \\times 10^7$$. The value of $$a$$ is __________. (Take permittivity of free space $$= 8.85 \\times 10^{-12}$$ F/m)",
            "images": [],
            "options": [],
            "correct_answer": "2",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "Some distant star is to be observed by some telescope of diameter of objective lens $$a$$, at an angular resolution of $$3.0 \\times 10^{-7}$$ radian. If the wavelength of light from the star reaching the telescope is 500 nm, the minimum diameter of the objective lens of the telescope is __________ cm. (nearest integer)",
            "images": [],
            "options": [],
            "correct_answer": "203",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "A 5 mg particle carrying a charge of $$5\\pi \\times 10^{-6}$$ C is moving with velocity of $$(3\\hat{i} + 2\\hat{k}) \\times 10^{-2}$$ m/s in a region having magnetic field $$\\vec{B} = 0.1 \\hat{k}$$ Wb/m$$^2$$. It moves a distance of $$a$$ meter along $$\\hat{k}$$ when it completes 5 revolutions. The value of $$a$$ is __________.",
            "images": [],
            "options": [],
            "correct_answer": "2",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "The stored charge in the capacitor in steady state of the following circuit is __________ $$\\mu$$C.",
            "images": [
              {
                "index": 1,
                "filename": "cracku/the-stored-charge-in-the-capacitor_img1.png"
              }
            ],
            "options": [],
            "correct_answer": "8",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "Two masses of 3.4 kg and 2.5 kg are accelerated from an initial speed of 5 m/s and 12 m/s, respectively. The distances traversed by the masses in the 5$$^{\\text{th}}$$ second are 104 m and 129 m, respectively. The ratio of their momenta after 10 s is $$\\frac{x}{8}$$. The value of $$x$$ is __________.",
            "images": [],
            "options": [],
            "correct_answer": "9",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          }
        ]
      },
      {
        name: 'Chemistry',
        questions: [
          {
            "question_text": "Match List - I with List - II . Choose the correct answer from the options given below :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/match-list-i-with-list-ii-choose-th_img1_7.png"
              }
            ],
            "options": [
              "A. A-IV, B-III, C-I, D-II",
              "B. A-III, B-II, C-IV, D-I",
              "C. A-III, B-IV, C-II, D-I",
              "D. A-III, B-IV, C-I, D-II"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Given below are two statements : Given : Molar mass of C, H, O, Cl are 12, 1, 16 and 35.5 g mol$$^{-1}$$, respectively Statement I : In 30% (w/w) solution of methanol in CCl$$_4$$(at T K), the mole fraction of CCl$$_4$$ is equal to 0.33. Statement II : Mixture of methanol and CCl$$_4$$ shows positive deviation from Raoult's law. In the light of the above statements, choose the correct answer from the options given below :",
            "images": [],
            "options": [
              "A. Both Statement I and Statement II are true",
              "B. Both Statement I and Statement II are false",
              "C. Statement I is true but Statement II is false",
              "D. Statement I is false but Statement II is true"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Bromine trifluoride autoionizes to form $$\\text{BrF}_2^+$$ and $$\\text{BrF}_4^-$$. The shapes of the cation and anion are respectively __________, and __________.",
            "images": [],
            "options": [
              "A. bent, square planar",
              "B. linear, square planar",
              "C. bent, see-saw",
              "D. linear, tetrahedral"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Which of the following statements are not correct ? A. For water, magnitude of $$K_b$$ is more than the magnitude of $$K_f$$. B. The elevation in boiling point of water when a non-volatile solute is added to it is larger in magnitude than its depression in freezing point. C. Osmotic pressure measurement is preferred over any other colligative property to determine molar mass of proteins and polymers. D. The dimerised form of benzoic acid in benzene is Choose the correct answer from the options given below :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/which-of-the-following-statements-a_img1.png"
              }
            ],
            "options": [
              "A. A and B only",
              "B. A and D only",
              "C. A, B and D only",
              "D. A, C and D only"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Consider the following reactions in which all the reactants and products are present in gaseous state $$2xy \\rightleftharpoons x_2 + y_2 \\quad K_1 = 2.5 \\times 10^5$$ $$xy + \\frac{1}{2}z_2 \\rightleftharpoons xyz \\quad K_2 = 5 \\times 10^{-3}$$ The value of $$K_3$$ for the equilibrium $$\\frac{1}{2}x_2 + \\frac{1}{2}y_2 + \\frac{1}{2}z_2 \\rightleftharpoons xyz$$ is :",
            "images": [],
            "options": [
              "A. $$2.5 \\times 10^{-3}$$",
              "B. $$2.5 \\times 10^{3}$$",
              "C. $$1.0 \\times 10^{-5}$$",
              "D. $$5 \\times 10^{-3}$$"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Given at 298 K : $$E^\\ominus_{\\text{Fe}^{2+}/\\text{Fe}} = X$$ Volt $$E^\\ominus_{\\text{Fe}^{3+}/\\text{Fe}} = Y$$ Volt The $$E^\\ominus_{\\text{Fe}^{3+}/\\text{Fe}^{2+}}$$ in Volt at 298 K is given by :",
            "images": [],
            "options": [
              "A. $$2X - 3Y$$",
              "B. $$3Y - 2X$$",
              "C. $$3Y + 2X$$",
              "D. $$Y + X$$"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Given below are two statements : $$R = 8.314$$ J K$$^{-1}$$ mol$$^{-1}$$ and 1 cal = 4.2 J Statement I : When $$E_a = 12.6$$ kcal/mol, the room temperature rate constant is doubled by a 10 $$^\\circ$$C increase in temperature (298 K to 308 K) Statement II : For a first order reactions $$A \\to B$$, Here $$[A]_0$$ is the initial concentration of A and $$t_{1/2}$$ is half life of reaction. In the light of the above statements, choose the correct answer from the options given below :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/given-below-are-two-statements-r-83_img1.png"
              }
            ],
            "options": [
              "A. Both Statement I and Statement II are true",
              "B. Both Statement I and Statement II are false",
              "C. Statement I is true but Statement II is false",
              "D. Statement I is false but Statement II is true"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match List - I with List - II . List - I (Electronic configuration of neutral atom where n = 2) List - II (1st Ionization Energy in kJ mol$$^{-1}$$) A. ns$$^2$$ I. 2080 B. ns$$^2$$np$$^1$$ II. 899 C. ns$$^2$$np$$^3$$ III. 800 D. ns$$^2$$np$$^6$$ IV. 1402 Choose the correct answer from the options given below :",
            "images": [],
            "options": [
              "A. A-II, B-III, C-IV, D-I",
              "B. A-IV, B-III, C-II, D-I",
              "C. A-III, B-II, C-IV, D-I",
              "D. A-III, B-II, C-I, D-IV"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Find the correct statements related to group 15 hydrides. A. Reducing nature increases from NH$$_3$$ to BiH$$_3$$ B. Tendency to donate lone pair of electrons decreases from NH$$_3$$ to BiH$$_3$$ C. The stability of hydrides decreases from NH$$_3$$ to BiH$$_3$$ D. HEH bond angle decreases from NH$$_3$$ to SbH$$_3$$ (E = Elements of group 15) Choose the correct answer from the options given below :",
            "images": [],
            "options": [
              "A. A and B only",
              "B. B and C only",
              "C. A, B, C and D",
              "D. A, C and D Only"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Given below are two statements : Statement I : The number of pairs among [Ti$$^{4+}$$, V$$^{2+}$$], [V$$^{2+}$$, Mn$$^{2+}$$], [Mn$$^{2+}$$, Fe$$^{3+}$$] and [V$$^{2+}$$, Cr$$^{2+}$$] in which both ions are coloured is 3. Statement II : The number of pairs among [La$$^{3+}$$, Yb$$^{2+}$$], [Lu$$^{3+}$$, Ce$$^{4+}$$] and [Ac$$^{3+}$$, Lr$$^{3+}$$] ions in which both are diamagnetic is 3. In the light of the above statements, choose the correct from the options given below :",
            "images": [],
            "options": [
              "A. Both Statement I and Statement II are correct",
              "B. Both Statement I and Statement II are incorrect",
              "C. Statement I is correct but Statement II is incorrect",
              "D. Statement I is incorrect but Statement II is correct"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Given below are two statements for catalytic properties of transition metals. Statement I : First row transition metals which act as catalyst utilise their 3d electrons only for formation of bonds between reactant molecules and atoms on the surface of catalyst. Statement II : There is increase in the concentration of reactants on the surface of catalyst which strengthens the bonds in reacting molecules. In the light of the above statements, choose the correct answer from the options given below :",
            "images": [],
            "options": [
              "A. Both Statement I and Statement II are correct",
              "B. Both Statement I and Statement II are incorrect",
              "C. Statement I is correct but Statement II is incorrect",
              "D. Statement I is incorrect but Statement II is correct"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Given below are two statements : Statement I : Vapours of the liquid with higher boiling point condense before vapours of the liquid with lower boiling points in fractional distillation. Statement II : The vapours rising up in the fractionating column become richer in high boiling component of the mixture. In the light of the above statements, choose the correct answer from the options given below :",
            "images": [],
            "options": [
              "A. Both Statement I and Statement II are true",
              "B. Both Statement I and Statement II are false",
              "C. Statement I is true but Statement II is false",
              "D. Statement I is false but Statement II is true"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The major product of which of the following reaction is not obtained by rearrangement reaction?",
            "images": [
              {
                "index": 1,
                "filename": "cracku/the-major-product-of-which-of-the-f_opta_img1.png"
              },
              {
                "index": 2,
                "filename": "cracku/the-major-product-of-which-of-the-f_optb_img2.png"
              },
              {
                "index": 3,
                "filename": "cracku/the-major-product-of-which-of-the-f_optc_img3.png"
              },
              {
                "index": 4,
                "filename": "cracku/the-major-product-of-which-of-the-f_optd_img4.png"
              }
            ],
            "options": [
              "A",
              "B",
              "C",
              "D"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The total number of aromatic compounds/species from the following is",
            "images": [
              {
                "index": 1,
                "filename": "cracku/the-total-number-of-aromatic-compou_img1.png"
              }
            ],
            "options": [
              "A. 6",
              "B. 4",
              "C. 3",
              "D. 5"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "n-Butane on monochlorination under photochemical condition gives an optically active compound \"P\". \"P\" on further chlorination gives dichloro compounds. The number of dichloro compounds obtained (ignore stereoisomers) is :",
            "images": [],
            "options": [
              "A. 3",
              "B. 4",
              "C. 5",
              "D. 6"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Given below are two statements : Statement I : Due to increase in van der Waals forces, the order of boiling points is CH$$_3$$CH$$_2$$CH$$_2$$I > CH$$_3$$CH$$_2$$I > CH$$_3$$I. Statement II : As is more symmetric, its melting point is higher than , however its boiling point is lower than . In the light of the above statements, choose the correct answer from the options given below :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/given-below-are-two-statements-stat_img1_8.png"
              },
              {
                "index": 2,
                "filename": "cracku/given-below-are-two-statements-stat_img2_4.png"
              },
              {
                "index": 3,
                "filename": "cracku/given-below-are-two-statements-stat_img3.png"
              }
            ],
            "options": [
              "A. Both Statement I and Statement II are true",
              "B. Both Statement I and Statement II are false",
              "C. Statement I is true but Statement II is false",
              "D. Statement I is false but Statement II is true"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Consider the following reaction. The major product (P) formed is :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/consider-the-following-reaction-the_img1_2.png"
              },
              {
                "index": 2,
                "filename": "cracku/consider-the-following-reaction-the_opta_img2.png"
              },
              {
                "index": 3,
                "filename": "cracku/consider-the-following-reaction-the_optb_img3.png"
              },
              {
                "index": 4,
                "filename": "cracku/consider-the-following-reaction-the_optc_img4.png"
              },
              {
                "index": 5,
                "filename": "cracku/consider-the-following-reaction-the_optd_img5.png"
              }
            ],
            "options": [
              "A",
              "B",
              "C",
              "D"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Which statements are True ? A. In Hoffmann bromamide degradation, 4 moles of NaOH and 2 moles of Br$$_2$$ are consumed per mole of an amide B. Hoffmann bromamide reaction is not given by alkyl amides. C. Primary amines can be synthesized by Hoffmann bromamide degradation. D. Secondary amide on reaction with Br$$_2$$ and NaOH will give secondary amine. E. The by-products of Hoffmann degradation are Na$$_2$$CO$$_3$$, NaBr and H$$_2$$O. Choose the correct answer from the options given below :",
            "images": [],
            "options": [
              "A. A, C and E only",
              "B. B, C and D only",
              "C. C and E only",
              "D. C, D and E only"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The incorrect statement from the following with respect to carbohydrates is :",
            "images": [],
            "options": [
              "A. All monosaccharides are reducing sugars.",
              "B. The monosaccharide units obtained from hydrolysis of oligosaccharides is always the same.",
              "C. Starch and cellulose are typical examples of polysaccharides, which are very high molecular weight compounds of more than ten monosaccharide units.",
              "D. Open chain and cyclic structures co-exist at equilibrium that are responsible for certain properties as in the case of D-(+)-glucose."
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Which of the following amino acid will give violet coloured complex with neutral ferric chloride solution?",
            "images": [],
            "options": [
              "A. Threonine",
              "B. Serine",
              "C. Tyrosine",
              "D. Cysteine"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Number of paramagnetic complexes among the following is __________. $$[\\text{MnBr}_4]^{2-}$$, $$[\\text{NiCl}_4]^{2-}$$, $$[\\text{Ni(CN)}_4]^{2-}$$, $$[\\text{Ni(CO)}_4]$$, $$[\\text{CoF}_6]^{3-}$$, $$[\\text{Fe(CN)}_6]^{4-}$$, $$[\\text{Mn(CN)}_6]^{3-}$$, $$[\\text{Ti(CN)}_6]^{3-}$$, $$[\\text{Cu(H}_2\\text{O)}_6]^{2+}$$, $$[\\text{Co(C}_2\\text{O}_4)_3]^{3-}$$",
            "images": [],
            "options": [],
            "correct_answer": "6",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "'$$x$$' is the product which is obtained from benzene by reacting it with carbon monoxide and hydrogen chloride in the presence of cuprous chloride. '$$y$$' is the major product obtained from the benzene by reacting it with ethanoyl chloride in the presence of anhydrous AlCl$$_3$$. Product (major) obtained by heating $$x$$ and $$y$$ in the presence of alkali is $$z$$. Total number of $$\\pi$$ (pi) electrons in $$z$$ is __________.",
            "images": [],
            "options": [],
            "correct_answer": "16",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "Consider two radiations of wavelengths 1. $$\\lambda_1 = 2000$$ $$\\text{\\AA}$$ 2. $$\\lambda_2 = 6000$$ $$\\text{\\AA}$$ The ratio of the energies of these two radiations $$\\left(\\frac{E_1}{E_2}\\right)$$ is __________ (Nearest integer).",
            "images": [],
            "options": [],
            "correct_answer": "3",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "Consider the reaction $$2\\text{H}_2\\text{S(g)} + 3\\text{O}_2\\text{(g)} \\to 2\\text{H}_2\\text{O(l)} + 2\\text{SO}_2\\text{(g)}$$ The magnitude of enthalpy change for the reaction in kJ mol$$^{-1}$$ is __________. (Nearest integer) Given : $$\\Delta_f H^\\ominus(\\text{H}_2\\text{S}) = -20.1$$ kJ mol$$^{-1}$$ $$\\Delta_f H^\\ominus(\\text{H}_2\\text{O}) = -286.0$$ kJ mol$$^{-1}$$ $$\\Delta_f H^\\ominus(\\text{SO}_2) = -297.0$$ kJ mol$$^{-1}$$",
            "images": [],
            "options": [],
            "correct_answer": "1126",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "Solid carbon, CaO and CaCO$$_3$$ are mixed and allowed to attain equilibrium at T K. $$\\text{CaCO}_3\\text{(s)} \\rightleftharpoons \\text{CaO(s)} + \\text{CO}_2\\text{(g)} \\quad K_{p_1} = 0.08$$ atm $$\\text{C(s)} + \\text{CO}_2\\text{(g)} \\rightleftharpoons 2\\text{CO(g)} \\quad K_{p_2} = 2$$ atm The partial pressure of CO is __________ $$\\times 10^{-1}$$ atm",
            "images": [],
            "options": [],
            "correct_answer": "4",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          }
        ]
      },
      {
        name: 'Mathematics',
        questions: [
          {
            "question_text": "Consider the relation R on the set $$\\{-2, -1, 0, 1, 2\\}$$ defined by $$(a, b) \\in R$$ if and only if $$1 + ab > 0$$. Then, among the statements : I. The number of elements in R is 17 II. R is an equivalence relation",
            "images": [],
            "options": [
              "A. Only I is true",
              "B. Only II is true",
              "C. Both I and II are true",
              "D. Neither I nor II is true"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The number of values of $$z \\in \\mathbb{C}$$, satisfying the equations $$|z - (4 + 8i)| = \\sqrt{10}$$ and $$|z - (3 + 5i)| + |z - (5 + 11i)| = 4\\sqrt{5}$$, is :",
            "images": [],
            "options": [
              "A. 0",
              "B. 2",
              "C. 1",
              "D. 4"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "If the system of linear equations : $$x + y + z = 6$$, $$x + 2y + 5z = 10$$, $$2x + 3y + \\lambda z = \\mu$$ has infinitely many solutions, then the value of $$\\lambda + \\mu$$ equals :",
            "images": [],
            "options": [
              "A. 12",
              "B. 16",
              "C. 22",
              "D. 28"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$A = \\begin{bmatrix} \\alpha & 1 & 2 \\\\ 2 & 3 & 0 \\\\ 0 & 4 & 5 \\end{bmatrix}$$ and $$B = \\begin{bmatrix} 1 & 0 & 0 \\\\ 0 & -5\\alpha & 0 \\\\ 0 & 4\\alpha & -2\\alpha \\end{bmatrix} + \\text{adj}(A)$$. If $$\\det(B) = 66$$, then $$\\det(\\text{adj}(A))$$ equals :",
            "images": [],
            "options": [
              "A. 289",
              "B. 361",
              "C. 441",
              "D. 529"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$\\alpha = 3 + 4 + 8 + 9 + 13 + 14 + ...$$ upto 40 terms. If $$(\\tan\\beta)^{\\frac{\\alpha}{1020}}$$ is a root of the equation $$x^2 + x - 2 = 0$$, $$\\beta \\in \\left(0, \\frac{\\pi}{2}\\right)$$, then $$\\sin^2\\beta + 3\\cos^2\\beta$$ is equal to :",
            "images": [],
            "options": [
              "A. 2",
              "B. $$\\frac{7}{4}$$",
              "C. $$\\frac{5}{2}$$",
              "D. $$\\frac{3}{2}$$"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A candidate has to go to the examination centre to appear in an examination. The candidate uses only one means of transportation for the entire distance out of bus, scooter and car. The probabilities of the candidate going by bus, scooter and car, respectively, are $$\\frac{2}{5}$$, $$\\frac{1}{5}$$ and $$\\frac{2}{5}$$. The probabilities that the candidate reaches late at the examination centre are $$\\frac{1}{5}$$, $$\\frac{1}{3}$$ and $$\\frac{1}{4}$$ if the candidate uses bus, scooter and car, respectively. Given that the candidate reached late at the examination centre, the probability that the candidate travelled by bus is :",
            "images": [],
            "options": [
              "A. $$\\frac{11}{37}$$",
              "B. $$\\frac{12}{37}$$",
              "C. $$\\frac{13}{37}$$",
              "D. $$\\frac{14}{37}$$"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A set of four observations has mean 1 and variance 13. Another set of six observations has mean 2 and variance 1. Then, the variance of all these 10 observations is equal to :",
            "images": [],
            "options": [
              "A. 5.96",
              "B. 6.14",
              "C. 6.04",
              "D. 6.24"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "If $$26\\left(\\frac{2^3}{3} {^{12} C_{2}} + \\frac{2^5}{5} {^{12} C_{4}} + \\frac{2^7}{7} {^{12} C_{6}} + \\cdots + \\frac{2^{13}}{13} {^{12} C_{12}}\\right) = 3^{13} - \\alpha$$, then $$\\alpha$$ is equal to :",
            "images": [],
            "options": [
              "A. 45",
              "B. 48",
              "C. 51",
              "D. 54"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A person has three different bags and four different books. The number of ways, in which he can put these books in the bags so that no bag is empty, is :",
            "images": [],
            "options": [
              "A. 18",
              "B. 36",
              "C. 39",
              "D. 72"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "If a straight line drawn through the point of intersection of the lines $$4x + 3y - 1 = 0$$ and $$3x + 4y - 1 = 0$$, meets the co-ordinate axes at the points P and Q, then the locus of the mid point of PQ is :",
            "images": [],
            "options": [
              "A. $$x + y - 7 = 0$$",
              "B. $$x + y - 14xy = 0$$",
              "C. $$2x + y + 14xy = 0$$",
              "D. $$x + 2y - 14xy = 0$$"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let O be the vertex of the parabola $$y^2 = 4x$$ and its chords OP and OQ are perpendicular to each other. If the locus of the mid-point of the line segment PQ is a conic C, then the length of its latus rectum is :",
            "images": [],
            "options": [
              "A. 1",
              "B. 2",
              "C. 4",
              "D. 8"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$\\alpha = 3\\sin^{-1}\\left(\\frac{6}{11}\\right)$$ and $$\\beta = 3\\cos^{-1}\\left(\\frac{4}{9}\\right)$$, where inverse trigonometric functions take only the principal values. Given below are two statements : Statement I : $$\\cos(\\alpha + \\beta) > 0$$. Statement II : $$\\cos(\\alpha) < 0$$. In the light of the above statements, choose the correct answer from the options given below :",
            "images": [],
            "options": [
              "A. Both Statement I and Statement II are true",
              "B. Both Statement I and Statement II are false",
              "C. Statement I is true but Statement II is false",
              "D. Statement I is false but Statement II is true"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "For the function $$f(x) = e^{\\sin|x|} - |x|$$, $$x \\in \\mathbf{R}$$, consider the following statements : Statement I : $$f$$ is differentiable for all $$x \\in \\mathbf{R}$$. Statement II : $$f$$ is increasing in $$\\left(-\\pi, -\\frac{\\pi}{2}\\right)$$. In the light of the above statements, choose the correct answer from the options given below :",
            "images": [],
            "options": [
              "A. Both Statement I and Statement II are true",
              "B. Both Statement I and Statement II are false",
              "C. Statement I is true but Statement II is false",
              "D. Statement I is false but Statement II is true"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$\\vec{a} = 4\\hat{i} - \\hat{j} + 3\\hat{k}$$, $$\\vec{b} = 10\\hat{i} + 2\\hat{j} - \\hat{k}$$ and a vector $$\\vec{c}$$ be such that $$2(\\vec{a} \\times \\vec{b}) + 3(\\vec{b} \\times \\vec{c}) = \\vec{0}$$. If $$\\vec{a} \\cdot \\vec{c} = 15$$, then $$\\vec{c} \\cdot (\\hat{i} + \\hat{j} - 3\\hat{k})$$ is equal to :",
            "images": [],
            "options": [
              "A. $$-6$$",
              "B. $$-5$$",
              "C. $$-4$$",
              "D. $$-3$$"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let the foot of perpendicular from the point $$(\\lambda, 2, 3)$$ on the line $$\\frac{x-4}{1} = \\frac{y-9}{2} = \\frac{z-5}{1}$$ be the point $$(1, \\mu, 2)$$. Then the distance between the lines $$\\frac{x-1}{2} = \\frac{y-2}{3} = \\frac{z+4}{6}$$ and $$\\frac{x-\\lambda}{2} = \\frac{y-\\mu}{3} = \\frac{z+5}{6}$$ is equal to :",
            "images": [],
            "options": [
              "A. $$\\frac{12}{7}$$",
              "B. $$\\frac{\\sqrt{145}}{7}$$",
              "C. $$\\frac{\\sqrt{146}}{7}$$",
              "D. $$\\frac{\\sqrt{143}}{7}$$"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The value of the integral $$\\int_0^2 \\frac{\\sqrt{x(x^2 + x + 1)}}{(\\sqrt{x} + 1)(\\sqrt{x^4 + x^2 + 1})} \\, dx$$ is equal to :",
            "images": [],
            "options": [
              "A. $$\\frac{1}{3}\\log_e(3 - 2\\sqrt{2})$$",
              "B. $$\\frac{2}{3}\\log_e(4 + \\sqrt{2})$$",
              "C. $$\\frac{2}{3}\\log_e(3 + 2\\sqrt{2})$$",
              "D. $$\\frac{1}{3}\\log_e(1 + 6\\sqrt{2})$$"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$y = y(x)$$ be the solution of the differential equation $$x\\sqrt{1-x^2} \\, dy + \\left(y\\sqrt{1-x^2} - x\\cos^{-1}x\\right)dx = 0$$, $$x \\in (0,1)$$, $$\\lim_{x \\to 1^-} y(x) = 1$$. Then $$y\\left(\\frac{1}{2}\\right)$$ equals :",
            "images": [],
            "options": [
              "A. $$3 - \\frac{\\pi}{\\sqrt{3}}$$",
              "B. $$4 - \\sqrt{3}\\pi$$",
              "C. $$4 - \\frac{2\\pi}{\\sqrt{3}}$$",
              "D. $$3 - \\frac{\\pi}{2\\sqrt{3}}$$"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$f : (1, \\infty) \\to \\mathbf{R}$$ be a function defined as $$f(x) = \\frac{x-1}{x+1}$$. Let $$f^{i+1}(x) = f(f^i(x))$$, $$i = 1, 2, ..., 25$$, where $$f^1(x) = f(x)$$. If $$g(x) + f^{26}(x) = 0$$, $$x \\in (1, \\infty)$$, then the area of the region bounded by the curves $$y = g(x)$$, $$2y = 2x - 3$$, $$y = 0$$ and $$x = 4$$ is :",
            "images": [],
            "options": [
              "A. $$\\frac{1}{8} + \\log_e 2$$",
              "B. $$\\frac{1}{4} + \\log_e 2$$",
              "C. $$\\frac{5}{6} + 3\\log_e 2$$",
              "D. $$\\frac{5}{6} + \\log_e 2$$"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$f(x) = \\begin{cases} \\frac{1}{3}, & x \\le \\frac{\\pi}{2} \\\\ \\frac{b(1 - \\sin x)}{(\\pi - 2x)^2}, & x > \\frac{\\pi}{2} \\end{cases}$$. If $$f$$ is continuous at $$x = \\pi/2$$, then the value of $$\\int_0^{3b-6} |x^2 + 2x - 3| \\, dx$$ is :",
            "images": [],
            "options": [
              "A. 5",
              "B. 2",
              "C. 3",
              "D. 4"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$\\frac{x^2}{f(a^2+7a+3)} + \\frac{y^2}{f(3a+15)} = 1$$ represent an ellipse with major axis along $$y$$-axis, where $$f$$ is a strictly decreasing positive function on $$\\mathbf{R}$$. If the set of all possible values of $$a$$ is $$\\mathbf{R} - [\\alpha, \\beta]$$, then $$\\alpha^2 + \\beta^2$$ is equal to :",
            "images": [],
            "options": [
              "A. 28",
              "B. 40",
              "C. 61",
              "D. 24"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The sum of squares of all the real solutions of the equation $$\\log_{(x+1)}(2x^2 + 5x + 3) = 4 - \\log_{(2x+3)}(x^2 + 2x + 1)$$ is equal to __________.",
            "images": [],
            "options": [],
            "correct_answer": "2",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "If $$\\int_{\\pi/6}^{\\pi/4} \\left(\\cot\\left(x - \\frac{\\pi}{3}\\right)\\cot\\left(x + \\frac{\\pi}{3}\\right) + 1\\right) dx = \\alpha \\log_e(\\sqrt{3} - 1)$$, then $$9\\alpha^2$$ is equal to __________.",
            "images": [],
            "options": [],
            "correct_answer": "12",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "Let a line $$L_1$$ pass through the origin and be perpendicular to the lines $$L_2 : \\vec{r} = (3+t)\\hat{i} + (2t-1)\\hat{j} + (2t+4)\\hat{k}$$ and $$L_3 : \\vec{r} = (3+2s)\\hat{i} + (3+2s)\\hat{j} + (2+s)\\hat{k}$$, $$t, s \\in \\mathbf{R}$$. If $$(a, b, c)$$, $$a \\in \\mathbb{Z}$$, is the point on $$L_3$$ at a distance of $$\\sqrt{17}$$ from the point of intersection of $$L_1$$ and $$L_2$$, then $$(a + b + c)^2$$ is equal to __________.",
            "images": [],
            "options": [],
            "correct_answer": "4",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "Consider the circle $$C : x^2 + y^2 - 6x - 8y - 11 = 0$$. Let a variable chord AB of the circle C subtend a right angle at the origin. If the locus of the foot of the perpendicular drawn from the origin on the chord AB is the circle $$x^2 + y^2 - \\alpha x - \\beta y - \\gamma = 0$$, then $$\\alpha + \\beta + 2\\gamma$$ is equal to __________.",
            "images": [],
            "options": [],
            "correct_answer": "18",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "Let $$f$$ be a polynomial function such that $$\\log_2(f(x)) = \\left\\lfloor \\log_2\\left(2 + \\frac{2}{3} + \\frac{2}{9} + \\ldots \\infty\\right) \\right\\rfloor \\cdot \\log_3\\left(1 + \\frac{f(x)}{f\\left(\\frac{1}{x}\\right)}\\right)$$, $$x > 0$$ and $$f(6) = 37$$. Then $$\\sum_{n=1}^{10} f(n)$$ is equal to __________.",
            "images": [],
            "options": [],
            "correct_answer": "395",
            "explanation": "",
            "year": 2026,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          }
        ]
      },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     JEE ADVANCED 2025 Paper 1
     Physics / Chemistry / Mathematics
     18 Qs per subject (6 MCQ + 6 MSQ + 6 NAT)
     Total: 54 Qs, 186 marks, 3h
  ────────────────────────────────────────────────────────── */
  {
    title:     'JEE Advanced 2025 Paper 1',
    exam_type: 'JEE_ADVANCED',
    branch:    null,
    sections: [
      { name: 'Physics',     questions: [ /* paste here */ ] },
      { name: 'Chemistry',   questions: [ /* paste here */ ] },
      { name: 'Mathematics', questions: [ /* paste here */ ] },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     GATE CSE 2025
     General Aptitude: 10 Qs (5×1M + 5×2M)
     CSE:              55 Qs (25×1M + 30×2M)
     Total: 65 Qs, 100 marks, 3h
  ────────────────────────────────────────────────────────── */
  {
    title:     'GATE CSE 2025',
    exam_type: 'GATE',
    branch:    'CSE',
    sections: [
      {
        name: 'General Aptitude',
        questions: [
          // ── paste 10 GA questions here ──
        ],
      },
      {
        name: 'CSE',
        questions: [
          // ── paste 55 GATE CSE questions here ──
        ],
      },
    ],
  },

];

/* ═══════════════════════════════════════════════════════════════════
   SEEDER  — no need to edit below this line
═══════════════════════════════════════════════════════════════════ */

const c = {
  reset: '\x1b[0m', bright: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

/**
 * Decide whether a question at position `idx` in a section is optional.
 *
 * Rules:
 *  - If the section has no optional config → always mandatory.
 *  - If total questions in the section ≤ mandatory threshold → all mandatory
 *    (covers the 180-question NEET case where Section B isn't included).
 *  - Otherwise the first `mandatoryCount` questions are mandatory and the
 *    remaining are optional (covers the 200-question case).
 */
function isOptionalQuestion(
  sectionConfig: ReturnType<typeof getExamConfig>['sections'][number],
  idx: number,
  totalInSection: number,
): boolean {
  if (!sectionConfig.optional) return false;
  const mandatoryCount = sectionConfig.totalQuestions - sectionConfig.optional.poolSize;
  // Not enough questions to have an optional pool → treat all as mandatory
  if (totalInSection <= mandatoryCount) return false;
  return idx >= mandatoryCount;
}

/**
 * Compute the max achievable score for a section given the actual questions seeded.
 *
 * - Mandatory questions always contribute their full marks.
 * - Optional questions contribute marks × countSize (the max a student can score).
 * - If fewer questions than the mandatory threshold → all count as mandatory.
 */
function sectionMaxScore(
  sectionConfig: ReturnType<typeof getExamConfig>['sections'][number],
  questions: RawQuestion[],
): number {
  if (!sectionConfig.optional) {
    return questions.reduce((s, q) => s + q.marks, 0);
  }

  const mandatoryCount = sectionConfig.totalQuestions - sectionConfig.optional.poolSize;
  const allMandatory = questions.length <= mandatoryCount;

  if (allMandatory) {
    return questions.reduce((s, q) => s + q.marks, 0);
  }

  const mandatoryQs = questions.slice(0, mandatoryCount);
  const optionalQs  = questions.slice(mandatoryCount);
  const avgOptMark  = optionalQs.length > 0
    ? optionalQs.reduce((s, q) => s + q.marks, 0) / optionalQs.length
    : 0;

  return (
    mandatoryQs.reduce((s, q) => s + q.marks, 0) +
    Math.round(avgOptMark * sectionConfig.optional.countSize)
  );
}

async function main() {
  console.log(`\n${c.bright}${c.cyan}${'═'.repeat(62)}${c.reset}`);
  console.log(`${c.bright}🧪  Seeding Mock Papers into MockTestTemplate${c.reset}`);
  console.log(`${c.cyan}${'═'.repeat(62)}${c.reset}\n`);

  // Track mock_number per exam+branch so we auto-number correctly
  const numberTracker = new Map<string, number>();

  let seededPapers = 0;
  let updatedPapers = 0;
  let skippedEmpty = 0;

  for (const paper of papers) {
    const totalQs = paper.sections.reduce((s, sec) => s + sec.questions.length, 0);

    if (totalQs === 0) {
      console.log(`${c.yellow}⚠  Skipping "${paper.title}" — no questions yet${c.reset}`);
      skippedEmpty++;
      continue;
    }

    const examKey = `${paper.exam_type}::${paper.branch ?? '-'}`;
    const mockNumber = (numberTracker.get(examKey) ?? 0) + 1;
    numberTracker.set(examKey, mockNumber);

    const config = getExamConfig(paper.exam_type, paper.branch ?? undefined);

    // Build the full question list with all metadata
    const allQuestions: any[] = [];

    for (let si = 0; si < paper.sections.length; si++) {
      const sec = paper.sections[si];

      // Find matching section config by name
      const secConfig = config.sections.find(
        (s) => s.name.toLowerCase() === sec.name.toLowerCase()
      );

      if (!secConfig) {
        console.warn(
          `  ${c.yellow}⚠  Section "${sec.name}" not found in examConfig for ${paper.exam_type} — using index ${si}${c.reset}`
        );
      }

      for (let qi = 0; qi < sec.questions.length; qi++) {
        const q = sec.questions[qi];
        const optional = secConfig ? isOptionalQuestion(secConfig, qi, sec.questions.length) : false;

        allQuestions.push({
          id:            randomUUID(),
          source:        'template',
          sectionIndex:  si,
          sectionName:   sec.name,
          isOptional:    optional,
          question_text: q.question_text,
          options:       q.options,
          question_type: q.question_type,
          marks:         q.marks,
          year:          q.year,
          subject:       sec.name,
          images:        q.images ?? [],
          // kept server-side for grading; stripped before sending to client
          correct_answer: q.correct_answer,
          explanation:    q.explanation,
        });
      }
    }

    const maxScore = paper.sections.reduce((sum, sec) => {
      const secConfig = config.sections.find(
        (s) => s.name.toLowerCase() === sec.name.toLowerCase()
      );
      return sum + (secConfig ? sectionMaxScore(secConfig, sec.questions) : sec.questions.reduce((s, q) => s + q.marks, 0));
    }, 0);

    // Upsert by title + exam_type + branch
    const existing = await prisma.mockTestTemplate.findFirst({
      where: {
        title:     paper.title,
        exam_type: paper.exam_type,
        branch:    paper.branch,
        mode:      'seeded',
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.mockTestTemplate.update({
        where: { id: existing.id },
        data: {
          mock_number:     mockNumber,
          total_questions: allQuestions.length,
          max_score:       maxScore,
          duration_secs:   config.durationSecs,
          sections:        config.sections as any,
          questions:       allQuestions,
        },
      });
      console.log(`${c.yellow}↩  Updated "${paper.title}"${c.reset}  (${allQuestions.length} Qs, mock #${mockNumber})`);
      updatedPapers++;
    } else {
      await prisma.mockTestTemplate.create({
        data: {
          exam_type:       paper.exam_type,
          branch:          paper.branch,
          mode:            'seeded',
          mock_number:     mockNumber,
          title:           paper.title,
          subjects:        paper.sections.map((s) => s.name),
          total_questions: allQuestions.length,
          max_score:       maxScore,
          duration_secs:   config.durationSecs,
          sections:        config.sections as any,
          questions:       allQuestions,
        },
      });
      console.log(`${c.green}✅ Seeded  "${paper.title}"${c.reset}  (${allQuestions.length} Qs, mock #${mockNumber})`);
      seededPapers++;
    }
  }

  console.log(`\n${c.bright}${c.green}✨  Done!${c.reset}`);
  console.log(`   New papers     : ${c.bright}${seededPapers}${c.reset}`);
  console.log(`   Updated        : ${updatedPapers}`);
  console.log(`   Skipped empty  : ${skippedEmpty}`);
  console.log(`${c.cyan}${'═'.repeat(62)}${c.reset}\n`);
}

main()
  .catch((e) => { console.error('💥 FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
