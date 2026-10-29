// today's fresh lines (see ../_shared/handlers/pack.js). Deploy: npx supabase functions deploy pack --use-api
import { serveAi } from '../_shared/deno.js'
import { pack } from '../_shared/handlers/pack.js'

serveAi(pack)
