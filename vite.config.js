import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    proxy: {
      '/gestion-locative/api': {
        target: 'http://localhost:4000/',
        changeOrigin: true,
        secure: false,
        rewrite: path => path.replace(/^\/gestion-locative\/api/, '')
      }
    }
  }
})
