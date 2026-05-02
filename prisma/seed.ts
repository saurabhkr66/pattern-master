import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const patterns = [

  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Construction Materials And Management",
    "topic_name": "Construction Materials And Management",
    "atomic_logic": "Generate GATE-level questions on Construction Materials And Management in Construction Materials And Management. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Engineering Hydrology",
    "topic_name": "Evaporation Transpiration And Stream Flow Measurement",
    "atomic_logic": "Generate GATE-level questions on Evaporation Transpiration And Stream Flow Measurement in Engineering Hydrology. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Engineering Hydrology",
    "topic_name": "Flood Routing And Flood Control",
    "atomic_logic": "Generate GATE-level questions on Flood Routing And Flood Control in Engineering Hydrology. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Engineering Hydrology",
    "topic_name": "Infiltration Runoff And Hydrographs",
    "atomic_logic": "Generate GATE-level questions on Infiltration Runoff And Hydrographs in Engineering Hydrology. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Engineering Hydrology",
    "topic_name": "Precipitation And General Aspects Of Hydrology",
    "atomic_logic": "Generate GATE-level questions on Precipitation And General Aspects Of Hydrology in Engineering Hydrology. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Environmental Engineering",
    "topic_name": "Air And Noise Pollution",
    "atomic_logic": "Generate GATE-level questions on Air And Noise Pollution in Environmental Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Environmental Engineering",
    "topic_name": "Design Of Sewers And Sewerage System",
    "atomic_logic": "Generate GATE-level questions on Design Of Sewers And Sewerage System in Environmental Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Environmental Engineering",
    "topic_name": "Disposal Of Sewage Effluents",
    "atomic_logic": "Generate GATE-level questions on Disposal Of Sewage Effluents in Environmental Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Environmental Engineering",
    "topic_name": "Municipal Solid Waste Management",
    "atomic_logic": "Generate GATE-level questions on Municipal Solid Waste Management in Environmental Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Environmental Engineering",
    "topic_name": "Quality And Characteristics Of Waste Water",
    "atomic_logic": "Generate GATE-level questions on Quality And Characteristics Of Waste Water in Environmental Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Environmental Engineering",
    "topic_name": "Quality Characteristics Of Water",
    "atomic_logic": "Generate GATE-level questions on Quality Characteristics Of Water in Environmental Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Environmental Engineering",
    "topic_name": "Source Of Water Supply Distribution System And Well Hydraulics",
    "atomic_logic": "Generate GATE-level questions on Source Of Water Supply Distribution System And Well Hydraulics in Environmental Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Environmental Engineering",
    "topic_name": "Treatment Of Waste Water",
    "atomic_logic": "Generate GATE-level questions on Treatment Of Waste Water in Environmental Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Environmental Engineering",
    "topic_name": "Water Demand",
    "atomic_logic": "Generate GATE-level questions on Water Demand in Environmental Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Environmental Engineering",
    "topic_name": "Water Treatment",
    "atomic_logic": "Generate GATE-level questions on Water Treatment in Environmental Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Fluid Mechanics And Hydraulics",
    "topic_name": "Boundary Layer Theory Drag And Lift",
    "atomic_logic": "Generate GATE-level questions on Boundary Layer Theory Drag And Lift in Fluid Mechanics And Hydraulics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Fluid Mechanics And Hydraulics",
    "topic_name": "Buoyancy And Floatation",
    "atomic_logic": "Generate GATE-level questions on Buoyancy And Floatation in Fluid Mechanics And Hydraulics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Fluid Mechanics And Hydraulics",
    "topic_name": "Dimensional Analysis",
    "atomic_logic": "Generate GATE-level questions on Dimensional Analysis in Fluid Mechanics And Hydraulics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Fluid Mechanics And Hydraulics",
    "topic_name": "Flow Through Pipes",
    "atomic_logic": "Generate GATE-level questions on Flow Through Pipes in Fluid Mechanics And Hydraulics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Fluid Mechanics And Hydraulics",
    "topic_name": "Fluid Dynamics And Flow Measurements",
    "atomic_logic": "Generate GATE-level questions on Fluid Dynamics And Flow Measurements in Fluid Mechanics And Hydraulics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Fluid Mechanics And Hydraulics",
    "topic_name": "Fluid Kinematics",
    "atomic_logic": "Generate GATE-level questions on Fluid Kinematics in Fluid Mechanics And Hydraulics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Fluid Mechanics And Hydraulics",
    "topic_name": "Fluid Properties And Manometry",
    "atomic_logic": "Generate GATE-level questions on Fluid Properties And Manometry in Fluid Mechanics And Hydraulics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Fluid Mechanics And Hydraulics",
    "topic_name": "Hydraulic Pumps",
    "atomic_logic": "Generate GATE-level questions on Hydraulic Pumps in Fluid Mechanics And Hydraulics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Fluid Mechanics And Hydraulics",
    "topic_name": "Hydrostatic Forces",
    "atomic_logic": "Generate GATE-level questions on Hydrostatic Forces in Fluid Mechanics And Hydraulics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Fluid Mechanics And Hydraulics",
    "topic_name": "Impact Of Jets And Turbines",
    "atomic_logic": "Generate GATE-level questions on Impact Of Jets And Turbines in Fluid Mechanics And Hydraulics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Fluid Mechanics And Hydraulics",
    "topic_name": "Open Channel Flow",
    "atomic_logic": "Generate GATE-level questions on Open Channel Flow in Fluid Mechanics And Hydraulics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Fluid Mechanics And Hydraulics",
    "topic_name": "Turbulent Flow",
    "atomic_logic": "Generate GATE-level questions on Turbulent Flow in Fluid Mechanics And Hydraulics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Fluid Mechanics And Hydraulics",
    "topic_name": "Viscous Flow Of Incompressible Fluid",
    "atomic_logic": "Generate GATE-level questions on Viscous Flow Of Incompressible Fluid in Fluid Mechanics And Hydraulics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Geomatics Engineering",
    "topic_name": "Fundamental Concepts Of Surveying",
    "atomic_logic": "Generate GATE-level questions on Fundamental Concepts Of Surveying in Geomatics Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Geomatics Engineering",
    "topic_name": "Levelling And Contouring",
    "atomic_logic": "Generate GATE-level questions on Levelling And Contouring in Geomatics Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Geomatics Engineering",
    "topic_name": "Remote Sensing Gis Gps And Photogrammetry",
    "atomic_logic": "Generate GATE-level questions on Remote Sensing Gis Gps And Photogrammetry in Geomatics Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Geomatics Engineering",
    "topic_name": "Tacheometric Curve And Hydrographic Surveying",
    "atomic_logic": "Generate GATE-level questions on Tacheometric Curve And Hydrographic Surveying in Geomatics Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Geomatics Engineering",
    "topic_name": "Theodolites Compass And Traverse Surveying",
    "atomic_logic": "Generate GATE-level questions on Theodolites Compass And Traverse Surveying in Geomatics Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Geotechnical Engineering",
    "topic_name": "Classification Of Soils And Clay Minerals",
    "atomic_logic": "Generate GATE-level questions on Classification Of Soils And Clay Minerals in Geotechnical Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Geotechnical Engineering",
    "topic_name": "Compaction Of Soil",
    "atomic_logic": "Generate GATE-level questions on Compaction Of Soil in Geotechnical Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Geotechnical Engineering",
    "topic_name": "Consolidation Of Soils",
    "atomic_logic": "Generate GATE-level questions on Consolidation Of Soils in Geotechnical Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Geotechnical Engineering",
    "topic_name": "Deep Foundation",
    "atomic_logic": "Generate GATE-level questions on Deep Foundation in Geotechnical Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Geotechnical Engineering",
    "topic_name": "Effective Stress And Permeability",
    "atomic_logic": "Generate GATE-level questions on Effective Stress And Permeability in Geotechnical Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Geotechnical Engineering",
    "topic_name": "Properties Of Soils",
    "atomic_logic": "Generate GATE-level questions on Properties Of Soils in Geotechnical Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Geotechnical Engineering",
    "topic_name": "Retaining Wall Earth Pressure Theories",
    "atomic_logic": "Generate GATE-level questions on Retaining Wall Earth Pressure Theories in Geotechnical Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Geotechnical Engineering",
    "topic_name": "Seepage Analysis",
    "atomic_logic": "Generate GATE-level questions on Seepage Analysis in Geotechnical Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Geotechnical Engineering",
    "topic_name": "Shallow Foundation And Bearing Capacity",
    "atomic_logic": "Generate GATE-level questions on Shallow Foundation And Bearing Capacity in Geotechnical Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Geotechnical Engineering",
    "topic_name": "Shear Strength Of Soil",
    "atomic_logic": "Generate GATE-level questions on Shear Strength Of Soil in Geotechnical Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Geotechnical Engineering",
    "topic_name": "Soil Stabilization And Soil Exploration",
    "atomic_logic": "Generate GATE-level questions on Soil Stabilization And Soil Exploration in Geotechnical Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Geotechnical Engineering",
    "topic_name": "Stability Analysis Of Slopes",
    "atomic_logic": "Generate GATE-level questions on Stability Analysis Of Slopes in Geotechnical Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Geotechnical Engineering",
    "topic_name": "Stress Distribution In The Soil",
    "atomic_logic": "Generate GATE-level questions on Stress Distribution In The Soil in Geotechnical Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Irrigation Engineering",
    "topic_name": "Crop Water Requirements",
    "atomic_logic": "Generate GATE-level questions on Crop Water Requirements in Irrigation Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Irrigation Engineering",
    "topic_name": "Design And Construction Of Gravity Dams",
    "atomic_logic": "Generate GATE-level questions on Design And Construction Of Gravity Dams in Irrigation Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Irrigation Engineering",
    "topic_name": "Design Of Stable Channels",
    "atomic_logic": "Generate GATE-level questions on Design Of Stable Channels in Irrigation Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Irrigation Engineering",
    "topic_name": "Theories Of Seepage Spillways And Miscellaneous",
    "atomic_logic": "Generate GATE-level questions on Theories Of Seepage Spillways And Miscellaneous in Irrigation Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "RCC Structures",
    "topic_name": "Concrete Technology",
    "atomic_logic": "Generate GATE-level questions on Concrete Technology in RCC Structures. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "RCC Structures",
    "topic_name": "Footing Columns Beams And Slabs",
    "atomic_logic": "Generate GATE-level questions on Footing Columns Beams And Slabs in RCC Structures. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "RCC Structures",
    "topic_name": "Prestressed Concrete Beams",
    "atomic_logic": "Generate GATE-level questions on Prestressed Concrete Beams in RCC Structures. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "RCC Structures",
    "topic_name": "Shear Torsion Bond Anchorage And Development Length",
    "atomic_logic": "Generate GATE-level questions on Shear Torsion Bond Anchorage And Development Length in RCC Structures. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "RCC Structures",
    "topic_name": "Working Stress And Limit State Method",
    "atomic_logic": "Generate GATE-level questions on Working Stress And Limit State Method in RCC Structures. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Solid Mechanics",
    "topic_name": "Bending And Shear Stresses",
    "atomic_logic": "Generate GATE-level questions on Bending And Shear Stresses in Solid Mechanics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Solid Mechanics",
    "topic_name": "Deflection Of Beams",
    "atomic_logic": "Generate GATE-level questions on Deflection Of Beams in Solid Mechanics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Solid Mechanics",
    "topic_name": "Principal Stress And Principal Strain",
    "atomic_logic": "Generate GATE-level questions on Principal Stress And Principal Strain in Solid Mechanics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Solid Mechanics",
    "topic_name": "Properties Of Metals Stress And Strain",
    "atomic_logic": "Generate GATE-level questions on Properties Of Metals Stress And Strain in Solid Mechanics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Solid Mechanics",
    "topic_name": "Shear Force And Bending Moment",
    "atomic_logic": "Generate GATE-level questions on Shear Force And Bending Moment in Solid Mechanics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Solid Mechanics",
    "topic_name": "Theory Of Columns And Shear Centre",
    "atomic_logic": "Generate GATE-level questions on Theory Of Columns And Shear Centre in Solid Mechanics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Solid Mechanics",
    "topic_name": "Torsion",
    "atomic_logic": "Generate GATE-level questions on Torsion in Solid Mechanics. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Steel Structures",
    "topic_name": "Beams",
    "atomic_logic": "Generate GATE-level questions on Beams in Steel Structures. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Steel Structures",
    "topic_name": "Compression Member",
    "atomic_logic": "Generate GATE-level questions on Compression Member in Steel Structures. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Steel Structures",
    "topic_name": "Plastic Analysis",
    "atomic_logic": "Generate GATE-level questions on Plastic Analysis in Steel Structures. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Steel Structures",
    "topic_name": "Plate Griders And Industrial Roofs",
    "atomic_logic": "Generate GATE-level questions on Plate Griders And Industrial Roofs in Steel Structures. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Steel Structures",
    "topic_name": "Structural Fasteners",
    "atomic_logic": "Generate GATE-level questions on Structural Fasteners in Steel Structures. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Steel Structures",
    "topic_name": "Tension Member",
    "atomic_logic": "Generate GATE-level questions on Tension Member in Steel Structures. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Structural Analysis",
    "topic_name": "Arches",
    "atomic_logic": "Generate GATE-level questions on Arches in Structural Analysis. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Structural Analysis",
    "topic_name": "Determinacy And Indeterminacy",
    "atomic_logic": "Generate GATE-level questions on Determinacy And Indeterminacy in Structural Analysis. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Structural Analysis",
    "topic_name": "Influence Line Diagram And Rolling Loads",
    "atomic_logic": "Generate GATE-level questions on Influence Line Diagram And Rolling Loads in Structural Analysis. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Structural Analysis",
    "topic_name": "Matrix Method Of Structural Analysis",
    "atomic_logic": "Generate GATE-level questions on Matrix Method Of Structural Analysis in Structural Analysis. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Structural Analysis",
    "topic_name": "Methods Of Structural Analysis",
    "atomic_logic": "Generate GATE-level questions on Methods Of Structural Analysis in Structural Analysis. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Structural Analysis",
    "topic_name": "Trusses",
    "atomic_logic": "Generate GATE-level questions on Trusses in Structural Analysis. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Transportation Engineering",
    "topic_name": "Geometric Design Of Highway And Planning",
    "atomic_logic": "Generate GATE-level questions on Geometric Design Of Highway And Planning in Transportation Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Transportation Engineering",
    "topic_name": "Highway Maintenance",
    "atomic_logic": "Generate GATE-level questions on Highway Maintenance in Transportation Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Transportation Engineering",
    "topic_name": "Highway Materials",
    "atomic_logic": "Generate GATE-level questions on Highway Materials in Transportation Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Transportation Engineering",
    "topic_name": "Pavement Design",
    "atomic_logic": "Generate GATE-level questions on Pavement Design in Transportation Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Transportation Engineering",
    "topic_name": "Railway And Airport Engineering",
    "atomic_logic": "Generate GATE-level questions on Railway And Airport Engineering in Transportation Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
  },
  {
    "exam_type": "GATE",
    "branch": "CE",
    "subject": "Transportation Engineering",
    "topic_name": "Traffic Engineering",
    "atomic_logic": "Generate GATE-level questions on Traffic Engineering in Transportation Engineering. Focus on core concepts, previous year patterns, and numerical problem-solving techniques."
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

  console.log('✨ Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
