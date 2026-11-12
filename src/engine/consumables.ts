import type { Card, ConsumableKind, Edition, Enhancement, HandType, JokerInst, Player, Seal, Suit } from './types'
import { cloneCard, randomCard, SUIT_PLURAL, SUITS } from './cards'
import { HAND_TYPES, HANDS } from './hands'
import { getJoker, JOKER_LIST, jokersGone, sellValue } from './jokers'
import { nextUid, Rng } from './rng'

export interface UseEnv {
  rng: Rng
  /** Cartes visibles pouvant être ciblées / détruites (main en combat, ou main tirée dans un paquet). */
  handCards: Card[]
  inCombat: boolean
  /** Joueur visé (malédictions). */
  target?: Player
}

export interface ConsumableDef {
  id: string
  kind: ConsumableKind
  name: string
  desc: string
  /** Nombre de cartes à sélectionner (min, max). Absent = aucune cible. */
  select?: [number, number]
  /** Besoin d'avoir des cartes en main (ex. détruire une carte au hasard). */
  needsHand?: boolean
  /** Se lance sur un autre joueur (malédictions). */
  targetPlayer?: boolean
  canUse?: (p: Player, env: UseEnv) => boolean
  use: (p: Player, selected: Card[], env: UseEnv) => string
}

// ---------- utilitaires partagés ----------
export function freeConsumableSlots(p: Player): number {
  return p.consumableSlots - p.consumables.length
}

export function giveConsumable(p: Player, kind: ConsumableKind, defId: string): boolean {
  if (freeConsumableSlots(p) <= 0) return false
  p.consumables.push({ uid: nextUid(), kind, defId })
  return true
}

export function newJoker(defId: string, edition?: Edition): JokerInst {
  const def = getJoker(defId)
  const extra = edition === 'foil' ? 2 : edition === 'holo' ? 3 : edition ? 5 : 0
  return { uid: nextUid(), defId, edition, state: {}, sellBonus: 0, basePrice: def.cost + extra }
}

export function jokerRoom(p: Player, j?: JokerInst): boolean {
  if (j?.edition === 'negative') return true
  return p.jokers.filter((x) => x.edition !== 'negative').length < p.maxJokers
}

/** Dernier message d'un joker à l'arrivée (Pacte avec le Diable, Pandore). */
export let lastAcquireMsg: string | undefined

export function addJoker(p: Player, j: JokerInst, rng?: Rng): boolean {
  if (!jokerRoom(p, j)) return false
  p.jokers.push(j)
  const r = getJoker(j.defId).onAcquire?.(p, j, rng ?? new Rng(Date.now() % 1e9))
  lastAcquireMsg = r || undefined
  return true
}

export function randomJokerId(rng: Rng, rarity?: 1 | 2 | 3 | 4, exclude: string[] = []): string {
  const r = rarity ?? rng.weighted([
    { item: 1 as const, w: 70 },
    { item: 2 as const, w: 25 },
    { item: 3 as const, w: 5 },
  ])
  const pool = JOKER_LIST.filter((d) => d.rarity === r && !d.hidden && !exclude.includes(d.id))
  return rng.pick(pool.length ? pool : JOKER_LIST.filter((d) => d.rarity === r && !d.hidden)).id
}

/** Ajoute une carte au paquet (et en main si on est en combat). Fait évoluer l'Hologramme. */
export function addCardToDeck(p: Player, c: Card, env?: UseEnv) {
  p.deck.push(c)
  if (env?.inCombat) env.handCards.push(c)
  p.stats.cardsAdded++
  for (const j of p.jokers) if (j.defId === 'hologram') j.state.x = (j.state.x ?? 1) + 0.25
}

/** Détruit des cartes (paquet + main). Fait évoluer Canio / Joker de Verre au besoin. */
export const ENH_LIST: Enhancement[] = ['bonus', 'mult', 'wild', 'glass', 'steel', 'stone', 'gold', 'lucky', 'cursed']

export function destroyCards(p: Player, cards: Card[], env?: UseEnv) {
  const ids = new Set(cards.map((c) => c.id))
  p.deck = p.deck.filter((c) => !ids.has(c.id))
  if (env) {
    for (let i = env.handCards.length - 1; i >= 0; i--) if (ids.has(env.handCards[i].id)) env.handCards.splice(i, 1)
  }
  const faces = cards.filter((c) => c.enh !== 'stone' && c.rank >= 11 && c.rank <= 13).length
  const glass = cards.filter((c) => c.enh === 'glass').length
  for (const j of p.jokers) {
    if (j.defId === 'canio' && faces) j.state.x = (j.state.x ?? 1) + faces
    if (j.defId === 'glassJoker' && glass) j.state.x = (j.state.x ?? 1) + 0.75 * glass
    if (j.defId === 'catalyst' && cards.length) j.state.x = (j.state.x ?? 1) + 0.1 * cards.length
    // Le Fossoyeur garde la première carte détruite
    if (j.defId === 'gravedigger' && !j.state.rank && cards.length) {
      const c = cards[0]
      j.state.rank = c.rank
      j.state.suit = SUITS.indexOf(c.suit)
      j.state.enh = c.enh ? ENH_LIST.indexOf(c.enh) + 1 : 0
    }
  }
  p.stats.glassBroken += glass
}

export function levelUp(p: Player, t: HandType, n = 1) {
  p.handLevels[t] += n
}

const enhanceTarot = (id: string, name: string, enh: Enhancement, n: number, label: string): ConsumableDef => ({
  id,
  kind: 'tarot',
  name,
  desc: `Transforme jusqu’à ${n} carte${n > 1 ? 's' : ''} sélectionnée${n > 1 ? 's' : ''} en carte${n > 1 ? 's' : ''} ${label}`,
  select: [1, n],
  use: (_p, sel) => {
    for (const c of sel) c.enh = enh
    return `${sel.length} carte(s) → ${label}`
  },
})

const suitTarot = (id: string, name: string, suit: Suit): ConsumableDef => ({
  id,
  kind: 'tarot',
  name,
  desc: `Transforme jusqu’à 3 cartes sélectionnées en ${SUIT_PLURAL[suit]}`,
  select: [1, 3],
  use: (_p, sel) => {
    for (const c of sel) c.suit = suit
    return `${sel.length} carte(s) → ${SUIT_PLURAL[suit]}`
  },
})

const sealSpectral = (id: string, name: string, seal: Seal, label: string): ConsumableDef => ({
  id,
  kind: 'spectral',
  name,
  desc: `Ajoute un ${label} à 1 carte sélectionnée`,
  select: [1, 1],
  use: (_p, sel) => {
    sel[0].seal = seal
    return `${label} ajouté`
  },
})

const randomEnh = (rng: Rng): Enhancement => rng.pick(['bonus', 'mult', 'wild', 'glass', 'steel', 'stone', 'gold', 'lucky'] as const)

function destroyRandomInHand(p: Player, env: UseEnv, n: number): Card[] {
  const pool = [...env.handCards]
  env.rng.shuffle(pool)
  const victims = pool.slice(0, n)
  destroyCards(p, victims, env)
  return victims
}

// ================= TAROTS =================
const TAROTS: ConsumableDef[] = [
  {
    id: 'fool',
    kind: 'tarot',
    name: 'Le Mat',
    desc: 'Crée une copie du dernier tarot ou de la dernière planète utilisé (sauf Le Mat)',
    canUse: (p) => !!p.lastConsumable && p.lastConsumable.defId !== 'fool' && freeConsumableSlots(p) > 0,
    use: (p) => {
      const last = p.lastConsumable!
      giveConsumable(p, last.kind, last.defId)
      return `Copie : ${getConsumable(last.defId).name}`
    },
  },
  enhanceTarot('magician', 'Le Magicien', 'lucky', 2, 'Chance'),
  {
    id: 'priestess',
    kind: 'tarot',
    name: 'La Papesse',
    desc: 'Crée jusqu’à 2 cartes Planète au hasard (selon la place libre)',
    use: (p, _s, env) => {
      let n = 0
      for (let i = 0; i < 2; i++) if (giveConsumable(p, 'planet', env.rng.pick(PLANETS).id)) n++
      return `${n} planète(s) créée(s)`
    },
  },
  enhanceTarot('empress', 'L’Impératrice', 'mult', 2, 'Grit'),
  {
    id: 'emperor',
    kind: 'tarot',
    name: 'L’Empereur',
    desc: 'Crée jusqu’à 2 cartes Tarot au hasard (selon la place libre)',
    use: (p, _s, env) => {
      let n = 0
      for (let i = 0; i < 2; i++) if (giveConsumable(p, 'tarot', env.rng.pick(TAROTS.filter((t) => t.id !== 'emperor')).id)) n++
      return `${n} tarot(s) créé(s)`
    },
  },
  enhanceTarot('hierophant', 'Le Pape', 'bonus', 2, 'Bonus'),
  enhanceTarot('lovers', 'L’Amoureux', 'wild', 1, 'Joker (toutes couleurs)'),
  enhanceTarot('chariot', 'Le Chariot', 'steel', 1, 'Acier'),
  enhanceTarot('justice', 'La Justice', 'glass', 1, 'Verre'),
  {
    id: 'hermit',
    kind: 'tarot',
    name: 'L’Ermite',
    desc: 'Double ton argent (max +20 $)',
    use: (p) => {
      const g = Math.min(20, Math.max(0, p.gold))
      p.gold += g
      return `+${g} $`
    },
  },
  {
    id: 'wheel',
    kind: 'tarot',
    name: 'La Roue de Fortune',
    desc: '1 chance sur 4 d’ajouter Métallique, Holographique ou Polychrome à un joker au hasard',
    canUse: (p) => p.jokers.some((j) => !j.edition),
    use: (p, _s, env) => {
      if (!env.rng.chance(1 / 4)) return 'Raté !'
      const j = env.rng.pick(p.jokers.filter((x) => !x.edition))
      j.edition = env.rng.weighted([
        { item: 'foil' as const, w: 50 },
        { item: 'holo' as const, w: 35 },
        { item: 'poly' as const, w: 15 },
      ])
      return `${getJoker(j.defId).name} devient ${j.edition}`
    },
  },
  {
    id: 'strength',
    kind: 'tarot',
    name: 'La Force',
    desc: 'Augmente de 1 la valeur de jusqu’à 2 cartes sélectionnées (As → 2)',
    select: [1, 2],
    use: (_p, sel) => {
      for (const c of sel) c.rank = c.rank === 14 ? 2 : c.rank + 1
      return `${sel.length} carte(s) augmentée(s)`
    },
  },
  {
    id: 'hanged',
    kind: 'tarot',
    name: 'Le Pendu',
    desc: 'Détruit jusqu’à 2 cartes sélectionnées',
    select: [1, 2],
    use: (p, sel, env) => {
      destroyCards(p, sel, env)
      return `${sel.length} carte(s) détruite(s)`
    },
  },
  {
    id: 'death',
    kind: 'tarot',
    name: 'La Mort',
    desc: 'Sélectionne 2 cartes : la carte de gauche devient une copie de celle de droite',
    select: [2, 2],
    use: (_p, sel) => {
      const [left, right] = sel
      const id = left.id
      Object.assign(left, { ...right, id })
      if (!right.enh) delete left.enh
      if (!right.seal) delete left.seal
      if (!right.edition) delete left.edition
      return 'Copie effectuée'
    },
  },
  {
    id: 'temperance',
    kind: 'tarot',
    name: 'La Tempérance',
    desc: 'Donne la valeur de revente totale de tes jokers (max 50 $)',
    use: (p) => {
      const v = Math.min(50, p.jokers.reduce((a, j) => a + sellValue(j), 0))
      p.gold += v
      return `+${v} $`
    },
  },
  enhanceTarot('devil', 'Le Diable', 'gold', 1, 'Or'),
  enhanceTarot('tower', 'La Maison-Dieu', 'stone', 1, 'Pierre'),
  suitTarot('star', 'L’Étoile', 'D'),
  suitTarot('moon', 'La Lune', 'C'),
  suitTarot('sun', 'Le Soleil', 'H'),
  suitTarot('world', 'Le Monde', 'S'),
  {
    id: 'judgement',
    kind: 'tarot',
    name: 'Le Jugement',
    desc: 'Crée un joker au hasard (s’il y a de la place)',
    canUse: (p) => jokerRoom(p),
    use: (p, _s, env) => {
      const j = newJoker(randomJokerId(env.rng, undefined, p.jokers.map((x) => x.defId)))
      addJoker(p, j, env.rng)
      return `Nouveau joker : ${getJoker(j.defId).name}${lastAcquireMsg ? ` · ${lastAcquireMsg}` : ''}`
    },
  },
]

// ================= PLANÈTES =================
const planet = (id: string, name: string, t: HandType): ConsumableDef => ({
  id,
  kind: 'planet',
  name,
  desc: `Améliore ${HANDS[t].name} d’un niveau (+${HANDS[t].lvlChips} jetons, +${HANDS[t].lvlMult} Grit)`,
  use: (p) => {
    levelUp(p, t)
    p.stats.planetsUsed++
    for (const j of p.jokers) if (j.defId === 'constellation') j.state.x = (j.state.x ?? 1) + 0.1
    return `${HANDS[t].name} → niveau ${p.handLevels[t]}`
  },
})

export const PLANET_FOR: Record<HandType, string> = {
  high: 'pluto',
  pair: 'mercury',
  twoPair: 'uranus',
  three: 'venus',
  straight: 'saturn',
  flush: 'jupiter',
  fullHouse: 'earth',
  four: 'mars',
  straightFlush: 'neptune',
  five: 'planetX',
  flushHouse: 'ceres',
  flushFive: 'eris',
}

const PLANETS: ConsumableDef[] = [
  planet('pluto', 'Pluton', 'high'),
  planet('mercury', 'Mercure', 'pair'),
  planet('uranus', 'Uranus', 'twoPair'),
  planet('venus', 'Vénus', 'three'),
  planet('saturn', 'Saturne', 'straight'),
  planet('jupiter', 'Jupiter', 'flush'),
  planet('earth', 'Terre', 'fullHouse'),
  planet('mars', 'Mars', 'four'),
  planet('neptune', 'Neptune', 'straightFlush'),
  planet('planetX', 'Planète X', 'five'),
  planet('ceres', 'Cérès', 'flushHouse'),
  planet('eris', 'Éris', 'flushFive'),
]

// ================= SPECTRALES =================
const SPECTRALS: ConsumableDef[] = [
  {
    id: 'familiar',
    kind: 'spectral',
    name: 'Familier',
    desc: 'Détruit 1 carte au hasard de ta main, ajoute 3 figures améliorées au paquet',
    needsHand: true,
    use: (p, _s, env) => {
      destroyRandomInHand(p, env, 1)
      for (let i = 0; i < 3; i++) addCardToDeck(p, { ...randomCard(env.rng, { faces: true }), enh: randomEnh(env.rng) }, env)
      return '3 figures ajoutées'
    },
  },
  {
    id: 'grim',
    kind: 'spectral',
    name: 'Sinistre',
    desc: 'Détruit 1 carte au hasard de ta main, ajoute 2 As améliorés au paquet',
    needsHand: true,
    use: (p, _s, env) => {
      destroyRandomInHand(p, env, 1)
      for (let i = 0; i < 2; i++) addCardToDeck(p, { ...randomCard(env.rng, { aces: true }), enh: randomEnh(env.rng) }, env)
      return '2 As ajoutés'
    },
  },
  {
    id: 'incantation',
    kind: 'spectral',
    name: 'Incantation',
    desc: 'Détruit 1 carte au hasard de ta main, ajoute 4 cartes numérotées améliorées au paquet',
    needsHand: true,
    use: (p, _s, env) => {
      destroyRandomInHand(p, env, 1)
      for (let i = 0; i < 4; i++) addCardToDeck(p, { ...randomCard(env.rng, { numbers: true }), enh: randomEnh(env.rng) }, env)
      return '4 cartes ajoutées'
    },
  },
  sealSpectral('talisman', 'Talisman', 'gold', 'Sceau doré'),
  sealSpectral('dejavu', 'Déjà-vu', 'red', 'Sceau rouge'),
  sealSpectral('trance', 'Transe', 'blue', 'Sceau bleu'),
  sealSpectral('medium', 'Médium', 'purple', 'Sceau violet'),
  {
    id: 'aura',
    kind: 'spectral',
    name: 'Aura',
    desc: 'Ajoute Métallique, Holographique ou Polychrome à 1 carte sélectionnée',
    select: [1, 1],
    use: (_p, sel, env) => {
      sel[0].edition = env.rng.pick(['foil', 'holo', 'poly'] as const)
      return `Édition ajoutée`
    },
  },
  {
    id: 'wraith',
    kind: 'spectral',
    name: 'Spectre',
    desc: 'Crée un joker Rare au hasard, mais ton argent tombe à 0 $',
    canUse: (p) => jokerRoom(p),
    use: (p, _s, env) => {
      const j = newJoker(randomJokerId(env.rng, 3, p.jokers.map((x) => x.defId)))
      addJoker(p, j, env.rng)
      p.gold = 0
      return `Nouveau joker rare : ${getJoker(j.defId).name}${lastAcquireMsg ? ` · ${lastAcquireMsg}` : ''}`
    },
  },
  {
    id: 'sigil',
    kind: 'spectral',
    name: 'Sceau Magique',
    desc: 'Toutes les cartes de ta main prennent la même couleur au hasard',
    needsHand: true,
    use: (_p, _s, env) => {
      const s = env.rng.pick(SUITS)
      for (const c of env.handCards) c.suit = s
      return `Tout en ${SUIT_PLURAL[s]}`
    },
  },
  {
    id: 'ouija',
    kind: 'spectral',
    name: 'Ouija',
    desc: 'Toutes les cartes de ta main prennent la même valeur au hasard. −1 taille de main',
    needsHand: true,
    use: (p, _s, env) => {
      const r = env.rng.int(2, 14)
      for (const c of env.handCards) c.rank = r
      p.handSize = Math.max(5, p.handSize - 1)
      return 'Même valeur partout'
    },
  },
  {
    id: 'ectoplasm',
    kind: 'spectral',
    name: 'Ectoplasme',
    desc: 'Rend Négatif un joker au hasard (il ne prend plus de place). −1 taille de main',
    canUse: (p) => p.jokers.some((j) => j.edition !== 'negative'),
    use: (p, _s, env) => {
      const j = env.rng.pick(p.jokers.filter((x) => x.edition !== 'negative'))
      j.edition = 'negative'
      p.handSize = Math.max(5, p.handSize - 1)
      return `${getJoker(j.defId).name} devient Négatif`
    },
  },
  {
    id: 'immolate',
    kind: 'spectral',
    name: 'Immolation',
    desc: 'Détruit 5 cartes au hasard de ta main, gagne 20 $',
    needsHand: true,
    use: (p, _s, env) => {
      destroyRandomInHand(p, env, 5)
      p.gold += 20
      return '+20 $'
    },
  },
  {
    id: 'ankh',
    kind: 'spectral',
    name: 'Ânkh',
    desc: 'Copie un joker au hasard et détruit tous les autres',
    canUse: (p) => p.jokers.length > 0,
    use: (p, _s, env) => {
      const keep = env.rng.pick(p.jokers)
      const copy: JokerInst = { ...keep, uid: nextUid(), state: { ...keep.state }, edition: keep.edition === 'negative' ? undefined : keep.edition }
      const gone = p.jokers.length - 1
      p.jokers = [keep, copy]
      jokersGone(p, gone)
      return `${getJoker(keep.defId).name} ×2`
    },
  },
  {
    id: 'hex',
    kind: 'spectral',
    name: 'Maléfice',
    desc: 'Rend Polychrome un joker au hasard et détruit tous les autres',
    canUse: (p) => p.jokers.length > 0,
    use: (p, _s, env) => {
      const keep = env.rng.pick(p.jokers)
      keep.edition = 'poly'
      const gone = p.jokers.length - 1
      p.jokers = [keep]
      jokersGone(p, gone)
      return `${getJoker(keep.defId).name} devient Polychrome`
    },
  },
  {
    id: 'cryptid',
    kind: 'spectral',
    name: 'Cryptide',
    desc: 'Crée 2 copies d’1 carte sélectionnée',
    select: [1, 1],
    use: (p, sel, env) => {
      for (let i = 0; i < 2; i++) addCardToDeck(p, cloneCard(sel[0]), env)
      return '2 copies créées'
    },
  },
  {
    id: 'blackHole',
    kind: 'spectral',
    name: 'Trou Noir',
    desc: 'Améliore toutes les mains de poker d’un niveau',
    use: (p) => {
      for (const t of HAND_TYPES) levelUp(p, t)
      return 'Toutes les mains +1 niveau'
    },
  },
  {
    id: 'soul',
    kind: 'spectral',
    name: 'L’Âme',
    desc: 'Crée un joker Légendaire',
    canUse: (p) => jokerRoom(p),
    use: (p, _s, env) => {
      const j = newJoker(randomJokerId(env.rng, 4, p.jokers.map((x) => x.defId)))
      addJoker(p, j, env.rng)
      return `Joker légendaire : ${getJoker(j.defId).name} !${lastAcquireMsg ? ` ${lastAcquireMsg}` : ''}`
    },
  },
]

// ================= MALÉDICTIONS (à lancer sur un adversaire) =================
const CURSES: ConsumableDef[] = [
  {
    id: 'curseCards',
    kind: 'curse',
    name: 'Cartes Maudites',
    desc: 'Ajoute 3 cartes Maudites (sans valeur, ne comptent jamais) dans le paquet d’un adversaire',
    targetPlayer: true,
    use: (_p, _s, env) => {
      const t = env.target!
      for (let i = 0; i < 3; i++) t.deck.push({ id: nextUid(), rank: 2, suit: 'S', enh: 'cursed' })
      return `3 cartes Maudites dans le paquet de ${t.name}`
    },
  },
  {
    id: 'curseFog',
    kind: 'curse',
    name: 'Brouillard',
    desc: 'Un adversaire aura 1 main de moins à son prochain combat',
    targetPlayer: true,
    use: (_p, _s, env) => {
      const t = env.target!
      t.nextHandsMalus = (t.nextHandsMalus ?? 0) + 1
      return `${t.name} aura 1 main de moins au prochain combat`
    },
  },
  {
    id: 'curseTax',
    kind: 'curse',
    name: 'Taxe',
    desc: 'Un adversaire perd 4 $ et tu en gagnes 2',
    targetPlayer: true,
    use: (p, _s, env) => {
      const t = env.target!
      t.gold = Math.max(0, t.gold - 4)
      p.gold += 2
      return `${t.name} perd 4 $, tu gagnes 2 $`
    },
  },
]

export const CURSE_LIST = CURSES
export const TAROT_LIST = TAROTS
export const PLANET_LIST = PLANETS
export const SPECTRAL_LIST = SPECTRALS.filter((s) => s.id !== 'soul' && s.id !== 'blackHole')
export const RARE_SPECTRALS = SPECTRALS.filter((s) => s.id === 'soul' || s.id === 'blackHole')

const ALL: Record<string, ConsumableDef> = Object.fromEntries([...TAROTS, ...PLANETS, ...SPECTRALS, ...CURSES].map((d) => [d.id, d]))

export function getConsumable(id: string): ConsumableDef {
  const d = ALL[id]
  if (!d) throw new Error(`Consommable inconnu : ${id}`)
  return d
}

export function consumablePrice(kind: ConsumableKind): number {
  return kind === 'spectral' || kind === 'curse' ? 4 : 3
}

/** Peut-on utiliser ce consommable avec cette sélection ? Renvoie un message d'erreur ou null. */
export function useBlocker(p: Player, defId: string, selected: Card[], env: UseEnv): string | null {
  const d = getConsumable(defId)
  if (d.select) {
    const [min, max] = d.select
    if (selected.length < min || selected.length > max)
      return min === max ? `Sélectionne ${min} carte(s)` : `Sélectionne entre ${min} et ${max} cartes`
    if (d.id === 'death' && selected.length === 2) {
      // ordre gauche → droite selon la main
      return null
    }
  }
  if (d.targetPlayer && (!env.target || env.target.id === p.id || !env.target.alive)) return 'Choisis un adversaire en vie'
  if ((d.select || d.needsHand) && env.handCards.length === 0) return 'Il faut des cartes en main (en combat ou dans un paquet)'
  if (d.canUse && !d.canUse(p, env)) return 'Impossible pour l’instant'
  return null
}

/** Utilise un consommable (doit déjà être retiré des emplacements si c'en est un). */
export function applyConsumable(p: Player, defId: string, selected: Card[], env: UseEnv): string {
  const d = getConsumable(defId)
  // trier la sélection selon l'ordre de la main (pour La Mort)
  const order = new Map(env.handCards.map((c, i) => [c.id, i]))
  const sel = [...selected].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  const msg = d.use(p, sel, env)
  if (d.kind === 'tarot') p.stats.tarotsUsed++
  if (d.kind !== 'spectral' && d.id !== 'fool') p.lastConsumable = { kind: d.kind, defId: d.id }
  return msg
}
