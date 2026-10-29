import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Recorded cat lines live in public/voice/<line-id>.mp3. This plugin tells
// the app which ones exist (as `import voiceFiles from 'virtual:voice-files'`),
// so it never has to try-and-fail downloading a file that isn't there.
function voiceFiles() {
  const dir = path.resolve('public/voice')
  const id = 'virtual:voice-files'
  const list = () => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)) : [])
  return {
    name: 'voice-files',
    resolveId: (source) => (source === id ? '\0' + id : null),
    load: (source) => (source === '\0' + id ? `export default ${JSON.stringify(list())}` : null),
    configureServer(server) {
      // dropping a new recording in while `npm run dev` runs reloads the page
      server.watcher.add(dir)
      const changed = (file) => {
        if (!file.startsWith(dir)) return
        const mod = server.moduleGraph.getModuleById('\0' + id)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', changed)
      server.watcher.on('unlink', changed)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), voiceFiles()],
})
