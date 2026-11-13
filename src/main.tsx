import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/jersey-10'
import App from './ui/App'
import { ScaleRoot } from './ui/scale'
import './ui/styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ScaleRoot>
      <App />
    </ScaleRoot>
  </StrictMode>,
)

// installation sur l'écran d'accueil (PWA)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}))
}

// bouton « Installer » : Chrome propose l'installation, on la garde pour l'accueil
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  ;(window as unknown as { installPrompt?: Event }).installPrompt = e
  window.dispatchEvent(new Event('grit-installable'))
})
