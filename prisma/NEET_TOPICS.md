# NEET Topics / Patterns Reference

Durable reference for seeding NEET PYQs via `prisma/seed_from_json.ts`.
Snapshot of the **73 NEET patterns** in the DB (queried on 2026-07-23, VPS `localhost:5433`).

All NEET patterns use `exam_type: "NEET"`, `branch: "Common"` (NEET is branchless).
The seed keys on **`exam_type + branch + topic_name`** — the `topic_name` below is the exact
DB pattern name and MUST match character-for-character (case, punctuation, spacing) or the seed
silently creates a new empty pattern instead of filling the existing one.

Scraper JSON files live in `../exam-scraper/extractor/neet_<slug>.json`. Their per-question
`topic_name` is a lowercase slug; map it to the Title-Case pattern below. `part-N` / `-1` / `-2`
files are chunks of the SAME topic → same pattern, merged by content hash.

> ⚠️ 31 Biology patterns exist in the **DB only** — they are NOT in `prisma/seed.ts`. A fresh
> `seed.ts` run elsewhere would not recreate them. Physics (21) + Chemistry (21) are in seed.ts.

---

## Physics — 21 patterns

| Pattern (`topic_name`) | PYQs (2026-07-23) |
|---|---|
| Physical World, Units and Measurements | 75 |
| Motion in a Straight Line | 63 |
| Motion in a Plane | 74 |
| Laws of Motion | 79 |
| Work, Energy and Power | 93 |
| System of Particles and Rotational Motion | 119 |
| Gravitation | 88 |
| Properties of Matter | 94 |
| Thermodynamics and Kinetic Theory | 116 |
| Oscillations | 78 |
| Waves | 96 |
| Electrostatics | 130 |
| Current Electricity | 154 |
| Moving Charges and Magnetism | 104 |
| Magnetism and Matter | 50 |
| Electromagnetic Induction and Alternating Currents | 123 |
| Electromagnetic Waves | 54 |
| Optics | 159 |
| Dual Nature of Matter and Radiation | 112 |
| Atoms and Nuclei | 185 |
| Semiconductor Electronics | 150 |

## Chemistry — 21 patterns

| Pattern (`topic_name`) | PYQs (2026-07-23) |
|---|---|
| Some Basic Concepts of Chemistry | 67 |
| Structure of Atom | 87 |
| Classification of Elements and Periodicity in Properties | 57 |
| Chemical Bonding and Molecular Structure | 127 |
| Chemical Thermodynamics | 88 |
| Equilibrium | 121 |
| Redox Reactions | 30 |
| Some P-block Elements | 62 |
| Organic Chemistry: Some Basic Principles and Techniques | 118 |
| Hydrocarbons | 88 |
| Solutions | 83 |
| Electrochemistry | 78 |
| Chemical Kinetics | 80 |
| P Block Elements | 101 |
| D and F Block Elements | 116 |
| Coordination Compounds | 111 |
| Haloalkanes and Haloarenes | 67 |
| Alcohols, Phenols and Ethers | 79 |
| Aldehydes, Ketones and Carboxylic Acids | 26 |
| Organic Compounds Containing Nitrogen | 59 |
| Biomolecules | 79 |

> Note: two distinct p-block patterns exist — **`Some P-block Elements`** (class-11) and
> **`P Block Elements`** (class-12). Map `neet_p-block-elements-questions.json` → `P Block Elements`.

## Biology — 31 patterns (DB only, not in seed.ts)

| Pattern (`topic_name`) | PYQs (2026-07-23) |
|---|---|
| The Living World | 0 |
| Biological Classification | 0 |
| Plant Kingdom | 0 |
| Animal Kingdom | 0 |
| Morphology of Flowering Plants | 0 |
| Anatomy of Flowering Plants | 0 |
| Structural Organisation in Animals | 0 |
| Cell - The Unit of Life | 0 |
| Cell Cycle and Cell Division | 0 |
| Photosynthesis in Higher Plants | 0 |
| Respiration in Plants | 0 |
| Plant Growth and Development | 0 |
| Breathing and Exchange of Gases | 0 |
| Body Fluids and Circulation | 0 |
| Excretory Products and Their Elimination | 0 |
| Locomotion and Movement | 0 |
| Neural Control and Coordination | 0 |
| Chemical Coordination and Integration | 0 |
| Sexual Reproduction in Flowering Plants | 0 |
| Human Reproduction | 0 |
| Reproductive Health | 0 |
| Principles of Inheritance and Variation | 0 |
| Molecular Basis of Inheritance | 0 |
| Evolution | 0 |
| Human Health and Diseases | 0 |
| Microbes in Human Welfare | 0 |
| Biotechnology Principles and Processes | 0 |
| Biotechnology and Its Applications | 0 |
| Organisms and Populations | 0 |
| Ecosystem | 0 |
| Biodiversity and Conservation | 0 |

---

## Slug → pattern mappings already seeded (extractor file names)

### Physics
| `neet_<slug>.json` | → `topic_name` |
|---|---|
| electrostatics-questions-part-1 / -part-2 | Electrostatics |
| current-electricity-questions-part-1 / -part-2 | Current Electricity |
| moving-charges-and-magnetism | Moving Charges and Magnetism |
| magnetism-and-matter-questions | Magnetism and Matter |
| electromagnetic-induction-and-alternating-currents-1 / -2 | Electromagnetic Induction and Alternating Currents |
| electromagnetic-waves-questions | Electromagnetic Waves |
| optics-questions-part-1 / -part-2 | Optics |
| dual-nature-of-matter-and-radiation | Dual Nature of Matter and Radiation |
| atoms-and-nuclei-part-1 / -part-2 | Atoms and Nuclei |
| semiconductor-electronics-part-1 / -part-2 | Semiconductor Electronics |

### Chemistry
| `neet_<slug>.json` | → `topic_name` |
|---|---|
| some-basic-concepts-of-chemistry | Some Basic Concepts of Chemistry |
| structure-of-atom | Structure of Atom |
| classification-of-elements-and-periodicity-in-properties | Classification of Elements and Periodicity in Properties |
| chemical-bonding-and-molecular-structure-part-1 / -part-2 | Chemical Bonding and Molecular Structure |
| chemical-thermodynamics | Chemical Thermodynamics |
| equilibrium-questions-part-1 / -part-2 | Equilibrium |
| redox-reactions-questions | Redox Reactions |
| some-p-block-elements-questions | Some P-block Elements |
| organic-chemistry-some-basic-principles-and-techniques-part-1 / -part-2 | Organic Chemistry: Some Basic Principles and Techniques |
| hydrocarbons-questions-part-1 | Hydrocarbons |
| chemistry-solutions-questions | Solutions |
| electrochemistry-questions | Electrochemistry |
| chemical-kinetics-questions | Chemical Kinetics |
| p-block-elements-questions | P Block Elements |
| d-and-f-block-elements-questions | D and F Block Elements |
| coordination-compounds-questions | Coordination Compounds |
| haloalkanes-and-haloarenes | Haloalkanes and Haloarenes |
| alcohols-phenols-and-ethers | Alcohols, Phenols and Ethers |
| aldehydes-ketones-and-carboxylic-acids-part-2 | Aldehydes, Ketones and Carboxylic Acids |
| organic-compounds-containing-nitrogen | Organic Compounds Containing Nitrogen |
| biomolecules | Biomolecules |

### Biology
| `neet_<slug>.json` | → `topic_name` |
|---|---|
| the-living-world | The Living World |
| biological-classification-questions-part-1 / -part-2 | Biological Classification |
| plant-kingdom-questions-part-1 / -part-2 | Plant Kingdom |
| animal-kingdom-questions-part-1 / -part-2 / -part-3 | Animal Kingdom |
| morphology-of-flowering-plants-questions-part-1 / -part-2 | Morphology of Flowering Plants |
| anatomy-of-flowering-plants-questions-part-1 / -part-2 | Anatomy of Flowering Plants |

---

## Seed workflow (recap)

1. Generate/rewrite explanations: `npx tsx scripts/json-rewrite-explanations.ts --auto --dir ../exam-scraper/extractor`
2. Point `FILE_TOPIC_MAP` in `prisma/seed_from_json.ts` at the batch's files using the mappings above.
3. Verify (read-only): keep `PATTERNS` in `prisma/verify_patterns.ts` in sync, then `npx tsx prisma/verify_patterns.ts`.
4. Seed (open the tunnel; `DB_DRIVER=standard` → VPS `localhost:5433`): `npx tsx prisma/seed_from_json.ts`.
   Confirm the `🎯 Target DB` banner before it writes.
