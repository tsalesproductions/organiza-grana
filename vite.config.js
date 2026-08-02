import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Build para a pasta www do Cordova
  build: {
    outDir: 'www',
    emptyOutDir: false, // Preserva o index.html do Cordova se existir
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  },
  // Importante para Cordova: usa paths relativos
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    }
  },
  // Pasta src para dev server
  root: '.',
  publicDir: 'public',
})
