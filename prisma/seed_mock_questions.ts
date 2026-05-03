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
import { randomUUID } from 'crypto';
import { getExamConfig, type ExamType } from '../lib/examConfigs';

const prisma = new PrismaClient();

/* ═══════════════════════════════════════════════════════════════════
   TYPE
═══════════════════════════════════════════════════════════════════ */
interface RawQuestion {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  year: number;
  marks: number;
  question_type: 'MCQ' | 'MSQ' | 'NAT';
  images?: { index: number; filename: string; type?: string }[];
  topic_name?: string;
  exam_type?: string;
}

interface PaperSection {
  name: string;    // must match ExamConfig section name
  questions: RawQuestion[];
}

interface Paper {
  title: string;
  exam_type: ExamType;
  branch: string | null;
  sections: PaperSection[];
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
    title: 'NEET 2025',
    exam_type: 'NEET',
    branch: null,
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
    title: 'NEET 2024',
    exam_type: 'NEET',
    branch: null,
    sections: [
      { name: 'Physics', questions: [ /* paste here */] },
      { name: 'Chemistry', questions: [ /* paste here */] },
      { name: 'Biology', questions: [ /* paste here */] },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     JEE MAIN 2025 (Jan)
     Physics / Chemistry / Mathematics
     20 MCQ (mandatory) + 10 NAT (optional, attempt 5) per subject
     Total: 90 Qs, 300 marks, 3h
  ────────────────────────────────────────────────────────── */

  {
    title: 'JEE Main 2025 April 7 shift 2',
    exam_type: 'JEE_MAIN',
    branch: null,
    sections: [
      {
        name: 'Physics',
        questions: [
          {
            "question_text": "Given below are two statements : one is labelled as Assertion (A) and the other is labelled as Reason (R) . Assertion (A) : The outer body of an air craft is made of metal which protects persons sitting inside from lightning-strikes. Reason (R) : The electric field inside the cavity enclosed by a conductor is zero. In the light of the above statements, choose the most appropriate answer from the options given below :",
            "images": [],
            "options": [
              "A. Both (A) and (R) are correct and (R) is the correct explanation of (A)",
              "B. (A) is correct but (R) is not correct",
              "C. Both (A) and (R) are correct but (R) is not correct explanation of (A)",
              "D. (A) is not correct but (R) is correct"
            ],
            "correct_answer": "A",
            "explanation": "An air-craft is essentially a hollow metallic body. When lightning (or any external electrostatic discharge) strikes it, charges get redistributed only on the outer metallic surface because of electrostatic induction. For a conductor in electrostatic equilibrium, two well-known facts hold: • The electric field $$\\mathbf{E}$$ anywhere inside the conducting material is zero. • Consequently, the electric field in any cavity completely surrounded by the conductor is also zero (principle of electrostatic shielding). Hence, passengers seated inside the cabin experience no electric field; the metal fuselage acts as a Faraday cage that protects them from lightning. This confirms that Assertion (A) is a correct statement. Reason (R) restates the principle used: “The electric field inside the cavity enclosed by a conductor is zero.” This statement is true and is exactly the physical explanation for the protection mentioned in (A). Therefore, both Assertion (A) and Reason (R) are correct, and (R) is the correct explanation of (A). The appropriate choice is Option A .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Given below are two statements : one is labelled as Assertion (A) and the other is labelled as Reason (R) . Assertion (A) : The density of the copper $$\\left(^{64}_{29}Cu\\right)$$ nucleus is greater than that of the carbon $$\\left(^{12}_{6}C\\right)$$ nucleus. Reason (R) : The nucleus of mass number A has a radius proportional to $$A^{1/3}$$. In the light of the above statements, choose the most appropriate answer from the options given below :",
            "images": [],
            "options": [
              "A. (A) is correct but (R) is not correct",
              "B. (A) is not correct but (R) is correct",
              "C. Both (A) and (R) are correct and (R) is the correct explanation of (A)",
              "D. Both (A) and (R) are correct but (R) is not the correct explanation of (A)"
            ],
            "correct_answer": "B",
            "explanation": "The nuclear radius empirical formula is $$R = r_0 A^{1/3}$$, where $$R$$ = radius of the nucleus, $$A$$ = mass number, $$r_0$$ ≈ $$1.2 \\times 10^{-15}\\,$$m (a constant). Hence the nuclear volume is $$V = \\frac{4}{3}\\pi R^{3} = \\frac{4}{3}\\pi\\left(r_0 A^{1/3}\\right)^{3} = \\frac{4}{3}\\pi r_0^{3} A$$. The mass of a nucleus is roughly $$A m_n$$, where $$m_n$$ is the nucleon mass (proton/neutron mass). Therefore nuclear density is $$\\rho = \\frac{\\text{mass}}{\\text{volume}} = \\frac{A m_n}{\\frac{4}{3}\\pi r_0^{3} A} = \\frac{m_n}{\\tfrac{4}{3}\\pi r_0^{3}}$$. The factor $$A$$ cancels out, so $$\\rho$$ is the same constant for all nuclei, independent of their mass numbers. Assertion (A): “The density of the copper $$\\left(^{64}_{29}Cu\\right)$$ nucleus is greater than that of the carbon $$\\left(^{12}_{6}C\\right)$$ nucleus.” We just showed that densities are practically identical for all nuclei, so Assertion (A) is incorrect. Reason (R): “The nucleus of mass number $$A$$ has a radius proportional to $$A^{1/3}$$.” This is exactly the empirical formula stated above, so Reason (R) is correct. Thus, Assertion (A) is not correct but Reason (R) is correct. The appropriate choice is Option B.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The unit of $$\\sqrt{\\frac{2I}{\\epsilon_0 c}}$$ is : (I = intensity of an electromagnetic wave, c : speed of light)",
            "images": [],
            "options": [
              "A. Vm",
              "B. NC",
              "C. Nm",
              "D. $$NC^{-1}$$"
            ],
            "correct_answer": "D",
            "explanation": "The intensity of a plane electromagnetic wave is related to the peak electric-field amplitude $$E_0$$ by $$I = \\frac{1}{2}\\,\\epsilon_0\\,c\\,E_0^{2}$$ $$-(1)$$ Solving $$-(1)$$ for $$E_0$$ gives $$E_0 = \\sqrt{\\frac{2I}{\\epsilon_0 c}}$$ $$-(2)$$ Thus the expression whose unit we must find is simply the unit of the electric field $$E_0$$. Unit analysis : Intensity $$I$$ : power per area $$\\Rightarrow$$ $$\\text{W m}^{-2} = \\left(\\text{J s}^{-1}\\right)\\text{m}^{-2} = \\text{kg s}^{-3}$$ Permittivity $$\\epsilon_0$$ : $$\\text{C}^{2}\\,\\text{N}^{-1}\\,\\text{m}^{-2}$$ Force $$\\text{N}= \\text{kg m s}^{-2}$$ $$\\therefore \\epsilon_0 = \\frac{\\text{C}^{2}}{\\text{kg m s}^{-2}\\,\\text{m}^{2}} = \\frac{\\text{C}^{2}\\,\\text{s}^{2}}{\\text{kg m}^{3}}$$ Speed of light $$c$$ : $$\\text{m s}^{-1}$$ Compute the unit of $$\\dfrac{2I}{\\epsilon_0 c}$$ : $$ \\dfrac{\\text{kg s}^{-3}} {\\left(\\dfrac{\\text{C}^{2}\\,\\text{s}^{2}}{\\text{kg m}^{3}}\\right)\\;(\\text{m s}^{-1})} = \\dfrac{\\text{kg s}^{-3} \\;\\text{kg m}^{3}} {\\text{C}^{2}\\,\\text{s}^{2}\\;\\text{m}} = \\dfrac{\\text{kg}^{2}\\,\\text{m}^{2}\\,\\text{s}^{-4}}{\\text{C}^{2}} $$ Taking the square root (see $$-(2)$$) gives the unit of $$E_0$$: $$ \\sqrt{\\dfrac{\\text{kg}^{2}\\,\\text{m}^{2}\\,\\text{s}^{-4}}{\\text{C}^{2}}} = \\dfrac{\\text{kg m s}^{-2}}{\\text{C}} = \\dfrac{\\text{N}}{\\text{C}} $$ Hence $$\\sqrt{\\dfrac{2I}{\\epsilon_0 c}}$$ has the SI unit $$\\mathbf{N\\,C^{-1}}$$, which is also equal to $$\\mathbf{V\\,m^{-1}}$$. Answer : Option D $$NC^{-1}$$",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The dimension of $$\\sqrt{\\frac{\\mu_0}{\\epsilon_0}}$$ is equal to that of : ($$\\mu_0$$ = Vacuum permeability and $$\\epsilon_0$$ = Vacuum permittivity)",
            "images": [],
            "options": [
              "A. Voltage",
              "B. Capacitance",
              "C. Inductance",
              "D. Resistance"
            ],
            "correct_answer": "D",
            "explanation": "The expression is $$\\sqrt{\\dfrac{\\mu_0}{\\epsilon_0}}$$. We must find its dimensional formula and compare it with the dimensions of the given physical quantities. Step 1 : Dimensions of vacuum permeability $$\\mu_0$$ In SI, $$\\mu_0 = 4\\pi \\times 10^{-7}\\;N\\,A^{-2}$$, where $$N = kg \\; m \\; s^{-2}$$. Hence, $$\\mu_0$$ has dimensions $$[\\,\\mu_0\\,] = M^{1}\\,L^{1}\\,T^{-2}\\,I^{-2}$$. Step 2 : Dimensions of vacuum permittivity $$\\epsilon_0$$ From Coulomb’s law $$F = \\dfrac{1}{4\\pi\\epsilon_0}\\dfrac{q^{\\,2}}{r^{\\,2}}$$, we get $$\\epsilon_0 = \\dfrac{q^{\\,2}}{F\\,r^{\\,2}}$$. Using $$q = I\\,T$$ and $$F = M\\,L\\,T^{-2}$$: $$[\\,\\epsilon_0\\,] = \\dfrac{(I\\,T)^2}{M\\,L\\,T^{-2}\\;L^{2}} = M^{-1}\\,L^{-3}\\,T^{4}\\,I^{2}$$. Step 3 : Dimensions of $$\\dfrac{\\mu_0}{\\epsilon_0}$$ $$\\left[\\dfrac{\\mu_0}{\\epsilon_0}\\right] = M^{1-(-1)}\\,L^{1-(-3)}\\,T^{-2-4}\\,I^{-2-2}$$ $$= M^{2}\\,L^{4}\\,T^{-6}\\,I^{-4}$$. Step 4 : Taking the square root $$\\left[\\sqrt{\\dfrac{\\mu_0}{\\epsilon_0}}\\right] = M^{1}\\,L^{2}\\,T^{-3}\\,I^{-2}$$. Step 5 : Dimensions of resistance Resistance $$R = \\dfrac{V}{I}$$. Electrical power $$P = V\\,I$$ has dimensions $$M\\,L^{2}\\,T^{-3}$$. Therefore voltage $$V = \\dfrac{P}{I}$$ has dimensions $$M\\,L^{2}\\,T^{-3}\\,I^{-1}$$. Thus, $$[\\,R\\,] = \\dfrac{[\\,V\\,]}{[\\,I\\,]} = M\\,L^{2}\\,T^{-3}\\,I^{-2}$$. Step 6 : Comparison The dimension $$M\\,L^{2}\\,T^{-3}\\,I^{-2}$$ obtained for $$\\sqrt{\\dfrac{\\mu_0}{\\epsilon_0}}$$ is exactly the same as that of resistance. Hence, $$\\sqrt{\\dfrac{\\mu_0}{\\epsilon_0}}$$ has the dimensions of resistance. Correct choice: Option D (Resistance).",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Given below are two statements : one is labelled as Assertion (A) and the other is labelled as Reason (R). Assertion (A) : The radius vector from the Sun to a planet sweeps out equal areas in equal intervals of time and thus areal velocity of planet is constant. Reason (R) : For a central force field the angular momentum is a constant. In the light of about statement, Choose the most appropriate answer from the option given below :",
            "images": [],
            "options": [
              "A. Both (A) and (R) are correct and (R) is the correct explanation of (A)",
              "B. Both (A) and (R) are correct but (R) is not the correct explanation of (A)",
              "C. (A) is correct but (R) is not correct",
              "D. (A) is not correct but (R) is correct"
            ],
            "correct_answer": "A",
            "explanation": "According to Kepler’s second law, the line joining the Sun and any planet sweeps out equal areas in equal intervals of time. This statement is the same as saying that the areal velocity $$\\frac{dA}{dt}$$ of the planet is constant. In mechanics the areal velocity of a particle of mass $$m$$ moving with linear momentum $$\\mathbf{p}=m\\mathbf{v}$$ at an instantaneous position vector $$\\mathbf{r}$$ from the origin is given by $$\\frac{dA}{dt}=\\frac{1}{2m}\\,|\\mathbf{r}\\times\\mathbf{p}|$$ The quantity $$\\mathbf{L}=\\mathbf{r}\\times\\mathbf{p}$$ is the angular momentum of the particle about the origin. Hence $$\\frac{dA}{dt}=\\frac{|\\mathbf{L}|}{2m}$$ If a particle is subjected to a central force, the force vector $$\\mathbf{F}$$ is always directed along the radius vector $$\\mathbf{r}$$. Therefore the torque about the origin is $$\\boldsymbol{\\tau}=\\mathbf{r}\\times\\mathbf{F}=0$$ Zero torque implies $$\\frac{d\\mathbf{L}}{dt}=0$$, so the angular momentum $$\\mathbf{L}$$ is conserved (constant in both magnitude and direction). Because $$|\\mathbf{L}|$$ is constant, the expression $$\\frac{dA}{dt}=\\frac{|\\mathbf{L}|}{2m}$$ shows that the areal velocity $$\\frac{dA}{dt}$$ must also be constant. This directly yields Kepler’s second law. Thus: • Assertion (A) is correct: the radius vector sweeps out equal areas in equal times, so the areal velocity is constant. • Reason (R) is correct: in a central force field the angular momentum is conserved. • Reason (R) correctly explains why the areal velocity is constant, since constant angular momentum leads to constant $$\\frac{dA}{dt}$$. Therefore the appropriate choice is Option A : Both (A) and (R) are correct and (R) is the correct explanation of (A).",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The helium and argon are put in the flask at the same room temperature (300 K). The ratio of average kinetic energies (per molecule) of helium and argon is : (Molar mass of helium = 4 g/mol, Molar mass of argon = 40 g/mol)",
            "images": [],
            "options": [
              "A. 1 : 10",
              "B. 10 : 1",
              "C. $$1 : \\sqrt{10}$$",
              "D. 1 : 1"
            ],
            "correct_answer": "D",
            "explanation": "For an ideal gas, the average translational kinetic energy of one molecule at absolute temperature $$T$$ is given by the expression $$\\overline{E_k} = \\frac{3}{2}\\,k\\,T$$ Here, $$k$$ is the Boltzmann constant and $$T$$ is the thermodynamic temperature. Observe that $$\\overline{E_k}$$ depends only on the temperature and the universal constant $$k$$; it is independent of the nature, molar mass, or molecular mass of the gas. Both helium and argon are in the same flask at the same temperature $$T = 300 \\text{ K}$$. Therefore, their average kinetic energies per molecule are equal: $$\\overline{E_k}(\\text{He}) = \\frac{3}{2}\\,k\\,T$$ $$\\overline{E_k}(\\text{Ar}) = \\frac{3}{2}\\,k\\,T$$ The required ratio is $$\\frac{\\overline{E_k}(\\text{He})}{\\overline{E_k}(\\text{Ar})} = \\frac{\\frac{3}{2}\\,k\\,T}{\\frac{3}{2}\\,k\\,T} = 1$$ Hence, the ratio of average kinetic energies (per molecule) of helium to argon is $$1 : 1$$. The correct choice is Option D .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A capillary tube of radius 0.1 mm is partly dipped in water (surface tension 70 dyn/cm and glass water contact angle $$\\simeq 0^\\circ$$) with $$30^\\circ$$ inclined with vertical. The length of water risen in the capillary is _____ cm. (Take $$g = 9.8$$ m/s$$^2$$)",
            "images": [],
            "options": [
              "A. $$\\frac{82}{5}$$",
              "B. $$\\frac{57}{2}$$",
              "C. $$\\frac{71}{5}$$",
              "D. $$\\frac{68}{5}$$"
            ],
            "correct_answer": "A",
            "explanation": "The capillary rise formula for a tube kept vertical is $$h = \\dfrac{2 T \\cos \\phi}{\\rho g r}$$ where $$T$$ = surface tension, $$\\phi$$ = contact angle, $$\\rho$$ = density of liquid, $$g$$ = acceleration due to gravity, $$r$$ = radius of the tube. Given data (in SI units): Radius, $$r = 0.1 \\text{ mm} = 0.1 \\times 10^{-3}\\text{ m} = 1.0 \\times 10^{-4}\\text{ m}$$ Surface tension, $$T = 70 \\text{ dyn/cm}$$. Since $$1 \\text{ dyn} = 10^{-5}\\text{ N}$$ and $$1 \\text{ cm} = 10^{-2}\\text{ m}$$, $$T = 70 \\times 10^{-5}\\text{ N} \\big/ 10^{-2}\\text{ m} = 70 \\times 10^{-3}\\text{ N/m} = 0.07\\text{ N/m}$$ Contact angle with glass, $$\\phi \\simeq 0^\\circ \\;\\Rightarrow\\; \\cos\\phi = 1$$ Density of water, $$\\rho = 1000\\text{ kg/m}^3$$ Acceleration, $$g = 9.8\\text{ m/s}^2$$ Substituting into the formula, the vertical rise is $$h = \\dfrac{2 \\times 0.07 \\times 1}{1000 \\times 9.8 \\times 1.0 \\times 10^{-4}} = \\dfrac{0.14}{0.98} = 0.142857\\text{ m} = 14.2857\\text{ cm}$$ The tube is inclined at $$30^\\circ$$ to the vertical. If $$L$$ is the length of water column along the axis of the tube, its vertical component equals $$h$$, so $$L \\cos 30^\\circ = h$$ $$\\Rightarrow\\; L = \\dfrac{h}{\\cos 30^\\circ} = \\dfrac{14.2857}{\\dfrac{\\sqrt3}{2}} = \\dfrac{200}{7\\sqrt3}\\text{ cm} \\approx 16.5\\text{ cm}$$ Among the given options, $$\\dfrac{82}{5}\\text{ cm} = 16.4\\text{ cm}$$ is the closest and matches the calculated value. Hence the length of water risen in the inclined capillary is approximately $$\\mathbf{16.4\\;cm}$$, so the correct choice is Option A .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A mirror is used to produce an image with magnification of $$\\frac{1}{4}$$. If the distance between object and its image is 40 cm, then the focal length of the mirror is :",
            "images": [],
            "options": [
              "A. 10 cm",
              "B. 12.7 cm",
              "C. 10.7 cm",
              "D. 15 cm"
            ],
            "correct_answer": "C",
            "explanation": "For a spherical mirror the transverse magnification is defined as $$m \\;=\\; \\frac{h_i}{h_o}\\;=\\;-\\frac{v}{u} \\quad -(1)$$ where $$u$$ is the object distance and $$v$$ is the image distance, both measured from the pole using the Cartesian sign convention. The given magnitude of magnification is $$\\frac{1}{4}$$. Because the value is positive and less than $$1$$, the image is erect and virtual. Hence the mirror must be convex, so we take $$m = +\\frac{1}{4} \\quad\\Longrightarrow\\quad \\frac{1}{4}= -\\frac{v}{u} \\quad -(2)$$ From $$(2)$$, $$v = -\\frac{u}{4} \\quad -(3)$$ With the sign convention, the object lies in front of the mirror, so $$u$$ is negative. Equation $$(3)$$ therefore makes $$v$$ positive, placing the virtual image behind the mirror, as expected for a convex mirror. The distance between the object and its image is given to be $$40\\ \\text{cm}$$. Along the principal axis these two points are on opposite sides of the pole, so their separation equals the sum of their magnitudes: $$|u| + |v| = 40 \\quad -(4)$$ Put $$|v| = \\frac{|u|}{4}$$ from $$(3)$$ into $$(4)$$: $$|u| + \\frac{|u|}{4} = 40 \\;\\Longrightarrow\\; \\frac{5|u|}{4} = 40 \\;\\Longrightarrow\\; |u| = 32\\ \\text{cm}$$ Thus, $$u = -32\\ \\text{cm}, \\qquad v = +8\\ \\text{cm}$$ Apply the mirror formula $$\\frac{1}{f} = \\frac{1}{v} + \\frac{1}{u} \\quad -(5)$$ Substituting $$v = 8\\ \\text{cm}$$ and $$u = -32\\ \\text{cm}$$ into $$(5)$$ gives $$\\frac{1}{f} = \\frac{1}{8} - \\frac{1}{32} = \\frac{4 - 1}{32} = \\frac{3}{32}$$ Therefore $$f = \\frac{32}{3}\\ \\text{cm} \\approx 10.7\\ \\text{cm}$$ The focal length is positive, confirming that the mirror is indeed convex. Hence the correct option is Option C (10.7 cm) .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A dipole with two electric charges of 2 $$\\mu$$C magnitude each, with separation distance 0.5 $$\\mu$$m, is placed between the plates of a capacitor such that its axis is parallel to an electric field established between the plates when a potential difference of 5 V is applied. Separation between the plates is 0.5 mm. If the dipole is rotated by 30° from the axis, the value of the torque is :",
            "images": [],
            "options": [
              "A. $$5 \\times 10^{-9}$$ Nm",
              "B. $$5 \\times 10^{-3}$$ Nm",
              "C. $$2.5 \\times 10^{-12}$$ Nm",
              "D. $$2.5 \\times 10^{-9}$$ Nm"
            ],
            "correct_answer": "A",
            "explanation": "Magnitude of each charge of the dipole: $$q = 2\\,\\mu C = 2 \\times 10^{-6}\\,C$$. Separation of the charges (length of dipole): $$d = 0.5\\,\\mu m = 0.5 \\times 10^{-6}\\,m$$. Electric dipole moment is defined as $$p = q\\,d$$ (directed from -ve to +ve charge). Substituting the values, $$p = (2 \\times 10^{-6}) \\times (0.5 \\times 10^{-6})$$ $$p = 1 \\times 10^{-12}\\,C\\,m$$. The electric field E between parallel-plate capacitor plates is uniform and given by $$E = \\frac{V}{\\ell}$$, where V is the applied potential difference and $$\\ell$$ is plate separation. Given potential difference: $$V = 5\\,V$$. Plate separation: $$\\ell = 0.5\\,mm = 0.5 \\times 10^{-3}\\,m$$. Therefore, $$E = \\frac{5}{0.5 \\times 10^{-3}} = \\frac{5}{5 \\times 10^{-4}} = 1 \\times 10^{4}\\,V\\,m^{-1}$$. Torque on a dipole in a uniform field is $$\\tau = p\\,E\\,\\sin\\theta$$, where $$\\theta$$ is the angle between $$\\vec p$$ and $$\\vec E$$ after rotation. The dipole is rotated through $$30^{\\circ}$$, so $$\\theta = 30^{\\circ}$$ and $$\\sin30^{\\circ} = 0.5$$. Hence, $$\\tau = (1 \\times 10^{-12})(1 \\times 10^{4})(0.5)$$ $$\\tau = 0.5 \\times 10^{-8}\\,N\\,m$$ $$\\tau = 5 \\times 10^{-9}\\,N\\,m$$. Therefore the torque experienced by the dipole is $$5 \\times 10^{-9}\\,N\\,m$$. Option A is correct.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Consider the following logic circuit. The output is Y = 0 when :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/consider-the-following-logic-circui_img1.png"
              }
            ],
            "options": [
              "A. A = 1 and B = 1",
              "B. A = 0 and B = 1",
              "C. A = 1 and B = 0",
              "D. A = 0 and B = 0"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match List-I with List-II . Choose the correct answer from the options given below :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/match-listi-with-listii-choose-the_img1_6.png"
              }
            ],
            "options": [
              "A. (A)-(IV), (B)-(II), (C)-(III), (D)-(I)",
              "B. (A)-(I), (B)-(III), (C)-(IV), (D)-(II)",
              "C. (A)-(IV), (B)-(II), (C)-(I), (D)-(III)",
              "D. (A)-(II), (B)-(III), (C)-(IV), (D)-(I)"
            ],
            "correct_answer": "C",
            "explanation": "The dimensional formula of a physical quantity is obtained from the defining equation of that quantity in terms of the fundamental mechanical quantities $$M$$ (mass), $$L$$ (length) and $$T$$ (time). Case (A) : Mass density Mass density $$\\rho$$ is mass per unit volume: $$\\rho = \\frac{\\text{mass}}{\\text{volume}}$$. Mass has dimension $$[M]$$ and volume has dimension $$[L^3]$$, so $$[\\rho] = \\frac{[M]}{[L^3]} = [M L^{-3} T^{0}]$$. Thus (A) corresponds to (IV). Case (B) : Impulse Impulse $$J$$ is defined as force multiplied by the time interval: $$J = F \\, \\Delta t$$. Force has dimension $$[M L T^{-2}]$$ and time has dimension $$[T]$$, so $$[J] = [M L T^{-2}] \\,[T] = [M L T^{-1}]$$. Thus (B) corresponds to (II). Case (C) : Power Power $$P$$ is work done per unit time: $$P = \\frac{W}{t}$$. Work (or energy) has dimension $$[M L^{2} T^{-2}]$$ and time has dimension $$[T]$$, hence $$[P] = \\frac{[M L^{2} T^{-2}]}{[T]} = [M L^{2} T^{-3}]$$. Thus (C) corresponds to (I). Case (D) : Moment of inertia For a point mass $$m$$ at a distance $$r$$ from the axis, the moment of inertia $$I$$ is: $$I = m r^{2}$$. Mass has dimension $$[M]$$ and distance squared has dimension $$[L^{2}]$$, so $$[I] = [M] [L^{2}] = [M L^{2} T^{0}]$$. Thus (D) corresponds to (III). Collecting the matches: (A) → (IV), (B) → (II), (C) → ( I ), (D) → (III). This set of matches is given in Option C. Hence the correct answer is Option C.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The equation of a wave travelling on a string is $$y = \\sin[20\\pi x + 10\\pi t]$$, where x and t are in SI units. The minimum distance between two points having the same oscillating speed is :",
            "images": [],
            "options": [
              "A. 5.0 cm",
              "B. 20 cm",
              "C. 10 cm",
              "D. 2.5 cm"
            ],
            "correct_answer": "A",
            "explanation": "The given transverse wave on the string is $$y(x,t)=\\sin\\!\\left(20\\pi x+10\\pi t\\right)$$ where $$x$$ is in metres and $$t$$ is in seconds. For any particle of the string the instantaneous transverse (oscillatory) speed is obtained by differentiating $$y$$ with respect to time: Formula: $$v_y=\\frac{\\partial y}{\\partial t}= \\omega \\cos\\!\\left(kx+\\omega t\\right)$$ where $$k$$ is the wave-number and $$\\omega$$ is the angular frequency. Here $$k=20\\pi$$ and $$\\omega=10\\pi$$, so $$v_y=10\\pi \\cos\\!\\left(20\\pi x+10\\pi t\\right)$$ $$-(1)$$ At a fixed instant $$t$$, two points $$x_1$$ and $$x_2$$ will have the same oscillatory speed magnitude when $$\\left|v_y(x_1,t)\\right|=\\left|v_y(x_2,t)\\right|$$ $$\\Longrightarrow$$ $$\\left|\\cos\\!\\left(20\\pi x_1+10\\pi t\\right)\\right|=\\left|\\cos\\!\\left(20\\pi x_2+10\\pi t\\right)\\right|$$ Let the corresponding phase angles be $$\\phi_1$$ and $$\\phi_2$$: $$\\phi_1 = 20\\pi x_1+10\\pi t,\\qquad \\phi_2 = 20\\pi x_2+10\\pi t$$ Condition for equal absolute value of a cosine: $$\\left|\\cos\\phi_1\\right|=\\left|\\cos\\phi_2\\right| \\; \\Longrightarrow \\; \\phi_2=\\phi_1\\pm n\\pi,\\; n\\in\\mathbb{Z}$$ (The plus/minus $$\\pi$$ shift changes the sign of the cosine but keeps its magnitude the same.) Therefore the phase difference between the two points is $$\\Delta\\phi = \\phi_2-\\phi_1 = n\\pi$$ Since $$\\Delta\\phi = k\\,\\Delta x$$, we get $$k\\,\\Delta x = n\\pi \\quad \\Longrightarrow \\quad \\Delta x = \\frac{n\\pi}{k}$$ $$-(2)$$ With $$k = 20\\pi$$, equation $$(2)$$ becomes $$\\Delta x = \\frac{n\\pi}{20\\pi} = \\frac{n}{20}\\; \\text{metre}$$ The minimum non-zero distance corresponds to $$n = 1$$: $$\\Delta x_{\\min} = \\frac{1}{20}\\; \\text{m} = 0.05\\; \\text{m} = 5.0\\; \\text{cm}$$ Hence, the minimum separation between two points on the string having the same oscillating speed is 5.0 cm. Option A is correct.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Given below are two statements : one is labelled as Assertion (A) and the other is labelled as Reason(R). Assertion (A) : Refractive index of glass is higher than that of air. Reason (R) : Optical density of a medium is directly proportionate to its mass density which results in a proportionate refractive index. In the light of the above statements, choose the most appropriate answer from the options given below :",
            "images": [],
            "options": [
              "A. (A) is not correct but (R) is correct",
              "B. Both (A) and (R) are correct and (R) is the correct explanation of (A)",
              "C. (A) is correct but (R) is not correct",
              "D. Both (A) and (R) are correct but (R) is not the correct explanation of (A)"
            ],
            "correct_answer": "C",
            "explanation": "The assertion states: “Refractive index of glass is higher than that of air.” The refractive index $$n$$ of a medium is defined by $$n = \\frac{c}{v}$$, where $$c$$ is the speed of light in vacuum and $$v$$ is the speed of light in the medium. For air, $$v$$ is almost equal to $$c$$, so $$n_{\\text{air}}\\approx 1.0003$$. For ordinary crown glass, $$v\\approx 2\\times 10^{8}\\,\\text{m s}^{-1}$$, so $$n_{\\text{glass}}\\approx 1.5$$. Hence $$n_{\\text{glass}}\\gt n_{\\text{air}}$$, making the assertion true. The reason claims: “Optical density of a medium is directly proportionate to its mass density which results in a proportionate refractive index.” Optical density describes how much a medium slows light, i.e. its refractive index. Mass density is the ratio of mass to volume. There is no fixed proportionality between mass density and refractive index. For example, turpentine has a higher refractive index than water even though its mass density is lower. Therefore the reason is false. Conclusion: The assertion (A) is correct, but the reason (R) is not correct. Hence the appropriate choice is Option C.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Given below are two statements : one is labelled as Assertion (A) and the other is labelled as Reason(R). Assertion (A) : Magnetic monopoles do not exist. Reason (R) : Magnetic field lines are continuous and form closed loops. In the light of the above statements, choose the most appropriate answer from the options given below :",
            "images": [],
            "options": [
              "A. Both (A) and (R) are correct but (R) is not the correct explanation of (A)",
              "B. (A) is correct but (R) is not correct",
              "C. Both (A) and (R) are correct and (R) is the correct explanation of (A)",
              "D. (A) is not correct but (R) is correct"
            ],
            "correct_answer": "C",
            "explanation": "For a magnetic field $$\\mathbf{B}$$, Gauss’s law for magnetism states $$\\nabla\\!\\cdot\\!\\mathbf{B}=0$$ $$-(1)$$. Equation $$(1)$$ means the net magnetic flux through any closed surface is zero. Hence there are no sources or sinks of the magnetic field analogous to electric charges. In other words, isolated north poles or south poles (magnetic monopoles) are absent. This validates Assertion (A). Because $$\\nabla\\!\\cdot\\!\\mathbf{B}=0$$ everywhere, magnetic field lines can neither start nor end; they must be continuous and form closed loops. Therefore Reason (R) is also a correct statement. Moreover, the continuity of magnetic field lines (closed loops) is the direct physical manifestation of $$\\nabla\\!\\cdot\\!\\mathbf{B}=0$$, which is precisely why magnetic monopoles do not exist. Thus Reason (R) correctly explains Assertion (A). So, both Assertion (A) and Reason (R) are correct and Reason (R) is the correct explanation of Assertion (A). Answer: Option C",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Which one of the following forces cannot be expressed in terms of potential energy?",
            "images": [],
            "options": [
              "A. Coulomb's force",
              "B. Gravitational force",
              "C. Frictional force",
              "D. Restoring force"
            ],
            "correct_answer": "C",
            "explanation": "Potential energy $$U$$ is defined only for conservative forces. A conservative force satisfies the following statements: • Work done by the force depends only on the initial and final positions, not on the actual path. • For a conservative force $$\\vec F_c$$ we can write $$\\vec F_c = -\\,\\boldsymbol{\\nabla} U$$, that is, the force equals the negative gradient of a scalar potential energy function $$U(x,y,z)$$. Let us analyse each force in the options. Case A: Coulomb’s force between two point charges is $$\\vec F = k\\,\\frac{q_1 q_2}{r^2}\\,\\hat r$$. It is inverse-square and central, hence conservative. We can define the electrostatic potential energy $$U = k\\,\\dfrac{q_1 q_2}{r}$$ such that $$\\vec F = -\\,\\dfrac{dU}{dr}\\,\\hat r$$. Therefore it can be expressed in terms of potential energy. Case B: Gravitational force between two masses is $$\\vec F = -G\\,\\dfrac{m_1 m_2}{r^2}\\,\\hat r$$, which is also inverse-square and conservative. The corresponding potential energy is $$U = -G\\,\\dfrac{m_1 m_2}{r}$$. Hence gravitational force is expressible through potential energy. Case C: Frictional force (kinetic or static) depends on the nature of surfaces and usually acts opposite to the direction of motion or impending motion. Work done against friction depends on the path length, not merely on initial and final positions. Therefore friction is a non-conservative force. For a non-conservative force we cannot define a single-valued scalar function $$U$$ satisfying $$\\vec F = -\\,\\boldsymbol{\\nabla} U$$. So friction cannot be expressed in terms of potential energy. Case D: A restoring force such as the spring force is $$\\vec F = -k\\,x\\,\\hat i$$. It is conservative; its potential energy is the elastic potential energy $$U = \\tfrac12 k x^2$$ because $$\\vec F = -\\,\\dfrac{dU}{dx}\\,\\hat i$$. Only the frictional force fails to meet the criteria for conservative forces. Hence the force that cannot be expressed in terms of potential energy is the frictional force → Option C (Option 3).",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match List-I with List-II. Choose the correct answer from the options given below :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/match-listi-with-listii-choose-the_img1_7.png"
              }
            ],
            "options": [
              "A. (A)-(III), (B)-(I), (C)-(IV), (D)-(II)",
              "B. (A)-(IV), (B)-(I), (C)-(III), (D)-(II)",
              "C. (A)-(IV), (B)-(II), (C)-(III), (D)-(I)",
              "D. (A)-(II), (B)-(IV), (C)-(III), (D)-(I)"
            ],
            "correct_answer": "C",
            "explanation": "The first law of thermodynamics gives the relation $$\\Delta Q = \\Delta U + \\Delta W$$ where: • $$\\Delta Q$$ is the heat supplied to the system, • $$\\Delta U$$ is the change in internal energy, • $$\\Delta W$$ is the work done by the system. For each thermodynamic process we check which of these three quantities is zero or non-zero. Case A: Isothermal process Definition: Temperature remains constant. For an ideal gas, internal energy depends only on temperature, so when temperature is constant $$\\Delta U = 0$$. Heat supplied equals work done, but both are generally non-zero. Hence the correct description is $$\\Delta U = 0$$, i.e. List-II item (IV). Case B: Adiabatic process Definition: No heat is exchanged with the surroundings. Therefore $$\\Delta Q = 0$$. Neither $$\\Delta U$$ nor $$\\Delta W$$ is automatically zero; they are related by $$\\Delta U = -\\Delta W$$. Thus the matching statement is $$\\Delta Q = 0$$, i.e. List-II item (II). Case C: Isobaric process Definition: Pressure remains constant. At constant pressure, the gas expands or compresses, so work is done: $$\\Delta W \\ne 0$$. Temperature usually changes, so internal energy changes: $$\\Delta U \\ne 0$$. Only $$\\Delta U \\ne 0$$ is listed among the four given statements, therefore we match with List-II item (III). Case D: Isochoric process Definition: Volume remains constant. Work done for a volume change is $$\\Delta W = P\\,\\Delta V$$. With $$\\Delta V = 0$$ we get $$\\Delta W = 0$$. Heat added goes entirely into changing internal energy: $$\\Delta Q = \\Delta U$$, so neither of them is necessarily zero. Thus the matching statement is $$\\Delta W = 0$$, i.e. List-II item (I). Collecting the matches: (A) Isothermal → (IV) $$\\Delta U = 0$$ (B) Adiabatic → (II) $$\\Delta Q = 0$$ (C) Isobaric → (III) $$\\Delta U \\ne 0$$ (D) Isochoric → (I) $$\\Delta W = 0$$ This corresponds to Option C. Final Answer: Option C [ (A)-(IV), (B)-(II), (C)-(III), (D)-(I) ]",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A helicopter flying horizontally with a speed of 360 km/h at an altitude of 2 km, drops an object at an instant. The object hits the ground at a point O, 20 s after it is dropped. Displacement of 'O' from the position of helicopter where the object was released is : (use acceleration due to gravity $$g = 10$$ m/s$$^2$$and neglect air resistance)",
            "images": [],
            "options": [
              "A. $$2\\sqrt{5}$$ km",
              "B. 4 km",
              "C. 7.2 km",
              "D. $$2\\sqrt{2}$$ km"
            ],
            "correct_answer": "D",
            "explanation": "Speed of the helicopter: $$v = 360 \\text{ km h}^{-1} = 360 \\times \\frac{1000}{3600}\\,\\text{m s}^{-1} = 100 \\,\\text{m s}^{-1}$$ Altitude from which the object is released: $$h = 2 \\text{ km} = 2000 \\text{ m}$$ Time taken by the object to fall through $$h$$ (free-fall, neglecting air resistance) is obtained from $$h = \\frac12 \\, g t^{2} \\; \\Longrightarrow \\; t = \\sqrt{\\frac{2h}{g}}$$ Substituting $$h = 2000 \\text{ m}$$ and $$g = 10 \\text{ m s}^{-2}$$, $$t = \\sqrt{\\frac{2 \\times 2000}{10}} = \\sqrt{400} = 20 \\text{ s}$$ Thus the object reaches the ground exactly $$20 \\text{ s}$$ after it is dropped. Horizontal distance travelled in this time by either the helicopter or the object is $$x = v t = 100 \\,\\text{m s}^{-1} \\times 20 \\text{ s} = 2000 \\text{ m} = 2 \\text{ km}$$ Vertical distance descended by the object is the full altitude, i.e. $$y = 2 \\text{ km}$$ downward. Hence the displacement vector of the object, measured from the point of release on the helicopter, has components horizontal $$2 \\text{ km}$$ and vertical $$2 \\text{ km}$$. Its magnitude is $$\\sqrt{(2\\text{ km})^{2} + (2\\text{ km})^{2}} = 2\\sqrt{2}\\ \\text{km}$$ Therefore, the required displacement is $$2\\sqrt{2}$$ km. Option D.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "An object with mass 500 g moves along x-axis with speed $$v = 4\\sqrt{x}$$ m/s. The force acting on the object is :",
            "images": [],
            "options": [
              "A. 8 N",
              "B. 5 N",
              "C. 6 N",
              "D. 4 N"
            ],
            "correct_answer": "D",
            "explanation": "The speed of the object varies with its position as $$v = 4\\sqrt{x}$$, where $$x$$ is the coordinate (in metres) measured along the +x-axis. First convert the mass to SI units: given mass $$m = 500\\,$$g $$= 0.5\\,$$kg. To find the force we need the acceleration. For one-dimensional motion, acceleration can be expressed in terms of position as $$a = v\\,\\frac{dv}{dx}$$ STEP 1 - Differentiate the speed with respect to $$x$$: $$v = 4x^{1/2} \\; \\Rightarrow \\; \\frac{dv}{dx} = 4 \\cdot \\frac{1}{2}x^{-1/2} = 2x^{-1/2}$$ STEP 2 - Use $$a = v\\,\\dfrac{dv}{dx}$$: Substitute $$v = 4x^{1/2}$$ and $$\\dfrac{dv}{dx} = 2x^{-1/2}$$: $$a = \\left(4x^{1/2}\\right)\\left(2x^{-1/2}\\right) = 8 \\text{ m\\,s}^{-2}$$ The acceleration turns out to be a constant $$8 \\text{ m\\,s}^{-2}$$ (independent of $$x$$). STEP 3 - Apply Newton’s second law $$F = ma$$: $$F = 0.5 \\times 8 = 4 \\text{ N}$$ Hence the force acting on the object is $$4 \\text{ N}$$. Therefore, Option D is correct.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A transparent block A having refractive index $$\\mu = 1.25$$ is surrounded by another medium of refractive index $$\\mu = 1.0$$. A light ray is incident on the flat face of the block with incident angle $$\\theta$$. What is the maximum value of $$\\theta$$ for which light suffers total internal reflection at the top surface of the block?",
            "images": [
              {
                "index": 1,
                "filename": "cracku/a-transparent-block-a-having-refrac_img1.png"
              }
            ],
            "options": [
              "A. $$\\tan^{-1}(4/3)$$",
              "B. $$\\tan^{-1}(3/4)$$",
              "C. $$\\sin^{-1}(3/4)$$",
              "D. $$\\cos^{-1}(3/4)$$"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A parallel plate capacitor has charge $$5 \\times 10^{-6}$$ C. A dielectric slab is inserted between the plates and almost fills the space between the plates. If the induced charge on one face of the slab is $$4 \\times 10^{-6}$$ C then the dielectric constant of the slab is _____.",
            "images": [],
            "options": [],
            "correct_answer": "5",
            "explanation": "Let the free charge on the plates of the capacitor be $$Q_f = 5 \\times 10^{-6}\\, \\text{C}$$. When a dielectric slab is inserted, the molecules of the slab polarise and create two layers of induced (bound) charge. The magnitude of the induced charge on either face of the slab is given as $$Q_{\\text{ind}} = 4 \\times 10^{-6}\\, \\text{C}$$. For a parallel-plate capacitor completely (or almost completely) filled with a dielectric of relative permittivity $$K$$, the relation between the free surface charge density $$\\sigma_f$$ and the bound surface charge density $$\\sigma_b$$ is derived as follows: • The electric displacement vector $$\\mathbf{D}$$ inside the dielectric is $$\\mathbf{D} = \\sigma_f \\hat{n}$$ (since $$\\mathbf{D}$$ originates from free charge only). • Electric field inside the dielectric: $$E = \\frac{\\sigma_f}{K \\varepsilon_0}$$. • Polarisation $$P$$ of the dielectric: $$P = \\varepsilon_0 \\chi_e E = \\varepsilon_0 (K-1) E$$, where $$\\chi_e = K-1$$. • Surface bound charge density: $$\\sigma_b = P = \\varepsilon_0 (K-1) \\frac{\\sigma_f}{K \\varepsilon_0} = \\frac{K-1}{K} \\, \\sigma_f$$. Therefore the ratio of the magnitudes of bound to free charge is $$\\frac{Q_{\\text{ind}}}{Q_f} = \\frac{\\sigma_b}{\\sigma_f} = \\frac{K-1}{K}\\;.$$ Substitute the given values: $$\\frac{4 \\times 10^{-6}}{5 \\times 10^{-6}} = \\frac{K-1}{K}$$ $$\\frac{4}{5} = \\frac{K-1}{K}$$ Cross-multiplying: $$5(K-1) = 4K \\quad\\Rightarrow\\quad 5K - 5 = 4K$$ $$K = 5$$ Hence, the dielectric constant of the slab is $$5$$.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "An inductor of reactance 100 $$\\Omega$$, a capacitor of reactance 50 $$\\Omega$$, and a resistor of resistance 50 $$\\Omega$$ are connected in series with an AC source of 10 V, 50 Hz. Average power dissipated by the circuit is _____ W.",
            "images": [],
            "options": [],
            "correct_answer": "1",
            "explanation": "The given components are connected in series, so the circuit is a series $$R\\text{-}L\\text{-}C$$ combination. Resistance: $$R = 50 \\,\\Omega$$ Inductive reactance: $$X_L = 100 \\,\\Omega$$ Capacitive reactance: $$X_C = 50 \\,\\Omega$$ Applied rms voltage: $$V_{\\text{rms}} = 10 \\text{ V}$$ Step 1 Find the net reactance. For a series circuit, the net reactance is the algebraic difference of the individual reactances: $$X = X_L - X_C = 100 - 50 = 50 \\,\\Omega$$ Step 2 Calculate the impedance. For a series $$R\\text{-}L\\text{-}C$$ circuit, the impedance is $$Z = \\sqrt{R^{2} + X^{2}}$$ $$\\Rightarrow Z = \\sqrt{50^{2} + 50^{2}}$$ $$\\Rightarrow Z = \\sqrt{2500 + 2500}$$ $$\\Rightarrow Z = \\sqrt{5000}$$ $$\\Rightarrow Z = 70.71 \\,\\Omega$$ Step 3 Find the rms current. Ohm’s law for ac gives $$I_{\\text{rms}} = \\dfrac{V_{\\text{rms}}}{Z}$$. $$I_{\\text{rms}} = \\dfrac{10}{70.71} = 0.1414 \\text{ A}$$ Step 4 Determine the power factor. Power factor in a series circuit is $$\\cos\\phi = \\dfrac{R}{Z}$$. $$\\cos\\phi = \\dfrac{50}{70.71} = 0.707$$ Step 5 Calculate the average (true) power. Average power dissipated is $$P = V_{\\text{rms}} I_{\\text{rms}} \\cos\\phi$$ Substitute the values: $$P = 10 \\times 0.1414 \\times 0.707$$ $$P = 1.0 \\text{ W}$$ Hence, the average power dissipated by the circuit is 1 W .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "Two cylindrical rods A and B made of different materials, are joined in a straight line. The ratio of lengths, radii and thermal conductivities are: $$\\frac{L_A}{L_B} = \\frac{1}{2}$$, $$\\frac{r_A}{r_B} = 2$$ and $$\\frac{K_A}{K_B} = \\frac{1}{2}$$. The free ends of rods A and B are maintained at 400 K, 200 K respectively. The temperature of rods interface is _____ K,when equilibrium is established.",
            "images": [],
            "options": [],
            "correct_answer": "360",
            "explanation": "For steady one-dimensional conduction through a rod, the heat current is $$Q=\\frac{K\\,A}{L}\\,\\left(T_{\\text{hot}}-T_{\\text{cold}}\\right)$$ When two rods are joined in series, the same heat current $$Q$$ flows through each of them in the steady state. Let $$T$$ be the interface temperature (at the junction of rods A and B). Given ratios $$\\frac{L_A}{L_B}=\\frac12 \\;\\Rightarrow\\; L_A=\\frac{L_B}{2}$$ $$\\frac{r_A}{r_B}=2 \\;\\Rightarrow\\; r_A=2r_B$$ $$\\frac{K_A}{K_B}=\\frac12 \\;\\Rightarrow\\; K_A=\\frac{K_B}{2}$$ Cross-sectional areas: $$A=\\pi r^{2}$$, so $$A_A=\\pi r_A^{2}=\\pi\\,(2r_B)^{2}=4\\pi r_B^{2}=4A_B$$ thus $$\\frac{A_A}{A_B}=4$$. Heat current through rod A: $$Q=\\frac{K_AA_A}{L_A}\\,(400-T)$$ Heat current through rod B: $$Q=\\frac{K_BA_B}{L_B}\\,(T-200)$$ Equate the two heat currents: $$\\frac{K_AA_A}{L_A}\\,(400-T)=\\frac{K_BA_B}{L_B}\\,(T-200)$$ Substitute the ratio values: $$K_A=\\frac{K_B}{2},\\;A_A=4A_B,\\;L_A=\\frac{L_B}{2}$$ $$\\frac{\\left(\\tfrac{K_B}{2}\\right)\\,(4A_B)}{\\tfrac{L_B}{2}}\\,(400-T)=\\frac{K_BA_B}{L_B}\\,(T-200)$$ Simplify the fraction on the left: $$\\frac{(\\tfrac{K_B}{2})\\,(4A_B)}{\\tfrac{L_B}{2}}=\\frac{2K_BA_B}{\\tfrac{L_B}{2}}=\\frac{2K_BA_B\\cdot2}{L_B}=\\frac{4K_BA_B}{L_B}$$ Hence $$\\frac{4K_BA_B}{L_B}\\,(400-T)=\\frac{K_BA_B}{L_B}\\,(T-200)$$ Cancel the common factor $$\\frac{K_BA_B}{L_B}$$ from both sides: $$4(400-T)=T-200$$ Solve for $$T$$: $$1600-4T=T-200$$ $$1600+200=5T$$ $$1800=5T$$ $$T=360\\,\\text{K}$$ The temperature at the interface of the two rods is $$\\mathbf{360\\;K}$$.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "The electric field in a region is given by $$\\vec{E} = (2\\hat{i} + 4\\hat{j} + 6\\hat{k}) \\times 10^3$$ N/C. The flux of the field through a rectangular surface parallel to x-z plane is 6.0 Nm$$^2$$C$$^{-1}$$. The area of the surface is _____ cm$$^2$$.",
            "images": [],
            "options": [],
            "correct_answer": "15",
            "explanation": "",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "M and R be the mass and radius of a disc. A small disc of radius R/3 is removed from the bigger disc. The moment of inertia of remaining part about an axis AB passing through the centre O and perpendicular to the plane of the disc is $$\\frac{4}{x}MR^2$$. The value of x is _____.",
            "images": [
              {
                "index": 1,
                "filename": "cracku/m-and-r-be-the-mass-and-radius-of-a_img1.png"
              }
            ],
            "options": [],
            "correct_answer": "9",
            "explanation": "",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "A photo-emissive substance is illuminated with a radiation of wavelength $$\\lambda_i$$ so that it releases electrons with de-Broglie wavelength $$\\lambda_e$$. The longest wavelength of radiation that can emit photoelectron is $$\\lambda_0$$. Expression for de-Broglie wavelength is given by : (m : mass of the electron, h : Planck's constant and c : speed of light)",
            "images": [],
            "options": [
              "A. $$\\lambda_e = \\frac{h}{\\sqrt{2mc\\left(\\frac{1}{\\lambda_i} - \\frac{1}{\\lambda_0}\\right)}}$$",
              "B. $$\\lambda_e = \\sqrt{\\frac{h\\lambda_0}{2mc}}$$",
              "C. $$\\lambda_e = \\frac{h}{\\sqrt{2mc}\\left(\\frac{1}{\\lambda_i} - \\frac{1}{\\lambda_0}\\right)}$$",
              "D. $$\\lambda_e = \\sqrt{\\frac{h\\lambda_i}{2mc}}$$"
            ],
            "correct_answer": "A",
            "explanation": "For a photo-electric surface, Einstein’s equation relates the energy of the incident photon, the work function of the metal and the maximum kinetic energy of the emitted electron: $$\\frac{hc}{\\lambda_i}= \\frac{hc}{\\lambda_0}+K_{\\max} \\qquad -(1)$$ Here $$\\lambda_i$$ = wavelength of the incident radiation, $$\\lambda_0$$ = threshold (longest) wavelength that can just eject an electron, $$K_{\\max}$$ = maximum kinetic energy of the emitted electron. Re-arranging $$-(1)$$ gives the kinetic energy: $$K_{\\max}=hc\\!\\left(\\frac{1}{\\lambda_i}-\\frac{1}{\\lambda_0}\\right) \\qquad -(2)$$ The de-Broglie wavelength $$\\lambda_e$$ of the emitted electron is related to its momentum $$p$$ by $$\\lambda_e=\\frac{h}{p} \\qquad -(3)$$ Momentum is obtained from kinetic energy using $$p=\\sqrt{2mK_{\\max}}$$, so with $$-(2)$$ $$p=\\sqrt{\\,2m\\,hc\\left(\\frac{1}{\\lambda_i}-\\frac{1}{\\lambda_0}\\right)} \\qquad -(4)$$ Substituting $$-(4)$$ in the de-Broglie relation $$-(3)$$: $$\\lambda_e=\\frac{h}{\\sqrt{\\,2m\\,hc\\left(\\frac{1}{\\lambda_i}-\\frac{1}{\\lambda_0}\\right)}}$$ Comparing with the given options, this expression matches Option A. Hence, the required expression is $$\\displaystyle \\lambda_e=\\frac{h}{\\sqrt{2mhc\\left(\\frac{1}{\\lambda_i}-\\frac{1}{\\lambda_0}\\right)}}$$ and the correct choice is Option A .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          }
        ]
      },
      {
        name: 'Chemistry',
        questions: [
          {
            "question_text": "Given below are two statements : Statement (I) : On hydrolysis, oligo peptides give rise to fewer number of $$\\alpha$$-amino acids while proteins give rise to a large number of $$\\beta$$-amino acids. Statement (II) : Natural proteins are denatured by acids which convert the water soluble form of fibrous proteins to their water insoluble form. In the light of the above statements, choose the most appropriate answer from the options given below :",
            "images": [],
            "options": [
              "A. Both statement I and statement II are correct",
              "B. Statement I is incorrect but Statement II is correct",
              "C. Both statement I and statement II are incorrect",
              "D. Statement I is correct but Statement II is incorrect"
            ],
            "correct_answer": "C",
            "explanation": "Proteins and peptides are condensation polymers of $$\\alpha$$-amino acids, that is, every constituent amino acid possesses its $$-NH_2$$ group on the carbon atom next to the carboxyl group (the $$\\alpha$$-carbon). Case 1: Checking Statement I Oligopeptides contain only a few peptide (amide) linkages, so on complete hydrolysis they furnish only a small number of constituent amino acids. Full-sized proteins are very long chains, so their hydrolysis yields a large number of amino-acid units. However, in every case the amino acids obtained are $$\\alpha$$-amino acids, never $$\\beta$$-amino acids (where the $$-NH_2$$ group would be on the second carbon away from $$-COOH$$). Hence the phrase “large number of $$\\beta$$-amino acids” makes Statement I wrong. Case 2: Checking Statement II Acids, bases, heat, or heavy-metal ions can denature proteins. During denaturation a water-soluble globular protein loses its native three-dimensional shape and often precipitates as an insoluble fibrous mass. Fibrous proteins are themselves normally water insoluble. Therefore acid treatment converts the water-soluble form of a globular protein into an insoluble fibrous form, not “the water-soluble form of fibrous proteins”. Hence Statement II is also wrong. Both statements are incorrect, so the correct choice is Option C.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Mixture of 1 g each of chlorobenzene, aniline and benzoic acid is dissolved in 50 mL ethyl acetate and placed in a separating funnel, 5 M NaOH (30 mL) was added in the same funnel. The funnel was shaken vigorously and then kept aside. The ethyl acetate layer in the funnel contains :",
            "images": [],
            "options": [
              "A. benzoic acid",
              "B. benzoic acid and aniline",
              "C. benzoic acid and chlorobenzene",
              "D. chlorobenzene and aniline"
            ],
            "correct_answer": "D",
            "explanation": "Ethyl acetate is an organic solvent that is immiscible with water, so two separate layers form in a separating funnel. The upper layer (lower density) is ethyl acetate, while the lower layer (higher density) is the aqueous solution of $$5 \\text{ M } NaOH$$. 1. Behaviour of benzoic acid: Benzoic acid is a carboxylic acid. In the presence of the strong base $$NaOH$$ it undergoes neutralisation: $$C_6H_5COOH + NaOH \\rightarrow C_6H_5COONa + H_2O$$. Sodium benzoate $$\\left(C_6H_5COONa\\right)$$ is an ionic salt, highly soluble in water and almost insoluble in ethyl acetate. Hence benzoic acid transfers completely to the aqueous layer as its salt. 2. Behaviour of aniline: Aniline is a weak base. In strongly basic medium ($$5 \\text{ M } NaOH$$) it remains in the free-base (neutral) form $$C_6H_5NH_2$$ because there is no proton source to convert it to the water-soluble ammonium ion $$C_6H_5NH_3^+$$. Neutral aniline is only sparingly soluble in water but is quite soluble in an organic solvent such as ethyl acetate. Therefore aniline stays in the ethyl acetate layer. 3. Behaviour of chlorobenzene: Chlorobenzene is a non-polar, neutral molecule. It does not react with $$NaOH$$ under these conditions and is insoluble in water. Thus chlorobenzene also remains in the ethyl acetate layer. Final distribution: • Aqueous (lower) layer : sodium benzoate (from benzoic acid) and excess $$NaOH$$. • Organic (upper ethyl acetate) layer : chlorobenzene + aniline. Hence the ethyl acetate layer contains chlorobenzene and aniline. Correct Option D: chlorobenzene and aniline .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The hydration energies of $$K^+$$ and $$Cl^-$$ are $$-x$$ and $$-y$$ kJ/mol respectively. If lattice energy of KCl is $$-z$$ kJ/mol, then the heat of solution of KCl is :",
            "images": [],
            "options": [
              "A. $$+x - y - z$$",
              "B. $$x + y + z$$",
              "C. $$z - (x + y)$$",
              "D. $$-z - (x + y)$$"
            ],
            "correct_answer": "C",
            "explanation": "For an ionic solid, the heat (enthalpy) of solution, $$\\Delta H_{\\text{sol}}$$, is obtained in two steps: 1. Lattice dissociation: the crystal breaks into gaseous ions. This requires the lattice dissociation energy, $$\\Delta H_{\\text{lattice(diss)}}$$, which is numerically equal and opposite to the lattice energy of formation. 2. Hydration: the gaseous ions get surrounded by water molecules, releasing their hydration energies. Given data (sign conventions): • Hydration energy of $$K^+ = -x$$ kJ mol$$^{-1}$$ (exothermic) • Hydration energy of $$Cl^- = -y$$ kJ mol$$^{-1}$$ (exothermic) • Lattice energy of formation of KCl $$= -z$$ kJ mol$$^{-1}$$ (exothermic for formation from gaseous ions) Step 1: Lattice dissociation energy Lattice energy of formation is $$-z$$, so the energy required to dissociate the lattice is the opposite sign: $$\\Delta H_{\\text{lattice(diss)}} = +z \\text{ kJ mol}^{-1}$$ Step 2: Hydration of the ions $$\\Delta H_{\\text{hydration}} = (-x) + (-y) = -(x + y) \\text{ kJ mol}^{-1}$$ Overall heat of solution $$\\Delta H_{\\text{sol}} = \\Delta H_{\\text{lattice(diss)}} + \\Delta H_{\\text{hydration}}$$ $$\\Delta H_{\\text{sol}} = \\bigl(+z\\bigr) + \\bigl[-(x + y)\\bigr]$$ $$\\Delta H_{\\text{sol}} = z - (x + y)$$ Therefore the heat of solution of KCl is $$z - (x + y)$$ kJ mol$$^{-1}$$. Hence the correct option is Option C.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "$$A(g) \\to B(g) + C(g)$$ is a first order reaction. The reaction was started with reactant A only. Which of the following expression is correct for rate constant k?",
            "images": [
              {
                "index": 1,
                "filename": "cracku/ag-to-bg-cg-is-a-first-order-reacti_img1.png"
              }
            ],
            "options": [
              "A. $$k = \\frac{1}{t} \\ln \\frac{2(p_\\infty - P_t)}{P_t}$$",
              "B. $$k = \\frac{1}{t} \\ln \\frac{p_\\infty}{P_t}$$",
              "C. $$k = \\frac{1}{t} \\ln \\frac{p_\\infty}{2(p_\\infty - P_t)}$$",
              "D. $$k = \\frac{1}{t} \\ln \\frac{p_\\infty}{(p_\\infty - P_t)}$$"
            ],
            "correct_answer": "C",
            "explanation": "For the gas-phase decomposition $$A(g) \\rightarrow B(g)+C(g)$$ at constant temperature and volume, the total pressure is directly proportional to the total number of moles present at any instant. Let the reaction start with $$a$$ moles of $$A$$ and no $$B$$ or $$C$$. At time $$t$$, let $$x$$ moles of $$A$$ decompose. Moles present at time $$t$$: $$A : a-x$$ $$B : x$$ $$C : x$$ Total moles at time $$t$$ are $$n_t = a-x + x + x = a + x$$. If $$f = \\dfrac{RT}{V}$$ (a common proportionality factor), then initial pressure, $$P_0 = f a$$, pressure at time $$t$$, $$P_t = f (a + x) = P_0 + f x$$ $$-(1)$$ From $$(1)$$, $$x = \\dfrac{P_t - P_0}{f}$$ $$-(2)$$ When the reaction goes to completion ($$t \\rightarrow \\infty$$), $$x = a$$. Total moles then are $$a + a = 2a$$, so the final pressure is $$P_{\\infty} = f(2a) = 2 P_0$$ $$\\Longrightarrow P_0 = \\dfrac{P_{\\infty}}{2}$$ $$-(3)$$ The first-order rate law is $$k = \\dfrac{1}{t} \\ln \\dfrac{\\text{initial concentration of }A}{\\text{concentration of }A\\text{ at time }t}$$, i.e. $$k = \\dfrac{1}{t} \\ln \\dfrac{a}{a - x}$$ $$-(4)$$ Using $$(2)$$, $$a - x = \\dfrac{P_0}{f} - \\dfrac{P_t - P_0}{f} = \\dfrac{2P_0 - P_t}{f}$$. Thus, $$\\dfrac{a}{a - x} = \\dfrac{\\dfrac{P_0}{f}}{\\dfrac{2P_0 - P_t}{f}} = \\dfrac{P_0}{2P_0 - P_t}$$ $$-(5)$$ Substitute $$P_0 = \\dfrac{P_{\\infty}}{2}$$ from $$(3)$$ into $$(5)$$: $$\\dfrac{a}{a - x} = \\dfrac{\\dfrac{P_{\\infty}}{2}}{P_{\\infty} - P_t} = \\dfrac{P_{\\infty}}{2(P_{\\infty} - P_t)}$$ $$-(6)$$ Insert $$(6)$$ into the rate law $$(4)$$: $$k = \\dfrac{1}{t} \\ln \\left[ \\dfrac{P_{\\infty}}{2(P_{\\infty} - P_t)} \\right]$$ This matches Option C. Hence, the correct expression for the first-order rate constant is Case C: $$\\;k = \\dfrac{1}{t} \\ln \\dfrac{p_{\\infty}}{2(p_{\\infty} - P_t)}$$.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "\"P\" is an optically active compound with molecular formula $$C_6H_{12}O$$. When \"P\" is treated with 2,4-dinitrophenylhydrazine, it gives a positive test. However, in presence of Tollens reagent, \"P\" gives a negative test. Predict the structure of \"P\".",
            "images": [
              {
                "index": 1,
                "filename": "cracku/p-is-an-optically-active-compound-w_opta_img1.png"
              },
              {
                "index": 2,
                "filename": "cracku/p-is-an-optically-active-compound-w_optb_img2.png"
              },
              {
                "index": 3,
                "filename": "cracku/p-is-an-optically-active-compound-w_optc_img3.png"
              },
              {
                "index": 4,
                "filename": "cracku/p-is-an-optically-active-compound-w_optd_img4.png"
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
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Choose the incorrect trend in the atomic radii (r) of the elements :",
            "images": [],
            "options": [
              "A. $$r_{Br} < r_K$$",
              "B. $$r_{Mg} < r_{Al}$$",
              "C. $$r_{Rb} < r_{Cs}$$",
              "D. $$r_{Al} < r_{Cs}$$"
            ],
            "correct_answer": "B",
            "explanation": "Atomic radius decreases from left to right across a period because nuclear charge increases while the principal quantum number $$n$$ remains the same. Atomic radius increases down a group because a new shell is added, so the outer electrons are farther from the nucleus despite the higher nuclear charge. We now test each option one by one. Case A: $$r_{Br} \\lt r_{K}$$ Both Br and K lie in the 4th period. K is in Group 1 and Br in Group 17. Moving from Group 1 to Group 17 in the same period, atomic radius must decrease. Hence $$r_{Br} \\lt r_{K}$$ is a correct trend. Case B: $$r_{Mg} \\lt r_{Al}$$ Mg and Al are neighbours in the 3rd period (Mg: Group 2, Al: Group 13). Across a period, radius should decrease, so $$r_{Mg} \\gt r_{Al}$$ in reality. The given inequality reverses this order, so it is incorrect. Case C: $$r_{Rb} \\lt r_{Cs}$$ Rb and Cs belong to Group 1. Going down the group from Rb (5th period) to Cs (6th period), radius increases, i.e. $$r_{Rb} \\lt r_{Cs}$$. This statement is correct. Case D: $$r_{Al} \\lt r_{Cs}$$ Al is in the 3rd period, Cs in the 6th period. Down a group and also across many periods toward the left, Cs becomes much larger than Al, therefore $$r_{Al} \\lt r_{Cs}$$ is also correct. Only Case B shows an inequality opposite to the actual periodic trend, so Case B (Option B) is the incorrect trend. Final answer: Option B.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match List-I with List-II . Choose the correct answer from the options given below :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/match-listi-with-listii-choose-the_img1_8.png"
              }
            ],
            "options": [
              "A. (A)-(II), (B)-(III), (C)-(I), (D)-(IV)",
              "B. (A)-(III), (B)-(IV), (C)-(II), (D)-(I)",
              "C. (A)-(IV), (B)-(III), (C)-(II), (D)-(I)",
              "D. (A)-(IV), (B)-(III), (C)-(I), (D)-(II)"
            ],
            "correct_answer": "C",
            "explanation": "In every conversion a chloride atom on an aromatic ring is being replaced by $$\\!OH$$ to give a phenol. This transformation proceeds by a nucleophilic aromatic substitution (SNAr) of the $$Cl^{-}$$ ion by the nucleophile $$OH^{-}$$. Rate of SNAr increases sharply when the ring has strong $$-I$$ and $$-M$$ groups (such as $$NO_{2}$$) at the ortho and/or para positions. These groups stabilise the intermediate Meisenheimer complex by delocalising the negative charge. Therefore, the more $$NO_{2}$$ groups present, the milder the conditions required for hydrolysis. Arrange the four substrates in increasing ease of hydrolysis: chlorobenzene < p-nitrochlorobenzene < 2,4-dinitrochlorobenzene < picryl chloride (2,4,6-trinitrochlorobenzene). Now match the reagents/conditions given in List-II with this order: Case 1: Chlorobenzene → phenol Very unreactive; Dow’s process is used. Reagents: $$NaOH$$, $$623\\text{ K}$$, $$300\\,\\text{atm}$$, then $$H_{3}O^{+}$$ ⇒ Item (IV). Case 2: p-Nitrochlorobenzene → p-Nitrophenol One $$NO_{2}$$ group activates the ring; moderate temperature is sufficient. Reagents: $$NaOH$$, $$443\\text{ K}$$, then $$H_{3}O^{+}$$ ⇒ Item (III). Case 3: 2,4-Dinitrochlorobenzene → 2,4-Dinitrophenol Two $$NO_{2}$$ groups give higher activation; still milder conditions than above. Reagents: $$NaOH$$, $$368\\text{ K}$$, then $$H_{3}O^{+}$$ ⇒ Item (II). Case 4: Picryl chloride (2,4,6-Trinitrochlorobenzene) → Picric acid (2,4,6-Trinitrophenol) Three $$NO_{2}$$ groups make the ring so activated that simple warming with water suffices. Reagent/condition: warm $$H_{2}O$$ ⇒ Item (I). Thus the correct pairing is: (A) → (IV), (B) → (III), (C) → (II), (D) → (I). Comparing with the options, this corresponds to Option C .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The correct statement amongst the following is :",
            "images": [],
            "options": [
              "A. The term 'standard state' implies that the temperature is 0°C",
              "B. The standard state of pure gas is the pure gas at a pressure of 1 bar and temperature 273 K",
              "C. $$\\Delta_f H^\\theta_{298}$$ is zero for O(g)",
              "D. $$\\Delta_f H^\\theta_{500}$$ is zero for $$O_2(g)$$"
            ],
            "correct_answer": "D",
            "explanation": "The standard state of a substance means the pure substance at a standard pressure of $$1\\;\\text{bar}$$ and at a specified temperature. For most thermodynamic tables this specified temperature is $$298\\;\\text{K}$$, but any temperature can be chosen, provided it is clearly mentioned. Checking each statement one by one: Option A : The statement says the term ‘standard state’ implies the temperature is $$0^{\\circ}\\text{C}$$ ($$273\\;\\text{K}$$). Definition shows that standard state does not fix the temperature; it only fixes the pressure (1 bar). Therefore this statement is false . Option B : It claims “the standard state of a pure gas is the pure gas at a pressure of 1 bar and temperature 273 K”. Again, standard pressure is indeed 1 bar, but the temperature need not be $$273\\;\\text{K}$$. Hence this statement is also false . Option C : It states $$\\Delta_f H^\\theta_{298}$$ is zero for $$O(g)$$. By definition, the standard enthalpy of formation $$\\Delta_f H^\\theta_T$$ of any element in its most stable form at temperature $$T$$ is taken as zero. At $$298\\;\\text{K}$$ the most stable form of oxygen is $$O_2(g)$$, not $$O(g)$$. Therefore $$\\Delta_f H^\\theta_{298} \\neq 0$$ for atomic oxygen $$O(g)$$. Statement C is false . Option D : It says $$\\Delta_f H^\\theta_{500}$$ is zero for $$O_2(g)$$. Even at $$500\\;\\text{K}$$, $$O_2(g)$$ remains the thermodynamically most stable form of oxygen. Hence, by the same definition, $$\\Delta_f H^\\theta_{500} = 0$$ for $$O_2(g)$$. Statement D is true . Since only Option D is correct, the given answer “4” (which corresponds to Option D) is verified.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Liquid A and B form an ideal solution. The vapour pressure of pure liquids A and B are 350 and 750 mm Hg respectively at the same temperature. If $$x_A$$ and $$x_B$$ are the mole fraction of A and B in solution while $$y_A$$ and $$y_B$$ are the mole fraction of A and B in vapour phase then :",
            "images": [],
            "options": [
              "A. $$\\frac{x_A}{x_B} < \\frac{y_A}{y_B}$$",
              "B. $$\\frac{x_A}{x_B} = \\frac{y_A}{y_B}$$",
              "C. $$\\frac{x_A}{x_B} > \\frac{y_A}{y_B}$$",
              "D. $$(x_A - y_A) < (x_B - y_B)$$"
            ],
            "correct_answer": "C",
            "explanation": "For an ideal liquid mixture Raoult’s law is valid. If $$P_A^0$$ and $$P_B^0$$ are the vapour-pressures of the pure liquids, then the partial pressures over the solution are $$p_A = x_A P_A^0$$ and $$p_B = x_B P_B^0$$ $$-(1)$$ The total pressure is $$P = p_A + p_B$$. The mole fractions of the components in the vapour phase are defined as $$y_A = \\frac{p_A}{P}$$ and $$y_B = \\frac{p_B}{P}$$ $$-(2)$$ Divide the two expressions in $$(2)$$: $$\\frac{y_A}{y_B} = \\frac{p_A/P}{p_B/P} = \\frac{p_A}{p_B}$$ Now use $$(1)$$: $$\\frac{y_A}{y_B} = \\frac{x_A P_A^0}{x_B P_B^0} = \\frac{x_A}{x_B}\\,\\frac{P_A^0}{P_B^0}$$ $$-(3)$$ The data given are $$P_A^0 = 350\\ \\text{mm Hg}$$ and $$P_B^0 = 750\\ \\text{mm Hg}$$, so $$\\frac{P_A^0}{P_B^0} = \\frac{350}{750} = 0.467 \\lt 1$$ Substituting into $$(3)$$: $$\\frac{y_A}{y_B} = \\frac{x_A}{x_B}\\,(0.467)$$ Because the multiplier $$0.467$$ is less than $$1$$, we obtain $$\\frac{y_A}{y_B} \\lt \\frac{x_A}{x_B} \\quad\\Longrightarrow\\quad \\frac{x_A}{x_B} \\gt \\frac{y_A}{y_B}$$ Hence the correct relation is given in Option C. Answer - Option C",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "'X' is the number of acidic oxides among $$VO_2$$, $$V_2O_3$$, $$CrO_3$$, $$V_2O_5$$ and $$Mn_2O_7$$. The primary valency of cobalt in $$[Co(H_2NCH_2CH_2NH_3)_3]_2(SO_4)_3$$ is Y. The value of X + Y is :",
            "images": [],
            "options": [
              "A. 5",
              "B. 4",
              "C. 2",
              "D. 3"
            ],
            "correct_answer": "A",
            "explanation": "For acidic‐basic behaviour of transition metal oxides, the general trend is: basic nature at low oxidation state $$\\rightarrow$$ amphoteric $$\\rightarrow$$ acidic at the highest oxidation state. We first write the oxidation state of the metal in each oxide. $$VO_2:\\; V+2(-2)=0 \\Rightarrow V^{+4}$$ $$V_2O_3:\\;2V+3(-2)=0 \\Rightarrow V^{+3}$$ $$CrO_3:\\; Cr+3(-2)=0 \\Rightarrow Cr^{+6}$$ $$V_2O_5:\\;2V+5(-2)=0 \\Rightarrow V^{+5}$$ $$Mn_2O_7:\\;2Mn+7(-2)=0 \\Rightarrow Mn^{+7}$$ Nature of these oxides: • $$V^{+3}$$ oxide ($$V_2O_3$$) is basic. • $$V^{+4}$$ oxide ($$VO_2$$) is amphoteric. • $$V^{+5}$$ oxide ($$V_2O_5$$) is also amphoteric (it reacts both with acids and with alkalies). • $$Cr^{+6}$$ oxide ($$CrO_3$$) is the anhydride of $$H_2CrO_4$$ and is strongly acidic. • $$Mn^{+7}$$ oxide ($$Mn_2O_7$$) is the anhydride of $$HMnO_4$$ and is strongly acidic. Thus only $$CrO_3$$ and $$Mn_2O_7$$ are counted as acidic. Therefore $$X = 2$$ Primary valency (Werner) = oxidation state of the metal. The compound is $$[Co(H_2NCH_2CH_2NH_3)_3]_2(SO_4)_3$$. Each ligand $$(H_2NCH_2CH_2NH_3)$$ is treated as neutral for the charge calculation (only the unprotonated $$NH_2$$ donates the lone pair; the protonated $$NH_3^+$$ part does not donate and its positive charge is balanced internally by the non-coordinating N). Let the oxidation state of cobalt be $$y$$. Charge balance for one complex ion: $$y + 3(0)=\\text{charge of }[CoL_3]^{n+}$$ Overall compound is electrically neutral, so $$2\\bigl(\\text{charge of }[CoL_3]^{n+}\\bigr) + 3(-2)=0 \\; -(1)$$ From $$(1)$$: $$2n - 6 = 0 \\Rightarrow n = +3$$. Hence $$y = +3$$. Therefore the primary valency of cobalt is $$Y = 3$$ Finally, $$X+Y = 2 + 3 = 5$$. Option A is correct.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The descending order of basicity of following amines is : Choose the correct answer from the options given below :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/the-descending-order-of-basicity-of_img1.png"
              }
            ],
            "options": [
              "A. B > E > D > A > C",
              "B. E > D > B > A > C",
              "C. E > D > A > B > C",
              "D. E > A > D > C > B"
            ],
            "correct_answer": "B",
            "explanation": "The basicity of an amine depends on how easily the lone pair on the nitrogen can accept a proton. Greater electron density on N and better stabilization of the resulting ammonium ion both increase basicity. Important effects that decide electron density on nitrogen are: (i) Inductive effect ($$+I$$ or $$-I$$) from alkyl/aryl substituents. (ii) Resonance (mesomeric) effect ($$+M$$ or $$-M$$) that may delocalize or donate electron density. (iii) Hybridisation of the nitrogen (sp$$^3$$ in aliphatic > sp$$^2$$ in aromatic for basicity). Case 1: Aliphatic amines $$CH_3NH_2$$ (D) is a primary aliphatic amine. $$(CH_3)_2NH$$ (E) is a secondary aliphatic amine. Alkyl groups exhibit a $$+I$$ effect. Two alkyl groups in E push more electron density toward N than one alkyl group in D. In aqueous medium, secondary > primary for basicity (tertiary suffers from poor solvation). Hence $$\\text{basicity: } E \\gt D$$. Case 2: Aromatic amines (anilines) In aniline, the lone pair on N is partly delocalised into the benzene ring by resonance, making it less available for protonation; therefore aniline is less basic than aliphatic amines. (A) Aniline - no extra substituent. (B) p-MeO-Aniline - $$\\text{MeO}$$ group shows a strong $$+M$$ (electron-donating) effect, increasing electron density on the ring and on N through resonance, so it is more basic than aniline. (C) p-NO$$_2$$-Aniline - $$NO_2$$ group shows a powerful $$-M$$ (electron-withdrawing) effect, withdrawing electron density from the ring and N, thus making the amine much less basic. Therefore, among the three anilines: $$\\text{basicity: } B \\gt A \\gt C$$. Combining both sets Overall descending basicity order becomes: $$(CH_3)_2NH \\;(E) \\gt CH_3NH_2 \\;(D) \\gt p\\text{-}MeO\\text{-Aniline} \\;(B) \\gt \\text{Aniline} \\;(A) \\gt p\\text{-}NO_2\\text{-Aniline} \\;(C)$$ This matches Option B. Answer: Option B (E > D > B > A > C) .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match List-I with List-II. Choose the correct answer from the options given below :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/match-listi-with-listii-choose-the_img1_9.png"
              }
            ],
            "options": [
              "A. (A)-(III), (B)-(I), (C)-(II), (D)-(IV)",
              "B. (A)-(I), (B)-(IV), (C)-(II), (D)-(III)",
              "C. (A)-(I), (B)-(III), (C)-(II), (D)-(IV)",
              "D. (A)-(II), (B)-(III), (C)-(IV), (D)-(I)"
            ],
            "correct_answer": "B",
            "explanation": "According to Werner’s theory, • the oxidation state of the central metal atom / ion gives the number of primary valencies (ionisable). • the total number of donor atoms directly linked with the metal gives the secondary valencies (coordination number). Case A: Complex : $$[Co(en)_2Cl_2]Cl$$ Step-1 Oxidation state of Co (inside the square bracket): Let it be $$x$$. $$x + 2(0) + 2(-1) = +1\\;$$ (because one $$Cl^-$$ is outside the bracket) $$x - 2 = +1 \\Rightarrow x = +3$$ Primary valencies = $$3$$. Step-2 Coordination number: $$en$$ is bidentate → $$2 \\; en$$ supplies $$2 \\times 2 = 4$$ donor atoms. $$2 \\; Cl^-$$ supplies $$2$$ donor atoms. Total $$= 4 + 2 = 6$$. Secondary valencies = $$6$$. Hence (A) ⟶ (I) (primary 3, secondary 6). Case B: Complex : $$[Pt(NH_3)_2Cl(NO_2)]$$ Step-1 Oxidation state of Pt: Let it be $$x$$. $$x + 2(0) + (-1) + (-1) = 0$$ $$x - 2 = 0 \\Rightarrow x = +2$$ Primary valencies = $$2$$. Step-2 Coordination number: All the four ligands ($$NH_3, NH_3, Cl^- , NO_2^-$$) are monodentate → $$4$$ donor atoms. Secondary valencies = $$4$$. Hence (B) ⟶ (IV) (primary 2, secondary 4). Case C: Complex : $$Hg[Co(SCN)_4]$$ Step-1 Find the charge on the complex anion. Hg is present as $$Hg^+$$ (monovalent mercurous ion). For electrical neutrality, the anion must carry $$-1$$ charge. Step-2 Oxidation state of Co: Let it be $$x$$. $$x + 4(-1) = -1$$ $$x - 4 = -1 \\Rightarrow x = +3$$ Primary valencies = $$3$$. Step-3 Coordination number: Each $$SCN^-$$ is monodentate → $$4$$ donor atoms. Secondary valencies = $$4$$. Hence (C) ⟶ (II) (primary 3, secondary 4). Case D: Complex : $$[Mg(EDTA)]^{2-}$$ Step-1 Oxidation state of Mg: Let it be $$x$$. Charge on $$EDTA$$ ligand $$= -4$$. Total charge on complex $$= -2$$. $$x + (-4) = -2 \\Rightarrow x = +2$$ Primary valencies = $$2$$. Step-2 Coordination number: $$EDTA^{4-}$$ is hexadentate → $$6$$ donor atoms. Secondary valencies = $$6$$. Hence (D) ⟶ (III) (primary 2, secondary 6). Putting the four results together: $$(A)-(I),\\;(B)-(IV),\\;(C)-(II),\\;(D)-(III)$$ Therefore the correct choice is Option B .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match List-I with List-II. Choose the correct answer from the options given below :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/match-listi-with-listii-choose-the_img1_10.png"
              }
            ],
            "options": [
              "A. (A)-(III), (B)-(I), (C)-(IV), (D)-(II)",
              "B. (A)-(II), (B)-(IV), (C)-(I), (D)-(III)",
              "C. (A)-(III), (B)-(IV), (C)-(I), (D)-(II)",
              "D. (A)-(II), (B)-(I), (C)-(IV), (D)-(III)"
            ],
            "correct_answer": "A",
            "explanation": "For each pair we first decide whether the solution shows ideal behaviour, positive deviation or negative deviation from Raoult’s law. Then we match the corresponding properties from List-II. Case A: Chloroform (CHCl₃) + Acetone (CH₃COCH₃) • CHCl₃ has an acidic hydrogen that forms strong hydrogen bonds with the carbonyl oxygen of acetone. • The intermolecular attraction between unlike molecules becomes stronger than that between like molecules. • Stronger attractions ↓ total vapour pressure → these mixtures show negative deviation from Raoult’s law. • Negative deviation gives a solution whose boiling point is higher than either pure component, i.e. a maximum-boiling azeotrope. Thus (A) → (III). Case B: Ethanol (C₂H₅OH) + Water (H₂O) • When ethanol mixes with water, some hydrogen bonds of pure water are broken; the unlike interactions are weaker than the strong H-bond network of water. • Weaker attractions ↑ total vapour pressure → positive deviation from Raoult’s law. • Positive deviation produces a minimum-boiling azeotrope. Thus (B) → (I). Case C: Benzene (C₆H₆) + Toluene (C₆H₅CH₃) • Both are non-polar aromatic liquids with very similar molecular sizes and intermolecular forces. • Their mixture obeys Raoult’s law almost exactly: $$\\Delta H_{mix} = 0$$ and $$\\Delta V_{mix} = 0$$. Thus (C) → (IV). Case D: Acetic acid (CH₃COOH) in Benzene (C₆H₆) • In a non-polar solvent like benzene, acetic acid molecules associate through hydrogen bonding to form dimers: $$2\\,CH_3COOH \\rightleftharpoons (CH_3COOH)_2$$. Thus (D) → (II). Collecting the matches: (A)-(III), (B)-(I), (C)-(IV), (D)-(II). The option having this sequence is Option A. Final answer: Option A.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "In $$SO_2$$, $$NO_2^-$$ and $$N_3^-$$ the hybridizations at the central atom are respectively :",
            "images": [],
            "options": [
              "A. $$sp^2$$, $$sp^2$$ and sp",
              "B. $$sp^2$$, sp and sp",
              "C. $$sp^2$$, $$sp^2$$ and $$sp^2$$",
              "D. sp, $$sp^2$$ and sp"
            ],
            "correct_answer": "A",
            "explanation": "The hybridization of a given atom can be predicted from its steric number. Steric number $$=\\,$$ (number of $$\\sigma$$-bonds around the atom) $$+\\,$$ (number of lone pairs on that atom). Case 1: $$SO_2$$ • Central atom: $$S$$. • Lewis structure: $$O = S - O$$ with one lone pair on $$S$$. • $$\\sigma$$-bonds on $$S = 2$$ (one to each $$O$$). • Lone pairs on $$S = 1$$. Therefore, steric number $$= 2 + 1 = 3$$. Steric number 3 corresponds to $$sp^2$$ hybridization, giving a bent (V-shaped) molecule. Case 2: $$NO_2^-$$ • Central atom: $$N$$. • Lewis structure: $$O = N - O^-$$ (resonance forms) with one lone pair on $$N$$. • $$\\sigma$$-bonds on $$N = 2$$. • Lone pairs on $$N = 1$$. Steric number $$= 2 + 1 = 3$$. Steric number 3 again implies $$sp^2$$ hybridization, giving a bent ion. Case 3: $$N_3^-$$ (azide ion) • Central atom: the middle $$N$$ of $$N - N - N$$. • Resonance structures involve $$N \\equiv N^+ - N^-$$ and $$N^- - N^+ \\equiv N$$, but the central $$N$$ always has: $$\\sigma$$-bonds = 2$$\\,$$(to the terminal nitrogens). Lone pairs = 0 (all its electrons are in bonds or as formal charges on terminals). Steric number $$= 2 + 0 = 2$$. Steric number 2 corresponds to $$sp$$ hybridization, giving a linear ion. Thus, the hybridizations are $$sp^2$$ in $$SO_2$$, $$sp^2$$ in $$NO_2^-$$ and $$sp$$ in $$N_3^-$$. Matching with the options, we select Option A. Answer: Option A",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The number of unpaired electrons responsible for the paramagnetic nature of the following species are respectively : $$[Fe(CN)_6]^{3-}$$, $$[FeF_6]^{3-}$$, $$[CoF_6]^{3-}$$, $$[Mn(CN)_6]^{3-}$$",
            "images": [],
            "options": [
              "A. 1, 5, 4, 2",
              "B. 1, 5, 5, 2",
              "C. 1, 1, 4, 2",
              "D. 1, 4, 4, 2"
            ],
            "correct_answer": "A",
            "explanation": "Case 1: $$[Fe(CN)_6]^{3-}$$ (octahedral) Oxidation state of Fe: $$x + 6(-1) = -3 \\;\\Rightarrow\\; x = +3$$ Electronic configuration of $$Fe^{3+}$$: $$[Ar]\\,3d^5$$ ($$d^5$$ system) $$CN^-$$ is a strong-field ligand, so $$\\Delta_o \\gt P$$ and a low-spin arrangement occurs. Filling the $$t_{2g}$$ and $$e_g$$ orbitals: $$t_{2g}^5\\,e_g^0$$ Of the five $$t_{2g}$$ electrons, four pair up and one remains single → unpaired electrons = $$1$$. Case 2: $$[FeF_6]^{3-}$$ (octahedral) Oxidation state of Fe is again $$+3$$, so $$Fe^{3+}$$ has $$d^5$$. $$F^-$$ is a weak-field ligand, therefore $$\\Delta_o \\lt P$$ and a high-spin complex forms. Filling pattern: $$t_{2g}^3\\,e_g^2$$ Each of the five $$d$$ electrons occupies a separate orbital → unpaired electrons = $$5$$. Case 3: $$[CoF_6]^{3-}$$ (octahedral) Oxidation state of Co: $$x + 6(-1) = -3 \\;\\Rightarrow\\; x = +3$$ Electronic configuration of $$Co^{3+}$$: $$[Ar]\\,3d^6$$ ($$d^6$$ system) With weak-field $$F^-$$ ligands (high-spin): Filling pattern: $$t_{2g}^4\\,e_g^2$$ Diagrammatically, two $$t_{2g}$$ orbitals contain one unpaired electron each and both $$e_g$$ orbitals contain one unpaired electron each. Hence unpaired electrons = $$4$$. Case 4: $$[Mn(CN)_6]^{3-}$$ (octahedral) Oxidation state of Mn: $$x + 6(-1) = -3 \\;\\Rightarrow\\; x = +3$$ Electronic configuration of $$Mn^{3+}$$: $$[Ar]\\,3d^4$$ ($$d^4$$ system) $$CN^-$$ is a strong-field ligand; the complex is low-spin: Filling pattern: $$t_{2g}^4\\,e_g^0$$ The four $$t_{2g}$$ electrons produce two paired and two unpaired electrons → unpaired electrons = $$2$$. Therefore, the numbers of unpaired electrons are $$[Fe(CN)_6]^{3-}: 1,\\quad [FeF_6]^{3-}: 5,\\quad [CoF_6]^{3-}: 4,\\quad [Mn(CN)_6]^{3-}: 2$$. This matches Option A: $$1,\\,5,\\,4,\\,2$$.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The number of optically active products obtained from the complete ozonolysis of the given compound is :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/the-number-of-optically-active-prod_img1.png"
              }
            ],
            "options": [
              "A. 2",
              "B. 0",
              "C. 1",
              "D. 4"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Given below are two statements : In the light of the above statements, choose the most appropriate answer from the options given below :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/given-below-are-two-statements-in-t_img1_3.png"
              }
            ],
            "options": [
              "A. Statement I is correct but statement II is incorrect",
              "B. Statement I is incorrect but statement II is correct",
              "C. Both statement I and statement II are incorrect",
              "D. Both statement I and statement II are correct"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The extra stability of half-filled subshell is due to : (A) Symmetrical distribution of electrons (B) Smaller coulombic repulsion energy (C) The presence of electrons with the same spin in non-degenerate orbitals (D) Larger exchange energy (E) Relatively smaller shielding of electrons by one another Identify the correct statements",
            "images": [],
            "options": [
              "A. (B), (D) and (E) only",
              "B. (A), (B), (D) and (E) only",
              "C. (B), (C) and (D) only",
              "D. (A), (B) and (D) only"
            ],
            "correct_answer": "B",
            "explanation": "The concept of “extra stability of half-filled subshells” is explained by Hund’s rule. According to this rule, when orbitals of equal energy (degenerate orbitals) are available, electrons occupy them singly with parallel spins before pairing begins. Three physical arguments support the added stability of a half-filled configuration. 1. Symmetrical distribution of charge For a half-filled subshell, the probability cloud of electrons is distributed as uniformly as possible around the nucleus. This symmetry lowers the potential energy of the atom. Hence Statement (A) is correct. 2. Smaller coulombic repulsion and smaller shielding When each degenerate orbital holds just one electron, there is no intra-orbital electron-electron repulsion. Inter-orbital repulsion is also reduced because the electrons tend to stay farther apart. Less repulsion means lower potential energy, and the mutual shielding of nuclear charge is also reduced. Thus both Statement (B) (“smaller coulombic repulsion energy”) and Statement (E) (“relatively smaller shielding of electrons by one another”) are correct. 3. Larger exchange energy If there are $$n$$ electrons with parallel spins in a set of degenerate orbitals, the number of possible exchanges between them is $$\\frac{n(n-1)}{2}$$. Each exchange lowers the energy slightly. A half-filled subshell maximises the number of such exchanges, giving the greatest lowering of energy. Therefore Statement (D) is correct. 4. Incorrect wording in Statement (C) Statement (C) talks about “presence of electrons with the same spin in non-degenerate orbitals”. Hund’s rule applies to degenerate orbitals (same energy), not non-degenerate ones. So Statement (C) is incorrect. Collecting the valid statements: (A), (B), (D) and (E). Hence the correct option is Option B .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The correct statements from the following are : (A) $$Tl^{3+}$$ is a powerful oxidising agent (B) $$Al^{3+}$$ does not get reduced easily (C) Both $$Al^{3+}$$ and $$Tl^{3+}$$ are very stable in solution (D) $$Tl^+$$ is more stable than $$Tl^{3+}$$ (E) $$Al^{3+}$$ and $$Tl^+$$ are highly stable",
            "images": [],
            "options": [
              "A. (A), (B), (C), (D) and (E)",
              "B. (A), (B), (D) and (E) only",
              "C. (B), (D) and (E) only",
              "D. (A), (C) and (D) only"
            ],
            "correct_answer": "B",
            "explanation": "The elements of Group 13 show two common oxidation states: $$+3$$ (using all three valence electrons) and $$+1$$ (arising from the inert-pair effect, where the $$ns^2$$ electrons remain non-bonding). Down the group, the inert-pair effect becomes stronger, so the stability trend is $$\\text{for }M = B,\\,Al,\\,Ga,\\,In,\\,Tl:\\qquad \\text{Stability of }(+3) \\text{ decreases while stability of }(+1) \\text{ increases}.$$ Applying this to aluminium and thallium: • Aluminium ($$Z=13$$) lies near the top of the group, so the inert-pair effect is weak. Hence $$Al^{3+}$$ is highly stable and does not reduce (gain electrons) easily. • Thallium ($$Z=81$$) is at the bottom, where the inert-pair effect is very strong. Therefore $$Tl^{+}$$ is far more stable than $$Tl^{3+}$$. Because $$Tl^{3+}$$ tends to gain two electrons and change to the more stable $$Tl^{+}$$ state, $$Tl^{3+}$$ behaves as a powerful oxidising agent. Now judge each given statement: Statement (A) $$Tl^{3+}$$ is a powerful oxidising agent. Reason: $$Tl^{3+} + 2e^- \\rightarrow Tl^{+}$$ is highly favoured. Statement (A) is correct. Statement (B) $$Al^{3+}$$ does not get reduced easily. Reason: $$Al^{3+}$$ is already the most stable state for aluminium. Statement (B) is correct. Statement (C) Both $$Al^{3+}$$ and $$Tl^{3+}$$ are very stable in solution. We have just seen that $$Tl^{3+}$$ is not very stable; it readily converts to $$Tl^{+}$$. Statement (C) is incorrect. Statement (D) $$Tl^{+}$$ is more stable than $$Tl^{3+}$$. Matches the inert-pair effect trend. Statement (D) is correct. Statement (E) $$Al^{3+}$$ and $$Tl^{+}$$ are highly stable. Both ions correspond to the preferred oxidation state of their respective elements. Statement (E) is correct. The correct set of statements is (A), (B), (D) and (E). Hence the answer is Option B .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Given below are two statements : 1 M aqueous solution of each of $$Cu(NO_3)_2$$, $$AgNO_3$$, $$Hg_2(NO_3)_2$$; $$Mg(NO_3)_2$$ are electrolysed using inert electrodes. Given : $$E_{Ag^{+}/Ag}^{\\theta} = 0.80V, E_{Hg_{2}^{2+}/Hg}^{\\theta} = 0.79V,$$ $$E_{Cu^{2+}/Cu}^{\\theta} = 0.24V$$ and $$E_{Mg^{2+}/Mg}^{\\theta} = -2.37V$$ Statement (I) : With increasing voltage, the sequence of deposition of metals on the cathode will be Ag, Hg and Cu Statement (II) : Magnesium will not be deposited at cathode instead oxygen gas will be evolved at the cathode. In the light of the above statement, choose the most appropriate answer from the options given below :",
            "images": [],
            "options": [
              "A. Both statement I and statement II are incorrect",
              "B. Statement I is correct but Statement II is incorrect",
              "C. Both statement I and statement II are correct",
              "D. Statement I is incorrect but Statement II is correct"
            ],
            "correct_answer": "B",
            "explanation": "For electrolysis using inert electrodes we compare the standard reduction potentials $$E^{\\circ}$$ of all possible cathodic reactions. The species having the highest (most positive) $$E^{\\circ}$$ gets reduced (deposited) first. All solutions are 1 M, so the numerical values of $$E^{\\circ}$$ may be used directly without any Nernst correction. Standard reduction potentials involved: $$Ag^{+}+e^{-}\\rightarrow Ag;\\;E^{\\circ}=+0.80\\;{\\rm V}$$ $$Hg_2^{2+}+2e^{-}\\rightarrow 2Hg;\\;E^{\\circ}=+0.79\\;{\\rm V}$$ $$Cu^{2+}+2e^{-}\\rightarrow Cu;\\;E^{\\circ}=+0.34\\;{\\rm V}$$ Because $$E^{\\circ}_{Ag^{+}/Ag}\\gt E^{\\circ}_{Hg_2^{2+}/Hg}\\gt E^{\\circ}_{Cu^{2+}/Cu}$$, the sequence of metal deposition on the cathode as the external voltage is increased will be Ag (first) → Hg (second) → Cu (third). Therefore Statement I is correct. For the magnesium salt two possible cathodic reductions are important: $$Mg^{2+}+2e^{-}\\rightarrow Mg;\\;E^{\\circ}=-2.37\\;{\\rm V}$$ $$2H_2O+2e^{-}\\rightarrow H_2+2OH^{-};\\;E^{\\circ}=-0.83\\;{\\rm V}$$ The reduction of water (giving hydrogen gas) requires a far smaller over-potential than the reduction of $$Mg^{2+}$$. Hence, at the cathode hydrogen gas will evolve, and metallic magnesium will not be deposited. Oxygen gas is produced at the anode (oxidation of water), not at the cathode. Thus Statement II is incorrect. Conclusion: Statement I is correct, Statement II is incorrect → Option B.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Only litre buffer solution was prepared by adding 0.10 mol each of $$NH_3$$ and $$NH_4Cl$$ in deionised water. The change in pH on addition of 0.05 mol of HCl to the above solution is _____ $$\\times 10^{-2}$$.(Nearest integer) (Given : $$pK_b$$ of $$NH_3$$ = 4.745 and $$\\log_{10}3 = 0.477$$)",
            "images": [],
            "options": [],
            "correct_answer": "48",
            "explanation": "For a basic buffer the Henderson-Hasselbalch form is $$\\mathrm{pOH}=pK_b+\\log\\left(\\frac{[\\text{salt}]}{[\\text{base}]}\\right)$$ Case 1: Before adding HCl Number of moles of $$NH_3 = 0.10$$ mol, number of moles of $$NH_4Cl = 0.10$$ mol in $$1\\,$$L, so $$[\\text{base}]=0.10\\ \\text{M},\\;[\\text{salt}]=0.10\\ \\text{M}$$ $$\\frac{[\\text{salt}]}{[\\text{base}]}=1 \\;\\Longrightarrow\\; \\log 1 = 0$$ $$\\therefore \\mathrm{pOH}_1 = pK_b + 0 = 4.745$$ $$\\mathrm{pH}_1 = 14 - \\mathrm{pOH}_1 = 14 - 4.745 = 9.255$$ Case 2: After adding $$0.05$$ mol HCl The strong acid reacts completely: $$NH_3 + H^+ \\rightarrow NH_4^+$$ Moles after reaction: $$NH_3: 0.10 - 0.05 = 0.05\\ \\text{mol}$$ $$NH_4^+: 0.10 + 0.05 = 0.15\\ \\text{mol}$$ With total volume still $$1\\,$$L, $$[\\text{base}]=0.05\\ \\text{M},\\;[\\text{salt}]=0.15\\ \\text{M}$$ $$\\frac{[\\text{salt}]}{[\\text{base}]} =\\frac{0.15}{0.05}=3,\\;\\; \\log 3 = 0.477$$ $$\\mathrm{pOH}_2 = pK_b + 0.477 = 4.745 + 0.477 = 5.222$$ $$\\mathrm{pH}_2 = 14 - 5.222 = 8.778$$ Change in pH $$\\Delta\\mathrm{pH} = \\mathrm{pH}_1 - \\mathrm{pH}_2 = 9.255 - 8.778 = 0.477 \\approx 0.48$$ Expressed as $$\\Delta\\mathrm{pH}=48 \\times 10^{-2}$$.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "In Dumas' method 292 mg of an organic compound released 50 mL of nitrogen gas ($$N_2$$) at 300 K temperature and 715 mm Hg pressure. The percentage composition of 'N' in the organic compound is _____ %.(Nearest integer) (Aqueous tension at 300 K = 15 mm Hg)",
            "images": [],
            "options": [],
            "correct_answer": "18",
            "explanation": "Mass of organic compound taken: $$m_{\\text{compound}} = 292 \\text{ mg} = 0.292 \\text{ g}$$. Volume of $$N_2$$ collected: $$V = 50 \\text{ mL} = 0.050 \\text{ L}$$. Temperature: $$T = 300 \\text{ K}$$. Total pressure: $$P_{\\text{total}} = 715 \\text{ mm Hg}$$. Aqueous tension (vapour pressure of water): $$P_{\\text{H}_2O} = 15 \\text{ mm Hg}$$. First remove the vapour-pressure contribution to get the pressure of dry nitrogen. $$P_{N_2} = P_{\\text{total}} - P_{\\text{H}_2O} = 715 - 15 = 700 \\text{ mm Hg}$$. Convert this pressure into atmospheres (1 atm = 760 mm Hg): $$P_{N_2} = \\frac{700}{760} \\text{ atm} = 0.9211 \\text{ atm}$$. Use the ideal-gas equation $$PV = nRT$$. Take $$R = 0.0821 \\text{ L atm mol}^{-1}\\text{K}^{-1}$$. $$n = \\frac{P V}{R T} = \\frac{0.9211 \\times 0.050}{0.0821 \\times 300} \\text{ mol}$$. $$n = 0.00187 \\text{ mol of } N_2$$. Molar mass of $$N_2$$ is $$28 \\text{ g mol}^{-1}$$, so the mass of nitrogen obtained is $$m_N = n \\times 28 = 0.00187 \\times 28 = 0.0524 \\text{ g} = 52.4 \\text{ mg}$$. Percentage of nitrogen in the organic compound: $$\\%N = \\frac{m_N}{m_{\\text{compound}}} \\times 100 = \\frac{0.0524}{0.292} \\times 100 = 17.94 \\% \\approx 18 \\%$$. Hence, the percentage composition of nitrogen in the organic compound is 18 % .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "Butane reacts with oxygen to produce carbon dioxide and water following the equation given below $$C_4H_{10}(g) + \\frac{13}{2}O_2(g) \\to 4CO_2(g) + 5H_2O(l)$$. If 174.0 kg of butane is mixed with 320.0 kg of $$O_2$$, the volume of water formed in litres is _____.(Nearest integer) [Given : (a) Molar mass of C, H, O are 12, 1, 16 g $$mol^{-1}$$ respectively, (b) Density of water = 1 g $$mL^{-1}$$]",
            "images": [],
            "options": [],
            "correct_answer": "138",
            "explanation": "Molar masses (in $$\\mathrm{g\\;mol^{-1}}$$): $$C_4H_{10}=58$$, $$O_2 = 32$$, $$H_2O = 18$$. Moles of butane mixed $$n_{C_4H_{10}}=\\frac{174.0\\times10^{3}}{58}=3000\\;\\text{mol}$$ Moles of oxygen mixed $$n_{O_2}=\\frac{320.0\\times10^{3}}{32}=10000\\;\\text{mol}$$ Balanced equation (fractional coefficients as given) : $$C_4H_{10}+ \\frac{13}{2}O_2 \\rightarrow 4CO_2 + 5H_2O$$ Stoichiometric ratios $$1\\;\\text{mol}\\;C_4H_{10} \\;:\\; \\frac{13}{2}=6.5\\;\\text{mol}\\;O_2$$ $$1\\;\\text{mol}\\;C_4H_{10} \\;:\\; 5\\;\\text{mol}\\;H_2O$$ Oxygen needed for the available butane $$3000 \\times 6.5 = 19500\\;\\text{mol}\\;O_2$$ Only $$10000\\;\\text{mol}\\;O_2$$ are present, so $$O_2$$ is the limiting reagent. From the equation, $$6.5\\;\\text{mol}\\;O_2 \\rightarrow 5\\;\\text{mol}\\;H_2O$$, or $$n_{H_2O} = n_{O_2}\\times\\frac{5}{6.5} = 10000\\times\\frac{5}{6.5} = 10000\\times\\frac{10}{13} = 7692.3077\\;\\text{mol}$$ Mass of water formed $$m_{H_2O} = 7692.3077 \\times 18 = 1.3846 \\times 10^{5}\\;\\text{g} = 138.46\\;\\text{kg}$$ Density of liquid water $$\\approx 1\\;\\text{kg L}^{-1}$$, therefore $$V_{H_2O} = 138.46\\;\\text{kg}\\times\\frac{1\\;\\text{L}}{1\\;\\text{kg}} \\approx 138\\;\\text{L}$$ Hence, the volume of water produced is about $$\\mathbf{138\\;L}$$.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "The number of paramagnetic metal complex species among $$[Co(NH_3)_6]^{3+}$$, $$[Co(C_2O_4)_3]^{3-}$$, $$[MnCl_6]^{3-}$$, $$[Mn(CN)_6]^{3-}$$, $$[CoF_6]^{3-}$$, $$[Fe(CN)_6]^{3-}$$ and $$[FeF_6]^{3-}$$ with same number of unpaired electrons is _____.",
            "images": [],
            "options": [],
            "correct_answer": "2",
            "explanation": "First find the oxidation state of the metal ion and its $$d$$-electron count in every complex. Then decide whether the ligand present is a strong-field (low-spin) or weak-field (high-spin) ligand. This gives the number of unpaired electrons, $$n_{u}$$, in each complex. Case 1: $$[Co(NH_3)_6]^{3+}$$ Co: atomic number $$27 \\Rightarrow [Ar]\\,3d^7\\,4s^2$$. Oxidation state $$=+3 \\Rightarrow Co^{3+}: d^{6}$$. $$NH_3$$ is an intermediate-strong field ligand for $$Co^{3+}$$, so the complex is low spin: $$t_{2g}^{6}e_g^{0} \\Rightarrow n_u = 0$$ (diamagnetic). Case 2: $$[Co(C_2O_4)_3]^{3-}$$ $$C_2O_4^{2-}$$ is a bidentate, moderate field ligand. For $$Co^{3+}(d^{6})$$ its crystal-field splitting is still large enough to give low spin: $$t_{2g}^{6}e_g^{0} \\Rightarrow n_u = 0$$ (diamagnetic). Case 3: $$[MnCl_6]^{3-}$$ Let the oxidation number of Mn be $$x$$: $$x + 6(-1) = -3 \\Rightarrow x = +3 \\Rightarrow Mn^{3+}: d^{4}$$. $$Cl^-$$ is a weak-field ligand ⇒ high spin: $$t_{2g}^{3}e_g^{1}$$ has $$4$$ unpaired electrons, $$n_u = 4$$. Case 4: $$[Mn(CN)_6]^{3-}$$ Same oxidation calculation gives $$Mn^{3+}: d^{4}$$. $$CN^-$$ is a strong-field ligand ⇒ low spin: $$t_{2g}^{4}e_g^{0}$$ (two orbitals singly-filled, one paired) gives $$n_u = 2$$. Case 5: $$[CoF_6]^{3-}$$ Charge balance: $$Co^{3+}: d^{6}$$. $$F^-$$ is weak-field ⇒ high spin for $$d^{6}$$: $$t_{2g}^{4}e_g^{2}$$ gives $$n_u = 4$$. Case 6: $$[Fe(CN)_6]^{3-}$$ $$Fe^{3+}: d^{5}$$ (since $$x+6(-1)=-3 \\Rightarrow x=+3$$). Strong-field $$CN^-$$ ⇒ low spin: $$t_{2g}^{5}e_g^{0}$$ gives $$n_u = 1$$. Case 7: $$[FeF_6]^{3-}$$ $$Fe^{3+}: d^{5}$$. Weak-field $$F^-$$ ⇒ high spin: $$t_{2g}^{3}e_g^{2}$$ gives $$n_u = 5$$. Collect the results: $$\\begin{array}{lcl} [Co(NH_3)_6]^{3+} &:& n_u = 0 \\\\ [Co(C_2O_4)_3]^{3-} &:& n_u = 0 \\\\ [MnCl_6]^{3-} &:& n_u = 4 \\\\ [Mn(CN)_6]^{3-} &:& n_u = 2 \\\\ [CoF_6]^{3-} &:& n_u = 4 \\\\ [Fe(CN)_6]^{3-} &:& n_u = 1 \\\\ [FeF_6]^{3-} &:& n_u = 5 \\end{array}$$ Remove the diamagnetic complexes ($$n_u = 0$$). The remaining paramagnetic ones and their $$n_u$$ values are: $$[MnCl_6]^{3-}: 4,\\; [Mn(CN)_6]^{3-}: 2,\\; [CoF_6]^{3-}: 4,\\; [Fe(CN)_6]^{3-}: 1,\\; [FeF_6]^{3-}: 5$$. Only $$[MnCl_6]^{3-}$$ and $$[CoF_6]^{3-}$$ share the same number of unpaired electrons ($$n_u = 4$$). Hence, the number of paramagnetic complexes having an identical count of unpaired electrons is $$\\boxed{2}$$.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "Identify the structure of the final product (D) in the following sequence of reactions: Total number of $$sp^2$$ hybridised carbon atoms in product D is _____.",
            "images": [
              {
                "index": 1,
                "filename": "cracku/identify-the-structure-of-the-final_img1.png"
              }
            ],
            "options": [],
            "correct_answer": "7",
            "explanation": "",
            "year": 2025,
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
            "question_text": "If the orthocentre of the triangle formed by the lines $$y = x + 1$$, $$y = 4x - 8$$ and $$y = mx + c$$ is at $$(3, -1)$$, then $$m - c$$ is :",
            "images": [],
            "options": [
              "A. 0",
              "B. $$-2$$",
              "C. 4",
              "D. 2"
            ],
            "correct_answer": "A",
            "explanation": "The three sides of the triangle are $$L_1: y = x + 1 \\quad (m_1 = 1),$$ $$L_2: y = 4x - 8 \\quad (m_2 = 4),$$ $$L_3: y = mx + c \\quad (m_3 = m).$$ Their orthocentre is given to be $$H(3,-1).$$ Step 1: Find the vertex opposite to $$L_3$$. Intersect $$L_1$$ and $$L_2$$: $$x + 1 = 4x - 8 \\;\\Longrightarrow\\; 3x = 9 \\;\\Longrightarrow\\; x = 3,$$ $$y = 3 + 1 = 4.$$ Hence $$C(3,\\,4).$$ Vertex $$C$$ is opposite the side $$L_3.$$ Step 2: Use the orthocentre to obtain the slope of $$L_3$$. Altitude through $$C$$ must pass through $$H(3,-1).$$ Slope of $$CH$$ is $$\\frac{-1 - 4}{\\,3 - 3\\,} = \\frac{-5}{0} \\; \\Longrightarrow\\; \\text{vertical line } x = 3.$$ Therefore $$L_3$$, being perpendicular to this altitude, must be horizontal: $$m = 0 \\; \\Longrightarrow\\; L_3: y = c.$$ Step 3: Express the remaining two vertices in terms of $$c$$. Intersection of $$L_1$$ with $$L_3$$ gives $$y = c = x + 1 \\;\\Longrightarrow\\; B(c - 1,\\,c).$$ Intersection of $$L_2$$ with $$L_3$$ gives $$y = c = 4x - 8 \\;\\Longrightarrow\\; x = \\frac{c + 8}{4},$$ so $$A\\left(\\frac{c + 8}{4},\\,c\\right).$$ Step 4: Use the altitude from $$A$$ to determine $$c$$. Slope of side $$BC$$ is $$\\frac{4 - c}{3 - (c - 1)} = \\frac{4 - c}{4 - c} = 1.$$ Hence the altitude from $$A$$ is perpendicular to $$BC$$, so its slope is $$-1.$$ Equation of the altitude passing through the orthocentre $$H(3,-1)$$ is $$y + 1 = -1\\bigl(x - 3\\bigr) \\;\\Longrightarrow\\; y = -x + 2.$$ This altitude must also pass through $$A$$: $$c = -\\frac{c + 8}{4} + 2.$$ Multiply by 4: $$4c = -(c + 8) + 8 = -c.$$ Therefore $$5c = 0 \\;\\Longrightarrow\\; c = 0.$$ Step 5: Compute $$m - c$$. We have $$m = 0$$ and $$c = 0,$$ hence $$m - c = 0 - 0 = 0.$$ Thus $$m - c = 0.$$ Option A is correct.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$\\vec{a}$$ and $$\\vec{b}$$ be the vectors of the same magnitude such that $$\\frac{|\\vec{a}+\\vec{b}|+|\\vec{a}-\\vec{b}|}{|\\vec{a}+\\vec{b}|-|\\vec{a}-\\vec{b}|} = \\sqrt{2}+1$$. Then $$\\frac{|\\vec{a}+\\vec{b}|^2}{|\\vec{a}|^2}$$ is :",
            "images": [],
            "options": [
              "A. $$2 + 4\\sqrt{2}$$",
              "B. $$1 + \\sqrt{2}$$",
              "C. $$2 + \\sqrt{2}$$",
              "D. $$4 + 2\\sqrt{2}$$"
            ],
            "correct_answer": "C",
            "explanation": "Let the common magnitude of the two vectors be $$|\\vec a| = |\\vec b| = m$$ and let the angle between them be $$\\theta$$. Using the cosine rule for vectors: $$|\\vec a + \\vec b| = \\sqrt{m^2 + m^2 + 2m^2 \\cos\\theta} = m\\sqrt{2(1+\\cos\\theta)}$$ $$|\\vec a - \\vec b| = \\sqrt{m^2 + m^2 - 2m^2 \\cos\\theta} = m\\sqrt{2(1-\\cos\\theta)}$$ Rewrite these with the half-angle substitution $$\\theta = 2x$$ (so $$x = \\theta/2$$): $$|\\vec a + \\vec b| = 2m\\cos x$$ $$|\\vec a - \\vec b| = 2m\\sin x$$ The given ratio becomes $$\\frac{|\\vec a+\\vec b| + |\\vec a-\\vec b|}{|\\vec a+\\vec b| - |\\vec a-\\vec b|} = \\frac{2m(\\cos x + \\sin x)}{2m(\\cos x - \\sin x)} = \\frac{\\cos x + \\sin x}{\\cos x - \\sin x}$$ This ratio equals $$\\sqrt{2}+1$$, hence $$\\frac{\\cos x + \\sin x}{\\cos x - \\sin x} = \\sqrt{2}+1 \\; -(1)$$ Cross-multiplying in $$(1)$$: $$\\cos x + \\sin x = (\\sqrt{2}+1)(\\cos x - \\sin x)$$ $$\\cos x + \\sin x - (\\sqrt{2}+1)\\cos x + (\\sqrt{2}+1)\\sin x = 0$$ $$\\cos x(1-\\sqrt{2}-1) + \\sin x(1+\\sqrt{2}+1) = 0$$ $$\\cos x(-\\sqrt{2}) + \\sin x(\\sqrt{2}+2) = 0$$ $$\\tan x = \\frac{\\sqrt{2}}{\\sqrt{2}+2} \\; -(2)$$ The quantity required is $$\\frac{|\\vec a+\\vec b|^{2}}{|\\vec a|^{2}} = \\frac{(2m\\cos x)^{2}}{m^{2}} = 4\\cos^{2}x \\; -(3)$$ From $$(2)$$, set $$\\tan x = t = \\dfrac{\\sqrt{2}}{\\sqrt{2}+2}$$. Then $$\\cos^{2}x = \\frac{1}{1+t^{2}}$$ Compute $$t^{2}$$: $$t^{2} = \\frac{2}{(\\sqrt{2}+2)^{2}} = \\frac{2}{6+4\\sqrt{2}} = \\frac{1}{3+2\\sqrt{2}}$$ Hence $$1+t^{2} = 1 + \\frac{1}{3+2\\sqrt{2}} = \\frac{4+2\\sqrt{2}}{3+2\\sqrt{2}}$$ Insert this into $$(3)$$: $$4\\cos^{2}x = \\frac{4}{1+t^{2}} = 4 \\cdot \\frac{3+2\\sqrt{2}}{4+2\\sqrt{2}}$$ $$= \\frac{12 + 8\\sqrt{2}}{4 + 2\\sqrt{2}} = \\frac{6 + 4\\sqrt{2}}{2 + \\sqrt{2}} = 2 + \\sqrt{2}$$ Therefore, $$\\frac{|\\vec a + \\vec b|^{2}}{|\\vec a|^{2}} = 2 + \\sqrt{2}$$ The correct choice is Option C .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$A = \\{(\\alpha, \\beta) \\in \\mathbf{R} \\times \\mathbf{R} : |\\alpha - 1| \\le 4 \\text{ and } |\\beta - 5| \\le 6\\}$$ and $$B = \\{(\\alpha, \\beta) \\in \\mathbf{R} \\times \\mathbf{R} : 16(\\alpha - 2)^2 + 9(\\beta - 6)^2 \\le 144\\}$$. Then",
            "images": [],
            "options": [
              "A. $$B \\subset A$$",
              "B. $$A \\cup B = \\{(x,y) : -4 \\le x \\le 4, -1 \\le y \\le 11\\}$$",
              "C. neither $$A \\subset B$$ nor $$B \\subset A$$",
              "D. $$A \\subset B$$"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "If the range of the function $$f(x) = \\frac{5 - x}{x^2 - 3x + 2}$$, $$x \\ne 1, 2$$, is $$(-\\infty, \\alpha] \\cup [\\beta, \\infty)$$, then $$\\alpha^2 + \\beta^2$$ is equal to :",
            "images": [],
            "options": [
              "A. 190",
              "B. 192",
              "C. 188",
              "D. 194"
            ],
            "correct_answer": "D",
            "explanation": "Let the given function be $$y = f(x) = \\frac{5 - x}{x^{2} - 3x + 2}$$, where $$x \\neq 1,\\,2$$ because the denominator $$x^{2} - 3x + 2 = (x - 1)(x - 2)$$ vanishes at these points. To find the range we eliminate $$x$$. Cross-multiply: $$y(x^{2} - 3x + 2) = 5 - x$$ Rearrange into a quadratic in $$x$$: $$y x^{2} - 3y x + 2y + x - 5 = 0$$ Group like terms: $$y x^{2} + (-3y + 1)x + (2y - 5) = 0 \\quad -(1)$$ For a given real $$y$$ to lie in the range, equation $$(1)$$ must have at least one real root $$x$$ that is different from $$1$$ and $$2$$. The first requirement is that its discriminant is non-negative. Discriminant $$\\Delta$$ of $$(1)$$: $$\\Delta = (-3y + 1)^{2} - 4y(2y - 5)$$ Simplify: $$\\Delta = 9y^{2} - 6y + 1 - 8y^{2} + 20y = y^{2} + 14y + 1$$ Thus real roots exist when $$y^{2} + 14y + 1 \\ge 0 \\quad -(2)$$ Factor $$(2)$$ by finding its roots. Solve $$y^{2} + 14y + 1 = 0$$ Roots: $$y = \\frac{-14 \\pm \\sqrt{14^{2} - 4 \\cdot 1 \\cdot 1}}{2} = \\frac{-14 \\pm \\sqrt{196 - 4}}{2} = \\frac{-14 \\pm \\sqrt{192}}{2} = -7 \\pm 4\\sqrt{3}$$ Denote $$\\alpha = -7 - 4\\sqrt{3}, \\qquad \\beta = -7 + 4\\sqrt{3}$$ Since the coefficient of $$y^{2}$$ in $$(2)$$ is positive, the inequality $$\\Delta \\ge 0$$ holds outside the interval formed by these roots: $$y \\le \\alpha \\quad \\text{or} \\quad y \\ge \\beta$$ Hence the range is $$(-\\infty,\\,\\alpha] \\cup [\\beta,\\,\\infty)$$ as stated. Now compute $$\\alpha^{2} + \\beta^{2}$$. For the quadratic $$y^{2} + 14y + 1 = 0$$: Sum of roots $$\\alpha + \\beta = -14$$ Product of roots $$\\alpha\\beta = 1$$ Use the identity $$\\alpha^{2} + \\beta^{2} = (\\alpha + \\beta)^{2} - 2\\alpha\\beta$$: $$\\alpha^{2} + \\beta^{2} = (-14)^{2} - 2 \\cdot 1 = 196 - 2 = 194$$ Therefore, $$\\alpha^{2} + \\beta^{2} = 194$$. Answer: Option D",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A bag contains 19 unbiased coins and one coin with head on both sides. One coin drawn at random is tossed and head turns up. If the probability that the drawn coin was unbiased, is $$\\frac{m}{n}$$, $$\\gcd(m, n) = 1$$, then $$n^2 - m^2$$ is equal to :",
            "images": [],
            "options": [
              "A. 80",
              "B. 60",
              "C. 72",
              "D. 64"
            ],
            "correct_answer": "A",
            "explanation": "Let $$U$$ : the drawn coin is unbiased (ordinary coin) $$D$$ : the drawn coin is double-headed $$H$$ : head turns up on the toss Bayes’ theorem states $$P(U\\,|\\,H)=\\dfrac{P(U)\\,P(H\\,|\\,U)}{P(U)\\,P(H\\,|\\,U)+P(D)\\,P(H\\,|\\,D)}$$ $$-(1)$$ Step 1: Prior probabilities of choosing a coin There are 20 coins in all (19 unbiased + 1 double-headed). $$P(U)=\\frac{19}{20},\\qquad P(D)=\\frac{1}{20}$$ Step 2: Probabilities of getting head from each type For an unbiased coin, head appears with probability $$\\frac12$$: $$P(H\\,|\\,U)=\\frac12$$. For a double-headed coin, head always appears: $$P(H\\,|\\,D)=1$$. Step 3: Use Bayes’ theorem Substituting the values into $$(1)$$: $$P(U\\,|\\,H)=\\dfrac{\\frac{19}{20}\\times\\frac12}{\\frac{19}{20}\\times\\frac12+\\frac{1}{20}\\times1}$$ Simplify numerator and denominator separately: Numerator $$=\\frac{19}{20}\\times\\frac12=\\frac{19}{40}$$ Denominator $$=\\frac{19}{40}+\\frac{1}{20}=\\frac{19}{40}+\\frac{2}{40}=\\frac{21}{40}$$ Hence $$P(U\\,|\\,H)=\\frac{\\frac{19}{40}}{\\frac{21}{40}}=\\frac{19}{21}$$ Step 4: Identify $$m$$ and $$n$$ The required probability is $$\\frac{m}{n}=\\frac{19}{21}$$ with $$\\gcd(19,21)=1$$, so $$m=19$$ and $$n=21$$. Step 5: Compute $$n^2-m^2$$ $$n^2-m^2=21^2-19^2=(21-19)(21+19)=2\\times40=80$$ Therefore, $$n^2 - m^2 = 80$$. Option A is correct.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let a random variable X take values 0, 1, 2, 3 with $$P(X = 0) = P(X = 1) = p$$, $$P(X = 2) = P(X = 3) = q$$ and $$E(X^2) = 2E(X)$$. Then the value of $$8p - 1$$ is :",
            "images": [],
            "options": [
              "A. 0",
              "B. 2",
              "C. 1",
              "D. 3"
            ],
            "correct_answer": "B",
            "explanation": "The random variable $$X$$ can take four values, so we write its probability distribution: $$P(X = 0) = p,\\; P(X = 1) = p,\\; P(X = 2) = q,\\; P(X = 3) = q.$$ Step 1: Use the fact that total probability equals $$1$$. $$2p + 2q = 1 \\;$$ $$-(1)$$ Step 2: Compute the expected value $$E(X)$$. Formula: $$E(X) = \\sum x_i P(X = x_i).$$ $$E(X) = 0\\cdot p + 1\\cdot p + 2\\cdot q + 3\\cdot q = p + 5q.$$ $$-(2)$$ Step 3: Compute the second moment $$E(X^2).$$ Formula: $$E(X^2) = \\sum x_i^2 P(X = x_i).$$ $$E(X^2) = 0^2\\cdot p + 1^2\\cdot p + 2^2\\cdot q + 3^2\\cdot q = p + 13q.$$ $$-(3)$$ Step 4: Apply the given condition $$E(X^2) = 2E(X).$$ Using $$(2)$$ and $$(3)$$: $$p + 13q = 2(p + 5q).$$ Simplify: $$p + 13q = 2p + 10q$$ $$0 = 2p + 10q - p - 13q = p - 3q$$ $$\\Rightarrow\\; p = 3q.$$ $$-(4)$$ Step 5: Solve for $$p$$ and $$q$$ with $$(1)$$ and $$(4).$$ Substitute $$p = 3q$$ into $$(1):$$ $$2(3q) + 2q = 1$$ $$6q + 2q = 1$$ $$8q = 1 \\;\\Rightarrow\\; q = \\frac{1}{8}.$$ Then from $$(4):$$ $$p = 3q = 3 \\times \\frac{1}{8} = \\frac{3}{8}.$$ Step 6: Evaluate the required expression $$8p - 1.$$/> $$8p - 1 = 8 \\times \\frac{3}{8} - 1 = 3 - 1 = 2.$$ Hence $$8p - 1 = 2$$, which corresponds to Option B.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "If the area of the region $$\\{(x, y) : 1 + x^2 \\le y \\le \\min\\{x + 7, 11 - 3x\\}\\}$$ is A, then $$3A$$ is equal to",
            "images": [],
            "options": [
              "A. 50",
              "B. 49",
              "C. 46",
              "D. 47"
            ],
            "correct_answer": "A",
            "explanation": "The region is defined by the inequalities $$1+x^{2}\\;\\le\\;y\\;\\le\\;\\min\\{x+7,\\;11-3x\\}$$ First compare the two straight lines to find which is smaller at a given $$x$$. Set $$x+7 = 11-3x$$ to locate their intersection: $$4x = 4 \\;\\Longrightarrow\\; x = 1,\\qquad y = 8$$ Therefore Case 1: $$x \\le 1 \\;$$ gives $$x+7 \\lt 11-3x$$, so the upper curve is $$y = x+7$$. Case 2: $$x \\ge 1 \\;$$ gives $$x+7 \\gt 11-3x$$, so the upper curve is $$y = 11-3x$$. The lower curve is always $$y = 1+x^{2}$$. To obtain the $$x$$-range where the region exists, ensure $$1+x^{2} \\le \\text{(upper curve)}$$ in each case. Case 1: $$x \\le 1$$ Require $$1+x^{2} \\le x+7$$ $$\\Longrightarrow\\; x^{2}-x-6 \\le 0$$ $$\\Longrightarrow\\; (x-3)(x+2) \\le 0$$ $$\\Longrightarrow\\; -2 \\le x \\le 3$$. Combining with $$x \\le 1$$ gives $$-2 \\le x \\le 1$$. Case 2: $$x \\ge 1$$ Require $$1+x^{2} \\le 11-3x$$ $$\\Longrightarrow\\; x^{2}+3x-10 \\le 0$$ $$\\Longrightarrow\\; (x+5)(x-2) \\le 0$$ $$\\Longrightarrow\\; -5 \\le x \\le 2$$. Combining with $$x \\ge 1$$ gives $$1 \\le x \\le 2$$. Hence the complete $$x$$-interval for the region is $$-2 \\le x \\le 2$$, divided at $$x = 1$$. The area $$A$$ is the sum of two integrals. For $$-2 \\le x \\le 1$$ Upper curve: $$x+7$$, lower curve: $$1+x^{2}$$. Area part $$A_{1}$$: $$A_{1} = \\int_{-2}^{1} \\big[(x+7) - (1+x^{2})\\big]\\;dx = \\int_{-2}^{1} \\big(-x^{2}+x+6\\big)\\;dx$$ Integrate term-by-term: $$\\int (-x^{2})dx = -\\frac{x^{3}}{3},\\qquad \\int x\\,dx = \\frac{x^{2}}{2},\\qquad \\int 6\\,dx = 6x$$ Evaluate from $$x=-2$$ to $$x=1$$: At $$x=1$$: $$-\\tfrac{1}{3} + \\tfrac{1}{2} + 6 = \\tfrac{37}{6}$$ At $$x=-2$$: $$\\;\\;\\tfrac{8}{3} + 2 - 12 = -\\tfrac{22}{3}$$ Thus $$A_{1} = \\frac{37}{6} - \\Big(-\\frac{22}{3}\\Big) = \\frac{37}{6} + \\frac{44}{6} = \\frac{81}{6} = \\frac{27}{2}$$ For $$1 \\le x \\le 2$$ Upper curve: $$11-3x$$, lower curve: $$1+x^{2}$$. Area part $$A_{2}$$: $$A_{2} = \\int_{1}^{2} \\big[(11-3x) - (1+x^{2})\\big]\\;dx = \\int_{1}^{2} \\big(-x^{2}-3x+10\\big)\\;dx$$ Integrate term-by-term: $$\\int (-x^{2})dx = -\\frac{x^{3}}{3},\\qquad \\int (-3x)dx = -\\frac{3x^{2}}{2},\\qquad \\int 10\\,dx = 10x$$ Evaluate from $$x=1$$ to $$x=2$$: At $$x=2$$: $$-\\tfrac{8}{3} - 6 + 20 = \\tfrac{34}{3}$$ At $$x=1$$: $$-\\tfrac{1}{3} - \\tfrac{3}{2} + 10 = \\tfrac{49}{6}$$ Thus $$A_{2} = \\frac{34}{3} - \\frac{49}{6} = \\frac{68}{6} - \\frac{49}{6} = \\frac{19}{6}$$ Total area: $$A = A_{1} + A_{2} = \\frac{27}{2} + \\frac{19}{6} = \\frac{81}{6} + \\frac{19}{6} = \\frac{100}{6} = \\frac{50}{3}$$ The question asks for $$3A$$: $$3A = 3 \\times \\frac{50}{3} = 50$$ Therefore, $$3A = 50$$, which corresponds to Option A .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$f : \\mathbf{R} \\to \\mathbf{R}$$ be a polynomial function of degree four having extreme values at $$x = 4$$ and $$x = 5$$. If $$\\lim_{x \\to 0} \\frac{f(x)}{x^2} = 5$$, then $$f(2)$$ is equal to :",
            "images": [],
            "options": [
              "A. 12",
              "B. 10",
              "C. 8",
              "D. 14"
            ],
            "correct_answer": "B",
            "explanation": "The limit $$\\lim_{x \\to 0}\\frac{f(x)}{x^{2}} = 5$$ means that near $$x = 0$$ the polynomial behaves like $$5x^{2}$$. Therefore $$x^{2}$$ must be a factor of $$f(x)$$ and the remaining factor must equal $$5$$ at $$x = 0$$. Write $$f(x) = x^{2}\\,g(x)$$ where $$g(x)$$ is a quadratic: $$g(x)=ax^{2}+bx+5$$. Hence $$f(x)=a x^{4}+b x^{3}+5x^{2}\\qquad -(1)$$ Differentiate to locate stationary points: $$f'(x)=4ax^{3}+3bx^{2}+10x\\qquad -(2)$$ The extreme values occur at $$x=4$$ and $$x=5$$, so $$f'(4)=0,\\; f'(5)=0 \\qquad -(3)$$ Substitute $$x=4$$ into $$(2)$$: $$4a(4)^{3}+3b(4)^{2}+10(4)=0$$ $$256a+48b+40=0\\qquad -(4)$$ Substitute $$x=5$$ into $$(2)$$: $$4a(5)^{3}+3b(5)^{2}+10(5)=0$$ $$500a+75b+50=0\\qquad -(5)$$ Solve the linear system $$(4),(5)$$. Multiply $$(4)$$ by $$75$$ and $$(5)$$ by $$48$$ to eliminate $$b$$: $$19200a+3600b=-3000$$ $$24000a+3600b=-2400$$ Subtract the first from the second: $$(24000-19200)a=600 \\;\\Longrightarrow\\; 4800a=600\\;\\Longrightarrow\\; a=\\frac{1}{8}$$ Insert $$a=\\tfrac{1}{8}$$ into $$(4)$$: $$256\\left(\\frac{1}{8}\\right)+48b+40=0$$ $$32+48b+40=0$$ $$48b=-72 \\;\\Longrightarrow\\; b=-\\frac{3}{2}$$ Now evaluate $$f(2)$$ using $$(1)$$: $$f(2)=2^{2}\\Bigl(a\\cdot2^{2}+b\\cdot2+5\\Bigr)$$ $$\\;=4\\Bigl(a\\cdot4+2b+5\\Bigr)$$ Insert $$a=\\tfrac{1}{8},\\; b=-\\tfrac{3}{2}$$: $$a\\cdot4=\\frac{1}{2},\\quad 2b=-3$$ $$a\\cdot4+2b+5=\\frac{1}{2}-3+5=\\frac{5}{2}$$ Therefore $$f(2)=4\\left(\\frac{5}{2}\\right)=10$$. Hence $$f(2)=10$$, which matches Option B .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The number of solutions of the equation $$\\cos 2\\theta \\cos\\frac{\\theta}{2} + \\cos\\frac{5\\theta}{2} = 2\\cos^3\\frac{5\\theta}{2}$$ in $$\\left[-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right]$$ is :",
            "images": [],
            "options": [
              "A. 7",
              "B. 5",
              "C. 6",
              "D. 9"
            ],
            "correct_answer": "A",
            "explanation": "The given equation is $$\\cos 2\\theta \\,\\cos\\frac{\\theta}{2}+\\cos\\frac{5\\theta}{2}=2\\cos^{3}\\frac{5\\theta}{2},\\qquad \\theta\\in\\left[-\\frac{\\pi}{2},\\frac{\\pi}{2}\\right].$$ Put $$t=\\frac{\\theta}{2}.$$ Then $$\\theta=2t$$ and the interval becomes $$t\\in\\left[-\\frac{\\pi}{4},\\frac{\\pi}{4}\\right].$$ The equation turns into $$\\cos 4t\\;\\cos t+\\cos 5t=2\\cos^{3}5t \\quad -(1).$$ Use the product-to-sum identity $$\\cos A\\cos B=\\tfrac{1}{2}\\bigl[\\cos(A+B)+\\cos(A-B)\\bigr]$$ on the first term: $$\\cos 4t\\;\\cos t=\\tfrac{1}{2}\\bigl[\\cos(4t+t)+\\cos(4t-t)\\bigr] =\\tfrac{1}{2}\\bigl[\\cos 5t+\\cos 3t\\bigr].$$ Substitute this in $$(1):$$ $$\\tfrac{1}{2}\\bigl[\\cos 5t+\\cos 3t\\bigr]+\\cos 5t =2\\cos^{3}5t.$$ Combine like terms: $$(\\tfrac{1}{2}+1)\\cos 5t+\\tfrac{1}{2}\\cos 3t =2\\cos^{3}5t,$$ $$\\tfrac{3}{2}\\cos 5t+\\tfrac{1}{2}\\cos 3t =2\\cos^{3}5t.$$ Multiply by $$2:$$ $$3\\cos 5t+\\cos 3t=4\\cos^{3}5t \\quad -(2).$$ Recall the triple-angle identity $$\\cos 3x=4\\cos^{3}x-3\\cos x,$$ which can be rearranged as $$4\\cos^{3}x=\\cos 3x+3\\cos x.$$ Putting $$x=5t$$ gives $$4\\cos^{3}5t=\\cos 15t+3\\cos 5t.$$ Replace the right side of $$(2)$$ with this expression: $$3\\cos 5t+\\cos 3t=\\cos 15t+3\\cos 5t.$$ The terms $$3\\cos 5t$$ cancel, leaving the simple equation $$\\cos 3t=\\cos 15t \\quad -(3).$$ For $$\\cos\\alpha=\\cos\\beta,$$ the solutions are $$\\alpha=2k\\pi\\pm\\beta,\\qquad k\\in\\mathbb{Z}.$$ Apply this to $$(3)$$: Case 1: $$3t=2k\\pi+15t \\;\\Longrightarrow\\; -12t=2k\\pi \\;\\Longrightarrow\\; t=-\\frac{k\\pi}{6}.$$ With $$t\\in\\left[-\\frac{\\pi}{4},\\frac{\\pi}{4}\\right],$$ choose integers $$k$$ so that $$-\\frac{k\\pi}{6}$$ lies in the interval. • $$k=0:\\;t=0$$ • $$k=1:\\;t=-\\frac{\\pi}{6}$$ • $$k=-1:\\;t=\\frac{\\pi}{6}$$ Further $$|k|\\ge 2$$ gives $$|t|\\gt\\pi/4,$$ so they are rejected. Thus Case 1 contributes $$t=-\\frac{\\pi}{6},\\,0,\\,\\frac{\\pi}{6}.$$ Case 2: $$3t=2k\\pi-15t \\;\\Longrightarrow\\;18t=2k\\pi \\;\\Longrightarrow\\; t=\\frac{k\\pi}{9}.$$ Again keep the values inside $$\\left[-\\frac{\\pi}{4},\\frac{\\pi}{4}\\right]:$$ • $$k=0:\\;t=0$$ (already counted) • $$k=\\pm1:\\;t=\\pm\\frac{\\pi}{9}$$ • $$k=\\pm2:\\;t=\\pm\\frac{2\\pi}{9}$$ • $$|k|\\ge3$$ violates the interval. Case 2 contributes $$t=-\\frac{2\\pi}{9},\\,-\\frac{\\pi}{9},\\,0,\\,\\frac{\\pi}{9},\\,\\frac{2\\pi}{9}.$$ Collecting distinct solutions of $$t$$ inside the interval: $$t=-\\frac{2\\pi}{9},\\;-\\frac{\\pi}{6},\\;-\\frac{\\pi}{9},\\;0,\\;\\frac{\\pi}{9},\\;\\frac{\\pi}{6},\\;\\frac{2\\pi}{9}.$$ Thus there are $$7$$ valid $$t$$ values. Since $$\\theta=2t,$$ each $$t$$ gives a unique $$\\theta$$ in the original interval $$\\left[-\\frac{\\pi}{2},\\frac{\\pi}{2}\\right]$$, so the number of solutions for $$\\theta$$ is also $$7$$. Hence, the correct option is Option A (7) .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$a_n$$ be the $$n^{\\text{th}}$$ term of an A.P. If $$S_n = a_1 + a_2 + a_3 + \\ldots + a_n = 700$$, $$a_6 = 7$$ and $$S_7 = 7$$, then $$a_{n}$$ is equal to :",
            "images": [],
            "options": [
              "A. 56",
              "B. 65",
              "C. 64",
              "D. 70"
            ],
            "correct_answer": "C",
            "explanation": "For an arithmetic progression (A.P.) let the first term be $$a$$ and the common difference be $$d$$. Then the $$n^{\\text{th}}$$ term is $$a_n = a + (n-1)d$$ and the sum of the first $$n$$ terms is $$S_n = \\dfrac{n}{2}\\,\\bigl[2a + (n-1)d\\bigr]$$. We are given three pieces of information: • $$a_6 = 7$$ • $$S_7 = 7$$ • $$S_n = 700$$ for some positive integer $$n$$. Step 1: Use $$a_6 = 7$$. $$a_6 = a + 5d = 7$$ $$-(1)$$ Step 2: Use $$S_7 = 7$$. $$S_7 = \\dfrac{7}{2}\\,\\bigl[2a + 6d\\bigr] = 7$$ Divide both sides by $$7$$: $$\\dfrac{1}{2}\\,\\bigl[2a + 6d\\bigr] = 1 \\;\\Longrightarrow\\; 2a + 6d = 2$$ Simplify: $$a + 3d = 1$$ $$-(2)$$ Step 3: Solve equations $$(1)$$ and $$(2)$$ for $$a$$ and $$d$$. Subtract $$(2)$$ from $$(1)$$: $$(a + 5d) - (a + 3d) = 7 - 1 \\;\\Longrightarrow\\; 2d = 6 \\;\\Longrightarrow\\; d = 3$$ Substitute $$d = 3$$ into $$(1)$$: $$a + 5(3) = 7 \\;\\Longrightarrow\\; a + 15 = 7 \\;\\Longrightarrow\\; a = -8$$ Step 4: Find $$n$$ such that $$S_n = 700$$. $$S_n = \\dfrac{n}{2}\\,\\bigl[2a + (n-1)d\\bigr]$$ Insert $$a = -8$$ and $$d = 3$$: $$S_n = \\dfrac{n}{2}\\,\\bigl[2(-8) + (n-1)3\\bigr] = \\dfrac{n}{2}\\,\\bigl[-16 + 3n - 3\\bigr] = \\dfrac{n}{2}\\,(3n - 19)$$ Set this equal to $$700$$: $$\\dfrac{n}{2}\\,(3n - 19) = 700 \\;\\Longrightarrow\\; n(3n - 19) = 1400$$ This is a quadratic: $$3n^2 - 19n - 1400 = 0$$ Compute the discriminant: $$\\Delta = (-19)^2 - 4(3)(-1400) = 361 + 16800 = 17161$$ Since $$17161 = 131^2$$, the roots are $$n = \\dfrac{19 \\pm 131}{2 \\times 3}$$ Taking the positive root: $$n = \\dfrac{150}{6} = 25$$ (Discard the negative root as $$n$$ must be positive.) Step 5: Find $$a_{25}$$. $$a_{25} = a + 24d = -8 + 24 \\times 3 = -8 + 72 = 64$$ Therefore, $$a_{25} = 64$$. This matches Option C.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "If the locus of $$z \\in \\mathbb{C}$$, such that $$\\text{Re}\\left(\\frac{z-1}{2z+i}\\right) + \\text{Re}\\left(\\frac{\\bar{z}-1}{2\\bar{z}-i}\\right) = 2$$, is a circle of radius $$r$$ and center $$(a, b)$$ then $$\\frac{15ab}{r^2}$$ is equal to :",
            "images": [],
            "options": [
              "A. 24",
              "B. 12",
              "C. 18",
              "D. 16"
            ],
            "correct_answer": "C",
            "explanation": "Let $$z = x + iy$$, where $$x, y \\in \\mathbb{R}$$. Define $$w = \\dfrac{z-1}{2z+i}\\,.$$ Its complex conjugate is $$\\overline{w}= \\dfrac{\\bar z-1}{2\\bar z-i}\\,.$ The given condition is $$$$\\text{Re}$$\\!$$\\left$$(w$$\\right$$)+$$\\text{Re}$$\\!$$\\left$$($$\\overline{w}$$$$\\right$$)=2.$$ For any complex number $$w$$, $$$$\\text{Re}$$(w)=$$\\text{Re}$$($$\\overline{w}$$)$$. Therefore $$2\\,$$\\text{Re}$$(w)=2 \\;\\Longrightarrow\\; $$\\text{Re}$$(w)=1.$$ Hence we need the locus of $$z$$ satisfying $$$$\\text{Re}$$\\!$$\\left$$(\\dfrac{z-1}{2z+i}$$\\right$$)=1.$$ Write numerator and denominator in terms of $$x, y$$: $$z-1=(x-1)+iy,$$ $$2z+i=2x+i(2y+1).$$ Multiply by the conjugate of the denominator to extract the real part: $$\\dfrac{z-1}{2z+i}= \\dfrac{(x-1)+iy}{2x+i(2y+1)}\\; $$\\cdot$$\\dfrac{2x-i(2y+1)}{2x-i(2y+1)}.$$ Denominator magnitude squared: $$D=(2x)^2+(2y+1)^2=4x^2+(2y+1)^2.$$ Numerator product: $$\\;(x-1)+iy$$$$\\cdot$$$$2x-i(2y+1)$$ gives Real part $$R=2x(x-1)+y(2y+1)=2x^2-2x+2y^2+y.$$ Thus $$$$\\text{Re}$$\\!$$\\left$$(\\dfrac{z-1}{2z+i}$$\\right$$)=\\dfrac{R}{D}=1 \\;\\Longrightarrow\\; R=D.$$ Equate and rearrange: $$2x^2-2x+2y^2+y =4x^2+4y^2+4y+1,$$ $$0=2x^2+2y^2+2x+3y+1.$$ Divide by 2 for simplicity: $$x^2+y^2+x+\\dfrac{3}{2}y+\\dfrac{1}{2}=0.$$ Complete the squares: $$x^2+x=$$\\left$$(x+\\dfrac{1}{2}$$\\right$$)^2-\\dfrac{1}{4},$$ $$y^2+\\dfrac{3}{2}y=$$\\left$$(y+\\dfrac{3}{4}$$\\right$$)^2-$$\\left$$(\\dfrac{3}{4}$$\\right$$)^2.$$ Substitute: $$$$\\left$$(x+\\dfrac{1}{2}$$\\right$$)^2-\\dfrac{1}{4} +$$\\left$$(y+\\dfrac{3}{4}$$\\right$$)^2-\\dfrac{9}{16} +\\dfrac{1}{2}=0.$$ Combine constants: $$-\\dfrac{1}{4}-\\dfrac{9}{16}+\\dfrac{1}{2} =-\\dfrac{5}{16}.$$ Move to the right side: $$$$\\left$$(x+\\dfrac{1}{2}$$\\right$$)^2+$$\\left$$(y+\\dfrac{3}{4}$$\\right$$)^2 =\\dfrac{5}{16}.$$ Hence the locus is a circle with center $$\\bigl(a,b\\bigr)=$$\\left$$(-\\dfrac{1}{2},\\,-\\dfrac{3}{4}$$\\right$$),$$ radius $$r=$$\\sqrt{\\dfrac{5}{16}$$}=\\dfrac{$$\\sqrt{5}$$}{4},$$ so $$r^{2}=\\dfrac{5}{16}.$$ Now evaluate $$\\dfrac{15ab}{r^{2}}.$$ $$ab=$$\\left$$(-\\dfrac{1}{2}$$\\right$$)\\!$$\\left$$(-\\dfrac{3}{4}$$\\right$$)=\\dfrac{3}{8},$$ $$\\dfrac{15ab}{r^{2}}=\\dfrac{15$$\\cdot$$$$\\frac{3}{8}$$}{$$\\frac{5}{16}$$} =\\dfrac{45}{8}$$\\cdot$$\\dfrac{16}{5}=18.$$ The required value is $$18$$, which corresponds to Option C.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let the length of a latus rectum of an ellipse $$\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1$$ be 10. If its eccentricity is the minimum value of the function $$f(t) = t^2 + t + \\frac{11}{12}$$, $$t \\in \\mathbf{R}$$, then $$a^2 + b^2$$ is equal to :",
            "images": [],
            "options": [
              "A. 125",
              "B. 126",
              "C. 120",
              "D. 115"
            ],
            "correct_answer": "B",
            "explanation": "The standard equation of an ellipse with its major axis along the $$x$$-axis is $$\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1$$, where $$a \\gt b \\gt 0$$ and its eccentricity is $$e$$. 1. Length of the latus-rectum (the chord through a focus perpendicular to the major axis) is $$\\text{Latus rectum}= \\frac{2b^{2}}{a}$$. 2. The eccentricity and the semi-axes satisfy the relation $$b^{2}=a^{2}(1-e^{2})$$ $$-(1)$$. 3. We are given that the length of the latus-rectum equals $$10$$: $$\\frac{2b^{2}}{a}=10$$ $$-(2)$$. 4. The eccentricity $$e$$ is the minimum value of the quadratic function $$f(t)=t^{2}+t+\\frac{11}{12},\\; t\\in\\mathbb{R}$$. The minimum of a quadratic $$At^{2}+Bt+C$$ with $$A\\gt 0$$ occurs at $$t=-\\frac{B}{2A}$$. Here $$A=1,\\; B=1,\\; C=\\frac{11}{12}$$, so the minimising value of $$t$$ is $$t=-\\frac{1}{2}$$. Substituting back gives the minimum value (and hence the eccentricity): $$e=f\\!\\left(-\\frac{1}{2}\\right) =\\left(-\\frac{1}{2}\\right)^{2} +\\left(-\\frac{1}{2}\\right) +\\frac{11}{12} =\\frac{1}{4}-\\frac{1}{2}+\\frac{11}{12}$$ $$=\\frac{1}{4}-\\frac{2}{4}+\\frac{11}{12} =-\\frac{1}{4}+\\frac{11}{12} =\\frac{-3}{12}+\\frac{11}{12} =\\frac{8}{12} =\\frac{2}{3}$$. Thus $$e=\\frac{2}{3}$$ and $$e^{2}=\\frac{4}{9}$$. 5. Using equation $$(1)$$: $$b^{2}=a^{2}\\!\\left(1-\\frac{4}{9}\\right)=a^{2}\\!\\left(\\frac{5}{9}\\right) =\\frac{5a^{2}}{9}$$ $$-(3)$$. 6. Insert $$(3)$$ into the latus-rectum condition $$(2)$$: $$\\frac{2}{a}\\left(\\frac{5a^{2}}{9}\\right)=10 \\;\\;\\Longrightarrow\\;\\; \\frac{10a}{9}=10 \\;\\;\\Longrightarrow\\;\\; a=\\frac{10\\times9}{10}=9$$. Therefore $$a^{2}=9^{2}=81$$. 7. Find $$b^{2}$$ from $$(3)$$: $$b^{2}=\\frac{5a^{2}}{9} =\\frac{5\\times81}{9}=5\\times9=45$$. 8. Finally, $$a^{2}+b^{2}=81+45=126$$. Hence $$a^{2}+b^{2}=126$$. The correct option is Option B.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$y = y(x)$$ be the solution of the differential equation $$(x^2 + 1)y' - 2xy = (x^4 + 2x^2 + 1)\\cos x$$, $$y(0) = 1$$. Then $$\\int_{-3}^{3} y(x) \\, dx$$ is :",
            "images": [],
            "options": [
              "A. 24",
              "B. 36",
              "C. 30",
              "D. 18"
            ],
            "correct_answer": "A",
            "explanation": "The given differential equation is$$(x^{2}+1)\\,y' \\;-\\;2x\\,y \\;=\\;(x^{4}+2x^{2}+1)\\cos x,\\qquad y(0)=1$$ Step 1: Write it in standard linear form $$y'+P(x)\\,y=Q(x).$$ Divide by $$(x^{2}+1):$$ $$y' \\;-\\;\\frac{2x}{x^{2}+1}\\,y \\;=\\;\\frac{x^{4}+2x^{2}+1}{x^{2}+1}\\,\\cos x.$$ Notice that $$x^{4}+2x^{2}+1=(x^{2}+1)^{2},$$ so the right-hand side simplifies to$$(x^{2}+1)\\cos x.$$ Thus$$y' \\;-\\;\\frac{2x}{x^{2}+1}\\,y \\;=\\;(x^{2}+1)\\cos x\\qquad -(1)$$ Step 2: Find the integrating factor (I.F.). For $$y' + P(x)\\,y = Q(x)$$, I.F. is $$e^{\\int P(x)\\,dx}.$$ Here $$P(x)= -\\frac{2x}{x^{2}+1}.$$ Therefore$$\\text{I.F.}=e^{\\int -\\frac{2x}{x^{2}+1}\\,dx} =e^{-\\ln(x^{2}+1)} =\\frac{1}{x^{2}+1}.$$ Step 3: Multiply equation $$-(1)$$ by the I.F. $$\\frac{1}{x^{2}+1}\\,y' \\;-\\;\\frac{2x}{(x^{2}+1)^{2}}\\;y \\;=\\;\\cos x$$ The left side is the derivative of $$\\frac{y}{x^{2}+1}$$ because $$\\frac{d}{dx}\\left(\\frac{y}{x^{2}+1}\\right)= \\frac{y'(x^{2}+1)-y(2x)}{(x^{2}+1)^{2}} =\\frac{1}{x^{2}+1}\\,y' -\\frac{2x}{(x^{2}+1)^{2}}\\,y.$$ Hence$$\\frac{d}{dx}\\left(\\frac{y}{x^{2}+1}\\right)=\\cos x.$$(Integrate) Step 4: Integrate both sides. $$\\frac{y}{x^{2}+1}= \\int \\cos x\\,dx = \\sin x + C$$ Therefore$$y(x)=(x^{2}+1)\\bigl(\\sin x + C\\bigr).$$ Step 5: Apply the initial condition $$y(0)=1.$$ At $$x=0$$, $$1=(0^{2}+1)\\bigl(\\sin 0 + C\\bigr)=1\\cdot(0+C)=C.$$ So $$C=1.$$ Hence the required solution is$$y(x)=(x^{2}+1)\\bigl(\\sin x + 1\\bigr).$$ Step 6: Evaluate $$\\displaystyle\\int_{-3}^{3}y(x)\\,dx.$$ $$\\int_{-3}^{3}y(x)\\,dx =\\int_{-3}^{3}(x^{2}+1)\\bigl(\\sin x + 1\\bigr)\\,dx$$ $$=\\int_{-3}^{3}(x^{2}+1)\\sin x\\,dx \\;+\\;\\int_{-3}^{3}(x^{2}+1)\\,dx \\qquad -(2)$$ Case 1: $$\\displaystyle\\int_{-3}^{3}(x^{2}+1)\\sin x\\,dx$$ $$(x^{2}+1)$$ is even, $$\\sin x$$ is odd ⟹ their product is odd. The integral of an odd function over $$[-a,a]$$ is $$0.$$ So this part contributes $$0.$$ Case 2: $$\\displaystyle\\int_{-3}^{3}(x^{2}+1)\\,dx =\\int_{-3}^{3}x^{2}\\,dx+\\int_{-3}^{3}1\\,dx$$ Even function property: $$\\int_{-3}^{3}x^{2}\\,dx=2\\int_{0}^{3}x^{2}\\,dx =2\\left[\\frac{x^{3}}{3}\\right]_{0}^{3}=2\\cdot\\frac{27}{3}=18.$$ Constant term: $$\\int_{-3}^{3}1\\,dx = 6.$$ Therefore the second integral equals $$18+6=24.$$ Combining both cases in $$-(2)$$: $$\\int_{-3}^{3}y(x)\\,dx = 0 + 24 = 24.$$ Thus the value of $$\\displaystyle\\int_{-3}^{3}y(x)\\,dx$$ is $$24,$$ which corresponds to Option A .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "If the equation of the line passing through the point $$\\left(0, -\\frac{1}{2}, 0\\right)$$ and perpendicular to the lines $$\\vec{r} = \\lambda(\\hat{i} + a\\hat{j} + b\\hat{k})$$ and $$\\vec{r} = (\\hat{i} - \\hat{j} - 6\\hat{k}) + \\mu(-b\\hat{i} + a\\hat{j} + 5\\hat{k})$$ is $$\\frac{x - 1}{-2} = \\frac{y + 4}{d} = \\frac{z - c}{-4}$$, then $$a + b + c + d$$ is equal to :",
            "images": [],
            "options": [
              "A. 10",
              "B. 14",
              "C. 13",
              "D. 12"
            ],
            "correct_answer": "B",
            "explanation": "Let the required line be denoted by $$L$$. Its symmetric form is given in the question as $$\\frac{x-1}{-2}=\\frac{y+4}{d}=\\frac{z-c}{-4}\\,.$$ Therefore, • a point on $$L$$ is $$A(1,\\,-4,\\,c)$$, • its direction vector is $$\\vec{n}=(-2,\\,d,\\,-4)\\,.$$ The line $$L$$ is perpendicular to both of the following lines: $$L_1:\\;\\vec{r}=\\lambda(\\hat{i}+a\\hat{j}+b\\hat{k})\\quad\\Longrightarrow\\quad \\text{direction vector }\\vec{v_1}=(1,\\,a,\\,b)$$ $$L_2:\\;\\vec{r}=(\\hat{i}-\\hat{j}-6\\hat{k})+\\mu(-b\\hat{i}+a\\hat{j}+5\\hat{k})\\quad\\Longrightarrow\\quad \\text{direction vector }\\vec{v_2}=(-b,\\,a,\\,5)$$ Because $$L$$ is perpendicular to $$L_1$$ and $$L_2$$, $$\\vec{n}\\cdot\\vec{v_1}=0\\quad\\text{and}\\quad\\vec{n}\\cdot\\vec{v_2}=0\\,.$$ Compute each dot product: 1. $$\\vec{n}\\cdot\\vec{v_1}=(-2,\\,d,\\,-4)\\cdot(1,\\,a,\\,b) =-2+da-4b=0$$ $$\\Longrightarrow\\;da-4b=2\\;-\\;(1)$$ 2. $$\\vec{n}\\cdot\\vec{v_2}=(-2,\\,d,\\,-4)\\cdot(-b,\\,a,\\,5) =2b+da-20=0$$ $$\\Longrightarrow\\;da+2b=20\\;-\\;(2)$$ The required line $$L$$ must also pass through the point $$P\\Bigl(0,\\;-\\frac12,\\;0\\Bigr)$$ given in the statement. Let the common ratio in the symmetric form be $$t$$. Using point $$A(1,-4,c)$$ and direction $$\\vec{n}$$, the parametric equations of $$L$$ are $$x=1-2t,\\qquad y=-4+dt,\\qquad z=c-4t\\,.$$ Insert point $$P$$: $$1-2t=0\\;\\Longrightarrow\\;t=\\frac12$$ $$-4+dt=-\\frac12\\;\\Longrightarrow\\;d\\left(\\frac12\\right)=\\frac72 \\;\\Longrightarrow\\;d=7$$ $$c-4t=0\\;\\Longrightarrow\\;c-4\\left(\\frac12\\right)=0 \\;\\Longrightarrow\\;c=2$$ Substitute $$d=7$$ into equations $$(1)$$ and $$(2)$$: From $$(1):\\;7a-4b=2$$ From $$(2):\\;7a+2b=20$$ Solve the simultaneous equations: Add the two equations: $$\\bigl(7a+2b\\bigr)+\\bigl(7a-4b\\bigr)=20+2 \\;\\Longrightarrow\\;14a-2b=22\\;-\\;(3)$$ Subtract $$(1)$$ from $$(2):\\;(7a+2b)-(7a-4b)=20-2 \\;\\Longrightarrow\\;6b=18 \\;\\Longrightarrow\\;b=3$$ Insert $$b=3$$ into $$(1):\\;7a-12=2 \\;\\Longrightarrow\\;7a=14 \\;\\Longrightarrow\\;a=2$$ Now we have $$a=2,\\;b=3,\\;c=2,\\;d=7.$$ Finally, $$a+b+c+d=2+3+2+7=14.$$ Hence, the value of $$a+b+c+d$$ is $$14$$, which matches Option B.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let p be the number of all triangles that can be formed by joining the vertices of a regular polygon P of n sides and q be the number of all quadrilaterals that can be formed by joining the vertices of P. If $$p + q = 126$$, then the eccentricity of the ellipse $$\\frac{x^2}{16} + \\frac{y^2}{n} = 1$$ is :",
            "images": [],
            "options": [
              "A. $$\\frac{3}{4}$$",
              "B. $$\\frac{1}{2}$$",
              "C. $$\\frac{\\sqrt{7}}{4}$$",
              "D. $$\\frac{1}{\\sqrt{2}}$$"
            ],
            "correct_answer": "D",
            "explanation": "The number of triangles that can be formed from the vertices of a regular $$n$$-gon is the number of ways of choosing any $$3$$ vertices: $$p = {}^{n}C_{3} = \\frac{n(n-1)(n-2)}{6}$$ The number of quadrilaterals is the number of ways of choosing any $$4$$ vertices: $$q = {}^{n}C_{4} = \\frac{n(n-1)(n-2)(n-3)}{24}$$ We are told that $$p + q = 126$$ Substituting the expressions for $$p$$ and $$q$$: $$\\frac{n(n-1)(n-2)}{6} + \\frac{n(n-1)(n-2)(n-3)}{24} = 126$$ Multiply every term by $$24$$ to clear denominators: $$4n(n-1)(n-2) + n(n-1)(n-2)(n-3) = 3024$$ Factor out $$n(n-1)(n-2)$$: $$n(n-1)(n-2)\\,\\bigl[\\,4 + (n-3)\\bigr] = 3024$$ Simplify the bracket: $$n(n-1)(n-2)(n+1) = 3024$$ Try successive integer values of $$n \\ge 4$$ until the product equals $$3024$$. Case 6: $$6\\cdot5\\cdot4\\cdot7 = 840 \\lt 3024$$ Case 7: $$7\\cdot6\\cdot5\\cdot8 = 1680 \\lt 3024$$ Case 8: $$8\\cdot7\\cdot6\\cdot9 = 3024$$ — match found. Hence $$n = 8$$. The ellipse given is $$\\frac{x^2}{16} + \\frac{y^2}{n} = 1 \\quad\\Longrightarrow\\quad \\frac{x^2}{16} + \\frac{y^2}{8} = 1$$ because $$n = 8$$. For an ellipse $$\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1$$ with $$a^2 \\gt b^2$$, the eccentricity is $$e = \\sqrt{1 - \\frac{b^{2}}{a^{2}}}$$ Here $$a^2 = 16,\\; b^2 = 8$$, so $$e = \\sqrt{1 - \\frac{8}{16}} = \\sqrt{\\frac{1}{2}} = \\frac{1}{\\sqrt{2}}$$ Therefore the required eccentricity is $$\\boxed{\\dfrac{1}{\\sqrt{2}}}$$, which corresponds to Option D.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Consider the lines $$L_1 : x - 1 = y - 2 = z$$ and $$L_2 : x - 2 = y = z - 1$$. Let the feet of the perpendiculars from the point $$P(5, 1, -3)$$ on the lines $$L_1$$ and $$L_2$$ be Q and R respectively. If the area of the triangle PQR is A, then $$4A^2$$ is equal to :",
            "images": [],
            "options": [
              "A. 139",
              "B. 147",
              "C. 151",
              "D. 143"
            ],
            "correct_answer": "B",
            "explanation": "The symmetric form of $$L_1$$ is $$x-1=y-2=z=\\lambda$$, so a convenient point on $$L_1$$ is $$A_1(1,2,0)$$ and the direction vector is $$\\mathbf{v}=\\langle 1,1,1\\rangle$$. For a point $$P(x_0,y_0,z_0)$$, the foot of the perpendicular $$Q$$ on a line through $$A_1$$ with direction $$\\mathbf{v}$$ is given by $$Q=A_1+\\dfrac{(P-A_1)\\cdot\\mathbf{v}}{|\\mathbf{v}|^{2}}\\;\\mathbf{v}$$ $$-(1)$$. Here $$P(5,1,-3)$$ and $$A_1(1,2,0)$$, so $$P-A_1=\\langle 4,-1,-3\\rangle$$ and$$(P-A_1)\\cdot\\mathbf{v}=4+(-1)+(-3)=0.$$ Using $$(1)$$ with numerator $$0$$ gives $$Q=A_1=(1,2,0).$$ Thus $$Q(1,2,0).$$ The symmetric form of $$L_2$$ is $$x-2=y=z-1=\\mu$$, so a point on $$L_2$$ is $$A_2(2,0,1)$$ with the same direction $$\\mathbf{v}=\\langle 1,1,1\\rangle$$. Applying $$-(1)$$ to $$L_2$$: $$P-A_2=\\langle 3,1,-4\\rangle$$ and$$(P-A_2)\\cdot\\mathbf{v}=3+1+(-4)=0.$$ Hence $$R=A_2=(2,0,1).$$ Thus $$R(2,0,1).$$ Compute the vectors of the sides of $$\\triangle PQR$$: $$\\overrightarrow{PQ}=Q-P=\\langle -4,1,3\\rangle,$$ $$\\overrightarrow{PR}=R-P=\\langle -3,-1,4\\rangle.$$ The area of a triangle whose sides are $$\\mathbf{a}$$ and $$\\mathbf{b}$$ is $$\\dfrac{1}{2}\\,|\\mathbf{a}\\times\\mathbf{b}|$$. First find the cross product: $$\\overrightarrow{PQ}\\times\\overrightarrow{PR}=\\begin{vmatrix} \\mathbf{i}&\\mathbf{j}&\\mathbf{k}\\\\ -4&\\;1&\\;3\\\\ -3&-1&\\;4\\end{vmatrix}$$ $$=\\mathbf{i}(1\\cdot4-3\\cdot(-1))-\\mathbf{j}((-4)\\cdot4-3\\cdot(-3))+\\mathbf{k}((-4)\\cdot(-1)-1\\cdot(-3))$$ $$=\\mathbf{i}(4+3)-\\mathbf{j}(-16+9)+\\mathbf{k}(4+3)$$ $$=\\langle 7,7,7\\rangle.$$ Magnitude of the cross product:$$|\\langle 7,7,7\\rangle|=\\sqrt{7^{2}+7^{2}+7^{2}}=\\sqrt{147}=7\\sqrt{3}.$$ Therefore, the area of $$\\triangle PQR$$ is $$A=\\dfrac{1}{2}\\,(7\\sqrt{3})=\\dfrac{7}{2}\\sqrt{3}.$$ Finally, $$4A^{2}=4\\left(\\dfrac{7}{2}\\sqrt{3}\\right)^{2}=4\\left(\\dfrac{49\\cdot3}{4}\\right)=147.$$ Hence $$4A^{2}=147$$, which corresponds to Option B .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The number of real roots of the equation $$x|x - 2| + 3|x - 3| + 1 = 0$$ is :",
            "images": [],
            "options": [
              "A. 4",
              "B. 2",
              "C. 1",
              "D. 3"
            ],
            "correct_answer": "C",
            "explanation": "First split the real line at the points where the absolute-value expressions change their form, i.e. at $$x = 2$$ and $$x = 3$$. This gives three disjoint intervals: Case 1: $$x \\lt 2$$ Here $$|x-2| = 2-x$$ and $$|x-3| = 3-x$$. The equation becomes $$x(2-x) + 3(3-x) + 1 = 0$$ $$\\Rightarrow 2x - x^{2} + 9 - 3x + 1 = 0$$ $$\\Rightarrow -x^{2} - x + 10 = 0$$ $$\\Rightarrow x^{2} + x - 10 = 0$$ $$-(1)$$ Using the quadratic formula on $$(1)$$: $$x = \\frac{-1 \\pm \\sqrt{1 + 40}}{2} = \\frac{-1 \\pm \\sqrt{41}}{2}$$ Numerically, $$\\dfrac{-1 - \\sqrt{41}}{2} \\approx -3.70$$ and $$\\dfrac{-1 + \\sqrt{41}}{2} \\approx 2.70$$. Only the first value satisfies $$x \\lt 2$$. Hence Case 1 contributes exactly one real root: $$x = \\dfrac{-1 - \\sqrt{41}}{2}.$$ Case 2: $$2 \\le x \\lt 3$$ Here $$|x-2| = x-2$$ and $$|x-3| = 3-x$$. The equation becomes $$x(x-2) + 3(3-x) + 1 = 0$$ $$\\Rightarrow x^{2} - 2x + 9 - 3x + 1 = 0$$ $$\\Rightarrow x^{2} - 5x + 10 = 0$$ $$-(2)$$ For $$(2)$$, the discriminant is $$\\Delta = (-5)^{2} - 4(1)(10) = 25 - 40 = -15 \\lt 0,$$ so there are no real roots in Case 2. Case 3: $$x \\ge 3$$ Here $$|x-2| = x-2$$ and $$|x-3| = x-3$$. The equation becomes $$x(x-2) + 3(x-3) + 1 = 0$$ $$\\Rightarrow x^{2} - 2x + 3x - 9 + 1 = 0$$ $$\\Rightarrow x^{2} + x - 8 = 0$$ $$-(3)$$ For $$(3)$$, the roots are $$x = \\frac{-1 \\pm \\sqrt{1 + 32}}{2} = \\frac{-1 \\pm \\sqrt{33}}{2}.$$ The positive root is $$\\dfrac{-1 + \\sqrt{33}}{2} \\approx 2.37,$$ which is less than $$3,$$ and the negative root is even smaller. Hence neither root lies in the interval $$x \\ge 3,$$ so Case 3 contributes no real roots. Combining all three cases, only one value of $$x$$ satisfies the given equation. Therefore the total number of real roots is $$1$$, corresponding to Option C .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$e_1$$ and $$e_2$$ be the eccentricities of the ellipse $$\\frac{x^2}{b^2} + \\frac{y^2}{25} = 1$$ and the hyperbola $$\\frac{x^2}{16} - \\frac{y^2}{b^2} = 1$$, respectively. If $$b < 5$$ and $$e_1 e_2 = 1$$, then the eccentricity of the ellipse having its axes along the coordinate axes and passing through all four foci (two of the ellipse and two of the hyperbola) is :",
            "images": [],
            "options": [
              "A. $$\\frac{4}{5}$$",
              "B. $$\\frac{3}{5}$$",
              "C. $$\\frac{\\sqrt{7}}{4}$$",
              "D. $$\\frac{\\sqrt{3}}{2}$$"
            ],
            "correct_answer": "B",
            "explanation": "For the first ellipse $$\\dfrac{x^{2}}{b^{2}}+\\dfrac{y^{2}}{25}=1$$ the larger denominator is $$25$$, so the semi-major axis length is $$a_1 = 5$$ and the semi-minor axis length is $$b_1 = b$$. Eccentricity of an ellipse is given by $$e=\\sqrt{1-\\dfrac{b^{2}}{a^{2}}}$$. Hence $$e_1 = \\sqrt{1-\\dfrac{b^{2}}{25}} \\quad -(1)$$ For the hyperbola $$\\dfrac{x^{2}}{16}-\\dfrac{y^{2}}{b^{2}}=1$$ the semi-transverse axis is $$a_2 = 4$$ and the semi-conjugate axis is $$b_2 = b$$. Eccentricity of a hyperbola is given by $$e=\\sqrt{1+\\dfrac{b^{2}}{a^{2}}}$$. Hence $$e_2 = \\sqrt{1+\\dfrac{b^{2}}{16}} \\quad -(2)$$ Given $$e_1\\,e_2 = 1$$. Substituting from $$(1)$$ and $$(2)$$: $$\\sqrt{1-\\dfrac{b^{2}}{25}}\\;\\sqrt{1+\\dfrac{b^{2}}{16}} = 1$$ Squaring both sides: $$\\left(1-\\dfrac{b^{2}}{25}\\right)\\!\\left(1+\\dfrac{b^{2}}{16}\\right)=1$$ Expanding and simplifying: $$1+\\dfrac{b^{2}}{16}-\\dfrac{b^{2}}{25}-\\dfrac{b^{4}}{400}=1$$ $$\\dfrac{b^{2}}{16}-\\dfrac{b^{2}}{25}-\\dfrac{b^{4}}{400}=0$$ $$b^{2}\\left(\\dfrac{1}{16}-\\dfrac{1}{25}\\right)-\\dfrac{b^{4}}{400}=0$$ $$b^{2}\\left(\\dfrac{9}{400}\\right)-\\dfrac{b^{4}}{400}=0$$ $$\\dfrac{b^{2}}{400}\\Bigl(9-b^{2}\\Bigr)=0$$ Since $$b\\neq 0$$, we get $$b^{2}=9 \\Rightarrow b=3 \\;(\\text{given } b\\lt 5).$$ Now compute the four focal points: Case 1: Ellipse Eccentricity $$e_1 = \\sqrt{1-\\dfrac{9}{25}}=\\dfrac{4}{5}$$. Distance of each focus from the centre: $$c_1=a_1e_1=5\\left(\\dfrac{4}{5}\\right)=4$$. Ellipse foci: $$(0,\\pm4).$$ Case 2: Hyperbola Eccentricity $$e_2 = \\sqrt{1+\\dfrac{9}{16}}=\\dfrac{5}{4}$$. Distance of each focus from the centre: $$c_2=a_2e_2=4\\left(\\dfrac{5}{4}\\right)=5$$. Hyperbola foci: $$(\\pm5,0).$$ The required ellipse has its axes along the coordinate axes and must pass through all four foci $$(\\pm5,0),\\,(0,\\pm4)$$. Take its equation as $$\\dfrac{x^{2}}{A^{2}}+\\dfrac{y^{2}}{B^{2}}=1.$$ Substituting point $$(5,0):\\; \\dfrac{25}{A^{2}} = 1 \\Rightarrow A^{2}=25 \\Rightarrow A=5.$$ Substituting point $$(0,4):\\; \\dfrac{16}{B^{2}} = 1 \\Rightarrow B^{2}=16 \\Rightarrow B=4.$$ Thus the ellipse is $$\\dfrac{x^{2}}{25}+\\dfrac{y^{2}}{16}=1$$ with semi-major axis $$a=5$$ and semi-minor axis $$b=4$$ (since $$25\\gt16$$). Eccentricity of this ellipse is $$e = \\sqrt{1-\\dfrac{b^{2}}{a^{2}}} = \\sqrt{1-\\dfrac{16}{25}} = \\sqrt{\\dfrac{9}{25}} = \\dfrac{3}{5}.$$ Therefore, the required eccentricity is $$\\dfrac{3}{5}$$. Option B is correct.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let the system of equations $$x + 5y - z = 1$$, $$4x + 3y - 3z = 7$$, $$24x + y + \\lambda z = \\mu$$, $$\\lambda, \\mu \\in \\mathbf{R}$$, have infinitely many solutions. Then the number of the solutions of this system, if x, y, z are integers and satisfy $$7 \\le x + y + z \\le 77$$, is",
            "images": [],
            "options": [
              "A. 3",
              "B. 6",
              "C. 5",
              "D. 4"
            ],
            "correct_answer": "A",
            "explanation": "The given system is $$\\begin{aligned} x+5y-z &= 1 \\quad\\; -(1)\\\\ 4x+3y-3z &= 7 \\quad -(2)\\\\ 24x+y+\\lambda z &= \\mu \\quad -(3) \\end{aligned}$$ For infinitely many solutions the three equations must be dependent, i.e. equation $$(3)$$ must be a linear combination of $$(1)$$ and $$(2)$$ with the same combination on the right-hand sides. Let $$\\alpha,\\,\\beta$$ be real numbers such that $$\\alpha(x+5y-z)+\\beta(4x+3y-3z)=24x+y+\\lambda z \\quad -(4)$$ Matching the coefficients of $$x,\\;y,\\;z$$ in $$(4)$$ gives $$\\begin{aligned} \\alpha+4\\beta &= 24 \\quad -(5)\\\\ 5\\alpha+3\\beta &= 1 \\quad -(6)\\\\ -\\alpha-3\\beta &= \\lambda \\quad -(7) \\end{aligned}$$ Solving $$(5)$$ and $$(6)$$: Multiply $$(5)$$ by $$5$$ ⇒ $$5\\alpha+20\\beta=120$$. Subtract $$(6)$$ ⇒ $$17\\beta = 119 \\;\\Rightarrow\\; \\beta = 7$$. From $$(5)$$ ⇒ $$\\alpha = 24-4\\beta = 24-28 = -4$$. Then $$(7)$$ gives $$\\lambda = (-\\alpha-3\\beta)=4-21=-17$$. The right-hand side of $$(3)$$ must also match: $$\\mu = \\alpha\\cdot1 + \\beta\\cdot7 = (-4)\\cdot1 + 7\\cdot7 = -4+49 = 45$$. Hence infinitely many solutions occur only for $$\\boxed{\\lambda=-17,\\;\\mu = 45}$$. With these values, equation $$(3)$$ is redundant and the system reduces to $$(1)$$(2). Solve it parametrically. From $$(1)$$: $$x = 1 - 5y + z \\quad -(8)$$. Substitute $$(8)$$ in $$(2)$$: $$4(1-5y+z) + 3y - 3z = 7$$ $$4 - 20y + 4z + 3y - 3z = 7$$ $$4 - 17y + z = 7$$ $$\\Rightarrow\\; z = 3 + 17y \\quad -(9)$$. Insert $$(9)$$ into $$(8)$$: $$x = 1 - 5y + (3+17y) = 4 + 12y \\quad -(10)$$. Let $$y = t$$ (any integer). Then $$x = 4 + 12t,\\; y = t,\\; z = 3 + 17t \\quad -(11)$$ The required condition is $$7 \\le x+y+z \\le 77$$. Using $$(11)$$: $$x+y+z = (4+12t)+t+(3+17t) = 7 + 30t$$. So $$7 \\le 7 + 30t \\le 77 \\;\\Longrightarrow\\; 0 \\le 30t \\le 70$$ $$\\Rightarrow\\; 0 \\le t \\le \\frac{70}{30} = \\frac{7}{3}$$. Since $$t$$ is an integer, $$t = 0,1,2$$. Thus there are $$\\boxed{3}$$ integer triples $$(x,y,z)$$ satisfying all the given conditions. Hence the correct option is Option A (3) .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "If the sum of the second, fourth and sixth terms of a G.P. of positive terms is 21 and the sum of its eighth, tenth and twelfth terms is 15309, then the sum of its first nine terms is :",
            "images": [],
            "options": [
              "A. 760",
              "B. 755",
              "C. 750",
              "D. 757"
            ],
            "correct_answer": "D",
            "explanation": "Let the first term of the G.P. be $$a$$ and the common ratio be $$r$$, where $$a \\gt 0$$ and $$r \\gt 0$$. The $$n^{\\text{th}}$$ term is $$T_n = a\\,r^{\\,n-1}$$. The second, fourth and sixth terms are $$T_2 = a\\,r,$$ $$T_4 = a\\,r^{3},$$ $$T_6 = a\\,r^{5}.$$ Their sum is given to be $$21$$, so $$a\\,r + a\\,r^{3} + a\\,r^{5} = 21.$$ Factor out $$a\\,r$$: $$a\\,r\\bigl(1 + r^{2} + r^{4}\\bigr) = 21 \\qquad -(1)$$ The eighth, tenth and twelfth terms are $$T_8 = a\\,r^{7},$$ $$T_{10} = a\\,r^{9},$$ $$T_{12} = a\\,r^{11}.$$ Their sum is given to be $$15309$$, so $$a\\,r^{7} + a\\,r^{9} + a\\,r^{11} = 15309.$$ Factor out $$a\\,r^{7}$$: $$a\\,r^{7}\\bigl(1 + r^{2} + r^{4}\\bigr) = 15309 \\qquad -(2)$$ Both $$(1)$$ and $$(2)$$ contain the common factor $$\\bigl(1 + r^{2} + r^{4}\\bigr)$$. Divide $$(2)$$ by $$(1)$$: $$\\frac{a\\,r^{7}\\bigl(1 + r^{2} + r^{4}\\bigr)}{a\\,r\\bigl(1 + r^{2} + r^{4}\\bigr)} = \\frac{15309}{21}$$ $$r^{6} = 729$$ Since $$729 = 3^{6}$$ and $$r \\gt 0$$, we obtain $$r = 3.$$ Compute $$1 + r^{2} + r^{4}$$: $$1 + 3^{2} + 3^{4} = 1 + 9 + 81 = 91.$$ Substitute $$r = 3$$ into $$(1)$$ to find $$a$$: $$a\\,(3)\\,(91) = 21$$ $$273\\,a = 21$$ $$a = \\frac{21}{273} = \\frac{1}{13}.$$ The sum of the first nine terms of a G.P. with $$r \\neq 1$$ is $$S_9 = a\\,\\frac{r^{9} - 1}{r - 1}.$$ Substitute $$a = \\frac{1}{13}$$ and $$r = 3$$: $$S_9 = \\frac{1}{13}\\,\\frac{3^{9} - 1}{3 - 1}.$$ Calculate $$3^{9}$$: $$3^{9} = 19683.$$ Therefore $$S_9 = \\frac{1}{13}\\,\\frac{19683 - 1}{2} = \\frac{1}{13}\\,\\frac{19682}{2} = \\frac{19682}{26} = 757.$$ Hence, the sum of the first nine terms is $$757$$. Option D is correct.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "If the function $$f(x) = \\frac{\\tan(\\tan x) - \\sin(\\sin x)}{\\tan x - \\sin x}$$ is continuous at $$x = 0$$, then $$f(0)$$ is equal to _____.",
            "images": [],
            "options": [],
            "correct_answer": "2",
            "explanation": "We have to evaluate the limit $$\\lim_{x \\to 0}\\; \\frac{\\tan(\\tan x)\\;-\\;\\sin(\\sin x)}{\\tan x\\;-\\;\\sin x}$$ because, for continuity at $$x = 0$$, the value $$f(0)$$ must equal this limit. Step 1: Expand $$\\tan x$$ and $$\\sin x$$ about $$x = 0$$ up to the order $$x^{3}$$. $$\\tan x = x + \\frac{x^{3}}{3} + O(x^{5})$$ $$\\sin x = x - \\frac{x^{3}}{6} + O(x^{5})$$ Step 2: Denote $$A = \\tan x, \\qquad B = \\sin x.$$ Using the results from Step 1, $$A - B = \\left(x + \\frac{x^{3}}{3}\\right) - \\left(x - \\frac{x^{3}}{6}\\right) + O(x^{5}) = \\frac{x^{3}}{2} + O(x^{5}).$$ Step 3: Expand $$\\tan A$$ and $$\\sin B$$ for small arguments $$A, B$$. For any small $$y$$, $$\\tan y = y + \\frac{y^{3}}{3} + O(y^{5}),$$ $$\\sin y = y - \\frac{y^{3}}{6} + O(y^{5}).$$ Applying these with $$y = A$$ and $$y = B$$: $$\\tan(\\tan x) = \\tan A = A + \\frac{A^{3}}{3} + O(x^{5}),$$ $$\\sin(\\sin x) = \\sin B = B - \\frac{B^{3}}{6} + O(x^{5}).$$ Step 4: Form the numerator. $$\\tan A - \\sin B = (A - B) + \\left(\\frac{A^{3}}{3} + \\frac{B^{3}}{6}\\right) + O(x^{5}).$$ Because $$A = x + O(x^{3})$$ and $$B = x + O(x^{3})$$, we have $$A^{3} = x^{3} + O(x^{5})$$ and $$B^{3} = x^{3} + O(x^{5}).$$ Hence $$\\frac{A^{3}}{3} + \\frac{B^{3}}{6} = \\frac{x^{3}}{3} + \\frac{x^{3}}{6} + O(x^{5}) = \\frac{x^{3}}{2} + O(x^{5}).$$ Therefore $$\\tan A - \\sin B = \\left(\\frac{x^{3}}{2}\\right) + \\left(\\frac{x^{3}}{2}\\right) + O(x^{5}) = x^{3} + O(x^{5}).$$ Step 5: Form the denominator (already obtained in Step 2): $$\\tan x - \\sin x = \\frac{x^{3}}{2} + O(x^{5}).$$ Step 6: Take the ratio and pass to the limit: $$\\frac{\\tan(\\tan x) - \\sin(\\sin x)}{\\tan x - \\sin x} = \\frac{x^{3} + O(x^{5})}{\\dfrac{x^{3}}{2} + O(x^{5})} = \\frac{x^{3}\\left[1 + O(x^{2})\\right]}{\\dfrac{x^{3}}{2}\\left[1 + O(x^{2})\\right]} = 2 \\cdot \\frac{1 + O(x^{2})}{1 + O(x^{2})}.$$ As $$x \\to 0$$, the terms $$O(x^{2})$$ vanish, giving $$\\lim_{x \\to 0}\\; \\frac{\\tan(\\tan x) - \\sin(\\sin x)}{\\tan x - \\sin x} = 2.$$ Hence, to make $$f(x)$$ continuous at $$x = 0$$, we must define $$f(0) = 2.$$ Answer: $$f(0) = 2$$.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "If $$\\int \\left(\\frac{1}{x} + \\frac{1}{x^3}\\right)\\left(\\sqrt[23]{3x^{-24} + x^{-26}}\\right) dx = -\\frac{\\alpha}{3(\\alpha+1)}(3x^\\beta + x^\\gamma)^{\\frac{\\alpha+1}{\\alpha}} + C$$, $$x > 0$$, $$(\\alpha, \\beta, \\gamma \\in \\mathbb{Z})$$, where C is the constant of integration, then $$\\alpha + \\beta + \\gamma$$ is equal to _____.",
            "images": [],
            "options": [],
            "correct_answer": "19",
            "explanation": "We begin with the given integrand $$I=\\left(\\frac1x+\\frac1{x^{3}}\\right)\\left(3x^{-24}+x^{-26}\\right)^{\\frac1{23}}, \\qquad x\\gt 0.$$ The powers inside the radical differ by $$2$$, so take out the larger common power $$x^{-23}$$ from the second bracket: $$3x^{-24}+x^{-26}=x^{-23}\\!\\left(3x^{-1}+x^{-3}\\right).$$ Using $$\\bigl(x^{-23}\\bigr)^{\\!\\frac1{23}}=x^{-1},$$ the radical becomes $$\\left(3x^{-24}+x^{-26}\\right)^{\\frac1{23}}=x^{-1}\\!\\left(3x^{-1}+x^{-3}\\right)^{\\frac1{23}}.$$ Substituting this back in $$I$$ gives $$I=\\left(\\frac1x+\\frac1{x^{3}}\\right)x^{-1}\\left(3x^{-1}+x^{-3}\\right)^{\\frac1{23}}=\\left(\\frac1{x^{2}}+\\frac1{x^{4}}\\right)\\left(3x^{-1}+x^{-3}\\right)^{\\frac1{23}}.$$ Now observe the derivative of the inner expression: $$\\frac{d}{dx}\\!\\left(3x^{-1}+x^{-3}\\right)=-3x^{-2}-3x^{-4}=-3\\!\\left(\\frac1{x^{2}}+\\frac1{x^{4}}\\right).$$ Hence, apart from the constant factor $$-3$$, the term $$\\dfrac1{x^{2}}+\\dfrac1{x^{4}}$$ in $$I$$ is the derivative of $$3x^{-1}+x^{-3}$$. Rewrite $$I$$ accordingly: $$I=-\\frac13\\;\\frac{d}{dx}\\!\\left(3x^{-1}+x^{-3}\\right)\\left(3x^{-1}+x^{-3}\\right)^{\\frac1{23}}.$$ This is of the standard form $$f'(x)\\,f(x)^{\\lambda}$$ with $$f(x)=3x^{-1}+x^{-3}$$ and $$\\lambda=\\dfrac1{23}$$. Integrating directly, $$\\int I\\,dx=-\\frac13\\int f'(x)\\,f(x)^{\\frac1{23}}dx =-\\frac13\\;\\frac{f(x)^{\\frac{1}{23}+1}}{\\frac{1}{23}+1}+C =-\\frac{23}{3\\!\\left(23+1\\right)}\\!\\left(3x^{-1}+x^{-3}\\right)^{\\frac{24}{23}}+C.$$ Comparing with the form provided in the question, $$-\\frac{\\alpha}{3(\\alpha+1)}\\!\\left(3x^{\\beta}+x^{\\gamma}\\right)^{\\frac{\\alpha+1}{\\alpha}}+C,$$ we identify $$\\alpha=23,\\qquad \\beta=-1,\\qquad \\gamma=-3.$$ Finally, $$\\alpha+\\beta+\\gamma=23+(-1)+(-3)=19.$$ Therefore, the required value is $$\\boxed{19}$$.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "For $$t > -1$$, let $$\\alpha_t$$ and $$\\beta_t$$ be the roots of the equation $$\\left((t+2)^{1/7} - 1\\right)x^2 + \\left((t+2)^{1/6} - 1\\right)x + \\left((t+2)^{1/21} - 1\\right) = 0$$. If $$\\lim_{t \\to -1^+} \\alpha_t = a$$ and $$\\lim_{t \\to -1^+} \\beta_t = b$$, then $$72(a + b)^2$$ is equal to _____.",
            "images": [],
            "options": [],
            "correct_answer": "98",
            "explanation": "Let $$A(t) = (t+2)^{1/7}-1,\\; B(t) = (t+2)^{1/6}-1,\\; C(t) = (t+2)^{1/21}-1$$. For $$t \\gt -1$$ the quadratic in $$x$$ is $$A(t)\\,x^{2}+B(t)\\,x+C(t)=0$$ Put $$t=-1+\\varepsilon$$ with $$\\varepsilon \\to 0^{+}$$, so $$t+2 = 1+\\varepsilon$$. Using the first-order binomial approximation $$\\bigl(1+\\varepsilon\\bigr)^{k} = 1+k\\varepsilon+O(\\varepsilon^{2})$$ as $$\\varepsilon \\to 0$$, we get $$A(t)= (1+\\varepsilon)^{1/7}-1 = \\tfrac{1}{7}\\varepsilon+O(\\varepsilon^{2}),$$ $$B(t)= (1+\\varepsilon)^{1/6}-1 = \\tfrac{1}{6}\\varepsilon+O(\\varepsilon^{2}),$$ $$C(t)= (1+\\varepsilon)^{1/21}-1 = \\tfrac{1}{21}\\varepsilon+O(\\varepsilon^{2}).$$ Hence the quadratic becomes $$\\bigl(\\tfrac{1}{7}\\varepsilon+O(\\varepsilon^{2})\\bigr)x^{2}+ \\bigl(\\tfrac{1}{6}\\varepsilon+O(\\varepsilon^{2})\\bigr)x+ \\bigl(\\tfrac{1}{21}\\varepsilon+O(\\varepsilon^{2})\\bigr)=0.$$ Because $$\\varepsilon \\neq 0$$, divide by $$\\varepsilon$$ and then let $$\\varepsilon \\to 0^{+}$$: $$\\tfrac{1}{7}x^{2}+\\tfrac{1}{6}x+\\tfrac{1}{21}=0.$$ This limiting quadratic has roots $$a=\\lim_{t\\to-1^{+}}\\alpha_{t}$$ and $$b=\\lim_{t\\to-1^{+}}\\beta_{t}$$. For a quadratic $$px^{2}+qx+r=0$$, the sum of the roots is $$-\\dfrac{q}{p}$$. Here $$p=\\tfrac{1}{7},\\; q=\\tfrac{1}{6}$$, so $$a+b = -\\frac{\\tfrac{1}{6}}{\\tfrac{1}{7}} = -\\frac{7}{6}.$$ Therefore $$72\\,(a+b)^{2} = 72 \\left(-\\frac{7}{6}\\right)^{2} = 72 \\cdot \\frac{49}{36} = 2 \\cdot 49 = 98.$$ Hence the required value is $$\\boxed{98}$$.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "Let the lengths of the transverse and conjugate axes of a hyperbola in standard form be 2a and 2b, respectively, and one focus and the corresponding directrix of this hyperbola be $$(-5, 0)$$ and $$5x + 9 = 0$$, respectively. If the product of the focal distances of a point $$\\left(\\alpha, 2\\sqrt{5}\\right)$$ on the hyperbola is p, then 4p is equal to _____.",
            "images": [],
            "options": [],
            "correct_answer": "189",
            "explanation": "The standard horizontal hyperbola with centre at the origin is written as $$\\frac{x^{2}}{a^{2}}-\\frac{y^{2}}{b^{2}}=1$$. Its basic facts are: • Foci $$\\left(\\pm c,\\,0\\right)$$ where $$c^{2}=a^{2}+b^{2}$$. • Eccentricity $$e=\\frac{c}{a}\\ (e\\gt 1)$$. • Directrices $$x=\\pm\\frac{a}{e}$$ (each focus has the nearer directrix). We are told that one focus is $$(-5,0)$$ and the corresponding directrix is $$5x+9=0$$, i.e. $$x=-\\frac{9}{5}$$. Hence $$c=5,\\qquad -\\frac{a}{e}=-\\frac{9}{5}\\; \\Longrightarrow\\; \\frac{a}{e}=\\frac{9}{5}\\; -(1)$$ Using $$e=\\frac{c}{a}$$, substitute $$c=5$$ into $$e=\\frac{5}{a}$$ and then into $$(1)$$: $$\\frac{a}{e}=a\\left(\\frac{a}{5}\\right)=\\frac{a^{2}}{5}=\\frac{9}{5}\\; \\Longrightarrow\\; a^{2}=9\\; \\Longrightarrow\\; a=3.$$ Now compute $$b^{2}$$ using $$c^{2}=a^{2}+b^{2}$$: $$25=9+b^{2}\\; \\Longrightarrow\\; b^{2}=16\\; \\Longrightarrow\\; b=4.$$ Therefore the hyperbola is $$\\frac{x^{2}}{9}-\\frac{y^{2}}{16}=1$$. The given point $$\\left(\\alpha,\\,2\\sqrt{5}\\right)$$ lies on the curve, so substitute it: $$\\frac{\\alpha^{2}}{9}-\\frac{(2\\sqrt{5})^{2}}{16}=1 \\quad\\Longrightarrow\\quad \\frac{\\alpha^{2}}{9}-\\frac{20}{16}=1.$$ Simplify: $$\\frac{\\alpha^{2}}{9}-\\frac{5}{4}=1\\; \\Longrightarrow\\; \\frac{\\alpha^{2}}{9}=\\frac{9}{4}\\; \\Longrightarrow\\; \\alpha^{2}=\\frac{81}{4}\\; \\Longrightarrow\\; \\alpha=\\pm\\frac{9}{2}.$$ Let $$P(\\alpha,2\\sqrt{5})$$ be the point; its distances to the two foci $$F_{1}(5,0)$$ and $$F_{2}(-5,0)$$ are $$PF_{1}=\\sqrt{(\\alpha-5)^{2}+(2\\sqrt{5})^{2}},\\qquad PF_{2}=\\sqrt{(\\alpha+5)^{2}+(2\\sqrt{5})^{2}}.$$ The required product is $$p=PF_{1}\\,PF_{2}=\\sqrt{\\bigl[(\\alpha-5)^{2}+20\\bigr]\\bigl[(\\alpha+5)^{2}+20\\bigr]}.$$ Case 1: $$\\alpha=\\frac{9}{2}=4.5$$ $$\\bigl[(\\alpha-5)^{2}+20\\bigr]=(4.5-5)^{2}+20=0.25+20=20.25,$$ $$\\bigl[(\\alpha+5)^{2}+20\\bigr]=(4.5+5)^{2}+20=90.25+20=110.25.$$ Product inside the root: $$20.25\\times110.25=2232.5625,$$ hence $$p=\\sqrt{2232.5625}=47.25.$$ Case 2: $$\\alpha=-\\frac{9}{2}=-4.5$$ This merely interchanges the two factors, giving the same product $$p=47.25$$. Finally, $$4p=4\\times47.25=189.$$ Hence, $$\\boxed{4p=189}$$.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "The sum of the series $$2 \\times 1 \\times {^{20}C_4} - 3 \\times 2 \\times {^{20}C_5} + 4 \\times 3 \\times {^{20}C_6} - 5 \\times 4 \\times {^{20}C_7} + \\ldots + 18 \\times 17 \\times {^{20}C_{20}}$$, is equal to",
            "images": [],
            "options": [],
            "correct_answer": "34",
            "explanation": "Write a general term for the given series. For the term containing $${}^{20}C_r$$ (where $$4 \\le r \\le 20$$) we have $$\\text{term} = (-1)^r\\,(r-2)(r-3)\\,{}^{20}C_r$$ because the sign alternates starting with $$+$$ for $$r=4$$, and $$(r-2)(r-3)=2 \\cdot 1,\\; 3 \\cdot 2,\\; 4 \\cdot 3,\\ldots$$ exactly as in the question. Denote the required sum by $$S$$: $$S=\\sum_{r=4}^{20}(-1)^r\\,(r-2)(r-3)\\,{}^{20}C_r$$ $$-(1)$$ First evaluate the easier sum running from $$r=0$$ to $$20$$ and then subtract the unwanted first four terms. Define $$T=\\sum_{r=0}^{20}(-1)^r\\,(r-2)(r-3)\\,{}^{20}C_r$$ $$-(2)$$ Expand $$(r-2)(r-3)$$ so that each part can be handled by standard binomial identities: $$(r-2)(r-3)=r(r-1)-5r+6$$ Therefore $$T=\\sum_{r=0}^{20}(-1)^r r(r-1)\\,{}^{20}C_r -5\\sum_{r=0}^{20}(-1)^r r\\,{}^{20}C_r +6\\sum_{r=0}^{20}(-1)^r {}^{20}C_r$$ $$-(3)$$ Each of the three sums in $$(3)$$ can be evaluated by differentiating $$(1+x)^{20}$$ at $$x=-1$$. 1. $$\\displaystyle \\sum_{r=0}^{20}(-1)^r{}^{20}C_r=(1-1)^{20}=0$$ 2. Differentiate once: $$20(1+x)^{19}=\\sum_{r=0}^{20}r\\,{}^{20}C_r x^{\\,r-1}$$ Multiply by $$x$$ and put $$x=-1$$: $$\\sum_{r=0}^{20}(-1)^r r\\,{}^{20}C_r = -20(1-1)^{19}=0$$ 3. Differentiate twice: $$20\\!\\cdot\\!19\\,(1+x)^{18}=\\sum_{r=0}^{20} r(r-1)\\,{}^{20}C_r x^{\\,r-2}$$ Multiply by $$x^2$$ and put $$x=-1$$: $$\\sum_{r=0}^{20}(-1)^r r(r-1)\\,{}^{20}C_r = 20\\!\\cdot\\!19\\,(1-1)^{18}=0$$ Hence every sum in $$(3)$$ equals $$0$$, so $$T=0$$ $$-(4)$$ We now remove the terms for $$r=0,1,2,3$$ to obtain $$S$$. Compute the four omitted terms: For $$r=0$$: $$(-1)^0(0-2)(0-3){}^{20}C_0 = 6$$ For $$r=1$$: $$(-1)^1(1-2)(1-3){}^{20}C_1 = -2 \\times 20 = -40$$ For $$r=2$$: $$(-1)^2(0)(-1){}^{20}C_2 = 0$$ For $$r=3$$: $$(-1)^3(1)(0){}^{20}C_3 = 0$$ The total of the excluded terms is $$6-40=-34$$. Because $$T=0$$ from $$(4)$$, we have $$S = T - (\\text{excluded terms}) = 0 - (-34) = 34$$ Thus, the value of the given series is $$34$$.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          }
        ]
      },
    ],
  },
  {
    title: 'JEE Main 2025 April 8 shift 2',
    exam_type: 'JEE_MAIN',
    branch: null,
    sections: [
      {
        name: 'Physics',
        questions: [
          {
            "question_text": "Given below are two statements: one is labelled as Assertion A and the other is labelled as Reason R Assertion A : Work done in moving a test charge between two points inside a uniformly charged spherical shell is zero, no matter which path is chosen. Reason R : Electrostatic potential inside a uniformly charged spherical shell is constant and is same as that on the surface of the shell. Choose the correct answer :",
            "images": [],
            "options": [
              "A. A is true but R is false",
              "B. Both A and R are true and R is the correct explanation of A",
              "C. A is false but R is true",
              "D. Both A and R are true but R is NOT the correct explanation of A"
            ],
            "correct_answer": "B",
            "explanation": "Electrostatic force is a conservative force, so the work $$W$$ done by (or against) the electric field in taking a test charge $$q_0$$ from point $$A$$ to point $$B$$ is related to the potential difference by $$W = q_0\\,(V_B - V_A)\\,\\,\\,\\,\\,\\,\\,\\, -(1)$$ For a uniformly charged thin spherical shell of radius $$R$$, the magnitude of the electric field $$E$$ at any point whose distance from the centre is $$r$$ satisfies $$E = 0 \\quad \\text{for} \\; r \\lt R$$ $$E = \\dfrac{1}{4\\pi\\varepsilon_0}\\dfrac{Q}{r^{2}} \\quad \\text{for} \\; r \\gt R$$ Since $$E = 0$$ everywhere inside the shell, the line integral of $$\\mathbf{E}\\cdot d\\mathbf{l}$$ between any two interior points is zero. Therefore the electrostatic potential throughout the interior is the same constant value, equal to the potential on the surface: $$V_{\\text{inside}} = V_{\\text{surface}} = \\dfrac{1}{4\\pi\\varepsilon_0}\\dfrac{Q}{R}\\,\\,\\,\\,\\,\\,\\,\\, -(2)$$ Using $$(2)$$ in $$(1)$$, for any two interior points $$A$$ and $$B$$ we get $$V_B = V_A \\;\\; \\Longrightarrow \\;\\; W = q_0\\,(V_B - V_A) = 0$$ This result does not depend on the path followed because the electric force is conservative. Hence: Case 1 : Assertion A \"Work done in moving a test charge between two points inside a uniformly charged spherical shell is zero, no matter which path is chosen.\" We have just proven $$W = 0$$, so Assertion A is true. Case 2 : Reason R \"Electrostatic potential inside a uniformly charged spherical shell is constant and is same as that on the surface of the shell.\" Equation $$(2)$$ confirms this, so Reason R is also true. Because the constancy of potential (Reason R) directly leads to zero potential difference, which in turn makes the work done zero (Assertion A), R is the correct explanation of A. Therefore the correct choice is Option B: Both A and R are true and R is the correct explanation of A.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A rod of linear mass density '$$\\lambda$$' and length 'L' is bent to form a ring of radius 'R'. Moment of inertia of ring about any of its diameter is :",
            "images": [],
            "options": [
              "A. $$\\frac{\\lambda L^3}{16\\pi^2}$$",
              "B. $$\\frac{\\lambda L^3}{12}$$",
              "C. $$\\frac{\\lambda L^3}{4\\pi^2}$$",
              "D. $$\\frac{\\lambda L^3}{8\\pi^2}$$"
            ],
            "correct_answer": "D",
            "explanation": "The straight rod is bent until its two ends meet, so the whole length of the rod becomes the circumference of a circle. Hence, $$\\text{circumference}=2\\pi R=L$$ $$-(1)$$ which gives $$R=\\frac{L}{2\\pi}$$ $$-(2)$$ Mass of the ring: linear mass density $$\\lambda$$ means $$m=\\lambda\\times(\\text{length})=\\lambda L$$ $$-(3)$$ For a thin ring of mass $$m$$ and radius $$R$$: • Moment of inertia about the axis perpendicular to its plane and passing through the centre is $$I_{z}=mR^{2}$$. • For any diameter (say $$x$$-axis) lying in the plane of the ring, use the perpendicular-axis theorem: $$I_{x}+I_{y}=I_{z}$$. Because of symmetry, $$I_{x}=I_{y}=I_{d}$$ (moment of inertia about any diameter), so $$2I_{d}=mR^{2} \\;\\; \\Longrightarrow \\;\\; I_{d}=\\frac{mR^{2}}{2}$$ $$-(4)$$ Substitute $$m$$ from $$(3)$$ and $$R$$ from $$(2)$$ into $$(4)$$: $$I_{d}=\\frac{\\lambda L}{2}\\left(\\frac{L}{2\\pi}\\right)^{2} =\\frac{\\lambda L}{2}\\cdot\\frac{L^{2}}{4\\pi^{2}} =\\frac{\\lambda L^{3}}{8\\pi^{2}}$$ Thus, the moment of inertia of the ring about any diameter is $$\\boxed{\\displaystyle \\frac{\\lambda L^{3}}{8\\pi^{2}}}$$, which corresponds to Option D .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A 3 m long wire of radius 3 mm shows an extension of 0.1 mm when loaded vertically by a mass of 50 kg in an experiment to determine Young's modulus. The value of Young's modulus of the wire is $$P \\times 10^{11}$$ Nm$$^{-2}$$, where P is : (Take $$g = 3\\pi$$ m/s$$^2$$)",
            "images": [],
            "options": [
              "A. 5",
              "B. 10",
              "C. 25",
              "D. 2.5"
            ],
            "correct_answer": "A",
            "explanation": "The extension in a wire under a load is related to Young’s modulus $$Y$$ by the formula $$Y = \\frac{F\\,L}{A\\,\\Delta L}$$ where $$F$$ = stretching force, $$L$$ = original length of the wire, $$A$$ = cross-sectional area, and $$\\Delta L$$ = extension produced. First, find each quantity from the data given: Force The load is a mass of $$50\\ \\text{kg}$$, so the force is its weight: $$F = m g = 50 \\times 3\\pi = 150\\pi\\ \\text{N}$$ Original length $$L = 3\\ \\text{m}$$ Extension $$\\Delta L = 0.1\\ \\text{mm} = 0.1 \\times 10^{-3}\\ \\text{m} = 1 \\times 10^{-4}\\ \\text{m}$$ Cross-sectional area The wire has radius $$r = 3\\ \\text{mm} = 3 \\times 10^{-3}\\ \\text{m}$$. Area $$A = \\pi r^{2} = \\pi \\left(3 \\times 10^{-3}\\right)^{2} = \\pi \\times 9 \\times 10^{-6} = 9\\pi \\times 10^{-6}\\ \\text{m}^{2}$$ Substitute into the formula for $$Y$$ $$Y = \\frac{150\\pi \\times 3}{9\\pi \\times 10^{-6} \\times 1 \\times 10^{-4}}$$ Simplify step by step: • Multiply force and length: $$150\\pi \\times 3 = 450\\pi$$ • Multiply area and extension: $$9\\pi \\times 10^{-6} \\times 1 \\times 10^{-4} = 9\\pi \\times 10^{-10}$$ • Divide: $$Y = \\frac{450\\pi}{9\\pi \\times 10^{-10}} = \\frac{450}{9} \\times 10^{10} = 50 \\times 10^{10}\\ \\text{N m}^{-2}$$ • Write in the required power-of-ten form: $$50 \\times 10^{10} = 5 \\times 10^{11}\\ \\text{N m}^{-2}$$ Hence the Young’s modulus is $$P \\times 10^{11}\\ \\text{N m}^{-2}$$ with $$P = 5$$. Therefore, the correct option is Option A .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Electric charge is transferred to an irregular metallic disk as shown in figure. If $$\\sigma_1$$, $$\\sigma_2$$, $$\\sigma_3$$ and $$\\sigma_4$$ are charge densities at given points then, choose the correct answer from the options given below :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/electric-charge-is-transferred-to-a_img1.png"
              }
            ],
            "options": [
              "A. A, B and C Only",
              "B. A and C Only",
              "C. D and E Only",
              "D. B and C Only"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Water falls from a height of 200 m into a pool. Calculate the rise in temperature of the water assuming no heat dissipation from the water in the pool. (Take $$g = 10$$ m/s$$^2$$, specific heat of water = 4200 J/(kg K))",
            "images": [],
            "options": [
              "A. 0.23 K",
              "B. 0.36 K",
              "C. 0.14 K",
              "D. 0.48 K"
            ],
            "correct_answer": "D",
            "explanation": "When water falls freely, its gravitational potential energy is converted into internal energy (heat) on reaching the pool. Ignoring any heat loss to the surroundings, the gain in internal energy raises the water’s temperature. For a mass $$m$$ of water falling through height $$h$$, the potential energy lost is $$\\text{Potential energy} = m g h$$ This energy appears as heat: $$m c \\Delta T$$, where $$c$$ is the specific heat capacity and $$\\Delta T$$ is the rise in temperature. Equating the two energies: $$m g h = m c \\Delta T$$ Cancel the common factor $$m$$ (mass of water): $$g h = c \\Delta T$$ Hence the temperature rise is $$\\Delta T = \\frac{g h}{c}$$ Insert the given values: $$g = 10 \\text{ m s}^{-2}$$, $$h = 200 \\text{ m}$$, $$c = 4200 \\text{ J kg}^{-1} \\text{ K}^{-1}$$. $$\\Delta T = \\frac{10 \\times 200}{4200}$$ $$\\Delta T = \\frac{2000}{4200} = 0.476 \\text{ K} \\approx 0.48 \\text{ K}$$ Therefore, the rise in temperature of the water is about $$0.48 \\text{ K}$$. Correct option: Option D (0.48 K)",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A concave-convex lens of refractive index $$1.5$$ and the radii of curvature of its surfaces are $$30 cm$$ and $$20 cm$$, respectively. The concave surface is upwards and is filled with a liquid of refractive index $$1.3$$. The focal length of the liquid-glass combination will be",
            "images": [],
            "options": [
              "A. $$\\frac{500}{11}$$ cm",
              "B. $$\\frac{800}{11}$$ cm",
              "C. $$\\frac{700}{11}$$ cm",
              "D. $$\\frac{600}{11}$$ cm"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "An infinitely long wire has uniform linear charge density $$\\lambda = 2$$ nC/m. The net flux through a Gaussian cube of side length $$\\sqrt{3}$$ cm, if the wire passes through two corners of the cube that are maximally displaced from each other, would be $$x$$ Nm$$^2$$C$$^{-1}$$, where x is : [Neglect any edge effects and use $$\\frac{1}{4\\pi\\epsilon_0}= 9\\times10^{9}$$ SI units]",
            "images": [],
            "options": [
              "A. $$0.72\\pi$$",
              "B. $$1.44\\pi$$",
              "C. $$6.48\\pi$$",
              "D. $$2.16\\pi$$"
            ],
            "correct_answer": "D",
            "explanation": "A long straight wire carries uniform linear charge density $$\\lambda = 2\\,\\text{nC m}^{-1}=2\\times10^{-9}\\,\\text{C m}^{-1}$$. We have to find the electric-flux through a Gaussian cube of side length $$a=\\sqrt{3}\\,\\text{cm}=0.01\\sqrt{3}\\,\\text{m}$$ when the wire passes through the two diagonally opposite corners of the cube. Step 1 : Length of the wire lying inside the cube For a cube of side $$a$$, the space-diagonal length is $$a\\sqrt{3}$$. Because the straight wire enters at one corner and exits at the diametrically opposite corner, the portion of the wire enclosed by the cube equals the space-diagonal. Hence $$ \\ell_{\\text{in}} = a\\sqrt{3} $$ Substituting $$a=\\sqrt{3}\\,\\text{cm}$$, $$ \\ell_{\\text{in}} = (\\sqrt{3}\\,\\text{cm})\\sqrt{3}=3\\,\\text{cm}=0.03\\,\\text{m} $$ Step 2 : Charge enclosed by the Gaussian surface Using $$q_{\\text{enc}} = \\lambda \\ell_{\\text{in}}$$, $$ q_{\\text{enc}} = (2\\times10^{-9})\\times(0.03)=6\\times10^{-11}\\,\\text{C} $$ Step 3 : Electric-flux through the cube Gauss’s law states $$\\Phi = \\dfrac{q_{\\text{enc}}}{\\varepsilon_0}$$ $$-(1)$$ With $$\\varepsilon_0 = 8.854\\times10^{-12}\\,\\text{C}^2\\text{N}^{-1}\\text{m}^{-2}$$, substitute in $$(1)$$: $$ \\Phi = \\dfrac{6\\times10^{-11}}{8.854\\times10^{-12}} = 6.784\\times10^{0}\\;\\text{N m}^2\\text{C}^{-1} $$ Step 4 : Expressing the result in terms of $$\\pi$$ Calculate $$2.16\\pi$$: $$ 2.16\\pi = 2.16 \\times 3.1416 \\approx 6.79 $$ which matches the obtained value (6.784). Hence $$ \\Phi = 2.16\\pi\\; \\text{N m}^2\\text{C}^{-1} $$ Therefore, $$x = 2.16\\pi$$ and the correct option is Option D .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The output voltage in the following circuit is (Consider ideal diode case) :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/the-output-voltage-in-the-following_img1.png"
              }
            ],
            "options": [
              "A. 10 V",
              "B. 0 V",
              "C. +5 V",
              "D. -5 V"
            ],
            "correct_answer": "B",
            "explanation": "",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Two metal spheres of radius R and 3R have same surface charge density $$\\sigma$$. If they are brought in contact and then separated, the surface charge density on smaller and bigger sphere becomes $$\\sigma_1$$ and $$\\sigma_2$$, respectively. The ratio $$\\frac{\\sigma_1}{\\sigma_2}$$ is :",
            "images": [],
            "options": [
              "A. $$\\frac{1}{9}$$",
              "B. 9",
              "C. $$\\frac{1}{3}$$",
              "D. 3"
            ],
            "correct_answer": "D",
            "explanation": "Let the radii of the two conducting spheres be $$R$$ (smaller) and $$3R$$ (bigger). Both spheres initially have the same surface charge density $$\\sigma$$. Initial charges Charge on the smaller sphere: $$Q_{s}= \\sigma \\times 4\\pi R^{2}$$ Charge on the bigger sphere: $$Q_{b}= \\sigma \\times 4\\pi (3R)^{2}= \\sigma \\times 4\\pi \\times 9R^{2}= 9\\sigma \\,4\\pi R^{2}$$ Total initial charge on the system: $$Q_{\\text{total}} = Q_{s}+Q_{b} = \\sigma \\,4\\pi R^{2}(1+9)=10\\sigma \\,4\\pi R^{2}$$ When the spheres are connected by a conducting wire, they come to the same potential. For an isolated charged sphere of radius $$r$$, the electrostatic potential is $$V = \\frac{1}{4\\pi\\varepsilon_0}\\,\\frac{Q}{r}$$ After contact, let the final charges be $$Q'_s$$ (smaller) and $$Q'_b$$ (bigger). Equality of potentials gives $$\\frac{Q'_s}{R} = \\frac{Q'_b}{3R} \\;\\;\\Longrightarrow\\;\\; Q'_s = \\frac{Q'_b}{3} \\quad -(1)$$ Charge conservation gives $$Q'_s + Q'_b = Q_{\\text{total}} = 10\\sigma \\,4\\pi R^{2} \\quad -(2)$$ Substituting $$Q'_s$$ from $$(1)$$ into $$(2)$$: $$\\frac{Q'_b}{3} + Q'_b = 10\\sigma \\,4\\pi R^{2}$$ $$\\frac{4}{3}Q'_b = 10\\sigma \\,4\\pi R^{2}$$ $$Q'_b = \\frac{30}{4}\\,\\sigma \\,4\\pi R^{2}= \\frac{15}{2}\\,\\sigma \\,4\\pi R^{2}$$ Using $$(1)$$, $$Q'_s = \\frac{Q'_b}{3}= \\frac{15}{2}\\times \\frac{1}{3}\\,\\sigma \\,4\\pi R^{2}= \\frac{5}{2}\\,\\sigma \\,4\\pi R^{2}$$ Final surface charge densities Smaller sphere: $$\\sigma_1 = \\frac{Q'_s}{4\\pi R^{2}} = \\frac{5}{2}\\sigma$$ Bigger sphere: $$\\sigma_2 = \\frac{Q'_b}{4\\pi (3R)^{2}} = \\frac{\\frac{15}{2}\\,\\sigma \\,4\\pi R^{2}}{4\\pi \\times 9R^{2}} = \\frac{15}{2}\\times\\frac{1}{9}\\,\\sigma = \\frac{5}{6}\\sigma$$ Required ratio $$\\frac{\\sigma_1}{\\sigma_2} = \\frac{\\frac{5}{2}\\sigma}{\\frac{5}{6}\\sigma} = \\frac{1}{2}\\times\\frac{6}{1} = 3$$ The ratio $$\\dfrac{\\sigma_1}{\\sigma_2}$$ equals 3, which matches Option D.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A quantity Q is formulated as $$X^{-2}Y^{+\\frac{3}{2}}Z^{-\\frac{2}{5}}$$. X, Y and Z are independent parameters which have fractional errors of 0.1, 0.2 and 0.5, respectively in measurement. The maximum fractional error of Q is",
            "images": [],
            "options": [
              "A. 0.1",
              "B. 0.8",
              "C. 0.7",
              "D. 0.6"
            ],
            "correct_answer": "C",
            "explanation": "The quantity is $$Q = X^{-2}\\,Y^{-\\,\\frac{3}{2}}\\,Z^{\\frac{2}{5}}$$. For a physical quantity of the form $$Q = X^{a}\\,Y^{b}\\,Z^{c}$$, the maximum fractional (relative) error is obtained by adding the absolute contributions of each factor: $$\\frac{\\Delta Q}{Q}\\Big|_{\\max}=|a|\\;\\frac{\\Delta X}{X}+|b|\\;\\frac{\\Delta Y}{Y}+|c|\\;\\frac{\\Delta Z}{Z}$$. Here $$a=-2,\\;b=-\\frac{3}{2},\\;c=\\frac{2}{5}$$. Their absolute values are $$|a|=2,\\;|b|=\\frac{3}{2}=1.5,\\;|c|=\\frac{2}{5}=0.4$$. The given fractional errors are $$\\frac{\\Delta X}{X}=0.1,\\qquad \\frac{\\Delta Y}{Y}=0.2,\\qquad \\frac{\\Delta Z}{Z}=0.5$$. Substituting these values: $$\\frac{\\Delta Q}{Q}\\Big|_{\\max}=2(0.1)+1.5(0.2)+0.4(0.5)$$ Calculate each term: $$2(0.1)=0.2,\\qquad 1.5(0.2)=0.3,\\qquad 0.4(0.5)=0.2$$ Add them: $$0.2+0.3+0.2 = 0.7$$ Therefore, the maximum fractional error in $$Q$$ is $$0.7$$. Option C is correct.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A monoatomic gas having $$\\gamma = \\frac{5}{3}$$ is stored in a thermally insulated container and the gas is suddenly compressed to $$\\left(\\frac{1}{8}\\right)^{\\text{th}}$$ of its initial volume. The ratio of final pressure and initial pressure is : ($$\\gamma$$ is the ratio of specific heats of the gas at constant pressure and at constant volume)",
            "images": [],
            "options": [
              "A. 16",
              "B. 40",
              "C. 32",
              "D. 28"
            ],
            "correct_answer": "C",
            "explanation": "The process is sudden and the container is thermally insulated, so no heat enters or leaves the gas. Such a process is adiabatic. For an adiabatic change in an ideal gas, the equation is $$P V^{\\gamma} = \\text{constant}$$ Let the initial state be $$(P_1 , V_1)$$ and the final state be $$(P_2 , V_2)$$. Writing the adiabatic relation for the two states gives $$P_1 V_1^{\\gamma} = P_2 V_2^{\\gamma}$$ Re-arrange to obtain the pressure ratio: $$\\frac{P_2}{P_1} = \\left(\\frac{V_1}{V_2}\\right)^{\\gamma}$$ $$-(1)$$ The gas is compressed to $$\\left(\\frac{1}{8}\\right)^{\\text{th}}$$ of its original volume, so $$V_2 = \\frac{V_1}{8}$$ ⇒ $$\\frac{V_1}{V_2} = 8$$ Given $$\\gamma = \\frac{5}{3}$$ for a monoatomic gas, substitute these values in $$(1)$$: $$\\frac{P_2}{P_1} = 8^{\\,\\frac{5}{3}}$$ Write 8 as $$2^3$$ and simplify: $$8^{\\,\\frac{5}{3}} = \\left(2^3\\right)^{\\frac{5}{3}} = 2^{\\,3 \\times \\frac{5}{3}} = 2^5 = 32$$ Hence the ratio of the final pressure to the initial pressure is $$32$$. Therefore, Option C is correct.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A convex lens of focal length 30 cm is placed in contact with a concave lens of focal length 20 cm. An object is placed at 20 cm to the left of this lens system. The distance of the image from the lens in cm is _____.",
            "images": [],
            "options": [
              "A. 30",
              "B. 45",
              "C. $$\\frac{60}{7}$$",
              "D. 15"
            ],
            "correct_answer": "D",
            "explanation": "For two thin lenses kept in contact, the equivalent focal length $$F$$ is given by the formula $$\\frac{1}{F} = \\frac{1}{f_1} + \\frac{1}{f_2}$$ The convex lens has $$f_1 = +30\\ \\text{cm}$$ and the concave lens has $$f_2 = -20\\ \\text{cm}$$ (negative because it is concave). Substituting, $$\\frac{1}{F} = \\frac{1}{30} + \\frac{1}{-20} = \\frac{2}{60} - \\frac{3}{60} = -\\frac{1}{60}$$ Hence, $$F = -60\\ \\text{cm}$$ The combination therefore behaves like a single concave lens of focal length $$60\\ \\text{cm}$$. Using the lens formula for a thin lens, $$\\frac{1}{v} - \\frac{1}{u} = \\frac{1}{F} \\quad -(1)$$ where • $$u$$ = object distance (negative when the object is on the left of the lens) • $$v$$ = image distance (positive to the right, negative to the left) • $$F$$ = focal length of the equivalent lens The object is placed $$20\\ \\text{cm}$$ to the left, so $$u = -20\\ \\text{cm}$$. The focal length is $$F = -60\\ \\text{cm}$$. Substituting in $$(1)$$: $$\\frac{1}{v} - \\frac{1}{-20} = \\frac{1}{-60}$$ $$\\frac{1}{v} + \\frac{1}{20} = -\\frac{1}{60}$$ Move the second term to the right side: $$\\frac{1}{v} = -\\frac{1}{60} - \\frac{1}{20}$$ Convert to a common denominator of $$60$$: $$\\frac{1}{v} = -\\frac{1}{60} - \\frac{3}{60} = -\\frac{4}{60} = -\\frac{1}{15}$$ Therefore, $$v = -15\\ \\text{cm}$$ The negative sign shows the image forms on the same side as the object (to the left of the lens system). The distance from the lens is the magnitude: Image distance = $$15\\ \\text{cm}$$. Hence, the correct option is Option D (15 cm).",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Two strings with circular cross section and made of same material, are stretched to have same amount of tension. A transverse wave is then made to pass through both the strings. The velocity of the wave in the first string having the radius of cross section R is $$v_1$$, and that in the other string having the radius of cross section R/2 is $$v_2$$. Then $$\\frac{v_2}{v_1}$$ =",
            "images": [],
            "options": [
              "A. $$\\sqrt{2}$$",
              "B. 2",
              "C. 8",
              "D. 4"
            ],
            "correct_answer": "B",
            "explanation": "The speed of a transverse wave on a stretched string is given by the fundamental relation $$v = \\sqrt{\\dfrac{T}{\\mu}}$$ where $$T$$ is the tension and $$\\mu$$ is the mass per unit length of the string. Because both strings are made of the same material and carry the same tension $$T$$, the only quantity that changes from one string to the other is $$\\mu$$. For a string of density $$\\rho$$ (mass per unit volume) and circular cross-section of radius $$R$$, the cross-sectional area is $$A = \\pi R^{2}$$. Hence, $$\\mu = \\rho A = \\rho \\pi R^{2} \\;-\\!(1)$$ Case 1: Radius $$R$$ Using $$(1)$$, $$\\mu_1 = \\rho \\pi R^{2}$$. Therefore, $$v_1 = \\sqrt{\\dfrac{T}{\\mu_1}} = \\sqrt{\\dfrac{T}{\\rho \\pi R^{2}}} \\;-\\!(2)$$ Case 2: Radius $$\\dfrac{R}{2}$$ New area: $$A_2 = \\pi \\left(\\dfrac{R}{2}\\right)^{2} = \\dfrac{\\pi R^{2}}{4}$$. Thus, $$\\mu_2 = \\rho A_2 = \\rho \\dfrac{\\pi R^{2}}{4} = \\dfrac{\\mu_1}{4} \\;-\\!(3)$$ Wave speed in the second string: $$v_2 = \\sqrt{\\dfrac{T}{\\mu_2}}$$. Substitute $$\\mu_2$$ from $$(3)$$: $$v_2 = \\sqrt{\\dfrac{T}{\\mu_1/4}} = \\sqrt{\\dfrac{4T}{\\mu_1}} = 2\\sqrt{\\dfrac{T}{\\mu_1}} \\;-\\!(4)$$ Compare $$(4)$$ with $$(2)$$: $$v_1 = \\sqrt{\\dfrac{T}{\\mu_1}}$$. Therefore, $$\\dfrac{v_2}{v_1} = \\dfrac{2\\sqrt{T/\\mu_1}}{\\sqrt{T/\\mu_1}} = 2$$. Hence $$\\dfrac{v_2}{v_1} = 2$$. Correct option: Option B.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Figure shows a current carrying square loop ABCD of edge length 'a' lying in a plane. If the resistance of the ABC part is r and that of ADC part is 2r, then the magnitude of the resultant magnetic field at centre of the square loop is",
            "images": [
              {
                "index": 1,
                "filename": "cracku/figure-shows-a-current-carrying-squ_img1.png"
              }
            ],
            "options": [
              "A. $$\\frac{3\\pi\\mu_0 I}{\\sqrt{2}a}$$",
              "B. $$\\frac{\\mu_0 I}{2\\pi a}$$",
              "C. $$\\frac{\\sqrt{2}\\mu_0 I}{3\\pi a}$$",
              "D. $$\\frac{2\\mu_0 I}{3\\pi a}$$"
            ],
            "correct_answer": "C",
            "explanation": "",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A body of mass 2 kg moving with velocity of $$\\vec{v}_{in} = 3\\hat{i} + 4\\hat{j}$$ ms$$^{-1}$$ enters into a constant force field of 6N directed along positive z-axis. If the body remains in the field for a period of $$\\frac{5}{3}$$ seconds, then velocity of the body when it emerges from force field is",
            "images": [],
            "options": [
              "A. $$4\\hat{i} + 3\\hat{j} + 5\\hat{k}$$",
              "B. $$3\\hat{i} + 4\\hat{j} + 5\\hat{k}$$",
              "C. $$3\\hat{i} + 4\\hat{j} - 5\\hat{k}$$",
              "D. $$3\\hat{i} + 4\\hat{j} + \\sqrt{5}\\hat{k}$$"
            ],
            "correct_answer": "B",
            "explanation": "Initial velocity of the body is given as $$\\vec v_{in}=3\\hat i+4\\hat j$$ ms$$^{-1}$$, so $$u_x = 3$$ ms$$^{-1},\\; u_y = 4$$ ms$$^{-1},\\; u_z = 0$$ ms$$^{-1}$$. The constant force acting on the mass is $$\\vec F = 6\\hat k$$ N (along +z-axis). Using Newton’s second law, $$\\vec F = m\\vec a \\Rightarrow \\vec a = \\frac{\\vec F}{m}$$. The mass of the body is $$m = 2$$ kg, therefore $$\\vec a = \\frac{6\\hat k}{2} = 3\\hat k$$ ms$$^{-2}$$. The body stays in this field for $$t = \\frac{5}{3}$$ s. The kinematics relation $$\\vec v = \\vec u + \\vec a t$$ gives the final velocity: Along x-axis: $$v_x = u_x + a_x t = 3 + 0 \\times t = 3$$ ms$$^{-1}$$ (no force in x). Along y-axis: $$v_y = u_y + a_y t = 4 + 0 \\times t = 4$$ ms$$^{-1}$$ (no force in y). Along z-axis: $$v_z = u_z + a_z t = 0 + 3 \\times \\frac{5}{3} = 5$$ ms$$^{-1}$$. Hence the velocity vector when the body emerges is $$\\vec v_{out}=3\\hat i + 4\\hat j + 5\\hat k$$ ms$$^{-1}$$. Therefore, the correct option is Option B .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Two balls with same mass and initial velocity, are projected at different angles in such a way that maximum height reached by first ball is 8 times higher than that of the second ball. $$T_1$$ and $$T_2$$ are the total flying times of first and second ball, respectively, then the ratio of $$T_1$$ and $$T_2$$ is :",
            "images": [],
            "options": [
              "A. $$2\\sqrt{2}:1$$",
              "B. 2 : 1",
              "C. $$\\sqrt{2}:1$$",
              "D. 4 : 1"
            ],
            "correct_answer": "A",
            "explanation": "Let the common initial speed of both balls be $$u$$ and let the projection angles with the horizontal be $$\\theta_1$$ and $$\\theta_2$$ for the first and the second ball, respectively. Step 1 - Write the expression for maximum height. For a projectile launched with speed $$u$$ at an angle $$\\theta$$, the maximum height reached is $$H=\\frac{u^{2}\\sin^{2}\\theta}{2g}$$ Step 2 - Set up the given height ratio. Given that the first ball rises eight times higher than the second, $$\\frac{H_1}{H_2}=8$$ Using the formula for $$H$$, $$\\frac{\\dfrac{u^{2}\\sin^{2}\\theta_1}{2g}}{\\dfrac{u^{2}\\sin^{2}\\theta_2}{2g}}=8$$ Simplifying (the factors $$u^{2}$$ and $$2g$$ cancel), $$\\frac{\\sin^{2}\\theta_1}{\\sin^{2}\\theta_2}=8$$ Taking square root on both sides, $$\\frac{\\sin\\theta_1}{\\sin\\theta_2}=2\\sqrt{2}$$ $$-(1)$$ Step 3 - Write the expression for time of flight. For the same projectile, the total time of flight is $$T=\\frac{2u\\sin\\theta}{g}$$ Step 4 - Form the required ratio of flight times. Taking the ratio of times for the two balls, $$\\frac{T_1}{T_2}=\\frac{\\dfrac{2u\\sin\\theta_1}{g}}{\\dfrac{2u\\sin\\theta_2}{g}} =\\frac{\\sin\\theta_1}{\\sin\\theta_2}$$ Using result $$-(1)$$, $$\\frac{T_1}{T_2}=2\\sqrt{2}$$ Final ratio. Hence $$T_1:T_2 = 2\\sqrt{2}:1$$ So the correct choice is Option A.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The amplitude and phase of a wave formed by the superposition of two harmonic travelling waves, $$y_1(x, t) = 4\\sin(kx - \\omega t)$$ and $$y_2(x, t) = 2\\sin(kx - \\omega t + \\frac{2\\pi}{3})$$, are : (Take the angular frequency of initial waves same as $$\\omega$$)",
            "images": [],
            "options": [
              "A. $$\\left[6, \\frac{2\\pi}{3}\\right]$$",
              "B. $$\\left[6, \\frac{\\pi}{3}\\right]$$",
              "C. $$\\left[\\sqrt{3}, \\frac{\\pi}{6}\\right]$$",
              "D. $$\\left[2\\sqrt{3}, \\frac{\\pi}{6}\\right]$$"
            ],
            "correct_answer": "D",
            "explanation": "Let the two waves be $$y_1(x,t)=4\\sin\\bigl(kx-\\omega t\\bigr)$$ $$y_2(x,t)=2\\sin\\bigl(kx-\\omega t+\\tfrac{2\\pi}{3}\\bigr)$$ Both waves have the same angular argument $$\\theta=kx-\\omega t$$, but different amplitudes and a phase difference $$\\phi=\\tfrac{2\\pi}{3}$$. Write each wave in the compact form $$A\\sin\\theta$$ and $$B\\sin(\\theta+\\phi)$$, where $$A=4,\\; B=2,\\; \\phi=\\tfrac{2\\pi}{3}$$. The superposition principle gives $$y=y_1+y_2=A\\sin\\theta+B\\sin(\\theta+\\phi)$$ For two sine functions with the same frequency, the resultant is again a sine function: $$A\\sin\\theta+B\\sin(\\theta+\\phi)=R\\sin(\\theta+\\delta)$$ where Amplitude formula: $$R^2=A^2+B^2+2AB\\cos\\phi\\quad -(1)$$ Phase formula: $$\\tan\\delta=\\frac{B\\sin\\phi}{A+B\\cos\\phi}\\quad -(2)$$ Compute the trigonometric values of $$\\phi=\\tfrac{2\\pi}{3}$$: $$\\cos\\phi=\\cos\\!\\left(\\tfrac{2\\pi}{3}\\right)=-\\tfrac12,\\qquad\\sin\\phi=\\sin\\!\\left(\\tfrac{2\\pi}{3}\\right)=\\tfrac{\\sqrt3}{2}$$ Substitute into $$(1)$$: $$\\begin{aligned}R^2&=4^2+2^2+2\\cdot4\\cdot2\\cos\\!\\left(\\tfrac{2\\pi}{3}\\right)\\\\&=16+4+16\\left(-\\tfrac12\\right)\\\\&=20-8\\\\&=12\\end{aligned}$$ $$\\Rightarrow\\;R=\\sqrt{12}=2\\sqrt3$$ Substitute into $$(2)$$: $$\\begin{aligned}\\tan\\delta&=\\frac{2\\cdot\\left(\\tfrac{\\sqrt3}{2}\\right)}{4+2\\left(-\\tfrac12\\right)}\\\\&=\\frac{\\sqrt3}{4-1}\\\\&=\\frac{\\sqrt3}{3}=\\frac1{\\sqrt3}\\end{aligned}$$ $$\\therefore\\;\\delta=\\tfrac{\\pi}{6}$$ since $$\\tan\\left(\\tfrac{\\pi}{6}\\right)=\\tfrac1{\\sqrt3}$$ and $$0\\lt\\delta\\lt\\pi$$. Hence, the resultant wave is $$y(x,t)=2\\sqrt3\\;\\sin\\!\\bigl(kx-\\omega t+\\tfrac{\\pi}{6}\\bigr)$$ Amplitude = $$2\\sqrt3$$, Phase = $$\\tfrac{\\pi}{6}$$. The correct choice is Option D .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "In a Young's double slit experiment, the source is white light. One of the slits is covered by red filter and another by a green filter. In this case",
            "images": [],
            "options": [
              "A. There shall be an interference pattern for red distinct from that for green.",
              "B. There shall be no interference fringes.",
              "C. There shall be alternate interference fringes of red and green.",
              "D. There shall be an interference pattern, where each fringe's pattern center is green and outer edges is red."
            ],
            "correct_answer": "B",
            "explanation": "For sustained interference in Young’s double-slit experiment, the two light waves reaching a point on the screen must satisfy two basic conditions: • They must have the same (or almost the same) frequency / wavelength. • They must maintain a constant phase difference. If the source is white light and both slits are uncovered, every wavelength from the same source reaches both slits, so corresponding components of each wavelength are coherent and an interference pattern is obtained (central white fringe, coloured side fringes). In the present situation one slit is covered with a red filter while the other is covered with a green filter. Hence: • The light emerging from slit $$S_1$$ is almost monochromatic red with wavelength say $$\\lambda_r$$. • The light emerging from slit $$S_2$$ is almost monochromatic green with wavelength say $$\\lambda_g$$, where $$\\lambda_g \\neq \\lambda_r$$. Therefore the two beams that superpose on the screen have different frequencies $$\\nu_r$$ and $$\\nu_g$$. The phase difference between them changes continuously with time because $$\\text{Phase difference} = 2\\pi\\bigl(\\nu_r - \\nu_g\\bigr)t + \\text{(constant path term)}$$ Since $$\\nu_r \\neq \\nu_g$$, the term $$2\\pi\\bigl(\\nu_r - \\nu_g\\bigr)t$$ varies rapidly; the phase relation is not stable. Time-averaged (detector) intensity at any point becomes simply the sum of individual intensities: $$I = I_r + I_g$$ No position on the screen receives a consistently larger or smaller resultant amplitude, so bright and dark bands cannot form. Each slit only produces its own single-slit diffraction envelope; the two envelopes just overlap without producing any alternating maxima and minima. Hence no interference fringes are observed . Correct option: Option B",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "For a nucleus of mass number A and radius R, the mass density of nucleus can be represented as",
            "images": [],
            "options": [
              "A. $$A^3$$",
              "B. $$A^{\\frac{1}{3}}$$",
              "C. $$A^{\\frac{2}{3}}$$",
              "D. Independent of A"
            ],
            "correct_answer": "D",
            "explanation": "The nucleus is assumed to be a uniform solid sphere. Radius-mass number relation: Experimental data give $$R = R_0\\,A^{1/3}$$, where $$R_0 \\approx 1.2 \\times 10^{-15}\\,\\text{m}$$. Volume of the nucleus: $$V = \\frac{4}{3}\\pi R^{3}$$ Substitute $$R = R_0\\,A^{1/3}$$: $$V = \\frac{4}{3}\\pi \\left(R_0\\,A^{1/3}\\right)^{3} = \\frac{4}{3}\\pi R_0^{3}\\,A$$ $$-(1)$$ Mass of the nucleus: Each nucleon (proton or neutron) has nearly the same mass $$m_N$$, so for mass number $$A$$ the nuclear mass is approximately $$M \\approx A\\,m_N$$ $$-(2)$$ Nuclear mass density $$\\rho$$ is defined as mass per unit volume: $$\\rho = \\frac{M}{V}$$ Insert $$(1)$$ and $$(2)$$: $$\\rho = \\frac{A\\,m_N}{\\dfrac{4}{3}\\pi R_0^{3}\\,A} = \\frac{3\\,m_N}{4\\pi R_0^{3}}$$ The factor $$A$$ cancels out; therefore $$\\rho$$ does not depend on the mass number $$A$$. Hence, the nuclear mass density is independent of A . Correct option: Option D.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A block of mass 2 kg is attached to one end of a massless spring whose other end is fixed at a wall. The spring-mass system moves on a frictionless horizontal table. The spring's natural length is 2 m and spring constant is 200 N/m. The block is pushed such that the length of the spring becomes 1 m and then released. At distance x m (x < 2) from the wall, the speed of the block will be :",
            "images": [],
            "options": [
              "A. $$10[1-(2-x)]^{3/2}$$ m/s",
              "B. $$10[1-(2-x)^2]^{1/2}$$ m/s",
              "C. $$10[1-(2-x)^2]$$ m/s",
              "D. $$10[1-(2-x)^2]^2$$ m/s"
            ],
            "correct_answer": "B",
            "explanation": "Let the natural (unstretched) length of the spring be $$L_0 = 2\\,\\text{m}$$. The free end of the spring is fixed to the wall and the block of mass $$m = 2\\,\\text{kg}$$ is attached to the other end. When the spring is compressed to a length $$1\\,\\text{m}$$ and released, the compression produced is $$y_{\\text{max}} = L_0 - 1 = 2 - 1 = 1\\,\\text{m}$$. This maximum compression is the amplitude $$A$$ of the ensuing simple harmonic motion (SHM): $$A = 1\\,\\text{m}$$. The force constant (spring constant) is $$k = 200\\,\\text{N\\,m}^{-1}$$, so the angular frequency of the SHM is $$\\omega = \\sqrt{\\frac{k}{m}} = \\sqrt{\\frac{200}{2}} = \\sqrt{100} = 10\\,\\text{rad\\,s}^{-1}$$. At any instant, let the actual length of the spring (i.e., the distance of the block from the wall) be $$x$$ metres. Because $$x \\lt 2\\,\\text{m}$$, the spring is compressed. Define the instantaneous compression (displacement from the natural length) as $$y = L_0 - x = 2 - x.$$ For SHM with amplitude $$A$$, angular frequency $$\\omega$$ and displacement $$y$$ from equilibrium (natural length here), the speed $$v$$ is related by the standard formula $$v = \\omega \\sqrt{A^{2} - y^{2}}\\;.$$ Substituting $$\\omega = 10\\,\\text{rad\\,s}^{-1}$$, $$A = 1\\,\\text{m}$$ and $$y = 2 - x$$: $$v = 10 \\sqrt{1^{2} - (2 - x)^{2}} = 10\\,[\\,1 - (2 - x)^{2}\\,]^{1/2}\\,\\text{m\\,s}^{-1}.$$ Hence the speed of the block when it is at a distance $$x$$ from the wall is given by Option B: $$\\displaystyle 10[1 - (2 - x)^{2}]^{1/2}\\,\\text{m\\,s}^{-1}\\;.$$",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "An electron is released from rest near an infinite non-conducting sheet of uniform charge density '$$-\\sigma$$'. The rate of change of de-Broglie wave length associated with the electron varies inversely as $$n^{th}$$ power of time. The numerical value of n is _____.",
            "images": [],
            "options": [],
            "correct_answer": "2",
            "explanation": "An infinite non-conducting sheet having uniform surface charge density $$-\\sigma$$ produces a uniform electric field of magnitude $$E=\\frac{\\sigma}{2\\varepsilon_0} \\quad -(1)$$ The field lines point toward the sheet because $$\\sigma$$ is negative. Charge on an electron $$q=-e$$, so the force on the electron is $$F = qE = (-e)\\,E = e\\,\\frac{\\sigma}{2\\varepsilon_0}$$ away from the sheet. Its magnitude is $$|F| = \\frac{e|\\sigma|}{2\\varepsilon_0} \\quad -(2)$$ Using Newton’s second law, the magnitude of the constant acceleration is $$a = \\frac{|F|}{m} = \\frac{e|\\sigma|}{2\\varepsilon_0 m} \\quad -(3)$$ The electron is released from rest, so its speed after time $$t$$ is obtained from the kinematic relation $$v = at$$: $$v = a t \\quad -(4)$$ The de-Broglie wavelength is defined as $$\\lambda = \\frac{h}{p}=\\frac{h}{mv}$$. Substituting $$v$$ from $$(4)$$ gives $$\\lambda = \\frac{h}{m (a t)} = \\frac{h}{m a}\\,\\frac{1}{t} \\quad -(5)$$ Thus $$\\lambda$$ is inversely proportional to time. Differentiate $$(5)$$ with respect to $$t$$: $$\\frac{d\\lambda}{dt} = -\\frac{h}{m a}\\,\\frac{1}{t^{2}} \\quad -(6)$$ Equation $$(6)$$ shows that the rate of change of the de-Broglie wavelength varies as $$t^{-2}$$. Therefore, the required power $$n=2$$. Final answer: $$n = 2$$.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "A sample of a liquid is kept at 1 atm. It is compressed to 5 atm which leads to change of volume of 0.8 cm$$^3$$. If the bulk modulus of the liquid is 2 GPa, the initial volume of the liquid was _____ litre. (Take 1 atm = $$10^5$$ Pa)",
            "images": [],
            "options": [],
            "correct_answer": "4",
            "explanation": "The bulk modulus $$B$$ of a liquid is defined as $$B = -\\,\\frac{\\Delta P}{\\dfrac{\\Delta V}{V}}$$ where $$\\Delta P$$ is the change in pressure, $$\\Delta V$$ is the change in volume (negative for compression), and $$V$$ is the initial volume. We are given: • Initial pressure $$P_1 = 1$$ atm, final pressure $$P_2 = 5$$ atm. Hence the pressure rise is $$\\Delta P = P_2 - P_1 = 5 - 1 = 4$$ atm. • Take $$1$$ atm $$= 10^{5}$$ Pa, so $$\\Delta P = 4 \\times 10^{5}\\ \\text{Pa}$$. • Bulk modulus $$B = 2$$ GPa $$= 2 \\times 10^{9}$$ Pa. • Magnitude of volume decrease $$|\\Delta V| = 0.8\\ \\text{cm}^3 = 0.8 \\times 10^{-6}\\ \\text{m}^3$$. Using the definition of $$B$$ and taking magnitudes (since we know the sign corresponds to compression), $$B = \\frac{\\Delta P \\, V}{|\\Delta V|} \\quad\\Longrightarrow\\quad V = \\frac{B\\,|\\Delta V|}{\\Delta P}\\,.$$ Substituting the numerical values: $$V = \\frac{2 \\times 10^{9}\\ \\text{Pa} \\;\\times\\; 0.8 \\times 10^{-6}\\ \\text{m}^3}{4 \\times 10^{5}\\ \\text{Pa}}$$ Step-wise calculation: $$2 \\times 0.8 = 1.6$$ $$10^{9} \\times 10^{-6} = 10^{3}$$ Numerator $$= 1.6 \\times 10^{3} = 1600$$ Denominator $$= 4 \\times 10^{5}$$ Therefore, $$V = \\frac{1600}{4 \\times 10^{5}} = 0.4 \\times 10^{-2}\\ \\text{m}^3 = 0.004\\ \\text{m}^3.$$ Conversion to litres (as $$1\\ \\text{m}^3 = 1000\\ \\text{L}$$): $$V = 0.004\\ \\text{m}^3 \\times 1000\\ \\frac{\\text{L}}{\\text{m}^3} = 4\\ \\text{L}.$$ Hence, the initial volume of the liquid was $$4$$ litres.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "Space between the plates of a parallel plate capacitor of plate area 4 cm$$^2$$ and separation of (d) 1.77 mm, is filled with uniform dielectric materials with dielectric constants (3 and 5) as shown in figure. Another capacitor of capacitance 7.5 pF is connected in parallel with it. The effective capacitance of this combination is _____ pF. (Given $$\\epsilon_0 = 8.85 \\times 10^{-12}$$ F/m)",
            "images": [
              {
                "index": 1,
                "filename": "cracku/space-between-the-plates-of-a-paral_img1.png"
              }
            ],
            "options": [],
            "correct_answer": "15",
            "explanation": "",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "A thin solid disk of 1 kg is rotating along its diameter axis at the speed of 1800 rpm. By applying an external torque of $$25\\pi$$ Nm for 40s, the speed increases to 2100 rpm. The diameter of the disk is _____ m.",
            "images": [],
            "options": [],
            "correct_answer": "40",
            "explanation": "The angular velocity of a rotating body is usually expressed in $$\\text{rad s}^{-1}$$. Given speeds in revolutions per minute (rpm) must first be converted. Initial speed: $$1800\\;\\text{rpm} = 1800 \\times \\frac{2\\pi\\;\\text{rad}}{60\\;\\text{s}} = 60\\pi\\;\\text{rad s}^{-1}$$. Final speed: $$2100\\;\\text{rpm} = 2100 \\times \\frac{2\\pi\\;\\text{rad}}{60\\;\\text{s}} = 70\\pi\\;\\text{rad s}^{-1}$$. The change in angular velocity is therefore $$\\Delta\\omega = \\omega_f - \\omega_i = 70\\pi - 60\\pi = 10\\pi\\;\\text{rad s}^{-1}$$. Torque and angular momentum are related through the angular impulse equation: $$\\tau\\,t = \\Delta L = I\\,\\Delta\\omega$$ $$-(1)$$, where $$I$$ is the moment of inertia about the rotation axis. Given values: $$\\tau = 25\\pi\\;\\text{N m}$$ and $$t = 40\\;\\text{s}$$. Hence the angular impulse is $$\\tau t = 25\\pi \\times 40 = 1000\\pi\\;\\text{kg m}^2\\text{s}^{-1}$$. Substituting into $$(1)$$ gives $$I \\times 10\\pi = 1000\\pi$$. Cancel $$\\pi$$ and solve for $$I$$: $$I = \\frac{1000}{10} = 100\\;\\text{kg m}^2$$. The axis of rotation is a diameter lying in the plane of the thin solid disk. For a uniform disk about a diameter, the moment of inertia is $$I = \\frac{1}{4} M R^2$$ $$-(2)$$, where $$M$$ is the mass and $$R$$ the radius. With $$M = 1\\;\\text{kg}$$, substitute $$I = 100\\;\\text{kg m}^2$$ into $$(2)$$: $$100 = \\frac{1}{4} \\times 1 \\times R^2 \\quad\\Longrightarrow\\quad R^2 = 400$$. Thus $$R = 20\\;\\text{m}$$. The diameter is twice the radius: Diameter $$= 2R = 2 \\times 20 = 40\\;\\text{m}$$. Final Answer: 40 m",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "A cube having a side of 10 cm with unknown mass and 200 gm mass were hung at two ends of an uniform rigid rod of 27 cm long. The rod along with masses was placed on a wedge keeping the distance between wedge point and 200 gm weight as 25 cm. Initially the masses were not at balance. A beaker is placed beneath the unknown mass and water is added slowly to it. At given point the masses were in balance and half volume of the unknown mass was inside the water. The unknown mass is _____ kg.",
            "images": [],
            "options": [],
            "correct_answer": "3",
            "explanation": "The cube is attached at one end of a uniform rigid rod of total length $$27\\text{ cm}$$. A wedge placed under the rod acts as a fulcrum. Given distance from the fulcrum to the $$200\\text{ g}$$ mass is $$25\\text{ cm}$$, the distance from the fulcrum to the cube is $$27\\text{ cm}-25\\text{ cm}=2\\text{ cm}$$. Let the actual (true) mass of the cube be $$M\\;(\\text{kg})$$. Before the cube touches water, rotational equilibrium would require $$Mg(2\\text{ cm}) = 0.2g(25\\text{ cm}) \\; \\Longrightarrow \\; M=2.5\\text{ kg}.$$ Since the rod is not balanced initially, the true mass must be greater than $$2.5\\text{ kg}$$ (otherwise the $$200\\text{ g}$$ side could never dominate). A beaker is now placed beneath the cube and water is added until exactly half of the cube is submerged. By Archimedes’ principle, the upward buoyant force equals the weight of the displaced water. Side of cube $$=10\\text{ cm}=0.10\\text{ m}$$. Total volume of cube: $$V = (0.10\\text{ m})^{3}=1.0\\times10^{-3}\\text{ m}^{3}$$. Half the volume is submerged, so $$V_{\\text{disp}}=\\frac{V}{2}=0.5\\times10^{-3}\\text{ m}^{3}.$$ With water density $$\\rho_{w}=1000\\text{ kg m}^{-3}$$, the buoyant force is $$F_{B} = \\rho_{w}gV_{\\text{disp}} = 1000g(0.5\\times10^{-3}) = 0.5g\\;\\text{N}.$$ This buoyant force is equivalent to the weight of a $$0.5\\text{ kg}$$ mass. Hence the cube’s effective downward (apparent) weight becomes $$\\bigl(M-0.5\\bigr)g.$$ At the moment of balance, clockwise and counter-clockwise moments about the fulcrum are equal: $$\\bigl(M-0.5\\bigr)g(2\\text{ cm}) = 0.2g(25\\text{ cm}).$$ Cancel $$g$$ and substitute the lever arms (convert to the same units is optional since they cancel too): $$\\bigl(M-0.5\\bigr)\\times2 = 0.2\\times25$$ $$\\Longrightarrow \\bigl(M-0.5\\bigr)\\times2 = 5$$ $$\\Longrightarrow M-0.5 = \\frac{5}{2} = 2.5$$ $$\\Longrightarrow M = 2.5 + 0.5 = 3.0\\text{ kg}.$$ Therefore, the mass of the cube is $$\\mathbf{3\\;kg}$$.",
            "year": 2025,
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
            "question_text": "In a first order decomposition reaction, the time taken for the decomposition of reactant to one fourth and one eighth of its initial concentration are $$t_1$$ and $$t_2$$ (s), respectively. The ratio $$t_1/t_2$$ will :",
            "images": [],
            "options": [
              "A. $$\\frac{4}{3}$$",
              "B. $$\\frac{3}{2}$$",
              "C. $$\\frac{3}{4}$$",
              "D. $$\\frac{2}{3}$$"
            ],
            "correct_answer": "D",
            "explanation": "For a first-order reaction, the integrated rate law is $$k = \\frac{2.303}{t}\\,\\log\\!\\left(\\frac{[R]_0}{[R]}\\right)$$ Re-arranging, the time required to reach any concentration is $$t = \\frac{2.303}{k}\\,\\log\\!\\left(\\frac{[R]_0}{[R]}\\right)$$ Case 1: Concentration falls to one-fourth of the initial value. Then $$[R] = \\frac{[R]_0}{4}$$, so $$t_1 = \\frac{2.303}{k}\\,\\log\\!\\left(\\frac{[R]_0}{[R]_0/4}\\right) = \\frac{2.303}{k}\\,\\log 4$$ Case 2: Concentration falls to one-eighth of the initial value. Then $$[R] = \\frac{[R]_0}{8}$$, so $$t_2 = \\frac{2.303}{k}\\,\\log\\!\\left(\\frac{[R]_0}{[R]_0/8}\\right) = \\frac{2.303}{k}\\,\\log 8$$ Taking the ratio: $$\\frac{t_1}{t_2} = \\frac{\\log 4}{\\log 8}$$ Using base-10 logarithms: $$\\log 4 = \\log(2^2) = 2\\log 2$$ $$\\log 8 = \\log(2^3) = 3\\log 2$$ Hence $$\\frac{t_1}{t_2} = \\frac{2\\log 2}{3\\log 2} = \\frac{2}{3}$$ Therefore, the required ratio is $$\\frac{2}{3}$$, which matches Option D.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match the LIST-I with LIST-II. Choose the correct answer from the options given below :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/match-the-listi-with-listii-choose_img1_7.png"
              }
            ],
            "options": [
              "A. A-IV, B-II, C-III, D-I",
              "B. A-II, B-III, C-I, D-IV",
              "C. A-III, B-IV, C-II, D-I",
              "D. A-III, B-IV, C-I, D-II"
            ],
            "correct_answer": "D",
            "explanation": "For every species, identify its general electronic feature and hybridisation before matching with the statements in LIST-II. Case A: Carbocation A carbocation carries a positive charge on carbon. The carbon is $$sp^2$$ hybridised and possesses an empty $$p$$-orbital that can accept a pair of electrons. Hence, A corresponds to statement III. Case B: Carbon-centred free radical A carbon free radical has one unpaired electron on carbon. Depending on the surrounding atoms it may be $$sp^2$$ or $$sp^3$$ hybridised, but the defining feature is the single unpaired electron. Hence, B corresponds to statement IV. Case C: Nucleophile A nucleophile is a species that donates (supplies) an electron pair to an electron-deficient centre in a reaction. Hence, C corresponds to statement I. Case D: Electrophile An electrophile is electron-deficient; it seeks (receives) an electron pair from a nucleophile. Hence, D corresponds to statement II. Collecting the matches: A - III, B - IV, C - I, D - II. This is exactly the pairing shown in Option D. Therefore the correct answer is Option D.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "$$A \\xrightarrow{(i) NaOH, (ii) H_3O^+} B \\xrightarrow{(i) EtOH, (ii) H_2SO_4, \\Delta} C$$ 'A' shows positive Lassaign's test for N and its molar mass is 121. 'B' gives effervescence with aq. NaHCO$$_3$$. 'C' gives fruity smell. Identify A, B and C.",
            "images": [
              {
                "index": 1,
                "filename": "cracku/a-xrightarrowi-naoh-ii-h_3o-b-xrigh_img1.png"
              },
              {
                "index": 2,
                "filename": "cracku/a-xrightarrowi-naoh-ii-h_3o-b-xrigh_opta_img2.png"
              },
              {
                "index": 3,
                "filename": "cracku/a-xrightarrowi-naoh-ii-h_3o-b-xrigh_optb_img3.png"
              },
              {
                "index": 4,
                "filename": "cracku/a-xrightarrowi-naoh-ii-h_3o-b-xrigh_optc_img4.png"
              },
              {
                "index": 5,
                "filename": "cracku/a-xrightarrowi-naoh-ii-h_3o-b-xrigh_optd_img5.png"
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
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Choose the correct set of reagents for the following conversion:",
            "images": [
              {
                "index": 1,
                "filename": "cracku/choose-the-correct-set-of-reagents_img1.png"
              }
            ],
            "options": [
              "A. $$Br_2/Fe$$; $$Cl_2, \\Delta$$; alc. KOH",
              "B. $$Cl_2/Fe$$; $$Br_2/anhy.AlCl_3$$; aq. KOH",
              "C. $$Br_2/anhy.AlCl_3$$; $$Cl_2, \\Delta$$; aq. KOH",
              "D. $$Cl_2/anhy.AlCl_3$$; $$Br_2/Fe$$; alc. KOH"
            ],
            "correct_answer": "A",
            "explanation": "",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "1,2-dibromocyclooctane is treated with 'P' is :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/12dibromocyclooctane-is-treated-wit_img1.png"
              },
              {
                "index": 2,
                "filename": "cracku/12dibromocyclooctane-is-treated-wit_opta_img2.png"
              },
              {
                "index": 3,
                "filename": "cracku/12dibromocyclooctane-is-treated-wit_optb_img3.png"
              },
              {
                "index": 4,
                "filename": "cracku/12dibromocyclooctane-is-treated-wit_optc_img4.png"
              },
              {
                "index": 5,
                "filename": "cracku/12dibromocyclooctane-is-treated-wit_optd_img5.png"
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
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Given below are two statements : Statement I : A homoleptic octahedral complex, formed using monodentate ligands, will not show stereoisomerism. Statement II : cis- and trans-platin are heteroleptic complexes of Pd. Choose the correct answer from the options given below.",
            "images": [],
            "options": [
              "A. Both Statement I and Statement II are false.",
              "B. Statement I is false but Statement II is true.",
              "C. Both Statement I and Statement II are true.",
              "D. Statement I is true but Statement II is false."
            ],
            "correct_answer": "D",
            "explanation": "In an octahedral complex, six ligand donor atoms occupy the corners of a regular octahedron around the central metal ion. Case 1: Homoleptic octahedral complex with monodentate ligands Homoleptic means all the six positions are occupied by identical ligands, say $$L$$, giving the general formula $$[M L_6]$$. Because every ligand and every metal-ligand bond is identical, there is only one possible spatial arrangement. Therefore such a complex cannot give rise to either geometrical (cis / trans) or optical isomerism. Hence Statement I is true. Case 2: cis-platin and trans-platin cis-platin and trans-platin have the formula $$[Pt(NH_3)_2Cl_2]$$. They contain two different kinds of monodentate ligands ( $$NH_3$$ and $$Cl^-$$ ), so they are heteroleptic complexes of platinum, not palladium. Since the statement assigns them to Pd, Statement II is false. Combining the two results: Statement I is true, Statement II is false ⇒ Option D. Final answer: Option D.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The atomic number of the element from the following with lowest 1st ionisation enthalpy is :",
            "images": [],
            "options": [
              "A. 32",
              "B. 35",
              "C. 87",
              "D. 19"
            ],
            "correct_answer": "C",
            "explanation": "The first-ionisation enthalpy is the energy required to remove the most loosely bound electron from a gaseous atom. Periodic trend: • Along a period (left → right) the ionisation enthalpy generally increases because nuclear charge increases while the atomic radius decreases. • Down a group (top → bottom) the ionisation enthalpy generally decreases because atomic size increases and the outer electron is farther from the nucleus with greater shielding. Therefore, the elements that lie farthest down the periodic table and belong to the extreme left (Group 1) will exhibit the lowest first-ionisation enthalpy. Identify the elements corresponding to the given atomic numbers: • $$32$$ → Ge (Group 14, Period 4) • $$35$$ → Br (Group 17, Period 4) • $$87$$ → Fr (Group 1, Period 7) • $$19$$ → K (Group 1, Period 4) Among these, both K and Fr are Group 1 elements, so they already have a lower ionisation enthalpy than Ge and Br. Between K and Fr, Francium (Fr) lies lower in the same group (Period 7 vs. Period 4), so its atomic size is larger and the nuclear attraction on the outermost electron is weakest. Hence the element with the lowest first-ionisation enthalpy is Francium, atomic number $$87$$. Option C (atomic number 87) is correct.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Which of the following binary mixture does not show the behaviour of minimum boiling azeotropes?",
            "images": [],
            "options": [
              "A. $$H_2O + CH_3COC_2H_5$$",
              "B. $$C_6H_5OH + C_6H_5NH_2$$",
              "C. $$CS_2 + CH_3COCH_3$$",
              "D. $$CH_3OH + CHCl_3$$"
            ],
            "correct_answer": "B",
            "explanation": "An azeotrope boils at a constant temperature because the vapour phase has the same composition as the liquid phase. • If the total vapour pressure of the mixture is higher than that predicted by Raoult’s law (positive deviation), the boiling point of the mixture becomes lower than that of either pure component. Such an azeotrope is called a minimum-boiling azeotrope. • If the total vapour pressure is lower than Raoult’s law (negative deviation), the boiling point is higher than that of both components, giving a maximum-boiling azeotrope. Whether a binary liquid shows positive or negative deviation depends on the relative strength of intermolecular forces: • Interactions in the mixture weaker than those within the pure liquids ⇒ molecules escape more easily ⇒ higher vapour pressure ⇒ positive deviation ⇒ minimum-boiling azeotrope. • Interactions in the mixture stronger than in the pure liquids (e.g. new hydrogen bonds) ⇒ molecules escape with difficulty ⇒ lower vapour pressure ⇒ negative deviation ⇒ maximum-boiling azeotrope. Now examine each option. Case A: $$H_2O + CH_3COOC_2H_5$$ (water + ethyl acetate) Water is highly polar; ethyl acetate is much less polar and cannot hydrogen-bond effectively with water. Hence, the A-B (unlike) interactions are weaker than A-A and B-B interactions. The mixture shows a large positive deviation. Therefore it forms a minimum-boiling azeotrope (bp ≈ $$70^{\\circ}C$$). Case B: $$C_6H_5OH + C_6H_5NH_2$$ (phenol + aniline) Both phenol and aniline possess -OH/-NH2 groups that can form strong intermolecular hydrogen bonds with each other. In the mixture the A-B attractions are stronger than those in the pure liquids, so the vapour pressure drops (negative deviation). Consequently, if an azeotrope is formed at all, it will be a maximum-boiling one; it can never be a minimum-boiling azeotrope. Hence this binary system does not show minimum-boiling behaviour. Case C: $$CS_2 + CH_3COCH_3$$ (carbon disulphide + acetone) CS2 is non-polar while acetone is polar but cannot hydrogen-bond strongly with CS2. Thus A-B interactions are weaker ⇒ positive deviation ⇒ the pair forms a minimum-boiling azeotrope (bp ≈ $$39^{\\circ}C$$). Case D: $$CH_3OH + CHCl_3$$ (methanol + chloroform) Though each component can engage in hydrogen bonding, the two form a 1 : 1 complex in the liquid phase which is less stable than the separate hydrogen-bond networks in the pure liquids. Hence the net A-B interaction is weaker, giving a positive deviation and a minimum-boiling azeotrope (bp ≈ $$55.9^{\\circ}C$$ at 1 atm). Only the mixture in Option B fails to exhibit minimum-boiling behaviour. Correct answer: Option B ($$C_6H_5OH + C_6H_5NH_2$$)",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "$$HA(aq) \\rightleftharpoons H^+(aq) + A^-(aq)$$. The freezing point depression of a 0.1 m aqueous solution of a monobasic weak acid HA is 0.20°C. The dissociation constant for the acid is : (Given: $$K_f(H_2O) = 1.8$$ K kg mol$$^{-1}$$, molality $$\\equiv$$ molarity)",
            "images": [],
            "options": [
              "A. $$1.38 \\times 10^{-3}$$",
              "B. $$1.1 \\times 10^{-2}$$",
              "C. $$1.90 \\times 10^{-3}$$",
              "D. $$1.89 \\times 10^{-1}$$"
            ],
            "correct_answer": "A",
            "explanation": "The acid dissociates according to $$HA \\; \\rightleftharpoons \\; H^{+} + A^{-}$$ For a colligative-property experiment we use the van’t Hoff factor $$i$$. The freezing-point depression is related to $$i$$ by the formula $$\\Delta T_f = i \\, K_f \\, m$$ $$-(1)$$ Data given: $$\\Delta T_f = 0.20^{\\circ}\\text{C}$$, $$K_f = 1.8 \\text{ K kg mol}^{-1}$$, molality $$m = 0.1 \\text{ m}$$. Substituting in $$(1)$$: $$0.20 = i \\,(1.8)\\,(0.1)$$ $$\\Rightarrow \\; i = \\frac{0.20}{1.8 \\times 0.1} = \\frac{0.20}{0.18} = 1.11$$ (keep three significant figures) For a weak monobasic acid each formula unit can produce two ions, so $$n = 2$$. The relation between $$i$$ and the degree of dissociation $$\\alpha$$ is $$i = 1 + \\alpha (n-1) = 1 + \\alpha$$ $$-(2)$$ Using $$i = 1.11$$ in $$(2)$$: $$\\alpha = i - 1 = 1.11 - 1 = 0.11$$ The equilibrium concentration of the acid is $$c = 0.1 \\text{ mol L}^{-1}$$. For a weak monoprotic acid the dissociation constant is $$K_a = \\frac{c \\alpha^{2}}{1 - \\alpha}$$ $$-(3)$$ Substituting the values: $$K_a = \\frac{0.1 \\times (0.11)^{2}}{1 - 0.11} = \\frac{0.1 \\times 0.0121}{0.89} = \\frac{0.00121}{0.89} \\approx 1.4 \\times 10^{-3}$$ Therefore $$K_a \\approx 1.38 \\times 10^{-3}$$. Option A is correct.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "What is the correct IUPAC name of",
            "images": [
              {
                "index": 1,
                "filename": "cracku/what-is-the-correct-iupac-name-of_img1.png"
              }
            ],
            "options": [
              "A. 4-Ethyl-1-hydroxycyclopent-2-ene",
              "B. 1-Ethyl-3-hydroxycyclopent-2-ene",
              "C. 1-Ethylcyclopent-2-en-3-ol",
              "D. 4-Ethylcyclopent-2-en-1-ol"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The correct decreasing order of spin only magnetic moment values (BM) of $$Cu^+$$, $$Cu^{2+}$$, $$Cr^{2+}$$ and $$Cr^{3+}$$ ions is :",
            "images": [],
            "options": [
              "A. $$Cu^+ > Cu^{2+} > Cr^{3+} > Cr^{2+}$$",
              "B. $$Cu^{2+} > Cu^+ > Cr^{2+} > Cr^{3+}$$",
              "C. $$Cr^{2+} > Cr^{3+} > Cu^{2+} > Cu^+$$",
              "D. $$Cr^{3+} > Cr^{2+} > Cu^+ > Cu^{2+}$$"
            ],
            "correct_answer": "C",
            "explanation": "The spin-only magnetic moment of a transition-metal ion is calculated from $$\\mu_{s.o.}= \\sqrt{n(n+2)}\\;\\text{BM}$$ where $$n$$ is the number of unpaired electrons in the ion. First write the electronic configuration of each ion and count $$n$$. Case 1: $$Cu^{+}\\;(Z=29)$$ Neutral Cu : $$[Ar]\\,3d^{10}\\,4s^{1}$$ Removing one electron (from $$4s$$) gives $$Cu^{+} : [Ar]\\,3d^{10}$$ All $$3d$$ electrons are paired ⇒ $$n = 0$$ $$\\mu = \\sqrt{0(0+2)} = 0\\;\\text{BM}$$ Case 2: $$Cu^{2+}$$ Remove one more electron (from $$3d$$) → $$Cu^{2+} : [Ar]\\,3d^{9}$$ Configuration $$3d^{9} = 3d^{\\uparrow\\downarrow\\,\\uparrow\\downarrow\\,\\uparrow\\downarrow\\,\\uparrow\\downarrow\\,\\uparrow}$$ ⇒ $$n = 1$$ $$\\mu = \\sqrt{1(1+2)} = \\sqrt{3} \\approx 1.73\\;\\text{BM}$$ Case 3: $$Cr^{2+}\\;(Z = 24)$$ Neutral Cr : $$[Ar]\\,3d^{5}\\,4s^{1}$$ Removing two electrons (one from $$4s$$ and one from $$3d$$) gives $$Cr^{2+} : [Ar]\\,3d^{4}$$ All four $$3d$$ electrons are unpaired ⇒ $$n = 4$$ $$\\mu = \\sqrt{4(4+2)} = \\sqrt{24} \\approx 4.90\\;\\text{BM}$$ Case 4: $$Cr^{3+}$$ Remove one more electron from $$3d$$ → $$Cr^{3+} : [Ar]\\,3d^{3}$$ All three $$3d$$ electrons are unpaired ⇒ $$n = 3$$ $$\\mu = \\sqrt{3(3+2)} = \\sqrt{15} \\approx 3.87\\;\\text{BM}$$ Arrange the magnetic moments in decreasing order: $$Cr^{2+}\\;(4.90\\;{\\rm BM}) \\gt Cr^{3+}\\;(3.87\\;{\\rm BM}) \\gt Cu^{2+}\\;(1.73\\;{\\rm BM}) \\gt Cu^{+}\\;(0\\;{\\rm BM})$$ Therefore the correct decreasing order is $$Cr^{2+} \\gt Cr^{3+} \\gt Cu^{2+} \\gt Cu^{+}$$ Matching with the given options, this is Option C.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Which one of the following reactions will not lead to the desired ether formation in major proportion? (iso-Bu $$\\Rightarrow$$ isobutyl, sec-Bu $$\\Rightarrow$$ sec-butyl, nPr $$\\Rightarrow$$ n-propyl, $$^t$$Bu $$\\Rightarrow$$ tert-butyl, Et $$\\Rightarrow$$ ethyl)",
            "images": [
              {
                "index": 1,
                "filename": "cracku/which-one-of-the-following-reaction_opta_img1_2.png"
              },
              {
                "index": 2,
                "filename": "cracku/which-one-of-the-following-reaction_optb_img2_2.png"
              },
              {
                "index": 3,
                "filename": "cracku/which-one-of-the-following-reaction_optc_img3_2.png"
              }
            ],
            "options": [
              "A",
              "B",
              "C",
              "D. $$iso-BuO^{\\ominus}Na^{\\oplus} + sec-BuBr \\to Sec-Bu-O-iso-Bu$$"
            ],
            "correct_answer": "D",
            "explanation": "In Williamson ether synthesis, an alkoxide ion reacts with an alkyl halide by the $$\\mathrm{S_N2}$$ mechanism to give the ether. For the $$\\mathrm{S_N2}$$ path to dominate, the alkyl halide should be primary and the attacking alkoxide should not be highly hindered. If the halide is secondary or tertiary, or if the nucleophile is very bulky, the $$\\mathrm{E2}$$ elimination pathway competes strongly and often becomes the major reaction, giving an alkene instead of the ether. Case A: $$^tBuO^-Na^+ + EtBr \\; \\longrightarrow \\; ^tBu-O-Et$$ The halide carbon in $$EtBr$$ is primary. Even though $$^tBuO^-$$ is bulky, $$\\mathrm{S_N2}$$ on a primary centre proceeds fast. Desired ether forms in good yield. Case B: $$PhO^-Na^+ + CH_3Br \\; \\longrightarrow \\; Ph-O-CH_3$$ $$CH_3Br$$ is a primary (methyl) halide; phenoxide is not excessively bulky. Efficient $$\\mathrm{S_N2}$$ gives the required anisole in high yield. Case C: $$Na^+O^-nPr + nPrBr \\; \\longrightarrow \\; nPr-O-nPr$$ Both nucleophile and electrophile are unhindered primary species. $$\\mathrm{S_N2}$$ dominates and the symmetrical ether is obtained in major proportion. Case D: $$iso\\text{-}BuO^-Na^+ + sec\\text{-}BuBr \\; \\longrightarrow \\; sec\\text{-}Bu-O-iso\\text{-}Bu$$ Here the alkyl halide $$sec\\text{-}BuBr$$ is secondary . The attacking alkoxide $$iso\\text{-}BuO^-$$ is branched and sterically hindered. Under these conditions the nucleophile abstracts a $$\\beta$$-hydrogen much faster than it can perform backside attack on the secondary carbon. Consequently, the $$\\mathrm{E2}$$ elimination that produces 2-butene becomes the chief reaction, and very little ether is formed. Therefore, the reaction that will not give the desired ether as the main product is found in Option D (Option 4). Answer - Option D (4)",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "On combustion 0.210 g of an organic compound containing C, H and O gave 0.127 g $$H_2O$$ and 0.307 g $$CO_2$$. The percentages of hydrogen and oxygen in the given organic compound respectively are :",
            "images": [],
            "options": [
              "A. 53.41, 39.6",
              "B. 6.72, 53.41",
              "C. 7.55, 43.85",
              "D. 6.72, 39.87"
            ],
            "correct_answer": "B",
            "explanation": "The combustion analysis gives the following data: Mass of organic compound burnt $$= 0.210 \\text{ g}$$ Mass of $$CO_2$$ formed $$= 0.307 \\text{ g}$$ Mass of $$H_2O$$ formed $$= 0.127 \\text{ g}$$ Step 1: Calculate mass of carbon in the sample. Molar mass of $$CO_2 = 44 \\text{ g mol}^{-1}$$ and each mole contains $$12 \\text{ g}$$ of C. Therefore, $$\\text{Mass of C} = 0.307 \\times \\frac{12}{44} \\text{ g}$$ $$\\text{Mass of C} = 0.08372 \\text{ g}$$ Step 2: Calculate mass of hydrogen in the sample. Molar mass of $$H_2O = 18 \\text{ g mol}^{-1}$$ and each mole contains $$2 \\text{ g}$$ of H. Therefore, $$\\text{Mass of H} = 0.127 \\times \\frac{2}{18} \\text{ g}$$ $$\\text{Mass of H} = 0.01411 \\text{ g}$$ Step 3: Calculate mass of oxygen in the sample. Total mass of C and H in the sample: $$0.08372 + 0.01411 = 0.09783 \\text{ g}$$ Hence, $$\\text{Mass of O} = 0.210 - 0.09783 = 0.11217 \\text{ g}$$ Step 4: Convert masses to percentages. Percentage of hydrogen: $$\\%H = \\frac{0.01411}{0.210} \\times 100 = 6.72\\%$$ Percentage of oxygen: $$\\%O = \\frac{0.11217}{0.210} \\times 100 = 53.41\\%$$ Step 5: State the result. The percentages of hydrogen and oxygen in the organic compound are $$6.72\\%$$ and $$53.41\\%$$ respectively. Thus, the correct choice is Option B .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Choose the correct option for structures of A and B, respectively.",
            "images": [
              {
                "index": 1,
                "filename": "cracku/choose-the-correct-option-for-struc_img1.png"
              },
              {
                "index": 2,
                "filename": "cracku/choose-the-correct-option-for-struc_opta_img2.png"
              },
              {
                "index": 3,
                "filename": "cracku/choose-the-correct-option-for-struc_optb_img3.png"
              },
              {
                "index": 4,
                "filename": "cracku/choose-the-correct-option-for-struc_optc_img4.png"
              },
              {
                "index": 5,
                "filename": "cracku/choose-the-correct-option-for-struc_optd_img5.png"
              }
            ],
            "options": [
              "A",
              "B",
              "C",
              "D"
            ],
            "correct_answer": "A",
            "explanation": "An α-amino acid contains two main acid-base centres: • the carboxylic group $${-COOH}$$ with $$pK_a \\approx 2$$ (behaves as an acid) • the amino group $${-NH_2}$$ with $$pK_a \\approx 9.5$$ (behaves as a base) General protonation rule: the group is protonated when $$\\text{pH} \\lt pK_a$$ and de-protonated when $$\\text{pH} \\gt pK_a$$. Case 1: $$\\text{pH}=2$$ is lower than the amino group’s $$pK_a$$ but equal to the carboxyl group’s $$pK_a$$. • Carboxyl group: at (or just below) its $$pK_a$$ it stays protonated as $$-COOH$$. • Amino group: since $$2 \\lt 9.5$$ it is fully protonated to $$-NH_3^+$$. Therefore structure $$A$$ is $$H_3^+N-CH\\bigl(CH(CH_3)_2\\bigr)-COOH$$, written shortly as $$H_3^+N-CH-COOH$$. Case 2: $$\\text{pH}=10$$ is higher than both $$pK_a$$ values. • Carboxyl group: $$10 \\gt 2$$ ⇒ completely de-protonated to $$-COO^-$$. • Amino group: $$10 \\gt 9.5$$ ⇒ largely de-protonated to the neutral $$-NH_2$$ form. Hence structure $$B$$ is $$H_2N-CH\\bigl(CH(CH_3)_2\\bigr)-COO^-$$, written briefly as $$H_2N-CH-COO^-$$. Comparing with the given options: Option A A = $$H_3^+N-CH-COOH$$, B = $$H_2N-CH-COO^-$$ This matches the derived forms. So, the correct choice is Option A .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Correct statements for an element with atomic number 9 are : A. There can be 5 electrons for which $$m_s = +\\frac{1}{2}$$ and 4 electrons for which $$m_s = -\\frac{1}{2}$$ B. There is only one electron in $$p_z$$ orbital C. The last electron goes to orbital with $$n = 2$$ and $$l = 1$$ D. The sum of angular nodes of all the atomic orbitals is 1. Choose the correct answer from the options given below:",
            "images": [],
            "options": [
              "A. C and D Only",
              "B. A and C Only",
              "C. A, C and D Only",
              "D. A and B Only"
            ],
            "correct_answer": "B",
            "explanation": "The atomic number $$Z = 9$$ corresponds to fluorine. Its ground-state electronic configuration is $$1s^2\\, 2s^2\\, 2p^5$$. Useful facts: (i) For every electron the set of quantum numbers $$\\{n,\\,l,\\,m_l,\\,m_s\\}$$ must be unique (Pauli exclusion principle). (ii) In a given subshell electrons first occupy different orbitals with parallel spins (Hund’s rule) and pairing begins only after every orbital is singly occupied. Testing statement A Fluorine has 9 electrons. Split them according to their spin quantum number $$m_s$$. • $$1s^2$$ : one $$m_s = +\\frac12$$ and one $$m_s = -\\frac12$$ ⇒ 1 up, 1 down. • $$2s^2$$ : one up, one down ⇒ +1 up, +1 down (cumulative 2 up, 2 down). • $$2p^5$$ : first three electrons occupy the three $$2p$$ orbitals with $$m_s = +\\frac12$$, next two pair with $$m_s = -\\frac12$$. ⇒ 3 up + 2 down (cumulative 5 up, 4 down). Possible distribution: 5 electrons with $$m_s = +\\frac12$$ and 4 electrons with $$m_s = -\\frac12$$. Hence statement A is correct. Testing statement B The five $$2p$$ electrons are placed as $$\\uparrow\\downarrow \\; (p_x),\\; \\uparrow \\; (p_y),\\; \\uparrow \\; (p_z).$$ Only one of the three $$2p$$ orbitals ends up doubly occupied; which one is arbitrary because the three orbitals are degenerate. Therefore it is not mandatory that exactly the $$p_z$$ orbital contains a single electron. Statement B is not universally correct and is rejected. Testing statement C For the last (ninth) electron the available orbitals in increasing energy order are $$1s \\lt 2s \\lt 2p$$. The $$1s$$ and $$2s$$ orbitals are already full; hence the ninth electron enters an orbital with $$n = 2,\\, l = 1$$ (a $$2p$$ orbital). Statement C is correct. Testing statement D Angular nodes of an orbital $$= l$$. List every occupied orbital: 1s : $$l = 0 \\Rightarrow 0$$ angular nodes 2s : $$l = 0 \\Rightarrow 0$$ angular nodes 2p_x, 2p_y, 2p_z : each has $$l = 1 \\Rightarrow 1$$ angular node Total angular nodes of all five distinct orbitals $$0 + 0 + 1 + 1 + 1 = 3$$. Statement D claims the sum is 1, which is incorrect. Hence only statements A and C are correct. Correct option: Option B (A and C Only).",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The number of species from the following that are involved in $$sp^3d^2$$ hybridization is : $$[Co(NH_3)_6]^{3+}$$, $$SF_6$$, $$[CrF_6]^{3-}$$, $$[CoF_6]^{3-}$$, $$[Mn(CN)_6]^{3-}$$, and $$[MnCl_6]^{3-}$$",
            "images": [],
            "options": [
              "A. 5",
              "B. 6",
              "C. 4",
              "D. 3"
            ],
            "correct_answer": "D",
            "explanation": "We need to find how many of the given species are involved in $$sp^3d^2$$ hybridization. The key distinction is between inner orbital complexes ($$d^2sp^3$$, which use inner $$(n-1)d$$ orbitals) and outer orbital complexes ($$sp^3d^2$$, which use outer $$nd$$ orbitals). Strong field ligands cause pairing and form inner orbital complexes, while weak field ligands form outer orbital complexes. 1. $$[Co(NH_3)_6]^{3+}$$ $$Co^{3+}$$: electronic configuration is $$[Ar] 3d^6$$. $$NH_3$$ is a strong field ligand, so all 6 electrons pair up in the three $$3d$$ ($$t_{2g}$$) orbitals, leaving the two $$e_g$$ ($$3d$$) orbitals empty for bonding. Hybridization: $$d^2sp^3$$ (inner orbital complex). Not $$sp^3d^2$$. 2. $$SF_6$$ $$S$$ has 6 valence electrons and forms 6 bonds with fluorine atoms. Sulfur uses one $$3s$$, three $$3p$$, and two $$3d$$ orbitals. Hybridization: $$sp^3d^2$$. Yes. 3. $$[CrF_6]^{3-}$$ $$Cr^{3+}$$: electronic configuration is $$[Ar] 3d^3$$. The three $$3d$$ electrons occupy the three $$t_{2g}$$ orbitals (one each), leaving the two $$e_g$$ ($$3d$$) orbitals empty. Even though $$F^-$$ is a weak field ligand, since the $$e_g$$ orbitals are already empty (only 3 d-electrons), $$Cr^{3+}$$ uses these inner $$3d$$ orbitals for bonding. Hybridization: $$d^2sp^3$$ (inner orbital complex). Not $$sp^3d^2$$. 4. $$[CoF_6]^{3-}$$ $$Co^{3+}$$: electronic configuration is $$[Ar] 3d^6$$. $$F^-$$ is a weak field ligand, so no pairing occurs. The 6 electrons are distributed as: $$t_{2g}^4 e_g^2$$ (with 4 unpaired electrons). Since the $$e_g$$ orbitals are occupied, the inner $$3d$$ orbitals cannot be used. The complex uses outer $$4d$$ orbitals. Hybridization: $$sp^3d^2$$ (outer orbital complex). Yes. 5. $$[Mn(CN)_6]^{3-}$$ $$Mn^{3+}$$: electronic configuration is $$[Ar] 3d^4$$. $$CN^-$$ is a strong field ligand, so pairing occurs: the 4 electrons pair up into two orbitals in $$t_{2g}$$, leaving the $$e_g$$ orbitals empty. Hybridization: $$d^2sp^3$$ (inner orbital complex). Not $$sp^3d^2$$. 6. $$[MnCl_6]^{3-}$$ $$Mn^{3+}$$: electronic configuration is $$[Ar] 3d^4$$. $$Cl^-$$ is a weak field ligand, so no pairing occurs. The 4 electrons are distributed as: $$t_{2g}^3 e_g^1$$. Since one $$e_g$$ orbital is occupied, the inner $$3d$$ orbitals cannot both be used for bonding. The complex uses outer $$4d$$ orbitals. Hybridization: $$sp^3d^2$$ (outer orbital complex). Yes. Summary: Species with $$sp^3d^2$$ hybridization: $$SF_6$$, $$[CoF_6]^{3-}$$, $$[MnCl_6]^{3-}$$ = 3 species . Hence, the correct answer is Option D.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match the LIST-I with LIST-II Choose the correct answer from the options given below :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/match-the-listi-with-listii-choose_img1_8.png"
              }
            ],
            "options": [
              "A. A-II, B-III, C-IV, D-I",
              "B. A-II, B-III, C-I, D-IV",
              "C. A-III, B-II, C-IV, D-I",
              "D. A-II, B-IV, C-III, D-I"
            ],
            "correct_answer": "A",
            "explanation": "We recall the characteristic qualitative tests used in practical organic chemistry: Reagent A : $$NaHCO_3$$ (sodium bicarbonate solution) • Carboxylic acids react with $$NaHCO_3$$ producing brisk effervescence of $$CO_2$$. • Hence this test identifies the $$-COOH$$ group. ⇒ Functional group detected = II (carboxylic acid). Reagent B : neutral $$FeCl_3$$ solution • Phenols form coloured (purple, green, blue) complexes with neutral $$Fe^{3+}$$ ions. • Therefore it is used to confirm phenolic $$-OH$$ groups. ⇒ Functional group detected = III (phenolic -OH). Reagent C : ceric ammonium nitrate, $$ (NH_4)_2[Ce(NO_3)_6] $$ • Alcohols give a wine-red or magenta colour with this reagent due to formation of a Ce(IV) complex. • Thus it detects alcoholic $$-OH$$ groups. ⇒ Functional group detected = IV (alcoholic -OH). Reagent D : alkaline $$KMnO_4$$ (Baeyer’s test) • Alkaline $$KMnO_4$$ is decolourised by compounds containing $$C=C$$ or $$C \\equiv C$$ bonds (unsaturation). • Hence it is the standard test for double or triple bonds. ⇒ Functional group detected = I (double bond / unsaturation). Collecting the matches: • A → II • B → III • C → IV • D → I This corresponds to Option A: A-II, B-III, C-IV, D-I. Therefore, the correct answer is Option A .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "When undergoes intramolecular aldol condensation, the major product formed is :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/when-undergoes-intramolecular-aldol_img1.png"
              },
              {
                "index": 2,
                "filename": "cracku/when-undergoes-intramolecular-aldol_opta_img2.png"
              },
              {
                "index": 3,
                "filename": "cracku/when-undergoes-intramolecular-aldol_optb_img3.png"
              },
              {
                "index": 4,
                "filename": "cracku/when-undergoes-intramolecular-aldol_optc_img4.png"
              },
              {
                "index": 5,
                "filename": "cracku/when-undergoes-intramolecular-aldol_optd_img5.png"
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
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Match the LIST-I with LIST-II Choose the correct answer from the options given below :",
            "images": [
              {
                "index": 1,
                "filename": "cracku/match-the-listi-with-listii-choose_img1_9.png"
              }
            ],
            "options": [
              "A. A-III, B-IV, C-II, D-I",
              "B. A-I, B-III, C-I, D-IV",
              "C. A-III, B-II, C-I, D-IV",
              "D. A-IV, B-I, C-III, D-II"
            ],
            "correct_answer": "C",
            "explanation": "First write the ground-state electronic configurations of the central metal atoms. Ni : $$[Ar]\\,3d^{8}\\,4s^{2}$$ Mn : $$[Ar]\\,3d^{5}\\,4s^{2}$$ Next, find the oxidation state of the metal in each complex. $$[Ni(CO)_4]$$ : CO is neutral ⇒ Ni is $$0$$-oxidation. $$[Ni(CN)_4]^{2-}$$ : $$4(\\!-1)$$ from $$CN^-$$ gives $$\\;x-4=-2\\Rightarrow x=+2\\;(Ni^{2+})$$. $$[NiCl_4]^{2-}$$ : $$4(\\!-1)$$ from $$Cl^-$$ gives $$\\;x-4=-2\\Rightarrow x=+2\\;(Ni^{2+})$$. $$[MnBr_4]^{2-}$$ : $$4(\\!-1)$$ from $$Br^-$$ gives $$\\;x-4=-2\\Rightarrow x=+2\\;(Mn^{2+})$$. Now list the $$d$$-electron counts. Ni(0) $$3d^{10}$$ (after promotion-hybridisation will pair all 10). Ni(II) $$3d^{8}$$. Mn(II) $$3d^{5}$$. Identify each ligand as strong- or weak-field. CO and $$CN^-$$ are strong-field (cause pairing). $$Cl^-$$ and $$Br^-$$ are weak-field (do not cause pairing). Determine hybridisation, geometry and unpaired electrons one by one. Case A: $$[Ni(CO)_4]$$ CO is strong field; Ni is in $$0$$ state. The 3d orbitals are fully paired and do not participate in hybridisation. The complex uses $$sp^3$$ hybridisation (4s + 3p) ⇒ tetrahedral. With all electrons paired, $$n=0$$ unpaired ⇒ $$\\mu =0\\;BM$$. Hence: Tetrahedral, 0 BM (Choice III). Case B: $$[Ni(CN)_4]^{2-}$$ Ni$$^{2+}$$ is $$3d^{8}$$. $$CN^-$$ is strong field, so the electrons pair up giving configuration $$t_{2g}^{6}e_g^{2}$$ with no unpaired electrons. Square-planar geometry arises from $$dsp^2$$ hybridisation. $$n=0$$ ⇒ $$\\mu=0\\;BM$$. Hence: Square planar, 0 BM (Choice II). Case C: $$[NiCl_4]^{2-}$$ Ni$$^{2+}$$ is $$3d^{8}$$ and $$Cl^-$$ is weak field, so no additional pairing occurs. The complex adopts $$sp^3$$ hybridisation ⇒ tetrahedral. For a tetrahedral high-spin $$d^{8}$$ ion there are $$n=2$$ unpaired electrons, so $$\\mu=\\sqrt{n(n+2)}=\\sqrt{2\\times4}\\approx2.8\\;BM$$. Hence: Tetrahedral, 2.8 BM (Choice I). Case D: $$[MnBr_4]^{2-}$$ Mn$$^{2+}$$ is $$3d^{5}$$, and the weak-field $$Br^-$$ keeps it high-spin. With $$sp^3$$ hybridisation the geometry is tetrahedral. All five $$d$$ electrons remain unpaired, $$n=5$$, so $$\\mu=\\sqrt{5(5+2)}=\\sqrt{35}\\approx5.9\\;BM$$. Hence: Tetrahedral, 5.9 BM (Choice IV). Collecting the results: A → III B → II C → I D → IV Comparing with the given options, this matches Option C .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Given below are two statements : Statement I : $$H_2Se$$ is more acidic than $$H_2Te$$. Statement II : $$H_2Se$$ has higher bond enthalpy for dissociation than $$H_2Te$$. In the light of the above statements, choose the correct answer from the options given below.",
            "images": [],
            "options": [
              "A. Both Statement I and Statement II are false.",
              "B. Both Statement I and Statement II are true.",
              "C. Statement I is true but Statement II is false.",
              "D. Statement I is false but Statement II is true."
            ],
            "correct_answer": "D",
            "explanation": "For the hydrides of group-16 elements $$H_2E$$ (where $$E = O,S,Se,Te$$) two experimental trends are important: (i) Acidic strength: as we move down the group, the $$E-H$$ bond becomes longer and weaker. It breaks more easily, liberating $$H^+$$, so acidity follows $$H_2O \\lt H_2S \\lt H_2Se \\lt H_2Te$$. (ii) Bond dissociation enthalpy: down the group the $$E-H$$ bond dissociation enthalpy decreases because atomic size increases. Thus $$\\text{BDE}(O-H) \\gt \\text{BDE}(S-H) \\gt \\text{BDE}(Se-H) \\gt \\text{BDE}(Te-H).$$ Now analyse the statements. Statement I : “$$H_2Se$$ is more acidic than $$H_2Te$$.” Actual trend shows $$H_2Te$$ is more acidic than $$H_2Se$$, so the statement is false. Statement II : “$$H_2Se$$ has higher bond enthalpy for dissociation than $$H_2Te$$.” From trend (ii), $$\\text{BDE}(Se-H) \\gt \\text{BDE}(Te-H)$$, so the statement is true. Therefore Statement I is false while Statement II is true ⟹ Option D.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Resonance in $$X_2Y$$ can be represented as The enthalpy of formation of X_2Y\\left( X\\equiv X(g)+\\frac{1}{2}Y=Y(g)\\rightarrow X_2 Y(g)\\right) is 80 kJ mol$$^{-1}$$. The magnitude of resonance energy of $$X_2Y$$ is _____ kJ mol$$^{-1}$$ (nearest integer value). Given: Bond energies of $$X \\equiv X$$, $$X = X$$, $$Y = Y$$ and $$X = Y$$ are 940, 410, 500 and 602 kJ mol$$^{-1}$$ respectively. valence X : 3, Y : 2",
            "images": [
              {
                "index": 1,
                "filename": "cracku/resonance-in-x_2y-can-be-represente_img1.png"
              }
            ],
            "options": [],
            "correct_answer": "98",
            "explanation": "The resonance energy of a molecule is the extra stabilisation it enjoys due to resonance. Mathematically, $$\\text{Resonance energy}= \\left( \\Delta H_f^{\\,\\text{calculated (one structure)}} \\right) - \\left( \\Delta H_f^{\\,\\text{experimental}} \\right)$$ The question gives the experimental enthalpy of formation of $$X_2Y$$ as $$\\Delta H_f^{\\,\\text{exp}} = 80\\ \\text{kJ mol}^{-1}$$ To obtain $$\\Delta H_f^{\\,\\text{calculated}}$$ we choose any one canonical (non-resonating) structure. A convenient choice for $$X_2Y$$ is $$X=X - Y\\;,$$ i.e. one $$X=X$$ double bond and one $$X=Y$$ double bond. The enthalpy of formation is obtained from the usual bond-energy relation $$\\Delta H_f = \\sum \\text{(bond energies of bonds broken)} \\;-\\; \\sum \\text{(bond energies of bonds formed)}$$ Step 1: Bonds broken (to obtain free atoms) We start from the elemental forms: • 1 mol $$X_2$$ contains one $$X\\equiv X$$ triple bond Energy to break it = $$E_{X\\equiv X}=940\\ \\text{kJ}$$ • ½ mol $$Y_2$$ contains half a $$Y=Y$$ double bond Energy to break it = $$\\tfrac12\\,E_{Y=Y} =\\tfrac12 \\times 500 =250\\ \\text{kJ}$$ Total energy required to break reactant bonds: $$E_{\\text{broken}} = 940 + 250 = 1190\\ \\text{kJ}$$ Step 2: Bonds formed in the chosen structure of $$X_2Y$$ • One $$X=X$$ double bond energy released = $$E_{X=X}=410\\ \\text{kJ}$$ • One $$X=Y$$ double bond energy released = $$E_{X=Y}=602\\ \\text{kJ}$$ Total energy released on forming product bonds: $$E_{\\text{formed}} = 410 + 602 = 1012\\ \\text{kJ}$$ Step 3: Calculated enthalpy of formation (one structure) $$\\Delta H_f^{\\,\\text{calc}} = E_{\\text{broken}} - E_{\\text{formed}} = 1190 - 1012 = 178\\ \\text{kJ mol}^{-1}$$ Step 4: Resonance energy $$\\text{Resonance energy} = \\Delta H_f^{\\,\\text{calc}} - \\Delta H_f^{\\,\\text{exp}} = 178 - 80 = 98\\ \\text{kJ mol}^{-1}$$ Hence, the magnitude of the resonance energy of $$X_2Y$$ is 98 kJ mol$$^{-1}$$ .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "The energy of an electron in first Bohr orbit of H-atom is -13.6 eV. The magnitude of energy value of electron in the first excited state of $$Be^{3+}$$ is _____ eV. (nearest integer value)",
            "images": [],
            "options": [],
            "correct_answer": "54",
            "explanation": "For any one-electron (hydrogen-like) species, the Bohr energy expression is $$E_n = -13.6\\,\\text{eV}\\,\\frac{Z^{2}}{n^{2}}$$ where $$Z$$ = atomic number and $$n$$ = principal quantum number. Given: energy of the first Bohr orbit of hydrogen $$\\bigl(Z = 1,\\; n = 1\\bigr)$$ is $$-13.6$$ eV, which matches the above formula and confirms its use. For $$Be^{3+}$$ we have $$Z = 4$$ (beryllium’s atomic number). The first excited state corresponds to the second orbit, so $$n = 2$$. Substitute these values: $$E_{2} = -13.6\\,\\text{eV}\\,\\frac{4^{2}}{2^{2}}$$ Compute numerator and denominator: $$4^{2} = 16,\\quad 2^{2} = 4$$ Therefore, $$E_{2} = -13.6\\,\\text{eV}\\,\\frac{16}{4} = -13.6\\,\\text{eV}\\,\\times 4 = -54.4\\,\\text{eV}$$ The question asks for the magnitude (absolute value): $$|E_{2}| = 54.4\\,\\text{eV}$$ To the nearest integer, the required energy magnitude is 54 eV .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "20 mL of sodium iodide solution gave 4.74 g silver iodide when treated with excess of silver nitrate solution. The molarity of the sodium iodide solution is _____ M. (Given : Na = 23, I = 127, Ag = 108, N = 14, O = 16 g mol$$^{-1}$$)",
            "images": [],
            "options": [],
            "correct_answer": "1",
            "explanation": "The precipitation reaction involved is: NaI + AgNO3 → AgI ↓ + NaNO3 The stoichiometry is 1 : 1, so the moles of NaI present in the sample equal the moles of AgI obtained. Molar mass of silver iodide (AgI): Ag = 108 g mol$$^{-1}$$, I = 127 g mol$$^{-1}$$ Therefore, molar mass of AgI = $$108 + 127 = 235$$ g mol$$^{-1}$$. Moles of AgI formed: $$n = \\frac{4.74}{235} = 0.0202$$ mol Because of the 1 : 1 ratio, moles of NaI in 20 mL solution = $$0.0202$$ mol. Volume of the NaI solution = 20 mL = 0.020 L. Molarity, $$M = \\frac{\\text{moles}}{\\text{volume in L}} = \\frac{0.0202}{0.020} = 1.01$$ M. Rounded to two significant figures, the molarity is approximately $$1$$ M. Answer : 1 M",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "The equilibrium constant for decomposition of $$H_2O(g)$$ $$H_2O(g) \\rightleftharpoons H_2(g) + \\frac{1}{2}O_2(g)$$ ($$\\Delta G^\\circ = 92.34$$ kJ mol$$^{-1}$$) is $$8.0 \\times 10^{-3}$$ at 2300 K and total pressure at equilibrium is 1 bar. Under this condition, the degree of dissociation ($$\\alpha$$) of water is _____ $$\\times 10^{-2}$$. (nearest integer value) [Assume $$\\alpha$$ is negligible with respect to 1]",
            "images": [],
            "options": [],
            "correct_answer": "5",
            "explanation": "Let us start with $$1$$ mole of $$H_2O(g)$$ and let the degree of dissociation at equilibrium be $$\\alpha$$. For the reaction $$H_2O(g) \\rightleftharpoons H_2(g) + \\frac12 O_2(g)$$ the mole table is: Initial moles: $$H_2O = 1$$, $$H_2 = 0$$, $$O_2 = 0$$ Change in moles: $$H_2O = -\\alpha$$, $$H_2 = +\\alpha$$, $$O_2 = +\\dfrac{\\alpha}{2}$$ Equilibrium moles: $$H_2O = 1-\\alpha$$, $$H_2 = \\alpha$$, $$O_2 = \\dfrac{\\alpha}{2}$$ Total moles at equilibrium: $$n_{\\text{tot}} = 1 - \\alpha + \\alpha + \\dfrac{\\alpha}{2} = 1 + \\dfrac{\\alpha}{2}$$ $$-(1)$$ The total pressure is given as $$P_{\\text{tot}} = 1\\text{ bar}$$, therefore the partial pressures are $$P_{H_2O} = \\dfrac{1-\\alpha}{1+\\dfrac{\\alpha}{2}}\\;(1\\text{ bar})$$, $$P_{H_2} = \\dfrac{\\alpha}{1+\\dfrac{\\alpha}{2}}\\;(1\\text{ bar})$$, $$P_{O_2} = \\dfrac{\\dfrac{\\alpha}{2}}{1+\\dfrac{\\alpha}{2}}\\;(1\\text{ bar})$$ The equilibrium constant for the gaseous reaction is $$K_p = \\dfrac{P_{H_2}\\,(P_{O_2})^{1/2}}{P_{H_2O}}$$ Substituting the expressions of partial pressures: $$K_p = \\dfrac{\\dfrac{\\alpha}{1+\\dfrac{\\alpha}{2}}\\left(\\dfrac{\\dfrac{\\alpha}{2}}{1+\\dfrac{\\alpha}{2}}\\right)^{1/2}}{\\dfrac{1-\\alpha}{1+\\dfrac{\\alpha}{2}}}$$ Simplifying (the common factor $$1+\\dfrac{\\alpha}{2}$$ cancels once): $$K_p = \\dfrac{\\alpha\\,\\sqrt{\\dfrac{\\alpha}{2}}}{(1-\\alpha)\\sqrt{1+\\dfrac{\\alpha}{2}}}$$ $$-(2)$$ The data give $$K_p = 8.0 \\times 10^{-3}$$. Since dissociation of steam at 2300 K is small, we first make the approximation $$\\alpha \\ll 1$$ so that $$1-\\alpha \\approx 1$$ and $$1+\\dfrac{\\alpha}{2}\\approx 1$$. With this, equation $$(2)$$ reduces to $$K_p \\approx \\dfrac{\\alpha^{3/2}}{\\sqrt{2}}$$ Hence $$\\alpha^{3/2} \\approx K_p\\,\\sqrt{2} = (8.0\\times 10^{-3})(1.414) = 1.131\\times 10^{-2}$$ $$\\alpha \\approx \\left(1.131\\times 10^{-2}\\right)^{2/3} \\approx 5.0\\times 10^{-2}$$ To improve accuracy, put $$\\alpha = 0.05$$ back into the exact expression $$(2)$$: Numerator: $$\\alpha\\,\\sqrt{\\dfrac{\\alpha}{2}} = 0.05\\sqrt{\\dfrac{0.05}{2}} = 0.05(0.1581)=0.00791$$ Denominator: $$(1-\\alpha)\\sqrt{1+\\dfrac{\\alpha}{2}} = 0.95\\sqrt{1.025}=0.95(1.012)=0.961$$ $$K_p = \\dfrac{0.00791}{0.961}=8.2\\times10^{-3}\\approx 8.0\\times10^{-3}$$ The calculated value matches the given $$K_p$$, confirming $$\\alpha \\approx 0.05$$. Expressing $$\\alpha$$ as $$\\alpha \\times 10^{-2}$$ gives $$5.0 \\times 10^{-2}$$, whose nearest integer value is 5 . Therefore, the degree of dissociation of water under the stated conditions is $$\\boxed{5\\times 10^{-2}}$$ (nearest integer 5).",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "Consider the following half cell reaction: $$Cr_2O_7^{2-}(aq) + 6e^- + 14H^+(aq) \\to 2Cr^{3+}(aq) + 7H_2O(l)$$. The reaction was conducted with the ratio of $$\\frac{[Cr^{3+}]^2}{[Cr_2O_7^{2-}]} = 10^{-6}$$. The pH value at which the EMF of the half cell will become zero is _____ . (nearest integer value) [Given : standard half cell reduction potential $$E^0_{Cr_{2}O^{2-}_{7},H^{+}/Cr^{3+}} = 1.33$$ V, $$\\frac{2.303RT}{F} = 0.059$$ V]",
            "images": [],
            "options": [],
            "correct_answer": "10",
            "explanation": "The given reduction half-cell is $$Cr_2O_7^{2-}(aq)+14H^+(aq)+6e^- \\rightarrow 2Cr^{3+}(aq)+7H_2O(l)$$ Step 1: Write the Nernst equation For a general reduction reaction, $$E = E^{0}-\\dfrac{0.059}{n}\\log_{10}Q$$ where $$n =$$ number of electrons transferred (= 6 here) and $$Q =$$ reaction quotient. Step 2: Express the reaction quotient $$Q$$ Only aqueous species appear in $$Q$$, hence $$Q = \\dfrac{[Cr^{3+}]^{2}}{[Cr_2O_7^{2-}][H^+]^{14}}$$ Step 3: Insert the given concentration ratio We are told $$\\dfrac{[Cr^{3+}]^{2}}{[Cr_2O_7^{2-}]} = 10^{-6}$$. Therefore $$Q = \\dfrac{10^{-6}}{[H^+]^{14}}$$ Step 4: Set the electrode potential to zero The emf becomes zero when $$E = 0$$, so $$0 = E^{0}-\\dfrac{0.059}{6}\\log Q$$ $$\\Rightarrow \\log Q = \\dfrac{6E^{0}}{0.059}$$ Step 5: Calculate $$\\log Q$$ Given $$E^{0} = 1.33\\,$$V, $$\\log Q = \\dfrac{6 \\times 1.33}{0.059} = \\dfrac{7.98}{0.059} \\approx 135.25$$ Step 6: Relate $$\\log Q$$ to $$[H^+]$$ From Step 3, $$Q = \\dfrac{10^{-6}}{[H^+]^{14}}$$ Take $$\\log_{10}$$ of both sides: $$\\log Q = \\log(10^{-6}) - 14\\log[H^+]$$ $$\\Rightarrow 135.25 = -6 - 14\\log[H^+]$$ Step 7: Solve for $$\\log[H^+]$$ $$-14\\log[H^+] = 135.25 + 6 = 141.25$$ $$\\log[H^+] = -\\dfrac{141.25}{14} \\approx -10.09$$ Step 8: Obtain the pH $$[H^+] = 10^{-10.09}$$ $$pH = -\\log[H^+] = 10.09 \\approx 10$$ Therefore, the emf of the given half-cell becomes zero at pH = 10.",
            "year": 2025,
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
            "question_text": "Let the values of $$\\lambda$$ for which the shortest distance between the lines $$\\frac{x-1}{2} = \\frac{y-2}{3} = \\frac{z-3}{4}$$ and $$\\frac{x-\\lambda}{3} = \\frac{y-4}{4} = \\frac{z-5}{5}$$ is $$\\frac{1}{\\sqrt{6}}$$ be $$\\lambda_1$$ and $$\\lambda_2$$. Then the radius of the circle passing through the points $$(0, 0)$$, $$(\\lambda_1, \\lambda_2)$$ and $$(\\lambda_2, \\lambda_1)$$ is :",
            "images": [],
            "options": [
              "A. $$\\frac{5\\sqrt{2}}{3}$$",
              "B. 4",
              "C. $$\\frac{\\sqrt{2}}{3}$$",
              "D. 3"
            ],
            "correct_answer": "A",
            "explanation": "The given lines can be rewritten in the symmetric-parametric form: $$L_1 : \\frac{x-1}{2}=\\frac{y-2}{3}=\\frac{z-3}{4}=t \\;\\;\\Longrightarrow\\;\\; \\mathbf{r}_1=(1,2,3)+t\\,(2,3,4)$$ $$L_2 : \\frac{x-\\lambda}{3}=\\frac{y-4}{4}=\\frac{z-5}{5}=s \\;\\;\\Longrightarrow\\;\\; \\mathbf{r}_2=(\\lambda,4,5)+s\\,(3,4,5)$$ For two skew lines $$\\mathbf{r}=\\mathbf{a}_1+t\\,\\mathbf{b}_1$$ and $$\\mathbf{r}=\\mathbf{a}_2+s\\,\\mathbf{b}_2$$, the shortest distance $$D$$ is given by $$D=\\frac{\\left|(\\mathbf{a}_2-\\mathbf{a}_1)\\,\\cdot\\,(\\mathbf{b}_1\\times\\mathbf{b}_2)\\right|}{\\left|\\mathbf{b}_1\\times\\mathbf{b}_2\\right|}$$ Here $$\\mathbf{a}_1=(1,\\,2,\\,3),\\quad \\mathbf{b}_1=(2,\\,3,\\,4)$$ $$\\mathbf{a}_2=(\\lambda,\\,4,\\,5),\\quad \\mathbf{b}_2=(3,\\,4,\\,5)$$ First find $$\\mathbf{b}_1\\times\\mathbf{b}_2$$: $$\\mathbf{b}_1\\times\\mathbf{b}_2= \\begin{vmatrix} \\mathbf{i}&\\mathbf{j}&\\mathbf{k}\\\\ 2&3&4\\\\ 3&4&5 \\end{vmatrix} =\\bigl(3\\cdot5-4\\cdot4,\\;4\\cdot3-2\\cdot5,\\;2\\cdot4-3\\cdot3\\bigr) =(-1,\\,2,\\,-1)$$ $$\\left|\\mathbf{b}_1\\times\\mathbf{b}_2\\right|=\\sqrt{(-1)^2+2^2+(-1)^2}=\\sqrt6$$ Next evaluate $$(\\mathbf{a}_2-\\mathbf{a}_1)\\cdot(\\mathbf{b}_1\\times\\mathbf{b}_2)$$: $$\\mathbf{a}_2-\\mathbf{a}_1=(\\lambda-1,\\,4-2,\\,5-3)=(\\lambda-1,\\,2,\\,2)$$ $$\\bigl(\\lambda-1,\\,2,\\,2\\bigr)\\cdot(-1,\\,2,\\,-1)=-(\\lambda-1)+4-2=-\\lambda+3$$ Hence $$\\left|(\\mathbf{a}_2-\\mathbf{a}_1)\\cdot(\\mathbf{b}_1\\times\\mathbf{b}_2)\\right|=\\left|\\,\\lambda-3\\,\\right|$$ The shortest distance is given to be $$\\dfrac1{\\sqrt6}$$, therefore $$\\frac{\\left|\\lambda-3\\right|}{\\sqrt6}=\\frac1{\\sqrt6}\\;\\;\\Longrightarrow\\;\\;\\left|\\lambda-3\\right|=1$$ Case 1: $$\\lambda-3=1\\;\\Longrightarrow\\;\\lambda_1=4$$ Case 2: $$\\lambda-3=-1\\;\\Longrightarrow\\;\\lambda_2=2$$ Thus $$\\lambda_1=2,\\;\\lambda_2=4$$ (order is immaterial). The circle must pass through the three points $$A\\,(0,0),\\quad B\\,(\\lambda_1,\\lambda_2)=(2,4),\\quad C\\,(\\lambda_2,\\lambda_1)=(4,2)$$ Compute the side lengths of $$\\triangle ABC$$: $$AB=\\sqrt{(2-0)^2+(4-0)^2}=2\\sqrt5$$ $$AC=\\sqrt{(4-0)^2+(2-0)^2}=2\\sqrt5$$ $$BC=\\sqrt{(4-2)^2+(2-4)^2}=2\\sqrt2$$ Since $$AB=AC$$, the triangle is isosceles. The area $$\\Delta$$ can be obtained using the determinant method in 2-D: $$\\Delta=\\frac12\\left|\\,\\begin{vmatrix}2&4\\\\4&2\\end{vmatrix}\\right| =\\frac12\\left|\\,2\\cdot2-4\\cdot4\\,\\right| =\\frac12\\left|\\,4-16\\,\\right|=6$$ For a triangle with sides $$a,b,c$$ and area $$\\Delta$$, the circum-radius $$R$$ is $$R=\\frac{abc}{4\\Delta}$$ Taking $$a=BC=2\\sqrt2,\\; b=AC=2\\sqrt5,\\; c=AB=2\\sqrt5$$: $$\\begin{aligned} R&=\\frac{(2\\sqrt2)(2\\sqrt5)(2\\sqrt5)}{4\\times6}\\\\ &=\\frac{8\\sqrt2\\,(5)}{24}\\\\ &=\\frac{40\\sqrt2}{24}=\\frac{5\\sqrt2}{3} \\end{aligned}$$ Hence the radius of the required circle is $$\\dfrac{5\\sqrt2}{3}$$, which corresponds to Option A .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$\\alpha$$ be a solution of $$x^2 + x + 1 = 0$$, and for some a and b in $$\\mathbb{R}$$, $$[4 \\; a \\; b] \\begin{bmatrix} 1 & 16 & 13 \\\\ -1 & -1 & 2 \\\\ -2 & -14 & -8 \\end{bmatrix} = [0 \\; 0 \\; 0]$$. If $$\\frac{4}{\\alpha^4} + \\frac{m}{\\alpha^a} + \\frac{n}{\\alpha^b} = 3$$, then $$m + n$$ is equal to :",
            "images": [],
            "options": [
              "A. 3",
              "B. 11",
              "C. 7",
              "D. 8"
            ],
            "correct_answer": "B",
            "explanation": "Since $$\\alpha$$ satisfies $$x^{2}+x+1=0$$, we have $$\\alpha^{2}+\\alpha+1=0$$ and hence $$\\alpha^{3}=1,\\;\\alpha\\neq 1.$$ The condition $$[4\\;a\\;b]\\, \\begin{bmatrix} 1 & 16 & 13\\\\ -1& -1 & 2\\\\ -2&-14&-8 \\end{bmatrix} =[0\\;0\\;0] $$ means the row-vector $$[4\\;a\\;b]$$ is in the left-null-space of the matrix. Multiplying out gives three linear equations: $$4(1)+a(-1)+b(-2)=0\\;\\;\\Longrightarrow\\;\\;4-a-2b=0\\;\\;\\Longrightarrow\\;\\;a+2b=4\\; -(1)$$ $$4(16)+a(-1)+b(-14)=0\\;\\;\\Longrightarrow\\;\\;64-a-14b=0\\;\\;\\Longrightarrow\\;\\;a+14b=64\\; -(2)$$ $$4(13)+a(2)+b(-8)=0\\;\\;\\Longrightarrow\\;\\;52+2a-8b=0\\;\\;\\Longrightarrow\\;\\;a-4b=-26\\; -(3)$$ Solving $$(1)$$ and $$(2)$$: $$\\bigl(a+14b\\bigr)-\\bigl(a+2b\\bigr)=64-4\\;\\;\\Longrightarrow\\;\\;12b=60\\;\\;\\Longrightarrow\\;\\;b=5.$$ Substituting $$b=5$$ in $$(1)$$: $$a+2(5)=4\\;\\;\\Longrightarrow\\;\\;a=-6.$$ (Equation $$(3)$$ is also satisfied, so the solution is consistent.) Now evaluate each reciprocal power of $$\\alpha$$ needed in the expression $$\\frac{4}{\\alpha^{4}}+\\frac{m}{\\alpha^{a}}+\\frac{n}{\\alpha^{5}}=3.$$ Because $$\\alpha^{3}=1,$$ we can reduce every exponent modulo $$3$$: $$\\frac{1}{\\alpha^{4}}=\\frac{1}{\\alpha^{3}\\alpha}=\\frac{1}{\\alpha}= \\alpha^{2},$$ $$\\frac{1}{\\alpha^{a}}=\\frac{1}{\\alpha^{-6}}=\\alpha^{6}= (\\alpha^{3})^{2}=1,$$ $$\\frac{1}{\\alpha^{5}}=\\frac{1}{\\alpha^{3}\\alpha^{2}}=\\frac{1}{\\alpha^{2}}=\\alpha.$$ Substituting these values converts the given relation to a polynomial in $$\\alpha$$: $$4\\alpha^{2}+m\\cdot 1+n\\alpha = 3 \\;\\;\\Longrightarrow\\;\\; 4\\alpha^{2}+n\\alpha+(m-3)=0.$$ The above equation must hold for both roots of $$x^{2}+x+1=0.$$ A polynomial of degree $$2$$ that vanishes at both roots of another irreducible quadratic is necessarily a scalar multiple of that quadratic. Hence $$4\\alpha^{2}+n\\alpha+(m-3)=k\\bigl(\\alpha^{2}+\\alpha+1\\bigr).$$ Comparing coefficients gives the common scalar $$k=4$$ and $$n = k = 4, \\qquad m-3 = k = 4 \\;\\;\\Longrightarrow\\;\\; m = 7.$$ Therefore $$m+n = 7+4 = 11.$$ Option B (11)",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let the function $$f(x) = \\frac{x}{3} + \\frac{3}{x} + 3$$, $$x \\ne 0$$ be strictly increasing in $$(-\\infty, \\alpha_1) \\cup (\\alpha_2, \\infty)$$ and strictly decreasing in $$(\\alpha_3, \\alpha_4) \\cup (\\alpha_4, \\alpha_5)$$. Then $$\\sum_{i=1}^{5} \\alpha_i^2$$ is equal to :",
            "images": [],
            "options": [
              "A. 48",
              "B. 28",
              "C. 40",
              "D. 36"
            ],
            "correct_answer": "D",
            "explanation": "The given function is $$f(x)=\\frac{x}{3}+\\frac{3}{x}+3,\\;x\\neq 0$$. Step 1: Find the derivative and its critical points Using the rule $$\\frac{d}{dx}\\left(\\frac{k}{x}\\right)=-\\frac{k}{x^{2}}$$, we get $$f'(x)=\\frac{1}{3}-\\frac{3}{x^{2}}.$$ Set $$f'(x)=0$$ to locate stationary points: $$\\frac{1}{3}-\\frac{3}{x^{2}}=0 \\;\\Longrightarrow\\; \\frac{1}{3}=\\frac{3}{x^{2}} \\;\\Longrightarrow\\; x^{2}=9 \\;\\Longrightarrow\\; x=\\pm 3.$$ Thus the only stationary points are $$x=-3$$ and $$x=3$$. In addition, $$f(x)$$ is not defined at $$x=0$$, so $$x=0$$ also separates intervals. Step 2: Sign of $$f'(x)$$ in each interval We test one value from each of the four regions determined by $$x=-3,0,3$$. For $$x\\lt -3$$, take $$x=-4$$: $$f'(-4)=\\frac{1}{3}-\\frac{3}{16}\\approx 0.145\\gt 0,$$ so $$f'(x)\\gt 0$$ in $$(-\\infty,-3)$$ ⇒ increasing. For $$-3\\lt x\\lt 0$$, take $$x=-1$$: $$f'(-1)=\\frac{1}{3}-3=-\\frac{8}{3}\\lt 0,$$ so $$f'(x)\\lt 0$$ in $$(-3,0)$$ ⇒ decreasing. For $$0\\lt x\\lt 3$$, take $$x=1$$: $$f'(1)=\\frac{1}{3}-3=-\\frac{8}{3}\\lt 0,$$ so $$f'(x)\\lt 0$$ in $$(0,3)$$ ⇒ decreasing. For $$x\\gt 3$$, take $$x=4$$: $$f'(4)=\\frac{1}{3}-\\frac{3}{16}\\approx 0.146\\gt 0,$$ so $$f'(x)\\gt 0$$ in $$(3,\\infty)$$ ⇒ increasing. Step 3: Match the intervals with the symbols $$\\alpha_i$$ From the sign chart, the intervals of monotonicity are • Increasing: $$(-\\infty,-3)$$ and $$(3,\\infty)$$. • Decreasing: $$(-3,0)$$ and $$(0,3)$$. The problem states that • $$f(x)$$ is strictly increasing in $$(-\\infty,\\alpha_1)\\cup(\\alpha_2,\\infty)$$, • $$f(x)$$ is strictly decreasing in $$(\\alpha_3,\\alpha_4)\\cup(\\alpha_4,\\alpha_5)$$. Comparing, we can assign $$\\alpha_1=-3,\\qquad \\alpha_2=3,$$ $$\\alpha_3=-3,\\qquad \\alpha_4=0,\\qquad \\alpha_5=3.$$ (The same numerical value may occur for different indices; only the positions in the description matter.) Step 4: Compute the required sum $$\\sum_{i=1}^{5}\\alpha_i^{2} =\\alpha_1^{2}+\\alpha_2^{2}+\\alpha_3^{2}+\\alpha_4^{2}+\\alpha_5^{2}$$ $$=(-3)^{2}+3^{2}+(-3)^{2}+0^{2}+3^{2}$$ $$=9+9+9+0+9$$ $$=36.$$ Answer : $$\\sum_{i=1}^{5}\\alpha_i^{2}=36$$, which corresponds to Option D.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "If A and B are two events such that $$P(A) = 0.7$$, $$P(B) = 0.4$$ and $$P(A \\cap \\bar{B}) = 0.5$$, where $$\\bar{B}$$ denotes the complement of B, then $$P\\left(B\\mid(A \\cup \\bar{B})\\right)$$ is equal to :",
            "images": [],
            "options": [
              "A. $$\\frac{1}{4}$$",
              "B. $$\\frac{1}{2}$$",
              "C. $$\\frac{1}{6}$$",
              "D. $$\\frac{1}{3}$$"
            ],
            "correct_answer": "A",
            "explanation": "We want the conditional probability of $$B$$ given $$A \\cup \\bar{B}$$, written as $$P\\left(B \\; \\bigl|\\; A \\cup \\bar{B}\\right)$$. By definition of conditional probability, $$P\\left(B \\;\\bigl|\\; A \\cup \\bar{B}\\right)=\\dfrac{P\\!\\left(B \\cap (A \\cup \\bar{B})\\right)}{P\\!\\left(A \\cup \\bar{B}\\right)} \\quad -(1)$$ Step 1: Simplify the numerator Inside the intersection, $$B \\cap (A \\cup \\bar{B}) = (B \\cap A)\\, \\cup\\, (B \\cap \\bar{B})$$. But $$B \\cap \\bar{B} = \\varnothing$$, so $$B \\cap (A \\cup \\bar{B}) = A \\cap B \\quad -(2)$$ Hence the numerator in $$(1)$$ is $$P(A \\cap B)$$. Step 2: Find $$P(A \\cap B)$$ Use $$P(A)=P(A \\cap B)+P(A \\cap \\bar{B}) \\quad -(3)$$. Given $$P(A)=0.7$$ and $$P(A \\cap \\bar{B})=0.5$$, substitute in $$(3)$$: $$P(A \\cap B)=0.7-0.5=0.2 \\quad -(4)$$ Step 3: Find $$P(A \\cup \\bar{B})$$ (the denominator) The addition theorem states $$P(A \\cup \\bar{B}) = P(A) + P(\\bar{B}) - P(A \\cap \\bar{B}) \\quad -(5)$$ We already know $$P(A)=0.7$$ and $$P(A \\cap \\bar{B})=0.5$$. Also, $$P(\\bar{B}) = 1 - P(B) = 1 - 0.4 = 0.6$$. Substitute into $$(5)$$: $$P(A \\cup \\bar{B}) = 0.7 + 0.6 - 0.5 = 0.8 \\quad -(6)$$ Step 4: Compute the conditional probability Insert $$(4)$$ and $$(6)$$ into $$(1)$$: $$P\\left(B \\; \\bigl|\\; A \\cup \\bar{B}\\right)=\\dfrac{0.2}{0.8}=0.25=\\dfrac{1}{4}$$ Therefore, the required probability equals $$\\dfrac{1}{4}$$. Hence, Option A is correct.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "If $$\\frac{1}{1^4} + \\frac{1}{2^4} + \\frac{1}{3^4} + \\ldots \\infty = \\frac{\\pi^4}{90}$$, $$\\frac{1}{1^4} + \\frac{1}{3^4} + \\frac{1}{5^4} + \\ldots \\infty = \\alpha$$, $$\\frac{1}{2^4} + \\frac{1}{4^4} + \\frac{1}{6^4} + \\ldots \\infty = \\beta$$, then $$\\frac{\\alpha}{\\beta}$$ is equal to :",
            "images": [],
            "options": [
              "A. 23",
              "B. 18",
              "C. 15",
              "D. 14"
            ],
            "correct_answer": "C",
            "explanation": "The given infinite series $$\\frac{1}{1^{4}}+\\frac{1}{2^{4}}+\\frac{1}{3^{4}}+\\ldots$$ equals $$\\frac{\\pi^{4}}{90}$$. This is the value of the Riemann zeta function $$\\zeta(4)$$, so we may write $$\\zeta(4)=\\sum_{n=1}^{\\infty}\\frac{1}{n^{4}}=\\frac{\\pi^{4}}{90}\\;.-(1)$$ Split the same sum into its odd-index and even-index parts: $$\\zeta(4)=\\Bigl(\\frac{1}{1^{4}}+\\frac{1}{3^{4}}+\\frac{1}{5^{4}}+\\ldots\\Bigr)+\\Bigl(\\frac{1}{2^{4}}+\\frac{1}{4^{4}}+\\frac{1}{6^{4}}+\\ldots\\Bigr) =\\alpha+\\beta\\;.-(2)$$ First evaluate $$\\beta$$, the sum over even integers. Write each even number as $$2k$$, where $$k=1,2,3,\\ldots$$: $$\\beta=\\sum_{k=1}^{\\infty}\\frac{1}{(2k)^{4}} =\\sum_{k=1}^{\\infty}\\frac{1}{2^{4}}\\cdot\\frac{1}{k^{4}} =\\frac{1}{16}\\sum_{k=1}^{\\infty}\\frac{1}{k^{4}} =\\frac{1}{16}\\,\\zeta(4)\\;.-(3)$$ Substitute $$\\zeta(4)=\\frac{\\pi^{4}}{90}$$ from $$(1)$$ into $$(3)$$: $$\\beta=\\frac{1}{16}\\cdot\\frac{\\pi^{4}}{90} =\\frac{\\pi^{4}}{1440}\\;.-(4)$$ Now find $$\\alpha$$ using $$(2)$$: $$\\alpha=\\zeta(4)-\\beta =\\frac{\\pi^{4}}{90}-\\frac{\\pi^{4}}{1440}\\;.-(5)$$ Express both fractions in $$(5)$$ with the common denominator $$1440$$: $$\\frac{\\pi^{4}}{90}=\\frac{16\\pi^{4}}{1440}\\,,\\quad \\alpha=\\frac{16\\pi^{4}}{1440}-\\frac{\\pi^{4}}{1440} =\\frac{15\\pi^{4}}{1440} =\\frac{\\pi^{4}}{96}\\;.-(6)$$ Finally, compute the required ratio: $$\\frac{\\alpha}{\\beta} =\\frac{\\pi^{4}/96}{\\pi^{4}/1440} =\\frac{1440}{96} =15\\;.-(7)$$ Therefore, $$\\frac{\\alpha}{\\beta}=15$$. Hence the correct option is Option C.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The sum of the squares of the roots of $$|x - 2|^2 + |x - 2| - 2 = 0$$ and the squares of the roots of $$x^2 - 2|x - 3| - 5 = 0$$, is",
            "images": [],
            "options": [
              "A. 26",
              "B. 36",
              "C. 30",
              "D. 24"
            ],
            "correct_answer": "B",
            "explanation": "We need to find the sum of the squares of the roots of two equations. Equation 1: $$|x - 2|^2 + |x - 2| - 2 = 0$$ Let $$t = |x - 2|$$ where $$t \\geq 0$$. The equation becomes: $$$t^2 + t - 2 = 0$$$ Factoring: $$$(t + 2)(t - 1) = 0$$$ So $$t = -2$$ or $$t = 1$$. Since $$t = |x - 2| \\geq 0$$, we reject $$t = -2$$. Therefore $$|x - 2| = 1$$, which gives: $$x - 2 = 1 \\implies x = 3$$ or $$x - 2 = -1 \\implies x = 1$$ Sum of squares of roots from Equation 1: $$3^2 + 1^2 = 9 + 1 = 10$$ Equation 2: $$x^2 - 2|x - 3| - 5 = 0$$ Case (a): $$x \\geq 3$$ $$|x - 3| = x - 3$$, so the equation becomes: $$$x^2 - 2(x - 3) - 5 = 0$$$ $$$x^2 - 2x + 6 - 5 = 0$$$ $$$x^2 - 2x + 1 = 0$$$ $$$(x - 1)^2 = 0 \\implies x = 1$$$ But $$x = 1 \\lt 3$$, so this does not satisfy our assumption $$x \\geq 3$$. No valid root in this case. Case (b): $$x \\lt 3$$ $$|x - 3| = -(x - 3) = 3 - x$$, so the equation becomes: $$$x^2 - 2(3 - x) - 5 = 0$$$ $$$x^2 + 2x - 6 - 5 = 0$$$ $$$x^2 + 2x - 11 = 0$$$ Using the quadratic formula: $$$x = \\frac{-2 \\pm \\sqrt{4 + 44}}{2} = \\frac{-2 \\pm \\sqrt{48}}{2} = \\frac{-2 \\pm 4\\sqrt{3}}{2} = -1 \\pm 2\\sqrt{3}$$$ Checking: $$x_1 = -1 + 2\\sqrt{3} = -1 + 3.464 = 2.464 \\lt 3$$ ✓ $$x_2 = -1 - 2\\sqrt{3} = -1 - 3.464 = -4.464 \\lt 3$$ ✓ Both roots are valid. Sum of squares of roots from Equation 2: $$x_1^2 + x_2^2 = (-1 + 2\\sqrt{3})^2 + (-1 - 2\\sqrt{3})^2$$ Expanding each: $$(-1 + 2\\sqrt{3})^2 = 1 - 4\\sqrt{3} + 12 = 13 - 4\\sqrt{3}$$ $$(-1 - 2\\sqrt{3})^2 = 1 + 4\\sqrt{3} + 12 = 13 + 4\\sqrt{3}$$ Adding: $$x_1^2 + x_2^2 = (13 - 4\\sqrt{3}) + (13 + 4\\sqrt{3}) = 26$$ Total sum of squares: $$$10 + 26 = 36$$$ Hence, the correct answer is Option B.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let a be the length of a side of a square OABC with O being the origin. Its side OA makes an acute angle $$\\alpha$$ with the positive x-axis and the equations of its diagonals are $$(\\sqrt{3}+1)x + (\\sqrt{3}-1)y = 0$$ and $$(\\sqrt{3}-1)x - (\\sqrt{3}+1)y + 8\\sqrt{3} = 0$$. Then $$a^2$$ is equal to",
            "images": [],
            "options": [
              "A. 48",
              "B. 32",
              "C. 16",
              "D. 24"
            ],
            "correct_answer": "A",
            "explanation": "The vertices of the square are $$O(0,0),\\;A,\\;B,\\;C$$. Because $$OABC$$ is a square, the two diagonals are $$OC$$ and $$AB$$. The line that passes through the origin must be $$OC$$, and the other line must be $$AB$$. Equation of diagonal $$OC$$ (through $$O$$): $$(\\sqrt{3}+1)x + (\\sqrt{3}-1)y = 0 \\quad -(1)$$ Equation of diagonal $$AB$$: $$(\\sqrt{3}-1)x - (\\sqrt{3}+1)y + 8\\sqrt{3} = 0 \\quad -(2)$$ The diagonals of a square intersect at their common midpoint $$M$$. Thus, the point of intersection of $$(1)$$ and $$(2)$$ gives the coordinates of $$M$$. From $$(1)$$: $$(\\sqrt{3}+1)x = -(\\sqrt{3}-1)y \\;\\;\\Rightarrow\\;\\; x = -\\frac{\\sqrt{3}-1}{\\sqrt{3}+1}y \\quad -(3)$$ Put $$(3)$$ into $$(2)$$: $$(\\sqrt{3}-1)\\left(-\\frac{\\sqrt{3}-1}{\\sqrt{3}+1}y\\right) - (\\sqrt{3}+1)y + 8\\sqrt{3} = 0$$ Simplify the y-coefficients first. Define $$r = \\dfrac{\\sqrt{3}-1}{\\sqrt{3}+1}$$. Then the coefficient of $$y$$ becomes $$-(\\sqrt{3}-1)r - (\\sqrt{3}+1).$$ Compute $$r$$ by rationalising the denominator: $$r = \\frac{\\sqrt{3}-1}{\\sqrt{3}+1}\\cdot\\frac{\\sqrt{3}-1}{\\sqrt{3}-1} = \\frac{(\\sqrt{3}-1)^2}{2} = 2-\\sqrt{3}.$$ Now $$-(\\sqrt{3}-1)r - (\\sqrt{3}+1) = -(\\sqrt{3}-1)(2-\\sqrt{3}) - (\\sqrt{3}+1) = -\\frac{8}{\\sqrt{3}+1}.$$ Hence $$-\\frac{8}{\\sqrt{3}+1}\\,y + 8\\sqrt{3} = 0 \\;\\;\\Longrightarrow\\;\\; y = \\sqrt{3}(\\sqrt{3}+1) = 3+\\sqrt{3}.$$ Using $$(3)$$ with $$r = 2-\\sqrt{3}$$: $$x = -ry = -(2-\\sqrt{3})(3+\\sqrt{3}) = -\\bigl(3-\\sqrt{3}\\bigr) = \\sqrt{3}-3.$$ Therefore $$M\\bigl(\\,\\sqrt{3}-3,\\; 3+\\sqrt{3}\\bigr).$$ Distance $$OM$$: $$OM^2 = (\\sqrt{3}-3)^2 + (3+\\sqrt{3})^2 = (12-6\\sqrt{3}) + (12+6\\sqrt{3}) = 24.$$ In a square, the midpoint $$M$$ divides diagonal $$OC$$ in the ratio $$1:1$$, so $$OM = \\frac{OC}{2}.$$ For a square of side $$a$$, the diagonal length is $$OC = a\\sqrt{2}$$, hence $$OM = \\frac{a\\sqrt{2}}{2} \\quad\\Longrightarrow\\quad OM^2 = \\frac{a^2}{2}.$$ Equate the two expressions for $$OM^2$$: $$\\frac{a^2}{2} = 24 \\;\\;\\Longrightarrow\\;\\; a^2 = 48.$$ Thus, $$a^2 = 48$$, which corresponds to Option A .",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let f(x) be a positive function and $$I_1 = \\int_{-\\frac{1}{2}}^{1} 2xf(2x(1-2x)) \\, dx$$ and $$I_2 = \\int_{-1}^{2} f(x(1-x)) \\, dx$$. Then the value of $$\\frac{I_2}{I_1}$$ is equal to :",
            "images": [],
            "options": [
              "A. 9",
              "B. 6",
              "C. 12",
              "D. 4"
            ],
            "correct_answer": "D",
            "explanation": "Given $$I_1 = \\int_{-1/2}^{1} 2x\\,f\\!\\left(2x\\left(1-2x\\right)\\right)\\,dx$$ $$I_2 = \\int_{-1}^{2} f\\!\\left(x\\left(1-x\\right)\\right)\\,dx$$ Put $$x = 2t$$ in $$I_2$$. Then $$dx = 2\\,dt$$, and the limits change as follows: for $$x = -1$$, $$t = -\\dfrac12$$; for $$x = 2$$, $$t = 1$$. Hence $$I_2 = \\int_{-1}^{2} f\\!\\left(x(1-x)\\right)\\,dx = \\int_{-1/2}^{1} f\\!\\left(2t(1-2t)\\right)\\,2\\,dt = 2\\int_{-1/2}^{1} f\\!\\left(2t(1-2t)\\right)\\,dt$$ For convenience, define $$A = \\int_{-1/2}^{1} f\\!\\left(2x(1-2x)\\right)\\,dx \\qquad -(1)$$ With this notation we already have $$I_2 = 2A \\qquad -(2)$$ Next, relate $$I_1$$ to $$A$$. Write $$I_1 = \\int_{-1/2}^{1} 2x\\,f\\!\\left(2x(1-2x)\\right)\\,dx$$ Let $$J = \\int_{-1/2}^{1} x\\,f\\!\\left(2x(1-2x)\\right)\\,dx$$ so that $$I_1 = 2J$$. The key symmetry is $$g(x) = 2x(1-2x)$$ satisfies $$g\\!\\left(\\dfrac12 - x\\right)=g(x)$$. Make the substitution $$u = \\dfrac12 - x$$ in $$J$$. Then $$du = -dx$$ and the limits interchange, giving $$J = \\int_{-1/2}^{1} \\left(\\dfrac12 - u\\right)\\,f\\!\\left(g(u)\\right)\\,du$$ Add this result to the original definition of $$J$$: $$2J = \\int_{-1/2}^{1} \\left[x + \\left(\\dfrac12 - x\\right)\\right] f\\!\\left(g(x)\\right)\\,dx = \\int_{-1/2}^{1} \\dfrac12\\,f\\!\\left(g(x)\\right)\\,dx = \\dfrac12\\,A$$ Therefore $$J = \\dfrac14\\,A \\quad\\Longrightarrow\\quad I_1 = 2J = \\dfrac12\\,A \\qquad -(3)$$ Combine $$(2)$$ and $$(3)$$: $$\\dfrac{I_2}{I_1} = \\dfrac{2A}{A/2} = 4$$ Thus $$\\displaystyle \\frac{I_2}{I_1} = 4$$, corresponding to Option D.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$\\vec{a} = \\hat{i} + 2\\hat{j} + \\hat{k}$$ and $$\\vec{b} = 2\\hat{i} + \\hat{j} - \\hat{k}$$. Let $$\\hat{c}$$ be a unit vector in the plane of the vectors $$\\vec{a}$$ and $$\\vec{b}$$ and be perpendicular to $$\\vec{a}$$. Then such a vector $$\\hat{c}$$ is :",
            "images": [],
            "options": [
              "A. $$\\frac{1}{\\sqrt{5}}(\\hat{j} - 2\\hat{k})$$",
              "B. $$\\frac{1}{\\sqrt{3}}(-\\hat{i} + \\hat{j} - \\hat{k})$$",
              "C. $$\\frac{1}{\\sqrt{3}}(\\hat{i} - \\hat{j} + \\hat{k})$$",
              "D. $$\\frac{1}{\\sqrt{2}}(-\\hat{i} + \\hat{k})$$"
            ],
            "correct_answer": "D",
            "explanation": "We want a unit vector $$\\hat{c}$$ which • lies in the plane of $$\\vec{a}$$ and $$\\vec{b}$$ (so it is a linear combination of them), and • is perpendicular to $$\\vec{a}$$. Write $$\\vec{a} = \\hat{i} + 2\\hat{j} + \\hat{k}$$ and $$\\vec{b} = 2\\hat{i} + \\hat{j} - \\hat{k}$$. A convenient way to obtain a vector lying in the required plane and orthogonal to $$\\vec{a}$$ is to remove from $$\\vec{b}$$ its component along $$\\vec{a}$$. The result is automatically in the span of $$\\vec{a},\\vec{b}$$ and perpendicular to $$\\vec{a}$$. First compute the projection of $$\\vec{b}$$ on $$\\vec{a}$$. Formula: projection of $$\\vec{b}$$ on $$\\vec{a}$$ is $$\\displaystyle\\frac{\\vec{a}\\cdot\\vec{b}}{\\vec{a}\\cdot\\vec{a}}\\;\\vec{a}$$. Dot products: $$\\vec{a}\\cdot\\vec{b} = 1\\cdot2 + 2\\cdot1 + 1\\cdot(-1) = 2 + 2 - 1 = 3$$ $$\\vec{a}\\cdot\\vec{a} = 1^2 + 2^2 + 1^2 = 1 + 4 + 1 = 6$$ Hence the projection is $$\\frac{3}{6}\\,\\vec{a} = \\frac{1}{2}\\,( \\hat{i} + 2\\hat{j} + \\hat{k}) = 0.5\\,\\hat{i} + 1\\,\\hat{j} + 0.5\\,\\hat{k}$$. Subtract this from $$\\vec{b}$$ to get the component of $$\\vec{b}$$ perpendicular to $$\\vec{a}$$: $$\\vec{d} = \\vec{b} - \\text{proj}_{\\vec{a}}\\vec{b}$$ $$= (2,\\,1,\\,-1) - (0.5,\\,1,\\,0.5)$$ $$= (1.5,\\,0,\\,-1.5)$$. Multiply by $$2$$ to clear the decimal: $$\\vec{d} = (3,\\,0,\\,-3) = 3(1,\\,0,\\,-1).$$ Any non-zero scalar multiple of $$\\vec{d}$$ is still in the same direction, so we choose the simple vector $$\\vec{m} = (1,\\,0,\\,-1) = \\hat{i} - \\hat{k}$$. Check orthogonality with $$\\vec{a}$$: $$(\\hat{i} - \\hat{k})\\cdot(\\hat{i} + 2\\hat{j} + \\hat{k}) = 1 - 1 = 0,$$ so it is indeed perpendicular to $$\\vec{a}$$. Now normalise to get a unit vector: Magnitude of $$\\vec{m}$$: $$|\\vec{m}| = \\sqrt{1^2 + 0^2 + (-1)^2} = \\sqrt{2}$$. Hence $$\\hat{c} = \\frac{\\vec{m}}{|\\vec{m}|} = \\frac{1}{\\sqrt{2}}(\\hat{i} - \\hat{k}).$$ The negative of a unit vector is also a valid unit vector, so $$-\\hat{c} = \\dfrac{1}{\\sqrt{2}}(-\\hat{i} + \\hat{k})$$ is equally acceptable. Comparing with the options, Option D gives $$\\dfrac{1}{\\sqrt{2}}(-\\hat{i} + \\hat{k})$$, which matches (up to sign). Therefore the required vector is given by Option D.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let the ellipse $$3x^2 + py^2 = 4$$ pass through the centre C of the circle $$x^2 + y^2 - 2x - 4y - 11 = 0$$ of radius r. Let $$f_1$$, $$f_2$$ be the focal distances of the point C on the ellipse. Then $$6f_1f_2 - r$$ is equal to",
            "images": [],
            "options": [
              "A. 74",
              "B. 68",
              "C. 70",
              "D. 78"
            ],
            "correct_answer": "C",
            "explanation": "The centre of the circle $$x^{2}+y^{2}-2x-4y-11=0$$ is obtained by completing the squares. $$x^{2}-2x+1+y^{2}-4y+4=11+1+4$$ $$\\Rightarrow (x-1)^{2}+(y-2)^{2}=16$$ Hence the centre is $$C(1,2)$$ and the radius is $$r=4$$. The ellipse is $$3x^{2}+py^{2}=4$$ and it passes through the point $$C(1,2)$$, so $$3(1)^{2}+p(2)^{2}=4$$ $$\\Rightarrow 3+4p=4$$ $$\\Rightarrow 4p=1 \\;\\Longrightarrow\\; p=\\frac14$$ Therefore the ellipse is $$3x^{2}+\\frac14\\,y^{2}=4$$. Divide by $$4$$ to get the standard form: $$\\frac{3}{4}x^{2}+\\frac{1}{16}y^{2}=1$$ $$\\Rightarrow \\frac{x^{2}}{\\frac{4}{3}}+\\frac{y^{2}}{16}=1$$ Comparing with $$\\frac{x^{2}}{b^{2}}+\\frac{y^{2}}{a^{2}}=1$$ (major axis along $$y$$-axis), we have $$a^{2}=16,\\;a=4,\\qquad b^{2}=\\frac{4}{3}$$ The focal length satisfies $$c^{2}=a^{2}-b^{2}$$, hence $$c^{2}=16-\\frac{4}{3}=\\frac{48-4}{3}=\\frac{44}{3},\\qquad c=\\sqrt{\\frac{44}{3}}$$ The foci are $$F_{1}(0,c)$$ and $$F_{2}(0,-c)$$. Let the focal distances of the point $$C(1,2)$$ be $$f_{1}=CF_{1}$$ and $$f_{2}=CF_{2}$$. Since $$C$$ lies on the ellipse, the sum of its focal distances equals the major axis length : $$f_{1}+f_{2}=2a=8 \\quad -(1)$$ Now compute the squares of the distances. $$f_{1}^{2}=(1-0)^{2}+(2-c)^{2}=1+(2-c)^{2} =1+4-4c+c^{2}=5-4c+c^{2}$$ $$f_{2}^{2}=(1-0)^{2}+(2+c)^{2}=1+(2+c)^{2} =1+4+4c+c^{2}=5+4c+c^{2}$$ Adding: $$f_{1}^{2}+f_{2}^{2}=(5-4c+c^{2})+(5+4c+c^{2}) =10+2c^{2} \\quad -(2)$$ From identities, $$(f_{1}+f_{2})^{2}=f_{1}^{2}+f_{2}^{2}+2f_{1}f_{2} \\quad -(3)$$ Substitute $$-(1)$$ and $$-(2)$$ into $$-(3)$$: $$8^{2}=10+2c^{2}+2f_{1}f_{2}$$ $$64=10+2\\left(\\frac{44}{3}\\right)+2f_{1}f_{2}$$ $$64=10+\\frac{88}{3}+2f_{1}f_{2}$$ $$64=\\frac{30}{3}+\\frac{88}{3}+2f_{1}f_{2} =\\frac{118}{3}+2f_{1}f_{2}$$ $$\\Rightarrow 2f_{1}f_{2}=64-\\frac{118}{3} =\\frac{192-118}{3}=\\frac{74}{3}$$ $$\\therefore\\; f_{1}f_{2}=\\frac{37}{3}$$ Finally, $$6f_{1}f_{2}-r=6\\left(\\frac{37}{3}\\right)-4 =2\\cdot37-4 =74-4 =70$$ Hence $$6f_{1}f_{2}-r=70$$, which matches Option C.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The integral $$\\int_{-1}^{\\frac{3}{2}} \\left(\\left|\\pi^2 x \\sin(\\pi x)\\right|\\right) dx$$ is equal to :",
            "images": [],
            "options": [
              "A. $$3 + 2\\pi$$",
              "B. $$4 + \\pi$$",
              "C. $$1 + 3\\pi$$",
              "D. $$2 + 3\\pi$$"
            ],
            "correct_answer": "C",
            "explanation": "Write the integrand in a simpler form: $$\\left|\\pi^{2}x\\sin(\\pi x)\\right| = \\pi^{2}\\,|x\\sin(\\pi x)|$$ Hence $$I=\\int_{-1}^{3/2}\\left|\\pi^{2}x\\sin(\\pi x)\\right|dx=\\pi^{2}\\int_{-1}^{3/2}|x\\sin(\\pi x)|dx$$ First locate the points where $$x\\sin(\\pi x)=0$$ inside $$[-1,\\,3/2]$$. Zeros occur when $$x=0$$ or $$\\sin(\\pi x)=0\\;(\\Rightarrow x=\\text{integer})$$. Thus the critical points are $$x=-1,\\,0,\\,1$$. Check the sign of $$f(x)=x\\sin(\\pi x)$$ on each sub-interval: $$(-1,0):$$ choose $$x=-\\tfrac12$$ ⇒ $$f(x)=(-\\tfrac12)\\sin(-\\tfrac{\\pi}{2})=( -\\tfrac12)(-1)\\gt0$$ $$(0,1):$$ choose $$x=\\tfrac12$$ ⇒ $$f(x)=(\\tfrac12)\\sin(\\tfrac{\\pi}{2})=(\\tfrac12)(1)\\gt0$$ $$(1,\\,3/2):$$ choose $$x=\\tfrac32$$ ⇒ $$f(x)=(\\tfrac32)\\sin(\\tfrac{3\\pi}{2})=(\\tfrac32)(-1)\\lt0$$ Thus Case 1: $$x\\in[-1,1]\\; \\Rightarrow\\; |f(x)|=f(x)$$ Case 2: $$x\\in[1,3/2]\\; \\Rightarrow\\; |f(x)|=-f(x)$$ Split the integral accordingly: $$I=\\pi^{2}\\left[\\int_{-1}^{1}x\\sin(\\pi x)\\,dx-\\int_{1}^{3/2}x\\sin(\\pi x)\\,dx\\right]$$ Find an antiderivative of $$x\\sin(\\pi x)$$ using integration by parts. Let $$u=x,\\;dv=\\sin(\\pi x)dx$$. Then $$du=dx,\\;v=-\\dfrac{\\cos(\\pi x)}{\\pi}$$. $$\\int x\\sin(\\pi x)dx=-\\dfrac{x\\cos(\\pi x)}{\\pi}+\\dfrac{\\sin(\\pi x)}{\\pi^{2}}$$ $$-(1)$$ Integral over $$[-1,1]$$ Using $$(1):$$ $$F(x)=-\\dfrac{x\\cos(\\pi x)}{\\pi}+\\dfrac{\\sin(\\pi x)}{\\pi^{2}}$$ $$\\begin{aligned} \\int_{-1}^{1}x\\sin(\\pi x)dx &=F(1)-F(-1)\\\\ &=\\left[-\\dfrac{1\\cdot(-1)}{\\pi}+0\\right]-\\left[-\\dfrac{(-1)\\cdot(-1)}{\\pi}+0\\right]\\\\ &=\\dfrac{1}{\\pi}-\\left(-\\dfrac{1}{\\pi}\\right)=\\dfrac{2}{\\pi} \\end{aligned}$$ Integral over $$[1,3/2]$$ $$\\begin{aligned} \\int_{1}^{3/2}x\\sin(\\pi x)dx &=F\\!\\left(\\tfrac32\\right)-F(1)\\\\ &=\\left[0-\\dfrac{1}{\\pi^{2}}\\right]-\\dfrac{1}{\\pi}\\\\ &=-\\left(\\dfrac{1}{\\pi}+\\dfrac{1}{\\pi^{2}}\\right) \\end{aligned}$$ Now compute $$I$$: $$\\begin{aligned} I&=\\pi^{2}\\left[\\dfrac{2}{\\pi}-\\Bigl(-\\dfrac{1}{\\pi}-\\dfrac{1}{\\pi^{2}}\\Bigr)\\right]\\\\[6pt] &=\\pi^{2}\\left[\\dfrac{2}{\\pi}+\\dfrac{1}{\\pi}+\\dfrac{1}{\\pi^{2}}\\right]\\\\[6pt] &=\\pi^{2}\\left[\\dfrac{3}{\\pi}+\\dfrac{1}{\\pi^{2}}\\right]\\\\[6pt] &=3\\pi+1 \\end{aligned}$$ Therefore, $$\\displaystyle\\int_{-1}^{3/2}\\left|\\pi^{2}x\\sin(\\pi x)\\right|dx = 1 + 3\\pi$$. Option C is correct.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "A line passing through the point P(a, $$\\theta$$) makes an acute angle $$\\alpha$$ with the positive x-axis. Let this line be rotated about the point P through an angle $$\\frac{\\alpha}{2}$$ in the clock-wise direction. If in the new position, the slope of the line is $$2 - \\sqrt{3}$$ and its distance from the origin is $$\\frac{1}{\\sqrt{2}}$$, then the value of $$3a^2\\tan^2\\alpha - 2\\sqrt{3}$$ is",
            "images": [],
            "options": [
              "A. 4",
              "B. 6",
              "C. 5",
              "D. 8"
            ],
            "correct_answer": "A",
            "explanation": "The first position of the line is through the point $$P(a,0)$$ and makes an acute angle $$\\alpha$$ with the positive $$x$$-axis, so its slope is $$m_1=\\tan\\alpha$$. The line is then rotated clockwise about $$P$$ through $$\\dfrac{\\alpha}{2}$$. Clockwise rotation decreases the inclination, hence the new angle with the $$x$$-axis is $$\\alpha-\\dfrac{\\alpha}{2}= \\dfrac{\\alpha}{2}$$. Therefore the slope of the new line is $$m_2=\\tan\\!\\left(\\dfrac{\\alpha}{2}\\right)$$. Given that in this new position the slope equals $$2-\\sqrt{3}$$, we have $$\\tan\\!\\left(\\dfrac{\\alpha}{2}\\right)=2-\\sqrt{3}$$ $$-(1)$$ Formula used: the double-angle identity for tangent, $$\\tan\\alpha=\\dfrac{2\\tan\\!\\left(\\dfrac{\\alpha}{2}\\right)}{1-\\tan^2\\!\\left(\\dfrac{\\alpha}{2}\\right)}$$ $$-(2)$$ Substituting $$\\tan\\!\\left(\\dfrac{\\alpha}{2}\\right)=2-\\sqrt{3}$$ into $$(2)$$: Numerator $$=2(2-\\sqrt{3})=4-2\\sqrt{3}$$ Denominator $$=1-(2-\\sqrt{3})^{2}=1-\\left(7-4\\sqrt{3}\\right)=4\\sqrt{3}-6$$. Thus $$\\tan\\alpha=\\dfrac{4-2\\sqrt{3}}{4\\sqrt{3}-6} =\\dfrac{2-\\sqrt{3}}{\\sqrt{3}(2-\\sqrt{3})} =\\dfrac{1}{\\sqrt{3}}$$. Since $$\\alpha$$ is acute, $$\\alpha=30^{\\circ}$$ and $$\\tan^{2}\\alpha=\\dfrac{1}{3}$$ $$-(3)$$ Equation of the new line (slope $$2-\\sqrt{3}$$, passing through $$P(a,0)$$): $$y=(2-\\sqrt{3})(x-a)\\;\\;\\Longrightarrow\\;\\;(2-\\sqrt{3})x - y - a(2-\\sqrt{3})=0$$. For a line $$Ax+By+C=0$$, the perpendicular distance from the origin $$(0,0)$$ is $$d=\\dfrac{|C|}{\\sqrt{A^{2}+B^{2}}}$$. Here $$A=2-\\sqrt{3},\\,B=-1,\\,C=-a(2-\\sqrt{3})$$, so $$d=\\dfrac{|a|(2-\\sqrt{3})}{\\sqrt{(2-\\sqrt{3})^{2}+1}}$$. Given distance $$d=\\dfrac{1}{\\sqrt{2}}$$, we get $$\\dfrac{a^{2}(2-\\sqrt{3})^{2}}{(2-\\sqrt{3})^{2}+1}=\\dfrac{1}{2}$$. Let $$t=2-\\sqrt{3}\\;(\\,t^{2}=7-4\\sqrt{3}\\,)$$. Then $$a^{2}=\\dfrac{\\dfrac12\\bigl(1+t^{2}\\bigr)}{t^{2}} =\\dfrac12\\cdot\\dfrac{1+7-4\\sqrt{3}}{t^{2}} =\\dfrac12\\cdot\\dfrac{8-4\\sqrt{3}}{t^{2}} =\\dfrac{2(2-\\sqrt{3})}{t^{2}} =\\dfrac{2t}{t^{2}} =\\dfrac{2}{t}$$. Since $$t=2-\\sqrt{3}$$, $$a^{2}=\\dfrac{2}{2-\\sqrt{3}} =2\\cdot\\dfrac{2+\\sqrt{3}}{(2-\\sqrt{3})(2+\\sqrt{3})} =2(2+\\sqrt{3}) =4+2\\sqrt{3}$$ $$-(4)$$ Required expression: $$3a^{2}\\tan^{2}\\alpha-2\\sqrt{3} =3a^{2}\\cdot\\dfrac{1}{3}-2\\sqrt{3} =a^{2}-2\\sqrt{3}$$ (using $$(3)$$). Using $$(4)$$, $$a^{2}-2\\sqrt{3}=(4+2\\sqrt{3})-2\\sqrt{3}=4.$$ Therefore, $$3a^{2}\\tan^{2}\\alpha-2\\sqrt{3}=4$$, which corresponds to Option A.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "There are 12 points in a plane, no three of which are in the same straight line, except 5 points which are collinear. Then the total number of triangles that can be formed with the vertices at any three of these 12 points is",
            "images": [],
            "options": [
              "A. 230",
              "B. 220",
              "C. 200",
              "D. 210"
            ],
            "correct_answer": "D",
            "explanation": "Any triangle is completely determined by choosing its three vertices. Therefore, start by counting all possible selections of three points from the 12 points. Total unordered triples of points $$= {}^{12}C_{3} = \\frac{12 \\times 11 \\times 10}{3 \\times 2 \\times 1} = 220$$ $$-(1)$$ A triangle cannot be formed if all three chosen points lie on the same straight line. The only collinear points given are the 5 points on one common line; all other triples are non-collinear. Number of degenerate (collinear) triples $$= {}^{5}C_{3} = \\frac{5 \\times 4 \\times 3}{3 \\times 2 \\times 1} = 10$$ $$-(2)$$ Subtract these degenerate cases from the total in $$(1)$$ to obtain the required number of triangles: Required triangles $$= 220 - 10 = 210$$ Hence, the total number of distinct triangles that can be formed is $$210$$. Option D is correct.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$A = \\left\\{\\theta \\in [0, 2\\pi] : 1 + 10\\text{Re}\\left(\\frac{2\\cos\\theta + i\\sin\\theta}{\\cos\\theta - 3i\\sin\\theta}\\right) = 0\\right\\}$$. Then $$\\sum_{\\theta \\in A} \\theta^2$$ is equal to",
            "images": [],
            "options": [
              "A. $$\\frac{21}{4}\\pi^2$$",
              "B. $$8\\pi^2$$",
              "C. $$\\frac{27}{4}\\pi^2$$",
              "D. $$6\\pi^2$$"
            ],
            "correct_answer": "A",
            "explanation": "Write $$\\cos\\theta = c$$ and $$\\sin\\theta = s$$ for brevity. The given condition is $$1 + 10\\,\\text{Re}\\!\\left(\\dfrac{2c + i\\,s}{\\,c - 3i\\,s}\\right)=0$$ which can be rearranged as $$\\text{Re}\\!\\left(\\dfrac{2c + i\\,s}{\\,c - 3i\\,s}\\right)= -\\dfrac1{10}\\,\\,\\,\\,\\,\\,-(1)$$ To extract the real part, multiply numerator and denominator by the conjugate of the denominator: $$\\dfrac{2c + i\\,s}{\\,c - 3i\\,s} =\\dfrac{(2c + i\\,s)(c + 3i\\,s)}{(c - 3i\\,s)(c + 3i\\,s)} =\\dfrac{(2c + i\\,s)(c + 3i\\,s)}{c^2 + 9s^2}$$ Expand the numerator: $$\\begin{aligned} (2c + i\\,s)(c + 3i\\,s) &= 2c\\cdot c + 2c\\cdot 3i\\,s + i\\,s\\cdot c + i\\,s\\cdot 3i\\,s\\\\ &= 2c^2 + 6i\\,cs + i\\,cs + 3i^2s^2\\\\ &= 2c^2 + 7i\\,cs - 3s^2 \\end{aligned}$$ Thus $$\\dfrac{2c + i\\,s}{\\,c - 3i\\,s} =\\dfrac{\\,2c^2 - 3s^2}{c^2 + 9s^2} + i\\,\\dfrac{7cs}{c^2 + 9s^2}$$ Hence the real part is $$\\text{Re} = \\dfrac{\\,2c^2 - 3s^2}{c^2 + 9s^2}$$ Insert this into $$(1)$$: $$\\dfrac{\\,2c^2 - 3s^2}{c^2 + 9s^2} = -\\dfrac1{10}$$ Cross-multiply: $$10(2c^2 - 3s^2) = -(c^2 + 9s^2)$$ $$20c^2 - 30s^2 + c^2 + 9s^2 = 0$$ $$21c^2 - 21s^2 = 0$$ $$c^2 = s^2$$ Therefore $$|\\,\\cos\\theta| = |\\,\\sin\\theta|$$, which is equivalent to $$\\tan^2\\theta = 1 \\; \\Longrightarrow \\; \\theta = \\dfrac{\\pi}{4} + k\\dfrac{\\pi}{2}, \\; k \\in \\mathbb{Z}$$ Within the interval $$[0, 2\\pi]$$ the admissible angles are $$\\theta_1 = \\dfrac{\\pi}{4},\\; \\theta_2 = \\dfrac{3\\pi}{4},\\; \\theta_3 = \\dfrac{5\\pi}{4},\\; \\theta_4 = \\dfrac{7\\pi}{4}$$ Compute the required sum: $$\\sum_{\\theta\\in A} \\theta^2 = \\left(\\dfrac{\\pi}{4}\\right)^2 + \\left(\\dfrac{3\\pi}{4}\\right)^2 + \\left(\\dfrac{5\\pi}{4}\\right)^2 + \\left(\\dfrac{7\\pi}{4}\\right)^2$$ $$= \\dfrac{\\pi^2}{16} + \\dfrac{9\\pi^2}{16} + \\dfrac{25\\pi^2}{16} + \\dfrac{49\\pi^2}{16} = \\dfrac{84\\pi^2}{16} = \\dfrac{21}{4}\\pi^2$$ Hence $$\\displaystyle \\sum_{\\theta \\in A} \\theta^2 = \\dfrac{21}{4}\\pi^2$$, which matches Option A.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$A = \\{0, 1, 2, 3, 4, 5\\}$$. Let R be a relation on A defined by $$(x, y) \\in R$$ if and only if $$\\max\\{x, y\\} \\in \\{3, 4\\}$$. Then among the statements $$(S_1)$$ : The number of elements in R is 18, and $$(S_2)$$ : The relation R is symmetric but neither reflexive nor transitive",
            "images": [],
            "options": [
              "A. both are false",
              "B. both are true",
              "C. only $$S_2$$ is true",
              "D. only $$S_1$$ is true"
            ],
            "correct_answer": "C",
            "explanation": "Set $$A = \\{0,1,2,3,4,5\\}$$ has six elements. The relation $$R$$ is defined by$$(x,y) \\in R \\; \\Longleftrightarrow \\; \\max\\{x,y\\} \\in \\{3,4\\}.$$ Case 1: $$\\max\\{x,y\\}=3$$ Both coordinates must lie in $$\\{0,1,2,3\\}$$ and at least one of them must be $$3$$. Total ordered pairs with coordinates from $$\\{0,1,2,3\\}$$ are $$4 \\times 4 = 16$$. Pairs with both coordinates in $$\\{0,1,2\\}$$ (hence max < 3) are $$3 \\times 3 = 9$$. Hence the number of pairs with max $$3$$ is $$16-9 = 7$$. The explicit pairs are $$(3,0),(3,1),(3,2),(3,3),(0,3),(1,3),(2,3).$$ Case 2: $$\\max\\{x,y\\}=4$$ Both coordinates must lie in $$\\{0,1,2,3,4\\}$$ and at least one of them must be $$4$$. Total ordered pairs with coordinates from $$\\{0,1,2,3,4\\}$$ are $$5 \\times 5 = 25$$. Pairs with both coordinates in $$\\{0,1,2,3\\}$$ (max < 4) are $$4 \\times 4 = 16$$. Hence the number of pairs with max $$4$$ is $$25-16 = 9$$. The explicit pairs are $$(4,0),(4,1),(4,2),(4,3),(4,4),(0,4),(1,4),(2,4),(3,4).$$ Since no ordered pair can contain the element $$5$$ (that would make the maximum $$\\ge 5$$), the total number of elements in $$R$$ is $$7 + 9 = 16.$$ Statement $$S_1$$ claims $$18$$ elements, so $$S_1$$ is false. Next, examine the properties of $$R$$. Symmetric: If $$(x,y) \\in R$$, then $$\\max\\{x,y\\} \\in \\{3,4\\}$$. The same maximum equals $$\\max\\{y,x\\}$$, so $$(y,x) \\in R$$. Hence $$R$$ is symmetric. Reflexive: Reflexivity requires every $$(a,a)$$, $$a \\in A$$, to be in $$R$$. But $$(a,a) \\in R \\Longleftrightarrow a \\in \\{3,4\\}$$. Elements $$0,1,2,5$$ violate this, so $$R$$ is not reflexive. Transitive: To test transitivity, find a counter-example. Take $$x=0,\\,y=4,\\,z=0$$. $$(x,y)=(0,4) \\in R \\quad (\\max=4),$$ $$(y,z)=(4,0) \\in R \\quad (\\max=4),$$ but $$(x,z)=(0,0) \\notin R \\quad (\\max=0).$$ Thus $$R$$ is not transitive. Therefore $$R$$ is symmetric but neither reflexive nor transitive, so Statement $$S_2$$ is true. Conclusion: $$S_1$$ is false and $$S_2$$ is true → Option C (only $$S_2$$ is true).",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The number of integral terms in the expansion of $$\\left(5^{\\frac{1}{2}} + 7^{\\frac{1}{8}}\\right)^{1016}$$ is",
            "images": [],
            "options": [
              "A. 127",
              "B. 130",
              "C. 129",
              "D. 128"
            ],
            "correct_answer": "D",
            "explanation": "Let the general term in the binomial expansion of $$\\left(5^{1/2}+7^{1/8}\\right)^{1016}$$ be $$T_{k+1}$$, where $$k$$ ranges from $$0$$ to $$1016$$. Using the Binomial Theorem, $$T_{k+1} = \\binom{1016}{k}\\,\\left(5^{1/2}\\right)^{1016-k}\\,\\left(7^{1/8}\\right)^{k}$$ Simplify the powers of $$5$$ and $$7$$: $$T_{k+1} = \\binom{1016}{k}\\,5^{\\frac{1016-k}{2}}\\;7^{\\frac{k}{8}}$$ $$-(1)$$ For $$T_{k+1}$$ to be an integer, the exponents of both $$5$$ and $$7$$ must be non-negative integers. Condition 1 (for the power of 7) The exponent $$\\dfrac{k}{8}$$ must be an integer ⟹ $$k$$ must be a multiple of $$8$$. Condition 2 (for the power of 5) The exponent $$\\dfrac{1016-k}{2}$$ must be an integer. Since $$1016$$ is even, $$\\dfrac{1016-k}{2}$$ is an integer whenever $$k$$ is even. If $$k$$ is a multiple of $$8$$, then $$k$$ is automatically even, so both conditions are satisfied simultaneously. Hence, the permissible values of $$k$$ are all multiples of $$8$$ from $$0$$ up to $$1016$$ (inclusive): $$k = 0,\\,8,\\,16,\\,24,\\,\\dots,\\,1016$$ The number of terms in this arithmetic sequence is $$\\text{Count} = \\frac{1016}{8} + 1 = 127 + 1 = 128$$ Therefore, the expansion contains $$128$$ integral terms. Option D is correct.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$f(x) = x - 1$$ and $$g(x) = e^x$$ for $$x \\in \\mathbb{R}$$. If $$\\frac{dy}{dx} = \\left(e^{-2\\sqrt{x}} g(f(f(x))) - \\frac{y}{\\sqrt{x}}\\right)$$, $$y(0) = 0$$, then $$y(1)$$ is :-",
            "images": [],
            "options": [
              "A. $$\\frac{1 - e^2}{e^4}$$",
              "B. $$\\frac{2e - 1}{e^3}$$",
              "C. $$\\frac{e - 1}{e^4}$$",
              "D. $$\\frac{1 - e^3}{e^4}$$"
            ],
            "correct_answer": "C",
            "explanation": "We are given $$f(x)=x-1$$ and $$g(x)=e^{x}$$. First simplify the composition that appears in the differential equation. $$f(f(x))=f(x-1)=(x-1)-1=x-2$$ Therefore $$g\\!\\bigl(f(f(x))\\bigr)=e^{\\,x-2}$$. Substituting in the differential equation, $$\\frac{dy}{dx}=e^{-2\\sqrt{x}}\\;e^{\\,x-2}-\\frac{y}{\\sqrt{x}} \\;=\\;e^{\\,x-2-2\\sqrt{x}}\\;-\\;\\frac{y}{\\sqrt{x}}.$$ Write it in standard linear form $$\\dfrac{dy}{dx}+P(x)\\,y=Q(x).$$ Here $$P(x)=\\frac{1}{\\sqrt{x}},\\;\\;Q(x)=e^{\\,x-2-2\\sqrt{x}}.$$ Integrating factor The integrating factor (I.F.) is $$\\exp\\!\\Bigl(\\int P(x)\\,dx\\Bigr).$$ $$\\int P(x)\\,dx=\\int x^{-1/2}dx=2\\sqrt{x},$$ so $$\\text{I.F.}=e^{\\,2\\sqrt{x}}.$$ Multiply the differential equation by this integrating factor: $$e^{\\,2\\sqrt{x}}\\frac{dy}{dx}+\\frac{1}{\\sqrt{x}}e^{\\,2\\sqrt{x}}y =\\;e^{\\,2\\sqrt{x}}\\,e^{\\,x-2-2\\sqrt{x}}=e^{\\,x-2}.$$ The left-hand side is the derivative of $$y\\,e^{\\,2\\sqrt{x}}$$, because $$\\frac{d}{dx}\\!\\bigl(y\\,e^{\\,2\\sqrt{x}}\\bigr) =e^{\\,2\\sqrt{x}}\\frac{dy}{dx}+y\\,e^{\\,2\\sqrt{x}}\\frac{d}{dx}(2\\sqrt{x}) =e^{\\,2\\sqrt{x}}\\frac{dy}{dx}+y\\,e^{\\,2\\sqrt{x}}\\frac{1}{\\sqrt{x}}.$$ Hence $$\\frac{d}{dx}\\!\\bigl(y\\,e^{\\,2\\sqrt{x}}\\bigr)=e^{\\,x-2}.$$ Integrate both sides from $$0$$ to $$x$$: $$y\\,e^{\\,2\\sqrt{x}}-y(0)\\,e^{\\,2\\sqrt{0}} =\\int_{0}^{x}e^{\\,t-2}\\,dt.$$ Given $$y(0)=0$$ and $$e^{\\,2\\sqrt{0}}=1$$, so $$y\\,e^{\\,2\\sqrt{x}} =e^{-2}\\!\\int_{0}^{x}e^{\\,t}\\,dt =e^{-2}\\bigl(e^{\\,x}-1\\bigr).$$ Therefore $$y(x)=e^{-2\\sqrt{x}}\\;e^{-2}\\bigl(e^{\\,x}-1\\bigr) =e^{\\,x-2-2\\sqrt{x}}-e^{-2-2\\sqrt{x}}.$$ Value at $$x=1$$ For $$x=1$$, $$\\sqrt{1}=1$$, so $$y(1)=e^{\\,1-2-2}-e^{-2-2}=e^{-3}-e^{-4}.$$ Factor out $$e^{-4}$$: $$y(1)=e^{-4}\\bigl(e^{\\,1}-1\\bigr)=\\frac{e-1}{e^{4}}.$$ Thus $$y(1)=\\dfrac{e-1}{e^{4}}.$$ This matches Option C.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "The value of $$\\cot^{-1}\\left(\\frac{\\sqrt{1 + \\tan^2(2)} - 1}{\\tan(2)}\\right) - \\cot^{-1}\\left(\\frac{\\sqrt{1 + \\tan^2(\\frac{1}{2})} + 1}{\\tan(\\frac{1}{2})}\\right)$$ is equal to",
            "images": [],
            "options": [
              "A. $$\\pi - \\frac{5}{4}$$",
              "B. $$\\pi - \\frac{3}{2}$$",
              "C. $$\\pi + \\frac{3}{2}$$",
              "D. $$\\pi + \\frac{5}{2}$$"
            ],
            "correct_answer": "A",
            "explanation": "Write the required value as $$\\cot^{-1}\\!\\left(\\dfrac{\\sqrt{1+\\tan^{2}2}-1}{\\tan 2}\\right)\\;-\\;\\cot^{-1}\\!\\left(\\dfrac{\\sqrt{1+\\tan^{2}\\!\\left(\\dfrac12\\right)}+1}{\\tan\\dfrac12}\\right)$$ The standard identity is $$\\sqrt{1+\\tan^{2}\\theta}=|\\sec \\theta|$$. We must keep the modulus because $$\\sec\\theta$$ can be negative although the square root is always positive. Case 1: $$\\theta = 2 \\text{ rad}$$ (first inverse-cot term) Because $$\\cos2\\lt0$$, $$|\\sec2|=-\\sec2$$. Hence $$\\dfrac{\\sqrt{1+\\tan^{2}2}-1}{\\tan2}= \\dfrac{-\\sec2-1}{\\tan2}= -\\dfrac{\\sec2+1}{\\tan2}$$ Now use the algebraic simplification $$\\dfrac{\\sec x+1}{\\tan x}= \\dfrac{\\dfrac1{\\cos x}+1}{\\dfrac{\\sin x}{\\cos x}}= \\dfrac{1+\\cos x}{\\sin x}= \\dfrac{2\\cos^{2}\\dfrac x2}{2\\sin\\dfrac x2\\cos\\dfrac x2}= \\cot\\dfrac x2$$ Putting $$x=2$$ gives $$\\dfrac{\\sec2+1}{\\tan2}=\\cot1$$, so $$\\dfrac{\\sqrt{1+\\tan^{2}2}-1}{\\tan2}= -\\cot1 = \\cot\\!\\bigl(\\pi-1\\bigr)$$ (since $$\\cot(\\pi-\\alpha)=-\\cot\\alpha$$). The principal branch of $$\\cot^{-1}y$$ lies in $$(0,\\pi)$$ and is monotonic, therefore $$\\cot^{-1}\\!\\left(\\dfrac{\\sqrt{1+\\tan^{2}2}-1}{\\tan2}\\right)=\\cot^{-1}\\!\\bigl(\\cot(\\pi-1)\\bigr)=\\pi-1$$ Case 2: $$\\theta=\\dfrac12 \\text{ rad}$$ (second inverse-cot term) Here $$\\cos\\dfrac12\\gt0$$, so $$|\\sec\\dfrac12|=\\sec\\dfrac12$$. Thus $$\\dfrac{\\sqrt{1+\\tan^{2}\\dfrac12}+1}{\\tan\\dfrac12}= \\dfrac{\\sec\\dfrac12+1}{\\tan\\dfrac12}=\\cot\\dfrac14$$ Because $$0\\lt \\dfrac14\\lt \\dfrac\\pi2$$, the principal value is simply $$\\cot^{-1}\\!\\left(\\dfrac{\\sqrt{1+\\tan^{2}\\dfrac12}+1}{\\tan\\dfrac12}\\right)=\\cot^{-1}\\!\\bigl(\\cot\\dfrac14\\bigr)=\\dfrac14$$ Final value $$\\bigl(\\pi-1\\bigr)-\\dfrac14=\\pi-\\dfrac54$$ Therefore the required value equals $$\\pi-\\dfrac54$$, which corresponds to Option A.",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let $$A = \\begin{bmatrix} 2 & 2+p & 2+p+q \\\\ 4 & 6+2p & 8+3p+2q \\\\ 6 & 12+3p & 20+6p+3q \\end{bmatrix}$$. If $$\\det(\\text{adj}(\\text{adj}(3A))) = 2^m \\cdot 3^n$$, $$m, n \\in \\mathbb{N}$$, then $$m + n$$ is equal to",
            "images": [],
            "options": [
              "A. 22",
              "B. 24",
              "C. 26",
              "D. 20"
            ],
            "correct_answer": "B",
            "explanation": "We must evaluate $$\\det\\bigl(\\text{adj}\\bigl(\\text{adj}(3A)\\bigr)\\bigr)$$, where the given matrix is $$A=\\begin{bmatrix}2 & 2+p & 2+p+q\\\\ 4 & 6+2p & 8+3p+2q\\\\ 6 & 12+3p & 20+6p+3q\\end{bmatrix}.$$ Case 1 : Relating adjugates to determinants For any non-singular $$n\\times n$$ matrix $$M$$, two standard identities are $$\\det\\bigl(\\text{adj}(M)\\bigr)=(\\det M)^{\\,n-1}$$ $$\\text{adj}\\bigl(\\text{adj}(M)\\bigr)=(\\det M)^{\\,n-2}\\,M$$ for $$n\\gt1$$. Here $$n=3$$ and $$M=3A$$. Therefore $$\\text{adj}\\bigl(\\text{adj}(3A)\\bigr)=\\bigl(\\det(3A)\\bigr)^{\\,3-2}\\,(3A)=\\det(3A)\\,(3A).$$ Case 2 : Determinant of the obtained matrix Let $$B=\\det(3A)\\,(3A)$$. Since multiplying a $$3\\times3$$ matrix by a scalar $$c$$ multiplies its determinant by $$c^{\\,3}$$, we get $$\\det(B)=\\bigl(\\det(3A)\\bigr)^{3}\\,\\det(3A)=\\bigl(\\det(3A)\\bigr)^{4}.$$ Case 3 : Evaluating $$\\det(3A)$$ First compute $$\\det(A)$$. Apply the row operations $$R_2\\leftarrow R_2-2R_1$$ and $$R_3\\leftarrow R_3-3R_1$$: $$\\begin{bmatrix} 2 & 2+p & 2+p+q\\\\ 4 & 6+2p & 8+3p+2q\\\\ 6 & 12+3p & 20+6p+3q \\end{bmatrix} \\;\\longrightarrow\\; \\begin{bmatrix} 2 & 2+p & 2+p+q\\\\ 0 & 2 & 4+p\\\\ 0 & 6 & 14+3p \\end{bmatrix}.$$ Only elementary row replacements were used, so the determinant is unchanged. Expanding along the first column, $$\\det(A)=2\\begin{vmatrix}2 & 4+p\\\\ 6 & 14+3p\\end{vmatrix} =2\\bigl[(2)(14+3p)-(4+p)(6)\\bigr]$$ $$=2\\bigl[(28+6p)-(24+6p)\\bigr]=2\\,(4)=8.$$ Hence $$\\det(A)=8=2^{3}.$$ Now, $$\\det(3A)=3^{3}\\det(A)=27\\times8=216=2^{3}\\,3^{3}.$$ Case 4 : Final value of the required determinant Substituting $$\\det(3A)=2^{3}3^{3}$$ into Case 2 gives $$\\det\\bigl(\\text{adj}(\\text{adj}(3A))\\bigr)=\\bigl(2^{3}3^{3}\\bigr)^{4}=2^{12}\\,3^{12}.$$ Thus $$m=12,\\;n=12$$ and $$m+n=24.$$ The correct choice is Option B (24).",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Given below are two statements : Statement I : $$\\lim_{x \\to 0} \\left(\\frac{\\tan^{-1}x + \\log_{e}\\sqrt{\\frac{1+x}{1-x}} - 2x}{x^5}\\right) = \\frac{2}{5}$$ Statement II : $$\\lim_{x \\to 1} \\left(x^{\\frac{2}{1-x}}\\right) = \\frac{1}{e^2}$$ In the light of the above statements, choose the correct answer :",
            "images": [],
            "options": [
              "A. Statement I is false but Statement II is true",
              "B. Statement I is true but Statement II is false",
              "C. Both Statement I and Statement II are false",
              "D. Both Statement I and Statement II are true"
            ],
            "correct_answer": "D",
            "explanation": "",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "MCQ"
          },
          {
            "question_text": "Let the area of the bounded region $$\\{(x, y) : 0 \\le 9x \\le y^2, y \\ge 3x - 6\\}$$ be A. Then 6A is equal to _____.",
            "images": [],
            "options": [],
            "correct_answer": "15",
            "explanation": "Write the two inequalities separately. • From $$0 \\le 9x \\le y^{2}$$ we get $$x \\ge 0$$ and $$y^{2} \\ge 9x$$. • From $$y \\ge 3x-6$$ we have the straight line $$y = 3x-6$$ (the region is above this line). The parabola $$y^{2}=9x$$ can be written as two branches: Upper branch $$y = 3\\sqrt{x}$$, Lower branch $$y = -3\\sqrt{x}$$. The condition $$y^{2}\\ge 9x$$ means the point must lie outside the parabola, that is, either $$y \\ge 3\\sqrt{x}$$ or $$y \\le -3\\sqrt{x}$$. The extra condition $$y \\ge 3x-6$$ cuts away much of this unbounded region. Let us find where the lower branch $$y=-3\\sqrt{x}$$ meets the line $$y=3x-6$$: Set them equal: $$-3\\sqrt{x}=3x-6$$ $$\\Longrightarrow$$ divide by 3: $$-\\sqrt{x}=x-2$$. Put $$t=\\sqrt{x}\\; (t\\ge 0)$$, $$-t = t^{2}-2 \\quad\\Longrightarrow\\quad t^{2}+t-2=0$$. Solving, $$t=\\dfrac{-1+\\sqrt{1+8}}{2}=1 \\;(\\text{positive root})$$, so $$\\sqrt{x}=1 \\Longrightarrow x=1$$ and the common point is $$(1,-3).$$ Next, compare the two curves for $$0\\le x\\le 1$$. Take any $$x$$ in this interval (say $$x=0.25$$): • $$y=-3\\sqrt{0.25}=-3\\times 0.5=-1.5,$$ • $$y=3(0.25)-6=-5.25.$$ Thus $$-3\\sqrt{x} > 3x-6$$ in $$0\\le x\\le 1$$, so for these $$x$$ the region that satisfies $$y\\le -3\\sqrt{x}\\quad\\text{and}\\quad y\\ge 3x-6$$ lies between the two curves. For $$x\\gt 1$$ the inequality reverses, giving no overlap between $$y\\le -3\\sqrt{x}$$ and $$y\\ge 3x-6$$. Hence the only bounded part of the region is the strip $$0\\le x\\le 1,\\quad 3x-6\\le y\\le -3\\sqrt{x}.$$ Now compute its area $$A$$ by integrating with respect to $$x$$: $$ \\begin{aligned} A &= \\int_{0}^{1}\\Bigl[\\;y_{\\text{top}}-y_{\\text{bottom}}\\Bigr]\\,dx \\\\ &= \\int_{0}^{1}\\Bigl[\\,-3\\sqrt{x}\\;-\\;(3x-6)\\Bigr]\\,dx \\\\ &= \\int_{0}^{1}\\!\\bigl(-3x^{1/2}-3x+6\\bigr)\\,dx. \\end{aligned} $$ Integrate term by term: $$ \\begin{aligned} A &= \\left[-2x^{3/2}-\\dfrac{3}{2}x^{2}+6x\\right]_{0}^{1} \\\\ &= \\Bigl(-2(1)^{3/2}-\\dfrac{3}{2}(1)^{2}+6(1)\\Bigr) \\;-\\;\\Bigl(0+0+0\\Bigr) \\\\ &= \\bigl(-2 -1.5 +6\\bigr)=2.5=\\dfrac{5}{2}. \\end{aligned} $$ Finally, the question asks for $$6A$$: $$6A = 6 \\times \\dfrac{5}{2} = 15.$$ Therefore, $$6A = 15.$$",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "Let the domain of the function $$f(x) = \\cos^{-1}\\left(\\frac{4x+5}{3x-7}\\right)$$ be $$[\\alpha, \\beta]$$ and the domain of $$g(x) = \\log_2(2 - 6\\log_{27}(2x+5))$$ be $$(\\gamma, \\delta)$$. Then $$|7(\\alpha + \\beta) + 4(\\gamma + \\delta)|$$ is equal to _____.",
            "images": [],
            "options": [],
            "correct_answer": "96",
            "explanation": "",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "Let the area of the triangle formed by the lines $$x + 2 = y - 1 = z$$, $$\\frac{x-3}{5} = \\frac{y}{-1} = \\frac{z-1}{1}$$ and $$\\frac{x}{-3} = \\frac{y-3}{3} = \\frac{z-2}{1}$$ be A. Then $$A^2$$ is equal to _____.",
            "images": [],
            "options": [],
            "correct_answer": "56",
            "explanation": "",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "The product of the last two digits of $$(1919)^{1919}$$ is _____.",
            "images": [],
            "options": [],
            "correct_answer": "63",
            "explanation": "To obtain the product of the last two digits of $$(1919)^{1919}$$ we must first find those two digits, i.e. evaluate $$(1919)^{1919} \\pmod{100}$$. Step 1 : Reduce the base modulo 100 $$1919 \\equiv 19 \\pmod{100}$$ Hence $$ (1919)^{1919} \\equiv 19^{1919} \\pmod{100} $$. Step 2 : Reduce the exponent using Euler’s theorem Since $$\\gcd(19,100)=1$$, Euler’s theorem gives $$19^{\\phi(100)} \\equiv 1 \\pmod{100}$$. Factorising $$100 = 2^{2}\\cdot5^{2}$$, $$\\phi(100)=100\\left(1-\\frac{1}{2}\\right)\\left(1-\\frac{1}{5}\\right)=40$$. Therefore the powers of 19 repeat every 40: $$19^{40} \\equiv 1 \\pmod{100}$$. Now reduce the exponent 1919 modulo 40: $$1919 = 40\\times47 + 39 \\quad\\Longrightarrow\\quad 1919 \\equiv 39 \\pmod{40}$$. Thus $$19^{1919} \\equiv 19^{39} \\pmod{100} \\quad -(1)$$ Step 3 : Shorten the exponent further (optional but quicker) We shall show that $$19^{10} \\equiv 1 \\pmod{100}$$, which will cut the power down even more. Compute successive powers of 19 (always keeping only the last two digits): $$19^{1}=19$$ $$19^{2}=361\\equiv61$$ $$19^{3}=61\\cdot19=1159\\equiv59$$ $$19^{4}=59\\cdot19=1121\\equiv21$$ $$19^{5}=21\\cdot19=399\\equiv99$$ $$19^{6}=99\\cdot19=1881\\equiv81$$ $$19^{7}=81\\cdot19=1539\\equiv39$$ $$19^{8}=39\\cdot19=741\\equiv41$$ $$19^{9}=41\\cdot19=779\\equiv79$$ $$19^{10}=79\\cdot19=1501\\equiv01\\equiv1$$ Since $$19^{10}\\equiv1\\pmod{100}$$, rewrite the required power: $$19^{39}=19^{10\\cdot3}\\cdot19^{9}\\equiv(19^{10})^{3}\\cdot19^{9}\\equiv1^{3}\\cdot19^{9}\\equiv19^{9}\\pmod{100}$$. Step 4 : Evaluate $$19^{9}\\pmod{100}$$ (already calculated above) From the list, $$19^{9}\\equiv79\\pmod{100}$$. Hence the last two digits of $$(1919)^{1919}$$ are 7 and 9. Step 5 : Required product Product of the digits $$7 \\times 9 = 63$$. Final Answer : 63",
            "year": 2025,
            "marks": 4,
            "exam_type": "JEE Main",
            "question_type": "NAT"
          },
          {
            "question_text": "Let r be the radius of the circle, which touches the x-axis at point $$(a, 0)$$, $$a < 0$$ and the parabola $$y^2 = 9x$$ at the point $$(4, 6)$$. Then r is equal to _____.",
            "images": [],
            "options": [],
            "correct_answer": "30",
            "explanation": "The circle is tangent to the x-axis at the point $$\\left(a,0\\right)$$ with $$a \\lt 0$$. If a circle touches the x-axis, its centre must be exactly $$r$$ units above the point of contact. Hence the centre of the required circle is $$C\\left(a,r\\right)$$ and its radius is $$r$$. The circle is also tangent to the parabola $$y^{2}=9x$$ at the point $$P(4,6)$$. Therefore two conditions hold: 1. CP = r (distance condition) 2. CP is perpendicular to the tangent to the parabola at P (normal condition) Step 1: Distance condition The distance CP is $$CP=\\sqrt{(4-a)^{2}+(6-r)^{2}}$$ Since CP = r, we get $$(4-a)^{2}+(6-r)^{2}=r^{2} \\qquad -(1)$$ Step 2: Normal condition For the parabola $$y^{2}=9x$$, differentiate: $$2y\\,\\frac{dy}{dx}=9 \\;\\;\\Rightarrow\\;\\; \\frac{dy}{dx}=\\frac{9}{2y}$$ At P(4,6): $$m_{\\text{tangent}} = \\frac{9}{2\\cdot6} = \\frac{3}{4}$$ Hence the slope of the normal is the negative reciprocal: $$m_{\\text{normal}} = -\\frac{4}{3}$$ Equation of the normal through P: $$y-6 = -\\frac{4}{3}\\,(x-4)$$ Since C(a,r) lies on this normal, substitute: $$r-6 = -\\frac{4}{3}\\,(a-4)$$ Solve for r: $$r = 6 - \\frac{4}{3}(a-4)=6-\\frac{4a}{3}+\\frac{16}{3} = \\frac{18}{3}+\\frac{16}{3}-\\frac{4a}{3} = \\frac{34-4a}{3} \\qquad -(2)$$ Step 3: Substitute into the distance equation First compute $$6-r$$ using (2): $$6-r = 6-\\left(\\frac{34-4a}{3}\\right) = \\frac{18}{3}-\\frac{34-4a}{3} = \\frac{18-34+4a}{3} = \\frac{4a-16}{3} = \\frac{4(a-4)}{3}$$ Put this in equation (1): $$(4-a)^{2} + \\left(\\frac{4(a-4)}{3}\\right)^{2} = \\left(\\frac{34-4a}{3}\\right)^{2}$$ Multiply by 9 to clear denominators: $$9(4-a)^{2} + 16(a-4)^{2} = (4a-34)^{2}$$ Because $$(a-4)^{2}=(4-a)^{2}$$, set $$s=(4-a)^{2}$$. Then $$9s + 16s = 25s = (4a-34)^{2}$$ Step 4: Solve for a Take square roots (all quantities are non-negative): $$5|4-a| = |4a-34|$$ Since $$a \\lt 0$$, $$4-a \\gt 0$$ and $$4a-34 \\lt 0$$, so $$5(4-a) = -(4a-34) = 34-4a$$ $$20 - 5a = 34 - 4a$$ $$-a = 14 \\quad\\Longrightarrow\\quad a = -14$$ Step 5: Find r Insert $$a=-14$$ into (2): $$r = \\frac{34 - 4(-14)}{3} = \\frac{34 + 56}{3} = \\frac{90}{3} = 30$$ Hence the required radius is $$\\mathbf{30}$$.",
            "year": 2025,
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
    title: 'JEE Advanced 2025 Paper 1',
    exam_type: 'JEE_ADVANCED',
    branch: null,
    sections: [
      { name: 'Physics', questions: [ /* paste here */] },
      { name: 'Chemistry', questions: [ /* paste here */] },
      { name: 'Mathematics', questions: [ /* paste here */] },
    ],
  },

  /* ──────────────────────────────────────────────────────────
     GATE CSE 2025
     General Aptitude: 10 Qs (5×1M + 5×2M)
     CSE:              55 Qs (25×1M + 30×2M)
     Total: 65 Qs, 100 marks, 3h
  ────────────────────────────────────────────────────────── */
  {
    title: 'GATE CSE 2025',
    exam_type: 'GATE',
    branch: 'CSE',
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
  const optionalQs = questions.slice(mandatoryCount);
  const avgOptMark = optionalQs.length > 0
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

  // Pre-populate numberTracker from DB so individual seeds get the correct next number
  const numberTracker = new Map<string, number>();
  const existingMaxes = await prisma.mockTestTemplate.groupBy({
    by: ['exam_type', 'branch'],
    where: { mode: 'seeded' },
    _max: { mock_number: true },
  });
  for (const row of existingMaxes) {
    const key = `${row.exam_type}::${row.branch ?? '-'}`;
    numberTracker.set(key, row._max.mock_number ?? 0);
  }

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
    // mockNumber is only used for new papers; existing papers keep their DB value
    const mockNumber = (numberTracker.get(examKey) ?? 0) + 1;

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
          id: randomUUID(),
          source: 'template',
          sectionIndex: si,
          sectionName: sec.name,
          isOptional: optional,
          question_text: q.question_text,
          options: q.options,
          question_type: q.question_type,
          marks: q.marks,
          year: q.year,
          subject: sec.name,
          images: q.images ?? [],
          // kept server-side for grading; stripped before sending to client
          correct_answer: q.correct_answer,
          explanation: q.explanation,
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
        title: paper.title,
        exam_type: paper.exam_type,
        branch: paper.branch,
        mode: 'seeded',
      },
      select: { id: true, mock_number: true },
    });

    if (existing) {
      // Keep existing mock_number — don't overwrite it (use renumber_mocks.ts to renumber)
      const existingMockNumber = existing.mock_number;
      // Keep tracker in sync so future papers in this run get the right next number
      const examKey = `${paper.exam_type}::${paper.branch ?? '-'}`;
      if (existingMockNumber > (numberTracker.get(examKey) ?? 0)) {
        numberTracker.set(examKey, existingMockNumber);
      }
      await prisma.mockTestTemplate.update({
        where: { id: existing.id },
        data: {
          total_questions: allQuestions.length,
          max_score: maxScore,
          duration_secs: config.durationSecs,
          sections: config.sections as any,
          questions: allQuestions,
        },
      });
      console.log(`${c.yellow}↩  Updated "${paper.title}"${c.reset}  (${allQuestions.length} Qs, mock #${existingMockNumber})`);
      updatedPapers++;
    } else {
      await prisma.mockTestTemplate.create({
        data: {
          exam_type: paper.exam_type,
          branch: paper.branch,
          mode: 'seeded',
          mock_number: mockNumber,
          title: paper.title,
          subjects: paper.sections.map((s) => s.name),
          total_questions: allQuestions.length,
          max_score: maxScore,
          duration_secs: config.durationSecs,
          sections: config.sections as any,
          questions: allQuestions,
        },
      });
      numberTracker.set(examKey, mockNumber);
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
