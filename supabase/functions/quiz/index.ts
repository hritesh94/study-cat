// The break quiz (see ../_shared/handlers/quiz.js). Deploy: npx supabase functions deploy quiz --use-api
import { serveAi } from '../_shared/deno.js'
import { quiz } from '../_shared/handlers/quiz.js'

serveAi(quiz)
