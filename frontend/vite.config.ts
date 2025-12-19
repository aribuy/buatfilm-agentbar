import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/' : '/',
  server: {
    port: 3001
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser'
  }
})