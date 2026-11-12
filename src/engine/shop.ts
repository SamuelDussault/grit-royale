import type { Card, ConsumableKind, Edition, Enhancement, Player, Seal } from './types'
import { randomCard } from './cards'
import {
  addCardToDeck,
  addJoker,
  applyConsumable,
  consumablePrice,
  CURSE_LIST,
  getConsumable,
  giveConsumable,
  jokerRoom,
  newJoker,
  PLANET_LIST,
  randomJokerId,
  RARE_SPECTRALS,
  SPECTRAL_LIST,
  TAROT_LIST,
  useBlocker,
  type UseEnv,
} from './consumables'
import { getJoker, sellValue } from './jokers'
import type { Rng } from './rng'

// ================= BONS (vouchers) =================
export interface VoucherDef {
  id: string
  name: string
  desc: string
  apply: (p: Player) => void
}

export const VOUCHERS: VoucherDef[] = [
  { id: 'overstock', name: 'Surplus', desc: '+1 carte à vendre dans la boutique', apply: () => {} },
  { id: 'grabber', name: 'Grappin', desc: '+1 main par combat', apply: (p) => void p.handsPerRound++ },
  { id: 'wasteful', name: 'Gaspilleur', desc: '+1 défausse par combat', apply: (p) => void p.discardsPerRound++ },
  { id: 'paintBrush', name: 'Pinceau', desc: '+1 carte en main', apply: (p) => void p.handSize++ },
  { id: 'crystalBall', name: 'Boule de Cristal', desc: '+1 emplacement de consommable', apply: (p) => void p.consumableSlots++ },
  { id: 'clearance', name: 'Liquidation', desc: 'Tout est 25 % moins cher', apply: () => {} },
  { id: 'reroll', name: 'Relance Facile', desc: 'Les relances coûtent 1 $ de moins', apply: () => {} },
  { id: 'seedMoney', name: 'Capital de Départ', desc: 'Les intérêts peuvent monter jusqu’à 10 $ par round', apply: () => {} },
  { id: 'antimatter', name: 'Antimatière', desc: '+1 emplacement de joker', apply: (p) => void p.maxJokers++ },
  { id: 'tarotMerchant', name: 'Marchand de Tarots', desc: 'Les tarots apparaissent 2× plus souvent', apply: () => {} },
  { id: 'planetMerchant', name: 'Marchand de Planètes', desc: 'Les planètes apparaissent 2× plus souvent', apply: () => {} },
  {
    id: 'armor',
    name: 'Armure',
    desc: '+25 PV max et soigne 25 PV',
    apply: (p) => {
      p.maxHp += 25
      p.hp = Math.min(p.maxHp, p.hp + 25)
    },
  },
  { id: 'fortress', name: 'Forteresse', desc: 'Tu subis 2 dégâts de moins par défaite (min. 1)', apply: () => {} },
]

export function getVoucher(id: string): VoucherDef {
  return VOUCHERS.find((v) => v.id === id)!
}

// ================= PAQUETS =================
export type PackKind = 'arcana' | 'celestial' | 'spectral' | 'buffoon' | 'standard'
export type PackSize = 'normal' | 'jumbo' | 'mega'

export const PACK_NAME: Record<PackKind, string> = {
  arcana: 'Paquet Arcane',
  celestial: 'Paquet Céleste',
  spectral: 'Paquet Spectral',
  buffoon: 'Paquet Bouffon',
  standard: 'Paquet Standard',
}
export const PACK_DESC: Record<PackKind, string> = {
  arcana: 'Cartes Tarot, utilisées tout de suite sur des cartes de ton paquet',
  celestial: 'Planètes pour améliorer tes mains de poker',
  spectral: 'Cartes Spectrales : puissantes mais risquées',
  buffoon: 'Jokers',
  standard: 'Cartes à jouer (souvent améliorées) à ajouter à ton paquet',
}
const SIZE_NAME: Record<PackSize, string> = { normal: '', jumbo: 'Jumbo ', mega: 'Méga ' }

export function packSpec(kind: PackKind, size: PackSize) {
  const buff = kind === 'buffoon' || kind === 'spectral'
  const choices = size === 'normal' ? (buff ? 2 : 3) : buff ? 4 : 5
  const picks = size === 'mega' ? 2 : 1
  const price = (size === 'normal' ? 4 : size === 'jumbo' ? 6 : 8) + (kind === 'buffoon' || kind === 'spectral' ? 1 : 0)
  return { choices, picks, price, name: `${SIZE_NAME[size]}${PACK_NAME[kind]}` }
}

export type ItemKind = 'joker' | ConsumableKind | 'pack' | 'voucher'

export interface ShopItem {
  key: number
  kind: ItemKind
  id: string
  price: number
  edition?: Edition
  packKind?: PackKind
  packSize?: PackSize
  sold?: boolean
  /** Verrouillé : reste dans la boutique (relances et round suivant) jusqu'à l'achat. */
  locked?: boolean
}

export interface ShopState {
  cards: ShopItem[]
  packs: ShopItem[]
  voucher?: ShopItem
  rerollCost: number
  rerolls: number
}

export interface PackOption {
  kind: 'joker' | ConsumableKind | 'card'
  id?: string
  edition?: Edition
  card?: Card
  taken?: boolean
}

export interface PackSession {
  id: number
  name: string
  kind: PackKind
  size: PackSize
  options: PackOption[]
  picksLeft: number
  handCards: Card[]
}

let keyCounter = 1
const disc = (p: Player, price: number) => (p.vouchers.includes('clearance') ? Math.max(1, Math.floor(price * 0.75)) : price)

export function rollEdition(rng: Rng): Edition | undefined {
  const r = rng.next()
  if (r < 0.003) return 'negative'
  if (r < 0.015) return 'poly'
  if (r < 0.043) return 'holo'
  if (r < 0.083) return 'foil'
  return undefined
}

function rollShopCard(p: Player, rng: Rng): ShopItem {
  const tarotW = p.vouchers.includes('tarotMerchant') ? 30 : 15
  const planetW = p.vouchers.includes('planetMerchant') ? 30 : 15
  const kind = rng.weighted<ItemKind>([
    { item: 'joker', w: 68 },
    { item: 'tarot', w: tarotW },
    { item: 'planet', w: planetW },
    { item: 'spectral', w: 2 },
    { item: 'curse', w: 6 },
  ])
  if (kind === 'joker') {
    const id = randomJokerId(rng, undefined, p.jokers.map((j) => j.defId))
    const edition = rollEdition(rng)
    const j = newJoker(id, edition)
    return { key: keyCounter++, kind, id, edition, price: disc(p, j.basePrice) }
  }
  const pool = kind === 'tarot' ? TAROT_LIST : kind === 'planet' ? PLANET_LIST : kind === 'curse' ? CURSE_LIST : SPECTRAL_LIST
  return { key: keyCounter++, kind, id: rng.pick(pool).id, price: disc(p, consumablePrice(kind as ConsumableKind)) }
}

function rollPack(p: Player, rng: Rng): ShopItem {
  const packKind = rng.weighted<PackKind>([
    { item: 'arcana', w: 4 },
    { item: 'celestial', w: 4 },
    { item: 'standard', w: 4 },
    { item: 'buffoon', w: 1.5 },
    { item: 'spectral', w: 0.6 },
  ])
  const packSize = rng.weighted<PackSize>([
    { item: 'normal', w: 6 },
    { item: 'jumbo', w: 3 },
    { item: 'mega', w: 1 },
  ])
  return { key: keyCounter++, kind: 'pack', id: packKind, packKind, packSize, price: disc(p, packSpec(packKind, packSize).price) }
}

function rollVoucher(p: Player, rng: Rng): ShopItem | undefined {
  const pool = VOUCHERS.filter((v) => !p.vouchers.includes(v.id))
  if (!pool.length) return undefined
  return { key: keyCounter++, kind: 'voucher', id: rng.pick(pool).id, price: disc(p, 10) }
}

export function shopCardSlots(p: Player): number {
  return 3 + (p.vouchers.includes('overstock') ? 1 : 0)
}

export function baseRerollCost(p: Player): number {
  return p.vouchers.includes('reroll') ? 1 : 2
}

/** Garde l'article s'il est verrouillé et pas encore acheté, sinon en tire un nouveau. */
const keep = (old: ShopItem | undefined, roll: () => ShopItem | undefined) => (old && old.locked && !old.sold ? old : roll())

export function newShop(p: Player, rng: Rng, prev?: ShopState): ShopState {
  const cards = Array.from({ length: shopCardSlots(p) }, (_, i) => keep(prev?.cards[i], () => rollShopCard(p, rng))!)
  const packs = [0, 1].map((i) => keep(prev?.packs[i], () => rollPack(p, rng))!)
  const voucher = prev?.voucher?.locked && !prev.voucher.sold ? prev.voucher : rollVoucher(p, rng)
  return { cards, packs, voucher, rerollCost: baseRerollCost(p), rerolls: 0 }
}

/** Verrouille / déverrouille un article de la boutique. */
export function toggleLock(shop: ShopState, key: number): boolean | null {
  const item = [...shop.cards, ...shop.packs, ...(shop.voucher ? [shop.voucher] : [])].find((i) => i.key === key)
  if (!item || item.sold) return null
  item.locked = !item.locked
  return item.locked
}

export function reroll(p: Player, shop: ShopState, rng: Rng): string | null {
  if (p.gold < shop.rerollCost) return 'Pas assez d’or'
  p.gold -= shop.rerollCost
  shop.rerolls++
  shop.rerollCost++
  shop.cards = Array.from({ length: shopCardSlots(p) }, (_, i) => keep(shop.cards[i], () => rollShopCard(p, rng))!)
  return null
}

/** Achète un article. Renvoie un message d'erreur, ou une session de paquet à ouvrir. */
export function buy(
  p: Player,
  item: ShopItem,
  rng: Rng,
): { error?: string; pack?: PackSession; msg?: string } {
  if (item.sold) return { error: 'Déjà vendu' }
  if (p.gold < item.price) return { error: 'Pas assez d’or' }
  if (item.kind === 'joker') {
    const j = newJoker(item.id, item.edition)
    if (!jokerRoom(p, j)) return { error: `Plus de place pour un joker (max ${p.maxJokers})` }
    p.gold -= item.price
    addJoker(p, j)
    item.sold = true
    return { msg: `${getJoker(item.id).name} acheté` }
  }
  if (item.kind === 'tarot' || item.kind === 'planet' || item.kind === 'spectral') {
    if (!giveConsumable(p, item.kind, item.id)) return { error: 'Emplacements de consommables pleins' }
    p.gold -= item.price
    item.sold = true
    return { msg: `${getConsumable(item.id).name} acheté` }
  }
  if (item.kind === 'voucher') {
    p.gold -= item.price
    p.vouchers.push(item.id)
    getVoucher(item.id).apply(p)
    item.sold = true
    return { msg: `Bon ${getVoucher(item.id).name} activé` }
  }
  // paquet
  p.gold -= item.price
  item.sold = true
  return { pack: openPack(p, item.packKind!, item.packSize!, rng) }
}

function randomPlayingCard(rng: Rng): Card {
  const c = randomCard(rng)
  if (rng.chance(0.4)) c.enh = rng.pick<Enhancement>(['bonus', 'mult', 'wild', 'glass', 'steel', 'stone', 'gold', 'lucky'])
  const e = rng.next()
  if (e < 0.012) c.edition = 'poly'
  else if (e < 0.04) c.edition = 'holo'
  else if (e < 0.08) c.edition = 'foil'
  if (rng.chance(0.08)) c.seal = rng.pick<Seal>(['gold', 'red', 'blue', 'purple'])
  return c
}

export function openPack(p: Player, kind: PackKind, size: PackSize, rng: Rng): PackSession {
  const spec = packSpec(kind, size)
  const options: PackOption[] = []
  const seen = new Set<string>()
  for (let i = 0; i < spec.choices; i++) {
    let opt: PackOption
    let guard = 0
    do {
      if (kind === 'arcana') opt = { kind: 'tarot', id: rng.pick(TAROT_LIST).id }
      else if (kind === 'celestial') opt = { kind: 'planet', id: rng.pick(PLANET_LIST).id }
      else if (kind === 'spectral')
        opt = { kind: 'spectral', id: rng.chance(0.04) ? rng.pick(RARE_SPECTRALS).id : rng.pick(SPECTRAL_LIST).id }
      else if (kind === 'buffoon') opt = { kind: 'joker', id: randomJokerId(rng, undefined, p.jokers.map((j) => j.defId)), edition: rollEdition(rng) }
      else opt = { kind: 'card', card: randomPlayingCard(rng) }
      guard++
    } while (opt.id && seen.has(opt.id) && guard < 20)
    if (opt.id) seen.add(opt.id)
    options.push(opt)
  }
  // Les tarots / spectrales d'un paquet s'utilisent sur une « main » tirée de ton paquet
  const handCards = kind === 'arcana' || kind === 'spectral' ? rng.shuffle([...p.deck]).slice(0, p.handSize) : []
  return { id: keyCounter++, name: spec.name, kind, size, options, picksLeft: spec.picks, handCards }
}

/** Choisit une option du paquet. selected = cartes ciblées (pour les tarots). */
export function pickPackOption(p: Player, s: PackSession, index: number, selected: Card[], rng: Rng): { error?: string; msg?: string } {
  const opt = s.options[index]
  if (!opt || opt.taken) return { error: 'Option indisponible' }
  if (s.picksLeft <= 0) return { error: 'Plus de choix' }
  let msg = ''
  if (opt.kind === 'joker') {
    const j = newJoker(opt.id!, opt.edition)
    if (!addJoker(p, j)) return { error: `Plus de place pour un joker (max ${p.maxJokers})` }
    msg = `${getJoker(opt.id!).name} obtenu`
  } else if (opt.kind === 'card') {
    addCardToDeck(p, opt.card!)
    msg = 'Carte ajoutée au paquet'
  } else {
    const env: UseEnv = { rng, handCards: s.handCards, inCombat: false }
    const block = useBlocker(p, opt.id!, selected, env)
    if (block) return { error: block }
    msg = applyConsumable(p, opt.id!, selected, env)
  }
  opt.taken = true
  s.picksLeft--
  return { msg }
}

export function sellJoker(p: Player, uid: number): number {
  const j = p.jokers.find((x) => x.uid === uid)
  if (!j) return 0
  const v = sellValue(j)
  p.jokers = p.jokers.filter((x) => x !== j)
  p.gold += v
  p.stats.cardsSold++
  for (const o of p.jokers) getJoker(o.defId).onSellAny?.(p, o)
  return v
}

export function sellConsumable(p: Player, uid: number): number {
  const c = p.consumables.find((x) => x.uid === uid)
  if (!c) return 0
  const v = Math.max(1, Math.floor(consumablePrice(c.kind) / 2))
  p.consumables = p.consumables.filter((x) => x !== c)
  p.gold += v
  p.stats.cardsSold++
  for (const o of p.jokers) getJoker(o.defId).onSellAny?.(p, o)
  return v
}
