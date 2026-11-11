// Visuels pixel art dessinés en SVG (originaux, dans l'esprit de Balatro).
// Toutes les cartes font 71×95 unités, comme une carte de Balatro.
import type { Card, ConsumableKind, Edition, Suit } from '../engine/types'
import { rankLabel } from '../engine/cards'
import { getJoker } from '../engine/jokers'
import { getConsumable, PLANET_LIST, TAROT_LIST } from '../engine/consumables'
import type { PackKind, PackSize } from '../engine/shop'
import { FACES, mirrorEven, SPECIAL } from './sprites'
import { JESTER_H, JESTER_W, jesterImage } from './jesterGen'
import { jokerIllustration, PH as ILL_H, PW as ILL_W } from './illustrations'

export const W = 71
export const H = 95

export const SUIT_COLOR: Record<Suit, string> = { H: '#e8384f', D: '#e8384f', S: '#3a4466', C: '#3a4466' }

// ---------- rendu de bitmaps ----------
type Palette = Record<string, string>

/** Dessine une image pixel (lignes de caractères) en rectangles SVG, en fusionnant les pixels contigus. */
export function Px({ rows, pal, x = 0, y = 0, s = 1 }: { rows: string[]; pal: Palette; x?: number; y?: number; s?: number }) {
  const rects: React.ReactNode[] = []
  rows.forEach((row, ry) => {
    let i = 0
    while (i < row.length) {
      const ch = row[i]
      if (ch === '.' || !pal[ch]) {
        i++
        continue
      }
      let j = i
      while (j < row.length && row[j] === ch) j++
      rects.push(<rect key={`${ry}-${i}`} x={x + i * s} y={y + ry * s} width={(j - i) * s} height={s} fill={pal[ch]} />)
      i = j
    }
  })
  return <g shapeRendering="crispEdges">{rects}</g>
}

// ---------- couleurs ----------
const SUIT_PX: Record<Suit, string[]> = {
  H: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  D: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  S: ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '.X.X.X.', '..XXX..'],
  C: ['..XXX..', '..XXX..', 'XX.X.XX', 'XXXXXXX', 'XX.X.XX', '...X...', '..XXX..'],
}

export function SuitPx({ suit, x, y, s = 1, color }: { suit: Suit; x: number; y: number; s?: number; color?: string }) {
  return <Px rows={SUIT_PX[suit]} pal={{ X: color ?? SUIT_COLOR[suit] }} x={x} y={y} s={s} />
}

// positions des « pips » (en fractions de la zone centrale)
const PIPS: Record<number, [number, number][]> = {
  2: [[0.5, 0.08], [0.5, 0.92]],
  3: [[0.5, 0.08], [0.5, 0.5], [0.5, 0.92]],
  4: [[0.18, 0.08], [0.82, 0.08], [0.18, 0.92], [0.82, 0.92]],
  5: [[0.18, 0.08], [0.82, 0.08], [0.5, 0.5], [0.18, 0.92], [0.82, 0.92]],
  6: [[0.18, 0.08], [0.82, 0.08], [0.18, 0.5], [0.82, 0.5], [0.18, 0.92], [0.82, 0.92]],
  7: [[0.18, 0.08], [0.82, 0.08], [0.5, 0.29], [0.18, 0.5], [0.82, 0.5], [0.18, 0.92], [0.82, 0.92]],
  8: [[0.18, 0.08], [0.82, 0.08], [0.5, 0.29], [0.18, 0.5], [0.82, 0.5], [0.5, 0.71], [0.18, 0.92], [0.82, 0.92]],
  9: [[0.18, 0.08], [0.82, 0.08], [0.18, 0.36], [0.82, 0.36], [0.5, 0.5], [0.18, 0.64], [0.82, 0.64], [0.18, 0.92], [0.82, 0.92]],
  10: [[0.18, 0.08], [0.82, 0.08], [0.5, 0.22], [0.18, 0.36], [0.82, 0.36], [0.18, 0.64], [0.82, 0.64], [0.5, 0.78], [0.18, 0.92], [0.82, 0.92]],
}

function cardBg(c: Card): string {
  switch (c.enh) {
    case 'bonus':
      return 'url(#g-bonus)'
    case 'mult':
      return 'url(#g-mult)'
    case 'wild':
      return 'url(#g-wild)'
    case 'glass':
      return 'url(#g-glass)'
    case 'steel':
      return 'url(#g-steel)'
    case 'gold':
      return 'url(#g-gold)'
    case 'lucky':
      return 'url(#g-lucky)'
    case 'stone':
      return '#8d8a83'
    default:
      return '#f6f1e6'
  }
}

const SEAL_COLOR = { gold: '#f5b83d', red: '#e84545', blue: '#3b8ff3', purple: '#9b59d0' } as const

/** Une carte à jouer. */
export function PlayingCardArt({ card }: { card: Card }) {
  const col = SUIT_COLOR[card.suit]
  const stone = card.enh === 'stone'
  const label = rankLabel(card.rank)
  const pips = PIPS[card.rank]
  const area = { x: 17, y: 13, w: 37, h: 69 }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="art">
      <rect x="1" y="1" width={W - 2} height={H - 2} rx="5" fill={cardBg(card)} stroke="#d6cdbb" strokeWidth="1.5" />
      {stone ? (
        <g>
          <Px
            rows={['..xx....x..', '.xxxx..xxx.', 'xxyxxxxxxyx', 'xxxxxyxxxxx', '.xxxxxxxyx.', '..xxxx.xx..']}
            pal={{ x: '#6e6a63', y: '#55524d' }}
            x={8}
            y={30}
            s={5}
          />
        </g>
      ) : (
        <>
          {card.enh === 'glass' && <path d="M8 88 L60 8 M18 88 L66 16" stroke="#ffffff" strokeWidth="3" opacity="0.6" />}
          {card.enh === 'lucky' && (
            <Px rows={['.x.x.', 'xxxxx', '.xxx.', 'xxxxx', '.x.x.', '..x..']} pal={{ x: '#3b9a4d' }} x={52} y={78} s={2} />
          )}
          {/* index haut-gauche */}
          <text x="5" y="15" className="idx" fill={col}>
            {label}
          </text>
          <SuitPx suit={card.suit} x={5} y={18} />
          {/* index bas-droite (retourné) */}
          <g transform={`rotate(180 ${W / 2} ${H / 2})`}>
            <text x="5" y="15" className="idx" fill={col}>
              {label}
            </text>
            <SuitPx suit={card.suit} x={5} y={18} />
          </g>
          {card.rank === 14 && <SuitPx suit={card.suit} x={W / 2 - 14} y={H / 2 - 14} s={4} />}
          {pips &&
            pips.map(([fx, fy], i) => (
              <g key={i} transform={fy > 0.5 ? `rotate(180 ${area.x + fx * area.w} ${area.y + fy * area.h})` : undefined}>
                <SuitPx suit={card.suit} x={area.x + fx * area.w - 7} y={area.y + fy * area.h - 7} s={2} />
              </g>
            ))}
          {card.rank >= 11 && card.rank <= 13 && (
            <g>
              <rect x="13" y="13" width="45" height="69" fill={card.suit === 'H' || card.suit === 'D' ? '#fff1ec' : '#eef1fb'} stroke={col} strokeWidth="1.5" rx="2" />
              <Px
                rows={mirrorEven(FACES[card.rank])}
                pal={{
                  o: '#2a2a3a',
                  y: '#f2b632',
                  Y: '#ffe38a',
                  j: card.suit === 'H' || card.suit === 'D' ? '#3b8ff3' : '#e8384f',
                  s: '#f6d5b5',
                  k: '#2a2a3a',
                  w: '#e9e9e9',
                  h: card.rank === 12 ? (card.suit === 'H' || card.suit === 'D' ? '#c4572a' : '#3b2a1a') : '#6b4226',
                  c: col,
                  g: '#f2b632',
                  r: '#e87a8c',
                  m: '#c0392b',
                  n: '#e8a38a',
                  e: '#ffffff',
                  x: '#2a2a3a',
                }}
                x={14.5}
                y={card.rank === 11 ? 27 : 22}
                s={2.1}
              />
            </g>
          )}
        </>
      )}
      {card.seal && (
        <Px
          rows={['.xxx.', 'xxyxx', 'xyyyx', 'xxyxx', '.xxx.']}
          pal={{ x: SEAL_COLOR[card.seal], y: '#ffffff' }}
          x={3}
          y={42}
          s={2}
        />
      )}
    </svg>
  )
}

export function CardBack() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="art">
      <rect x="1" y="1" width={W - 2} height={H - 2} rx="5" fill="#d64545" stroke="#f6f1e6" strokeWidth="3" />
      <rect x="7" y="7" width={W - 14} height={H - 14} rx="2" fill="url(#p-back)" />
      <rect x="7" y="7" width={W - 14} height={H - 14} rx="2" fill="none" stroke="#f6f1e6" strokeWidth="1" />
    </svg>
  )
}

// ---------- jokers ----------
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

const RARITY_COLOR = { 1: '#0093ff', 2: '#35bd86', 3: '#fd5f55', 4: '#b26cbb' } as const

const ICONS: Record<string, string[]> = {
  x: ['x.....x', '.x...x.', '..x.x..', '...x...', '..x.x..', '.x...x.', 'x.....x'],
  plus: ['...x...', '...x...', '...x...', 'xxxxxxx', '...x...', '...x...', '...x...'],
  coin: ['..xxx..', '.x.x.x.', 'x.xxx.x', 'x..x..x', 'x.xxx.x', '.x.x.x.', '..xxx..'],
  chip: ['..xxx..', '.xx.xx.', 'xx.x.xx', 'x.xxx.x', 'xx.x.xx', '.xx.xx.', '..xxx..'],
  again: ['.xxxxx.', 'x.....x', 'x......', 'x...x..', 'x...xx.', '.xxxxxx', '....xx.'],
  gear: ['.x.x.x.', 'xxxxxxx', '.xx.xx.', 'xx...xx', '.xx.xx.', 'xxxxxxx', '.x.x.x.'],
  copy: ['xxxx...', 'x..x...', 'x.xxxx.', 'xxx..x.', '..x..x.', '..xxxx.', '.......'],
  sword: ['......x', '.....x.', '....x..', 'x..x...', '.xx....', '.xx....', 'x..x...'],
}
const ICON_BG: Record<string, string> = {
  x: '#fd5f55', plus: '#fd5f55', coin: '#e0a800', chip: '#0093ff', again: '#35bd86', gear: '#7d8597', copy: '#4361ee', sword: '#7a1f2b',
}
const SUIT_OF: Record<string, Suit> = {
  greedy: 'D', lusty: 'H', wrathful: 'S', gluttonous: 'C', arrowhead: 'S', onyx: 'C', roughGem: 'D', bloodstone: 'H',
}
const AGAIN = ['hack', 'sock', 'dusk', 'chad', 'mime', 'seltzer']

function emblemFor(defId: string): { icon?: string; suit?: Suit } {
  if (SUIT_OF[defId]) return { suit: SUIT_OF[defId] }
  const d = getJoker(defId)
  if (d.copy) return { icon: 'copy' }
  if (d.rules) return { icon: 'gear' }
  if (AGAIN.includes(defId)) return { icon: 'again' }
  if (d.damageBonus || d.damageTakenMult) return { icon: 'sword' }
  const txt = d.desc({ uid: 0, defId, state: {}, sellBonus: 0, basePrice: 0 })
  if (txt.includes('×')) return { icon: 'x' }
  if (/\$/.test(txt) && !/Grit|jetons/.test(txt)) return { icon: 'coin' }
  if (txt.includes('jetons')) return { icon: 'chip' }
  if (txt.includes('Grit')) return { icon: 'plus' }
  return { icon: 'coin' }
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))))
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
}

const ILL_OX = 6
/** Lettres « JOKER » à empattements (5 × 7), à la verticale comme sur une carte. */
const JOKER_LETTERS: string[][] = [
  ['..XXX', '...X.', '...X.', '...X.', 'X..X.', 'X..X.', '.XX..'],
  ['.XXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  ['XX.XX', '.X.X.', '.XX..', '.XX..', '.X.X.', '.X..X', 'XX.XX'],
  ['XXXXX', '.X..X', '.X...', '.XXX.', '.X...', '.X..X', 'XXXXX'],
  ['XXXX.', '.X..X', '.X..X', '.XXX.', '.X.X.', '.X..X', 'XX.XX'],
]

const PANEL_BG = ['#cfe4f2', '#f8d6c8', '#d9ecd0', '#efe0f7', '#fff0c2', '#d6f0ee', '#f5d0d8', '#e3e3f5']

/** Illustration de joker : cadre « JOKER » + bouffon détaillé généré, ou dessin spécial. */
export function JokerArt({ defId, edition }: { defId: string; edition?: Edition }) {
  const d = getJoker(defId)
  const h = hash(defId)
  const special = SPECIAL[defId]
  const panel = special?.bg ?? (d.rarity === 4 ? '#ffe9a8' : PANEL_BG[(h >>> 4) % PANEL_BG.length])
  const pattern = (h >>> 17) % 3
  const emb = emblemFor(defId)
  const ink = '#3a4466'

  let art: React.ReactNode
  const ill = jokerIllustration(defId)
  if (ill) {
    // Carte façon Balatro : fond crème, illustration pleine carte, gros « JOKER » à empattements
    const letters = (
      <>
        {JOKER_LETTERS.map((rows, i) =>
          [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ].map(([dx, dy], k) => <Px key={`${i}-${k}`} rows={rows} pal={{ X: '#f2eee4' }} x={2.5 + dx} y={3 + i * 8.6 + dy} s={1} />),
        )}
        {JOKER_LETTERS.map((rows, i) => (
          <Px key={i} rows={rows} pal={{ X: '#2f3155' }} x={2.5} y={3 + i * 8.6} s={1} />
        ))}
      </>
    )
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="art">
        <rect x="1" y="1" width={W - 2} height={H - 2} rx="5" fill={d.rarity === 4 ? '#f6e7b8' : '#f2eee4'} stroke="#c9c1ae" strokeWidth="1.2" />
        <image href={ill} x={ILL_OX} y={2} width={ILL_W} height={ILL_H} style={{ imageRendering: 'pixelated' }} clipPath="url(#clip-card)" />
        {letters}
        <g transform={`rotate(180 ${W / 2} ${H / 2})`}>{letters}</g>
        {d.pvp && (
          <g>
            <rect x="24" y="86" width="23" height="7" rx="1.5" fill="#7a1f2b" />
            <text x="35.5" y="91.6" className="tiny" fill="#ffd6dc" textAnchor="middle" style={{ fontSize: 7 }}>
              LOBBY
            </text>
          </g>
        )}
        {edition === 'negative' && <rect x="1" y="1" width={W - 2} height={H - 2} rx="5" fill="none" />}
      </svg>
    )
  } else if (special) {
    const w = Math.max(...special.rows.map((r) => r.length))
    const sc = Math.min(42 / w, 54 / special.rows.length)
    art = <Px rows={special.rows} pal={special.pal} x={W / 2 - (w * sc) / 2} y={46 - (special.rows.length * sc) / 2} s={sc} />
  } else {
    const url = jesterImage(defId, { rarityColor: RARITY_COLOR[d.rarity], legendary: d.rarity === 4, pvp: d.pvp })
    art = <image href={url} x={W / 2 - JESTER_W / 2} y={7} width={JESTER_W} height={JESTER_H} style={{ imageRendering: 'pixelated' }} />
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="art">
      <rect x="1" y="1" width={W - 2} height={H - 2} rx="5" fill={d.rarity === 4 ? 'url(#g-gold)' : '#f9f6ee'} stroke="#c8bfae" strokeWidth="1.5" />
      <rect x="11" y="6" width="49" height="83" rx="3" fill={panel} stroke={shade(panel, 0.8)} strokeWidth="1" />
      {pattern === 1 && <rect x="11" y="6" width="49" height="83" rx="3" fill="url(#p-dots)" />}
      {pattern === 2 && (
        <g opacity="0.12" clipPath="url(#clip-panel)">
          {Array.from({ length: 12 }, (_, i) => {
            const a1 = (i / 12) * Math.PI * 2
            const a2 = a1 + Math.PI / 24
            const cx = W / 2
            const cy = 46
            return <polygon key={i} points={`${cx},${cy} ${cx + Math.cos(a1) * 80},${cy + Math.sin(a1) * 80} ${cx + Math.cos(a2) * 80},${cy + Math.sin(a2) * 80}`} fill="#000" />
          })}
        </g>
      )}
      {art}
      {/* « JOKER » dans les coins, comme une carte */}
      {['J', 'O', 'K', 'E', 'R'].map((ch, i) => (
        <text key={i} x="6" y={13 + i * 8.5} className="jk" fill={ink} textAnchor="middle">
          {ch}
        </text>
      ))}
      <g transform={`rotate(180 ${W / 2} ${H / 2})`}>
        {['J', 'O', 'K', 'E', 'R'].map((ch, i) => (
          <text key={i} x="6" y={13 + i * 8.5} className="jk" fill={ink} textAnchor="middle">
            {ch}
          </text>
        ))}
      </g>
      {!ill && <g>
        <circle cx={W - 17} cy={H - 15} r="7.5" fill={emb.suit ? '#ffffff' : ICON_BG[emb.icon!]} stroke="#2b2d42" strokeWidth="1.2" />
        {emb.suit ? (
          <SuitPx suit={emb.suit} x={W - 17 - 4.9} y={H - 15 - 4.9} s={1.4} />
        ) : (
          <Px rows={ICONS[emb.icon!]} pal={{ x: '#ffffff' }} x={W - 17 - 4.9} y={H - 15 - 4.9} s={1.4} />
        )}
      </g>}
      {d.pvp && (
        <g>
          <rect x="13" y="78" width="30" height="9" rx="2" fill="#7a1f2b" />
          <text x="28" y="85" className="tiny" fill="#ffd6dc" textAnchor="middle">
            LOBBY
          </text>
        </g>
      )}
      {edition === 'negative' && <rect x="1" y="1" width={W - 2} height={H - 2} rx="5" fill="none" />}
    </svg>
  )
}

// ---------- consommables ----------
const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI']

const T_ICONS: Record<string, string[]> = {
  sun: ['x...x...x', '.x.xxx.x.', '..xxxxx..', '.xxxxxxx.', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '.x.xxx.x.', 'x...x...x'],
  moon: ['...xxx...', '.xxx.....', '.xx......', 'xx.......', 'xx.......', 'xx.......', '.xx....x.', '.xxxxxx..', '...xxx...'],
  star: ['....x....', '....x....', '...xxx...', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '..xx.xx..', '.xx...xx.', 'x.......x'],
  eye: ['.........', '..xxxxx..', '.x.....x.', 'x..xxx..x', 'x.xx.xx.x', 'x..xxx..x', '.x.....x.', '..xxxxx..', '.........'],
  crown: ['.........', 'x...x...x', 'xx.xxx.xx', 'xxxxxxxxx', 'xxxxxxxxx', 'x.xx.xx.x', 'xxxxxxxxx', '.........', '.........'],
  heart: ['.xx...xx.', 'xxxx.xxxx', 'xxxxxxxxx', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '...xxx...', '....x....', '.........'],
  tower: ['..x.x.x..', '..xxxxx..', '...xxx...', '...x.x...', '...xxx...', '..xx.xx..', '..xxxxx..', '.xxxxxxx.', 'xxxxxxxxx'],
  skull: ['..xxxxx..', '.xxxxxxx.', 'xxxxxxxxx', 'xx..x..xx', 'xx..x..xx', 'xxxxxxxxx', '.xxx.xxx.', '..x.x.x..', '..xxxxx..'],
  scale: ['....x....', 'xxxxxxxxx', 'x...x...x', 'x...x...x', 'xxx.x.xxx', '....x....', '....x....', '...xxx...', '..xxxxx..'],
  wheel: ['..xxxxx..', '.x..x..x.', 'x.x.x.x.x', 'x..xxx..x', 'xxxxxxxxx', 'x..xxx..x', 'x.x.x.x.x', '.x..x..x.', '..xxxxx..'],
  cup: ['xxxxxxxxx', 'x.......x', 'xx.....xx', '.xx...xx.', '..xxxxx..', '....x....', '....x....', '..xxxxx..', '.........'],
}
const TAROT_ICON: Record<string, [string, string]> = {
  fool: ['star', '#e8384f'], magician: ['eye', '#3b8ff3'], priestess: ['moon', '#6b4c9a'], empress: ['heart', '#e8384f'],
  emperor: ['crown', '#d99a00'], hierophant: ['cup', '#3b8ff3'], lovers: ['heart', '#f15bb5'], chariot: ['wheel', '#7d8597'],
  justice: ['scale', '#3a8fb7'], hermit: ['eye', '#d99a00'], wheel: ['wheel', '#35bd86'], strength: ['crown', '#e8384f'],
  hanged: ['skull', '#6b4c9a'], death: ['skull', '#2a2a3a'], temperance: ['cup', '#35bd86'], devil: ['skull', '#c0392b'],
  tower: ['tower', '#7d8597'], star: ['star', '#3b8ff3'], moon: ['moon', '#3a4466'], sun: ['sun', '#f2a900'],
  judgement: ['eye', '#e8384f'], world: ['wheel', '#3b8ff3'],
}

/** Planète pixelisée générée : ombrage, bandes, anneau éventuel (30 × 30 pixels). */
function planetPixels(i: number, base: string): { rows: string[]; pal: Palette } {
  const N = 30
  const R = 10.5
  const cx = 14.5
  const cy = 14.5
  const banded = i % 2 === 0
  const ring = i % 3 === 1
  const grid: string[][] = Array.from({ length: N }, () => Array(N).fill('.'))
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dx = (x - cx) / R
      const dy = (y - cy) / R
      const d2 = dx * dx + dy * dy
      if (d2 > 1) continue
      const nz = Math.sqrt(1 - d2)
      const light = -dx * 0.55 - dy * 0.6 + nz * 0.6
      let ch = light > 0.75 ? 'h' : light > 0.35 ? 'b' : light > 0.05 ? 's' : 'd'
      if (banded && Math.floor((y + 1) / 3) % 3 === 1 && ch !== 'h') ch = ch === 'b' ? 'B' : 'd'
      if ((x * 7 + y * 13 + i) % 23 === 0 && ch === 'b') ch = 's'
      if (d2 > 0.86) ch = ch === 'h' ? 'b' : 'o'
      grid[y][x] = ch
    }
  if (ring) {
    for (let x = 0; x < N; x++) {
      const t = (x - cx) / 14.4
      if (Math.abs(t) > 1) continue
      const base = cy + t * 2.5
      const k = Math.sqrt(1 - t * t) * 3.6
      const top = Math.round(base - k)
      const bot = Math.round(base + k)
      if (top >= 0 && top < N && grid[top][x] === '.') grid[top][x] = 'R'
      if (bot >= 0 && bot < N) grid[bot][x] = 'r'
      if (bot + 1 < N && (grid[bot + 1][x] === '.' || Math.abs(t) < 0.8)) grid[bot + 1][x] = 'R'
    }
  }
  return {
    rows: grid.map((r) => r.join('')),
    pal: { h: shade(base, 1.45), b: base, B: shade(base, 0.85), s: shade(base, 0.7), d: shade(base, 0.45), o: shade(base, 0.32), r: '#f1faee', R: '#a8b2c8' },
  }
}

const PLANET_COLORS = ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f', '#4cc9f0', '#9b5de5', '#f15bb5', '#90be6d', '#577590', '#ff006e', '#8338ec', '#fb5607']

export function ConsumableArt({ kind, defId }: { kind: ConsumableKind; defId: string }) {
  const d = getConsumable(defId)
  if (kind === 'planet') {
    const i = PLANET_LIST.findIndex((p) => p.id === defId)
    const c = PLANET_COLORS[i % PLANET_COLORS.length]
    const { rows, pal } = planetPixels(i, c)
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="art">
        <rect x="1" y="1" width={W - 2} height={H - 2} rx="5" fill="#13163a" stroke="#4cc9f0" strokeWidth="2" />
        <Px
          rows={['x......x...........x', '.....x.......X......', '..X.......x.......x.', 'x.........X.........', '.......x.......x....', '.x.............X....']}
          pal={{ x: '#ffffff', X: '#8fb8ff' }}
          x={6}
          y={7}
          s={3}
        />
        <Px rows={rows} pal={pal} x={W / 2 - 30 * 1.0} y={14} s={2} />
        <rect x="5" y="74" width={W - 10} height="15" rx="3" fill="#2b2f6b" />
        <text x={W / 2} y="85" className="tiny" fill="#ffffff" textAnchor="middle">
          {d.name}
        </text>
      </svg>
    )
  }
  if (kind === 'tarot') {
    const i = TAROT_LIST.findIndex((t) => t.id === defId)
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="art">
        <rect x="1" y="1" width={W - 2} height={H - 2} rx="5" fill="#f3e3c3" stroke="#6b4c9a" strokeWidth="2.5" />
        <rect x="6" y="6" width={W - 12} height={H - 12} rx="2" fill="none" stroke="#c9a227" strokeWidth="1" />
        <text x={W / 2} y="20" className="small" fill="#6b4c9a" textAnchor="middle">
          {ROMAN[i] ?? ''}
        </text>
        <g opacity="0.18">
          {Array.from({ length: 16 }, (_, k) => {
            const a1 = (k / 16) * Math.PI * 2
            const a2 = a1 + Math.PI / 32
            return <polygon key={k} points={`${W / 2},46 ${W / 2 + Math.cos(a1) * 30},${46 + Math.sin(a1) * 30} ${W / 2 + Math.cos(a2) * 30},${46 + Math.sin(a2) * 30}`} fill={TAROT_ICON[defId]?.[1] ?? '#6b4c9a'} />
          })}
        </g>
        <circle cx={W / 2} cy={46} r="16" fill="#fff8e7" stroke={TAROT_ICON[defId]?.[1] ?? '#6b4c9a'} strokeWidth="1.5" />
        <Px rows={T_ICONS[TAROT_ICON[defId]?.[0] ?? 'star']} pal={{ x: TAROT_ICON[defId]?.[1] ?? '#6b4c9a' }} x={W / 2 - 13.5} y={32.5} s={3} />
        <rect x="5" y="74" width={W - 10} height="15" rx="3" fill="#6b4c9a" />
        <text x={W / 2} y="85" className="tiny" fill="#fff6e0" textAnchor="middle">
          {d.name}
        </text>
      </svg>
    )
  }
  // spectrale
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="art">
      <rect x="1" y="1" width={W - 2} height={H - 2} rx="5" fill="url(#g-spectral)" stroke="#a8dadc" strokeWidth="2" />
      <Px
        rows={['..xxxxx..', '.xxxxxxx.', 'xxkxxxkxx', 'xxkxxxkxx', 'xxxxxxxxx', 'xxxxkxxxx', 'xxxxxxxxx', 'xx.xx.xxx', 'x...x..x.']}
        pal={{ x: '#e0fbfc', k: '#1d3557' }}
        x={W / 2 - 18}
        y={22}
        s={4}
      />
      <rect x="5" y="74" width={W - 10} height="15" rx="3" fill="#1d3557" />
      <text x={W / 2} y="85" className="tiny" fill="#e0fbfc" textAnchor="middle">
        {d.name}
      </text>
    </svg>
  )
}

const PACK_COLOR: Record<PackKind, [string, string]> = {
  arcana: ['#7b5ea7', '#c9a227'],
  celestial: ['#1d3e7a', '#4cc9f0'],
  spectral: ['#2b4c7e', '#a8dadc'],
  buffoon: ['#d1495b', '#f9c74f'],
  standard: ['#3c6e47', '#f6f1e6'],
}
const PACK_LABEL: Record<PackKind, string> = {
  arcana: 'ARCANE',
  celestial: 'CÉLESTE',
  spectral: 'SPECTRAL',
  buffoon: 'BOUFFON',
  standard: 'STANDARD',
}

export function PackArt({ kind, size }: { kind: PackKind; size: PackSize }) {
  const [a, b] = PACK_COLOR[kind]
  const teeth = (y: number, dir: 1 | -1) => {
    let d = ''
    for (let x = 1; x < W - 1; x += 7) d += `M${x} ${y} L${x + 3.5} ${y + dir * 5} L${Math.min(W - 1, x + 7)} ${y} Z `
    return d
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="art">
      <path d={teeth(8.5, -1) + teeth(H - 8.5, 1)} fill={a} />
      <rect x="1" y="8" width={W - 2} height={H - 16} fill={a} stroke={b} strokeWidth="1.5" />
      <rect x="1" y="8" width={W - 2} height="6" fill={b} opacity="0.5" />
      <rect x="1" y={H - 14} width={W - 2} height="6" fill={b} opacity="0.5" />
      <Px rows={['...x...', '..xxx..', 'xxxxxxx', '.xxxxx.', '..xxx..', '.xx.xx.', 'xx...xx']} pal={{ x: b }} x={W / 2 - 10.5} y={26} s={3} />
      <text x={W / 2} y="62" className="small" fill="#ffffff" textAnchor="middle">
        {PACK_LABEL[kind]}
      </text>
      {size !== 'normal' && (
        <text x={W / 2} y="74" className="tiny" fill={b} textAnchor="middle">
          {size === 'jumbo' ? 'JUMBO' : 'MÉGA'}
        </text>
      )}
    </svg>
  )
}

export function VoucherArt({ name }: { name: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="art">
      <path
        d={`M6 4 H${W - 6} a5 5 0 0 0 5 5 V${H / 2 - 6} a6 6 0 0 0 0 12 V${H - 9} a5 5 0 0 0 -5 5 H6 a5 5 0 0 0 -5 -5 V${H / 2 + 6} a6 6 0 0 0 0 -12 V9 a5 5 0 0 0 5 -5 Z`}
        fill="#f4a024"
        stroke="#7a3e00"
        strokeWidth="2"
      />
      <rect x="10" y="12" width={W - 20} height={H - 24} rx="3" fill="#ffd166" stroke="#7a3e00" strokeWidth="1" strokeDasharray="3 2" />
      <text x={W / 2} y="38" className="small" fill="#7a3e00" textAnchor="middle">
        BON
      </text>
      <Px rows={['.xxx.', 'x...x', 'x.x.x', 'x...x', '.xxx.']} pal={{ x: '#7a3e00' }} x={W / 2 - 7.5} y={44} s={3} />
      <text x={W / 2} y="72" className="tiny" fill="#7a3e00" textAnchor="middle">
        {name.length > 13 ? name.slice(0, 12) + '…' : name}
      </text>
    </svg>
  )
}

/** Dégradés et motifs partagés (à monter une seule fois dans la page). */
export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <linearGradient id="g-bonus" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e3f1ff" />
          <stop offset="1" stopColor="#a9d3ff" />
        </linearGradient>
        <linearGradient id="g-mult" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe6e3" />
          <stop offset="1" stopColor="#ffaba3" />
        </linearGradient>
        <linearGradient id="g-wild" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd6e0" />
          <stop offset="0.33" stopColor="#fff3c4" />
          <stop offset="0.66" stopColor="#d4f5dd" />
          <stop offset="1" stopColor="#d6e4ff" />
        </linearGradient>
        <linearGradient id="g-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2fcff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#b9e8f5" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="g-steel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3e7ec" />
          <stop offset="0.5" stopColor="#a6afba" />
          <stop offset="1" stopColor="#d5dbe2" />
        </linearGradient>
        <linearGradient id="g-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1b8" />
          <stop offset="0.5" stopColor="#f2c14e" />
          <stop offset="1" stopColor="#ffe08a" />
        </linearGradient>
        <linearGradient id="g-lucky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efffe6" />
          <stop offset="1" stopColor="#b7e4a7" />
        </linearGradient>
        <linearGradient id="g-spectral" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#457b9d" />
          <stop offset="1" stopColor="#1d3557" />
        </linearGradient>
        <clipPath id="clip-card">
          <rect x="2" y="2" width="67" height="91" rx="4" />
        </clipPath>
        <clipPath id="clip-panel">
          <rect x="11" y="6" width="49" height="83" rx="3" />
        </clipPath>
        <pattern id="p-dots" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect x="3" y="3" width="2" height="2" fill="#000" opacity="0.08" />
        </pattern>
        <pattern id="p-stripes" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="10" fill="#000" opacity="0.05" />
        </pattern>
        <pattern id="p-back" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#b83232" />
          <path d="M4 0 L8 4 L4 8 L0 4 Z" fill="#e05555" />
        </pattern>
      </defs>
    </svg>
  )
}
