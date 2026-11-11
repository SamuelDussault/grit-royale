// Générateur procédural de bouffons en pixel art (48 × 64 pixels, 1 pixel = 1 unité de carte).
// Formes géométriques + ombrage (lumière en haut à gauche) + contours, puis rendu dans un canvas.
// Chaque joker obtient une variante stable (chapeau, visage, yeux, bouche, accessoire, couleurs).

type RGB = [number, number, number]

const GW = 48
const GH = 64

function hexToRgb(h: string): RGB {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function mul(c: RGB, f: number): RGB {
  return c.map((v) => Math.max(0, Math.min(255, Math.round(v * f)))) as RGB
}
function mix(a: RGB, b: RGB, t: number): RGB {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB
}

class Grid {
  col: (RGB | null)[] = Array(GW * GH).fill(null)
  z = new Int8Array(GW * GH).fill(-1)
  set(x: number, y: number, c: RGB, z: number) {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= GW || y >= GH) return
    this.col[y * GW + x] = c
    this.z[y * GW + x] = z
  }
  get(x: number, y: number) {
    if (x < 0 || y < 0 || x >= GW || y >= GH) return null
    return this.col[y * GW + x]
  }
  zAt(x: number, y: number) {
    if (x < 0 || y < 0 || x >= GW || y >= GH) return -1
    return this.z[y * GW + x]
  }
}

/** Ton ombré : v > 0 = éclairé. Un léger tramage adoucit les transitions. */
function tone(base: RGB, v: number, x: number, y: number): RGB {
  const d = ((x + y) & 1) * 0.12 - 0.06
  const t = v + d
  if (t > 0.55) return mul(mix(base, [255, 255, 255], 0.25), 1.05)
  if (t > 0.18) return base
  if (t > -0.35) return mul(base, 0.82)
  return mul(base, 0.64)
}

function ellipse(g: Grid, cx: number, cy: number, rx: number, ry: number, base: RGB, z: number, flat = false) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x - cx) / rx
      const ny = (y - cy) / ry
      if (nx * nx + ny * ny > 1) continue
      g.set(x, y, flat ? base : tone(base, -0.75 * nx - 0.85 * ny, x, y), z)
    }
}

/** Corne de chapeau : courbe de Bézier épaisse, de plus en plus fine. */
function horn(g: Grid, p0: [number, number], p1: [number, number], p2: [number, number], r0: number, r1: number, base: RGB, z: number) {
  for (let t = 0; t <= 1; t += 0.01) {
    const x = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
    const y = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
    const r = r0 + (r1 - r0) * t
    for (let oy = -Math.ceil(r); oy <= Math.ceil(r); oy++)
      for (let ox = -Math.ceil(r); ox <= Math.ceil(r); ox++) {
        if (ox * ox + oy * oy > r * r) continue
        g.set(x + ox, y + oy, tone(base, (-ox * 0.8 - oy * 0.7) / r, Math.round(x + ox), Math.round(y + oy)), z)
      }
  }
}

function bell(g: Grid, x: number, y: number, z: number) {
  const gold: RGB = [249, 199, 79]
  ellipse(g, x, y, 3.2, 3.2, gold, z)
  g.set(x - 1, y - 1, [255, 247, 210], z)
  g.set(x, y + 2, [120, 80, 10], z)
  g.set(x + 1, y + 2, [120, 80, 10], z)
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

const HAT_COLORS: [string, string][] = [
  ['#e84a5f', '#2a9d8f'],
  ['#f4a261', '#6a4c93'],
  ['#4361ee', '#f72585'],
  ['#43aa8b', '#f9c74f'],
  ['#ef476f', '#118ab2'],
  ['#9b5de5', '#00bbf9'],
  ['#ff7f11', '#3a86ff'],
  ['#06d6a0', '#ef476f'],
  ['#d62828', '#fcbf49'],
  ['#3d5a80', '#ee6c4d'],
]
const FACES: string[] = ['#fbf3e4', '#fbf3e4', '#f6efe9', '#f6d5b5', '#e0ac7e', '#a86b45']
const HAIRS: string[] = ['#3b2a1a', '#c4572a', '#e8c15a', '#2a2a3a', '#7a4b9a']

export interface JesterOpts {
  rarityColor: string
  legendary?: boolean
  pvp?: boolean
}

function drawJester(seedKey: string, o: JesterOpts): Grid {
  const g = new Grid()
  const h = hashStr(seedKey)
  const pick = (n: number, shift: number) => (h >>> shift) % n
  const [ca, cb] = HAT_COLORS[pick(HAT_COLORS.length, 0)].map(hexToRgb) as [RGB, RGB]
  const face = hexToRgb(FACES[pick(FACES.length, 5)])
  const hair = hexToRgb(HAIRS[pick(HAIRS.length, 9)])
  const collar = hexToRgb(o.rarityColor)
  const white: RGB = [250, 248, 240]
  const dark: RGB = [29, 29, 43]
  const hatType = o.legendary ? 3 : [0, 0, 0, 1, 1, 2, 4, 3][pick(8, 12)]
  const eyeType = pick(5, 15)
  const mouthType = pick(5, 18)
  const prop = pick(4, 21)
  const makeup = pick(3, 24)
  const nose = pick(2, 27)

  // ---- corps (costume d'arlequin) ----
  for (let y = 47; y < GH; y++) {
    const half = 9 + (y - 47) * 0.55
    for (let x = Math.floor(24 - half); x <= Math.ceil(24 + half); x++) {
      const diamond = (Math.floor((x - 24 + y) / 5) + Math.floor((x - 24 - y) / 5)) & 1
      const base = diamond ? ca : cb
      g.set(x, y, tone(base, -(x - 24) / half - 0.1, x, y), 1)
    }
  }
  // boutons pompons
  for (const by of [51, 56, 61]) ellipse(g, 24, by, 1.6, 1.6, [249, 199, 79], 2)
  // bras + mains
  for (let y = 49; y < 60; y++) {
    for (let k = 0; k < 4; k++) {
      g.set(9 + k - (y - 49) * 0.15, y, tone(cb, k < 2 ? 0.4 : -0.2, 9 + k, y), 2)
      g.set(36 + k + (y - 49) * 0.15, y, tone(ca, k < 2 ? 0.2 : -0.4, 36 + k, y), 2)
    }
  }
  ellipse(g, 9.5, 60, 2.8, 2.6, face, 3)
  ellipse(g, 38.5, 60, 2.8, 2.6, face, 3)

  // accessoire dans la main droite
  if (prop === 1) {
    // carte à jouer
    for (let y = 50; y < 61; y++) for (let x = 39; x < 46; x++) g.set(x, y, x === 39 || y === 50 ? [255, 255, 255] : white, 9)
    for (const [x, y] of [[41, 54], [43, 54], [42, 55], [41, 55], [43, 55], [42, 56]]) g.set(x, y, [232, 56, 79], 9)
  } else if (prop === 2) {
    // marotte (bâton à grelot)
    for (let y = 40; y < 62; y++) g.set(42, y, [139, 90, 43], 9)
    for (let y = 40; y < 62; y++) g.set(43, y, [100, 62, 28], 9)
    ellipse(g, 42.5, 38, 3, 3, ca, 9)
    bell(g, 42.5, 34, 10)
  } else if (prop === 3) {
    // pièce d'or
    ellipse(g, 41, 56, 3.6, 3.6, [242, 182, 50], 9)
    g.set(41, 55, [255, 240, 180], 9)
    g.set(41, 56, [160, 110, 20], 9)
    g.set(41, 57, [160, 110, 20], 9)
  }

  // ---- col à volants ----
  for (let x = 9; x <= 39; x++) {
    const k = Math.floor((x - 9) / 5)
    const local = ((x - 9) % 5) / 5
    const bottom = 46 + Math.round(2.4 * Math.sin(local * Math.PI))
    const top = 40 + Math.round(Math.abs(x - 24) * 0.12)
    const base = k % 2 ? white : collar
    for (let y = top; y <= bottom; y++) g.set(x, y, tone(base, (-(x - 24) / 15) * 0.8 - (y - top) / 7 + 0.3, x, y), 4)
  }

  // ---- tête ----
  const hx = 24
  const hy = 30
  // cheveux sur les côtés (sous le chapeau)
  if (hatType >= 2) {
    ellipse(g, 13.5, 26, 3.5, 5, hair, 4)
    ellipse(g, 34.5, 26, 3.5, 5, hair, 4)
  }
  ellipse(g, hx, hy, 11.2, 11.5, face, 5)
  // oreilles
  ellipse(g, 12.6, 30, 1.8, 2.6, face, 4)
  ellipse(g, 35.4, 30, 1.8, 2.6, mul(face, 0.85), 4)

  // maquillage (losanges sous les yeux / joues)
  const cheek: RGB = [255, 143, 171]
  if (makeup === 0) {
    ellipse(g, 17, 34, 2.2, 1.6, cheek, 6, true)
    ellipse(g, 31, 34, 2.2, 1.6, cheek, 6, true)
  } else if (makeup === 1) {
    for (const cx of [19, 29])
      for (let dy = 0; dy < 5; dy++) for (let dx = -(2 - Math.abs(dy - 2)); dx <= 2 - Math.abs(dy - 2); dx++) g.set(cx + dx, 31 + dy, ca, 6)
  } else {
    for (const cx of [19, 29]) {
      g.set(cx, 31, cb, 6)
      g.set(cx, 32, cb, 6)
      g.set(cx, 33, cb, 6)
    }
    ellipse(g, 16.5, 35, 1.6, 1.2, cheek, 6, true)
    ellipse(g, 31.5, 35, 1.6, 1.2, cheek, 6, true)
  }

  // ---- yeux ----
  for (const ex of [19, 29]) {
    if (eyeType === 0) {
      ellipse(g, ex, 27.5, 2.4, 2.2, white, 6, true)
      g.set(ex + 0, 27, dark, 6)
      g.set(ex + 1, 27, dark, 6)
      g.set(ex + 0, 28, dark, 6)
      g.set(ex + 1, 28, dark, 6)
      g.set(ex, 27, [255, 255, 255], 6)
    } else if (eyeType === 1) {
      // yeux rieurs ^ ^
      for (let dx = -2; dx <= 2; dx++) g.set(ex + dx, 27 + Math.abs(dx) * 0.6, dark, 6)
    } else if (eyeType === 2) {
      // petits yeux ronds + sourcils
      g.set(ex, 27, dark, 6)
      g.set(ex + 1, 27, dark, 6)
      g.set(ex, 28, dark, 6)
      g.set(ex + 1, 28, dark, 6)
      for (let dx = -2; dx <= 2; dx++) g.set(ex + dx + 0.5, 24 - (ex < 24 ? -dx : dx) * 0.3, dark, 6)
    } else if (eyeType === 3) {
      // paupières mi-closes
      ellipse(g, ex, 28, 2.4, 1.6, white, 6, true)
      for (let dx = -2; dx <= 2; dx++) g.set(ex + dx, 27, dark, 6)
      g.set(ex, 28, dark, 6)
      g.set(ex + 1, 28, dark, 6)
    } else {
      // grands yeux brillants
      ellipse(g, ex, 27.5, 2.8, 2.8, white, 6, true)
      ellipse(g, ex + 0.5, 28, 1.7, 1.9, ca, 6, true)
      g.set(ex + 0.5, 28, dark, 6)
      g.set(ex - 0.5, 27, [255, 255, 255], 6)
    }
  }

  // ---- nez ----
  if (nose === 0) {
    ellipse(g, 24, 32, 2.2, 2, [232, 56, 79], 6)
    g.set(23, 31, [255, 190, 200], 6)
  } else {
    g.set(24, 32, mul(face, 0.75), 6)
    g.set(24, 33, mul(face, 0.75), 6)
  }

  // ---- bouche ----
  const lip: RGB = [180, 30, 50]
  if (mouthType === 0 || mouthType === 1) {
    for (let x = 18; x <= 30; x++) {
      const u = 1 - ((x - 24) / 6.5) ** 2
      const top = 36 + Math.round(1.2 * u)
      const bot = 36 + Math.round(4.2 * u)
      for (let y = top; y <= bot; y++) {
        let c: RGB = lip
        if (mouthType === 1 && y === top && x > 18 && x < 30) c = [255, 255, 255]
        if (y === bot && Math.abs(x - 24) < 3 && bot - top > 2) c = [255, 120, 140]
        g.set(x, y, c, 6)
      }
    }
  } else if (mouthType === 2) {
    ellipse(g, 24, 38, 2.2, 2.6, lip, 6, true)
    g.set(24, 39, [255, 120, 140], 6)
  } else if (mouthType === 3) {
    for (let x = 19; x <= 29; x++) g.set(x, 37 + (x > 25 ? -(x - 25) * 0.5 : 0), lip, 6)
  } else {
    for (let x = 18; x <= 30; x++) {
      const u = 1 - ((x - 24) / 6.5) ** 2
      for (let y = 36; y <= 36 + Math.round(3.5 * u); y++) g.set(x, y, x % 3 === 0 ? [200, 200, 200] : [255, 255, 255], 6)
      g.set(x, 36, lip, 6)
      g.set(x, 36 + Math.round(3.5 * u) + 1, lip, 6)
    }
  }

  // ---- chapeau ----
  if (hatType === 0 || hatType === 1) {
    if (hatType === 0) {
      horn(g, [17, 19], [6, 17], [4, 5], 4.2, 1.6, ca, 7)
      horn(g, [31, 19], [42, 17], [44, 5], 4.2, 1.6, ca, 7)
      horn(g, [24, 18], [23, 9], [26, 2], 4.4, 1.6, cb, 7)
      bell(g, 4, 4, 8)
      bell(g, 44, 4, 8)
      bell(g, 26, 2, 8)
    } else {
      horn(g, [18, 19], [8, 4], [3, 17], 4.6, 1.6, ca, 7)
      horn(g, [30, 19], [40, 4], [45, 17], 4.6, 1.6, cb, 7)
      bell(g, 3, 19, 8)
      bell(g, 45, 19, 8)
    }
    // bandeau
    for (let x = 12; x <= 36; x++) {
      const yy = 19 + Math.round(((x - 24) / 12) ** 2 * 2)
      for (let y = yy - 2; y <= yy + 1; y++) {
        const base = Math.floor(x / 3) % 2 ? ca : cb
        g.set(x, y, tone(base, -(x - 24) / 12 - (y - yy) / 3, x, y), 7)
      }
    }
  } else if (hatType === 2) {
    // haut-de-forme
    const top: RGB = [45, 45, 60]
    for (let y = 3; y <= 17; y++) for (let x = 15; x <= 33; x++) g.set(x, y, tone(top, -(x - 24) / 9 - 0.1, x, y), 7)
    for (let y = 13; y <= 15; y++) for (let x = 15; x <= 33; x++) g.set(x, y, tone(ca, -(x - 24) / 9, x, y), 7)
    ellipse(g, 24, 19, 16, 2.2, top, 7)
    ellipse(g, 30, 9, 1.5, 3, [80, 80, 100], 7, true)
  } else if (hatType === 3) {
    // couronne
    const gold: RGB = [242, 182, 50]
    for (let x = 12; x <= 36; x++)
      for (let y = 13; y <= 20; y++) g.set(x, y, tone(gold, -(x - 24) / 12 - (y - 16) / 6, x, y), 7)
    for (const sx of [13, 18.5, 24, 29.5, 35]) {
      for (let k = 0; k < 9; k++) for (let dx = -Math.floor((9 - k) / 3); dx <= Math.floor((9 - k) / 3); dx++) g.set(sx + dx, 13 - k, tone(gold, -dx / 3 + 0.2, sx + dx, 13 - k), 7)
      ellipse(g, sx, 3.5, 1.5, 1.5, [255, 247, 210], 8, true)
    }
    for (const gx of [18, 24, 30]) ellipse(g, gx, 16.5, 1.7, 1.7, gx === 24 ? [232, 56, 79] : [59, 143, 243], 8)
  } else {
    // bonnet à pompon
    for (let y = 6; y <= 20; y++)
      for (let x = 10; x <= 38; x++) {
        const nx = (x - 24) / 14
        const ny = (y - 20) / 14
        if (nx * nx + ny * ny > 1) continue
        const stripe = Math.floor(y / 3) % 2 ? ca : cb
        g.set(x, y, tone(stripe, -nx * 0.9 - ny * 0.4, x, y), 7)
      }
    for (let x = 10; x <= 38; x++) for (let y = 18; y <= 21; y++) g.set(x, y, tone(white, -(x - 24) / 14, x, y), 7)
    ellipse(g, 24, 5, 4, 4, white, 8)
  }

  return g
}

/** Ajoute contours extérieurs et traits entre les parties. */
function outline(g: Grid) {
  const out: (RGB | null)[] = [...g.col]
  const ink: RGB = [29, 29, 43]
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++) {
      const c = g.get(x, y)
      const n4 = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ]
      if (!c) {
        if (n4.some(([a, b]) => g.get(a, b))) out[y * GW + x] = ink
        continue
      }
      const z = g.zAt(x, y)
      // trait sombre là où une partie passe devant celle-ci (les détails du visage ne comptent pas)
      if (z !== 6 && n4.some(([a, b]) => g.zAt(a, b) > z && g.zAt(a, b) !== 6)) out[y * GW + x] = mul(c, 0.45)
    }
  g.col = out
}

const cache = new Map<string, string>()

/** Image (data URL) du bouffon pour ce joker. Mise en cache. */
export function jesterImage(defId: string, o: JesterOpts): string {
  const key = defId + o.rarityColor
  const hit = cache.get(key)
  if (hit) return hit
  const g = drawJester(defId, o)
  outline(g)
  const canvas = document.createElement('canvas')
  canvas.width = GW
  canvas.height = GH
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(GW, GH)
  g.col.forEach((c, i) => {
    if (!c) return
    img.data[i * 4] = c[0]
    img.data[i * 4 + 1] = c[1]
    img.data[i * 4 + 2] = c[2]
    img.data[i * 4 + 3] = 255
  })
  ctx.putImageData(img, 0, 0)
  const url = canvas.toDataURL()
  cache.set(key, url)
  return url
}

export const JESTER_W = GW
export const JESTER_H = GH
