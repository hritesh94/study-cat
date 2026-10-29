// Exam syllabi the app knows. A goal for one of these gets its chapter list
// from here (saved on the goal); other goals ("board exams", "something
// else") get their chapters from the roadmap, which reads the syllabus you
// paste or photograph.
import { JEE_MAIN } from './jee-main'
import { NEET_UG } from './neet'

export const SYLLABI = { neet: NEET_UG, jee_main: JEE_MAIN }

export const syllabusFor = (kind) => SYLLABI[kind] ?? null
