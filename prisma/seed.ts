import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with Mathematics topics...');

  const patterns = [
    // --- Class 12 Mathematics ---
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Limits, Continuity and Differentiability",
      "atomic_logic": "Generate JEE Main level questions on Limits, Continuity and Differentiability. Focus on L'Hopital's rule and derivability."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Inverse Trigonometric Functions",
      "atomic_logic": "Generate JEE Main level questions on Inverse Trigonometric Functions. Focus on Principal values and Properties."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Matrices and Determinants",
      "atomic_logic": "Generate JEE Main level questions on Matrices and Determinants. Focus on Adjoint, Inverse, and Cramer's Rule."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Differentiation",
      "atomic_logic": "Generate JEE Main level questions on Differentiation. Focus on Chain rule, Implicit functions, and Parametric differentiation."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Application of Derivatives",
      "atomic_logic": "Generate JEE Main level questions on Application of Derivatives. Focus on Tangents, Normals, and Maxima/Minima."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Indefinite Integrals",
      "atomic_logic": "Generate JEE Main level questions on Indefinite Integrals. Focus on Substitution, Parts, and Partial fractions."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Definite Integrals",
      "atomic_logic": "Generate JEE Main level questions on Definite Integrals. Focus on Properties of definite integrals and Leibniz rule."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Area Under The Curves",
      "atomic_logic": "Generate JEE Main level questions on Area Under The Curves. Focus on Integration between curves."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Differential Equations",
      "atomic_logic": "Generate JEE Main level questions on Differential Equations. Focus on Variable separable and Linear differential equations."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Vector Algebra",
      "atomic_logic": "Generate JEE Main level questions on Vector Algebra. Focus on Scalar/Vector Triple Product and Direction cosines."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Three Dimensional Geometry",
      "atomic_logic": "Generate JEE Main level questions on Three Dimensional Geometry. Focus on Lines and Planes in space."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Probability",
      "atomic_logic": "Generate JEE Main level questions on Probability. Focus on Bayes' theorem and Binomial distribution."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Statistics",
      "atomic_logic": "Generate JEE Main level questions on Statistics. Focus on Mean, Variance, and Standard Deviation."
    },
    // --- Class 11 Mathematics ---
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Sets and Relations",
      "atomic_logic": "Generate JEE Main level questions on Sets and Relations. Focus on Equivalence relations and Venn diagrams."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Functions",
      "atomic_logic": "Generate JEE Main level questions on Functions. Focus on Domain, Range, and One-to-one/Onto functions."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Complex Numbers",
      "atomic_logic": "Generate JEE Main level questions on Complex Numbers. Focus on De Moivre's theorem and Cube roots of unity."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Quadratic Equation and Inequalities",
      "atomic_logic": "Generate JEE Main level questions on Quadratic Equation and Inequalities. Focus on Nature of roots and Location of roots."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Permutations and Combinations",
      "atomic_logic": "Generate JEE Main level questions on Permutations and Combinations. Focus on Circular permutations and Distribution problems."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Binomial Theorem",
      "atomic_logic": "Generate JEE Main level questions on Binomial Theorem. Focus on General term and Binomial coefficients properties."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Sequences and Series",
      "atomic_logic": "Generate JEE Main level questions on Sequences and Series. Focus on Arithmetic and Geometric progressions (AP/GP)."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Straight Lines and Pair of Straight Lines",
      "atomic_logic": "Generate JEE Main level questions on Straight Lines. Focus on Slope forms and Angle between lines."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Circles",
      "atomic_logic": "Generate JEE Main level questions on Circles. Focus on Tangents, Normals, and Orthogonality."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Parabola",
      "atomic_logic": "Generate JEE Main level questions on Parabola. Focus on Standard equations and Focal chords."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Ellipse",
      "atomic_logic": "Generate JEE Main level questions on Ellipse. Focus on Eccentricity and Tangents."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Hyperbola",
      "atomic_logic": "Generate JEE Main level questions on Hyperbola. Focus on Asymptotes and Rectangular hyperbola."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Trigonometric Ratios and Identities",
      "atomic_logic": "Generate JEE Main level questions on Trigonometric Ratios and Identities. Focus on Multiple angles and Sum-to-product."
    },
    {
      "exam_type": "JEE Main",
      "branch": "Common",
      "subject": "Mathematics",
      "topic_name": "Logarithms",
      "atomic_logic": "Generate JEE Main level questions on Logarithms. Focus on Log properties and Logarithmic equations."
    }
  ];

  for (const pattern of patterns) {
    const created = await prisma.pattern.upsert({
      where: {
        pattern_identifier: {
          exam_type: pattern.exam_type,
          branch: pattern.branch,
          topic_name: pattern.topic_name
        }
      },
      update: {
        subject: pattern.subject,
        atomic_logic: pattern.atomic_logic
      },
      create: pattern,
    });
    console.log(`✅ Created pattern: ${created.topic_name}`);
  }

  console.log('✨ Mathematics seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
