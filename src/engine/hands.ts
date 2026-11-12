import type { Card, HandType, Suit } from './types'
import { isSuit, SUITS } from './cards'

export interface HandInfo {
  name: string
  chips: number
  mult: number
  lvlChips: number
  lvlMult: number
  order: number // force de la main (pour l'affichage / l'IA)
  secret?: boolean // n'apparaît dans la liste qu'une fois jouée
}

export const HANDS: Record<HandType, HandInfo> = {
  flushFive: { name: 'Couleur Quinte', chips: 160, mult: 16, lvlChips: 50, lvlMult: 3, order: 12, secret: true },
  flushHouse: { name: 'Full Couleur', chips: 140, mult: 14, lvlChips: 40, lvlMult: 4, order: 11, secret: true },
  five: { name: 'Quinte (5 pareilles)', chips: 120, mult: 12, lvlChips: 35, lvlMult: 3, order: 10, secret: true },
  straightFlush: { name: 'Quinte Flush', chips: 100, mult: 8, lvlChips: 40, lvlMult: 4, order: 9 },
  four: { name: 'Carré', chips: 60, mult: 7, lvlChips: 30, lvlMult: 3, order: 8 },
  fullHouse: { name: 'Full', chips: 40, mult: 4, lvlChips: 25, lvlMult: 2, order: 7 },
  flush: { name: 'Couleur', chips: 35, mult: 4, lvlChips: 15, lvlMult: 2, order: 6 },
  straight: { name: 'Suite', chips: 30, mult: 4, lvlChips: 30, lvlMult: 3, order: 5 },
  three: { name: 'Brelan', chips: 30, mult: 3, lvlChips: 20, lvlMult: 2, order: 4 },
  twoPair: { name: 'Double Paire', chips: 20, mult: 2, lvlChips: 20, lvlMult: 1, order: 3 },
  pair: { name: 'Paire', chips: 10, mult: 2, lvlChips: 15, lvlMult: 1, order: 2 },
  high: { name: 'Carte Haute', chips: 5, mult: 1, lvlChips: 10, lvlMult: 1, order: 1 },
}

export const HAND_TYPES = Object.keys(HANDS) as HandType[] // du plus fort au plus faible

export function handBase(type: HandType, level: number): { chips: number; mult: number } {
  const h = HANDS[type]
  return { chips: h.chips + h.lvlChips * (level - 1), mult: h.mult + h.lvlMult * (level - 1) }
}

export interface EvalRules {
  fourFingers?: boolean // Couleurs et Suites avec 4 cartes
  shortcut?: boolean // Suites avec trous d'un rang
  smeared?: boolean // ♥/♦ et ♠/♣ comptent comme la même couleur
  splash?: boolean // toutes les cartes jouées comptent
}

export interface Evaluation {
  type: HandType
  scoring: Card[]
  contains: Set<HandType>
}

function findFlush(cards: Card[], need: number, smeared: boolean): Card[] | null {
  let best: Card[] | null = null
  for (const s of SUITS as Suit[]) {
    const inSuit = cards.filter((c) => isSuit(c, s, smeared))
    if (inSuit.length >= need && (!best || inSuit.length > best.length)) best = inSuit
  }
  return best
}

function findStraight(cards: Card[], need: number, shortcut: boolean): Card[] | null {
  const ranked = cards.filter((c) => c.enh !== 'stone' && c.enh !== 'cursed')
  const present = new Set<number>()
  for (const c of ranked) {
    present.add(c.rank)
    if (c.rank === 14) present.add(1)
  }
  // on cherche la plus longue chaîne (trous de 1 permis avec Raccourci)
  let bestChain: number[] = []
  for (let start = 1; start <= 14; start++) {
    if (!present.has(start)) continue
    const chain = [start]
    let cur = start
    for (;;) {
      if (present.has(cur + 1)) cur = cur + 1
      else if (shortcut && present.has(cur + 2)) cur = cur + 2
      else break
      chain.push(cur)
    }
    if (chain.length > bestChain.length) bestChain = chain
  }
  if (bestChain.length < need) return null
  const ranks = new Set(bestChain.map((r) => (r === 1 ? 14 : r)))
  return ranked.filter((c) => ranks.has(c.rank))
}

export function evaluateHand(cards: Card[], rules: EvalRules = {}): Evaluation {
  const need = rules.fourFingers ? 4 : 5
  const ranked = cards.filter((c) => c.enh !== 'stone' && c.enh !== 'cursed')
  const stones = cards.filter((c) => c.enh === 'stone')

  const byRank = new Map<number, Card[]>()
  for (const c of ranked) {
    const arr = byRank.get(c.rank) ?? []
    arr.push(c)
    byRank.set(c.rank, arr)
  }
  const groups = [...byRank.values()].sort((a, b) => b.length - a.length || b[0].rank - a[0].rank)
  const top = groups[0]?.length ?? 0
  const second = groups[1]?.length ?? 0

  const flush = cards.length >= need ? findFlush(cards, need, !!rules.smeared) : null
  const straight = cards.length >= need ? findStraight(cards, need, !!rules.shortcut) : null

  const contains = new Set<HandType>(['high'])
  if (top >= 2) contains.add('pair')
  if (top >= 3) contains.add('three')
  if (top >= 4) contains.add('four')
  if (top >= 5) contains.add('five')
  if ((top >= 2 && second >= 2) || top >= 4) contains.add('twoPair')
  if (top >= 3 && second >= 2) contains.add('fullHouse')
  if (flush) contains.add('flush')
  if (straight) contains.add('straight')
  if (flush && straight) contains.add('straightFlush')

  let type: HandType
  let scoring: Card[]
  const union = (a: Card[], b: Card[]) => cards.filter((c) => a.includes(c) || b.includes(c))

  if (top >= 5 && flush) {
    type = 'flushFive'
    scoring = cards
  } else if (top >= 3 && second >= 2 && flush) {
    type = 'flushHouse'
    scoring = cards
  } else if (top >= 5) {
    type = 'five'
    scoring = groups[0]
  } else if (flush && straight) {
    type = 'straightFlush'
    scoring = union(flush, straight)
  } else if (top >= 4) {
    type = 'four'
    scoring = groups[0]
  } else if (top >= 3 && second >= 2) {
    type = 'fullHouse'
    scoring = [...groups[0], ...groups[1]]
  } else if (flush) {
    type = 'flush'
    scoring = flush
  } else if (straight) {
    type = 'straight'
    scoring = straight
  } else if (top >= 3) {
    type = 'three'
    scoring = groups[0]
  } else if (top >= 2 && second >= 2) {
    type = 'twoPair'
    scoring = [...groups[0], ...groups[1]]
  } else if (top >= 2) {
    type = 'pair'
    scoring = groups[0]
  } else {
    type = 'high'
    const highest = [...ranked].sort((a, b) => b.rank - a.rank)[0]
    scoring = highest ? [highest] : []
  }
  contains.add(type)

  if (rules.splash) scoring = cards.filter((c) => c.enh !== 'cursed')
  else {
    for (const s of stones) if (!scoring.includes(s)) scoring.push(s)
    // garder l'ordre de la main jouée (gauche à droite)
    scoring = cards.filter((c) => scoring.includes(c))
  }
  return { type, scoring, contains }
}
