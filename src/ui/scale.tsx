// Mise à l'échelle pour les petits écrans (téléphones) : le jeu est dessiné sur une surface
// virtuelle d'au moins 1180 × 660, puis réduite pour tenir dans l'écran.
import { useEffect, useState, type ReactNode } from 'react'

const MIN_W = 1180
const MIN_H = 660

let current = 1
/** Échelle actuelle (1 = taille réelle). */
export const uiScale = () => current
/** Appareil tactile (pas de survol à la souris). */
export const isTouch = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

function compute() {
  const w = window.innerWidth
  const h = window.innerHeight
  const s = Math.min(1, w / MIN_W, h / MIN_H)
  return { s, w: w / s, h: h / s }
}

export function ScaleRoot({ children }: { children: ReactNode }) {
  const [dim, setDim] = useState(compute)
  useEffect(() => {
    const on = () => setDim(compute())
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
    }
  }, [])
  current = dim.s
  const scaled = dim.s < 1
  return (
    <>
      <div
        id="scale-root"
        className={`${scaled ? 'scaled' : ''} ${dim.h < 760 ? 'compact' : ''} ${isTouch() ? 'touch' : ''}`}
        style={scaled ? { width: dim.w, height: dim.h, transform: `scale(${dim.s})`, transformOrigin: '0 0' } : undefined}
      >
        {children}
      </div>
      <div className="rotate-hint">
        <div className="rotate-phone" />
        <div>Tourne ton téléphone</div>
        <div className="muted small">Grit Royale se joue à l’horizontale</div>
      </div>
    </>
  )
}
