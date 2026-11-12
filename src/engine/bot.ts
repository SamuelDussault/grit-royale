// IA des bots : choix des mains, défausses, achats en boutique.
import type { Card, CombatState, HandType, Player } from './types'
import { scoreHand } from './scoring'
import { discardCards, playHand, startCombat } from './combat'
import { HANDS } from './hands'
import { NoLuckRng, type Rng } from './rng'
import { applyConsumable, getConsumable, jokerRoom, newJoker, PLANET_FOR, useBlocker, type UseEnv } from './consumables'
import { buy, pickPackOption, reroll, sellJoker, type PackSession, type ShopItem, type ShopState } from './shop'
import { getJoker, sellValue } from './jokers'
import { cardChips } from './cards'

const noLuck = new NoLuckRng()

function subsets<T>(arr: T[], maxSize: number): T[][] {
  const out: T[][] = []
  const n = arr.length
  for (let mask = 1; mask < 1 << n; mask++) {
    let bits = 0
    for (let m = mask; m; m &= m - 1) bits++
    if (bits > maxSize) continue
    const s: T[] = []
    for (let i = 0; i < n; i++) if (mask & (1 << i)) s.push(arr[i])
    out.push(s)
  }
  return out
}

export interface PlayOption {
  cards: Card[]
  score: number
  type: HandType
}

/** Classe toutes les mains possibles (score estimé, sans chance). */
export function rankPlays(p: Player, cs: CombatState): PlayOption[] {
  const opts: PlayOption[] = []
  for (const s of subsets(cs.hand, 5)) {
    const held = cs.hand.filter((c) => !s.includes(c))
    const r = scoreHand({ player: p, combat: cs, played: s, held, rng: noLuck, preview: true })
    // à score égal, on préfère jouer plus de cartes (cycle le paquet)
    opts.push({ cards: s, score: r.total + s.length * 0.01, type: r.type })
  }
  return opts.sort((a, b) => b.score - a.score)
}

function chooseDiscard(p: Player, cs: CombatState, best: PlayOption): Card[] {
  const keep = new Set<Card>(best.type === 'high' ? [] : best.cards)
  // garder un tirage couleur (3+ de la même couleur)
  const bySuit = new Map<string, Card[]>()
  for (const c of cs.hand) {
    if (c.enh === 'stone' || c.enh === 'cursed') continue
    const a = bySuit.get(c.suit) ?? []
    a.push(c)
    bySuit.set(c.suit, a)
  }
  const bigSuit = [...bySuit.values()].sort((a, b) => b.length - a.length)[0]
  const fav = p.bot?.favorite
  if (bigSuit && bigSuit.length >= 3 && (fav === 'flush' || bigSuit.length >= 4)) for (const c of bigSuit) keep.add(c)
  // garder les paires
  const byRank = new Map<number, Card[]>()
  for (const c of cs.hand) if (c.enh !== 'cursed' && c.enh !== 'stone') byRank.set(c.rank, [...(byRank.get(c.rank) ?? []), c])
  for (const g of byRank.values()) if (g.length >= 2) for (const c of g) keep.add(c)
  // ne jamais jeter les cartes améliorées « en main » utiles
  for (const c of cs.hand) if (c.enh === 'steel' || c.enh === 'gold') keep.add(c)
  const toss = cs.hand.filter((c) => !keep.has(c)).sort((a, b) => cardChips(a) - cardChips(b))
  return toss.slice(0, 5)
}

/** Joue un combat complet pour un bot. */
export function botCombat(p: Player, rng: Rng, oppHp?: number, existing?: CombatState): CombatState {
  const cs = existing ?? startCombat(p, rng, oppHp)
  const skill = p.bot?.skill ?? 0.8
  let guard = 0
  while (!cs.finished && guard++ < 30) {
    const plays = rankPlays(p, cs)
    if (!plays.length) break
    const best = plays[0]
    if (cs.discardsLeft > 0 && HANDS[best.type].order <= 3 && rng.chance(0.4 + skill * 0.6)) {
      const toss = chooseDiscard(p, cs, best)
      if (toss.length >= 2) {
        discardCards(p, cs, toss.map((c) => c.id), rng)
        continue
      }
    }
    // un bot moins doué choisit parfois une main moins bonne
    let pick = best
    if (!rng.chance(skill) && plays.length > 3) pick = plays[rng.int(1, Math.min(4, plays.length - 1))]
    playHand(p, cs, pick.cards.map((c) => c.id), rng)
  }
  return cs
}

// ---------------- Boutique ----------------
function favoriteHand(p: Player): HandType {
  let best: HandType = p.bot?.favorite ?? 'pair'
  let n = -1
  for (const [t, c] of Object.entries(p.handPlays) as [HandType, number][]) {
    if (c > n) {
      n = c
      best = t
    }
  }
  return best
}

function jokerValue(defId: string, edition?: string): number {
  const d = getJoker(defId)
  return d.rarity * 4 + d.cost + (edition === 'poly' ? 6 : edition === 'holo' ? 3 : edition === 'foil' ? 2 : edition === 'negative' ? 8 : 0)
}

function botUseConsumables(p: Player, rng: Rng, others: Player[] = []) {
  for (const c of [...p.consumables]) {
    const d = getConsumable(c.defId)
    if (['hex', 'ankh'].includes(d.id) && p.jokers.length > 2) continue
    if (d.id === 'wraith' && p.gold > 15) continue
    const handCards = rng.shuffle([...p.deck]).slice(0, p.handSize)
    // malédiction : vise l'adversaire en vie qui a le plus de PV
    const target = d.targetPlayer ? rng.shuffle([...others].filter((o) => o.id !== p.id && o.alive)).sort((a, b) => b.hp - a.hp)[0] : undefined
    const env: UseEnv = { rng, handCards, inCombat: false, target }
    let selected: Card[] = []
    if (d.select) {
      const [, max] = d.select
      const sorted = [...handCards].sort((a, b) => cardChips(a) - cardChips(b))
      selected = d.id === 'hanged' ? sorted.slice(0, max) : rng.shuffle([...handCards]).slice(0, max)
    }
    p.consumables = p.consumables.filter((x) => x !== c)
    if (useBlocker(p, d.id, selected, env)) {
      p.consumables.push(c)
      continue
    }
    applyConsumable(p, d.id, selected, env)
  }
}

function botPack(p: Player, s: PackSession, rng: Rng) {
  const fav = favoriteHand(p)
  while (s.picksLeft > 0) {
    const order = s.options
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => !o.taken)
      .sort((a, b) => score(b.o) - score(a.o))
    if (!order.length) break
    let done = false
    for (const { o, i } of order) {
      let selected: Card[] = []
      if (o.id && (o.kind === 'tarot' || o.kind === 'spectral')) {
        const d = getConsumable(o.id)
        if (d.select) selected = rng.shuffle([...s.handCards]).slice(0, d.select[1])
      }
      const r = pickPackOption(p, s, i, selected, rng)
      if (!r.error) {
        done = true
        break
      }
    }
    if (!done) break
  }
  function score(o: PackSession['options'][number]): number {
    if (o.kind === 'joker') return jokerRoom(p) ? jokerValue(o.id!, o.edition) : -1
    if (o.kind === 'planet') return o.id === PLANET_FOR[fav] ? 20 : 5
    if (o.kind === 'card') return o.card!.enh || o.card!.seal || o.card!.edition ? 6 : 2
    return 4
  }
}

export function botShop(p: Player, shop: ShopState, rng: Rng, round: number, others: Player[] = []) {
  const greed = p.bot?.greed ?? 0.5
  const reserve = round <= 3 ? 0 : Math.min(50, Math.floor(greed * 5) * 10)
  const fav = favoriteHand(p)
  const canSpend = (price: number) => p.gold - price >= reserve

  botUseConsumables(p, rng, others)
  // Gluttonie : les bots en bonne santé la nourrissent
  for (const j of p.jokers)
    if (j.defId === 'gluttony' && j.state.r !== round && p.hp > 45) {
      p.hp -= 5
      j.state.r = round
      j.state.g = (j.state.g ?? 0) + 5
    }

  for (let pass = 0; pass < 4; pass++) {
    // jokers
    for (const item of shop.cards.filter((i) => !i.sold && i.kind === 'joker')) {
      if (!canSpend(item.price) && p.gold - item.price < 0) continue
      if (!canSpend(item.price) && p.jokers.length >= 3) continue
      if (!jokerRoom(p, newJoker(item.id, item.edition))) {
        // remplacer le plus faible si le nouveau vaut mieux
        const weakest = [...p.jokers].sort((a, b) => jokerValue(a.defId, a.edition) - jokerValue(b.defId, b.edition))[0]
        if (weakest && jokerValue(item.id, item.edition) > jokerValue(weakest.defId, weakest.edition) + 3 && p.gold + sellValue(weakest) >= item.price) {
          sellJoker(p, weakest.uid)
        } else continue
      }
      buy(p, item, rng)
    }
    // planètes de la main favorite, autres consommables
    for (const item of shop.cards.filter((i) => !i.sold && i.kind !== 'joker')) {
      if (!canSpend(item.price)) continue
      const useful = item.kind !== 'planet' || item.id === PLANET_FOR[fav] || rng.chance(0.25)
      if (!useful) continue
      if (!buy(p, item, rng).error) botUseConsumables(p, rng, others)
    }
    // bon
    if (shop.voucher && !shop.voucher.sold && canSpend(shop.voucher.price) && rng.chance(0.6)) buy(p, shop.voucher, rng)
    // paquets
    for (const item of shop.packs.filter((i) => !i.sold)) {
      if (!canSpend(item.price) || rng.chance(0.4)) continue
      if (item.packKind === 'buffoon' && !jokerRoom(p)) continue
      const r = buy(p, item, rng)
      if (r.pack) botPack(p, r.pack, rng)
    }
    // relance
    const wantMore = p.jokers.length < Math.min(p.maxJokers, 4 + round)
    if (wantMore && canSpend(shop.rerollCost + 5) && rng.chance(0.7)) reroll(p, shop, rng)
    else break
  }
  botUseConsumables(p, rng, others)
}

export function pickShopItem(shop: ShopState, key: number): ShopItem | undefined {
  return [...shop.cards, ...shop.packs, ...(shop.voucher ? [shop.voucher] : [])].find((i) => i.key === key)
}
