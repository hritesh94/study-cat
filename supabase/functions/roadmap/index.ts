// The roadmap planner (see ../_shared/handlers/roadmap.js). Deploy: npx supabase functions deploy roadmap --use-api
import { serveAi } from '../_shared/deno.js'
import { roadmap } from '../_shared/handlers/roadmap.js'

serveAi(roadmap)
