import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with NEET Physics and Chemistry topics...');

  // Remove previous NEET data from DB (removes Biology as requested)
 

  const patterns = [
    // --- Physics ---
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Physical World, Units and Measurements",
      "atomic_logic": "Generate NEET level questions on Physical World, Units and Measurements. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Motion in a Straight Line",
      "atomic_logic": "Generate NEET level questions on Motion in a Straight Line. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Motion in a Plane",
      "atomic_logic": "Generate NEET level questions on Motion in a Plane. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Laws of Motion",
      "atomic_logic": "Generate NEET level questions on Laws of Motion. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Work, Energy and Power",
      "atomic_logic": "Generate NEET level questions on Work, Energy and Power. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "System of Particles and Rotational Motion",
      "atomic_logic": "Generate NEET level questions on System of Particles and Rotational Motion. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Gravitation",
      "atomic_logic": "Generate NEET level questions on Gravitation. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Properties of Matter",
      "atomic_logic": "Generate NEET level questions on Properties of Matter. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Thermodynamics and Kinetic Theory",
      "atomic_logic": "Generate NEET level questions on Thermodynamics and Kinetic Theory. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Oscillations",
      "atomic_logic": "Generate NEET level questions on Oscillations. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Waves",
      "atomic_logic": "Generate NEET level questions on Waves. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Electrostatics",
      "atomic_logic": "Generate NEET level questions on Electrostatics. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Current Electricity",
      "atomic_logic": "Generate NEET level questions on Current Electricity. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Moving Charges and Magnetism",
      "atomic_logic": "Generate NEET level questions on Moving Charges and Magnetism. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Magnetism and Matter",
      "atomic_logic": "Generate NEET level questions on Magnetism and Matter. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Electromagnetic Induction and Alternating Currents",
      "atomic_logic": "Generate NEET level questions on Electromagnetic Induction and Alternating Currents. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Electromagnetic Waves",
      "atomic_logic": "Generate NEET level questions on Electromagnetic Waves. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Optics",
      "atomic_logic": "Generate NEET level questions on Optics. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Dual Nature of Matter and Radiation",
      "atomic_logic": "Generate NEET level questions on Dual Nature of Matter and Radiation. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Atoms and Nuclei",
      "atomic_logic": "Generate NEET level questions on Atoms and Nuclei. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Physics",
      "topic_name": "Semiconductor Electronics",
      "atomic_logic": "Generate NEET level questions on Semiconductor Electronics. Focus on NCERT concepts."
    },

    // --- Chemistry ---
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Some Basic Concepts of Chemistry",
      "atomic_logic": "Generate NEET level questions on Some Basic Concepts of Chemistry. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Structure of Atom",
      "atomic_logic": "Generate NEET level questions on Structure of Atom. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Classification of Elements and Periodicity in Properties",
      "atomic_logic": "Generate NEET level questions on Classification of Elements and Periodicity in Properties. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Chemical Bonding and Molecular Structure",
      "atomic_logic": "Generate NEET level questions on Chemical Bonding and Molecular Structure. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Chemical Thermodynamics",
      "atomic_logic": "Generate NEET level questions on Chemical Thermodynamics. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Equilibrium",
      "atomic_logic": "Generate NEET level questions on Equilibrium. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Redox Reactions",
      "atomic_logic": "Generate NEET level questions on Redox Reactions. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Some P-block Elements",
      "atomic_logic": "Generate NEET level questions on Some P-block Elements. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Organic Chemistry: Some Basic Principles and Techniques",
      "atomic_logic": "Generate NEET level questions on Organic Chemistry: Some Basic Principles and Techniques. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Hydrocarbons",
      "atomic_logic": "Generate NEET level questions on Hydrocarbons. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Solutions",
      "atomic_logic": "Generate NEET level questions on Solutions. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Electrochemistry",
      "atomic_logic": "Generate NEET level questions on Electrochemistry. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Chemical Kinetics",
      "atomic_logic": "Generate NEET level questions on Chemical Kinetics. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "P Block Elements",
      "atomic_logic": "Generate NEET level questions on P Block Elements. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "D and F Block Elements",
      "atomic_logic": "Generate NEET level questions on D and F Block Elements. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Coordination Compounds",
      "atomic_logic": "Generate NEET level questions on Coordination Compounds. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Haloalkanes and Haloarenes",
      "atomic_logic": "Generate NEET level questions on Haloalkanes and Haloarenes. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Alcohols, Phenols and Ethers",
      "atomic_logic": "Generate NEET level questions on Alcohols, Phenols and Ethers. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Aldehydes, Ketones and Carboxylic Acids",
      "atomic_logic": "Generate NEET level questions on Aldehydes, Ketones and Carboxylic Acids. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Organic Compounds Containing Nitrogen",
      "atomic_logic": "Generate NEET level questions on Organic Compounds Containing Nitrogen. Focus on NCERT concepts."
    },
    {
      "exam_type": "NEET",
      "branch": "Common",
      "subject": "Chemistry",
      "topic_name": "Biomolecules",
      "atomic_logic": "Generate NEET level questions on Biomolecules. Focus on NCERT concepts."
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

  console.log('✨ NEET Physics and Chemistry seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
