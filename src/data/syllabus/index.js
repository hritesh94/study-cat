// Exam syllabi the app knows. A goal for one of these gets its chapter list
// from here (saved on the goal); other goals ("board exams", "something
// else") get their chapters from the roadmap, which reads the syllabus you
// paste or photograph.
import { JEE_MAIN } from './jee-main'
import { NEET_UG } from './neet'
import { NEET_PG } from './neet-pg'

export const SYLLABI = { neet: NEET_UG, neet_pg: NEET_PG, jee_main: JEE_MAIN }

export const syllabusFor = (kind) => SYLLABI[kind] ?? null
