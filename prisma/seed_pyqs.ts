import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📜 Seeding Previous Year Questions (PYQs)...');
  const pyqData = [
    {
      "pattern": {
        "exam_type": "GATE",
        "branch": "ECE",
        "topic_name": "Waveguides"
      },
      "pyqs": [
        {
          "topic_name": "Waveguides",
          "question_text": "Consider an air filled rectangular waveguide with a cross-section of 5 c m × 3 c m . For this waveguide, the cut-off frequency (in MHz) of T E 21 mode is __________________",
          "images": [],
          "options": [
            "A. The T M 10 mode of the waveguide does not exist",
            "B. The T E 10 mode of the waveguide does not exist",
            "C. The T M 10 and the T E 10 modes both exist and have the same cut-off frequencies",
            "D. The T M 10 and the T M 01 modes both exist and have the same cut-off frequencies."
          ],
          "correct_answer": "11.7",
          "explanation": "Correct answer is 11.7",
          "year": 2014,
          "marks": 1,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "A waveguide consists of two infinite parallel plates (perfect conductors) at a separation of 10 − 4 cm, with air as the dielectric. Assume the speed of light in air to be 3 × 10 8 m/s. The frequency/frequencies of TM waves which can propagate in this waveguide is/are ___________.",
          "images": [],
          "options": [
            "A. 6 × 10 15 Hz",
            "B. 0.5 × 10 12 Hz",
            "C. 8 × 10 14 Hz",
            "D. 1 × 10 13 Hz"
          ],
          "correct_answer": "C",
          "explanation": "Let's determine the possible frequencies of Transverse Magnetic (TM) waves that can propagate in this waveguide. Given the separation d = 10 − 4 cm (which is d = 10 − 6 meters) and the speed of light in air c = 3 × 10 8 m/s, we need to find the cutoff frequencies for TM modes. For TM modes, the cutoff frequency f c is given by: f c = m c 2 d where m is the mode number (a positive integer), c is the speed of light in air, and d is the separation between the plates. First, let's calculate the cutoff frequency for the lowest TM mode (m = 1): f c 1 = 1 × 3 × 10 8 m/s 2 × 10 − 6 m = 3 × 10 8 m/s 2 × 10 − 6 m = 3 × 10 8 2 × 10 − 6 Therefore, f c 1 = 1.5 × 10 14 Hz This is the cutoff frequency for the first TM mode. Since TM waves can propagate only above this cutoff frequency, we need to consider the given options: Option A: 6 × 10 15 Hz Option B: 0.5 × 10 12 Hz Option C: 8 × 10 14 Hz Option D: 1 × 10 13 Hz Any frequency greater than 1.5 × 10 14 Hz can propagate as a TM mode in the waveguide. Thus, the correct option(s) are: Option A: 6 × 10 15 Hz Option C: 8 × 10 14 Hz",
          "year": 2022,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "The modes in a rectangular waveguide are denoted by T E m n / T M m n where m and n are the eigen numbers along the larger and smaller dimensions of the waveguide respectively. Which one of the following satements is TRUE?",
          "images": [],
          "options": [
            "A. The T M 10 mode of the waveguide does not exist",
            "B. The T E 10 mode of the waveguide does not exist",
            "C. The T M 10 and the T E 10 modes both exist and have the same cut-off frequencies",
            "D. The T M 10 and the T M 01 modes both exist and have the same cut-off frequencies."
          ],
          "correct_answer": "A",
          "explanation": "Currently no explanation available",
          "year": 2011,
          "marks": 1,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "Which of the following statements is true regarding the fundamental mode of the metallic waveguides shown?",
          "images": [
            {
              "index": 1,
              "filename": "which-of-the-followi_img1.jpg"
            }
          ],
          "options": [
            "A. Only P has no cutoff- frequency",
            "B. Only Q has no cutoff-frequency",
            "C. Only R has no cutoff-frequency",
            "D. All three have cutoff-frequencies"
          ],
          "correct_answer": "A",
          "explanation": "Currently no explanation available",
          "year": 2009,
          "marks": 1,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "The phase velocity of an electromagnetic wave propagating in a hollow metallic rectangular waveguide in the T E 10 mode is",
          "images": [],
          "options": [
            "A. equal to its group velocity",
            "B. less than the velocity of light in free space",
            "C. equal to the velocity of light in free space",
            "D. greater than the velocity of light in free space"
          ],
          "correct_answer": "D",
          "explanation": "Currently no explanation available",
          "year": 2004,
          "marks": 1,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "The phase velocity for the T E 10 mode in an air-filled rectangular waveguide is",
          "images": [],
          "options": [
            "A. less than c",
            "B. equal to c",
            "C. greater than c",
            "D. none of the above"
          ],
          "correct_answer": "C",
          "explanation": "Currently no explanation available",
          "year": 2002,
          "marks": 1,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "The phase velocity of waves propagating in a hollow metal waveguide is",
          "images": [],
          "options": [
            "A. greater than the velocity of light in free space",
            "B. less than the velocity of light in free space",
            "C. equal to the velocity of light in free space",
            "D. equal to the group velocity"
          ],
          "correct_answer": "A",
          "explanation": "Currently no explanation available",
          "year": 2001,
          "marks": 1,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "The dominant mode in a rectangular waveguide is T E 10 , because this mode has",
          "images": [],
          "options": [
            "A. no attenuation",
            "B. no cut-off",
            "C. no magnetic field component",
            "D. the highest cut-off wavelength"
          ],
          "correct_answer": "D",
          "explanation": "Currently no explanation available",
          "year": 2001,
          "marks": 1,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "Indicate which one of the following modes do NOT exist in a rectangular resonant cavity.",
          "images": [],
          "options": [
            "A. T E 110",
            "B. T E 011",
            "C. T M 110",
            "D. T M 111"
          ],
          "correct_answer": "A",
          "explanation": "Currently no explanation available",
          "year": 1999,
          "marks": 1,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "A rectangular air-filled waveguide has a cross section of 4 c m × 10 c m . The minimum frequency which can propagate in the waveguide is",
          "images": [],
          "options": [
            "A. 1.5 GHz",
            "B. 2.0 GHz",
            "C. 2.5 GHz",
            "D. 3.0 GHz"
          ],
          "correct_answer": "A",
          "explanation": "Currently no explanation available",
          "year": 1997,
          "marks": 1,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "The interior of a 20 3 c m × 20 4 c m rectangular waveguide is completely filled with a dielectric of ∈ r = 4 . Waves of free space wave-lengths shorter than .........can be propagated in the T E 11 mode.",
          "images": [],
          "options": [],
          "correct_answer": "8",
          "explanation": "Correct answer is 8 cm",
          "year": 1994,
          "marks": 1,
          "exam_type": "GATE ECE",
          "question_type": "NAT"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "A standard air-filled rectangular waveguide with dimensions a = 8 cm , b = 4 cm , operates at 3.4 GHz . For the dominant mode of wave propagation, the phase velocity of the signal is v p . The value (rounded off to two decimal places) of v p / c , where c denotes the velocity of light, is _ _ _ _ .",
          "images": [],
          "options": [
            "A. 8.19 G H z ≤ f ≤ 13.1 G H z",
            "B. 8.19 G H z ≤ f ≤ 12.45 G H z",
            "C. 6.55 G H z ≤ f ≤ 13.1 G H z",
            "D. 1.64 G H z ≤ f ≤ 10.24 G H z"
          ],
          "correct_answer": "1.15",
          "explanation": "Correct answer is 1.15 to 1.20",
          "year": 2021,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "Standard air filled rectangular waveguides of dimensions a = 2.29cm and b = 1.02cm are designed for radar applications. It is desired that these waveguides operate only in the dominant T E 10 mode with the operating frequency at least 25% above the cut-off frequency of the T E 10 mode but not higher than 95% of the next higher cutoff frequency. The range of the allowable operating frequency f is",
          "images": [],
          "options": [
            "A. 8.19 G H z ≤ f ≤ 13.1 G H z",
            "B. 8.19 G H z ≤ f ≤ 12.45 G H z",
            "C. 6.55 G H z ≤ f ≤ 13.1 G H z",
            "D. 1.64 G H z ≤ f ≤ 10.24 G H z"
          ],
          "correct_answer": "B",
          "explanation": "Currently no explanation available",
          "year": 2017,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "Consider an air-filled rectangular waveguide with dimensions a = 2.286cm and b = 1.016cm. At 10GHz operating frequency, the value of the propagation constant (per meter) of the corresponding propagation mode is _____________________",
          "images": [],
          "options": [
            "A. T E 01 < T E 10 < T E 11 < T E 20",
            "B. T E 20 < T E 11 < T E 10 < T E 01",
            "C. T E 10 < T E 20 < T E 01 < T E 11",
            "D. T E 10 < T E 11 < T E 20 < T E 01"
          ],
          "correct_answer": "158",
          "explanation": "Correct answer is 158",
          "year": 2016,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "Consider an air-filled rectangular waveguide with dimensions a = 2.286 cm and b = 1.016 cm. The increasing order of the cut-off frequencies for different modes is",
          "images": [],
          "options": [
            "A. T E 01 < T E 10 < T E 11 < T E 20",
            "B. T E 20 < T E 11 < T E 10 < T E 01",
            "C. T E 10 < T E 20 < T E 01 < T E 11",
            "D. T E 10 < T E 11 < T E 20 < T E 01"
          ],
          "correct_answer": "C",
          "explanation": "Currently no explanation available",
          "year": 2016,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "The longitudinal component of the magnetic field inside an air-filled rectangular waveguide made of a perfect electric conductor is given by the following expression H z ( x , y , z , t ) = 0.1 cos ( 25 π x ) cos ( 30.3 π y ) cos ( 12 π × 10 9 t − β z ) ( A / m ) The cross-sectional dimemsions of the waveguide are given as a = 0.08 m and b = 0.033 m. The mode of propagation inside the waveguide is",
          "images": [],
          "options": [
            "A. T M 12",
            "B. T M 21",
            "C. T E 21",
            "D. T E 12"
          ],
          "correct_answer": "C",
          "explanation": "Currently no explanation available",
          "year": 2015,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "An air-filled rectangular waveguide of internal dimension a c m × b c m (a > b) has a cutoff frequency of 6 GHz for the dominant T E 10 mode. For the same waveguide, if the cutoff frequency of the T E 11 mode is 15 GHz, the cutoff frequency of the T E 01 mode in GHz is _____________",
          "images": [],
          "options": [
            "A. V p > c",
            "B. V p = c",
            "C. 0 < V p < c",
            "D. V p = 0"
          ],
          "correct_answer": "13.75",
          "explanation": "Correct answer is 13.75",
          "year": 2015,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "For a rectangular waveguide of internal dimensions a × b (a > b), the cut-off frequency for the T E 11 mode is the arithmetic mean of the cut-off frequencies for T E 10 mode and T E 20 mode. If a = 5 c m , the value of b (in cm) is",
          "images": [],
          "options": [
            "A. V p > c",
            "B. V p = c",
            "C. 0 < V p < c",
            "D. V p = 0"
          ],
          "correct_answer": "2",
          "explanation": "Correct answer is 2",
          "year": 2014,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "The magnetic field along the propagation direction inside a rectangular waveguide with the cross section shown in the figure is H Z = 3 cos ( 2.094 × 10 2 x ) cos ( 2.618 × 10 2 y ) cos ( 6.283 × 10 10 t − β z ) The phase velocity V p of the wave inside the waveguide satisfies",
          "images": [
            {
              "index": 1,
              "filename": "the-magnetic-field-a_img1.jpg"
            }
          ],
          "options": [
            "A. V p > c",
            "B. V p = c",
            "C. 0 < V p < c",
            "D. V p = 0"
          ],
          "correct_answer": "D",
          "explanation": "Currently no explanation available",
          "year": 2012,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "A rectangular waveguide of internal dimensions (a = 4 cm and b = 3 cm ) is to be operated in T E 11 mode. The minimum operating frequency is",
          "images": [],
          "options": [
            "A. 6.25 GHz",
            "B. 6.0 GHz",
            "C. 5.0 GHz",
            "D. 3.75 GHz"
          ],
          "correct_answer": "A",
          "explanation": "Currently no explanation available",
          "year": 2008,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "The E → field in a rectangular waveguide of inner dimensions a × b is given by E → = ω μ h 2 ( π a ) H 0 sin ( 2 π x a ) sin ( ω t − β z ) y ^ , where H 0 is a constant, a and b are the dimensions along the x-axis and the y-axis respectively. The mode of propagation in the waveguide is",
          "images": [],
          "options": [
            "A. T E 20",
            "B. T M 11",
            "C. T M 20",
            "D. T E 10"
          ],
          "correct_answer": "A",
          "explanation": "Currently no explanation available",
          "year": 2007,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "An air-filled rectangular waveguide has inner dimensions of 3 c m × 2 c m . The wave impedance of the T E 20 mode of propagation in the waveguide at a frequency of 30 GHz is (free space impedance η 0 = 377 Ω )",
          "images": [],
          "options": [
            "A. 308 Ω",
            "B. 355 Ω",
            "C. 400 Ω",
            "D. 461 Ω"
          ],
          "correct_answer": "C",
          "explanation": "Currently no explanation available",
          "year": 2007,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "A rectangular waveguide having T E 10 mode as dominant mode is having a cutoff frequency of 18 GHz for the T E 30 mode. The inner broad-wall dimension of the rectangular waveguide is",
          "images": [],
          "options": [
            "A. 5/3 cms",
            "B. 5 cms",
            "C. 5/2 cms",
            "D. 10 cms"
          ],
          "correct_answer": "C",
          "explanation": "Currently no explanation available",
          "year": 2006,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "Which one of the following does represent the electric field lines for the T E 02 mode in the cross-section of a hollow rectangular metallic waveguide?",
          "images": [],
          "options": [],
          "correct_answer": "",
          "explanation": "",
          "year": 2005,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "NAT"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "A rectangular metal wave guide filled with a dielectric material of relative permittivity ε r = 4 has the inside dimensions 3.0 c m × 1.2 c m . The cut-off frequency for the dominant mode is",
          "images": [],
          "options": [
            "A. 2.5 GHz",
            "B. 5.0 GHz",
            "C. 10.0 GHz",
            "D. 12.5 GHz"
          ],
          "correct_answer": "A",
          "explanation": "Currently no explanation available",
          "year": 2003,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "A rectangular waveguide has dimensions 1 c m × 0.5 c m . Its cut-off frequency is",
          "images": [],
          "options": [
            "A. 5 GHz",
            "B. 10 GHz",
            "C. 15 GHz",
            "D. 20 GHz"
          ],
          "correct_answer": "C",
          "explanation": "Currently no explanation available",
          "year": 2000,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "An optical fiber consists of a cylindrical dielectric rod of refractive index n 1 , surrounded by another dielectric of refractive index n 2 where n 2 < n 1 as shown in the following Fig. If a ray is incident from air at angle i to the axis, then it undergoes total internal reflection at the interface AB if",
          "images": [
            {
              "index": 1,
              "filename": "an-optical-fiber-con_img1.jpg"
            }
          ],
          "options": [
            "A. i ≥ sin − 1 n 1 2 − n 2 2",
            "B. i < sin − 1 n 1 − n 2",
            "C. i ≤ sin − 1 n 1 2 − n 2 2",
            "D. i = sin − 1 n 1 − n 2"
          ],
          "correct_answer": "C",
          "explanation": "Currently no explanation available",
          "year": 1993,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "Choose the correct statements. For a wave propagating in an air filled rectangular wave guide",
          "images": [],
          "options": [
            "A. Guided wavelength is never less than the free space wavelength",
            "B. Wave impedance is never less than the free space impedance.",
            "C. Phase velocity is never less than the free space velocity",
            "D. TEM mode is possible if the dimensions of the wave guide are properly chosen."
          ],
          "correct_answer": "C",
          "explanation": "Currently no explanation available",
          "year": 1990,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "For a normal mode EM wave propagating in a hollow rectangular wave guide",
          "images": [],
          "options": [
            "A. the phase velocity is greater than the group velocity",
            "B. the phase velocity is greater than velocity of light in free space",
            "C. the phase velocity is less than the velocity of light in free space",
            "D. the phase velocity may be either greater than or less than the group velocity"
          ],
          "correct_answer": "B",
          "explanation": "Currently no explanation available",
          "year": 1988,
          "marks": 2,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Waveguides",
          "question_text": "The cut-off frequency of a waveguide depends upon",
          "images": [],
          "options": [
            "A. The dimensions of the waveguide",
            "B. The dielectric property of the medium in the waveguide",
            "C. The characteristic impedance of the waveguide",
            "D. The transverse and axial components of the fields"
          ],
          "correct_answer": "B",
          "explanation": "Currently no explanation available",
          "year": 1987,
          "marks": 0,
          "exam_type": "GATE ECE",
          "question_type": "MCQ"
        }
      ]
    }
  ];

  const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
  };

  console.log(`\n${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(` ${colors.bright}🎓 PATTERNMASTER PYQ SEEDER v2.4 (Local Images & Cleanup) ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`);

  const totalPatterns = pyqData.length;
  let processedPatterns = 0;
  let totalQuestions = 0;
  let skippedPatterns = 0;
  let errors = 0;

  for (const item of pyqData) {
    processedPatterns++;
    const progress = `[${processedPatterns}/${totalPatterns}]`;

    // Check if pattern exists, create if not (or just find)
    let pattern = await prisma.pattern.findUnique({
      where: {
        pattern_identifier: {
          exam_type: item.pattern.exam_type,
          branch: item.pattern.branch,
          topic_name: item.pattern.topic_name,
        },
      },
    });

    if (!pattern) {
      console.log(`${colors.yellow}⚠️  ${progress} Pattern not found, creating: ${item.pattern.topic_name}${colors.reset}`);
      pattern = await prisma.pattern.create({
        data: {
          topic_name: item.pattern.topic_name,
          subject: (item.pattern as any).subject || "General",
          exam_type: item.pattern.exam_type,
          branch: item.pattern.branch,
          atomic_logic: `Practice problems for ${item.pattern.topic_name}`
        }
      });
    }

    try {
      let count = 0;
      for (const pyq of item.pyqs as any[]) {
        // Data Cleaning: Remove scraper noise
        const cleanQuestionText = pyq.question_text
          .replace(/0 reply\s*Please log in or register to add a comment\./gi, '')
          .replace(/0 reply/gi, '')
          .replace(/🚩 Edit necessary \| 👮 Rhino \| 💬 “[^”]*”/gi, '')
          .trim();

        // Image Transformation: Convert filename to url
        const cleanImages = pyq.images?.map((img: any) => ({
          ...img,
          url: img.filename ? `/${img.filename}` : img.url
        }));

        await prisma.pYQ.upsert({
          where: {
            pyq_identifier: {
              pattern_id: pattern.id,
              question_text: cleanQuestionText,
            },
          },
          update: {
            options: pyq.options,
            correct_answer: pyq.correct_answer,
            explanation: pyq.explanation,
            year: pyq.year || Math.floor(Math.random() * 26) + 2000,
            exam_type: item.pattern.exam_type,
            question_type: pyq.question_type,
            images: cleanImages,
          },
          create: {
            pattern: { connect: { id: pattern.id } },
            question_text: cleanQuestionText,
            options: pyq.options,
            correct_answer: pyq.correct_answer,
            explanation: pyq.explanation,
            year: pyq.year || Math.floor(Math.random() * 26) + 2000,
            exam_type: item.pattern.exam_type,
            question_type: pyq.question_type,
            images: cleanImages,
          },
        });
        count++;
        totalQuestions++;
      }
      console.log(`${colors.green}✅ ${progress} Seeded ${colors.bright}${count}${colors.reset}${colors.green} PYQs for: ${colors.bright}${pattern.topic_name}${colors.reset}`);
    } catch (err: any) {
      console.log(`${colors.red}❌ ${progress} Error seeding ${item.pattern.topic_name}${colors.reset}`);
      console.error(err.message);
      errors++;
    }
  }

  console.log(`\n${colors.bright}${colors.green}✨ Seeding Complete!${colors.reset}`);
  console.log(`${colors.cyan}Total Questions: ${colors.bright}${totalQuestions}${colors.reset}`);
  if (errors > 0) console.log(`${colors.red}Errors Detected: ${colors.bright}${errors}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`);
}

main()
  .catch((e) => {
    console.error('💥 FATAL ERROR SEEDING PYQs:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
