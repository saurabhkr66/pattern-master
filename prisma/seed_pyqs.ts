import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📜 Seeding Previous Year Questions (PYQs)...');
  const pyqData = [
   
    {
      "pattern": {
        "exam_type": "GATE",
        "branch": "ECE",
        
        "topic_name": "Basics of Electromagnetics"
      },
      "pyqs": [
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "An electric field of $0.01 \\mathrm{~V} / \\mathrm{m}$ is applied along the length of a copper wire of circular cross-section with diameter 1 mm . Copper has a conductivity of $5.8 \\times 10^{7} \\mathrm{~S} / \\mathrm{m}$ . The current (in Amperes, rounded off to two decimal places) flowing through the wire is __________ .",
          "images": [],
          "options": [
            "A. 0.46",
            "B. 1.82",
            "C. 0.58",
            "D. 1.12"
          ],
          "correct_answer": "A",
          "explanation": "$\\mathrm{J}=\\sigma \\mathrm{E}=0.01 \\times 5.8 \\times 10^{7}$ Current, $\\begin{aligned} I &=J \\pi r^{2} \\\\ & =0.01 \\times 5.8 \\times 10^{7} \\times \\pi \\times\\left(0.5 \\times 10^{-3}\\right)^{2} \\\\ & =0.045 \\times 10^{7} \\times 10^{-6}=0.46 \\mathrm{~A} \\end{aligned}$",
          "year": 2025,
          "marks": 2,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "A square metal sheet of $4 \\mathrm{~m} \\times 4 \\mathrm{~m}$ is placed on the $x-y$ plane as shown in the figure below. If the surface charge density (in $\\mu \\mathrm{C} / \\mathrm{m}^{2}$ ) on the sheet is $\\rho_{\\mathrm{s}}(\\mathrm{x}, \\mathrm{y})=4|\\mathrm{y}|$ , then the total charge (in $\\mu \\mathrm{C}$ , rounded off to the nearest integer) on the sheet is __________ .",
          "images": [
            {
              "index": 1,
              "filename": "Electromagnetics/a-square-metal-sheet-of-4-mathrmm-t_img1.webp"
            }
          ],
          "options": [
            "A. 16",
            "B. 85",
            "C. 64",
            "D. 256"
          ],
          "correct_answer": "C",
          "explanation": "$\\begin{aligned} \\mathrm{Q} &=\\iint 4|\\mathrm{y}| \\mathrm{dx} \\mathrm{dy}=4 \\iint 4 \\mathrm{ydx} \\mathrm{dy} \\\\ & =16 \\int \\mathrm{dx} \\int \\mathrm{ydy}=16[\\mathrm{x}]_{0}^{2}\\left[\\frac{\\mathrm{y}^{2}}{2}\\right]_{0}^{2} \\\\ & =16 \\times 2 \\times \\frac{2^{2}}{2}=16 \\times 4=64 \\mu \\mathrm{C} \\end{aligned}$",
          "year": 2025,
          "marks": 2,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "Let $\\hat{i}$ and $\\hat{j}$ be the unit vectors along $x$ and $y$ axes, respectively and let $A$ be a positive constant. Which one of the following statements is true for the vector fields $\\vec{F}_{1}=A(\\hat{i} y+\\hat{j} x)$ and $\\vec{F}_{2}=A(\\hat{i} y-\\hat{j} x) ?$",
          "images": [],
          "options": [
            "A. Both $\\vec{F}_{1}$ and $\\vec{F}_{2}$ are electrostatic fields.",
            "B. Only $\\vec{F}_{1}$ is an electrostatic field.",
            "C. Only $\\vec{F}_{2}$ is an electrostatic field.",
            "D. Neither $\\vec{F}_{1}$ nor $\\vec{F}_{2}$ is an electrostatic field."
          ],
          "correct_answer": "B",
          "explanation": "For an electrostatic field, $\\nabla \\times \\bar{F}=0$ $\\begin{aligned} & \\bar{F}_{1}=A[y \\hat{i}+x \\hat{j}] \\\\ & \\Rightarrow \\\\ & \\Delta \\times \\bar{F}_{1}=A\\left|\\begin{array}{ccc} \\hat{i} & \\hat{j} & \\hat{k} \\\\ \\partial / \\partial x & \\partial / \\partial y & \\partial / \\partial z \\\\ y & x & 0 \\end{array}\\right| \\\\ & =A[0 \\hat{i}-0 \\hat{j}+(1-1) \\hat{k}] \\\\ & =0 \\\\ & \\bar{F}_{2}=A[y \\hat{i}-x \\hat{j}] \\\\ & \\Rightarrow \\\\ & \\Delta \\times \\bar{F}_{2}=A\\left|\\begin{array}{ccc} \\hat{i} & \\hat{j} & \\hat{k} \\\\ \\partial / \\partial x & \\partial / \\partial y & \\partial / \\partial z \\\\ y & -x & 0 \\end{array}\\right| \\\\ & =A[0 \\hat{i}-0 \\hat{j}+(-1-1) \\hat{k}] \\\\ & =-2 A \\hat{k} \\end{aligned}$ Hence, $\\bar{F}_{1}$ is electrostatic, $\\bar{F}_{2}$ is not electrostatic.",
          "year": 2024,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "A transparent dielectric coating is applied to glass $\\left(\\epsilon_{r}=4, \\mu_{r}=1\\right)$ to eliminate the reflection of red light $\\left(\\lambda_{0}=0.75 \\mu \\mathrm{m}\\right)$ . The minimum thickness of the dielectric coating, in $\\mu \\mathrm{m}$ , that can be used is ____ (rounded off to two decimal places).",
          "images": [
            {
              "index": 1,
              "filename": "Electromagnetics/a-transparent-dielectric-coating-is_exp_img1.jpg",
              "type": "explanation"
            }
          ],
          "options": [],
          "correct_answer": "0.12 to 0.14",
          "explanation": "For no reflection, impedance must be matched. Hence, $\\eta_{2}$ acts like a quarter wave impedance transformer. So, $(i) \\quad \\eta_{2}=\\sqrt{\\eta_{1} \\cdot \\eta_{3}} \\Rightarrow \\epsilon_{r_{2}}=\\sqrt{\\epsilon_{r_{1}} \\cdot \\epsilon_{r_{3}}} \\Rightarrow \\epsilon_{r_{2}}=2$ (ii) For impedance matching, $\\begin{aligned} & d=(2 n+1) \\frac{\\lambda}{4} ; n=0,1,2 \\ldots \\\\ & \\lambda=\\frac{\\lambda_{0}}{\\sqrt{\\epsilon_{r}}}=\\frac{\\lambda_{0}}{\\sqrt{\\epsilon_{r_{2}}}} \\\\ Here \\;\\;& \\lambda=\\frac{0.75 \\times 10^{-6}}{\\sqrt{2}}=0.53 \\times 10^{-6} \\end{aligned}$ Hence, for minimum distance, $n=0$ So, $d=\\frac{\\lambda}{4}=\\frac{0.53 \\times 10^{-6}}{4}=0.133 \\mu \\mathrm{m}$",
          "year": 2023,
          "marks": 2,
          "exam_type": "GATE EC",
          "question_type": "NAT"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "In an electrostatic field, the electric displacement density vector, $\\vec{D}$ , is given by $\\vec{D}(x,y,z)=(x^3\\vec{i}+y^3\\vec{j}+xy^2\\vec{k})C/m^2$ , where $\\vec{i},\\vec{j},\\vec{k}$ are the unit vectors along x-axis, y-axis, and z-axis, respectively. Consider a cubical region R centered at the origin with each side of length 1 m, and vertices at ( $\\pm 0.5 m, \\pm 0.5 m, \\pm 0.5 m$ ). The electric charge enclosed within R is _________ C (rounded off to two decimal places).",
          "images": [],
          "options": [],
          "correct_answer": "0.48 to 0.52",
          "explanation": "$\\vec{D}(x,y,z)=(x^3\\vec{i}+y^3\\vec{j}+xy^2\\vec{k})c/m^2$ $Q_{enc.}=\\int _v \\rho _v\\cdot dV=\\int (\\triangledown \\cdot \\vec{D})dV$ $\\triangledown \\cdot \\vec{D}=3x^2+3y^2$ $dV=dxdydz$ $\\therefore \\; Q_{enc.}=\\int _v 3(x^2+y^2)dxdydz =3\\left [ \\int_{-0.5}^{0.5} x^2 dx \\int_{-0.5}^{0.5}dy \\int_{-0.5}^{0.5} dz+\\int_{-0.5}^{0.5}dx\\int_{-0.5}^{0.5}y^2dy\\int_{-0.5}^{0.5}dz \\right ]$ $=3\\left [ \\frac{x^3}{3}|_{-0.5}^{0.5} \\times 1 \\times 1 + \\frac{y^3}{3}|_{-0.5}^{0.5} \\times 1 \\times 1\\right ] =0.25+0.25=0.5C$",
          "year": 2022,
          "marks": 2,
          "exam_type": "GATE EC",
          "question_type": "NAT"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "In a circuit, there is a series connection of an ideal resistor and an ideal capacitor. The conduction current (in Amperes) through the resistor is $2\\sin (t+\\pi/2)$ . The displacement current (in Amperes) through the capacitor is _________.",
          "images": [
            {
              "index": 1,
              "filename": "Electromagnetics/in-a-circuit-there-is-a-series-conn_exp_img1.jpg",
              "type": "explanation"
            }
          ],
          "options": [
            "A. $2 \\sin (t)$",
            "B. $2 \\sin (t+\\pi)$",
            "C. $2 \\sin (t+\\pi /2)$",
            "D. 0"
          ],
          "correct_answer": "C",
          "explanation": "In series connection, current pass through each element remain same. Hence, $i_c=i_d$ So, $i_d= 2\\sin (t+\\pi/2)$ .",
          "year": 2022,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "For a vector field $D=\\rho\\cos^{2}\\:\\varphi \\:a_{\\rho }+z^{2}\\sin^{2}\\:\\varphi \\:a_{\\varphi }$ in a cylindrical coordinate system $\\left ( \\rho ,\\varphi ,z \\right )$ with unit vectors $a_{\\rho },a_{\\varphi }$ and $a_{z}$ , the net flux of D leaving the closed surface of the cylinder $\\left ( \\rho =3, 0\\leq z\\leq 2 \\right )$ (rounded off to two decimal places) is ________________",
          "images": [],
          "options": [],
          "correct_answer": "56.5 to 56.6",
          "explanation": "Method 1: $\\vec{D}=\\rho \\cos ^{2} \\phi \\hat{a}_{\\rho}+z^{2} \\sin ^{2} \\phi \\hat{a}_{\\phi}$ Electric flux crossing the closed surface is $\\begin{aligned} \\psi &=\\oiint \\vec{D} \\cdot \\overrightarrow{d S}=\\iiint(\\vec{\\nabla} \\cdot \\vec{D}) d v \\\\ \\vec{\\nabla} \\cdot \\vec{D} &=\\frac{1}{\\rho} \\frac{\\partial}{\\partial p}\\left(\\rho D_{\\rho}\\right)+\\frac{1}{\\rho} \\frac{\\partial D_{\\phi}}{\\partial \\phi}+\\frac{\\partial D_{z}}{\\partial z} \\\\ &=\\frac{1}{\\rho} \\frac{\\partial}{\\partial p}\\left(\\rho \\rho \\cos ^{2} \\phi\\right)+\\frac{1}{\\rho} \\frac{\\partial}{\\partial \\phi}\\left(z^{2} \\sin ^{2} \\phi\\right)+0 \\\\ &=\\frac{1}{\\rho}(2 \\rho) \\cos ^{2} \\phi+\\frac{1}{\\rho} z^{2} 2 \\sin \\phi \\cos \\phi=2 \\cos ^{2} \\phi+\\frac{z^{2}}{\\rho} \\sin 2 \\phi\\\\ \\iiint(\\vec{\\nabla} \\cdot \\vec{D}) d v &=\\iiint 2 \\cos ^{2} \\phi(\\rho d \\rho d \\phi d z)+\\iiint\\left(\\frac{z^{2}}{\\rho} \\sin 2 \\phi\\right) \\rho d \\rho d \\phi d z \\\\ &=2 \\int_{\\rho=0}^{3} \\rho d \\rho \\int_{\\phi=0}^{2 \\pi}\\left(\\frac{1+\\cos 2 \\phi}{2}\\right) d \\phi \\int_{z=0}^{2} d z+\\int_{\\rho=0}^{2} d \\rho \\int_{\\phi=0}^{2 \\pi} \\sin 2 \\phi d \\phi \\int_{z=0}^{2} z^{2} d z \\\\ &=2\\left(\\frac{\\rho^{2}}{-2}\\right)_{\\rho=0}^{3} \\frac{1}{2}(2 \\pi)(z)_{z=0}^{2}+0 \\\\ &=2\\left(\\frac{3^{2}}{2}\\right) \\pi(2)=18 \\pi(\\text { Coulomb })=56.55(\\text { Coulomb }) \\end{aligned}$ Method 2: Electric flux crossing the closed surface is $\\psi=\\oiint \\vec{D} \\cdot \\overrightarrow{d S}$ Electric flux crossing \\rho=3 cylindrical surface is $\\begin{aligned} \\left.\\psi\\right|_{\\rho=3} &=\\oiint\\left(\\rho \\cos ^{2} \\phi \\hat{a}_{p}\\right) \\cdot(\\rho d \\phi d z) \\hat{a}_{p} \\\\ &=3^{2} \\int_{\\phi=0}^{2 \\pi} \\cos ^{2} \\phi d \\phi \\int_{z=0}^{2} d z \\\\ &=9 \\frac{1}{2}(2 \\pi)(2)=18 \\pi(\\text { coulomb })=56.55(\\text { coulomb }) \\end{aligned}$",
          "year": 2021,
          "marks": 2,
          "exam_type": "GATE EC",
          "question_type": "NAT"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "Consider the vector field $F\\:=\\:a_{x}\\left ( 4y-c_{1}z \\right )+a_y\\left ( 4x + 2z\\right )+a_{z}\\left ( 2y +z\\right )$ in a rectangular coordinate system (x,y,z) with unit vectors $a_{x},\\:a_{y}$ and $a_{z}$ . If the field F is irrotational (conservative), then the constant $c_{1}$ (in integer) is _________________",
          "images": [],
          "options": [],
          "correct_answer": "0",
          "explanation": "$\\begin{aligned} \\nabla \\times \\vec{F}&=0\\\\ \\left|\\begin{array}{ccc} i & j & k \\\\ \\frac{\\partial}{\\partial x} & \\frac{\\partial}{\\partial y} & \\frac{\\partial}{\\partial z} \\\\ 4 y-c_{1} z & 4 x+2 z & 2 y+z \\end{array}\\right|&=0\\\\ =i(2-2)-j\\left(0+c_{1}\\right)+k(4-4)=0 \\\\ c_{1} &=0 \\end{aligned}$",
          "year": 2021,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "NAT"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "Two identical copper wires W1 and W2, placed in parallel as shown in the figure, carry currents I and 2I, respectively, in opposite directions. If the two wires are separated by a distance of 4r, then the magnitude of the magnetic field $\\vec{B}$ between the wires at a distance r from W1 is",
          "images": [
            {
              "index": 1,
              "filename": "Electromagnetics/two-identical-copper-wires-w1-and-w_img1.jpg"
            },
            {
              "index": 2,
              "filename": "Electromagnetics/two-identical-copper-wires-w1-and-w_exp_img2.jpg",
              "type": "explanation"
            }
          ],
          "options": [
            "A. $\\frac{\\mu _0 I}{6 \\pi r}$",
            "B. $\\frac{6 \\mu _0 I}{5 \\pi r}$",
            "C. $\\frac{5 \\mu _0 I}{6 \\pi r}$",
            "D. $\\frac{{\\mu _0}^2 I^2}{2 \\pi r^2}$"
          ],
          "correct_answer": "C",
          "explanation": "Magnetic flux density $(\\vec{B})$ at r distance due to infinite line carrying current I is $|\\vec{B}|=\\frac{\\mu_{0} I}{2 \\pi \\rho} .$ $\\vec{B}$ at r distance due to $W_{1}$ wire $=\\left|\\vec{B}_{1}\\right|=\\frac{\\mu_{0} I}{2 \\pi r}\\qquad \\ldots(i)$ $\\vec{B}$ at 3r distance due to $W_{2}$ wire $=\\left|\\vec{B}_{2}\\right|=\\frac{\\mu_{0}(2 I)}{2 \\pi(3 r)}\\qquad \\ldots(ii)$ From right hand thumb rule, $\\vec{B}$ due to both lines add in between conductors. $\\begin{aligned} {So,}\\qquad |\\vec{B}|&=\\left|\\vec{B}_{1}\\right|+\\left|\\vec{B}_{2}\\right|\\\\ \\therefore \\qquad |\\vec{B}|&=\\frac{\\mu_{0} I}{2 \\pi r}+\\frac{2 \\mu_{0} I}{6 \\pi r}=\\frac{5 \\mu_{0} I}{6 \\pi r} \\end{aligned}$",
          "year": 2019,
          "marks": 2,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "In the table shown, List I and List II, respectively, contain terms appearing on the left-hand side and the right-hand side of Maxwell's equations (in their standard form). Match the left-hand side with the corresponding right-hand side.",
          "images": [
            {
              "index": 1,
              "filename": "Electromagnetics/in-the-table-shown-list-i-and-list_img1.jpg"
            }
          ],
          "options": [
            "A. 1-P, 2-R, 3-Q, 4-S",
            "B. 1-Q, 2-R, 3-P, 4-S",
            "C. 1-Q, 2-S, 3-P, 4-R",
            "D. 1-R, 2-Q, 3-S, 4-P"
          ],
          "correct_answer": "B",
          "explanation": "$\\begin{aligned} \\nabla \\cdot \\vec{D} &=\\rho_{v} \\\\ \\nabla \\times \\vec{E} &=-\\frac{\\partial \\vec{B}}{\\partial t} \\\\ \\nabla \\cdot \\vec{B} &=0 \\\\ \\nabla \\times \\vec{H} &=\\vec{J}+\\frac{\\partial \\vec{D}}{\\partial t} \\end{aligned}$",
          "year": 2019,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "What is the electric flux ( $\\int \\vec{E}\\cdot d\\hat{a}$ ) through a quarter-cylinder of height H (as shown in the figure) due to an infinitely long line charge along the axis of the cylinder with a charge density of Q?",
          "images": [
            {
              "index": 1,
              "filename": "Electromagnetics/what-is-the-electric-flux-int-vecec_img1.jpg"
            }
          ],
          "options": [
            "A. $\\frac{HQ}{\\varepsilon _0}$",
            "B. $\\frac{HQ}{4\\varepsilon _0}$",
            "C. $\\frac{H\\varepsilon _0}{4Q}$",
            "D. $\\frac{4H}{Q\\varepsilon _0}$"
          ],
          "correct_answer": "B",
          "explanation": "Electric field intensity $(\\vec{E})$ at ' $\\rho$ ' distance due to infinite long line having line charge density Q is $\\begin{aligned} \\vec{E} &=\\frac{Q}{2 \\pi \\varepsilon_{0} \\rho} \\hat{a}_{\\rho} \\\\ \\int \\vec{E} \\cdot \\vec{da} &=\\iint \\frac{Q}{2 \\pi \\varepsilon_{0} \\rho} \\hat{a}_{p} \\cdot \\rho d \\phi d z \\hat{a}_{\\rho} \\\\ &=\\frac{Q}{2 \\pi \\varepsilon_{0}} \\int_{<\\pi / 2>} d \\phi \\int_{z=0}^{H} d z \\\\ &=\\frac{Q}{2 \\pi \\varepsilon_{0}}\\left(\\frac{\\pi}{2}\\right) H=\\frac{H Q}{4 \\varepsilon_{0}} \\end{aligned}$",
          "year": 2019,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "An electron ( $q_1$ ) is moving in free space with velocity $10^{5}$ m/s towards a stationary electron ( $q_2$ ) far away. The closest distance that this moving electron gets to the stationary electron before the repulsive force diverts its path is ___________ $\\times 10^{-8}$ m. [Given, mass of electron $m=9.11 \\times 10^{-31}$ kg, charge of electron $e=-1.6 \\times 10^{-19}$ C, and permittivity $\\varepsilon_{0}=(1/36\\pi)\\times 10^{-9}F/m]$",
          "images": [
            {
              "index": 1,
              "filename": "Electromagnetics/an-electron-q_1-is-moving-in-free-s_exp_img1.jpg",
              "type": "explanation"
            }
          ],
          "options": [],
          "correct_answer": "4.55 to 5.55",
          "explanation": "r is the distance at which kinetic energy of $q_{1}$ becomes zero [(because kinetic energy (KE) is converted into potential energy (PE)]. When $q_{1}$ reaches 'r', it starts diverting. Kinetic energy, $K E=\\frac{1}{2} m v^{2}$ and work done in moving $q_{1}$ charge to distance 'r' is $\\begin{aligned} q_{1} v_{2}&=q_{1} \\frac{q_{2}}{4 \\pi \\varepsilon_{0} r} \\\\ &\\qquad\\left(q_{1}=q_{2}=-1.6 \\times 10^{-19} \\mathrm{C}\\right)\\\\ Now, \\quad \\frac{1}{2} m v^{2}&=\\frac{q_{1} q_{2}}{4 \\pi \\varepsilon_{0} r} \\\\ \\end{aligned}$ $\\Rightarrow r=\\frac{\\left(2 \\times-1.6 \\times 10^{-19}\\right) \\times\\left(-1.6 \\times 10^{-19}\\right)}{4 \\pi \\times \\frac{10^{-9}}{36 \\pi} \\times 9.11 \\times 10^{-31} \\times\\left(10^{5}\\right)^{2}}$ $\\simeq 5.06 \\times 10^{-8} \\mathrm{m}$",
          "year": 2017,
          "marks": 2,
          "exam_type": "GATE EC",
          "question_type": "NAT"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "Two conducting spheres S1 and S2 of radii a and b (b>a) respectively, are placed far apart and connected by a long, thin conducting wire, as shown in the figure. For some charge placed on this structure, the potential and surface electric field on S1 are $V_{a}$ and $E_{a}$ , and that on S2 are $V_{b}$ and $E_{b}$ , respectively, which of the following is CORRECT?",
          "images": [
            {
              "index": 1,
              "filename": "Electromagnetics/two-conducting-spheres-s1-and-s2-of_img1.jpg"
            },
            {
              "index": 2,
              "filename": "Electromagnetics/two-conducting-spheres-s1-and-s2-of_exp_img2.jpg",
              "type": "explanation"
            }
          ],
          "options": [
            "A. $V_{a}=V_{b} \\; and \\; E_{a}\\lt E_{b}$",
            "B. $V_{a}\\gt V_{b} \\; and \\; E_{a} \\gt E_{b}$",
            "C. $V_{a}=V_{b} \\; and \\; E_{a} \\gt E_{b}$",
            "D. $V_{a}\\gt V_{b} \\; and \\; E_{a}=E_{b}$"
          ],
          "correct_answer": "C",
          "explanation": "When charge is placed on this structure equilibrium is established such that be spheres are at same potential i.e. $V_{a}=V_{b}$ $\\begin{array}{c} V_{a}=V_{b} \\\\ \\text { So, } \\frac{Q_{a}}{4 \\pi \\epsilon_{o} a}=\\frac{Q_{b}}{4 \\pi \\epsilon_{o} b} \\end{array}$ $\\frac{Q_{b}}{Q_{a}}=\\frac{b}{a}$ Now, surface electric fields. $\\frac{E_{a}}{E_{b}}=\\left[\\frac{Q_{a} / 4 \\pi \\varepsilon_{o} a^{2}}{Q_{b} / 4 \\pi \\varepsilon_{o} b^{2}}\\right]=\\frac{Q_{a} \\times b^{2}}{Q_{b} \\times a^{2}}=\\frac{b}{a}>1$ $So, E_{a}>E_{b}$",
          "year": 2017,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "Consider the charge profile shown in the figure. The resultant potential distribution is best described by",
          "images": [
            {
              "index": 1,
              "filename": "Electromagnetics/consider-the-charge-profile-shown-i_img1.jpg"
            },
            {
              "index": 2,
              "filename": "Electromagnetics/consider-the-charge-profile-shown-i_img2.jpg"
            }
          ],
          "options": [
            "A. A",
            "B. B",
            "C. C",
            "D. D"
          ],
          "correct_answer": "D",
          "explanation": "Applying Poisson's equations $\\nabla^{2} V=\\frac{\\partial^{2} V}{\\partial x^{2}}=-\\frac{\\rho_{v}}{\\epsilon}=K$ Constant charge density $\\begin{aligned} \\frac{\\partial V}{\\partial x} &=-K x+K^{\\prime} \\\\ V &=\\frac{-K x^{2}}{2}+K^{\\prime} x+K^{\\prime} \\end{aligned}$ Towards positive x or negative side. It is a second order parabolic increase. Due to symmetry of + and - charges K\" = 0 is expected with V = O at centre and graph passing through origin. Beyond $x \\gt 0 \\text{ or } x \\lt b, \\; E = 0$ due to capacitive nature of + and - charges $V=-\\int 0 \\cdot \\overrightarrow{d l}=\\text { Constant }$ This constant is same V at x=a or x=b",
          "year": 2016,
          "marks": 2,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "A positive charge q is placed at x= 0 between two infinite metal plates placed at x =-d and at x = +d respectively. The metal plates lie in the yz plane. The charge is at rest at t = 0, when a voltage +V is applied to the plate at -d and voltage -V is applied to the plate at x=+d . Assume that the quantity of the charge q is small enough that it does not perturb the field set up by the metal plates. The time that the charge q takes to reach the right plate is proportional to",
          "images": [
            {
              "index": 1,
              "filename": "Electromagnetics/a-positive-charge-q-is-placed-at-x_img1.jpg"
            }
          ],
          "options": [
            "A. d/V",
            "B. $\\sqrt{d}/V$",
            "C. $d/ \\sqrt{V}$",
            "D. $\\sqrt{d/V}$"
          ],
          "correct_answer": "C",
          "explanation": "Velocity being free velocity, $\\begin{aligned} \\frac{1}{2} m v^{2} &=q V \\\\ v &=\\frac{d}{t}=\\sqrt{\\frac{2 q V}{m}} \\\\ \\Rightarrow t \\propto \\frac{d}{\\sqrt{V}} \\end{aligned}$",
          "year": 2016,
          "marks": 2,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "The parallel-plate capacitor shown in the figure has movable plates. The capacitor is charged so that the energy stored in it is E when the plate separation is d. The capacitor is then isolated electrically and the plates are moved such that the plate separation becomes 2d. At this new plate separation, what is the energy stored in the capacitor, neglecting fringing effects?",
          "images": [
            {
              "index": 1,
              "filename": "Electromagnetics/the-parallelplate-capacitor-shown-i_img1.jpg"
            }
          ],
          "options": [
            "A. 2E",
            "B. $\\sqrt{2}E$",
            "C. E",
            "D. E/2"
          ],
          "correct_answer": "A",
          "explanation": "$\\begin{array}{l} \\text { Let, } E=E_{1} \\text { , Energy } E_{1}=\\frac{Q_{1}^{2}}{2 C_{1}} \\\\ \\text { Electrically isolated } \\Rightarrow Q_{2}=Q_{1} \\\\ \\begin{aligned} d_{2}=2 d_{1} \\Rightarrow \\;& C_{2}=\\frac{C_{1}}{2} \\\\ E_{2} &=\\frac{Q_{2}^{2}}{2 C_{2}}=\\frac{Q_{1}^{2}}{\\frac{2 C_{1}}{2}}=2\\left(\\frac{Q_{1}^{2}}{2 C_{1}}\\right) \\\\ &=2 E_{1}=2 E \\end{aligned} \\end{array}$",
          "year": 2016,
          "marks": 2,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "A uniform and constant magnetic field $B=\\hat{z}B$ exists in the $\\hat{z}$ direction in vacuum. A particle of mass m with a small charge q is introduced into this region with an initial velocity $v=\\hat{x}v_{x}+\\hat{z}v_{z}$ . Given that B, m, q, $v_{x}$ and $v_{z}$ are all non-zero, which one of the following describes the eventual trajectory of the particle?",
          "images": [],
          "options": [
            "A. Helical motion in the $\\hat{z}$ direction",
            "B. Circular motion in the xy plane",
            "C. Linear motion in the $\\hat{z}$ direction",
            "D. Linear motion in the $\\hat{x}$ direction"
          ],
          "correct_answer": "A",
          "explanation": "$\\mathrm{Ba}_{\\mathrm{z}}$ magnetic field $v_{x} a_{x}+v_{z} a_{z}$ velocity $\\begin{aligned} F&=Q(v \\times B) \\text{ by Lorentz's law}\\\\ &=Q\\left(v_{x} a_{x}+v_{z} a_{z}\\right) \\times B a_{z} \\\\ F_{y} &=Q v_{x} \\cdot B\\left(-a_{y}\\right) \\end{aligned}$ This results in a circular path in the XY plane with $v_{z} a_{z}$ component causing a linear path. Both result in a helical path along Z axis.",
          "year": 2016,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "The current density in a medium is given by $\\vec{j}=\\frac{400 sin\\theta }{2\\pi (r^{2})+4}\\hat{a}_{r}Am^{-2}$ The total current and the average current density flowing through the portion of a spherical surface r = 0.8 m, $\\frac{\\pi }{12}\\leq \\theta \\leq \\frac{\\pi }{4},0\\leq \\phi \\leq 2\\pi$ are given, respectively, by",
          "images": [],
          "options": [
            "A. 15.09 A, 12.86 $Am^{-2}$",
            "B. 18.73 A, 13.65 $Am^{-2}$",
            "C. 12.86 A, 9.23 $Am^{-2}$",
            "D. 10.28 A, 7.56 $Am^{-2}$"
          ],
          "correct_answer": "A",
          "explanation": "$\\begin{aligned} I &=\\int \\overrightarrow{J} \\cdot \\overrightarrow{d s} \\\\ &=\\int_{\\theta=\\frac{\\pi}{12}}^{\\pi / 4} \\int_{\\phi=0}^{2 \\pi} \\frac{400 \\sin \\theta}{2 \\pi\\left(r^{2}+4\\right)} r^{2} \\sin \\theta d \\theta d \\phi \\\\ &=\\left.\\frac{400}{2 \\pi\\left(r^{2}+4\\right)} \\cdot r^{2} \\cdot \\phi\\right|_{0} ^{2 \\pi} \\int_{\\pi / 12}^{\\pi / 4} \\sin ^{2} \\theta d \\theta \\\\ &=\\frac{400 r^{2}}{\\left(r^{2}+4\\right)} \\int_{\\pi / 12}^{\\pi / 4}\\left(\\frac{1-\\cos 2 \\theta}{2}\\right) d \\theta \\\\ &=\\frac{400 \\cdot r^{2}}{\\left(r^{2}+4\\right)}\\left(\\frac{\\left(\\frac{\\pi}{4}-\\frac{\\pi}{12}\\right)}{2}-\\left(\\frac{\\sin 2 \\theta}{4}\\right)_{\\pi / 12}^{\\pi / 4}\\right) \\\\ &=\\left.\\frac{400 \\cdot r^{2}}{\\left(r^{2}+4\\right)}\\left(\\frac{\\pi}{12}-\\left(\\frac{1-1 / 2}{4}\\right)\\right)\\right|_{r=0.8} \\\\ &=\\frac{400 \\times 0.8 \\times 0.8}{4.64} \\times 0.13=7.17 \\mathrm{Amp} \\end{aligned}$ $\\begin{array}{l} \\text { Total area }=\\int d s=\\iint r^{2} \\sin \\theta d \\theta d \\phi \\\\ =r^{2} \\int_{0=\\frac{\\pi}{12}}^{\\pi / 4} \\sin \\theta d \\theta \\cdot 2 \\pi \\\\ =\\left.r^{2} \\cdot 2 \\pi \\cdot 0.259\\right|_{r=0.8} \\\\ =0.8^{2} \\times 0.5 \\times 2 \\pi \\times \\frac{1}{4} \\\\ =1.041 \\mathrm{m}^{2} \\\\ \\text { Average current }=\\frac{7.17}{1.041}=6.88 \\mathrm{A} / \\mathrm{m}^{2} \\end{array}$ Note : GATE key mentioned (MTA - marks to all)",
          "year": 2016,
          "marks": 2,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "Concentric spherical shells of radii 2 m, 4 m, and 8 m carry uniform surface charge densities of 20 nC/ $m^{2}$ , -4 nC/ $m^{2}$ and $\\rho _{s}$ , respectively. The value of $\\rho _{s} (nC/m^{2})$ required to ensure that the electric flux density $\\overrightarrow{D}=\\overrightarrow{0}$ at radius 10 m is _________",
          "images": [],
          "options": [],
          "correct_answer": "-0.28 to -0.22",
          "explanation": "$\\oint \\vec{D} \\cdot ds=Q \\quad$ (charge enclosed) $Q_{1}+Q_{2}+Q_{3}=0$ For D=0 $\\rho_{s 1} \\cdot 4 \\pi 2^{2}+\\rho_{s 2} \\cdot 4 \\pi \\cdot 4^{2}+\\rho_{s 3} \\cdot 4 \\pi \\cdot 8^{2}=Q=0$ $20 \\cdot 4-4.4^{2}+\\rho_{s 3} \\cdot 8^{2}=0$ $80-64+\\rho_{s 3} \\cdot 8^{2}=0$ $\\rho_{s 3}=\\frac{-16}{64}=-0.25 \\mathrm{nC} / \\mathrm{m}^{2}$",
          "year": 2016,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "NAT"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "A vector field $D=2\\rho ^{2} a_{\\rho }+z a_{z}$ exists inside a cylindrical region enclosed by the surfaces $\\rho$ = 1, z = 0 and z = 5. Let S be the surface bounding this cylindrical region. The surface integral of this field on $S(\\oint\\oint_{S} D.ds)$ is _______.",
          "images": [],
          "options": [],
          "correct_answer": "78 to 79",
          "explanation": "$\\begin{array}{c} \\vec{D}=2 \\rho^{2} \\hat{a}_{p}+z \\hat{a}_{z} \\\\ \\text { surface: } \\rho=1, z=0 \\text { and } z=5 \\\\ \\oiint_{s} \\vec{D} \\cdot ds=\\int_{\\text {Top surface}} \\vec{D} \\cdot ds \\\\ +\\int_{\\text {Bottom surface}} \\vec{D} \\cdot ds \\\\ +\\int_{\\text {curved surface }} \\vec{D} \\cdot ds \\\\ =5 \\pi+0+20 \\pi=25 \\pi=78.54 \\end{array}$",
          "year": 2015,
          "marks": 2,
          "exam_type": "GATE EC",
          "question_type": "NAT"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "In a source free region in vacuum, if the electrostatic potential $\\varphi = 2x^{2}+y^{2}+cz^{2}$ , the value of constant c must be _______.",
          "images": [],
          "options": [],
          "correct_answer": "-3.1 to -2.9",
          "explanation": "$\\phi=2 x^{2}+y^{2}+c z^{2}$ In source-free region, $\\begin{aligned} \\nabla \\cdot \\vec{D}&=0 \\\\ \\Rightarrow \\quad \\in(\\nabla \\cdot \\vec{E}) &=0 \\\\ \\Rightarrow \\quad \\nabla \\cdot \\vec{E} &=0\\\\ where,\\quad\\vec{E}&=-\\nabla V=-\\nabla \\phi \\\\ Now, \\quad \\nabla V&=\\frac{\\partial \\phi}{\\partial x} \\hat{a}_{x}+\\frac{\\partial \\phi}{\\partial y} \\hat{a}_{y}+\\frac{\\partial \\phi}{\\partial z} \\hat{a}_{z} \\\\ \\Rightarrow \\quad -\\vec{E}&=4 x \\hat{a}_{x}+2 y \\hat{a}_{y}+2 c z \\hat{a}_{z} \\\\ \\text{Again }\\nabla \\cdot \\vec{E}&=0 \\\\ \\Rightarrow \\frac{\\partial E_{x}}{\\partial x}+\\frac{\\partial E_{y}}{\\partial y}&+\\frac{\\partial E_{t}}{\\partial z}=4+2+2 c=0 \\\\ c&=-3 \\end{aligned}$",
          "year": 2015,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "NAT"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "Consider a straight, infinitely long, current carrying conductor lying on the z-axis. Which one of the following plots (in linear scale) qualitatively represents the dependence of $H_{\\phi}$ on r, where $H_{\\phi}$ is the magnitude of the azimuthal component of magnetic field outside the conductor and r is the radial distance from the conductor?",
          "images": [
            {
              "index": 1,
              "filename": "Electromagnetics/consider-a-straight-infinitely-long_img1.jpg"
            }
          ],
          "options": [
            "A. A",
            "B. B",
            "C. C",
            "D. D"
          ],
          "correct_answer": "C",
          "explanation": "$H_{\\phi}=\\frac{I}{2 \\pi r} \\hat{a}_{\\phi}$ $\\Rightarrow \\quad H_{\\phi} \\propto \\frac{1}{r}$ option(c) is satisfied.",
          "year": 2015,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "If $\\vec{E}=-9(2y^{3}-3yz^{2})\\hat{x}-(6xy^{2}-3xz^{2})\\hat{y}+(6xyz)\\hat{z}$ is the electric field in a source free region, a valid expression for the electrostatic potential is",
          "images": [],
          "options": [
            "A. $xy^{3}-yz^{2}$",
            "B. $2xy^{3}-xyz^{2}$",
            "C. $y^{3}+xyz^{2}$",
            "D. $2xy^{3}-3xyz^{2}$"
          ],
          "correct_answer": "D",
          "explanation": "$\\begin{aligned} E &=-\\frac{\\partial V}{\\partial x} \\hat{a}_{x}-\\frac{\\partial V}{\\partial y} \\hat{a}_{y}-\\frac{\\partial V}{\\partial Z} \\hat{a}_{z} \\\\ \\frac{\\partial V}{\\partial x} &=2 y^{3}-3 y z^{2} &V=2 x y^{3}-3 x y z^{2}+K_{1} \\\\ \\frac{\\partial V}{\\partial y} &=6 x y^{2}-3 x z^{2} &V=2 x y^{3}-3 x y z^{2}+K_{2} \\\\ \\frac{\\partial V}{\\partial z} &=-6 x y z &V=-3 x y z^{2}+K_{3} \\end{aligned}$ Comparing all three for uniqueness solution of potential $\\begin{array}{c} K_{1}=K_{2}=0, \\quad K_{3}=2 x y^{3} \\\\ \\vec{E}=-\\left(2 y^{3}-3 y z^{2}\\right) \\hat{x}-\\left(6 x y^{2}-3 x z^{2}\\right) \\hat{y}+(6 x y z) \\hat{z} \\end{array}$ as we know that $E=-\\nabla V$ $E=-\\left(\\frac{\\partial}{\\partial x} \\hat{x}+\\frac{\\partial}{\\partial y} \\hat{y}+\\frac{\\partial}{\\partial z} \\hat{z}\\right) V \\quad\\ldots(i)$ Clearly option (D) satisfies the given relation.",
          "year": 2014,
          "marks": 2,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "The electric field (assumed to be one-dimensional) between two points A and B is shown. Let $\\psi _{A}$ and $\\psi _{B}$ be the electrostatic potentials at A and B, respectively. The value of $\\psi _{B}-\\psi _{A}$ in Volts is",
          "images": [
            {
              "index": 1,
              "filename": "Electromagnetics/the-electric-field-assumed-to-be-on_img1.jpg"
            },
            {
              "index": 2,
              "filename": "Electromagnetics/the-electric-field-assumed-to-be-on_exp_img2.jpg",
              "type": "explanation"
            }
          ],
          "options": [],
          "correct_answer": "-15.1 to -14.9",
          "explanation": "E is linear from A to B and E=mx+C $\\begin{aligned} V&=-\\int_{B}^{A}(m x+c) d x \\\\ \\text { At point } A: x&= 0, E=c=2 \\times 10^{6} \\vee / m =x 10^{-6}\\\\ \\text { At point } B: x &=5 \\times 10^{-6} \\\\ E &=4 \\times 10^{6}=m \\times 5 \\times 10^{-6}+2 \\times 10^{6} \\\\ m &=4 \\times 10^{11}\\\\ -\\int^{\\Psi_{A}}_{\\Psi_{B}} E \\cdot d l&=-\\int_{5\\mu m}^{0}\\left[20 \\times 10^{5} \\times 5 \\times 10^{-6}+\\frac{4 \\times 10^{11}}{2}\\left[\\left(5 \\times 10^{-6}\\right)-0^{2}\\right]\\right] \\\\ \\Psi_{A}-\\Psi_{B} &=-\\left[\\left(20 \\times 10^{5} \\times 5 \\times 10^{-6}\\right)+\\frac{4 \\times 10^{11}}{2}\\left[\\left(5 \\times 10^{-6}\\right)^{2}-0^{2}\\right]\\right] \\\\ &=-\\left[10+\\left(2 \\times 10^{11} \\times 25 \\times 10^{-12}\\right)\\right] \\\\ &=-15 \\mathrm{V} \\end{aligned}$",
          "year": 2014,
          "marks": 2,
          "exam_type": "GATE EC",
          "question_type": "NAT"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "A region shown below contains a perfect conducting half-space and air. The surface current $\\vec{K}_{s}$ on the surface of the perfect conductor is $\\hat{K}_{s}=\\hat{x}_{2}$ amperes per meter. The tangential $\\vec{H}$ field in the air just above the perfect conductor is",
          "images": [
            {
              "index": 1,
              "filename": "Electromagnetics/a-region-shown-below-contains-a-per_img1.jpg"
            }
          ],
          "options": [
            "A. $(\\hat{x}+\\hat{z})2$ amperes per meter",
            "B. $\\hat{x}2$ amperes per meter",
            "C. $-\\hat{z}2$ amperes per meter",
            "D. $\\hat{z}2$ amperes per meter"
          ],
          "correct_answer": "D",
          "explanation": "since, we know from the property of magnetic boundary conditions i.e. $\\vec{H}_{t 2}-\\vec{H}_{t 1}=\\hat{K}_{s} \\times a_{N}$ In the given question the tangential field $\\vec{H}$ in the air just above the perfect conductor is asked with H=0 inside the conductor $\\begin{array}{l} \\vec{H}_{t 1}=0 \\\\ \\vec{H}_{t 2}=\\hat{x} 2 \\times \\hat{y} \\\\ \\vec{H}_{t 2}=\\hat{z} 2 \\mathrm{A} / \\mathrm{m} \\end{array}$",
          "year": 2014,
          "marks": 2,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "The force on a point charge $+q$ kept at a distance d from the surface of an infinite grounded metal plate in a medium of permittivity $\\varepsilon$ is",
          "images": [],
          "options": [
            "A. 0",
            "B. $\\frac{q^{2}}{16\\pi \\varepsilon d^{2}}$ away from the plate",
            "C. $\\frac{q^{2}}{16\\pi \\varepsilon d^{2}}$ towards the plate",
            "D. $\\frac{q^{2}}{4\\pi \\varepsilon d^{2}}$ towards the plate"
          ],
          "correct_answer": "C",
          "explanation": "Currently no explanation available",
          "year": 2014,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "An infinitely long uniform solid wire of radius a carries a uniform dc current of density $\\overrightarrow{j}$ . A hole of radius $b (b \\lt a)$ is now drilled along the length of the wire at a distance d from the center of the wire as shown below. The magnetic field inside the hole is",
          "images": [
            {
              "index": 1,
              "filename": "Electromagnetics/an-infinitely-long-uniform-solid-wi_img1.jpg"
            },
            {
              "index": 2,
              "filename": "Electromagnetics/an-infinitely-long-uniform-solid-wi_exp_img2.jpg",
              "type": "explanation"
            }
          ],
          "options": [
            "A. uniform and depends only on d",
            "B. uniform and depends only on b",
            "C. uniform and depends on both b and d",
            "D. non uniform"
          ],
          "correct_answer": "A",
          "explanation": "The H field due to entire cylinder without hole. $H\\left(r_{1}\\right)=\\frac{J r_{1}}{2}$ The Hfield due to hole only. $H\\left(r_{2}\\right)=\\frac{J r_{2}}{2}$ Current inside the hole is zero means $H(r)=\\frac{J r_{1}}{2}-\\frac{J r_{2}}{2} \\simeq \\frac{J d}{2}$",
          "year": 2012,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "A current sheet $\\bar{J}$ = 10 $\\hat{u}_{y}$ A/m lies on the dielectric interface $x=0$ between two dielectric media with $\\varepsilon _{r1}$ =5, $\\mu _{r1}$ =1 in Region-1 $(x \\lt 0)$ and $\\varepsilon _{r2}$ =5, $\\mu _{r2}$ =2 in Region-2 $(x \\gt 0)$ . If the magnetic field in Region-1 at $x = 0^{-}$ is $\\vec{H}_{1} = 3\\hat{u}_{x}$ + 30 $\\hat{u}_{y}$ A/m. The magnetic field in Region-2 at $x = 0^{+}$ is",
          "images": [
            {
              "index": 1,
              "filename": "Electromagnetics/a-current-sheet-barj-10-hatu_y-am-l_img1.jpg"
            }
          ],
          "options": [
            "A. $\\vec{H_{2}}=1.5\\hat{u}_{x}+30\\hat{u}_{y}-10\\hat{u}_{z} A/m$",
            "B. $\\vec{H}_{2}=3\\hat{u}_{x}+30\\hat{u}_{y}-10\\hat{u}_{z} A/m$",
            "C. $\\vec{H}_{2}=1.5\\hat{u}_{x}+40\\hat{u}_{y} A/m$",
            "D. $\\vec{H}_{2}=3\\hat{u}_{x}+30\\hat{u}_{y}+10\\hat{u}_{z} A/m$"
          ],
          "correct_answer": "A",
          "explanation": "For magnetic field boundary relations are $\\begin{aligned} \\vec{B}_{n_{1}} &=\\vec{B}_{n_{2}} \\\\ \\text { and } \\vec{H}_{t_{1}}-\\vec{H}_{t_{2}} &=-\\vec{J}_{s} \\times \\vec{a}_{n} \\\\ \\Rightarrow \\quad B_{x_{1}}&=B_{x_{2}}\\qquad\\text{(x is normal component)}\\\\ \\mu_{1} H_{x_{1}} &=\\mu_{2} H_{x 2} \\\\ \\Rightarrow \\quad 1 \\times 3 &=2 \\times H_{x 2} \\\\ H_{x_{2}} &=1.5 \\\\ \\Rightarrow \\quad \\vec{H}_{11}-\\vec{H}_{t_{2}} &=-10 \\hat{u}_{y} \\times \\hat{u}_{x}=+10 \\hat{u}_{z} \\\\ \\vec{H}_{t_{2}} &=H_{t_{1}}-10 \\hat{u}_{z} \\\\ \\vec{H}_{t_{2}} &=30 \\hat{u}_{y}-10 \\hat{u}_{z} \\\\ \\Rightarrow \\quad \\vec{H}_{2} &=1.5 \\hat{u}_{x}+30 \\hat{u}_{y}-10 \\hat{u}_{z} \\mathrm{A} / \\mathrm{m} \\end{aligned}$",
          "year": 2011,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "A magnetic field in air is measured to be $\\vec{B}=B_{0}(\\frac{x}{x^{2}+y^{2}}\\hat{y}-\\frac{y}{x^{2}+y^{2}}\\hat{x})$ What current distribution leads to this field ? [Hint : The algebra is trivial in cylindrical coordinates.]",
          "images": [],
          "options": [
            "A. $\\vec{J}=\\frac{B_{0}\\hat{z}}{\\mu _{0}}(\\frac{1}{x^{2}+y^{2}}),r\\neq 0$",
            "B. $\\vec{J}=\\frac{B_{0}\\hat{z}}{\\mu _{0}}(\\frac{2}{x^{2}+y^{2}}),r\\neq 0$",
            "C. $\\vec{J}=0,r\\neq 0$",
            "D. $\\vec{J}=\\frac{B_{0}\\hat{z}}{\\mu _{0}}(\\frac{1}{x^{2}+y^{2}}),r\\neq 0$"
          ],
          "correct_answer": "C",
          "explanation": "Applying $\\nabla \\cdot H=J$ $\\begin{aligned} \\nabla \\times B&=\\left|\\begin{array}{ccc} \\hat{a}_{x} & \\hat{a}_{y} & \\hat{a}_{z} \\\\ \\frac{\\partial}{\\partial x} & \\frac{\\partial}{\\partial y} & \\frac{\\partial}{\\partial z} \\\\ \\frac{-y}{x^{2}+y^{2}} & \\frac{x}{x^{2}+y^{2}} & 0 \\end{array}\\right|=0 \\\\ J&=0 \\end{aligned}$",
          "year": 2009,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "If a vector field $\\vec{V}$ is related to another vector field $\\vec{A}$ through $\\vec{V}=\\bigtriangledown *\\vec{A}$ , which of the following is true? (Note : C and $S_C$ refer to any closed contour and any surface whose boundary is C.)",
          "images": [],
          "options": [
            "A. $\\oint_{C}^{}\\vec{V} \\cdot \\vec{dl}=\\int_{S_{C}}^{} \\int_{}^{}\\vec{A}\\cdot \\vec{dS}$",
            "B. $\\oint_{C}^{}\\vec{A} \\cdot \\vec{dl}=\\int_{S_{C}}^{} \\int_{}^{}\\vec{V}\\cdot \\vec{dS}$",
            "C. $\\oint_{C}^{}\\triangledown \\times \\vec{V} \\cdot \\vec{dl}=\\int_{S_{C}}^{} \\int_{}^{}\\triangledown \\times \\vec{A}\\cdot \\vec{dS}$",
            "D. $\\oint_{C}^{}\\triangledown \\times \\vec{A} \\cdot \\vec{dl}=\\int_{S_{C}}^{} \\int_{}^{}\\vec{V}\\cdot \\vec{dS}$"
          ],
          "correct_answer": "B",
          "explanation": "Currently no explanation available",
          "year": 2009,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "Two infinitely long wires carrying current are as shown in the figure below. One wire is in the y-z plane and parallel to the y-axis. The other wire is in the x-y plane and parallel to the x-axis. Which components of the resulting magnetic field are non-zero at the origin ?",
          "images": [
            {
              "index": 1,
              "filename": "Electromagnetics/two-infinitely-long-wires-carrying_img1.jpg"
            }
          ],
          "options": [
            "A. x,y, z components",
            "B. x,y components",
            "C. y,z components",
            "D. x,z components"
          ],
          "correct_answer": "D",
          "explanation": "$H_{dicection}$ due to any current wire = $I$ flow direction $\\times$ (cross) radial vector from current to point of consideration.",
          "year": 2009,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "For static electric and magnetic fields in an inhomogeneous source-free medium, which of the following represents the correct form of Maxwell's equations ?",
          "images": [],
          "options": [
            "A. $\\bigtriangledown \\cdot E=0,\\bigtriangledown \\times B=0$",
            "B. $\\bigtriangledown \\cdot E=0,\\bigtriangledown \\cdot B=0$",
            "C. $\\bigtriangledown \\times E=0,\\bigtriangledown \\times B=0$",
            "D. $\\bigtriangledown \\times E=0,\\bigtriangledown \\cdot B=0$"
          ],
          "correct_answer": "D",
          "explanation": "Intensity - curl - line integral Density divergence - surface integral This is order of understanding Maxwell's equations. For any material $\\begin{array}{cc} \\nabla \\times E=0 & \\nabla \\cdot B=0 \\\\ \\nabla \\times H=J & \\nabla \\cdot D=\\rho_{v} \\end{array}$ For source free like charge or current free conditions $\\nabla \\times E=0 \\quad \\nabla \\cdot B=0$ $\\nabla \\times H=0 \\quad \\nabla \\cdot D=0$ If $D=\\epsilon$ E and $B=\\mu$ H and $\\in$ or $\\mu$ are constant with distance or direction then $\\begin{aligned} \\nabla \\cdot(\\in E) &=0 & & \\nabla \\times \\frac{B}{\\mu}=0 \\\\ \\nabla \\cdot E &=0 & & \\nabla \\times B=0 \\end{aligned}$ These are called as homogeneous/isotropic medium. For non-homogeneous material. However they are not valid.",
          "year": 2008,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "If C is closed curve enclosing a surface $S$ , then the magnetic field intensity $\\vec{H}$ , the current density $\\vec{J}$ and the electric flux density $\\vec{D}$ are related by",
          "images": [],
          "options": [
            "A. $\\int \\int_{S} \\vec{H}\\cdot \\vec{ds}= \\oint_{c}(\\vec{j}+\\frac{\\partial \\vec{D}}{\\partial t})\\cdot d\\vec{l}$",
            "B. $\\int_{S} \\vec{H}\\cdot \\vec{dl}=\\oint \\oint_{S}(\\vec{j}+\\frac{\\partial \\vec{D}}{\\partial t})\\cdot d\\vec{s}$",
            "C. $\\oint \\oint_{S} \\vec{H}\\cdot \\vec{ds}=\\int_{C}(\\vec{j}+\\frac{\\partial \\vec{D}}{\\partial t}) \\cdot d\\vec{l}$",
            "D. $\\oint_{C} \\vec{H}\\cdot \\vec{dl}\\oint_{c}=\\int \\int_{S}(\\vec{j}+\\frac{\\partial \\vec{D}}{\\partial t})\\cdot d\\vec{s}$"
          ],
          "correct_answer": "D",
          "explanation": "Currently no explanation available",
          "year": 2007,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "A medium is divide into regions I and II about x = 0 plane, as shown in the figure below. An electromagnetic wave with electric field $E_{1}=4\\hat{a}_{x}+3\\hat{a}_{y}+5\\hat{a}_{z}$ is incident normally on the interface from region I . The electric file $E_2$ in region II at the interface is",
          "images": [
            {
              "index": 1,
              "filename": "Electromagnetics/a-medium-is-divide-into-regions-i-a_img1.jpg"
            }
          ],
          "options": [
            "A. $E_{2}=E_{1}$",
            "B. $4\\hat{a}_{x}+0.75\\hat{a}_{y}-1.25\\hat{a}_{z}$",
            "C. $3\\hat{a}_{x}+3\\hat{a}_{y}+5\\hat{a}_{z}$",
            "D. $-3\\hat{a}_{x}+3\\hat{a}_{y}+5\\hat{a}_{z}$"
          ],
          "correct_answer": "C",
          "explanation": "$\\begin{aligned} \\vec{E}_{t_{1}} &=3 \\hat{a}_{y}+5 \\hat{a}_{z}=\\vec{E}_{t_{2}} \\\\ \\vec{D}_{n_{1}} &=\\vec{D}_{n_{2}} \\\\ \\epsilon_{2} \\vec{E}_{n_{2}} &=\\epsilon_{1} \\vec{E}_{n_{1}} \\\\ \\vec{E}_{n_{2}} &=\\frac{3 \\times 4 \\hat{a}_{x}}{4}=3 \\hat{a}_{x} \\\\ \\therefore \\quad \\vec{E}_{2} &=\\vec{E}_{t_{2}}+\\vec{E}_{n_{2}} \\\\ &=3 \\hat{a}_{y}+5 \\hat{a}_{z}+3 \\hat{a}_{x} \\end{aligned}$",
          "year": 2006,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "If the electric field intensity is given by $E = (xu_{x}+yu_{y}+zu_{z})$ volt/m, the potential difference between X(2,0,0) and Y(1,2,3) is",
          "images": [],
          "options": [
            "A. $+1$ volt",
            "B. $-1$ volt",
            "C. $+5$ volt",
            "D. $+6$ volt"
          ],
          "correct_answer": "C",
          "explanation": "$\\begin{aligned} V &=-\\int \\vec{E} \\cdot \\vec{d} \\mid \\\\ &=-\\left[\\int_{1}^{2} x d x \\vec{u}_{x}+\\int_{2}^{0} y d y \\vec{u}_{y}+\\int_{3}^{0} z d z \\vec{u}_{z}\\right] \\\\ &=-\\left[\\left.\\frac{x^{2}}{2}\\right|_{1} ^{2}+\\left.\\frac{y^{2}}{2}\\right|_{2} ^{0}+\\left.\\frac{z^{2}}{2}\\right|_{3}\\right] \\\\ &=-\\frac{1}{2}\\left[2^{2}-1^{2}+0^{2}-2^{2}+0^{2}-3^{2}\\right] \\\\ &=-\\frac{1}{2} x-10=5 \\mathrm{V} \\end{aligned}$",
          "year": 2003,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "Medium 1 has the electrical permittivity $\\varepsilon _{1}=1.5\\varepsilon _{0}$ farad/m and occupies the region to the left of x = 0 plane. Medium 2 has the electrical permittivity $\\varepsilon _{2}=2.5\\varepsilon _{0}$ farad/m and occupies the region to the right of x = 0 plane. If $E_{1}$ in medium 1 is $E_{1}$ = $(2u_{x}-3u_{y}+1u_{z})$ volt/m, then $E_{2}$ in medium 2 is",
          "images": [],
          "options": [
            "A. $(2.0u_{x}-7.5u_{y}+2.5u_{z})$ volt/m",
            "B. $(2.0u_{x}-2.0u_{y}+0.6u_{z})$ volt/m",
            "C. $(1.2u_{x}-3.0u_{y}+1.0u_{z})$ volt/m",
            "D. $(1.2u_{x}-2.0u_{y}+0.6u_{z})$ volt/m"
          ],
          "correct_answer": "C",
          "explanation": "$\\begin{aligned} \\vec{E}_{1} &=2 u_{x}-3 u_{y}+1 u_{z} \\\\ \\vec{E}_{1 t} &=-3 u_{y}+u_{z}=E_{2 t} &(x=0 \\text { plane}) \\\\ \\vec{E}_{1 n} &=2 u_{x} \\\\ \\vec{D}_{1 n} &=\\vec{D}_{2 n}=\\epsilon \\vec{E} \\\\ \\Rightarrow \\epsilon_{1} \\vec{E}_{1 n} &=\\epsilon_{2} \\vec{E}_{2 n} \\\\ &=1.5 \\epsilon_{0} \\cdot 2 u_{x}=2.5 \\epsilon_{0} \\cdot \\vec{E}_{2 n} \\\\ \\vec{E}_{2 n} &=\\frac{3}{2.5} u_{x}=1.2 u_{x} \\\\ \\vec{E}_{2} &=\\vec{E}_{2 t}+\\vec{E}_{2 n} \\\\ \\vec{E}_{2} &=-3 u_{y}+u_{z}+1.2 u_{x} \\\\ &=1.2u_{x}-3.0u_{y}+1.0u_{z} \\end{aligned}$",
          "year": 2003,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "The unit of $\\bigtriangledown \\times H$ is",
          "images": [],
          "options": [
            "A. Ampere",
            "B. Ampere/meter",
            "C. $Ampere/meter^{2}$",
            "D. Ampere-meter"
          ],
          "correct_answer": "C",
          "explanation": "$\\begin{aligned} \\nabla \\times \\vec{H} &=\\frac{\\partial \\bar{D}}{\\partial t}+\\vec{J} \\\\ \\frac{1}{m} \\times \\frac{\\text { Ampere }}{m} &=\\frac{A}{m^{2}} \\end{aligned}$",
          "year": 2003,
          "marks": 1,
          "exam_type": "GATE EC",
          "question_type": "MCQ"
        },
        {
          "topic_name": "Basics of Electromagnetics",
          "question_text": "The electric field on the surface of a perfect conductor is 2 V/m. The conductor is immersed in water with $\\epsilon =80\\epsilon_{0}$ . The surface charge density on the conductor is ( $\\epsilon =10^{-9}/(36\\pi)F/m$ )",
          "images": [],
          "options": [
            "A. $0 \\; C/m^{2}$",
            "B. $2 \\; C/m^{2}$",
            "C. $1.8 \\times 10^{-11} \\; C/m^{2}$",
            "D. $1.14 \\times 10^{-9} \\; C/m^{2}$"
          ],
          "correct_answer": "D",
          "explanation": "The surface change density is equally to normal flux density $\\begin{aligned} D_{\\text {normal }} &=\\rho_{s} \\\\ D &=\\rho_{s}=\\epsilon E=80 \\cdot \\epsilon \\cdot 2 \\end{aligned}$",
          "year": 2002,
          "marks": 1,
          "exam_type": "GATE EC",
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

        // Fix correct_answer format: Keep only the letter for MCQ/MSQ if it follows "A. text"
        let cleanCorrectAnswer = pyq.correct_answer;
        if ((pyq.question_type === "MCQ" || pyq.question_type === "MSQ") && cleanCorrectAnswer.includes('.')) {
          cleanCorrectAnswer = cleanCorrectAnswer.split('.')[0].trim();
        }

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
            question_text_hindi: pyq.question_text_hindi,
            options: pyq.options,
            options_hindi: pyq.options_hindi,
            correct_answer: cleanCorrectAnswer,
            explanation: pyq.explanation,
            explanation_hindi: pyq.explanation_hindi,
            year: pyq.year || Math.floor(Math.random() * 26) + 2000,
            exam_type: item.pattern.exam_type,
            question_type: pyq.question_type,
            images: cleanImages,
          },
          create: {
            pattern: { connect: { id: pattern.id } },
            question_text: cleanQuestionText,
            question_text_hindi: pyq.question_text_hindi,
            options: pyq.options,
            options_hindi: pyq.options_hindi,
            correct_answer: cleanCorrectAnswer,
            explanation: pyq.explanation,
            explanation_hindi: pyq.explanation_hindi,
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
