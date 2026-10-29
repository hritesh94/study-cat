// NEET UG syllabus: chapters, with a ROUGH weightage (high / medium / low).
//
// Physics and Chemistry follow the units of the official syllabus. Biology's
// units are big (e.g. "Human Physiology"), so they're split into the NCERT
// chapters each unit lists, which is a better size for planning.
// The weightage is only a rough guide from past papers, not official.
//
// ⚠️ Double-check against the official syllabus PDF before relying on it:
// the NMC publishes it (nmc.org.in) and NTA links it from neet.nta.nic.in.
export const NEET_UG = {
  id: 'neet',
  name: 'NEET UG',
  lastChecked: '2026-10-30',
  sources: [
    'NMC, "Updated syllabus for NEET UG 2026" (nmc.org.in), same units as the 2025 syllabus',
    'Careers360 news, Dec 2025: "NEET UG 2026 syllabus finalised; no chapters removed in physics, chemistry, biology"',
    'NCERT Class 11 and 12 Biology textbooks (rationalised), for the chapter split',
  ],
  subjects: ['Physics', 'Chemistry', 'Biology'],
  chapters: [
    // ── Physics (20 units) ──
    { id: 'phy-measurement', subject: 'Physics', name: 'Physics and Measurement', weight: 'low' },
    { id: 'phy-kinematics', subject: 'Physics', name: 'Kinematics', weight: 'medium' },
    { id: 'phy-laws-of-motion', subject: 'Physics', name: 'Laws of Motion', weight: 'medium' },
    { id: 'phy-work-energy', subject: 'Physics', name: 'Work, Energy and Power', weight: 'medium' },
    { id: 'phy-rotational', subject: 'Physics', name: 'Rotational Motion', weight: 'high' },
    { id: 'phy-gravitation', subject: 'Physics', name: 'Gravitation', weight: 'medium' },
    { id: 'phy-solids-liquids', subject: 'Physics', name: 'Properties of Solids and Liquids', weight: 'medium' },
    { id: 'phy-thermodynamics', subject: 'Physics', name: 'Thermodynamics', weight: 'high' },
    { id: 'phy-kinetic-theory', subject: 'Physics', name: 'Kinetic Theory of Gases', weight: 'low' },
    { id: 'phy-oscillations-waves', subject: 'Physics', name: 'Oscillations and Waves', weight: 'medium' },
    { id: 'phy-electrostatics', subject: 'Physics', name: 'Electrostatics', weight: 'high' },
    { id: 'phy-current', subject: 'Physics', name: 'Current Electricity', weight: 'high' },
    { id: 'phy-magnetism', subject: 'Physics', name: 'Magnetic Effects of Current and Magnetism', weight: 'high' },
    { id: 'phy-emi-ac', subject: 'Physics', name: 'Electromagnetic Induction and Alternating Currents', weight: 'medium' },
    { id: 'phy-em-waves', subject: 'Physics', name: 'Electromagnetic Waves', weight: 'low' },
    { id: 'phy-optics', subject: 'Physics', name: 'Optics', weight: 'high' },
    { id: 'phy-dual-nature', subject: 'Physics', name: 'Dual Nature of Matter and Radiation', weight: 'medium' },
    { id: 'phy-atoms-nuclei', subject: 'Physics', name: 'Atoms and Nuclei', weight: 'medium' },
    { id: 'phy-electronic-devices', subject: 'Physics', name: 'Electronic Devices', weight: 'medium' },
    { id: 'phy-experimental', subject: 'Physics', name: 'Experimental Skills', weight: 'low' },

    // ── Chemistry (20 units) ──
    { id: 'chem-basic-concepts', subject: 'Chemistry', name: 'Some Basic Concepts in Chemistry', weight: 'medium' },
    { id: 'chem-atomic-structure', subject: 'Chemistry', name: 'Atomic Structure', weight: 'medium' },
    { id: 'chem-bonding', subject: 'Chemistry', name: 'Chemical Bonding and Molecular Structure', weight: 'high' },
    { id: 'chem-thermodynamics', subject: 'Chemistry', name: 'Chemical Thermodynamics', weight: 'high' },
    { id: 'chem-solutions', subject: 'Chemistry', name: 'Solutions', weight: 'medium' },
    { id: 'chem-equilibrium', subject: 'Chemistry', name: 'Equilibrium', weight: 'high' },
    { id: 'chem-redox-electro', subject: 'Chemistry', name: 'Redox Reactions and Electrochemistry', weight: 'high' },
    { id: 'chem-kinetics', subject: 'Chemistry', name: 'Chemical Kinetics', weight: 'medium' },
    { id: 'chem-periodicity', subject: 'Chemistry', name: 'Classification of Elements and Periodicity in Properties', weight: 'medium' },
    { id: 'chem-p-block', subject: 'Chemistry', name: 'p-Block Elements', weight: 'high' },
    { id: 'chem-d-f-block', subject: 'Chemistry', name: 'd- and f-Block Elements', weight: 'medium' },
    { id: 'chem-coordination', subject: 'Chemistry', name: 'Co-ordination Compounds', weight: 'high' },
    { id: 'chem-purification', subject: 'Chemistry', name: 'Purification and Characterisation of Organic Compounds', weight: 'low' },
    { id: 'chem-organic-basics', subject: 'Chemistry', name: 'Some Basic Principles of Organic Chemistry', weight: 'high' },
    { id: 'chem-hydrocarbons', subject: 'Chemistry', name: 'Hydrocarbons', weight: 'medium' },
    { id: 'chem-halogens', subject: 'Chemistry', name: 'Organic Compounds Containing Halogens', weight: 'medium' },
    { id: 'chem-oxygen', subject: 'Chemistry', name: 'Organic Compounds Containing Oxygen', weight: 'high' },
    { id: 'chem-nitrogen', subject: 'Chemistry', name: 'Organic Compounds Containing Nitrogen', weight: 'medium' },
    { id: 'chem-biomolecules', subject: 'Chemistry', name: 'Biomolecules', weight: 'medium' },
    { id: 'chem-practical', subject: 'Chemistry', name: 'Principles Related to Practical Chemistry', weight: 'low' },

    // ── Biology (10 units, split into NCERT chapters) ──
    // Diversity in Living World
    { id: 'bio-living-world', subject: 'Biology', name: 'The Living World', weight: 'low' },
    { id: 'bio-classification', subject: 'Biology', name: 'Biological Classification', weight: 'medium' },
    { id: 'bio-plant-kingdom', subject: 'Biology', name: 'Plant Kingdom', weight: 'high' },
    { id: 'bio-animal-kingdom', subject: 'Biology', name: 'Animal Kingdom', weight: 'high' },
    // Structural Organisation in Plants and Animals
    { id: 'bio-morphology', subject: 'Biology', name: 'Morphology of Flowering Plants', weight: 'high' },
    { id: 'bio-anatomy', subject: 'Biology', name: 'Anatomy of Flowering Plants', weight: 'medium' },
    { id: 'bio-animal-tissues', subject: 'Biology', name: 'Structural Organisation in Animals', weight: 'medium' },
    // Cell Structure and Function
    { id: 'bio-cell', subject: 'Biology', name: 'Cell: The Unit of Life', weight: 'high' },
    { id: 'bio-biomolecules', subject: 'Biology', name: 'Biomolecules', weight: 'medium' },
    { id: 'bio-cell-cycle', subject: 'Biology', name: 'Cell Cycle and Cell Division', weight: 'high' },
    // Plant Physiology
    { id: 'bio-photosynthesis', subject: 'Biology', name: 'Photosynthesis in Higher Plants', weight: 'high' },
    { id: 'bio-respiration-plants', subject: 'Biology', name: 'Respiration in Plants', weight: 'medium' },
    { id: 'bio-plant-growth', subject: 'Biology', name: 'Plant Growth and Development', weight: 'medium' },
    // Human Physiology
    { id: 'bio-breathing', subject: 'Biology', name: 'Breathing and Exchange of Gases', weight: 'medium' },
    { id: 'bio-body-fluids', subject: 'Biology', name: 'Body Fluids and Circulation', weight: 'high' },
    { id: 'bio-excretion', subject: 'Biology', name: 'Excretory Products and their Elimination', weight: 'medium' },
    { id: 'bio-locomotion', subject: 'Biology', name: 'Locomotion and Movement', weight: 'medium' },
    { id: 'bio-neural', subject: 'Biology', name: 'Neural Control and Coordination', weight: 'high' },
    { id: 'bio-chemical-coordination', subject: 'Biology', name: 'Chemical Coordination and Integration', weight: 'high' },
    // Reproduction
    { id: 'bio-plant-reproduction', subject: 'Biology', name: 'Sexual Reproduction in Flowering Plants', weight: 'high' },
    { id: 'bio-human-reproduction', subject: 'Biology', name: 'Human Reproduction', weight: 'high' },
    { id: 'bio-reproductive-health', subject: 'Biology', name: 'Reproductive Health', weight: 'medium' },
    // Genetics and Evolution
    { id: 'bio-inheritance', subject: 'Biology', name: 'Principles of Inheritance and Variation', weight: 'high' },
    { id: 'bio-molecular-inheritance', subject: 'Biology', name: 'Molecular Basis of Inheritance', weight: 'high' },
    { id: 'bio-evolution', subject: 'Biology', name: 'Evolution', weight: 'medium' },
    // Biology and Human Welfare
    { id: 'bio-health-disease', subject: 'Biology', name: 'Human Health and Disease', weight: 'medium' },
    { id: 'bio-microbes', subject: 'Biology', name: 'Microbes in Human Welfare', weight: 'low' },
    // Biotechnology and Its Applications
    { id: 'bio-biotech-principles', subject: 'Biology', name: 'Biotechnology: Principles and Processes', weight: 'high' },
    { id: 'bio-biotech-applications', subject: 'Biology', name: 'Biotechnology and its Applications', weight: 'medium' },
    // Ecology and Environment
    { id: 'bio-organisms-populations', subject: 'Biology', name: 'Organisms and Populations', weight: 'medium' },
    { id: 'bio-ecosystem', subject: 'Biology', name: 'Ecosystem', weight: 'medium' },
    { id: 'bio-biodiversity', subject: 'Biology', name: 'Biodiversity and Conservation', weight: 'medium' },
  ],
}
