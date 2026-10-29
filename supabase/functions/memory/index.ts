// what the cat learns after a chat (see ../_shared/handlers/memory.js). Deploy: npx supabase functions deploy memory --use-api
import { serveAi } from '../_shared/deno.js'
import { memory } from '../_shared/handlers/memory.js'

serveAi(memory)
