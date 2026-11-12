// Cartes légendaires « full art » : toute la carte est illustrée, en double résolution
// (2 × 2 pixels par unité de scène). Coordonnées de scène : x de −12 à 59, y de −7 à 88,
// le personnage reste centré en (23.5, 36) comme sur les autres jokers.
import { C, hex, mix, mul, Painter, shadeOf, Z, type RGB } from './painter'
import { jester } from './figures'

type Scene = (p: Painter) => void

const X0 = -12
const X1 = 59
const Y0 = -7
const Y1 = 88

// ---------- fonds ----------
/** Halo radial en anneaux (pixel art) + rayons alternés. */
function aura(p: Painter, cx: number, cy: number, inner: RGB, outer: RGB, opt: { rays?: number; rayCol?: RGB; rings?: number } = {}) {
  const rings = opt.rings ?? 9
  for (let py = 0; py < p.H; py++)
    for (let px = 0; px < p.W; px++) {
      const x = (px + 0.5) / p.s - 0.5 - p.ox
      const y = (py + 0.5) / p.s - 0.5 - p.oy
      const d = Math.hypot(x - cx, (y - cy) * 0.9)
      const t = Math.min(1, d / 62)
      let c = mix(inner, outer, Math.floor(t * rings) / rings)
      if (opt.rays) {
        const a = Math.atan2(y - cy, x - cx)
        if (Math.floor(((a + Math.PI) / (Math.PI * 2)) * opt.rays) % 2) c = mix(c, opt.rayCol ?? mul(c, 0.86), 0.55)
      }
      p.col[py * p.W + px] = c
      p.z[py * p.W + px] = Z.bg
    }
}

/** Étoiles et poussière dorée sur le fond. */
function dust(p: Painter, n: number, c: RGB, seed = 1, big = 0.18) {
  let h = seed * 9301 + 49297
  const rnd = () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff
    return h / 0x7fffffff
  }
  for (let i = 0; i < n; i++) {
    const x = X0 + rnd() * (X1 - X0)
    const y = Y0 + rnd() * (Y1 - Y0)
    if (rnd() < big) p.sparkle(x, y, c)
    else p.dot(x, y, c, Z.bg)
  }
}

/** Grande carte à jouer (format 15 × 21 par défaut). */
function bigCard(p: Painter, x: number, y: number, rank: string, suit: 'H' | 'D' | 'S' | 'C', z: number = Z.back, w = 15, h = 21) {
  const col = suit === 'H' || suit === 'D' ? C.suitRed : C.suitDark
  p.rect(x, y, w, h, C.white, z)
  p.text(rank, x + 1.5, y + 1.5, col, Z.detail)
  p.suit(suit, x + w / 2, y + h / 2 + 2, 1, col, Z.detail)
  p.suit(suit, x + w - 3.5, y + h - 3.5, 1, col, Z.detail)
}

/** Flamme en couches (du rouge au blanc). */
function flame(p: Painter, cx: number, base: number, w: number, h: number, z: number = Z.front) {
  const layers: [RGB, number][] = [
    [hex('#c8202f'), 1],
    [C.orange, 0.78],
    [C.yellow, 0.55],
    [hex('#fff6d0'), 0.3],
  ]
  for (const [c, k] of layers) {
    const ww = w * k
    const hh = h * k
    p.poly(
      [
        [cx - ww, base],
        [cx - ww * 0.9, base - hh * 0.45],
        [cx - ww * 0.35, base - hh * 0.7],
        [cx - ww * 0.15, base - hh * 0.55],
        [cx, base - hh],
        [cx + ww * 0.3, base - hh * 0.62],
        [cx + ww * 0.55, base - hh * 0.78],
        [cx + ww * 0.95, base - hh * 0.4],
        [cx + ww, base],
        [cx, base + ww * 0.35],
      ],
      c,
      z,
      true,
    )
  }
}

function embers(p: Painter, cx: number, cy: number, spread: number, n: number, seed = 3) {
  let h = seed
  for (let i = 0; i < n; i++) {
    h = (h * 16807) % 2147483647
    const a = (h % 1000) / 1000
    h = (h * 16807) % 2147483647
    const b = (h % 1000) / 1000
    const x = cx + (a - 0.5) * spread * 2
    const y = cy - b * spread * 1.6
    p.dot(x, y, i % 3 ? C.yellow : C.orange, Z.detail)
    if (i % 4 === 0) p.dot(x, y - 0.5, hex('#fff6d0'), Z.detail)
  }
}

/** Couronne de laurier dorée. */
function laurel(p: Painter, cx: number, cy: number, r: number, c: RGB = C.gold) {
  for (const side of [-1, 1])
    for (let i = 0; i < 7; i++) {
      const a = Math.PI / 2 + side * (0.35 + i * 0.32)
      const x = cx + Math.cos(a) * r
      const y = cy + Math.sin(a) * r * 0.9
      p.ell(x, y, 2.2, 1.2, i % 2 ? c : mul(c, 0.85), Z.back)
    }
}

/** Lumière : éclaircit les pixels de fond à l'intérieur d'un polygone. */
function beam(p: Painter, pts: [number, number][], c: RGB, t: number) {
  const inside = (x: number, y: number) => {
    let r = false
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i]
      const [xj, yj] = pts[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) r = !r
    }
    return r
  }
  for (let py = 0; py < p.H; py++)
    for (let px = 0; px < p.W; px++) {
      const i = py * p.W + px
      if (p.z[i] !== Z.bg || !p.col[i]) continue
      const x = (px + 0.5) / p.s - 0.5 - p.ox
      const y = (py + 0.5) / p.s - 0.5 - p.oy
      if (inside(x, y)) p.col[i] = mix(p.col[i]!, c, t)
    }
}

// ---------- scènes ----------
export const HD_SCENES: Record<string, Scene> = {
  triboulet: (p) => {
    aura(p, 23.5, 34, hex('#b26ad8'), hex('#2a0f3d'), { rays: 22 })
    dust(p, 70, C.yellow, 2)
    bigCard(p, -6, 18, 'K', 'H', Z.back)
    bigCard(p, 38, 18, 'Q', 'S', Z.back)
    laurel(p, 23.5, 34, 23)
    jester(p, { ca: C.gold, cb: C.violet, collar: C.gold, hat: 'crown', eyes: 'star', mouth: 'teeth', hair: C.violet, arms: 'hold' })
    // sceptre
    p.line(44, 76, 48, 40, C.gold, Z.top, 2)
    p.ell(48, 37, 3.2, 3.2, C.red, Z.top)
    p.dot(47, 36, C.pure)
    for (let i = 0; i < 4; i++) p.ell(-6 + i * 3, 84, 1.2, 1.2, C.gold, Z.top)
  },
  chicot: (p) => {
    aura(p, 23.5, 34, hex('#3fb8a8'), hex('#082225'), { rays: 16 })
    dust(p, 60, hex('#9fffe8'), 4)
    // éventail de cartes derrière
    for (let i = 0; i < 5; i++) bigCard(p, -8 + i * 13, 10 - Math.abs(i - 2) * 3, ['A', 'K', 'Q', 'J', '10'][i], (['S', 'H', 'C', 'D', 'S'] as const)[i], Z.back)
    // flammes vertes
    for (const x of [-6, 53]) {
      p.ell(x, 72, 5, 12, hex('#1fd18f'), Z.back)
      p.ell(x, 74, 3, 8, hex('#b8ffe0'), Z.back, true)
    }
    jester(p, { ca: C.teal, cb: C.black, collar: C.gold, eyes: 'brow', mouth: 'grin', hat: 'horns2' })
    p.text('×4', 15, 78, C.yellow, Z.detail, 2)
  },
  canio: (p) => {
    aura(p, 23.5, 30, hex('#d23a5a'), hex('#24040d'), { rays: 18, rayCol: hex('#3a0712') })
    // figures brisées qui tombent
    const shards: [number, number, string, 'H' | 'S'][] = [
      [-8, 4, 'K', 'S'],
      [44, 0, 'Q', 'H'],
      [-6, 50, 'J', 'H'],
      [46, 46, 'K', 'H'],
    ]
    for (const [x, y, r, s] of shards) {
      bigCard(p, x, y, r, s, Z.back, 13, 18)
      p.fine(x + 2, y + 3, x + 7, y + 9, C.ink, Z.detail)
      p.fine(x + 7, y + 9, x + 5, y + 16, C.ink, Z.detail)
      p.fine(x + 7, y + 9, x + 11, y + 12, C.ink, Z.detail)
    }
    jester(p, { ca: C.white, cb: C.black, collar: C.red, eyes: 'tear', mouth: 'frown', makeup: 1 })
    for (let i = 0; i < 6; i++) p.ell(14 + i * 2.5, 48 + (i % 2) * 2, 0.6, 1, hex('#8fd3ff'), Z.detail, true)
  },
  promethee: (p) => {
    aura(p, 23.5, 22, hex('#ff9a3c'), hex('#1a0608'), { rays: 20, rayCol: hex('#3a0d0d') })
    // rochers + chaînes
    p.poly([[X0, 88], [X0, 66], [2, 60], [14, 68], [24, 62], [36, 70], [48, 60], [X1, 66], [X1, 88]], hex('#4a3a40'), Z.back)
    for (const side of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const x = 23.5 + side * (8 + i * 3.6)
        const y = 52 + i * 1.6
        p.ell(x, y, 1.8, 1.2, i % 2 ? C.grey : C.lgrey, Z.mid)
      }
    }
    // torche
    p.poly([[20, 46], [27, 46], [25.5, 84], [21.5, 84]], hex('#7a4a22'), Z.mid)
    for (let y = 52; y < 84; y += 5) p.fine(21, y, 26, y + 2, hex('#4e2c12'))
    p.rect(17, 41, 13, 6, C.gold, Z.front)
    p.rect(18, 39, 11, 3, mul(C.gold, 0.8), Z.front)
    flame(p, 23.5, 41, 13, 38, Z.top)
    embers(p, 23.5, 10, 26, 60, 7)
    p.text('×0.5', 15, -4, C.yellow, Z.detail, 1)
  },
  pandora: (p) => {
    aura(p, 23.5, 34, hex('#fff1a8'), hex('#1d1030'), { rays: 26, rayCol: hex('#ffe680') })
    // faisceau de lumière qui sort de la boîte
    beam(p, [[4, 54], [43, 54], [58, -7], [-11, -7]], hex('#fffbe8'), 0.6)
    dust(p, 80, C.pure, 6, 0.3)
    // cartes qui s'échappent
    bigCard(p, -4, 4, 'K', 'H', Z.mid)
    bigCard(p, 16, -4, 'Q', 'S', Z.mid)
    bigCard(p, 36, 6, 'J', 'D', Z.mid)
    bigCard(p, 4, 24, 'K', 'C', Z.mid, 13, 18)
    bigCard(p, 30, 26, 'Q', 'H', Z.mid, 13, 18)
    // boîte
    const box = hex('#6a2a7a')
    p.rect(0, 56, 47, 28, box, Z.front)
    p.rect(0, 62, 47, 3, C.gold, Z.top)
    p.rect(0, 78, 47, 3, C.gold, Z.top)
    for (const x of [0, 44]) p.rect(x, 56, 3, 28, C.gold, Z.top)
    p.rect(20, 59, 7, 10, C.gold, Z.top)
    p.ell(23.5, 63, 1.5, 1.5, C.ink, Z.detail, true)
    p.rect(22.8, 63, 1.5, 3, C.ink, Z.detail, true)
    // couvercle ouvert
    p.poly([[-3, 54], [50, 54], [46, 40], [1, 46]], hex('#8e4aa0'), Z.front)
    p.poly([[-3, 54], [50, 54], [49, 51], [-2, 51]], C.gold, Z.top)
    for (const [x, y] of [[8, 70], [36, 72], [24, 74]] as const) p.sparkle(x, y, C.yellow)
  },
  divineDie: (p) => {
    aura(p, 23.5, 34, hex('#fff7dc'), hex('#3a6fd0'), { rays: 24, rayCol: hex('#ffe9a0') })
    // nuages
    for (const [x, y, r] of [[-6, 74, 10], [6, 80, 9], [20, 78, 11], [36, 80, 10], [52, 74, 10]] as const) p.ell(x, y, r, r * 0.6, C.pure, Z.back)
    // auréole
    p.ell(23.5, 2, 12, 3, C.yellow, Z.mid)
    p.ell(23.5, 2, 9, 1.6, hex('#fff7dc'), Z.mid, true)
    // dé isométrique
    const top: [number, number][] = [[23.5, 12], [44, 22], [23.5, 32], [3, 22]]
    const left: [number, number][] = [[3, 22], [23.5, 32], [23.5, 60], [3, 50]]
    const right: [number, number][] = [[23.5, 32], [44, 22], [44, 50], [23.5, 60]]
    p.poly(top, C.pure, Z.front, true)
    p.poly(left, hex('#e9e4f2'), Z.front, true)
    p.poly(right, hex('#c9c2dc'), Z.front, true)
    const pip = (x: number, y: number, c: RGB = C.red) => p.ell(x, y, 2, 1.6, c, Z.top, true)
    pip(23.5, 22) // 1 sur le dessus
    for (const [x, y] of [[8, 31], [13.5, 37], [19, 43], [8, 41], [19, 33]] as const) pip(x, y, C.ink) // 5 à gauche
    for (const [x, y] of [[28, 38], [39, 32], [28, 46], [39, 40], [28, 54], [39, 48]] as const) pip(x, y, C.ink) // 6 à droite
    // ailes
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const x = 23.5 + side * (24 + i * 4)
        p.ell(x, 30 + i * 4, 4.5, 9 - i, C.pure, Z.mid)
      }
    }
    p.text('×4', 1, 64, C.red, Z.detail, 2)
    p.text('×.5', 34, 64, C.blue, Z.detail, 1)
  },
  chronomancer: (p) => {
    aura(p, 23.5, 30, hex('#5b7bd6'), hex('#0b1030'), { rays: 12, rayCol: hex('#10184a') })
    dust(p, 90, hex('#cfe0ff'), 8)
    // horloge géante derrière
    p.ell(23.5, 28, 30, 30, C.gold, Z.back)
    p.ell(23.5, 28, 27, 27, hex('#f6efdc'), Z.back)
    const roman = ['XII', 'III', 'VI', 'IX']
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2
      p.ell(23.5 + Math.cos(a) * 23, 28 + Math.sin(a) * 23, 1, 1, C.ink, Z.back, true)
    }
    roman.forEach((t, i) => {
      const a = (i / 4) * Math.PI * 2 - Math.PI / 2
      p.text(t, 23.5 + Math.cos(a) * 19 - t.length * 2 + 0.5, 28 + Math.sin(a) * 19 - 2, C.ink, Z.detail)
    })
    // aiguilles qui dépassent derrière la tête
    p.line(23.5, 28, 40, 6, C.ink, Z.back, 1)
    p.line(23.5, 28, 2, 18, C.ink, Z.back, 1)
    jester(p, { ca: hex('#3b4ec0'), cb: hex('#1a1f5a'), collar: C.gold, hat: 'hood', eyes: 'spiral', mouth: 'smirk', arms: 'hold' })
    // sablier dans la main
    p.rect(40, 62, 10, 2, C.gold, Z.top)
    p.rect(40, 78, 10, 2, C.gold, Z.top)
    p.poly([[41, 64], [49, 64], [45.5, 71], [44.5, 71]], hex('#d6eef8'), Z.top)
    p.poly([[44.5, 71], [45.5, 71], [49, 78], [41, 78]], hex('#d6eef8'), Z.top)
    p.poly([[43, 74], [47, 74], [48.5, 77.5], [41.5, 77.5]], C.gold, Z.detail, true)
    p.text('×2', -8, 78, C.cyan, Z.detail, 2)
  },
  emperor: (p) => {
    aura(p, 23.5, 30, hex('#e8434f'), hex('#2a0508'), { rays: 20, rayCol: hex('#3a0a10') })
    // trône
    p.rect(-4, 4, 55, 84, hex('#7a1020'), Z.back)
    p.rect(-1, 8, 49, 80, hex('#a81c30'), Z.back)
    p.poly([[-4, 4], [23.5, -6], [51, 4]], C.gold, Z.back)
    for (const x of [-4, 49]) p.ell(x + 1, 2, 3, 3, C.gold, Z.back)
    // cape d'hermine
    p.poly([[-10, 88], [-6, 62], [6, 58], [41, 58], [53, 62], [57, 88]], hex('#c8102e'), Z.body)
    p.rect(-8, 58, 63, 6, C.pure, Z.mid)
    for (let x = -6; x < 56; x += 5) p.rect(x, 60, 1, 2, C.ink, Z.detail, true)
    jester(p, { ca: C.gold, cb: C.red, collar: C.pure, hat: 'crown', eyes: 'brow', mouth: 'smirk', hair: C.dbrown, body: false })
    // orbe et sceptre
    p.ell(4, 76, 5, 5, C.gold, Z.top)
    p.rect(3, 69, 2, 3, C.gold, Z.top)
    p.line(43, 86, 47, 54, C.gold, Z.top, 2)
    p.star(47, 51, 4, C.yellow, Z.top)
    p.text('×N', 16, 78, C.yellow, Z.detail, 2)
  },
  phoenixAshes: (p) => {
    aura(p, 23.5, 52, hex('#5a3a30'), hex('#120a0a'), { rays: 10, rayCol: hex('#1c1210') })
    // fumée
    for (let i = 0; i < 6; i++) p.ell(18 + (i % 2) * 10, 30 - i * 6, 7 - i * 0.6, 4, mix(hex('#5a5560'), hex('#2a2428'), i / 6), Z.back)
    // urne
    const urn = hex('#3a3540')
    p.ell(23.5, 66, 17, 16, urn, Z.mid)
    p.rect(13, 44, 21, 8, urn, Z.mid)
    p.rect(9, 42, 29, 4, C.gold, Z.front)
    p.rect(14, 80, 19, 6, urn, Z.mid)
    p.rect(11, 84, 25, 3, C.gold, Z.front)
    // braises dans les cendres
    p.ell(23.5, 42, 12, 3, hex('#5a5560'), Z.top)
    for (const [x, c] of [[17, C.orange], [23, C.red], [29, C.yellow], [20, C.yellow], [27, C.orange]] as [number, RGB][]) p.ell(x, 41.5, 1.2, 0.8, c, Z.detail, true)
    // motif d'oiseau gravé
    p.fine(14, 66, 23.5, 72, C.gold)
    p.fine(33, 66, 23.5, 72, C.gold)
    p.fine(23.5, 72, 23.5, 62, C.gold)
    p.fine(17, 62, 23.5, 66, C.gold)
    p.fine(30, 62, 23.5, 66, C.gold)
    embers(p, 23.5, 36, 14, 26, 11)
    p.text('?', 21.5, 4, C.orange, Z.detail, 2)
  },
  phoenix: (p) => {
    aura(p, 23.5, 34, hex('#fff1b0'), hex('#8a1020'), { rays: 28, rayCol: hex('#ffcf60') })
    // ailes déployées en flammes
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const tipX = 23.5 + side * (14 + i * 6.5)
        const tipY = 4 + i * 6
        const col = [hex('#c8202f'), C.red, C.orange, C.orange, C.yellow, C.yellow][i]
        p.poly(
          [
            [23.5 + side * 4, 34 + i * 2],
            [tipX, tipY],
            [tipX - side * 4, tipY + 10],
            [23.5 + side * 6, 44 + i * 2],
          ],
          col,
          Z.mid,
        )
      }
    }
    // corps
    p.ell(23.5, 46, 7, 13, C.orange, Z.front)
    p.ell(23.5, 49, 4, 8, C.yellow, Z.front)
    // tête + bec + crête
    p.ell(23.5, 28, 6, 6, C.red, Z.top)
    p.poly([[22, 31], [25, 31], [23.5, 37]], C.gold, Z.top)
    p.ell(21, 27, 1.2, 1.2, C.pure, Z.detail, true)
    p.ell(26, 27, 1.2, 1.2, C.pure, Z.detail, true)
    p.dot(21, 27, C.ink)
    p.dot(26, 27, C.ink)
    for (let i = -2; i <= 2; i++) p.ell(23.5 + i * 2.5, 20 - (2 - Math.abs(i)) * 2, 1.2, 3, i % 2 ? C.yellow : C.orange, Z.mid)
    // queue
    for (let i = -2; i <= 2; i++) p.bez([23.5, 58], [23.5 + i * 6, 70], [23.5 + i * 10, 86], 2.5, 1, [C.red, C.orange, C.yellow, C.orange, C.red][i + 2], Z.mid)
    embers(p, 23.5, 80, 30, 70, 13)
    p.text('×3', 15, -4, C.pure, Z.detail, 2)
  },
  gluttony: (p) => {
    aura(p, 23.5, 34, hex('#7fd06a'), hex('#0e2a10'), { rays: 18, rayCol: hex('#164018') })
    // cœurs qui volent vers la bouche
    for (const [x, y, s] of [[-6, 10, 2], [48, 6, 2], [-4, 40, 1], [50, 36, 1], [44, 22, 1]] as const) p.suit('H', x, y, s, C.red, Z.mid)
    jester(p, { ca: hex('#5a9a3a'), cb: hex('#8b2a5a'), collar: C.gold, face: hex('#f6e6c8'), hat: 'horns3', eyes: 'angry', mouth: 'teeth', arms: 'hold' })
    // gros ventre
    p.ell(23.5, 80, 18, 10, shadeOf(hex('#8b2a5a')), Z.mid)
    // fourchette et couteau
    p.line(2, 78, 2, 50, C.lgrey, Z.top, 2)
    for (const dx of [-1.5, 0, 1.5]) p.fine(2 + dx, 50, 2 + dx, 44, C.lgrey, Z.top)
    p.poly([[44, 78], [46, 78], [47, 48], [43, 54]], C.lgrey, Z.top)
    p.text('+5', -9, 80, C.yellow, Z.detail, 2)
  },
  puppeteer: (p) => {
    aura(p, 23.5, 40, hex('#6a2a8a'), hex('#12061c'), { rays: 14, rayCol: hex('#1c0a2a') })
    // rideaux de théâtre
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? -12 : 47
      p.rect(x0, -7, 12, 95, hex('#a81c30'), Z.back)
      for (let k = 0; k < 3; k++) p.fine(x0 + 3 + k * 3, -7, x0 + 3 + k * 3, 88, hex('#6a0d1c'), Z.detail)
    }
    p.rect(-12, -7, 71, 5, hex('#c8962e'), Z.mid)
    // la marionnette
    jester(p, { ca: C.red, cb: C.blue, collar: C.white, hat: 'horns3', eyes: 'x', mouth: 'o', arms: 'up' })
    // barre de contrôle + mains gantées
    p.rect(4, 0, 39, 3, hex('#8b5a2b'), Z.top)
    p.rect(22, -6, 3, 10, hex('#8b5a2b'), Z.top)
    p.ell(10, -2, 6, 4, C.pure, Z.top)
    p.ell(37, -2, 6, 4, C.pure, Z.top)
    // fils
    for (const [x0, x1, y1] of [[6, 6, 70], [41, 41, 70], [16, 18, 20], [31, 29, 20], [23.5, 23.5, 10]] as const) p.fine(x0, 3, x1, y1, hex('#e8e0f8'), Z.detail)
    p.text('TON JOKER', 5.5, 82, C.yellow, Z.detail)
  },
  ouroboros: (p) => {
    aura(p, 23.5, 40, hex('#3a8a5a'), hex('#06160c'), { rays: 30, rayCol: hex('#0a2414') })
    dust(p, 50, hex('#b8ffd0'), 9)
    // serpent en anneau
    const cx = 23.5
    const cy = 40
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2 - Math.PI / 2 + 0.35
      const r = 6.2 - (i / 64) * 3.2
      p.ell(cx + Math.cos(a) * 24, cy + Math.sin(a) * 28, r, r, i % 4 < 2 ? hex('#2fae5a') : hex('#c8a22e'), Z.mid)
    }
    // tête qui mord la queue
    const hx = cx + Math.cos(-Math.PI / 2 + 0.2) * 24
    const hy = cy + Math.sin(-Math.PI / 2 + 0.2) * 28
    p.ell(hx, hy, 7, 5.5, hex('#2fae5a'), Z.front)
    p.ell(hx - 3, hy - 2, 1.6, 1.6, C.yellow, Z.detail, true)
    p.dot(hx - 3, hy - 2, C.ink)
    p.poly([[hx - 8, hy + 1], [hx - 3, hy + 2], [hx - 8, hy + 4]], C.pure, Z.top)
    // gemme au centre
    p.poly([[cx, 28], [cx + 9, 40], [cx, 52], [cx - 9, 40]], hex('#4cd17a'), Z.mid)
    p.poly([[cx, 32], [cx + 5, 40], [cx, 48], [cx - 5, 40]], hex('#b8ffd0'), Z.front)
    p.text('+×0.2', 13, 78, C.yellow, Z.detail)
  },
  midas: (p) => {
    aura(p, 23.5, 34, hex('#fff2b0'), hex('#7a5208'), { rays: 22, rayCol: hex('#f2c94a') })
    dust(p, 70, C.pure, 10, 0.3)
    jester(p, { ca: C.gold, cb: hex('#d9a520'), collar: hex('#fff2b0'), face: hex('#f6d77a'), hair: hex('#b8791a'), hat: 'crown', eyes: 'dollar', mouth: 'grin', arms: 'hold' })
    // cartes qui deviennent en or au contact
    const goldCard = (x: number, y: number, rank: string) => {
      p.rect(x, y, 13, 18, C.gold, Z.top)
      p.text(rank, x + 1.5, y + 1.5, hex('#7a5208'), Z.detail)
      p.suit('D', x + 6.5, y + 10, 1, hex('#7a5208'), Z.detail)
    }
    goldCard(-9, 60, 'K')
    goldCard(43, 60, 'A')
    // gouttes d'or
    for (const [x, y] of [[-4, 80], [-1, 84], [48, 81], [51, 85]] as const) p.ell(x, y, 1.2, 1.8, C.gold, Z.top)
  },
  fateEye: (p) => {
    aura(p, 23.5, 36, hex('#3a2a7a'), hex('#05030f'), { rays: 0 })
    dust(p, 120, hex('#d8ccff'), 12, 0.25)
    // cartes en orbite
    const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7']
    const suits = ['S', 'H', 'D', 'C'] as const
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2
      bigCard(p, 23.5 + Math.cos(a) * 30 - 6, 38 + Math.sin(a) * 40 - 8, ranks[i], suits[i % 4], Z.back, 12, 16)
    }
    // l'œil
    p.ell(23.5, 38, 22, 13, C.pure, Z.mid)
    p.ell(23.5, 38, 10, 10, hex('#8b5bd8'), Z.front)
    p.ell(23.5, 38, 6.5, 6.5, hex('#c9a2ff'), Z.front, true)
    p.ell(23.5, 38, 4, 4, C.ink, Z.top, true)
    p.ell(21, 35.5, 1.6, 1.6, C.pure, Z.detail, true)
    // cils
    for (let i = -3; i <= 3; i++) p.fine(23.5 + i * 6, 25 - Math.abs(i) * 0.5 + (Math.abs(i) === 3 ? 4 : 0), 23.5 + i * 7.5, 19 - Math.abs(i) * 0.2 + (Math.abs(i) === 3 ? 4 : 0), C.ink)
    p.text('×3', 17, 78, C.yellow, Z.detail, 2)
  },
  celestialBanker: (p) => {
    aura(p, 23.5, 30, hex('#2a3f8a'), hex('#060a1e'), { rays: 0 })
    dust(p, 140, hex('#e8eeff'), 14, 0.2)
    // constellation de pièces
    const pts: [number, number][] = [[-6, 6], [6, -2], [18, 4], [32, -3], [46, 5], [54, -2]]
    for (let i = 0; i + 1 < pts.length; i++) p.fine(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], hex('#9fb4e0'), Z.bg)
    for (const [x, y] of pts) p.coin(x, y, 2.5, Z.mid)
    jester(p, { ca: hex('#1d2f6a'), cb: C.gold, collar: C.pure, hat: 'top', eyes: 'dollar', mouth: 'smirk', arms: 'hold' })
    // pile de pièces qui monte sans fin
    for (let i = 0; i < 9; i++) p.ell(46, 84 - i * 3, 6, 2, i % 2 ? C.gold : hex('#ffe48a'), Z.top)
    for (let i = 0; i < 5; i++) p.ell(1, 84 - i * 3, 6, 2, i % 2 ? C.gold : hex('#ffe48a'), Z.top)
    p.text('$$$', 14, 82, C.yellow, Z.detail)
  },
  blackHole: (p) => {
    aura(p, 23.5, 38, hex('#3a1a4a'), hex('#040208'), { rays: 0 })
    dust(p, 120, hex('#e8e0ff'), 15, 0.15)
    // disque d'accrétion : anneaux brûlants + bras de spirale sombres
    const rings: [number, RGB][] = [
      [36, hex('#5a0c1c')],
      [31, hex('#c8202f')],
      [25, C.orange],
      [19, C.yellow],
      [14, hex('#fff1c8')],
    ]
    for (const [r, c] of rings) p.ell(23.5, 38, r, r * 0.5, c, Z.mid, true)
    for (let arm = 0; arm < 3; arm++)
      for (let i = 0; i < 260; i++) {
        const t = i / 260
        const a = arm * ((Math.PI * 2) / 3) + t * Math.PI * 3.2
        const r = 11 + t * 25
        p.dot(23.5 + Math.cos(a) * r, 38 + Math.sin(a) * r * 0.5, hex('#2a0a10'), Z.detail)
        p.dot(23.5 + Math.cos(a) * r + 0.5, 38 + Math.sin(a) * r * 0.5, hex('#2a0a10'), Z.detail)
      }
    p.ell(23.5, 36, 10, 9, hex('#ffd27a'), Z.front, true)
    p.ell(23.5, 36, 8.5, 7.5, hex('#000000'), Z.top, true)
    // cartes aspirées
    bigCard(p, -8, -2, 'K', 'S', Z.top, 11, 15)
    bigCard(p, 45, 6, 'Q', 'H', Z.top, 10, 14)
    bigCard(p, 42, 66, 'J', 'D', Z.top, 9, 12)
    bigCard(p, -6, 64, 'A', 'C', Z.top, 10, 14)
    p.text('+×.5', 14, 78, C.yellow, Z.detail)
  },
}
