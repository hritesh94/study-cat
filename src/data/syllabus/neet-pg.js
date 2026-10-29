// NEET PG syllabus: the 19 MBBS subjects, each split into its main topics,
// with a ROUGH weightage (high / medium / low).
//
// Officially, NBEMS says the syllabus is "the subject/knowledge area as per
// the MBBS Curriculum" of the National Medical Commission, and it doesn't
// publish a topic list or a weightage. So:
//   • the 19 subjects are official (3 pre-clinical, 5 para-clinical, 11 clinical)
//   • the topics inside each subject are our own grouping of the standard
//     MBBS topics, sized for planning
//   • the weightage is only a rough guide from past papers (Medicine,
//     Surgery, OBG, PSM, Pathology and Pharmacology bring the most questions)
//
// ⚠️ Double-check against the NEET PG information bulletin on natboard.edu.in
// before relying on it.
export const NEET_PG = {
  id: 'neet_pg',
  name: 'NEET PG',
  lastChecked: '2026-10-30',
  sources: [
    'NBEMS, NEET PG 2026 information bulletin (natboard.edu.in): the syllabus is the MBBS curriculum of the NMC',
    'Careers360, "NEET PG 2026 chapter-wise weightage" (medicine.careers360.com/articles/neet-pg-2026-chapter-wise-weightage)',
    'Medical Dialogues, "Appearing for NEET PG 2026: exam scheme, marking allocation" (medicaldialogues.in)',
  ],
  subjects: [
    'Anatomy',
    'Physiology',
    'Biochemistry',
    'Pathology',
    'Pharmacology',
    'Microbiology',
    'Forensic Medicine',
    'Community Medicine',
    'Medicine',
    'Surgery',
    'Obstetrics & Gynaecology',
    'Paediatrics',
    'ENT',
    'Ophthalmology',
    'Orthopaedics',
    'Dermatology',
    'Psychiatry',
    'Anaesthesia',
    'Radiology',
  ],
  chapters: [
    // ── pre-clinical ──
    { id: 'ana-general', subject: 'Anatomy', name: 'General Anatomy and Embryology', weight: 'medium' },
    { id: 'ana-histology', subject: 'Anatomy', name: 'Histology', weight: 'low' },
    { id: 'ana-upper-limb', subject: 'Anatomy', name: 'Upper Limb', weight: 'medium' },
    { id: 'ana-lower-limb', subject: 'Anatomy', name: 'Lower Limb', weight: 'medium' },
    { id: 'ana-thorax', subject: 'Anatomy', name: 'Thorax', weight: 'low' },
    { id: 'ana-abdomen-pelvis', subject: 'Anatomy', name: 'Abdomen and Pelvis', weight: 'medium' },
    { id: 'ana-head-neck', subject: 'Anatomy', name: 'Head and Neck', weight: 'high' },
    { id: 'ana-neuroanatomy', subject: 'Anatomy', name: 'Neuroanatomy', weight: 'high' },

    { id: 'phy-general', subject: 'Physiology', name: 'General Physiology, Nerve and Muscle', weight: 'medium' },
    { id: 'phy-blood', subject: 'Physiology', name: 'Blood and Immunity', weight: 'low' },
    { id: 'phy-cvs', subject: 'Physiology', name: 'Cardiovascular Physiology', weight: 'high' },
    { id: 'phy-respiratory', subject: 'Physiology', name: 'Respiratory Physiology', weight: 'medium' },
    { id: 'phy-renal', subject: 'Physiology', name: 'Renal Physiology and Acid-Base', weight: 'medium' },
    { id: 'phy-gi', subject: 'Physiology', name: 'Gastrointestinal Physiology', weight: 'low' },
    { id: 'phy-endocrine', subject: 'Physiology', name: 'Endocrine and Reproductive Physiology', weight: 'medium' },
    { id: 'phy-neuro', subject: 'Physiology', name: 'Neurophysiology and Special Senses', weight: 'high' },

    { id: 'bio-enzymes', subject: 'Biochemistry', name: 'Enzymes and Biological Oxidation', weight: 'medium' },
    { id: 'bio-carbohydrates', subject: 'Biochemistry', name: 'Carbohydrate Metabolism', weight: 'medium' },
    { id: 'bio-lipids', subject: 'Biochemistry', name: 'Lipid Metabolism', weight: 'medium' },
    { id: 'bio-proteins', subject: 'Biochemistry', name: 'Amino Acid and Protein Metabolism', weight: 'medium' },
    { id: 'bio-molecular', subject: 'Biochemistry', name: 'Molecular Biology and Genetics', weight: 'high' },
    { id: 'bio-vitamins', subject: 'Biochemistry', name: 'Vitamins, Minerals and Nutrition', weight: 'medium' },

    // ── para-clinical ──
    { id: 'path-general', subject: 'Pathology', name: 'General Pathology: Cell Injury, Inflammation, Neoplasia', weight: 'high' },
    { id: 'path-haematology', subject: 'Pathology', name: 'Haematology', weight: 'high' },
    { id: 'path-immuno', subject: 'Pathology', name: 'Immunopathology and Genetic Disorders', weight: 'medium' },
    { id: 'path-cvs-resp', subject: 'Pathology', name: 'Cardiovascular and Respiratory Pathology', weight: 'medium' },
    { id: 'path-gi-renal', subject: 'Pathology', name: 'GI, Liver and Renal Pathology', weight: 'medium' },
    { id: 'path-cns-endo', subject: 'Pathology', name: 'CNS, Endocrine, Bone and Breast Pathology', weight: 'medium' },

    { id: 'pharm-general', subject: 'Pharmacology', name: 'General Pharmacology', weight: 'high' },
    { id: 'pharm-ans', subject: 'Pharmacology', name: 'Autonomic Nervous System Drugs', weight: 'medium' },
    { id: 'pharm-cns', subject: 'Pharmacology', name: 'CNS Drugs', weight: 'medium' },
    { id: 'pharm-cvs-renal', subject: 'Pharmacology', name: 'Cardiovascular and Renal Drugs', weight: 'medium' },
    { id: 'pharm-antimicrobials', subject: 'Pharmacology', name: 'Antimicrobials', weight: 'high' },
    { id: 'pharm-misc', subject: 'Pharmacology', name: 'Anticancer, Endocrine and Other Drugs', weight: 'medium' },

    { id: 'micro-general', subject: 'Microbiology', name: 'General Microbiology and Immunology', weight: 'high' },
    { id: 'micro-bacteriology', subject: 'Microbiology', name: 'Bacteriology', weight: 'high' },
    { id: 'micro-virology', subject: 'Microbiology', name: 'Virology', weight: 'medium' },
    { id: 'micro-mycology', subject: 'Microbiology', name: 'Mycology', weight: 'low' },
    { id: 'micro-parasitology', subject: 'Microbiology', name: 'Parasitology', weight: 'medium' },

    { id: 'fmt-pathology', subject: 'Forensic Medicine', name: 'Forensic Pathology and Injuries', weight: 'medium' },
    { id: 'fmt-toxicology', subject: 'Forensic Medicine', name: 'Toxicology', weight: 'medium' },
    { id: 'fmt-jurisprudence', subject: 'Forensic Medicine', name: 'Medical Jurisprudence and Identification', weight: 'low' },

    { id: 'psm-epidemiology', subject: 'Community Medicine', name: 'Epidemiology and Biostatistics', weight: 'high' },
    { id: 'psm-communicable', subject: 'Community Medicine', name: 'Communicable Diseases', weight: 'high' },
    { id: 'psm-ncd', subject: 'Community Medicine', name: 'Non-Communicable Diseases', weight: 'medium' },
    { id: 'psm-nutrition-environment', subject: 'Community Medicine', name: 'Nutrition, Environment and Occupational Health', weight: 'medium' },
    { id: 'psm-mch', subject: 'Community Medicine', name: 'Maternal and Child Health, Family Planning', weight: 'medium' },
    { id: 'psm-programmes', subject: 'Community Medicine', name: 'National Health Programmes and Health Care Delivery', weight: 'high' },

    // ── clinical ──
    { id: 'med-cardiology', subject: 'Medicine', name: 'Cardiology', weight: 'high' },
    { id: 'med-respiratory', subject: 'Medicine', name: 'Respiratory Medicine', weight: 'high' },
    { id: 'med-gastro', subject: 'Medicine', name: 'Gastroenterology and Hepatology', weight: 'high' },
    { id: 'med-nephrology', subject: 'Medicine', name: 'Nephrology', weight: 'medium' },
    { id: 'med-endocrinology', subject: 'Medicine', name: 'Endocrinology', weight: 'high' },
    { id: 'med-neurology', subject: 'Medicine', name: 'Neurology', weight: 'high' },
    { id: 'med-haem-onc', subject: 'Medicine', name: 'Haematology and Oncology', weight: 'medium' },
    { id: 'med-infectious', subject: 'Medicine', name: 'Infectious Diseases', weight: 'medium' },
    { id: 'med-rheumatology', subject: 'Medicine', name: 'Rheumatology', weight: 'medium' },

    { id: 'surg-general', subject: 'Surgery', name: 'General Surgery, Trauma and Burns', weight: 'high' },
    { id: 'surg-gi', subject: 'Surgery', name: 'GI and Hepatobiliary Surgery', weight: 'high' },
    { id: 'surg-endocrine', subject: 'Surgery', name: 'Breast, Thyroid and Endocrine Surgery', weight: 'high' },
    { id: 'surg-urology', subject: 'Surgery', name: 'Urology', weight: 'medium' },
    { id: 'surg-vascular', subject: 'Surgery', name: 'Vascular and Cardiothoracic Surgery', weight: 'medium' },
    { id: 'surg-neuro-plastic', subject: 'Surgery', name: 'Neurosurgery and Plastic Surgery', weight: 'medium' },

    { id: 'obg-normal', subject: 'Obstetrics & Gynaecology', name: 'Normal Pregnancy and Antenatal Care', weight: 'high' },
    { id: 'obg-complications', subject: 'Obstetrics & Gynaecology', name: 'Complications of Pregnancy', weight: 'high' },
    { id: 'obg-labour', subject: 'Obstetrics & Gynaecology', name: 'Labour and Puerperium', weight: 'medium' },
    { id: 'obg-menstrual', subject: 'Obstetrics & Gynaecology', name: 'Menstrual Disorders and Infertility', weight: 'medium' },
    { id: 'obg-oncology', subject: 'Obstetrics & Gynaecology', name: 'Gynaecological Oncology', weight: 'medium' },
    { id: 'obg-contraception', subject: 'Obstetrics & Gynaecology', name: 'Contraception', weight: 'medium' },

    { id: 'paed-growth', subject: 'Paediatrics', name: 'Growth, Development and Nutrition', weight: 'high' },
    { id: 'paed-neonatology', subject: 'Paediatrics', name: 'Neonatology', weight: 'high' },
    { id: 'paed-infections', subject: 'Paediatrics', name: 'Paediatric Infections and Immunisation', weight: 'medium' },
    { id: 'paed-systemic', subject: 'Paediatrics', name: 'Systemic Paediatrics', weight: 'medium' },
    { id: 'paed-genetic', subject: 'Paediatrics', name: 'Genetic and Metabolic Disorders', weight: 'low' },

    { id: 'ent-ear', subject: 'ENT', name: 'Ear', weight: 'medium' },
    { id: 'ent-nose', subject: 'ENT', name: 'Nose and Paranasal Sinuses', weight: 'medium' },
    { id: 'ent-throat', subject: 'ENT', name: 'Throat and Larynx', weight: 'medium' },

    { id: 'oph-optics', subject: 'Ophthalmology', name: 'Anatomy, Optics and Refraction', weight: 'medium' },
    { id: 'oph-cornea-lens', subject: 'Ophthalmology', name: 'Conjunctiva, Cornea, Lens and Uvea', weight: 'medium' },
    { id: 'oph-glaucoma-retina', subject: 'Ophthalmology', name: 'Glaucoma and Retina', weight: 'medium' },
    { id: 'oph-neuro-squint', subject: 'Ophthalmology', name: 'Neuro-ophthalmology and Squint', weight: 'low' },

    { id: 'ortho-trauma', subject: 'Orthopaedics', name: 'Fractures and Trauma', weight: 'medium' },
    { id: 'ortho-infections-tumours', subject: 'Orthopaedics', name: 'Bone and Joint Infections, Bone Tumours', weight: 'low' },
    { id: 'ortho-paeds-spine', subject: 'Orthopaedics', name: 'Paediatric Orthopaedics and Spine', weight: 'low' },

    { id: 'derm-infections', subject: 'Dermatology', name: 'Skin Infections and Infestations', weight: 'low' },
    { id: 'derm-papulosquamous', subject: 'Dermatology', name: 'Papulosquamous and Vesiculobullous Disorders', weight: 'low' },
    { id: 'derm-leprosy-sti', subject: 'Dermatology', name: 'Leprosy and STIs', weight: 'low' },

    { id: 'psy-psychoses', subject: 'Psychiatry', name: 'Psychoses and Mood Disorders', weight: 'low' },
    { id: 'psy-anxiety-substance', subject: 'Psychiatry', name: 'Anxiety, Substance Use and Child Psychiatry', weight: 'low' },

    { id: 'anaes-agents', subject: 'Anaesthesia', name: 'Anaesthetic Agents', weight: 'low' },
    { id: 'anaes-airway', subject: 'Anaesthesia', name: 'Airway, Monitoring and Resuscitation', weight: 'low' },

    { id: 'radio-diagnosis', subject: 'Radiology', name: 'Radiodiagnosis and Imaging', weight: 'low' },
    { id: 'radio-therapy', subject: 'Radiology', name: 'Radiotherapy and Nuclear Medicine', weight: 'low' },
  ],
}
