import type { Card, Edition, Enhancement, Seal, Suit } from './types'
import { nextUid, type Rng } from './rng'

export const SUITS: Suit[] = ['S', 'H', 'D', 'C']
export const SUIT_SYMBOL: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' }
export const SUIT_NAME: Record<Suit, string> = { S: 'Pique', H: 'Cœur', D: 'Carreau', C: 'Trèfle' }
export const SUIT_PLURAL: Record<Suit, string> = { S: 'Piques', H: 'Cœurs', D: 'Carreaux', C: 'Trèfles' }

export function rankLabel(rank: number): string {
  if (rank <= 10) return String(rank)
  return { 11: 'V', 12: 'D', 13: 'R', 14: 'A' }[rank] as string
}

export function rankName(rank: number): string {
  if (rank <= 10) return String(rank)
  return { 11: 'Valet', 12: 'Dame', 13: 'Roi', 14: 'As' }[rank] as string
}

export const ENH_NAME: Record<Enhancement, string> = {
  bonus: 'Bonus',
  mult: 'Grit',
  wild: 'Joker (toutes couleurs)',
  glass: 'Verre',
  steel: 'Acier',
  stone: 'Pierre',
  gold: 'Or',
  lucky: 'Chance',
  cursed: 'Maudite',
}

export const ENH_DESC: Record<Enhancement, string> = {
  bonus: '+30 jetons',
  mult: '+4 Grit',
  wild: 'Compte comme toutes les couleurs',
  glass: '×2 Grit, 1 chance sur 4 de se briser',
  steel: '×1.5 Grit tant que gardée en main',
  stone: '+50 jetons, sans valeur ni couleur, compte toujours',
  gold: '+3 $ si gardée en main à la fin du round',
  lucky: '1/5 : +20 Grit, 1/15 : +20 $',
  cursed: 'Sans valeur ni couleur : ne compte jamais (Malédiction)',
}

export const EDITION_NAME: Record<Edition, string> = {
  foil: 'Métallique',
  holo: 'Holographique',
  poly: 'Polychrome',
  negative: 'Négatif',
}

export const EDITION_DESC: Record<Edition, string> = {
  foil: '+50 jetons',
  holo: '+10 Grit',
  poly: '×1.5 Grit',
  negative: '+1 emplacement de joker',
}

export const SEAL_NAME: Record<Seal, string> = {
  gold: 'Sceau doré',
  red: 'Sceau rouge',
  blue: 'Sceau bleu',
  purple: 'Sceau violet',
}

export const SEAL_DESC: Record<Seal, string> = {
  gold: '+3 $ quand la carte compte',
  red: 'Redéclenche la carte une fois',
  blue: 'Crée une planète si gardée en main à la fin du round',
  purple: 'Crée un tarot quand défaussée',
}

export function makeCard(rank: number, suit: Suit): Card {
  return { id: nextUid(), rank, suit }
}

export function standardDeck(): Card[] {
  const deck: Card[] = []
  for (const s of SUITS) for (let r = 2; r <= 14; r++) deck.push(makeCard(r, s))
  return deck
}

export function randomCard(rng: Rng, opts?: { faces?: boolean; aces?: boolean; numbers?: boolean }): Card {
  let rank: number
  if (opts?.faces) rank = rng.int(11, 13)
  else if (opts?.aces) rank = 14
  else if (opts?.numbers) rank = rng.int(2, 10)
  else rank = rng.int(2, 14)
  return makeCard(rank, rng.pick(SUITS))
}

/** Jetons de base d'une carte jouée. */
export function cardChips(c: Card): number {
  if (c.enh === 'cursed') return 0
  if (c.enh === 'stone') return 50 + (c.extraChips ?? 0)
  const base = c.rank === 14 ? 11 : c.rank >= 11 ? 10 : c.rank
  return base + (c.enh === 'bonus' ? 30 : 0) + (c.extraChips ?? 0)
}

export function isFace(c: Card, pareidolia = false): boolean {
  if (c.enh === 'stone' || c.enh === 'cursed') return false
  return pareidolia || (c.rank >= 11 && c.rank <= 13)
}

/** La carte est-elle de cette couleur ? (Cartes joker = toutes, pierre = aucune, Barbouillé = paires de couleurs) */
export function isSuit(c: Card, suit: Suit, smeared = false): boolean {
  if (c.enh === 'stone' || c.enh === 'cursed') return false
  if (c.enh === 'wild') return true
  if (c.suit === suit) return true
  if (smeared) {
    const red = (s: Suit) => s === 'H' || s === 'D'
    return red(c.suit) === red(suit)
  }
  return false
}

export function cardLabel(c: Card): string {
  if (c.enh === 'stone') return 'Pierre'
  if (c.enh === 'cursed') return 'Maudite'
  return `${rankLabel(c.rank)}${SUIT_SYMBOL[c.suit]}`
}

export function cloneCard(c: Card): Card {
  return { ...c, id: nextUid() }
}
