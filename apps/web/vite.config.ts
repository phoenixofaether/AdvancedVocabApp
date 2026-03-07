import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    mkcert(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://localhost:7073',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
