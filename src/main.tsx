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
