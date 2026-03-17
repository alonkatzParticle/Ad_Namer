import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load ALL env vars (including non-VITE_ ones) for use in this config file only.
  // They are never bundled into the frontend build.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        // In local dev, proxy /api/monday → Monday.com with the server-side key injected.
        '/api/monday': {
          target: 'https://api.monday.com',
          changeOrigin: true,
          rewrite: () => '/v2',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', env.MONDAY_API_KEY ?? '')
              proxyReq.setHeader('API-Version', '2024-01')
            })
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
