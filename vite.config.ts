import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // chemins relatifs : le jeu marche aussi dans un sous-dossier (ex. GitHub Pages)
  base: './',
})
