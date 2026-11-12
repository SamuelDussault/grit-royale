import type { Card, CombatState, Player, ScoreResult } from './types'
import { scoreHand } from './scoring'
import { getJoker } from './jokers'
import { destroyCards, giveConsumable, TAROT_LIST } from './consumables'
import type { Rng } from './rng'

export function startCombat(p: Player, rng: Rng, oppHp?: number): CombatState {
  const cs: CombatState = {
    drawPile: rng.shuffle([...p.deck]),
    hand: [],
    handsLeft: p.handsPerRound,
    discardsLeft: p.discardsPerRound,
    score: 0,
    handScores: [],
    playedTypes: [],
    finished: false,
    oppHp,
  }
  draw(p, cs)
  return cs
}

export function draw(p: Player, cs: CombatState) {
  while (cs.hand.length < p.handSize && cs.drawPile.length) cs.hand.push(cs.drawPile.pop()!)
}

export function playHand(p: Player, cs: CombatState, selectedIds: number[], rng: Rng): ScoreResult {
  if (cs.finished || cs.handsLeft <= 0) throw new Error('Plus de mains')
  // l'ordre des ids = l'ordre affiché à l'écran (gauche → droite)
  const played = selectedIds.map((id) => cs.hand.find((c) => c.id === id)).filter((c): c is Card => !!c)
  if (played.length < 1 || played.length > 5) throw new Error('Choisis 1 à 5 cartes')
  const held = cs.hand.filter((c) => !selectedIds.includes(c.id))
  const res = scoreHand({ player: p, combat: cs, played, held, rng, preview: false })

  cs.score += res.total
  cs.handScores.push(res.total)
  ;(cs.history ??= []).push({ cards: played.map((c) => ({ ...c })), type: res.type, total: res.total })
  cs.playedTypes.push(res.type)
  p.handPlays[res.type]++
  p.gold += res.money
  cs.handsLeft--

  // Joker Électrique : une Suite coûte aussi une défausse
  if (res.containsStraight) {
    const n = p.jokers.filter((j) => j.defId === 'electric').length
    cs.discardsLeft = Math.max(0, cs.discardsLeft - n)
  }
  cs.hand = held
  if (res.destroyed.length) destroyCards(p, res.destroyed)
  if (cs.handsLeft <= 0) cs.finished = true
  else {
    if (!noDraw(p)) draw(p, cs)
    if (cs.hand.length === 0) cs.finished = true
  }
  return res
}

export function discardCards(p: Player, cs: CombatState, selectedIds: number[], rng: Rng): { money: number; msgs: string[] } {
  if (cs.discardsLeft <= 0) throw new Error('Plus de défausses')
  const cards = cs.hand.filter((c) => selectedIds.includes(c.id))
  if (cards.length < 1 || cards.length > 5) throw new Error('Choisis 1 à 5 cartes')
  const msgs: string[] = []
  let money = 0
  for (const c of cards) {
    if (c.seal === 'purple') {
      if (giveConsumable(p, 'tarot', rng.pick(TAROT_LIST).id)) msgs.push('Sceau violet : un tarot est créé')
    }
  }
  for (const j of p.jokers) money += getJoker(j.defId).onDiscard?.(p, j, cards, cs) ?? 0
  p.gold += money
  if (money) msgs.push(`+${money} $`)
  cs.hand = cs.hand.filter((c) => !selectedIds.includes(c.id))
  cs.discardsLeft--
  if (!noDraw(p)) draw(p, cs)
  else if (cs.hand.length === 0) cs.finished = true
  return { money, msgs }
}

/** Mégalithe : plus de pioche pendant le combat. */
function noDraw(p: Player): boolean {
  return p.jokers.some((j) => j.defId === 'megalith')
}

/** Cartes encore en main à la fin du combat (pour Or / Sceau bleu). */
export function heldAtEnd(cs: CombatState): Card[] {
  return cs.hand
}
