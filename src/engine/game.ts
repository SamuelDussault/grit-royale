// Le lobby façon TFT : appariements, combats, dégâts, économie, éliminations.
// Gère plusieurs joueurs humains : chaque humain agit via des « actions » (voir actions.ts),
// et un round ne se termine que quand tous les humains encore en vie ont fini.
import type { CombatState, HandType, Player } from './types'
import { standardDeck } from './cards'
import { HAND_TYPES } from './hands'
import { Rng } from './rng'
import { botCombat, botShop } from './bot'
import { startCombat } from './combat'
import { giveConsumable, PLANET_FOR } from './consumables'
import { getJoker } from './jokers'
import { newShop, type PackSession, type ShopState } from './shop'

export const CONFIG = {
  startHp: 100,
  startGold: 6,
  baseIncome: 5,
  interestPer: 5,
  interestCap: 5,
  players: 8,
  /** Durées des phases en ligne (ms) */
  shopTime: 60_000,
  combatTime: 100_000,
}

const BOT_NAMES = ['Ruby', 'Gaston', 'Mireille', 'Bertrand', 'Zoé', 'Lucien', 'Fernande', 'Ti-Jean', 'Albert', 'Simone', 'Rosaire', 'Huguette']

export interface Match {
  a: number
  b: number
  ghostB?: boolean // b est un « fantôme » (copie) : il ne subit pas de dégâts
  scoreA?: number
  scoreB?: number
  winner?: number | null // null = égalité
  damage?: number
}

export interface GoldLine {
  label: string
  amount: number
}

export interface RoundReport {
  round: number
  matches: Match[]
  gold: Record<number, GoldLine[]> // détail des gains, par joueur
  messages: Record<number, string[]>
  eliminated: number[]
}

/** lobby = salle d'attente avant la partie */
export type Phase = 'lobby' | 'shop' | 'combat' | 'over'

export interface GameState {
  rng: Rng
  seed: number
  round: number
  phase: Phase
  players: Player[]
  matches: Match[]
  combats: Record<number, CombatState>
  opponents: Record<number, { id: number; ghost: boolean }>
  shops: Record<number, ShopState>
  packs: Record<number, PackSession | undefined>
  /** Ce joueur a fini sa phase (boutique : prêt ; combat : terminé). */
  ready: Record<number, boolean>
  lastReport?: RoundReport
  hostId: number
  /** Minuterie (parties en ligne) : heure limite de la phase, selon l'horloge de l'hôte. */
  timers?: boolean
  deadline?: number
}

function emptyHands(v: number): Record<HandType, number> {
  return Object.fromEntries(HAND_TYPES.map((t) => [t, v])) as Record<HandType, number>
}

export function botProfile(rng: Rng) {
  return {
    skill: 0.55 + rng.next() * 0.45,
    greed: rng.next(),
    favorite: rng.pick<HandType>(['pair', 'twoPair', 'three', 'flush', 'straight', 'fullHouse']),
  }
}

function newPlayer(id: number, name: string, isBot: boolean, rng: Rng): Player {
  return {
    id,
    name,
    isBot,
    hp: CONFIG.startHp,
    maxHp: CONFIG.startHp,
    gold: CONFIG.startGold,
    deck: standardDeck(),
    jokers: [],
    consumables: [],
    handLevels: emptyHands(1),
    handPlays: emptyHands(0),
    maxJokers: 10,
    consumableSlots: 2,
    handsPerRound: 4,
    discardsPerRound: 3,
    handSize: 8,
    winStreak: 0,
    loseStreak: 0,
    alive: true,
    placement: 0,
    vouchers: [],
    stats: { planetsUsed: 0, tarotsUsed: 0, cardsAdded: 0, glassBroken: 0, luckyTriggers: 0, cardsSold: 0, roundsWon: 0 },
    bot: isBot ? botProfile(rng) : undefined,
  }
}

/** Crée une partie en salle d'attente : l'hôte + des bots. */
export function newLobby(hostName: string, seed = Date.now() % 1e9): GameState {
  const rng = new Rng(seed)
  const names = rng.shuffle([...BOT_NAMES])
  const players = [newPlayer(0, hostName || 'Hôte', false, rng)]
  for (let i = 1; i < CONFIG.players; i++) players.push(newPlayer(i, names[(i - 1) % names.length], true, rng))
  return { rng, seed, round: 0, phase: 'lobby', players, matches: [], combats: {}, opponents: {}, shops: {}, packs: {}, ready: {}, hostId: 0 }
}

/** Partie solo : crée et démarre directement. */
export function newGame(playerName: string, seed?: number): GameState {
  const gs = newLobby(playerName, seed)
  launchGame(gs)
  return gs
}

export function launchGame(gs: GameState) {
  if (gs.phase !== 'lobby') return
  openShops(gs)
}

export function alivePlayers(gs: GameState): Player[] {
  return gs.players.filter((p) => p.alive)
}
export function aliveHumans(gs: GameState): Player[] {
  return gs.players.filter((p) => p.alive && !p.isBot)
}
/** Humains encore en vie qui n'ont pas fini la phase en cours. */
export function waitingFor(gs: GameState): Player[] {
  return aliveHumans(gs).filter((p) => !gs.ready[p.id])
}

function openShops(gs: GameState) {
  gs.shops = {}
  gs.packs = {}
  gs.ready = {}
  gs.phase = 'shop'
  gs.deadline = gs.timers ? Date.now() + CONFIG.shopTime : undefined
  for (const p of alivePlayers(gs)) gs.shops[p.id] = newShop(p, gs.rng)
  for (const p of alivePlayers(gs)) if (p.isBot) botShop(p, gs.shops[p.id], gs.rng, gs.round + 1)
  maybeAdvance(gs)
}

/** Dégâts infligés au perdant. */
export function computeDamage(round: number, winnerScore: number, loserScore: number, winner: Player, loser: Player): number {
  // les dégâts grimpent vite au fil des rounds (round 1 : ~2, round 5 : ~7, round 10 : ~16, round 15 : ~28)
  const base = 1 + round + Math.floor((round * round) / 16)
  const ratio = winnerScore > 0 ? Math.max(0, Math.min(1, loserScore / winnerScore)) : 1
  const margin = Math.round((6 + round * 0.4) * (1 - ratio))
  let dmg = base + margin
  for (const j of winner.jokers) dmg += getJoker(j.defId).damageBonus ?? 0
  for (const j of loser.jokers) dmg *= getJoker(j.defId).damageTakenMult ?? 1
  if (loser.vouchers.includes('fortress')) dmg -= 2
  return Math.max(1, Math.ceil(dmg))
}

function pairUp(gs: GameState): Match[] {
  const alive = gs.rng.shuffle(alivePlayers(gs).map((p) => p.id))
  const matches: Match[] = []
  for (let i = 0; i + 1 < alive.length; i += 2) matches.push({ a: alive[i], b: alive[i + 1] })
  if (alive.length % 2 === 1) {
    const odd = alive[alive.length - 1]
    const others = alive.filter((x) => x !== odd)
    matches.push({ a: odd, b: gs.rng.pick(others), ghostB: true })
  }
  return matches
}

/** Lance un round : appariements, combats des bots, combats des humains. */
export function startRound(gs: GameState) {
  gs.round++
  gs.packs = {}
  gs.ready = {}
  gs.matches = pairUp(gs)
  gs.combats = {}
  gs.opponents = {}
  gs.phase = 'combat'
  gs.deadline = gs.timers ? Date.now() + CONFIG.combatTime : undefined
  for (const m of gs.matches) {
    gs.opponents[m.a] = { id: m.b, ghost: !!m.ghostB }
    if (!m.ghostB) gs.opponents[m.b] = { id: m.a, ghost: false }
  }
  for (const p of alivePlayers(gs)) {
    const opp = gs.players[gs.opponents[p.id].id]
    if (p.isBot) {
      gs.combats[p.id] = botCombat(p, gs.rng, opp.hp)
      gs.ready[p.id] = true
    } else {
      gs.combats[p.id] = startCombat(p, gs.rng, opp.hp)
    }
  }
  maybeAdvance(gs)
}

/** Passe à l'étape suivante quand tous les humains en vie ont fini. */
export function maybeAdvance(gs: GameState) {
  if (gs.phase === 'shop' && waitingFor(gs).length === 0) {
    if (aliveHumans(gs).length === 0 && alivePlayers(gs).length > 1) {
      // plus d'humains en vie : on termine la partie rapidement entre bots
      simulateToEnd(gs)
      return
    }
    startRound(gs)
  } else if (gs.phase === 'combat' && waitingFor(gs).length === 0) {
    resolveRound(gs)
    if (isGameOver(gs)) gs.phase = 'over'
    else openShops(gs)
  }
}

function simulateToEnd(gs: GameState) {
  let guard = 0
  while (alivePlayers(gs).length > 1 && guard++ < 200) {
    startRoundBotsOnly(gs)
  }
  gs.phase = 'over'
}

function startRoundBotsOnly(gs: GameState) {
  gs.round++
  gs.matches = pairUp(gs)
  gs.combats = {}
  for (const m of gs.matches) gs.opponents[m.a] = { id: m.b, ghost: !!m.ghostB }
  for (const p of alivePlayers(gs)) gs.combats[p.id] = botCombat(p, gs.rng)
  resolveRound(gs)
  for (const p of alivePlayers(gs)) {
    const shop = newShop(p, gs.rng)
    botShop(p, shop, gs.rng, gs.round + 1)
  }
}

function streakBonus(n: number): number {
  if (n >= 5) return 3
  if (n >= 4) return 2
  if (n >= 2) return 1
  return 0
}

function resolveRound(gs: GameState) {
  const messages: Record<number, string[]> = {}
  const goldAll: Record<number, GoldLine[]> = {}
  const msg = (id: number, t: string) => (messages[id] ??= []).push(t)
  const results = new Map<number, boolean>() // id → a gagné ?

  for (const m of gs.matches) {
    const A = gs.players[m.a]
    const B = gs.players[m.b]
    m.scoreA = gs.combats[m.a]?.score ?? 0
    m.scoreB = gs.combats[m.b]?.score ?? 0
    if (m.scoreA === m.scoreB) {
      m.winner = null
      m.damage = 0
      results.set(m.a, false)
      if (!m.ghostB) results.set(m.b, false)
      continue
    }
    const aWins = m.scoreA > m.scoreB
    m.winner = aWins ? m.a : m.b
    const loser = aWins ? B : A
    const winner = aWins ? A : B
    m.damage = computeDamage(gs.round, Math.max(m.scoreA, m.scoreB), Math.min(m.scoreA, m.scoreB), winner, loser)
    if (m.ghostB) {
      if (!aWins) A.hp -= m.damage
    } else loser.hp -= m.damage
    results.set(m.a, aWins)
    if (!m.ghostB) results.set(m.b, !aWins)
  }

  for (const p of alivePlayers(gs)) {
    const won = results.get(p.id) ?? false
    if (won) {
      p.winStreak++
      p.loseStreak = 0
      p.stats.roundsWon++
    } else {
      p.loseStreak++
      p.winStreak = 0
    }
    const lines: GoldLine[] = []
    const add = (label: string, amount: number) => {
      if (amount) lines.push({ label, amount })
    }
    add('Revenu de base', CONFIG.baseIncome)
    const cap = p.vouchers.includes('seedMoney') ? 10 : CONFIG.interestCap
    const g = Math.max(0, p.gold)
    add('Intérêts', Math.min(cap, Math.floor(g / CONFIG.interestPer)))
    const moons = p.jokers.filter((j) => j.defId === 'toTheMoon').length
    add('Vers la Lune', moons * Math.floor(g / 5))
    if (won) add('Victoire', 1)
    add(won ? 'Série de victoires' : 'Série de défaites', streakBonus(won ? p.winStreak : p.loseStreak))

    const cs = gs.combats[p.id]
    if (cs) {
      const golds = cs.hand.filter((c) => c.enh === 'gold').length
      add('Cartes en Or gardées', golds * 3)
      const delayed = p.jokers.filter((j) => j.defId === 'delayed').length
      add('Gratification Différée', delayed * 2 * cs.discardsLeft)
      const blues = cs.hand.filter((c) => c.seal === 'blue').length
      const lastType = cs.playedTypes[cs.playedTypes.length - 1]
      for (let i = 0; i < blues && lastType; i++) {
        if (giveConsumable(p, 'planet', PLANET_FOR[lastType])) msg(p.id, 'Sceau bleu : une planète est créée')
      }
    }
    for (const j of [...p.jokers]) {
      const r = getJoker(j.defId).onRoundEnd?.(p, j, { won, rng: gs.rng })
      if (!r) continue
      if (r.money) add(getJoker(j.defId).name, r.money)
      if (r.destroy) {
        p.jokers = p.jokers.filter((x) => x !== j)
        if (r.msg) msg(p.id, r.msg)
      }
    }
    for (const l of lines) p.gold += l.amount
    goldAll[p.id] = lines
  }

  // éliminations
  const dead = alivePlayers(gs).filter((p) => p.hp <= 0)
  const eliminated: number[] = []
  if (dead.length) {
    const aliveAfter = alivePlayers(gs).length - dead.length
    dead.sort((a, b) => b.hp - a.hp)
    dead.forEach((p, i) => {
      p.alive = false
      p.placement = Math.max(1, aliveAfter + 1 + i)
      eliminated.push(p.id)
    })
    for (const p of gs.players) for (const d of dead) msg(p.id, `${d.name} est éliminé·e (${d.placement}e place)`)
    for (const p of alivePlayers(gs))
      for (const j of p.jokers) {
        const money = (getJoker(j.defId).onElimination?.(p, j) ?? 0) * dead.length
        p.gold += money
        if (money) (goldAll[p.id] ??= []).push({ label: getJoker(j.defId).name, amount: money })
      }
  }
  const left = alivePlayers(gs)
  if (left.length === 1) left[0].placement = 1
  if (left.length === 0) {
    const best = [...dead].sort((a, b) => b.hp - a.hp)[0]
    best.placement = 1
  }

  gs.lastReport = { round: gs.round, matches: gs.matches, gold: goldAll, messages, eliminated }
}

export function isGameOver(gs: GameState): boolean {
  return alivePlayers(gs).length <= 1
}

// ---------------- humains ↔ bots ----------------

/** Un humain prend la place d'un bot (avant ou pendant la partie). Renvoie l'id attribué, ou null si plein. */
export function seatHuman(gs: GameState, name: string): number | null {
  const candidates = gs.players.filter((p) => p.isBot && (gs.phase === 'lobby' || p.alive))
  if (!candidates.length) return null
  const p = candidates[0]
  p.isBot = false
  p.name = name
  p.bot = undefined
  // en plein combat, le bot a déjà joué : son tour compte comme fini (en boutique, l'ami peut magasiner)
  if (gs.phase === 'combat') gs.ready[p.id] = true
  if (gs.phase === 'shop') gs.ready[p.id] = false
  return p.id
}

/** Un humain part : un bot reprend sa place (et finit son tour s'il le faut). */
export function unseatHuman(gs: GameState, id: number) {
  const p = gs.players[id]
  if (!p || p.isBot) return
  p.isBot = true
  p.bot = botProfile(gs.rng)
  p.name = `${p.name} (bot)`
  if (gs.phase === 'combat' && p.alive && !gs.ready[id]) {
    const cs = gs.combats[id]
    gs.combats[id] = botCombat(p, gs.rng, cs?.oppHp, cs && !cs.finished ? cs : undefined)
    gs.ready[id] = true
  } else if (gs.phase === 'shop' && p.alive && !gs.ready[id]) {
    gs.packs[id] = undefined
    botShop(p, gs.shops[id], gs.rng, gs.round + 1)
    gs.ready[id] = true
  }
  maybeAdvance(gs)
}

/** Pour la simulation / les tests : joue le tour d'un humain avec l'IA. */
export function autoPlayHuman(gs: GameState, id: number, advance = true) {
  const p = gs.players[id]
  p.bot = p.bot ?? { skill: 0.9, greed: 0.5 }
  if (gs.phase === 'combat' && !gs.ready[id]) {
    const cs = gs.combats[id]
    gs.combats[id] = botCombat(p, gs.rng, cs.oppHp, cs)
    gs.ready[id] = true
  } else if (gs.phase === 'shop' && !gs.ready[id]) {
    gs.packs[id] = undefined
    botShop(p, gs.shops[id], gs.rng, gs.round + 1)
    gs.ready[id] = true
  }
  if (advance) maybeAdvance(gs)
}

/** Temps écoulé : les humains en retard finissent automatiquement (combat joué par l'IA, boutique fermée). */
export function checkTimeout(gs: GameState, now = Date.now()): boolean {
  if (!gs.deadline || now < gs.deadline || (gs.phase !== 'shop' && gs.phase !== 'combat')) return false
  const late = waitingFor(gs).map((p) => p.id)
  if (!late.length) return false
  for (const id of late) {
    if (gs.phase === 'combat') autoPlayHuman(gs, id, false)
    else {
      gs.packs[id] = undefined
      gs.ready[id] = true
    }
  }
  maybeAdvance(gs)
  return true
}
