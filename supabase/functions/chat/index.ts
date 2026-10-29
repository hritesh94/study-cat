// The cat's chat (see ../_shared/handlers/chat.js). Deploy: npx supabase functions deploy chat --use-api
import { serveAi } from '../_shared/deno.js'
import { chat } from '../_shared/handlers/chat.js'

serveAi(chat)
