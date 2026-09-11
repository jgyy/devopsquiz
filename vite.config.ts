/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/devopsquiz/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/vitest.setup.ts',
    globals: false,
  },
})
