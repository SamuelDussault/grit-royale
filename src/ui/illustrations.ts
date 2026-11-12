// Une illustration originale par joker, dans l'esprit des cartes de Balatro.
// Chaque scène dessine dans une grille 47 × 81 (voir painter.ts).
import { C, hex, mix, mul, Painter, PH, PW, Z, type RGB } from './painter'
import { jester, miniJester, type JesterOpt } from './figures'

type S = 'H' | 'D' | 'S' | 'C'
type Scene = (p: Painter) => void

const R = C.red
const B = C.blue

/** Éventail de cartes en bas de l'image. */
function fan(p: Painter, cards: [string, S][], y = 60, step = 9) {
  const w = (cards.length - 1) * step + 11
  const x0 = Math.round((PW - w) / 2)
  cards.forEach(([r, s], i) => {
    const lift = Math.round(Math.abs(i - (cards.length - 1) / 2) * 1.5)
    p.card(x0 + i * step, y + lift, r, s, Z.top)
  })
}

function bust(p: Painter, o: JesterOpt, dy = 0) {
  p.at(0, dy, () => jester(p, o))
}

function bigCard(p: Painter, x: number, y: number, w: number, h: number, rank: string, s: S, z: number = Z.front) {
  const col = s === 'H' || s === 'D' ? C.suitRed : C.suitDark
  p.rect(x, y, w, h, C.white, z)
  p.text(rank, x + 2, y + 2, col, Z.detail)
  p.suit(s, x + w / 2, y + h / 2 + 2, 2, col, Z.detail)
}

function banana(p: Painter, ripe: boolean) {
  const body = ripe ? hex('#f6d33c') : hex('#d9e05a')
  // ombre portée
  p.bez([10, 70], [-2, 34], [38, 10], 8, 4, body, Z.front)
  p.bez([12, 64], [5, 36], [36, 14], 1.2, 0.8, mix(body, C.pure, 0.55), Z.detail)
  p.rect(38, 4, 5, 9, hex('#7a5a2a'), Z.front)
  p.ell(10, 75, 3, 2.5, C.dbrown, Z.front)
  if (ripe) for (const [x, y, r] of [[12, 44, 1.5], [20, 30, 1.2], [8, 56, 1.4], [27, 22, 1]] as [number, number, number][]) p.ell(x, y, r, r, hex('#6b4a1a'), Z.detail, true)
  // étiquette
  p.ell(12, 44, 5, 4, ripe ? B : R, Z.top)
  p.text(ripe ? 'GM' : 'CV', 8, 42, C.pure, Z.detail)
}

const SCENES: Record<string, Scene> = {
  // ---------------- COMMUNS ----------------
  joker: (p) => {
    p.bg(hex('#f5d6c6'), 'rays', hex('#f2c9b6'))
    jester(p, { ca: R, cb: B, collar: C.yellow, eyes: 'dot', mouth: 'teeth' })
  },
  greedy: (p) => {
    p.bg(hex('#fff0c2'), 'dots', hex('#f5d77a'))
    bust(p, { ca: C.orange, cb: C.gold, eyes: 'dollar', mouth: 'grin', arms: 'none' }, -4)
    p.suit('D', 23, 62, 4, hex('#f07b23'), Z.top)
    p.coin(6, 70, 3)
    p.coin(40, 72, 3)
  },
  lusty: (p) => {
    p.bg(hex('#ffd6e4'), 'dots', hex('#ffb3cc'))
    bust(p, { ca: C.pink, cb: R, eyes: 'heart', mouth: 'smile', arms: 'none' }, -4)
    p.suit('H', 23, 62, 4, R, Z.top)
    p.suit('H', 6, 10, 1, R, Z.detail)
    p.suit('H', 40, 14, 1, R, Z.detail)
  },
  wrathful: (p) => {
    p.bg(hex('#3b1d2e'), 'rays', hex('#4d2238'))
    bust(p, { ca: C.dgrey, cb: R, eyes: 'angry', mouth: 'frown', arms: 'none', face: hex('#f3c2b4') }, -4)
    p.suit('S', 23, 62, 4, C.suitDark, Z.top)
  },
  gluttonous: (p) => {
    p.bg(hex('#d9ecd0'), 'stripes', hex('#cbe4bf'))
    bust(p, { ca: C.green, cb: C.lime, eyes: 'happy', mouth: 'wide', arms: 'none' }, -4)
    p.suit('C', 23, 62, 4, C.suitDark, Z.top)
    p.set(16, 47, C.dbrown, Z.detail)
    p.set(31, 46, C.dbrown, Z.detail)
  },
  jolly: (p) => {
    p.bg(hex('#ffe0d1'), 'rays', hex('#ffd0ba'))
    bust(p, { ca: R, cb: C.yellow, eyes: 'happy', mouth: 'wide', arms: 'none' }, -6)
    fan(p, [['8', 'H'], ['8', 'S']], 58, 12)
  },
  zany: (p) => {
    p.bg(hex('#e8dcff'), 'rays', hex('#dccbff'))
    bust(p, { ca: C.violet, cb: C.lime, eyes: 'big', mouth: 'teeth', arms: 'none', makeup: 1 }, -6)
    fan(p, [['5', 'C'], ['5', 'D'], ['5', 'H']], 58, 11)
  },
  mad: (p) => {
    p.bg(hex('#ffd1cc'), 'stripes', hex('#ffc0b8'))
    bust(p, { ca: R, cb: C.dgrey, eyes: 'angry', mouth: 'grin', arms: 'none' }, -6)
    fan(p, [['K', 'H'], ['K', 'S'], ['4', 'D'], ['4', 'C']], 58, 9)
  },
  crazy: (p) => {
    p.bg(hex('#d6f0ee'), 'rays', hex('#c3e8e4'))
    bust(p, { ca: C.teal, cb: C.orange, eyes: 'spiral', mouth: 'o', arms: 'none' }, -6)
    fan(p, [['5', 'S'], ['6', 'H'], ['7', 'C'], ['8', 'D'], ['9', 'S']], 58, 8)
  },
  droll: (p) => {
    p.bg(hex('#fff0c2'), 'dots', hex('#f3dd8f'))
    bust(p, { ca: C.blue, cb: C.white, eyes: 'sleepy', mouth: 'smirk', arms: 'none' }, -6)
    fan(p, [['2', 'H'], ['6', 'H'], ['9', 'H'], ['J', 'H'], ['A', 'H']], 58, 8)
  },
  sly: (p) => {
    p.bg(hex('#cfe4f2'), 'flat')
    bust(p, { ca: C.navy, cb: C.navy, hat: 'hood', eyes: 'mask', mouth: 'smirk', arms: 'none', nose: false }, -6)
    fan(p, [['Q', 'D'], ['Q', 'C']], 58, 12)
  },
  wily: (p) => {
    p.bg(hex('#d4e7f7'), 'dots', hex('#bcd6ee'))
    bust(p, { ca: C.teal, cb: C.teal, hat: 'hood', eyes: 'mask', mouth: 'grin', arms: 'none', nose: false }, -6)
    fan(p, [['9', 'S'], ['9', 'H'], ['9', 'C']], 58, 11)
  },
  clever: (p) => {
    p.bg(hex('#dfe3f7'), 'grid', hex('#cdd3f0'))
    bust(p, { ca: C.purple, cb: C.purple, hat: 'hood', eyes: 'mask', mouth: 'smile', arms: 'none', nose: false }, -6)
    fan(p, [['J', 'S'], ['J', 'D'], ['3', 'H'], ['3', 'C']], 58, 9)
  },
  devious: (p) => {
    p.bg(hex('#cfd8e8'), 'stripes', hex('#c0cbe0'))
    bust(p, { ca: C.dgrey, cb: C.dgrey, hat: 'hood', eyes: 'mask', mouth: 'fangs', arms: 'none', nose: false }, -6)
    fan(p, [['A', 'H'], ['2', 'S'], ['3', 'D'], ['4', 'C'], ['5', 'H']], 58, 8)
  },
  crafty: (p) => {
    p.bg(hex('#d6f0e4'), 'dots', hex('#bfe6d3'))
    bust(p, { ca: C.green, cb: C.green, hat: 'hood', eyes: 'mask', mouth: 'smirk', arms: 'none', nose: false }, -6)
    fan(p, [['3', 'C'], ['7', 'C'], ['8', 'C'], ['10', 'C'], ['K', 'C']], 58, 8)
  },
  half: (p) => {
    p.bg(hex('#f0e6d8'), 'flat')
    jester(p, { ca: R, cb: C.yellow, eyes: 'dot', mouth: 'smile' })
    for (let y = 0; y < PH; y++)
      for (let x = 30 + ((y * 7) % 3); x < PW; x++) {
        p.col[y * PW + x] = null
        p.z[y * PW + x] = -1
      }
  },
  banner: (p) => {
    p.bg(hex('#dfe9f5'), 'flat')
    p.rect(9, 6, 3, 72, C.brown, Z.mid)
    p.ell(10.5, 5, 3, 3, C.gold, Z.top)
    p.poly([[12, 10], [42, 10], [42, 52], [27, 44], [12, 52]], C.blue, Z.front)
    p.rect(12, 10, 30, 4, C.gold, Z.top)
    for (const [i, x] of [17, 25, 33].entries()) p.card(x - 3, 20 + (i % 2) * 2, '', (['H', 'S', 'D'] as S[])[i], Z.top, 7, 10)
    p.text('+30', 18, 36, C.white)
  },
  summit: (p) => {
    p.bg(hex('#7b6bc2'), 'gradient', hex('#f6b6c9'))
    p.ell(8, 12, 6, 6, hex('#fff1c2'), Z.back)
    for (const [x, y, w] of [[34, 10, 12], [-2, 30, 10]] as [number, number, number][]) {
      p.ell(x + w / 2, y, w / 2, 2.5, C.pure, Z.back)
      p.ell(x + w / 2 + 3, y - 2, w / 3, 2.5, C.pure, Z.back)
    }
    p.poly([[-6, 86], [8, 40], [22, 86]], hex('#5b4f9a'), Z.mid)
    p.poly([[4, 40], [8, 40], [11, 48], [6, 46], [3, 49]], C.pure, Z.front)
    p.poly([[30, 86], [44, 46], [56, 86]], hex('#4b4384'), Z.mid)
    p.poly([[6, 86], [26, 14], [46, 86]], hex('#6c63b8'), Z.front)
    p.poly([[20, 34], [26, 14], [32, 34], [29, 30], [26, 36], [23, 31]], C.pure, Z.top)
    p.line(26, 3, 26, 15, C.brown, Z.top)
    p.poly([[27, 3], [36, 6], [27, 9]], R, Z.top)
    p.text('+15', 14, 62, C.pure, Z.detail, 2)
  },

  misprint: (p) => {
    p.bg(hex('#e9e9e9'), 'flat')
    jester(p, { ca: C.violet, cb: C.cyan, eyes: 'x', mouth: 'teeth' })
    for (const [y0, y1, sh] of [
      [12, 17, 4],
      [26, 29, -3],
      [44, 50, 5],
      [62, 66, -4],
    ]) {
      for (let y = y0; y < y1; y++) {
        const row = p.col.slice(y * PW, y * PW + PW)
        const zr = Array.from(p.z.slice(y * PW, y * PW + PW))
        for (let x = 0; x < PW; x++) {
          const sx = (x - sh + PW) % PW
          p.col[y * PW + x] = row[sx] ? mix(row[sx]!, y % 2 ? C.cyan : C.pink, 0.35) : row[sx]
          p.z[y * PW + x] = zr[sx]
        }
      }
    }
    p.text('???', 14, 72, C.ink)
  },
  raisedFist: (p) => {
    p.bg(hex('#ffd1a8'), 'rays', hex('#ffbf8a'))
    p.rect(13, 52, 21, 34, R, Z.mid)
    p.rect(11, 50, 25, 6, C.white, Z.front)
    p.ell(23.5, 38, 14, 13, C.skin, Z.front)
    for (const [i, x] of [11, 18, 25, 32].entries()) {
      p.ell(x + 0.5, 26 - (i === 1 || i === 2 ? 1 : 0), 4, 5, C.skin, Z.top)
      p.line(x + 0.5, 23, x + 0.5, 25, mul(C.skin, 0.7), Z.detail)
    }
    p.ell(9, 42, 5, 7, C.skin, Z.top)
    for (const x of [15, 22, 29]) p.line(x, 22, x, 30, mul(C.skin, 0.55), Z.detail)
    for (const [x0, y0, x1, y1] of [[2, 10, 8, 18], [44, 10, 38, 18], [23.5, 2, 23.5, 10]]) p.line(x0, y0, x1, y1, C.pure, Z.detail, 2)
  },

  fibonacci: (p) => {
    // coquillage de nautile : chambres en spirale
    const cx = 25
    const cy = 34
    for (let k = 21; k >= 0; k--) {
      const a0 = k * 0.72
      const a1 = (k + 1) * 0.72
      const r0 = 1.3 * Math.exp(0.15 * k)
      const r1 = 1.3 * Math.exp(0.15 * (k + 1))
      const pts: [number, number][] = [[cx, cy]]
      for (let t = 0; t <= 1.001; t += 0.25) pts.push([cx + Math.cos(a0 + (a1 - a0) * t) * (r0 + (r1 - r0) * t) * 1.15, cy + Math.sin(a0 + (a1 - a0) * t) * (r0 + (r1 - r0) * t)])
      p.poly(pts, k % 2 ? hex('#f4c27a') : hex('#e98f4f'), Z.mid)
    }
    p.ell(cx, cy, 2, 2, hex('#7a3b1f'), Z.front)
    fan(p, [['A', 'H'], ['2', 'S'], ['3', 'D'], ['5', 'C'], ['8', 'H']], 60, 8)
  },

  scary: (p) => {
    p.bg(hex('#2b2340'), 'rays', hex('#33294d'))
    p.ell(23.5, 34, 17, 20, hex('#9bd17a'), Z.front)
    p.poly([[8, 22], [3, 4], [16, 16]], C.darkred, Z.top)
    p.poly([[39, 22], [44, 4], [31, 16]], C.darkred, Z.top)
    for (const ex of [16, 31]) {
      p.ell(ex, 30, 4, 3, C.yellow, Z.detail, true)
      p.rect(ex, 28, 1, 5, C.ink, Z.detail, true)
    }
    p.rect(12, 42, 23, 7, C.ink, Z.detail, true)
    for (let x = 13; x < 34; x += 3) {
      p.poly([[x, 42], [x + 2, 42], [x + 1, 45]], C.pure, Z.detail, true)
      p.poly([[x + 1, 49], [x + 3, 49], [x + 2, 46]], C.pure, Z.detail, true)
    }
    fan(p, [['J', 'S'], ['Q', 'H'], ['K', 'C']], 60, 11)
  },
  smiley: (p) => {
    p.bg(hex('#cfe4f2'), 'rays', hex('#bcd9ee'))
    p.ell(23.5, 30, 19, 19, C.yellow, Z.front)
    p.ell(16.5, 24, 2.5, 4.5, C.ink, Z.detail, true)
    p.ell(30.5, 24, 2.5, 4.5, C.ink, Z.detail, true)
    p.set(16, 22, C.pure, Z.detail)
    p.set(30, 22, C.pure, Z.detail)
    p.ell(11, 33, 3, 2, hex('#ff9b9b'), Z.detail, true)
    p.ell(36, 33, 3, 2, hex('#ff9b9b'), Z.detail, true)
    for (let x = 12; x <= 35; x++) {
      const u = 1 - ((x - 23.5) / 11.5) ** 2
      const t = 34 + Math.round(u * 1)
      const b = 34 + Math.round(u * 8)
      for (let y = t; y <= b; y++) p.set(x, y, y === t ? C.pure : y > b - 2 && Math.abs(x - 23.5) < 4 ? hex('#ff7d8f') : C.darkred, Z.detail)
      p.set(x, t - 1, C.ink, Z.detail)
      p.set(x, b + 1, C.ink, Z.detail)
    }
    fan(p, [['J', 'C'], ['Q', 'H'], ['K', 'D']], 60, 11)
  },

  even: (p) => {
    p.bg(hex('#d6e9ff'), 'grid', hex('#c4ddfb'))
    jester(p, { ca: B, cb: C.white, eyes: 'brow', mouth: 'flat', hat: 'top', hair: C.dbrown })
    p.rect(1, 60, 45, 9, C.white, Z.top)
    p.text('2 4 6 8', 4, 62, B, Z.detail)
  },
  odd: (p) => {
    p.bg(hex('#ffe6cc'), 'dots', hex('#ffd3a6'))
    jester(p, { ca: C.orange, cb: C.green, eyes: 'big', mouth: 'teeth', hat: 'beanie' })
    p.rect(1, 60, 45, 9, C.white, Z.top)
    p.text('A 3 5 7 9', 4, 62, C.orange, Z.detail)
  },
  scholar: (p) => {
    p.bg(hex('#efe6d2'), 'stripes', hex('#e6dac0'))
    jester(p, { ca: C.navy, cb: C.gold, eyes: 'sleepy', mouth: 'smirk', hat: 'mortar', hair: C.dgrey, arms: 'hold' })
    bigCard(p, 29, 52, 15, 21, 'A', 'S', Z.top)
  },
  walkie: (p) => {
    p.bg(hex('#d4f0d6'), 'stripes', hex('#c2e8c5'))
    p.rect(30, 4, 3, 16, C.dgrey, Z.mid)
    p.ell(31.5, 4, 2, 2, R, Z.top)
    p.rect(9, 18, 29, 56, hex('#f2b632'), Z.front)
    p.rect(13, 23, 21, 15, hex('#a7e3a1'), Z.top)
    p.text('10', 15, 25, C.ink, Z.detail, 2)
    p.text('4', 26, 30, C.ink, Z.detail, 1)
    for (let y = 44; y < 66; y += 4) p.rect(13, y, 21, 2, mul(C.gold, 0.6), Z.top, true)
  },
  abstract: (p) => {
    p.bg(hex('#f4f1e8'), 'flat')
    p.rect(3, 4, 22, 30, R, Z.mid)
    p.rect(27, 4, 17, 14, C.yellow, Z.mid)
    p.rect(27, 20, 17, 30, B, Z.mid)
    p.rect(3, 36, 22, 14, C.ink, Z.mid)
    p.ell(23.5, 60, 13, 13, C.green, Z.front)
    p.poly([[6, 78], [23, 54], [41, 78]], C.orange, Z.top)
  },
  grosMichel: (p) => {
    banana(p, true)
    p.text('+15', 26, 54, C.red, Z.detail, 2)
  },

  golden: (p) => {
    p.bg(hex('#3b2a1a'), 'rays', hex('#4a3522'))
    jester(p, { ca: C.gold, cb: C.gold, eyes: 'happy', mouth: 'smile' })
    p.recolor((c, x, y) => {
      const l = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255
      return mix(mul(C.gold, 0.45), [255, 236, 150], Math.min(1, l * 1.1 + ((x + y) % 7 === 0 ? 0.1 : 0)))
    })
    p.sparkle(8, 12)
    p.sparkle(39, 40)
    p.sparkle(12, 66)
  },
  egg: (p) => {
    p.bg(hex('#cfe4f2'), 'dots', hex('#b7d6ec'))
    p.ell(23.5, 40, 16, 21, C.white, Z.front)
    for (const [x, y, r] of [[30, 30, 2.5], [17, 45, 3], [28, 50, 2], [20, 28, 1.5]]) p.ell(x, y, r, r * 0.8, hex('#d9c6a8'), Z.detail, true)
    p.ell(23.5, 66, 14, 3, mul(hex('#cfe4f2'), 0.8), Z.mid, true)
  },
  rideBus: (p) => {
    p.bg(hex('#cde8f5'), 'flat')
    p.rect(0, 62, PW, 19, C.dgrey, Z.back)
    for (let x = 2; x < PW; x += 10) p.rect(x, 70, 6, 2, C.yellow, Z.detail, true)
    p.rect(2, 22, 43, 34, hex('#f2c230'), Z.front)
    p.rect(2, 20, 43, 3, hex('#f2c230'), Z.front)
    for (const x of [5, 15, 25]) p.rect(x, 26, 8, 10, C.sky, Z.top)
    p.rect(35, 26, 8, 20, C.sky, Z.top)
    miniJester(p, 19, 32, R, B)
    p.rect(2, 42, 43, 3, C.ink, Z.top, true)
    p.text('BUS', 6, 47, C.ink)
    for (const x of [11, 35]) {
      p.ell(x, 57, 5, 5, C.black, Z.top)
      p.ell(x, 57, 2, 2, C.lgrey, Z.detail)
    }
  },
  supernova: (p) => {
    p.bg(hex('#0d0b24'), 'stars', C.pure)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      const r = i % 2 ? 18 : 26
      p.poly([[23.5, 38], [23.5 + Math.cos(a - 0.12) * r, 38 + Math.sin(a - 0.12) * r], [23.5 + Math.cos(a + 0.12) * r, 38 + Math.sin(a + 0.12) * r]], i % 2 ? C.orange : C.yellow, Z.mid)
    }
    p.ell(23.5, 38, 10, 10, hex('#fff1b3'), Z.front)
    p.ell(23.5, 38, 5, 5, C.pure, Z.top, true)
  },
  iceCream: (p) => {
    p.bg(hex('#ffd6e4'), 'dots', hex('#ffc2d6'))
    p.poly([[12, 40], [35, 40], [23.5, 76]], hex('#d99a4e'), Z.mid)
    for (let i = 0; i < 6; i++) p.line(12 + i * 4, 40, 23.5 + i * 1.2, 72, mul(hex('#d99a4e'), 0.7), Z.detail)
    p.ell(23.5, 36, 13, 9, hex('#fff4e0'), Z.front)
    p.ell(23.5, 24, 11, 9, C.pink, Z.top)
    p.ell(23.5, 13, 3, 3, R, Z.top)
    p.line(24, 10, 27, 6, C.dbrown, Z.detail)
    for (const [x, y] of [[18, 22], [27, 26], [22, 30], [30, 20]]) p.set(x, y, [120, 200, 255], Z.detail)
  },
  popcorn: (p) => {
    p.bg(hex('#fff0c2'), 'stripes', hex('#ffe7a1'))
    for (let i = 0; i < 16; i++) p.ell(9 + (i % 6) * 6 + (i > 5 ? 3 : 0), 24 - Math.floor(i / 6) * 5 + (i % 2) * 2, 4, 3.5, hex('#fff6d6'), Z.front)
    p.poly([[6, 30], [41, 30], [36, 76], [11, 76]], C.white, Z.top)
    for (let k = 0; k < 4; k++) p.poly([[9 + k * 9, 30], [13 + k * 9, 30], [16 + k * 6.5, 76], [13 + k * 6.5, 76]], R, Z.top)
    p.text('POP', 16, 50, C.ink)
  },
  blue: (p) => {
    p.bg(hex('#1e3a8a'), 'rays', hex('#244199'))
    jester(p, { ca: B, cb: C.cyan, collar: C.white, face: hex('#cfe6ff'), eyes: 'tear', mouth: 'frown' })
    for (let i = 0; i < 4; i++) p.rect(32 + i, 62 - i, 11, 15, C.white, Z.top)
  },
  green: (p) => {
    p.bg(hex('#d6f5d1'), 'grid', hex('#c3edbc'))
    jester(p, { ca: C.green, cb: C.lime, collar: C.green, face: hex('#e3f7d9'), eyes: 'happy', mouth: 'teeth' })
    p.text('+1', 3, 62, C.green, Z.detail, 2)
  },
  square: (p) => {
    jester(p, { ca: C.violet, cb: C.lime, square: true, eyes: 'dot', mouth: 'teeth', hat: 'top', hair: C.black })
    p.text('+4', 31, 72, C.blue, Z.detail, 2)
  },

  business: (p) => {
    p.bg(hex('#2f3d48'), 'flat')
    p.rect(-2, 14, 51, 34, C.white, Z.mid)
    p.rect(-2, 14, 51, 6, hex('#1f6fb2'), Z.front)
    p.text('JOKER CIE', 4, 15, C.pure)
    miniJester(p, 9, 33, R, B)
    p.text('ROI', 27, 25, C.ink)
    p.text('DU RIRE', 23, 32, C.dgrey)
    for (const y of [40, 43]) p.rect(22, y, 22, 1, C.lgrey, Z.front, true)
    p.coin(32, 62, 7)
    p.coin(17, 66, 6)
    p.coin(39, 72, 5)
  },

  delayed: (p) => {
    p.bg(hex('#e8dccb'), 'flat')
    p.rect(8, 8, 31, 4, C.brown, Z.top)
    p.rect(8, 68, 31, 4, C.brown, Z.top)
    p.poly([[11, 12], [36, 12], [25, 40], [36, 68], [11, 68], [22, 40]], hex('#d6f2fb'), Z.mid)
    p.poly([[15, 16], [32, 16], [24, 34]], C.yellow, Z.front)
    p.poly([[15, 66], [32, 66], [24, 54]], C.yellow, Z.front)
    p.coin(10, 76, 3)
    p.coin(37, 76, 3)
  },
  arrowhead: (p) => {
    p.bg(hex('#cfd8e8'), 'stripes', hex('#c0cbe0'))
    p.poly([[23.5, 6], [40, 50], [23.5, 42], [7, 50]], C.dgrey, Z.front)
    p.poly([[23.5, 10], [30, 30], [23.5, 26]], C.lgrey, Z.top, true)
    p.rect(22, 42, 3, 34, C.brown, Z.mid)
    p.suit('S', 23.5, 32, 2, C.white, Z.detail)
  },
  onyx: (p) => {
    p.bg(hex('#e6e1f7'), 'dots', hex('#d6cff2'))
    p.poly([[23.5, 8], [40, 24], [36, 62], [23.5, 72], [11, 62], [7, 24]], C.black, Z.front)
    p.poly([[23.5, 8], [30, 24], [23.5, 30], [17, 24]], C.dgrey, Z.top)
    p.suit('C', 23.5, 46, 3, hex('#8c8ca8'), Z.detail)
  },
  roughGem: (p) => {
    p.bg(hex('#fff0c2'), 'rays', hex('#ffe4a0'))
    p.poly([[10, 26], [23.5, 10], [37, 26], [23.5, 66]], hex('#f07b23'), Z.front)
    p.poly([[10, 26], [37, 26], [23.5, 10]], hex('#ffb066'), Z.top)
    p.line(10, 26, 37, 26, mul(hex('#f07b23'), 0.6), Z.detail)
    p.coin(10, 70, 4)
    p.sparkle(34, 14)
  },
  bloodstone: (p) => {
    p.suit('H', 23.5, 36, 6, hex('#2f6f4f'), Z.front)
    p.poly([[10, 26], [23.5, 30], [37, 26], [23.5, 42]], hex('#3f8a63'), Z.top)
    p.line(23.5, 30, 23.5, 56, hex('#24563d'), Z.detail)
    for (const [x, y, r] of [[16, 32, 2], [29, 40, 1.6], [22, 50, 1.8], [32, 30, 1.4], [18, 44, 1.2]] as [number, number, number][]) p.ell(x, y, r, r, R, Z.detail, true)
    p.sparkle(34, 24)
    p.text('×1.5', 10, 66, C.red, Z.detail, 2)
  },

  stencil: (p) => {
    p.bg(hex('#f4f1e8'), 'flat')
    jester(p, { ca: C.white, cb: C.white, collar: C.white, face: C.white, eyes: 'none', mouth: 'none', nose: false, makeup: 3 })
    p.recolor((_c, x, y) => ((x + y) % 4 === 0 ? hex('#d9d4c4') : hex('#f4f1e8')))
  },
  swashbuckler: (p) => {
    p.bg(hex('#cde8f5'), 'stripes', hex('#bfe0f0'))
    jester(p, { ca: R, cb: C.white, hat: 'tricorne', eyes: 'patch', mouth: 'teeth', hair: C.black, arms: 'hold' })
    p.line(38, 61, 44, 30, C.lgrey, Z.top, 2)
    p.rect(35, 59, 7, 2, C.gold, Z.top)
  },
  steelJoker: (p) => {
    p.bg(hex('#2d3440'), 'grid', hex('#353d4b'))
    jester(p, { ca: C.grey, cb: C.lgrey, collar: C.grey, eyes: 'dot', mouth: 'flat' })
    p.recolor((c, x, y) => {
      const l = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255
      return mix([70, 78, 92], [235, 240, 248], Math.min(1, l + ((x - y) % 9 === 0 ? 0.15 : 0)))
    })
  },
  blackboard: (p) => {
    p.bg(hex('#e8dccb'), 'flat')
    p.rect(2, 8, 43, 50, C.brown, Z.mid)
    p.rect(5, 11, 37, 44, hex('#2f4f3f'), Z.front)
    p.suit('S', 15, 26, 2, C.white, Z.detail)
    p.suit('C', 32, 26, 2, C.white, Z.detail)
    p.text('×3', 18, 42, C.white, Z.detail, 2)
    p.rect(8, 58, 6, 2, C.white, Z.top)
  },
  shootMoon: (p) => {
    p.bg(hex('#1b1f4a'), 'stars', C.pure)
    p.ell(26, 28, 16, 16, hex('#f4e9c1'), Z.front)
    p.ell(33, 23, 13, 13, hex('#1b1f4a'), Z.top, true)
    p.line(2, 72, 22, 34, C.brown, Z.top, 2)
    p.poly([[20, 32], [26, 30], [24, 37]], C.lgrey, Z.top)
    p.text('Q', 8, 50, C.yellow, Z.detail, 2)
  },
  photograph: (p) => {
    p.bg(hex('#ffe6cc'), 'flat')
    p.rect(4, 8, 39, 52, C.white, Z.mid)
    p.rect(8, 12, 31, 33, hex('#8fc9ef'), Z.front)
    p.at(0, -7, () => miniJester(p, 23, 32, R, C.yellow))
    p.text('CLIC', 14, 50, C.dgrey)
    p.rect(30, 62, 14, 10, C.black, Z.top)
    p.ell(37, 67, 3, 3, C.lgrey, Z.detail)
  },
  hack: (p) => {
    p.bg(hex('#141a1f'), 'flat')
    p.rect(3, 10, 41, 32, C.dgrey, Z.mid)
    p.rect(6, 13, 35, 26, hex('#0b2010'), Z.front)
    for (let y = 15; y < 37; y += 3) for (let x = 8; x < 39; x += 2) if ((x * 7 + y * 3) % 5 < 3) p.set(x, y, C.lime, Z.detail)
    p.text('2345', 8, 25, C.lime, Z.detail, 2)
    p.rect(18, 42, 11, 6, C.dgrey, Z.mid)
    p.rect(6, 52, 35, 10, C.grey, Z.front)
    for (let x = 8; x < 39; x += 3) p.rect(x, 54, 2, 2, C.dgrey, Z.detail, true)
  },
  sock: (p) => {
    p.bg(hex('#5a1a2b'), 'rays', hex('#6b2234'))
    // masque de la comédie
    p.poly([[2, 14], [28, 10], [30, 30], [22, 44], [8, 44], [2, 30]], hex('#f6d33c'), Z.mid)
    for (const ex of [10, 21]) p.poly([[ex - 4, 22], [ex + 3, 20], [ex + 2, 25], [ex - 3, 26]], C.ink, Z.detail, true)
    for (let x = 6; x <= 26; x++) p.set(x, 32 + Math.round(4 * (1 - ((x - 16) / 10) ** 2)), C.ink, Z.detail)
    for (let x = 8; x <= 24; x++) p.set(x, 33 + Math.round(3 * (1 - ((x - 16) / 8) ** 2)), C.darkred, Z.detail)
    // masque de la tragédie
    p.poly([[20, 34], [46, 30], [48, 50], [40, 64], [26, 64], [20, 50]], hex('#8ec5f0'), Z.front)
    for (const ex of [29, 40]) p.poly([[ex - 4, 42], [ex + 3, 44], [ex + 2, 47], [ex - 3, 46]], C.ink, Z.detail, true)
    for (let x = 26; x <= 43; x++) p.set(x, 58 - Math.round(4 * (1 - ((x - 34.5) / 8.5) ** 2)), C.ink, Z.detail)
    p.ell(27, 52, 1, 2, C.pure, Z.detail, true)
    p.bez([2, 16], [-6, 30], [0, 48], 1.2, 1, C.red, Z.top)
    p.bez([47, 32], [54, 50], [46, 66], 1.2, 1, C.blue, Z.top)
    fan(p, [['J', 'D'], ['Q', 'S'], ['K', 'H']], 66, 11)
  },

  dusk: (p) => {
    p.bg(hex('#2a1b4a'), 'gradient', hex('#ff8a5c'))
    for (let i = 0; i < 6; i++) p.rect(-6, 46 - i * 4, 59, 1, mix(hex('#ff8a5c'), hex('#2a1b4a'), i / 6), Z.back, true)
    p.ell(23.5, 52, 18, 18, hex('#ffcf5a'), Z.mid)
    for (let y = 40; y < 70; y += 4) p.rect(4, y, 40, 1, hex('#ff8a5c'), Z.mid, true)
    p.poly([[-6, 86], [-6, 60], [10, 52], [22, 58], [36, 50], [53, 58], [53, 86]], hex('#1b1530'), Z.front)
    for (const [x, y] of [[12, 22], [18, 18], [33, 26]]) {
      p.line(x - 2, y - 1, x, y, hex('#1b1530'), Z.detail)
      p.line(x, y, x + 2, y - 1, hex('#1b1530'), Z.detail)
    }
    p.text('2×', 4, 72, hex('#ffcf5a'), Z.detail, 2)
  },

  chad: (p) => {
    p.bg(hex('#e3e8ef'), 'flat')
    p.rect(5, 6, 37, 60, C.white, Z.front)
    for (let y = 12; y < 60; y += 8) {
      p.text(String((y - 4) / 8), 8, y, C.dgrey)
      for (let x = 16; x < 40; x += 7) p.ell(x, y + 2, 2, 2, (x + y) % 3 ? C.lgrey : hex('#e3e8ef'), Z.top, true)
    }
    p.poly([[30, 38], [34, 38], [35, 47], [31, 45]], C.white, Z.top)
    p.text('VOTE', 14, 70, C.red)
  },
  mime: (p) => {
    p.bg(hex('#f0efe9'), 'flat')
    jester(p, { ca: C.black, cb: C.white, collar: C.white, face: C.pure, hat: 'top', eyes: 'sleepy', mouth: 'flat', nose: false, makeup: 3, arms: 'up' })
    p.line(1, 10, 1, 75, hex('#9fd6f0'), Z.detail)
    p.line(45, 10, 45, 75, hex('#9fd6f0'), Z.detail)
  },
  seltzer: (p) => {
    p.bg(hex('#d6f0ee'), 'dots', hex('#bfe7e3'))
    p.rect(13, 30, 21, 47, hex('#6fc3df'), Z.front)
    p.rect(15, 18, 13, 12, C.lgrey, Z.top)
    p.rect(28, 21, 11, 4, C.lgrey, Z.top)
    p.rect(21, 12, 3, 6, C.grey, Z.top)
    for (const [x, y, r] of [[20, 50, 2], [27, 60, 1.5], [18, 68, 1.5], [26, 42, 1], [40, 16, 1.5], [43, 10, 1]]) p.ell(x, y, r, r, C.pure, Z.detail, true)
    p.text('10', 19, 40, C.white)
  },
  constellation: (p) => {
    p.bg(hex('#0f1430'), 'stars', hex('#7f8fd6'))
    const pts: [number, number][] = [[8, 14], [18, 24], [30, 18], [38, 32], [26, 44], [14, 52], [32, 62], [20, 72]]
    for (let i = 0; i < pts.length - 1; i++) p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], hex('#4f63b8'), Z.mid)
    for (const [x, y] of pts) p.star(x, y, 3, C.yellow, Z.top)
  },
  hologram: (p) => {
    p.bg(hex('#0d1f2b'), 'grid', hex('#123040'))
    jester(p, { ca: C.cyan, cb: C.white, eyes: 'dot', mouth: 'smile' })
    p.recolor((c, _x, y) => {
      const l = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255
      return y % 3 === 0 ? mix(hex('#0d1f2b'), C.cyan, 0.5) : mix(hex('#1f6f8b'), hex('#aaf0ff'), l)
    })
  },
  vampire: (p) => {
    p.bg(hex('#3d1424'), 'rays', hex('#4a1a2d'))
    jester(p, { ca: C.black, cb: C.darkred, collar: R, face: hex('#e9e4f0'), hat: 'none', hair: C.black, eyes: 'angry', mouth: 'fangs', nose: false, makeup: 3 })
    p.poly([[0, 46], [10, 40], [12, 81], [0, 81]], C.black, Z.top)
    p.poly([[47, 46], [37, 40], [35, 81], [47, 81]], C.black, Z.top)
    p.poly([[12, 18], [23.5, 26], [35, 18], [23.5, 14]], C.black, Z.top)
  },
  cardSharp: (p) => {
    p.bg(hex('#204a35'), 'dots', hex('#275a41'))
    jester(p, { ca: C.black, cb: C.purple, hat: 'top', eyes: 'sleepy', mouth: 'smirk', hair: C.black, arms: 'hold' })
    fan(p, [['A', 'S'], ['A', 'H'], ['A', 'C'], ['A', 'D']], 62, 9)
  },
  luckyCat: (p) => {
    p.bg(hex('#ffe9a8'), 'rays', hex('#ffdf85'))
    p.ell(23.5, 56, 16, 20, C.pure, Z.mid)
    p.ell(23.5, 30, 15, 13, C.pure, Z.front)
    p.poly([[10, 22], [12, 8], [20, 19]], C.pure, Z.mid)
    p.poly([[37, 22], [35, 8], [27, 19]], C.pure, Z.mid)
    p.poly([[12, 19], [13, 12], [17, 18]], C.pink, Z.detail, true)
    p.poly([[35, 19], [34, 12], [30, 18]], C.pink, Z.detail, true)
    for (const ex of [17, 30]) for (let dx = -2; dx <= 2; dx++) p.set(ex + dx, 29 + Math.abs(dx) * 0.6, C.ink, Z.detail)
    p.set(23, 33, C.pink, Z.detail)
    p.rect(9, 41, 29, 3, R, Z.top)
    p.ell(23.5, 46, 3, 3, C.gold, Z.top)
    p.ell(38, 26, 4, 7, C.pure, Z.top)
    p.coin(23.5, 60, 7)
  },
  // ---------------- PEU COMMUNS / RÈGLES ----------------
  duo: (p) => {
    miniJester(p, 12, 30, R, B)
    miniJester(p, 35, 30, B, R)
    fan(p, [['7', 'H'], ['7', 'S']], 52, 12)
    p.text('×2', 15, 72, C.red, Z.detail, 2)
  },

  trio: (p) => {
    miniJester(p, 23.5, 20, C.teal, C.yellow)
    miniJester(p, 10, 46, C.yellow, C.teal)
    miniJester(p, 37, 46, C.orange, C.teal)
    p.text('×3', 15, 70, C.red, Z.detail, 2)
  },

  family: (p) => {
    miniJester(p, 11, 18, R, B)
    miniJester(p, 36, 18, C.violet, C.yellow)
    miniJester(p, 11, 46, C.green, C.orange)
    miniJester(p, 36, 46, C.orange, C.green)
    p.text('×4', 15, 70, C.red, Z.detail, 2)
  },

  order: (p) => {
    p.bg(hex('#dfe7fd'), 'grid', hex('#cfdafa'))
    ;([['2', 'H', 2, 60], ['3', 'S', 9, 48], ['4', 'D', 16, 36], ['5', 'C', 23, 24], ['6', 'H', 30, 12]] as [string, S, number, number][]).forEach(([r, s, x, y]) =>
      p.card(x, y, r, s, Z.top, 13, 17),
    )
    p.text('×3', 26, 66, C.red, Z.detail, 2)
  },
  tribe: (p) => {
    miniJester(p, 23.5, 16, C.green, C.lime)
    miniJester(p, 8, 38, C.green, C.lime)
    miniJester(p, 39, 38, C.green, C.lime)
    miniJester(p, 23.5, 52, C.green, C.lime)
    p.text('×2', 15, 72, C.red, Z.detail, 2)
  },

  fourFingers: (p) => {
    p.bg(hex('#ffe0d1'), 'rays', hex('#ffd0ba'))
    p.rect(12, 50, 23, 31, R, Z.mid)
    p.ell(23.5, 44, 13, 11, C.skin, Z.front)
    for (const x of [13, 20, 27, 34]) p.rect(x - 2, 14, 5, 28, C.skin, Z.front)
    for (const x of [13, 20, 27, 34]) p.ell(x + 0.5, 14, 2.5, 2.5, C.skin, Z.front)
    p.text('4', 19, 58, C.white, Z.detail, 2)
  },
  shortcut: (p) => {
    p.rect(22, 40, 3, 46, C.grey, Z.back)
    p.poly([[23.5, 4], [46, 26], [23.5, 48], [1, 26]], hex('#f6c432'), Z.mid)
    p.poly([[23.5, 8], [42, 26], [23.5, 44], [5, 26]], hex('#f6c432'), Z.front)
    p.bez([16, 38], [14, 22], [30, 18], 2, 2, C.ink, Z.top)
    p.poly([[28, 12], [36, 18], [28, 24]], C.ink, Z.top)
    for (const [x, y] of [[8, 62], [32, 66]]) p.card(x, y, String(x === 8 ? 7 : 9), x === 8 ? 'H' : 'S', Z.top)
    p.text('...', 21, 68, C.ink)
  },

  smeared: (p) => {
    p.bg(hex('#f4f1e8'), 'flat')
    jester(p, { ca: R, cb: C.suitDark, eyes: 'x', mouth: 'smirk' })
    for (let i = 0; i < 300; i++) {
      const x = (i * 37) % PW
      const y = (i * 53) % PH
      const k = y * PW + x
      if (p.z[k] > Z.bg) p.col[k] = mix(p.col[k]!, x < 23 ? C.red : C.suitDark, 0.6)
    }
    p.bez([2, 64], [23, 50], [45, 70], 3, 3, mix(C.red, C.suitDark, 0.5), Z.detail)
  },
  pareidolia: (p) => {
    p.bg(hex('#e8e2d0'), 'flat')
    p.rect(8, 10, 31, 60, C.white, Z.front)
    p.rect(15, 24, 4, 9, C.dgrey, Z.top, true)
    p.rect(28, 24, 4, 9, C.dgrey, Z.top, true)
    p.ell(23.5, 46, 5, 4, C.dgrey, Z.top, true)
    p.ell(23.5, 47, 5, 2, C.white, Z.detail, true)
    p.ell(23.5, 16, 2, 2, C.lgrey, Z.top)
    p.ell(23.5, 62, 2, 2, C.lgrey, Z.top)
  },
  splash: (p) => {
    p.bg(hex('#cfe4f2'), 'flat')
    p.ell(23.5, 66, 20, 6, hex('#3a8fd9'), Z.mid)
    for (const [x, y] of [[10, 52], [18, 40], [29, 44], [37, 54]]) p.poly([[x - 3, 66], [x, y], [x + 3, 66]], hex('#5fb2f0'), Z.front)
    for (const [x, y, r] of [[8, 30, 2.5], [23, 22, 3], [36, 28, 2.5], [14, 16, 2], [33, 14, 2]]) p.ell(x, y, r, r * 1.3, hex('#5fb2f0'), Z.top)
    fan(p, [['3', 'H'], ['8', 'C']], 6, 26)
  },
  glassJoker: (p) => {
    p.bg(hex('#dff6fb'), 'flat')
    jester(p, { ca: C.cyan, cb: C.white, collar: C.cyan, face: hex('#e9fbff'), eyes: 'dot', mouth: 'smile' })
    p.recolor((c, x, y) => mix(c, hex('#bfefff'), 0.55 + (((x + y) % 11 === 0) ? 0.3 : 0)))
    for (let i = 0; i < 6; i++) p.line(6 + i * 2, 70 - i * 10, 14 + i * 2, 62 - i * 10, C.pure, Z.detail)
  },
  campfire: (p) => {
    p.bg(hex('#2b2340'), 'stars', hex('#7f6fb0'))
    for (const [x, y, rx, ry, c] of [[23.5, 50, 12, 20, R], [23.5, 54, 8, 15, C.orange], [23.5, 58, 5, 9, C.yellow]] as [number, number, number, number, RGB][])
      p.poly([[x, y - ry * 1.4], [x + rx, y + ry * 0.4], [x, y + ry * 0.9], [x - rx, y + ry * 0.4]], c, Z.front)
    p.bez([4, 74], [23, 68], [43, 74], 3, 3, C.brown, Z.top)
    p.bez([4, 68], [23, 76], [43, 68], 3, 3, C.dbrown, Z.top)
  },
  bull: (p) => {
    p.bg(hex('#f5d0c4'), 'rays', hex('#f0c0b0'))
    p.bez([12, 26], [0, 22], [4, 8], 4, 1.5, C.white, Z.mid)
    p.bez([35, 26], [47, 22], [43, 8], 4, 1.5, C.white, Z.mid)
    p.ell(23.5, 36, 15, 16, hex('#7a4a2b'), Z.front)
    p.ell(23.5, 48, 10, 8, hex('#d9a08a'), Z.top)
    p.ell(19, 49, 1.5, 2, C.ink, Z.detail, true)
    p.ell(28, 49, 1.5, 2, C.ink, Z.detail, true)
    p.ell(23.5, 56, 4, 3, C.gold, Z.detail)
    for (const ex of [16, 31]) p.rect(ex, 32, 2, 3, C.ink, Z.detail, true)
    p.coin(10, 70, 4)
    p.coin(23.5, 72, 4)
    p.coin(37, 70, 4)
  },
  bootstraps: (p) => {
    p.bg(hex('#e8dccb'), 'stripes', hex('#ddcdb7'))
    p.poly([[14, 10], [30, 10], [30, 52], [42, 58], [42, 70], [8, 70], [8, 56], [14, 52]], C.brown, Z.front)
    p.rect(8, 68, 34, 4, C.dbrown, Z.top)
    p.rect(14, 10, 16, 4, C.dbrown, Z.top)
    p.bez([14, 14], [4, 20], [8, 30], 1.5, 1.5, C.dbrown, Z.top)
    p.bez([30, 14], [42, 20], [38, 30], 1.5, 1.5, C.dbrown, Z.top)
    p.coin(36, 40, 5)
  },
  faceless: (p) => {
    p.bg(hex('#d8d8e0'), 'flat')
    jester(p, { ca: C.dgrey, cb: C.purple, eyes: 'none', mouth: 'none', nose: false, makeup: 3 })
    p.text('$5', 30, 70, C.gold, Z.detail, 1)
  },
  rocket: (p) => {
    p.bg(hex('#1d2b53'), 'stars', C.pure)
    p.poly([[23.5, 4], [32, 20], [32, 52], [15, 52], [15, 20]], C.white, Z.front)
    p.poly([[23.5, 4], [32, 20], [15, 20]], R, Z.top)
    p.ell(23.5, 30, 5, 5, C.sky, Z.top)
    p.poly([[15, 40], [6, 56], [15, 52]], R, Z.top)
    p.poly([[32, 40], [41, 56], [32, 52]], R, Z.top)
    p.poly([[17, 52], [30, 52], [23.5, 76]], C.orange, Z.mid)
    p.poly([[19, 52], [28, 52], [23.5, 66]], C.yellow, Z.front)
  },
  toTheMoon: (p) => {
    p.bg(hex('#0f1430'), 'stars', C.pure)
    p.ell(36, 12, 9, 9, hex('#f4e9c1'), Z.mid)
    const pts: [number, number][] = [[3, 72], [10, 64], [15, 67], [22, 52], [27, 56], [34, 34], [38, 22]]
    for (let i = 0; i < pts.length - 1; i++) p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], C.green, Z.top, 2)
    p.coin(10, 44, 4)
    p.coin(18, 32, 3)
  },
  obelisk: (p) => {
    p.bg(hex('#f2d8a7'), 'rays', hex('#ecc98a'))
    p.poly([[18, 12], [29, 12], [32, 70], [15, 70]], hex('#c9b48a'), Z.front)
    p.poly([[18, 12], [23.5, 3], [29, 12]], C.gold, Z.top)
    p.rect(9, 70, 29, 6, hex('#a8916a'), Z.top)
    for (let y = 20; y < 64; y += 9) p.text(['X', '+', 'O', '×', '$'][(y / 9) % 5 | 0], 22, y, mul(hex('#c9b48a'), 0.6))
  },
  cavendish: (p) => {
    p.bg(hex('#cfe8b8'), 'rays', hex('#bfe0a3'))
    banana(p, false)
    p.text('×3', 26, 66, C.red, Z.detail, 2)
  },
  // ---------------- RARES ----------------
  baron: (p) => {
    p.bg(hex('#3d2b5a'), 'rays', hex('#47336a'))
    jester(p, { ca: C.purple, cb: C.gold, collar: C.gold, face: C.skin, hat: 'crown', hair: C.white, eyes: 'sleepy', mouth: 'smirk', nose: false })
    p.ell(28, 27.5, 3.5, 3.5, C.gold, Z.detail, true)
    p.ell(28, 27.5, 2.5, 2.5, hex('#cfefff'), Z.detail, true)
    for (let x = 16; x <= 31; x++) p.set(x, 35 - (Math.abs(x - 23.5) > 3 ? 1 : 0), C.white, Z.detail)
  },
  blueprint: (p) => {
    p.bg(hex('#1f5fa8'), 'grid', hex('#2a6fbf'))
    jester(p, { ca: C.white, cb: C.white, collar: C.white, face: hex('#1f5fa8'), eyes: 'none', mouth: 'none', nose: false, makeup: 3 })
    p.recolor(() => hex('#1f5fa8'))
    p.outline()
    for (let i = 0; i < p.col.length; i++) if (p.col[i] && p.col[i]![0] === C.ink[0] && p.col[i]![1] === C.ink[1]) p.col[i] = C.pure
    p.text('->', 30, 70, C.pure)
  },
  brainstorm: (p) => {
    p.bg(hex('#ffe0ef'), 'rays', hex('#ffd0e6'))
    p.ell(17, 30, 12, 13, C.pink, Z.mid)
    p.ell(30, 30, 12, 13, C.pink, Z.front)
    for (let i = 0; i < 6; i++) {
      p.bez([7 + i * 3, 22 + (i % 2) * 4], [9 + i * 3, 30], [6 + i * 3.5, 38], 0.6, 0.6, mul(C.pink, 0.7), Z.detail)
      p.bez([24 + i * 3, 21 + (i % 2) * 5], [27 + i * 3, 31], [23 + i * 3.5, 39], 0.6, 0.6, mul(C.pink, 0.7), Z.detail)
    }
    p.line(23.5, 18, 23.5, 42, mul(C.pink, 0.6), Z.detail)
    p.poly([[30, 46], [20, 62], [27, 62], [18, 80], [38, 56], [30, 56], [38, 46]], C.yellow, Z.top)
    p.poly([[4, 50], [10, 46], [8, 54]], C.yellow, Z.top)
    p.poly([[42, 48], [48, 52], [42, 56]], C.yellow, Z.top)
  },

  drivers: (p) => {
    p.bg(hex('#3d4f5c'), 'flat')
    p.rect(2, 20, 43, 34, hex('#e8f1f8'), Z.front)
    p.rect(2, 20, 43, 6, B, Z.top)
    p.text('PERMIS', 6, 21, C.white)
    p.rect(5, 29, 14, 20, hex('#9fd0f0'), Z.top)
    p.at(0, -2, () => miniJester(p, 12, 41, R, C.yellow))
    for (let y = 31; y < 48; y += 4) p.rect(22, y, 19, 2, C.lgrey, Z.detail, true)
    p.text('16', 32, 60, C.gold, Z.detail, 2)
  },
  // ---------------- LÉGENDAIRES ----------------
  triboulet: (p) => {
    p.bg(hex('#5a2a6b'), 'rays', hex('#6b3380'))
    jester(p, { ca: C.gold, cb: C.violet, collar: C.gold, hat: 'crown', eyes: 'star', mouth: 'teeth', hair: C.violet, arms: 'hold' })
    p.line(39, 62, 43, 30, C.gold, Z.top, 2)
    p.ell(43, 28, 3, 3, R, Z.top)
  },
  chicot: (p) => {
    p.bg(hex('#1f3a3a'), 'rays', hex('#244545'))
    jester(p, { ca: C.teal, cb: C.black, collar: C.gold, eyes: 'brow', mouth: 'flat', hat: 'horns2' })
    p.rect(8, 56, 31, 6, C.black, Z.top)
  },
  canio: (p) => {
    p.bg(hex('#4a0f1f'), 'rays', hex('#5a1426'))
    jester(p, { ca: C.white, cb: C.black, collar: R, eyes: 'tear', mouth: 'frown', makeup: 1 })
  },
  // ---------------- LOBBY (PvP) ----------------
  duelist: (p) => {
    p.bg(hex('#ffd1cc'), 'rays', hex('#ffc0b8'))
    bust(p, { ca: R, cb: C.black, eyes: 'angry', mouth: 'grin', arms: 'none' }, -6)
    p.line(4, 76, 40, 50, C.lgrey, Z.top, 2)
    p.line(43, 76, 7, 50, C.lgrey, Z.top, 2)
    p.rect(3, 72, 6, 2, C.gold, Z.top)
    p.rect(38, 72, 6, 2, C.gold, Z.top)
  },
  hotStreak: (p) => {
    p.bg(hex('#2b1020'), 'rays', hex('#3a1529'))
    for (const [x, h] of [[8, 34], [16, 46], [23.5, 56], [31, 46], [39, 34]] as [number, number][]) {
      p.poly([[x - 6, 81], [x, 81 - h], [x + 6, 81]], C.red, Z.back)
      p.poly([[x - 3, 81], [x, 81 - h * 0.7], [x + 3, 81]], C.yellow, Z.back)
    }
    bust(p, { ca: C.orange, cb: R, eyes: 'star', mouth: 'teeth', arms: 'none' }, -8)
  },
  survivor: (p) => {
    p.bg(hex('#d8d8e0'), 'stripes', hex('#cacad6'))
    jester(p, { ca: C.dgrey, cb: C.brown, eyes: 'x', mouth: 'smirk', hat: 'horns2' })
    p.rect(9, 22, 29, 3, C.white, Z.detail, true)
    p.line(14, 33, 20, 33, C.white, Z.detail, 2)
    p.suit('H', 37, 66, 2, C.red, Z.top)
  },
  executioner: (p) => {
    p.bg(hex('#2b2b38'), 'rays', hex('#33333f'))
    jester(p, { ca: C.black, cb: C.black, hat: 'hood', eyes: 'mask', mouth: 'none', nose: false, arms: 'hold' })
    p.line(40, 66, 40, 26, C.brown, Z.top, 2)
    p.poly([[40, 26], [47, 22], [47, 38], [40, 34]], C.lgrey, Z.top)
  },
  shield: (p) => {
    p.bg(hex('#cfe4f2'), 'rays', hex('#bcd9ee'))
    p.poly([[6, 10], [41, 10], [41, 40], [23.5, 72], [6, 40]], B, Z.front)
    p.poly([[10, 14], [37, 14], [37, 38], [23.5, 64], [10, 38]], C.lgrey, Z.top)
    p.suit('S', 23.5, 36, 3, B, Z.detail)
    p.text('-30%', 8, 74, C.ink)
  },
  parasite: (p) => {
    p.bg(hex('#d9ecd0'), 'dots', hex('#c6e1ba'))
    p.ell(23.5, 40, 14, 18, hex('#6b4c3b'), Z.front)
    p.ell(23.5, 20, 7, 5, hex('#4a3428'), Z.top)
    for (const y of [32, 40, 48])
      for (const s of [-1, 1]) p.line(23.5 + s * 13, y, 23.5 + s * 21, y + 6, C.ink, Z.mid, 1)
    p.ell(20, 19, 1.5, 1.5, R, Z.detail, true)
    p.ell(27, 19, 1.5, 1.5, R, Z.detail, true)
    p.coin(23.5, 66, 6)
  },
  scavenger: (p) => {
    p.bg(hex('#f2d8a7'), 'rays', hex('#ecc98a'))
    // ailes
    p.poly([[-6, 40], [10, 30], [16, 62], [-2, 70]], hex('#2a2430'), Z.mid)
    p.poly([[53, 40], [37, 30], [31, 62], [49, 70]], hex('#2a2430'), Z.mid)
    for (let i = 0; i < 4; i++) {
      p.line(-4 + i * 3, 46 + i * 5, 6 + i * 2, 66, hex('#4a4058'), Z.detail)
      p.line(51 - i * 3, 46 + i * 5, 41 - i * 2, 66, hex('#4a4058'), Z.detail)
    }
    p.ell(23.5, 52, 11, 18, hex('#3a3242'), Z.front)
    p.rect(12, 30, 23, 5, C.white, Z.top)
    p.bez([23.5, 31], [21, 22], [24, 14], 3, 2.4, hex('#e8a6a6'), Z.top)
    p.ell(25, 13, 5.5, 5, hex('#e8a6a6'), Z.top)
    p.poly([[29, 12], [36, 16], [30, 18]], hex('#d8a43a'), Z.top)
    p.ell(26, 11, 1.2, 1.2, C.ink, Z.detail, true)
    p.rect(14, 70, 4, 8, hex('#d8a43a'), Z.mid)
    p.rect(29, 70, 4, 8, hex('#d8a43a'), Z.mid)
    p.coin(38, 78, 4)
  },

  spy: (p) => {
    jester(p, { ca: C.black, cb: hex('#8a6d3b'), collar: hex('#c9b48a'), hat: 'top', eyes: 'sleepy', mouth: 'smirk', hair: C.black, nose: false, arms: 'hold' })
    // loupe
    p.ell(40, 60, 6, 6, hex('#bfe7ff'), Z.top)
    p.ell(40, 60, 4, 4, hex('#e9f7ff'), Z.detail, true)
    p.line(36, 66, 31, 74, C.brown, Z.top, 2)
    p.text('?', 38, 57, C.ink, Z.detail)
  },
  pickpocket: (p) => {
    p.bg(hex('#2b2b38'), 'flat')
    p.rect(-6, 50, 30, 36, C.black, Z.mid)
    p.ell(26, 52, 8, 7, C.skin, Z.front)
    for (const x of [21, 25, 29]) p.rect(x, 40, 3, 10, C.skin, Z.front)
    p.ell(30, 30, 10, 10, hex('#8b5a2b'), Z.mid)
    p.bez([24, 22], [30, 16], [36, 22], 1.5, 1.5, hex('#5e3b1c'), Z.top)
    p.coin(30, 31, 5)
    p.coin(10, 22, 3)
    p.coin(40, 12, 3)
    p.text('-2$', 4, 70, C.red, Z.detail)
  },
  bookmaker: (p) => {
    jester(p, { ca: C.green, cb: C.black, collar: C.white, hat: 'beanie', eyes: 'dollar', mouth: 'grin', arms: 'hold' })
    p.rect(30, 62, 11, 11, C.white, Z.top)
    for (const [x, y] of [[33, 65], [38, 65], [33, 70], [38, 70]]) p.set(x, y, C.ink, Z.detail)
    p.coin(6, 72, 4)
    p.coin(12, 76, 3)
  },
  vengeance: (p) => {
    p.bg(hex('#2b1020'), 'rays', hex('#3a1529'))
    jester(p, { ca: C.red, cb: C.black, collar: C.red, eyes: 'angry', mouth: 'teeth', makeup: 1 })
    p.text('×', 4, 70, C.yellow, Z.detail, 2)
  },
  kingHill: (p) => {
    p.bg(hex('#cde8f5'), 'flat')
    p.ell(23.5, 92, 40, 30, hex('#6fbf5f'), Z.mid)
    p.ell(10, 96, 22, 20, hex('#5aa84c'), Z.back)
    p.line(23.5, 30, 23.5, 64, C.brown, Z.top, 2)
    p.poly([[24, 30], [40, 35], [24, 40]], R, Z.top)
    // couronne
    p.poly([[10, 22], [14, 10], [19, 18], [23.5, 6], [28, 18], [33, 10], [37, 22]], C.gold, Z.front)
    p.rect(10, 20, 28, 6, C.gold, Z.front)
    p.ell(23.5, 23, 2, 2, C.red, Z.detail)
    p.text('×2', 30, 66, C.red, Z.detail, 2)
  },
  lastBreath: (p) => {
    p.bg(hex('#1f1f2b'), 'flat')
    p.suit('H', 23.5, 34, 5, hex('#8a2a3a'), Z.front)
    p.line(20, 18, 26, 30, C.ink, Z.detail, 2)
    p.line(26, 30, 21, 40, C.ink, Z.detail, 2)
    p.rect(8, 58, 31, 6, C.black, Z.mid)
    p.rect(9, 59, 5, 4, C.red, Z.top, true)
    p.text('20 PV', 12, 68, C.red)
    p.text('×3', 15, 2, C.yellow, Z.detail, 2)
  },
  pacifist: (p) => {
    p.ell(23.5, 36, 14, 10, C.pure, Z.mid)
    p.ell(34, 28, 6, 5, C.pure, Z.front)
    p.poly([[39, 28], [45, 30], [39, 31]], C.yellow, Z.top)
    p.set(35, 27, C.ink, Z.detail)
    p.poly([[10, 34], [-2, 22], [16, 30]], C.white, Z.front)
    p.poly([[12, 40], [0, 50], [16, 42]], C.white, Z.front)
    p.bez([42, 32], [46, 40], [40, 46], 0.8, 0.8, C.green, Z.top)
    for (const [x, y] of [[44, 37], [41, 42], [45, 43]]) p.ell(x, y, 1.5, 1, C.green, Z.top)
    p.coin(23.5, 64, 6)
  },
  collector: (p) => {
    p.rect(-2, 8, 51, 66, hex('#8b5a2b'), Z.mid)
    p.rect(1, 11, 45, 60, hex('#f3e9d2'), Z.front)
    const cs: [number, number, string, S][] = [[4, 14, 'A', 'S'], [16, 14, 'K', 'H'], [28, 14, 'Q', 'D'], [4, 33, 'J', 'C'], [16, 33, '7', 'H'], [28, 33, '3', 'S'], [4, 52, '9', 'D'], [16, 52, '5', 'C'], [28, 52, '2', 'H']]
    for (const [x, y, r, su] of cs) p.card(x + 2, y, r, su, Z.top)
    p.text('+1', 34, 76, C.red, Z.detail)
  },
  saboteur: (p) => {
    p.bg(hex('#ffe6cc'), 'rays', hex('#ffd9b3'))
    p.ell(23.5, 46, 16, 16, C.black, Z.front)
    p.rect(19, 24, 9, 7, C.dgrey, Z.top)
    p.bez([23.5, 24], [26, 12], [36, 10], 1.2, 1, hex('#c9b48a'), Z.top)
    p.star(37, 9, 4, C.orange, Z.top)
    p.ell(17, 40, 4, 3, C.grey, Z.detail, true)
    p.text('-1', 16, 70, C.red, Z.detail, 2)
  },
  ghostHunter: (p) => {
    p.bg(hex('#1d2b3a'), 'stars', hex('#7fa8c9'))
    p.ell(30, 32, 13, 14, hex('#e8f4ff'), Z.mid)
    p.poly([[17, 32], [43, 32], [43, 54], [38, 50], [34, 54], [30, 50], [26, 54], [22, 50], [17, 54]], hex('#e8f4ff'), Z.mid)
    p.ell(25, 30, 2, 3, C.ink, Z.detail, true)
    p.ell(34, 30, 2, 3, C.ink, Z.detail, true)
    p.ell(29.5, 38, 2, 2, C.ink, Z.detail, true)
    // filet
    p.line(2, 78, 14, 44, C.brown, Z.top, 2)
    p.ell(14, 38, 9, 9, hex('#c9b48a'), Z.top)
    p.ell(14, 38, 7, 7, hex('#1d2b3a'), Z.top, true)
    for (let k = -6; k <= 6; k += 3) {
      p.line(14 + k, 31, 14 + k, 45, hex('#c9b48a'), Z.detail)
      p.line(7, 38 + k, 21, 38 + k, hex('#c9b48a'), Z.detail)
    }
    p.text('+50', 26, 66, C.cyan, Z.detail, 2)
  },
  underdog: (p) => {
    p.bg(hex('#ffe6cc'), 'rays', hex('#ffd9b3'))
    p.ell(23.5, 56, 13, 14, hex('#c98e62'), Z.mid)
    p.ell(23.5, 32, 13, 12, hex('#d9a577'), Z.front)
    p.ell(10, 32, 4, 9, hex('#7a4a2b'), Z.top)
    p.ell(37, 32, 4, 9, hex('#7a4a2b'), Z.top)
    p.ell(23.5, 38, 6, 4, hex('#f2d2b0'), Z.top)
    p.ell(23.5, 35, 2, 1.5, C.ink, Z.detail, true)
    p.ell(18, 29, 1.5, 2, C.ink, Z.detail, true)
    p.ell(29, 29, 1.5, 2, C.ink, Z.detail, true)
    p.ell(9, 60, 5, 5, R, Z.top)
    p.ell(38, 60, 5, 5, R, Z.top)
    p.rect(14, 44, 19, 3, R, Z.top)
  },
  // ================= NOUVEAUX =================
  electric: (p) => {
    p.bg(hex('#fff3b0'), 'rays', hex('#ffe680'))
    jester(p, { ca: C.yellow, cb: C.blue, collar: C.cyan, eyes: 'spiral', mouth: 'teeth', hair: hex('#3a2a10') })
    for (const [x, y, f] of [[2, 10, 1], [38, 8, -1], [4, 58, 1]] as [number, number, number][])
      p.poly([[x + 4 * f, y], [x + 7 * f, y], [x + 4 * f, y + 7], [x + 8 * f, y + 7], [x + 1 * f, y + 18], [x + 3 * f, y + 9], [x, y + 9]], C.yellow, Z.top)
  },
  gambler: (p) => {
    p.bg(hex('#2f7a4f'), 'dots', hex('#28694a'))
    jester(p, { ca: C.green, cb: C.black, collar: C.gold, hat: 'top', eyes: 'brow', mouth: 'smirk', arms: 'hold' })
    const die = (x: number, y: number, pips: [number, number][]) => {
      p.rect(x, y, 11, 11, C.white, Z.top)
      for (const [a, b] of pips) p.rect(x + a, y + b, 2, 2, C.red, Z.detail, true)
    }
    die(29, 60, [[2, 2], [4.5, 4.5], [7, 7]])
    die(6, 64, [[2, 2], [7, 2], [2, 7], [7, 7]])
  },
  brokenMirror: (p) => {
    p.bg(hex('#e6ddf5'), 'rays', hex('#dacdf0'))
    p.ell(23.5, 38, 19, 27, hex('#c8962e'), Z.mid)
    p.ell(23.5, 38, 15, 23, hex('#bfe3f5'), Z.front)
    miniJester(p, 23.5, 34, C.red, C.blue, C.clown, 'o')
    const crack: [number, number][] = [[23, 16], [20, 27], [27, 35], [18, 46], [25, 58]]
    for (let i = 0; i + 1 < crack.length; i++) p.line(crack[i][0], crack[i][1], crack[i + 1][0], crack[i + 1][1], C.pure, Z.detail)
    p.line(27, 35, 36, 30, C.pure, Z.detail)
    p.line(18, 46, 10, 50, C.pure, Z.detail)
    p.poly([[30, 70], [35, 66], [37, 73]], hex('#bfe3f5'), Z.top)
    p.poly([[8, 72], [13, 69], [12, 76]], hex('#bfe3f5'), Z.top)
  },
  rusty: (p) => {
    p.bg(hex('#f0dcc6'), 'stripes', hex('#e8cfb4'))
    jester(p, { ca: hex('#b5582a'), cb: hex('#7a4a2b'), collar: hex('#c98a5a'), face: hex('#d9b48f'), eyes: 'sleepy', mouth: 'flat', hair: hex('#5a3a20') })
    for (const [x, y, r] of [[16, 30, 1.5], [31, 42, 1.2], [20, 46, 1], [28, 27, 1], [12, 60, 1.6], [35, 64, 1.3]] as [number, number, number][])
      p.ell(x, y, r, r, hex('#9a4a1e'), Z.detail, true)
  },
  swissKnife: (p) => {
    p.bg(hex('#ffd6d6'), 'dots', hex('#ffbcbc'))
    p.poly([[23, 34], [27, 34], [44, 6], [41, 4]], C.lgrey, Z.back)
    p.poly([[21, 36], [24, 36], [8, 8], [4, 10]], C.lgrey, Z.back)
    p.poly([[22, 34], [25, 34], [24, 4], [21, 6]], C.grey, Z.back)
    p.line(10, 12, 14, 14, C.white, Z.detail)
    p.rect(9, 36, 29, 40, R, Z.front)
    p.ell(23.5, 36, 14.5, 4, R, Z.front)
    p.ell(23.5, 76, 14.5, 4, R, Z.front)
    p.rect(21, 48, 5, 15, C.pure, Z.top, true)
    p.rect(16, 53, 15, 5, C.pure, Z.top, true)
  },
  greenBill: (p) => {
    p.bg(hex('#e5f2d9'), 'flat')
    for (const [dy, c] of [[14, hex('#5f9a4a')], [7, hex('#6fae58')], [0, hex('#84c46a')]] as [number, RGB][]) {
      p.rect(2, 22 + dy, 43, 24, c, Z.mid + (dy === 0 ? 2 : 0))
    }
    p.rect(4, 24, 39, 20, hex('#a6dc8a'), Z.top, true)
    p.ell(23.5, 34, 7, 7, hex('#84c46a'), Z.top, true)
    p.text('$', 22, 32, hex('#2f5a22'), Z.detail)
    p.text('10', 6, 26, hex('#2f5a22'), Z.detail)
    p.text('10', 34, 38, hex('#2f5a22'), Z.detail)
    fan(p, [['10', 'S'], ['10', 'H'], ['10', 'D']], 60, 12)
  },
  sick: (p) => {
    p.bg(hex('#dfeccf'), 'dots', hex('#cfe2b8'))
    jester(p, { ca: hex('#7fae5a'), cb: hex('#c9d98a'), face: hex('#d4e8bc'), eyes: 'tear', mouth: 'frown', hat: 'beanie' })
    p.line(30, 47, 40, 41, C.white, Z.top, 2)
    p.ell(30, 47, 1.6, 1.6, C.red, Z.top)
    p.text('+5', 34, 70, C.red, Z.detail, 2)
  },
  holeySock: (p) => {
    p.bg(hex('#fdeed8'), 'stripes', hex('#f8e2c4'))
    const sock = hex('#7aa8d8')
    p.rect(14, 2, 15, 44, sock, Z.mid)
    for (let y = 8; y < 44; y += 8) p.rect(14, y, 15, 3, C.pure, Z.mid, true)
    p.bez([21, 42], [22, 60], [38, 60], 8, 7, sock, Z.front)
    p.ell(36, 58, 4, 3.5, hex('#3a2a20'), Z.top, true)
    p.ell(37, 58, 2.5, 2.2, C.skin, Z.detail)
    p.rect(13, 0, 17, 4, C.red, Z.top)
    fan(p, [['2', 'C'], ['3', 'H']], 64, 12)
  },
  braggart: (p) => {
    p.bg(hex('#fff0c2'), 'rays', hex('#ffe08a'))
    jester(p, { ca: C.violet, cb: C.gold, collar: C.yellow, hat: 'crown', eyes: 'star', mouth: 'grin', arms: 'up' })
    p.ell(7, 66, 5, 6, hex('#e8dccb'), Z.top)
    p.text('0', 6, 64, C.ink, Z.detail)
    p.text('+30', 26, 72, C.blue, Z.detail, 2)
  },
  cashier: (p) => {
    p.bg(hex('#d9ecf7'), 'grid', hex('#c9e0ef'))
    p.rect(4, 30, 39, 28, C.dgrey, Z.mid)
    p.rect(10, 16, 27, 12, C.black, Z.front)
    p.rect(12, 18, 23, 8, hex('#3c6a3a'), Z.top, true)
    p.text('+2$', 15, 20, hex('#9bff8a'), Z.detail)
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) p.rect(8 + c * 8, 34 + r * 6, 6, 4, C.lgrey, Z.top)
    p.rect(2, 58, 43, 8, C.grey, Z.front)
    p.rect(18, 61, 11, 2, C.black, Z.detail, true)
    p.coin(10, 72, 4)
    p.coin(24, 75, 3)
    p.coin(36, 72, 4)
  },
  string: (p) => {
    p.bg(hex('#ffe3ea'), 'dots', hex('#ffc9d6'))
    p.ell(23.5, 28, 15, 15, hex('#e8506a'), Z.mid)
    for (let k = -2; k <= 2; k++) p.bez([12, 20 + k * 5], [23.5, 14 + k * 6], [35, 22 + k * 5], 0.5, 0.5, hex('#b82e46'), Z.detail)
    p.bez([33, 38], [44, 50], [30, 56], 0.8, 0.8, hex('#e8506a'), Z.top)
    fan(p, [['2', 'H'], ['5', 'H'], ['8', 'H'], ['J', 'H'], ['A', 'H']], 60, 8)
  },
  brokenHourglass: (p) => {
    p.bg(hex('#f3e2c7'), 'rays', hex('#edd5b0'))
    p.rect(8, 6, 31, 5, hex('#8b5a2b'), Z.front)
    p.rect(8, 66, 31, 5, hex('#8b5a2b'), Z.front)
    p.rect(10, 11, 3, 55, hex('#a8743e'), Z.front)
    p.rect(34, 11, 3, 55, hex('#a8743e'), Z.front)
    p.poly([[14, 11], [33, 11], [25, 38], [22, 38]], hex('#d6eef8'), Z.mid)
    p.poly([[22, 39], [25, 39], [33, 66], [14, 66]], hex('#d6eef8'), Z.mid)
    p.poly([[17, 15], [30, 15], [24.5, 30], [22.5, 30]], C.gold, Z.top, true)
    p.poly([[23.5, 50], [31, 65], [16, 65]], C.gold, Z.top, true)
    p.line(19, 44, 15, 54, C.pure, Z.detail)
    p.line(19, 44, 22, 50, C.pure, Z.detail)
    for (const [x, y] of [[38, 46], [40, 52], [41, 58], [39, 63]]) p.set(x, y, C.gold, Z.detail)
    p.text('1/2', 2, 74, C.ink, Z.detail)
  },
  usurer: (p) => {
    p.bg(hex('#e8e1cf'), 'stripes', hex('#ddd4bd'))
    jester(p, { ca: C.navy, cb: C.gold, collar: C.white, hat: 'top', eyes: 'dollar', mouth: 'fangs', arms: 'hold' })
    p.ell(30, 33, 3.5, 3.5, hex('#d8eef8'), Z.detail, true)
    p.line(33, 35, 35, 44, C.gold, Z.detail)
    p.ell(37, 66, 8, 8, hex('#c9a46a'), Z.top)
    p.rect(34, 56, 6, 4, hex('#a8843e'), Z.top)
    p.text('$', 35, 64, C.dbrown, Z.detail)
  },
  voodoo: (p) => {
    p.bg(hex('#3a2340'), 'flat')
    p.ell(23.5, 22, 12, 12, hex('#c9a46a'), Z.mid)
    p.rect(13, 32, 21, 24, hex('#c9a46a'), Z.mid)
    p.bez([13, 36], [4, 42], [3, 50], 3, 3, hex('#c9a46a'), Z.mid)
    p.bez([34, 36], [43, 42], [44, 50], 3, 3, hex('#c9a46a'), Z.mid)
    p.rect(15, 56, 6, 14, hex('#c9a46a'), Z.mid)
    p.rect(26, 56, 6, 14, hex('#c9a46a'), Z.mid)
    for (const x of [18, 28]) {
      p.line(x - 2, 18, x + 2, 22, C.ink, Z.detail)
      p.line(x + 2, 18, x - 2, 22, C.ink, Z.detail)
    }
    p.line(18, 28, 29, 28, C.ink, Z.detail)
    for (let x = 19; x < 29; x += 2) p.set(x, 27, C.ink, Z.detail)
    p.suit('H', 23.5, 42, 1, C.red, Z.top)
    for (const [x0, y0, x1, y1, c] of [[30, 38, 42, 30, R], [16, 48, 6, 40, C.cyan], [23, 12, 26, 2, C.yellow]] as [number, number, number, number, RGB][]) {
      p.line(x0, y0, x1, y1, C.lgrey, Z.top)
      p.ell(x1, y1, 1.8, 1.8, c, Z.top)
    }
  },
  lead: (p) => {
    p.bg(hex('#d6d9e0'), 'grid', hex('#c8ccd6'))
    jester(p, { ca: C.dgrey, cb: C.grey, collar: C.lgrey, face: hex('#c9ccd4'), hat: 'helmet', eyes: 'sleepy', mouth: 'flat', hair: C.black })
    p.rect(30, 62, 14, 12, C.dgrey, Z.top)
    p.text('PB', 32, 66, C.lgrey, Z.detail)
  },
  megalith: (p) => {
    p.bg(hex('#f6c27a'), 'gradient', hex('#e57b5a'))
    p.ell(23.5, 92, 44, 22, hex('#5f8a4a'), Z.back)
    p.poly([[13, 70], [15, 10], [23, 4], [32, 10], [34, 70]], hex('#8a8f9c'), Z.front)
    for (const [x, y] of [[18, 22], [26, 30], [20, 44], [28, 52]]) p.line(x, y, x + 3, y + 3, hex('#6a6f7c'), Z.detail)
    p.poly([[2, 72], [3, 48], [8, 44], [11, 72]], hex('#7a7f8c'), Z.mid)
    p.poly([[36, 72], [38, 52], [43, 50], [45, 72]], hex('#7a7f8c'), Z.mid)
    p.text('+50', 13, 74, C.pure, Z.detail, 2)
  },
  impostor: (p) => {
    p.bg(hex('#e4d8f2'), 'rays', hex('#d6c6ec'))
    jester(p, { ca: C.purple, cb: C.black, collar: C.violet, hat: 'tricorne', eyes: 'mask', mouth: 'smirk', arms: 'hold' })
    p.ell(37, 64, 7, 8, C.clown, Z.top)
    p.ell(34.5, 62, 1.3, 1.6, C.ink, Z.detail, true)
    p.ell(39.5, 62, 1.3, 1.6, C.ink, Z.detail, true)
    p.line(34, 67, 40, 67, C.red, Z.detail)
    p.line(37, 72, 37, 78, C.brown, Z.top)
  },
  doubleEdge: (p) => {
    p.bg(hex('#3a1a22'), 'rays', hex('#4a2028'))
    p.poly([[21, 40], [26, 40], [26, 4], [23.5, 0], [21, 4]], C.lgrey, Z.mid)
    p.poly([[21, 44], [26, 44], [26, 76], [23.5, 81], [21, 76]], C.lgrey, Z.mid)
    p.line(23.5, 4, 23.5, 38, C.pure, Z.detail)
    p.rect(12, 39, 23, 6, C.gold, Z.front)
    p.ell(23.5, 42, 3, 3, C.red, Z.top)
    p.text('+8', 2, 8, C.yellow, Z.detail, 2)
    p.text('+4', 34, 66, C.red, Z.detail, 2)
  },
  catalyst: (p) => {
    p.bg(hex('#d8f2e8'), 'dots', hex('#bfe8d8'))
    p.rect(19, 6, 9, 22, hex('#e8f6fb'), Z.mid)
    p.poly([[19, 26], [28, 26], [42, 66], [5, 66]], hex('#e8f6fb'), Z.mid)
    p.poly([[13, 46], [34, 46], [41, 65], [6, 65]], hex('#4cd17a'), Z.front)
    p.rect(17, 4, 13, 4, hex('#c9b48a'), Z.front)
    for (const [x, y, r] of [[18, 54, 2], [27, 58, 1.5], [23, 50, 1.2], [31, 52, 1]] as [number, number, number][]) p.ell(x, y, r, r, hex('#b8ffd0'), Z.detail, true)
    for (const [x, y, r] of [[24, 0, 2], [30, -2, 1.5], [18, 2, 1.2]] as [number, number, number][]) p.ell(x, y, r, r, hex('#8aeab0'), Z.top)
    p.text('×0.1', 8, 72, C.red, Z.detail)
  },
  alchemist: (p) => {
    p.bg(hex('#2b2140'), 'stars', hex('#a89bd0'))
    jester(p, { ca: C.violet, cb: C.navy, collar: C.gold, hat: 'hood', eyes: 'big', mouth: 'o', arms: 'hold' })
    p.rect(29, 56, 13, 18, C.gold, Z.top)
    p.text('A', 31, 58, C.dbrown, Z.detail)
    p.suit('D', 35.5, 67, 1, C.dbrown, Z.detail)
    p.sparkle(43, 54)
    p.sparkle(27, 52)
  },
  bodyguard: (p) => {
    p.bg(hex('#cfd8e6'), 'stripes', hex('#c2ccdc'))
    jester(p, { ca: C.black, cb: C.black, collar: C.white, hat: 'none', eyes: 'mask', mouth: 'flat', hair: C.black, nose: false })
    p.line(36, 30, 39, 40, C.black, Z.detail)
    p.ell(39, 41, 1, 1.5, C.black, Z.detail, true)
    p.poly([[4, 54], [16, 54], [16, 66], [10, 74], [4, 66]], C.blue, Z.top)
    p.text('5', 8, 58, C.pure, Z.detail)
  },
  leakyPurse: (p) => {
    p.bg(hex('#f3e6cf'), 'dots', hex('#e9d7b7'))
    p.ell(23.5, 36, 16, 18, hex('#a8743e'), Z.mid)
    p.poly([[16, 18], [31, 18], [28, 10], [19, 10]], hex('#a8743e'), Z.mid)
    p.bez([16, 19], [23.5, 22], [31, 19], 1.2, 1.2, hex('#5e3b1c'), Z.top)
    p.ell(20, 50, 3, 2, hex('#3a2410'), Z.top, true)
    p.ell(30, 42, 2, 2, hex('#3a2410'), Z.top, true)
    p.coin(20, 60, 3)
    p.coin(22, 72, 3)
    p.coin(31, 52, 2)
    p.suit('D', 38, 72, 2, C.suitRed, Z.top)
  },
  wheelInv: (p) => {
    p.bg(hex('#26304a'), 'rays', hex('#2e3a58'))
    const cols = [C.red, C.gold, C.blue, C.lgrey, C.green, C.violet, C.orange, C.cyan]
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2
      const a1 = ((i + 1) / 8) * Math.PI * 2
      p.poly([[23.5, 38], [23.5 + Math.cos(a0) * 19, 38 + Math.sin(a0) * 19], [23.5 + Math.cos((a0 + a1) / 2) * 20, 38 + Math.sin((a0 + a1) / 2) * 20], [23.5 + Math.cos(a1) * 19, 38 + Math.sin(a1) * 19]], cols[i], Z.mid, true)
    }
    p.ell(23.5, 38, 4, 4, C.gold, Z.front)
    p.poly([[19, 64], [28, 64], [23.5, 56]], C.pure, Z.top)
    p.text('1/3', 18, 70, C.yellow, Z.detail)
  },
  timeMaster: (p) => {
    p.bg(hex('#18213a'), 'stars', hex('#9fb4e0'))
    p.ell(23.5, 36, 20, 20, C.gold, Z.mid)
    p.ell(23.5, 36, 17, 17, hex('#f6efdc'), Z.front)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      p.set(23.5 + Math.cos(a) * 14, 36 + Math.sin(a) * 14, C.ink, Z.detail)
    }
    p.line(23.5, 36, 23.5, 25, C.ink, Z.detail, 2)
    p.line(23.5, 36, 15, 40, C.ink, Z.detail, 2)
    p.bez([40, 18], [46, 36], [38, 52], 1.4, 1.4, C.cyan, Z.top)
    p.poly([[33, 50], [41, 48], [38, 56]], C.cyan, Z.top)
    p.text('REPLAY', 12, 66, C.cyan, Z.detail)
  },
  devilPact: (p) => {
    p.bg(hex('#3a0d14'), 'rays', hex('#4d1119'))
    jester(p, { ca: C.darkred, cb: C.black, collar: C.red, hat: 'horns2', face: hex('#f0b0a0'), eyes: 'angry', mouth: 'fangs', arms: 'hold' })
    p.rect(28, 58, 15, 18, hex('#f3e2c0'), Z.top)
    for (let y = 61; y < 70; y += 3) p.line(30, y, 40, y, C.dgrey, Z.detail)
    p.line(30, 72, 38, 72, C.red, Z.detail)
    p.text('-10', 2, 2, C.yellow, Z.detail, 2)
  },
  strategist: (p) => {
    p.bg(hex('#e9e2d0'), 'grid', hex('#d9cfb4'))
    jester(p, { ca: C.navy, cb: C.white, collar: C.lgrey, hat: 'mortar', eyes: 'brow', mouth: 'smirk', arms: 'hold' })
    p.rect(30, 70, 12, 4, C.black, Z.top)
    p.rect(32, 60, 8, 10, C.black, Z.top)
    p.ell(36, 57, 4, 3, C.black, Z.top)
    p.line(36, 50, 36, 54, C.black, Z.top)
    p.line(34, 52, 38, 52, C.black, Z.top)
  },
  divineMirror: (p) => {
    p.bg(hex('#fff7da'), 'rays', hex('#ffeeb0'))
    p.poly([[4, 30], [-4, 18], [2, 40], [10, 38]], C.pure, Z.back)
    p.poly([[43, 30], [51, 18], [45, 40], [37, 38]], C.pure, Z.back)
    p.ell(23.5, 40, 15, 22, C.gold, Z.mid)
    p.ell(23.5, 40, 12, 19, hex('#e2f4ff'), Z.front)
    p.ell(23.5, 12, 10, 3, C.yellow, Z.top)
    p.ell(23.5, 12, 7, 1.5, hex('#fff7da'), Z.top, true)
    p.line(16, 30, 20, 26, C.pure, Z.detail)
    p.line(16, 34, 24, 26, C.pure, Z.detail)
    p.text('1/2', 17, 70, C.red, Z.detail, 1)
  },
  gravedigger: (p) => {
    p.bg(hex('#1f2638'), 'stars', hex('#8a9cc4'))
    p.ell(38, 10, 5, 5, hex('#f3ecc8'), Z.mid)
    p.ell(23.5, 88, 40, 18, hex('#3d4a2e'), Z.back)
    p.rect(12, 26, 23, 44, C.grey, Z.mid)
    p.ell(23.5, 26, 11.5, 8, C.grey, Z.mid)
    p.text('RIP', 18, 28, C.ink, Z.detail)
    p.card(18, 40, 'K', 'S', Z.top)
    p.line(40, 30, 40, 70, C.brown, Z.top, 2)
    p.poly([[36, 70], [44, 70], [43, 78], [37, 78]], C.lgrey, Z.top)
    p.text('+50', 2, 72, C.cyan, Z.detail)
  },
  champagne: (p) => {
    p.bg(hex('#fdf2d0'), 'dots', hex('#f6e2a4'))
    p.rect(17, 34, 14, 42, hex('#2f6a3a'), Z.mid)
    p.poly([[17, 34], [31, 34], [27, 20], [21, 20]], hex('#2f6a3a'), Z.mid)
    p.rect(20, 12, 8, 10, C.gold, Z.front)
    p.rect(18, 48, 12, 14, hex('#f3e2c0'), Z.front)
    p.text('×4', 19, 52, C.red, Z.detail)
    p.ell(30, 3, 3, 4, hex('#c9a46a'), Z.top)
    for (const [x, y, r] of [[14, 8, 1.5], [36, 12, 1.2], [10, 18, 1], [38, 22, 1.4], [24, 6, 1]] as [number, number, number][]) p.ell(x, y, r, r, hex('#fff2b0'), Z.top)
  },
  promethee: (p) => {
    p.bg(hex('#1e1420'), 'rays', hex('#2a1a28'))
    p.poly([[20, 40], [27, 40], [25, 78], [22, 78]], hex('#8b5a2b'), Z.mid)
    p.rect(17, 36, 13, 6, C.gold, Z.front)
    p.ell(23.5, 24, 9, 14, C.orange, Z.front)
    p.ell(23.5, 28, 6, 9, C.yellow, Z.top)
    p.ell(23.5, 31, 3, 5, C.pure, Z.detail, true)
    for (const x of [6, 41]) for (let y = 46; y < 76; y += 5) p.ell(x, y, 2.5, 2, C.grey, Z.mid)
    p.text('×0.5', 15, 2, C.yellow, Z.detail)
  },
  pandora: (p) => {
    p.bg(hex('#2a1f3a'), 'rays', hex('#3a2a50'))
    p.poly([[6, 40], [41, 40], [37, 30], [10, 30]], hex('#fff1a8'), Z.back)
    p.rect(6, 46, 35, 24, hex('#7a3a8a'), Z.mid)
    p.rect(6, 52, 35, 3, C.gold, Z.front)
    p.rect(21, 50, 5, 8, C.gold, Z.top)
    p.poly([[4, 44], [43, 44], [40, 30], [8, 34]], hex('#8e4aa0'), Z.front)
    p.card(8, 10, 'K', 'H', Z.top)
    p.card(26, 4, 'Q', 'S', Z.top)
    p.card(17, 18, 'J', 'D', Z.top)
    p.sparkle(40, 20, C.yellow)
    p.sparkle(5, 26, C.yellow)
    p.text('15', 18, 74, C.yellow, Z.detail, 2)
  },
}

const KEEP_BG = new Set(['megalith', 'wheelInv', 'timeMaster', 'devilPact', 'gravedigger', 'promethee', 'pandora', 'voodoo', 'doubleEdge', 'alchemist', 'greenBill', 'pickpocket', 'vengeance', 'kingHill', 'lastBreath', 'saboteur', 'ghostHunter', 'supernova', 'constellation', 'rocket', 'toTheMoon', 'shootMoon', 'campfire', 'hack', 'summit', 'business', 'drivers', 'rideBus', 'scary', 'sock', 'golden', 'steelJoker', 'hologram', 'vampire', 'blueprint', 'dusk', 'hotStreak', 'canio', 'chicot', 'triboulet', 'wrathful', 'cardSharp', 'stencil', 'glassJoker'])

/** Dessine la scène d'un joker (sans la convertir en image) — utile pour les tests. */
export function paintJoker(defId: string): Painter | null {
  const scene = SCENES[defId]
  if (!scene) return null
  const p = new Painter()
  p.bg(C.white)
  scene(p)
  if (!KEEP_BG.has(defId)) p.clearBg()
  if (defId !== 'blueprint') p.outline()
  return p
}

const cache = new Map<string, string>()

/** Image de l'illustration d'un joker (null si aucune scène n'existe). */
export function jokerIllustration(defId: string): string | null {
  const hit = cache.get(defId)
  if (hit) return hit
  const p = paintJoker(defId)
  if (!p) return null
  const url = p.toDataURL()
  cache.set(defId, url)
  return url
}

export function hasIllustration(defId: string): boolean {
  return defId in SCENES
}

export { PH, PW }
