import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load ALL env vars (including non-VITE_ ones) for use in this config file only.
  // They are never bundled into the frontend build.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      // Local dev proxy for /api/monday — mirrors the Vercel serverless function.
      // Injects the API key server-side so it never reaches the browser bundle.
      {
        name: 'monday-api-dev',
        configureServer(server) {
          server.middlewares.use('/api/monday', (req: any, res: any) => {
            const chunks: Buffer[] = []
            req.on('data', (chunk: Buffer) => chunks.push(chunk))
            req.on('end', async () => {
              try {
                const body = Buffer.concat(chunks).toString()
                const response = await fetch('https://api.monday.com/v2', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: (env.MONDAY_API_KEY ?? '').trim(),
                    'API-Version': '2024-01',
                  },
                  body,
                })
                const data = await response.json()
                res.setHeader('Content-Type', 'application/json')
                res.statusCode = response.status
                res.end(JSON.stringify(data))
              } catch (err) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: String(err) }))
              }
            })
          })
        },
      },
    ],
    server: {
      port: 3000,
      strictPort: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
