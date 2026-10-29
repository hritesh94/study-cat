// The weekly report (see ../_shared/handlers/report.js). Deploy: npx supabase functions deploy report --use-api
import { serveAi } from '../_shared/deno.js'
import { report } from '../_shared/handlers/report.js'

serveAi(report)
