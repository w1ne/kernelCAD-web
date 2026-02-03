import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    '__COMMIT_HASH__': JSON.stringify(execSync('git rev-parse --short HEAD').toString().trim()),
  },
  worker: {
    format: 'es',
  },
})
