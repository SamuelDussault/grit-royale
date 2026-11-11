// Personnages réutilisables pour les illustrations : bouffon complet et petite tête de bouffon.
import { C, lightOf, mix, Painter, shadeOf, Z, type RGB } from './painter'

export type Hat = 'horns3' | 'horns2' | 'top' | 'crown' | 'beanie' | 'none' | 'tricorne' | 'mortar' | 'hood' | 'helmet'
export type Eyes = 'dot' | 'happy' | 'brow' | 'sleepy' | 'big' | 'angry' | 'spiral' | 'dollar' | 'heart' | 'mask' | 'none' | 'x' | 'patch' | 'tear' | 'star'
export type Mouth = 'smile' | 'teeth' | 'o' | 'smirk' | 'grin' | 'wide' | 'frown' | 'none' | 'fangs' | 'flat'

export interface JesterOpt {
  ca: RGB
  cb: RGB
  face?: RGB
  hair?: RGB
  collar?: RGB
  hat?: Hat
  eyes?: Eyes
  mouth?: Mouth
  nose?: boolean
  makeup?: 0 | 1 | 2 | 3
  body?: boolean
  arms?: 'down' | 'up' | 'none' | 'hold'
  square?: boolean
}

function bell(p: Painter, x: number, y: number, r = 3.2) {
  p.ell(x, y, r, r, C.yellow, Z.top)
  p.set(x - 1, y - 1, [255, 247, 210], Z.detail)
  p.line(x - 1, y + r - 1, x + 1, y + r - 1, [140, 90, 10], Z.detail)
}

/**
 * Bouffon en buste, style « carte de joker » : grand visage blanc, sourire plein de dents,
 * chapeau qui retombe sur les côtés, collerette à pointes. Tête centrée en (23.5, 36).
 */
export function jester(p: Painter, o: JesterOpt) {
  p.hasJester = true
  const face = o.face ?? C.clown
  const hair = o.hair ?? [59, 42, 26]
  const collar = o.collar ?? C.white
  const { ca, cb } = o
  const hx = 23.5
  const hy = 36
  const D = Z.detail
  const hat = o.hat ?? 'horns3'

  // ---- corps / épaules ----
  if (o.body !== false) {
    for (let y = 60; y < 86; y++) {
      const half = Math.min(26, 13 + (y - 60) * 0.9)
      for (let x = Math.floor(hx - half); x <= Math.ceil(hx + half); x++) {
        const left = x < hx
        p.set(x, y, p.tone(left ? ca : cb, left ? 0.2 : -0.1 - (x - hx) / half, x, y), Z.body)
      }
    }
    p.line(hx, 62, hx, 86, C.ink, Z.mid)
    for (const by of [68, 75, 82]) p.ell(hx + 3, by, 1.6, 1.6, C.yellow, Z.mid)
    const arms = o.arms ?? 'down'
    if (arms === 'hold') {
      p.ell(6, 76, 4, 3.5, face, Z.front)
      p.ell(41, 76, 4, 3.5, face, Z.front)
    } else if (arms === 'up') {
      p.bez([6, 66], [-3, 52], [1, 34], 3.5, 3, cb, Z.mid)
      p.bez([41, 66], [50, 52], [46, 34], 3.5, 3, ca, Z.mid)
      p.ell(1, 30, 4, 4.5, face, Z.front)
      p.ell(46, 30, 4, 4.5, face, Z.front)
    }
  }

  // ---- collerette à grandes pointes (symétrique, grelots au bout) ----
  {
    const n = 6
    const xs = -4
    const xe = 51
    const sw = (xe - xs) / n
    const order = [0, 2, 1, 1, 2, 0]
    for (let i = 0; i < n; i++) {
      const xa = xs + i * sw
      const mid = xa + sw / 2
      const edge = Math.abs(i - (n - 1) / 2)
      const top = 52 + edge * 1.5
      const tip = 70 - edge * 2.2
      const c = [ca, cb, collar][order[i]]
      p.poly([[xa - 0.5, top], [xa + sw + 0.5, top], [mid, tip]], c, Z.mid)
      p.ell(mid, tip + 1.5, 1.8, 1.8, C.yellow, Z.front)
    }
    p.shape()
    for (let x = 5; x <= 42; x++) {
      const yb = 54 + Math.round(((x - hx) / 18) ** 2 * 2)
      for (let y = 49; y <= yb; y++) p.set(x, y, collar, Z.mid)
    }
  }

  // ---- cheveux (si pas de chapeau de bouffon) ----
  if (hat !== 'horns3' && hat !== 'horns2' && hat !== 'hood' && hat !== 'helmet') {
    p.ell(10, 32, 4.5, 8, hair, Z.mid)
    p.ell(37, 32, 4.5, 8, hair, Z.mid)
  }

  // ---- tête ----
  if (o.square) p.rect(9, 21, 30, 30, face, Z.front)
  else p.ell(hx, hy, 13.5, 14.5, face, Z.front)
  p.ell(9.5, 38, 2.2, 3.4, face, Z.mid)
  p.ell(37.5, 38, 2.2, 3.4, face, Z.mid)

  // maquillage
  const mk = o.makeup ?? 0
  if (mk === 0) {
    p.ell(13.5, 41, 2.6, 1.8, C.pink, D, true)
    p.ell(33.5, 41, 2.6, 1.8, C.pink, D, true)
  } else if (mk === 1) {
    for (const cx of [17, 30])
      for (let dy = -3; dy <= 3; dy++) for (let dx = -(3 - Math.abs(dy)); dx <= 3 - Math.abs(dy); dx++) p.set(cx + dx, 32 + dy, ca, D)
  } else if (mk === 2) {
    for (const cx of [17, 30]) {
      p.line(cx, 36, cx, 40, cb, D)
      p.line(cx - 1, 38, cx + 1, 38, cb, D)
    }
  }

  // ---- yeux ----
  const eyes = o.eyes ?? 'dot'
  const EY = 32
  for (const ex of [17, 30]) {
    const L = ex < hx
    const brow = (lift: number) => {
      for (let dx = -3; dx <= 3; dx++) p.set(ex + dx, EY - 5 - Math.round((1 - (dx / 3) ** 2) * 1.5) + (L ? dx : -dx) * lift, C.ink, D)
    }
    switch (eyes) {
      case 'dot':
        p.ell(ex, EY, 2.6, 3.2, C.ink, D, true)
        p.set(ex - 1, EY - 1, C.pure, D)
        brow(0)
        break
      case 'happy':
        for (let dx = -3; dx <= 3; dx++) {
          p.set(ex + dx, EY + Math.abs(dx) * 0.7 - 1, C.ink, D)
          p.set(ex + dx, EY + Math.abs(dx) * 0.7, C.ink, D)
        }
        break
      case 'brow':
        p.ell(ex, EY, 2.2, 2.6, C.ink, D, true)
        p.set(ex - 1, EY - 1, C.pure, D)
        brow(0.4)
        break
      case 'sleepy':
        p.ell(ex, EY + 1, 3, 2, C.ink, D, true)
        p.line(ex - 3, EY, ex + 3, EY, face, D)
        p.line(ex - 4, EY, ex + 3, EY, C.ink, D)
        break
      case 'big':
        p.ell(ex, EY, 3.6, 4, C.pure, D, true)
        p.ell(ex + 0.5, EY + 0.5, 2.2, 2.8, ca, D, true)
        p.ell(ex + 0.5, EY + 0.5, 1, 1.4, C.ink, D, true)
        p.set(ex - 1, EY - 1, C.pure, D)
        break
      case 'angry':
        p.ell(ex, EY + 1, 2.4, 2.4, C.ink, D, true)
        for (let dx = -4; dx <= 3; dx++) {
          p.set(ex + dx, EY - 3 + (L ? dx : -dx) * 0.6, C.ink, D)
          p.set(ex + dx, EY - 4 + (L ? dx : -dx) * 0.6, C.ink, D)
        }
        break
      case 'spiral':
        p.ell(ex, EY, 4, 4, C.pure, D, true)
        for (let t = 0; t < 14; t += 0.3) p.set(ex + Math.cos(t) * t * 0.26, EY + Math.sin(t) * t * 0.26, C.ink, D)
        break
      case 'dollar':
        p.ell(ex, EY, 3.5, 3.8, C.green, D, true)
        p.text('$', ex - 1, EY - 2, C.pure, D)
        break
      case 'heart':
        p.suit('H', ex, EY, 1, C.red, D)
        p.set(ex - 2, EY - 2, C.pure, D)
        break
      case 'star':
        p.star(ex, EY, 4, C.yellow, D)
        break
      case 'x':
        p.line(ex - 2, EY - 2, ex + 2, EY + 2, C.ink, D, 1)
        p.line(ex - 2, EY + 2, ex + 2, EY - 2, C.ink, D, 1)
        break
      case 'patch':
        if (L) {
          p.ell(ex, EY, 4, 4, C.black, D, true)
          p.line(ex - 8, EY - 8, ex + 16, EY - 11, C.black, D)
        } else {
          p.ell(ex, EY, 2.6, 3.2, C.ink, D, true)
          p.set(ex - 1, EY - 1, C.pure, D)
        }
        break
      case 'tear':
        p.ell(ex, EY, 2.6, 3.2, C.ink, D, true)
        p.set(ex - 1, EY - 1, C.pure, D)
        for (let dx = -3; dx <= 3; dx++) p.set(ex + dx, EY - 5 - (L ? -dx : dx) * 0.5, C.ink, D)
        if (L) p.poly([[ex, EY + 4], [ex - 2, EY + 9], [ex + 2, EY + 9]], C.cyan, D, true)
        break
      case 'mask':
      case 'none':
        break
    }
  }
  if (eyes === 'mask') {
    p.poly([[8, 27], [39, 27], [38, 35], [26, 36], [23.5, 33], [21, 36], [9, 35]], C.black, D, true)
    p.ell(17, 31, 2.4, 1.6, C.pure, D, true)
    p.ell(30, 31, 2.4, 1.6, C.pure, D, true)
  }

  // ---- nez ----
  if (o.nose ?? true) {
    p.ell(hx, 38, 2.4, 2.2, C.red, D)
    p.set(hx - 1, 37, [255, 190, 200], D)
  } else {
    p.set(hx + 1, 38, mix(face, C.ink, 0.35), D)
  }

  // ---- bouche (le grand sourire est la signature) ----
  const lip = C.red
  const m = o.mouth ?? 'smile'
  if (m === 'smile' || m === 'teeth' || m === 'wide' || m === 'grin') {
    const w = m === 'wide' ? 11 : 10
    const depth = m === 'wide' ? 8 : 6.5
    for (let x = Math.floor(hx - w); x <= Math.ceil(hx + w); x++) {
      const u = 1 - ((x - hx) / w) ** 2
      if (u < 0) continue
      const top = 42 + Math.round(-1.2 * (1 - u)) + Math.round(0.6 * u)
      const bot = 42 + Math.round(depth * u)
      for (let y = top - 1; y <= bot + 1; y++) {
        let c: RGB = C.darkred
        if (y === top - 1 || y === bot + 1) c = lip
        else if (m !== 'smile' && y <= top + 1) c = (x - Math.floor(hx)) % 3 === 0 ? C.lgrey : C.pure
        else if (m === 'grin' && y >= bot - 1) c = (x - Math.floor(hx)) % 3 === 0 ? C.lgrey : C.pure
        else if (y >= bot - 1 && Math.abs(x - hx) < 4) c = [255, 110, 130]
        p.set(x, y, c, D)
      }
      p.set(x, top - 2, C.ink, D)
      p.set(x, bot + 2, C.ink, D)
    }
  } else if (m === 'o') {
    p.ell(hx, 45, 3, 3.6, C.ink, D, true)
    p.ell(hx, 46, 2, 2.4, C.darkred, D, true)
  } else if (m === 'smirk') {
    for (let x = 16; x <= 31; x++) {
      const y = 45 - (x > 24 ? (x - 24) * 0.55 : 0)
      p.set(x, y, C.ink, D)
      p.set(x, y + 1, lip, D)
    }
  } else if (m === 'frown') {
    for (let x = 16; x <= 31; x++) {
      const y = 47 - Math.round(3 * (1 - ((x - hx) / 7.5) ** 2))
      p.set(x, y, C.ink, D)
      p.set(x, y + 1, lip, D)
    }
  } else if (m === 'flat') {
    p.line(17, 45, 30, 45, C.ink, D)
    p.line(17, 46, 30, 46, lip, D)
  } else if (m === 'fangs') {
    p.line(15, 44, 32, 44, C.ink, D)
    p.line(15, 45, 32, 45, lip, D)
    p.poly([[17, 45], [19, 45], [18, 49]], C.pure, D, true)
    p.poly([[28, 45], [30, 45], [29, 49]], C.pure, D, true)
  }

  // ---- chapeau ----
  if (hat === 'horns3' || hat === 'horns2') {
    // bandeau
    for (let x = 9; x <= 38; x++) {
      const yy = 23 + Math.round(((x - hx) / 14) ** 2 * 3)
      for (let y = yy - 3; y <= yy + 1; y++) p.set(x, y, p.tone(Math.floor((x + 1) / 4) % 2 ? ca : cb, -(x - hx) / 14, x, y), Z.top)
    }
    // pans qui retombent sur les côtés
    p.bez([12, 20], [-6, 10], [-1, 44], 6.8, 3, ca, Z.top)
    p.bez([35, 20], [53, 10], [48, 44], 6.8, 3, hat === 'horns2' ? cb : ca, Z.top)
    p.bez([10, 18], [-3, 10], [-3, 38], 1, 0.6, lightOf(ca), Z.detail)
    p.bez([37, 18], [50, 12], [50, 30], 0.6, 0.5, shadeOf(hat === 'horns2' ? cb : ca), Z.detail)
    bell(p, -1, 48, 3.6)
    bell(p, 48, 48, 3.6)
    if (hat === 'horns3') {
      p.bez([23.5, 21], [20, 2], [33, 2], 6.8, 3, cb, Z.top)
      p.bez([20.5, 17], [18, 4], [28, 1], 0.8, 0.5, lightOf(cb), Z.detail)
      bell(p, 36, 4, 3.6)
    }
  } else {
    p.at(0, 4, () => {
      if (hat === 'top') {
        const top: RGB = [45, 45, 62]
        p.rect(12, -4, 23, 21, top, Z.top)
        p.rect(12, 11, 23, 4, ca, Z.top)
        p.ell(hx, 18, 19, 3, top, Z.top)
      } else if (hat === 'crown') {
        for (let x = 9; x <= 38; x++) for (let y = 11; y <= 19; y++) p.set(x, y, p.tone(C.gold, -(x - hx) / 14 - (y - 15) / 8, x, y), Z.top)
        for (const sx of [10, 16.5, 23.5, 30.5, 37]) {
          p.poly([[sx - 3.5, 12], [sx, -1], [sx + 3.5, 12]], C.gold, Z.top)
          p.ell(sx, -1.5, 1.8, 1.8, [255, 247, 210], Z.top)
        }
        for (const gx of [16, 23.5, 31]) p.ell(gx, 15, 2, 2, gx === 23.5 ? C.red : C.blue, D)
      } else if (hat === 'beanie') {
        for (let y = 0; y <= 19; y++)
          for (let x = 8; x <= 39; x++) {
            const nx = (x - hx) / 16
            const ny = (y - 19) / 17
            if (nx * nx + ny * ny > 1) continue
            p.set(x, y, p.tone(Math.floor(y / 4) % 2 ? ca : cb, -nx * 0.8 - ny * 0.3, x, y), Z.top)
          }
        p.rect(7, 16, 34, 5, C.white, Z.top)
        p.ell(hx, -1, 4.5, 4.5, C.white, Z.top)
      } else if (hat === 'tricorne') {
        p.poly([[-2, 19], [23.5, -2], [49, 19], [23.5, 12]], C.black, Z.top)
        p.bitmap(['.XXX.', 'X.X.X', 'XXXXX', '.X.X.'], { X: C.white }, 21, 4, D)
      } else if (hat === 'mortar') {
        p.poly([[-2, 9], [23.5, 1], [49, 9], [23.5, 17]], C.black, Z.top)
        p.rect(11, 12, 25, 7, C.black, Z.top)
        p.line(40, 9, 44, 22, C.gold, D)
        p.ell(44, 24, 1.8, 2.5, C.gold, D)
      } else if (hat === 'hood') {
        for (let y = 2; y <= 60; y++)
          for (let x = 2; x <= 45; x++) {
            const nx = (x - hx) / 21
            const ny = (y - 32) / 28
            if (nx * nx + ny * ny > 1) continue
            const inner = ((x - hx) / 14.5) ** 2 + ((y - 33) / 16) ** 2 < 1
            if (!inner) p.set(x, y, p.tone(ca, -nx * 0.8 - ny * 0.5, x, y), Z.top)
          }
      } else if (hat === 'helmet') {
        for (let y = 4; y <= 20; y++)
          for (let x = 8; x <= 39; x++) {
            const nx = (x - hx) / 16
            const ny = (y - 20) / 16
            if (nx * nx + ny * ny <= 1) p.set(x, y, p.tone(C.lgrey, -nx * 0.9 - ny * 0.5, x, y), Z.top)
          }
        p.rect(7, 18, 34, 4, C.grey, Z.top)
      }
    })
  }
}

/** Petit bouffon (≈ 24 × 30), tête centrée en (cx, cy). */
export function miniJester(p: Painter, cx: number, cy: number, ca: RGB, cb: RGB, face: RGB = C.clown, mood: 'smile' | 'o' | 'frown' = 'smile') {
  // collerette
  for (let i = 0; i < 4; i++) {
    const xa = cx - 11 + i * 5.5
    p.poly([[xa, cy + 7], [xa + 5.5, cy + 7], [xa + 2.75, cy + 14 - Math.abs(i - 1.5) * 1.5]], i % 2 ? cb : ca, Z.mid)
  }
  // pans du chapeau
  p.bez([cx - 4, cy - 7], [cx - 15, cy - 11], [cx - 11, cy + 4], 3.8, 1.8, ca, Z.top)
  p.bez([cx + 4, cy - 7], [cx + 15, cy - 11], [cx + 11, cy + 4], 3.8, 1.8, cb, Z.top)
  p.ell(cx - 11, cy + 6, 2.2, 2.2, C.yellow, Z.top)
  p.ell(cx + 11, cy + 6, 2.2, 2.2, C.yellow, Z.top)
  // tête
  p.ell(cx, cy, 8, 8.5, face, Z.front)
  p.rect(cx - 7, cy - 9, 15, 3, ca, Z.top)
  // visage
  const D = Z.detail
  p.ell(cx - 3, cy - 1, 1.2, 1.6, C.ink, D, true)
  p.ell(cx + 3, cy - 1, 1.2, 1.6, C.ink, D, true)
  p.set(cx, cy + 2, C.red, D)
  p.set(cx + 1, cy + 2, C.red, D)
  if (mood === 'smile') {
    for (let x = -4; x <= 4; x++) {
      const y = cy + 4 + Math.round((1 - (x / 4.5) ** 2) * 2)
      p.set(cx + x, cy + 4, x === -4 || x === 4 ? C.ink : C.pure, D)
      p.set(cx + x, y, C.red, D)
      if (y - 1 > cy + 4) p.set(cx + x, y - 1, C.darkred, D)
    }
  } else if (mood === 'o') p.ell(cx, cy + 5, 1.5, 2, C.darkred, D, true)
  else for (let x = -3; x <= 3; x++) p.set(cx + x, cy + 6 - Math.round((1 - (x / 3.5) ** 2) * 2), C.red, D)
  p.ell(cx - 5, cy + 3, 1.5, 1, C.pink, D, true)
  p.ell(cx + 5, cy + 3, 1.5, 1, C.pink, D, true)
}
