import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Roteia /api/gdis/* → http://192.168.1.110/* (resolve CORS em dev)
      // Em produção: configurar ProxyPass no nginx/apache para o mesmo path.
      '/api/gdis': {
        target: 'http://192.168.1.110',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gdis/, ''),
      },
    },
  },
})

