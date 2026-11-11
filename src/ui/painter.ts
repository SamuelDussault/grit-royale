// Mini moteur de dessin pixel art : formes ombrées, contours automatiques, rendu en image.
// Grille de 47 × 81 pixels = la zone d'illustration d'une carte de joker (1 pixel = 1 unité de carte).

export type RGB = [number, number, number]
export const PW = 59
export const PH = 91
/** Décalage de la zone de dessin des scènes (coordonnées 47 × 81 historiques) dans la grille. */
export const OX = 6
export const OY = 5

export const C = {
  ink: [42, 35, 58] as RGB,
  white: [250, 248, 240] as RGB,
  pure: [255, 255, 255] as RGB,
  red: [232, 56, 79] as RGB,
  darkred: [150, 25, 45] as RGB,
  pink: [255, 143, 171] as RGB,
  orange: [255, 140, 30] as RGB,
  gold: [242, 182, 50] as RGB,
  yellow: [249, 210, 79] as RGB,
  green: [53, 189, 134] as RGB,
  lime: [140, 210, 70] as RGB,
  teal: [42, 157, 143] as RGB,
  blue: [0, 147, 255] as RGB,
  navy: [29, 53, 87] as RGB,
  sky: [140, 200, 245] as RGB,
  purple: [136, 103, 165] as RGB,
  violet: [155, 93, 229] as RGB,
  brown: [139, 90, 43] as RGB,
  dbrown: [94, 59, 28] as RGB,
  grey: [150, 156, 170] as RGB,
  dgrey: [80, 84, 98] as RGB,
  lgrey: [205, 210, 218] as RGB,
  black: [40, 40, 52] as RGB,
  skin: [246, 213, 181] as RGB,
  clown: [251, 243, 228] as RGB,
  cyan: [76, 201, 240] as RGB,
  suitRed: [232, 56, 79] as RGB,
  suitDark: [58, 68, 102] as RGB,
}

export function hex(h: string): RGB {
  const n = parseInt(h.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export function mul(c: RGB, f: number): RGB {
  return c.map((v) => Math.max(0, Math.min(255, Math.round(v * f)))) as RGB
}
export function mix(a: RGB, b: RGB, t: number): RGB {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB
}

// Couches : 0 = fond (pas de contour), 9 = détails (ne créent pas de traits internes)
export const Z = { bg: 0, back: 2, body: 4, mid: 5, front: 7, top: 8, detail: 9 } as const

const SUIT_BMP: Record<string, string[]> = {
  H: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  D: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  S: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '.X.X.X.', '..XXX..'],
  C: ['..XXX..', '..XXX..', 'XX.X.XX', 'XXXXXXX', 'XX.X.XX', '...X...', '..XXX..'],
}

const FONT: Record<string, string[]> = {
  '0': ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'],
  '1': ['.X.', 'XX.', '.X.', '.X.', 'XXX'],
  '2': ['XXX', '..X', 'XXX', 'X..', 'XXX'],
  '3': ['XXX', '..X', '.XX', '..X', 'XXX'],
  '4': ['X.X', 'X.X', 'XXX', '..X', '..X'],
  '5': ['XXX', 'X..', 'XXX', '..X', 'XXX'],
  '6': ['XXX', 'X..', 'XXX', 'X.X', 'XXX'],
  '7': ['XXX', '..X', '.X.', '.X.', '.X.'],
  '8': ['XXX', 'X.X', 'XXX', 'X.X', 'XXX'],
  '9': ['XXX', 'X.X', 'XXX', '..X', 'XXX'],
  A: ['.X.', 'X.X', 'XXX', 'X.X', 'X.X'],
  B: ['XX.', 'X.X', 'XX.', 'X.X', 'XX.'],
  C: ['.XX', 'X..', 'X..', 'X..', '.XX'],
  D: ['XX.', 'X.X', 'X.X', 'X.X', 'XX.'],
  E: ['XXX', 'X..', 'XX.', 'X..', 'XXX'],
  F: ['XXX', 'X..', 'XX.', 'X..', 'X..'],
  G: ['.XX', 'X..', 'X.X', 'X.X', '.XX'],
  H: ['X.X', 'X.X', 'XXX', 'X.X', 'X.X'],
  I: ['XXX', '.X.', '.X.', '.X.', 'XXX'],
  J: ['..X', '..X', '..X', 'X.X', '.X.'],
  K: ['X.X', 'X.X', 'XX.', 'X.X', 'X.X'],
  L: ['X..', 'X..', 'X..', 'X..', 'XXX'],
  M: ['X.X', 'XXX', 'XXX', 'X.X', 'X.X'],
  N: ['X.X', 'XXX', 'XXX', 'XXX', 'X.X'],
  O: ['.X.', 'X.X', 'X.X', 'X.X', '.X.'],
  P: ['XX.', 'X.X', 'XX.', 'X..', 'X..'],
  Q: ['.X.', 'X.X', 'X.X', 'XXX', '.XX'],
  R: ['XX.', 'X.X', 'XX.', 'X.X', 'X.X'],
  S: ['.XX', 'X..', '.X.', '..X', 'XX.'],
  T: ['XXX', '.X.', '.X.', '.X.', '.X.'],
  U: ['X.X', 'X.X', 'X.X', 'X.X', 'XXX'],
  V: ['X.X', 'X.X', 'X.X', 'X.X', '.X.'],
  W: ['X.X', 'X.X', 'XXX', 'XXX', 'X.X'],
  X: ['X.X', 'X.X', '.X.', 'X.X', 'X.X'],
  Y: ['X.X', 'X.X', '.X.', '.X.', '.X.'],
  Z: ['XXX', '..X', '.X.', 'X..', 'XXX'],
  '+': ['...', '.X.', 'XXX', '.X.', '...'],
  '-': ['...', '...', 'XXX', '...', '...'],
  '$': ['.XX', 'XX.', '.X.', '.XX', 'XX.'],
  '!': ['.X.', '.X.', '.X.', '...', '.X.'],
  '?': ['XX.', '..X', '.X.', '...', '.X.'],
  '×': ['...', 'X.X', '.X.', 'X.X', '...'],
  ':': ['...', '.X.', '...', '.X.', '...'],
  '.': ['...', '...', '...', '...', '.X.'],
  '/': ['..X', '..X', '.X.', 'X..', 'X..'],
  ' ': ['...', '...', '...', '...', '...'],
}

export class Painter {
  col: (RGB | null)[] = Array(PW * PH).fill(null)
  z = new Int8Array(PW * PH).fill(-1)
  ox = OX
  oy = OY
  hasJester = false

  set(x: number, y: number, c: RGB, z: number) {
    x = Math.round(x + this.ox)
    y = Math.round(y + this.oy)
    if (x < 0 || y < 0 || x >= PW || y >= PH) return
    this.col[y * PW + x] = c
    this.z[y * PW + x] = z
  }
  getZ(x: number, y: number) {
    if (x < 0 || y < 0 || x >= PW || y >= PH) return -1
    return this.z[y * PW + x]
  }
  at(dx: number, dy: number, fn: () => void) {
    const a = this.ox
    const b = this.oy
    this.ox += dx
    this.oy += dy
    fn()
    this.ox = a
    this.oy = b
  }

  /** Couleur ombrée : v > 0 éclairé (lumière en haut à gauche), tramage léger. */
  tone(base: RGB, v: number, x: number, y: number): RGB {
    void x
    void y
    if (v > 0.62) return mix(base, C.pure, 0.3)
    if (v > -0.3) return base
    return mix(mul(base, 0.72), [60, 40, 90], 0.12)
  }

  // ---------- fonds ----------
  bg(c1: RGB, kind: 'flat' | 'rays' | 'dots' | 'stripes' | 'stars' | 'grid' | 'gradient' = 'flat', c2?: RGB) {
    const alt = c2 ?? mul(c1, 0.9)
    for (let y = 0; y < PH; y++)
      for (let x = 0; x < PW; x++) {
        let c = c1
        if (kind === 'rays') {
          const a = Math.atan2(y - 34 - this.oy, x - 23.5 - this.ox)
          if (Math.floor(((a + Math.PI) / (Math.PI * 2)) * 18) % 2) c = alt
        } else if (kind === 'dots') {
          if (x % 6 === 3 && y % 6 === 3) c = alt
        } else if (kind === 'stripes') {
          if (Math.floor((x + y) / 5) % 2) c = alt
        } else if (kind === 'grid') {
          if (x % 6 === 0 || y % 6 === 0) c = alt
        } else if (kind === 'gradient') {
          c = mix(c1, alt, Math.floor((y / PH) * 6) / 5)
        } else if (kind === 'stars') {
          const h = (x * 73856093) ^ (y * 19349663)
          if ((h >>> 0) % 37 === 0) c = alt
        }
        this.col[y * PW + x] = c
        this.z[y * PW + x] = Z.bg
      }
  }

  // ---------- formes ----------
  ell(cx: number, cy: number, rx: number, ry: number, c: RGB, z: number = Z.mid, flat = false) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x - cx) / rx
        const ny = (y - cy) / ry
        if (nx * nx + ny * ny > 1) continue
        this.set(x, y, flat ? c : this.tone(c, -0.75 * nx - 0.85 * ny, x, y), z)
      }
  }
  rect(x0: number, y0: number, w: number, h: number, c: RGB, z: number = Z.mid, flat = false) {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        const nx = (x - x0 - w / 2) / Math.max(1, w / 2)
        const ny = (y - y0 - h / 2) / Math.max(1, h / 2)
        this.set(x, y, flat ? c : this.tone(c, -0.7 * nx - 0.45 * ny + 0.1, x, y), z)
      }
  }
  poly(pts: [number, number][], c: RGB, z: number = Z.mid, flat = false) {
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        let inside = false
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i]
          const [xj, yj] = pts[j]
          if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
        }
        if (!inside) continue
        const v = -0.7 * ((x - cx) / Math.max(1, (x1 - x0) / 2)) - 0.6 * ((y - cy) / Math.max(1, (y1 - y0) / 2))
        this.set(x, y, flat ? c : this.tone(c, v, x, y), z)
      }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, z: number = Z.detail, w = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n
      const y = y0 + ((y1 - y0) * i) / n
      for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) this.set(x + a - (w - 1) / 2, y + b - (w - 1) / 2, c, z)
    }
  }
  /** Tube courbé (Bézier quadratique), du rayon r0 au rayon r1. */
  bez(p0: [number, number], p1: [number, number], p2: [number, number], r0: number, r1: number, c: RGB, z: number = Z.mid) {
    for (let t = 0; t <= 1; t += 0.008) {
      const x = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
      const y = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
      const r = r0 + (r1 - r0) * t
      for (let oy = -Math.ceil(r); oy <= Math.ceil(r); oy++)
        for (let ox = -Math.ceil(r); ox <= Math.ceil(r); ox++) {
          if (ox * ox + oy * oy > r * r) continue
          this.set(x + ox, y + oy, this.tone(c, (-ox * 0.8 - oy * 0.7) / Math.max(r, 1), x + ox, y + oy), z)
        }
    }
  }
  bitmap(rows: string[], pal: Record<string, RGB>, x0: number, y0: number, z: number = Z.mid, s = 1) {
    rows.forEach((row, ry) =>
      row.split('').forEach((ch, rx) => {
        const c = pal[ch]
        if (!c) return
        for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) this.set(x0 + rx * s + a, y0 + ry * s + b, c, z)
      }),
    )
  }
  suit(s: 'H' | 'D' | 'S' | 'C', cx: number, cy: number, scale = 1, c?: RGB, z: number = Z.front) {
    const col = c ?? (s === 'H' || s === 'D' ? C.suitRed : C.suitDark)
    const size = 7 * scale
    const x0 = Math.round(cx - size / 2)
    const y0 = Math.round(cy - size / 2)
    SUIT_BMP[s].forEach((row, ry) =>
      row.split('').forEach((ch, rx) => {
        if (ch !== 'X') return
        for (let a = 0; a < scale; a++)
          for (let b = 0; b < scale; b++) {
            const x = x0 + rx * scale + a
            const y = y0 + ry * scale + b
            const v = -0.8 * ((x - cx) / (size / 2)) - 0.8 * ((y - cy) / (size / 2))
            this.set(x, y, scale > 1 ? this.tone(col, v, x, y) : col, z)
          }
      }),
    )
  }
  text(str: string, x0: number, y0: number, c: RGB, z: number = Z.detail, s = 1) {
    let x = x0
    for (const ch of str.toUpperCase()) {
      const g = FONT[ch] ?? FONT[' ']
      this.bitmap(g, { X: c }, x, y0, z, s)
      x += 4 * s
    }
  }
  textWidth(str: string, s = 1) {
    return str.length * 4 * s - s
  }
  /** Carte à jouer miniature (11 × 15). */
  card(x0: number, y0: number, rank: string, s: 'H' | 'D' | 'S' | 'C', z: number = Z.front, w = 11, h = 15) {
    const col = s === 'H' || s === 'D' ? C.suitRed : C.suitDark
    this.rect(x0, y0, w, h, C.white, z, false)
    this.text(rank, x0 + 1, y0 + 1, col, z, 1)
    this.suit(s, x0 + w / 2 + 0.5, y0 + h / 2 + 2, 1, col, z)
  }
  coin(cx: number, cy: number, r: number, z: number = Z.front) {
    this.ell(cx, cy, r, r, C.gold, z)
    this.ell(cx, cy, r * 0.6, r * 0.6, mul(C.gold, 0.85), z, true)
    if (r >= 3) this.text('$', cx - 1, cy - 2, mul(C.gold, 0.55), z + 1 > 9 ? 9 : z + 1)
  }
  star(cx: number, cy: number, r: number, c: RGB, z: number = Z.front) {
    const pts: [number, number][] = []
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const rr = i % 2 ? r * 0.45 : r
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
    }
    this.poly(pts, c, z)
  }
  sparkle(cx: number, cy: number, c: RGB = C.pure) {
    this.set(cx, cy, c, Z.detail)
    this.set(cx - 1, cy, c, Z.detail)
    this.set(cx + 1, cy, c, Z.detail)
    this.set(cx, cy - 1, c, Z.detail)
    this.set(cx, cy + 1, c, Z.detail)
  }

  /** Recolore toutes les cartes non-fond (statue d'or, hologramme…). */
  recolor(fn: (c: RGB, x: number, y: number) => RGB) {
    for (let i = 0; i < this.col.length; i++) {
      const c = this.col[i]
      if (c && this.z[i] > Z.bg) this.col[i] = fn(c, i % PW, Math.floor(i / PW))
    }
  }

  /** Contours extérieurs + traits entre les parties. */
  outline() {
    const out = [...this.col]
    for (let y = 0; y < PH; y++)
      for (let x = 0; x < PW; x++) {
        const z = this.getZ(x, y)
        const n4 = [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1],
        ]
        if (z <= Z.bg) {
          if (n4.some(([a, b]) => this.getZ(a, b) > Z.bg)) out[y * PW + x] = C.ink
          continue
        }
        if (z !== Z.detail && n4.some(([a, b]) => this.getZ(a, b) > z && this.getZ(a, b) !== Z.detail)) out[y * PW + x] = C.ink
      }
    this.col = out
  }

  /** Rend le fond transparent (la carte blanche apparaît derrière le personnage). */
  clearBg() {
    for (let i = 0; i < this.col.length; i++) if (this.z[i] === Z.bg) {
      this.col[i] = null
      this.z[i] = -1
    }
  }

  toDataURL(): string {
    const canvas = document.createElement('canvas')
    canvas.width = PW
    canvas.height = PH
    const ctx = canvas.getContext('2d')!
    const img = ctx.createImageData(PW, PH)
    this.col.forEach((c, i) => {
      if (!c) return
      img.data[i * 4] = c[0]
      img.data[i * 4 + 1] = c[1]
      img.data[i * 4 + 2] = c[2]
      img.data[i * 4 + 3] = 255
    })
    ctx.putImageData(img, 0, 0)
    return canvas.toDataURL()
  }
}
