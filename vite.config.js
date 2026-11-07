import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Solo para desarrollo (npm run dev): a dónde reenviar /api y Socket.io.
  // Ejemplo: VITE_API_TARGET=http://192.168.240.106 npm run dev
  const target = env.VITE_API_TARGET || 'http://localhost:80'

  return {
    plugins: [react()],
    base: '/CTI/',
    server: {
      proxy: {
        '/api': { target, changeOrigin: true },
        '/socket.io': { target, changeOrigin: true, ws: true },
        '/Sonidos': { target, changeOrigin: true }
      }
    }
  }
})
