import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Remove console.* e debugger só no build de produção (dev fica intacto)
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}))
