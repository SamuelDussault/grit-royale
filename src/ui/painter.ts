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
export function shadeOf(c: RGB): RGB {
  return mix(mul(c, 0.74), [70, 40, 110], 0.14)
}
export function lightOf(c: RGB): RGB {
  return mix(c, [255, 252, 240], 0.32)
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
  /** Résolution : 1 = grille normale, 2 = « HD » (2 × 2 pixels par unité de scène). */
  readonly s: number
  readonly W: number
  readonly H: number
  col: (RGB | null)[]
  z: Int8Array
  /** Identifiant de la forme qui a peint chaque pixel (pour l'ombrage en relief). */
  rid: Int32Array
  private cur = 0
  constructor(scale = 1, w = PW, h = PH, ox = OX, oy = OY) {
    this.s = scale
    this.W = w * scale
    this.H = h * scale
    this.ox = ox
    this.oy = oy
    this.col = Array(this.W * this.H).fill(null)
    this.z = new Int8Array(this.W * this.H).fill(-1)
    this.rid = new Int32Array(this.W * this.H).fill(-1)
  }
  /** Nouvelle forme : les pixels suivants appartiennent à une nouvelle région. */
  shape() {
    this.cur++
  }
  ox = OX
  oy = OY
  hasJester = false

  // ---------- pixels ----------
  /** Coordonnée de scène du centre d'un pixel. */
  private sx(px: number) {
    return (px + 0.5) / this.s - 0.5 - this.ox
  }
  private sy(py: number) {
    return (py + 0.5) / this.s - 0.5 - this.oy
  }
  /** Pixels dont le centre tombe dans [a, b] (coordonnées de scène). */
  private rangeX(a: number, b: number): [number, number] {
    return [Math.max(0, Math.ceil((a + this.ox + 0.5) * this.s - 0.5)), Math.min(this.W - 1, Math.floor((b + this.ox + 0.5) * this.s - 0.5))]
  }
  private rangeY(a: number, b: number): [number, number] {
    return [Math.max(0, Math.ceil((a + this.oy + 0.5) * this.s - 0.5)), Math.min(this.H - 1, Math.floor((b + this.oy + 0.5) * this.s - 0.5))]
  }
  setPx(px: number, py: number, c: RGB, z: number) {
    if (px < 0 || py < 0 || px >= this.W || py >= this.H) return
    const i = py * this.W + px
    this.col[i] = c
    this.z[i] = z
    this.rid[i] = this.cur
  }

  /** Une case de la grille de scène (s × s pixels en HD). */
  set(x: number, y: number, c: RGB, z: number) {
    if (this.s === 1) {
      x = Math.round(x + this.ox)
      y = Math.round(y + this.oy)
      if (x < 0 || y < 0 || x >= PW || y >= PH) return
      this.col[y * PW + x] = c
      this.z[y * PW + x] = z
      this.rid[y * PW + x] = this.cur
      return
    }
    const px = Math.round((x + this.ox) * this.s)
    const py = Math.round((y + this.oy) * this.s)
    for (let a = 0; a < this.s; a++) for (let b = 0; b < this.s; b++) this.setPx(px + a, py + b, c, z)
  }
  /** Un seul pixel (détail fin en HD). */
  dot(x: number, y: number, c: RGB, z: number = Z.detail) {
    this.setPx(Math.round((x + this.ox + 0.5) * this.s - 0.5), Math.round((y + this.oy + 0.5) * this.s - 0.5), c, z)
  }
  getZ(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return -1
    return this.z[y * this.W + x]
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
    if (this.s > 1) {
      // en HD : 5 tons au lieu de 3
      if (v > 0.9) return mix(base, C.pure, 0.3)
      if (v > 0.5) return mix(base, C.pure, 0.14)
      if (v > -0.3) return base
      if (v > -0.75) return mix(base, shadeOf(base), 0.5)
      return shadeOf(base)
    }
    if (v > 0.78) return mix(base, C.pure, 0.22)
    if (v > -0.5) return base
    return shadeOf(base)
  }

  // ---------- fonds ----------
  bg(c1: RGB, kind: 'flat' | 'rays' | 'dots' | 'stripes' | 'stars' | 'grid' | 'gradient' = 'flat', c2?: RGB) {
    const alt = c2 ?? mul(c1, 0.9)
    const s = this.s
    for (let y = 0; y < this.H; y++)
      for (let x = 0; x < this.W; x++) {
        let c = c1
        const gx = Math.floor(x / s)
        const gy = Math.floor(y / s)
        if (kind === 'rays') {
          const a = s === 1 ? Math.atan2(y - 34 - this.oy, x - 23.5 - this.ox) : Math.atan2(this.sy(y) - 34, this.sx(x) - 23.5)
          if (Math.floor(((a + Math.PI) / (Math.PI * 2)) * 18) % 2) c = alt
        } else if (kind === 'dots') {
          if (gx % 6 === 3 && gy % 6 === 3) c = alt
        } else if (kind === 'stripes') {
          if (Math.floor((gx + gy) / 5) % 2) c = alt
        } else if (kind === 'grid') {
          if (gx % 6 === 0 || gy % 6 === 0) c = alt
        } else if (kind === 'gradient') {
          c = s === 1 ? mix(c1, alt, Math.floor((y / PH) * 6) / 5) : mix(c1, alt, Math.floor((y / this.H) * 16) / 15)
        } else if (kind === 'stars') {
          const h = (x * 73856093) ^ (y * 19349663)
          if ((h >>> 0) % (37 * s * s) === 0) c = alt
        }
        this.col[y * this.W + x] = c
        this.z[y * this.W + x] = Z.bg
      }
  }

  // ---------- formes ----------
  ell(cx: number, cy: number, rx: number, ry: number, c: RGB, z: number = Z.mid, flat = false) {
    this.shape()
    if (this.s === 1) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const nx = (x - cx) / rx
          const ny = (y - cy) / ry
          if (nx * nx + ny * ny > 1) continue
          this.set(x, y, flat ? c : this.tone(c, -0.75 * nx - 0.85 * ny, x, y), z)
        }
      return
    }
    const [x0, x1] = this.rangeX(cx - rx - 0.5, cx + rx + 0.5)
    const [y0, y1] = this.rangeY(cy - ry - 0.5, cy + ry + 0.5)
    for (let py = y0; py <= y1; py++)
      for (let px = x0; px <= x1; px++) {
        const nx = (this.sx(px) - cx) / (rx + 0.25)
        const ny = (this.sy(py) - cy) / (ry + 0.25)
        if (nx * nx + ny * ny > 1) continue
        this.setPx(px, py, flat ? c : this.tone(c, -0.75 * nx - 0.85 * ny, px, py), z)
      }
  }
  rect(x0: number, y0: number, w: number, h: number, c: RGB, z: number = Z.mid, flat = false) {
    this.shape()
    if (this.s === 1) {
      for (let y = y0; y < y0 + h; y++)
        for (let x = x0; x < x0 + w; x++) {
          const nx = (x - x0 - w / 2) / Math.max(1, w / 2)
          const ny = (y - y0 - h / 2) / Math.max(1, h / 2)
          this.set(x, y, flat ? c : this.tone(c, -0.7 * nx - 0.45 * ny + 0.1, x, y), z)
        }
      return
    }
    const [a0, a1] = this.rangeX(x0 - 0.5, x0 + w - 0.5 - 1e-6)
    const [b0, b1] = this.rangeY(y0 - 0.5, y0 + h - 0.5 - 1e-6)
    for (let py = b0; py <= b1; py++)
      for (let px = a0; px <= a1; px++) {
        const nx = (this.sx(px) - x0 - (w - 1) / 2) / Math.max(1, w / 2)
        const ny = (this.sy(py) - y0 - (h - 1) / 2) / Math.max(1, h / 2)
        this.setPx(px, py, flat ? c : this.tone(c, -0.7 * nx - 0.45 * ny + 0.1, px, py), z)
      }
  }
  poly(pts: [number, number][], c: RGB, z: number = Z.mid, flat = false) {
    this.shape()
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2
    const inside = (x: number, y: number) => {
      let r = false
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i]
        const [xj, yj] = pts[j]
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) r = !r
      }
      return r
    }
    const shade = (x: number, y: number) => -0.7 * ((x - cx) / Math.max(1, (x1 - x0) / 2)) - 0.6 * ((y - cy) / Math.max(1, (y1 - y0) / 2))
    if (this.s === 1) {
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
        for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
          if (!inside(x, y)) continue
          this.set(x, y, flat ? c : this.tone(c, shade(x, y), x, y), z)
        }
      return
    }
    const [a0, a1] = this.rangeX(x0 - 1, x1 + 1)
    const [b0, b1] = this.rangeY(y0 - 1, y1 + 1)
    for (let py = b0; py <= b1; py++)
      for (let px = a0; px <= a1; px++) {
        const x = this.sx(px)
        const y = this.sy(py)
        if (!inside(x, y)) continue
        this.setPx(px, py, flat ? c : this.tone(c, shade(x, y), px, py), z)
      }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, z: number = Z.detail, w = 1) {
    this.shape()
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * this.s
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n
      const y = y0 + ((y1 - y0) * i) / n
      for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) this.set(x + a - (w - 1) / 2, y + b - (w - 1) / 2, c, z)
    }
  }
  /** Trait d'un seul pixel (HD). */
  fine(x0: number, y0: number, x1: number, y1: number, c: RGB, z: number = Z.detail) {
    this.shape()
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * this.s * 1.5)
    for (let i = 0; i <= n; i++) this.dot(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, z)
  }
  /** Tube courbé (Bézier quadratique), du rayon r0 au rayon r1. */
  bez(p0: [number, number], p1: [number, number], p2: [number, number], r0: number, r1: number, c: RGB, z: number = Z.mid) {
    this.shape()
    if (this.s === 1) {
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
      return
    }
    for (let t = 0; t <= 1; t += 0.004) {
      const x = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
      const y = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
      const r = r0 + (r1 - r0) * t + 0.25
      const [a0, a1] = this.rangeX(x - r, x + r)
      const [b0, b1] = this.rangeY(y - r, y + r)
      for (let py = b0; py <= b1; py++)
        for (let px = a0; px <= a1; px++) {
          const dx = this.sx(px) - x
          const dy = this.sy(py) - y
          if (dx * dx + dy * dy > r * r) continue
          this.setPx(px, py, this.tone(c, (-dx * 0.8 - dy * 0.7) / Math.max(r, 1), px, py), z)
        }
    }
  }
  bitmap(rows: string[], pal: Record<string, RGB>, x0: number, y0: number, z: number = Z.mid, s = 1) {
    this.shape()
    rows.forEach((row, ry) =>
      row.split('').forEach((ch, rx) => {
        const c = pal[ch]
        if (!c) return
        for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) this.set(x0 + rx * s + a, y0 + ry * s + b, c, z)
      }),
    )
  }
  suit(s: 'H' | 'D' | 'S' | 'C', cx: number, cy: number, scale = 1, c?: RGB, z: number = Z.front) {
    this.shape()
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
    if (this.s > 1) {
      // étincelle fine en croix, 1 pixel de large
      this.fine(cx - 1.5, cy, cx + 1.5, cy, c)
      this.fine(cx, cy - 1.5, cx, cy + 1.5, c)
      return
    }
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
      if (c && this.z[i] > Z.bg) this.col[i] = fn(c, i % this.W, Math.floor(i / this.W))
    }
  }

  /** Relief : liseré clair en haut à gauche de chaque forme, ombre en bas à droite. */
  bevel() {
    const W = this.W
    const H = this.H
    const out = [...this.col]
    const same = (i: number, x: number, y: number) =>
      x >= 0 && y >= 0 && x < W && y < H && this.rid[y * W + x] === this.rid[i] && this.z[y * W + x] === this.z[i]
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x
        const c = this.col[i]
        if (!c || this.z[i] <= Z.bg || this.z[i] === Z.detail) continue
        const br = !same(i, x + 1, y) || !same(i, x, y + 1) || !same(i, x + 1, y + 1)
        const br2 = !same(i, x + 2, y) || !same(i, x, y + 2)
        const tl = !same(i, x - 1, y) || !same(i, x, y - 1)
        if (br) out[i] = shadeOf(shadeOf(c).map((v, k) => Math.round((v + c[k]) / 2)) as RGB)
        else if (br2) out[i] = shadeOf(c)
        else if (tl) out[i] = lightOf(c)
      }
    this.col = out
  }

  /** Contours extérieurs + traits entre les parties. */
  outline() {
    this.bevel()
    const W = this.W
    const H = this.H
    const out = [...this.col]
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const z = this.getZ(x, y)
        const n4 = [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1],
        ]
        if (z <= Z.bg) {
          if (n4.some(([a, b]) => this.getZ(a, b) > Z.bg)) out[y * W + x] = C.ink
          continue
        }
        if (z !== Z.detail && n4.some(([a, b]) => this.getZ(a, b) > z && this.getZ(a, b) !== Z.detail)) out[y * W + x] = C.ink
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
    canvas.width = this.W
    canvas.height = this.H
    const ctx = canvas.getContext('2d')!
    const img = ctx.createImageData(this.W, this.H)
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
