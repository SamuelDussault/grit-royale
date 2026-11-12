// Le lobby façon TFT : appariements, combats, dégâts, économie, éliminations.
// Gère plusieurs joueurs humains : chaque humain agit via des « actions » (voir actions.ts),
// et un round ne se termine que quand tous les humains encore en vie ont fini.
import type { CombatState, HandType, Player } from './types'
import { makeCard, standardDeck, SUITS } from './cards'
import { HAND_TYPES } from './hands'
import { Rng } from './rng'
import { botCombat, botShop } from './bot'
import { startCombat } from './combat'
import { addJoker, ENH_LIST, lastAcquireMsg, giveConsumable, jokerRoom, newJoker, PLANET_FOR, randomJokerId } from './consumables'
import { countJoker, getJoker, jokersGone } from './jokers'
import { rollEdition } from './shop'
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
  carouselPickTime: 15_000,
}

// ---------------- mini-boss ----------------
export interface Boss {
  name: string
  target: number
  reward: number
}

const BOSS_NAMES = ['Le Croupier', 'La Dame de Fer', 'Le Grand Chambellan', 'L’Usurier', 'Le Roi Fou', 'La Bête du Casino', 'L’Empereur Pourpre']

/** Mini-boss aux rounds 1, 5, 10, 15, 20… */
export function isBossRound(round: number): boolean {
  return round === 1 || round % 5 === 0
}

/** Score à battre et récompense (calibrés sur les scores moyens de chaque round). */
export function bossFor(round: number): Boss {
  const table: [number, number][] = [
    [1, 120],
    [5, 1000],
    [10, 7000],
    [15, 25000],
    [20, 65000],
  ]
  let target: number
  const last = table[table.length - 1]
  if (round >= last[0]) target = last[1] * Math.pow(2.6, (round - last[0]) / 5)
  else {
    let i = 0
    while (table[i + 1][0] <= round) i++
    const [r0, t0] = table[i]
    const [r1, t1] = table[i + 1]
    target = t0 * Math.pow(t1 / t0, (round - r0) / (r1 - r0))
  }
  // le premier se gagne presque à coup sûr ; les suivants punissent seulement un jeu bâclé
  const idx = round === 1 ? 0 : Math.floor(round / 5)
  return {
    name: BOSS_NAMES[idx % BOSS_NAMES.length],
    target: Math.round(target / 50) * 50,
    reward: Math.min(14, 5 + idx * 2),
  }
}

// ---------------- carrousel ----------------
/** Carrousel de jokers après les rounds 3, 8, 13, 18… */
export function isCarouselAfter(round: number): boolean {
  return round % 5 === 3
}

export interface Carousel {
  items: { defId: string; edition?: import('./types').Edition; takenBy?: number }[]
  order: number[] // ids des joueurs, dans l'ordre de choix (le moins de PV d'abord)
  turn: number
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
  /** Round de mini-boss : score de chacun et récompense. */
  boss?: Boss & { results: Record<number, { score: number; won: boolean; reward: number }> }
}

/** lobby = salle d'attente avant la partie */
export type Phase = 'lobby' | 'shop' | 'combat' | 'carousel' | 'over'

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
  /** Mini-boss du round en cours (rounds 1, 5, 10…) */
  boss?: Boss
  carousel?: Carousel
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
    beatenBy: [],
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
  if (gs.phase === 'carousel' && gs.carousel) {
    const id = gs.carousel.order[gs.carousel.turn]
    return id !== undefined ? [gs.players[id]] : []
  }
  return aliveHumans(gs).filter((p) => !gs.ready[p.id])
}

function openShops(gs: GameState) {
  const prev = gs.shops
  gs.shops = {}
  gs.packs = {}
  gs.ready = {}
  gs.phase = 'shop'
  gs.deadline = gs.timers ? Date.now() + CONFIG.shopTime : undefined
  for (const p of alivePlayers(gs)) gs.shops[p.id] = newShop(p, gs.rng, prev[p.id])
  for (const p of alivePlayers(gs)) if (p.isBot) botShop(p, gs.shops[p.id], gs.rng, gs.round + 1, alivePlayers(gs))
  maybeAdvance(gs)
}

// ---------------- carrousel ----------------
function openCarousel(gs: GameState) {
  const alive = alivePlayers(gs)
  const taken: string[] = []
  const items: Carousel['items'] = alive.map(() => {
    const defId = randomJokerId(gs.rng, gs.rng.chance(0.25) ? 3 : 2, taken)
    taken.push(defId)
    return { defId, edition: gs.rng.chance(0.3) ? (rollEdition(gs.rng) ?? 'foil') : undefined }
  })
  const order = gs.rng.shuffle(alive.map((p) => p.id)).sort((a, b) => gs.players[a].hp - gs.players[b].hp)
  gs.carousel = { items, order, turn: 0 }
  gs.phase = 'carousel'
  gs.ready = {}
  gs.packs = {}
  runCarousel(gs)
}

function carouselValue(defId: string, edition?: string): number {
  const d = getJoker(defId)
  return d.rarity * 4 + d.cost + (edition ? 3 : 0)
}

/** Le joueur dont c'est le tour prend un joker. Renvoie un message. */
export function carouselPick(gs: GameState, pid: number, index: number): { error?: string; msg?: string } {
  const c = gs.carousel
  if (gs.phase !== 'carousel' || !c) return { error: 'Pas de carrousel en cours' }
  if (c.order[c.turn] !== pid) return { error: 'Ce n’est pas ton tour' }
  const item = c.items[index]
  if (!item || item.takenBy !== undefined) return { error: 'Déjà pris' }
  const p = gs.players[pid]
  item.takenBy = pid
  let msg: string
  const j = newJoker(item.defId, item.edition)
  if (jokerRoom(p, j)) {
    addJoker(p, j, gs.rng)
    msg = `${getJoker(item.defId).name} obtenu au carrousel !${lastAcquireMsg ? ` ${lastAcquireMsg}` : ''}`
  } else {
    p.gold += 4
    msg = 'Plus de place pour un joker : +4 $ à la place'
  }
  c.turn++
  gs.deadline = gs.timers ? Date.now() + CONFIG.carouselPickTime : undefined
  runCarousel(gs)
  return { msg }
}

/** Fait jouer les bots jusqu'au prochain humain ; ferme le carrousel à la fin. */
function runCarousel(gs: GameState) {
  const c = gs.carousel!
  while (c.turn < c.order.length) {
    const p = gs.players[c.order[c.turn]]
    if (!p.alive) {
      c.turn++
      continue
    }
    if (!p.isBot) {
      gs.deadline = gs.timers ? Date.now() + CONFIG.carouselPickTime : undefined
      return
    }
    const best = c.items
      .map((it, i) => ({ it, i }))
      .filter(({ it }) => it.takenBy === undefined)
      .sort((a, b) => carouselValue(b.it.defId, b.it.edition) - carouselValue(a.it.defId, a.it.edition))[0]
    if (!best) break
    best.it.takenBy = p.id
    const j = newJoker(best.it.defId, best.it.edition)
    if (jokerRoom(p, j)) addJoker(p, j, gs.rng)
    else p.gold += 4
    c.turn++
  }
  gs.carousel = { ...c, turn: c.order.length }
  openShops(gs)
}

/** Applique des dégâts de duel (Garde du Corps absorbe d'abord). Renvoie les PV vraiment perdus. */
function takeDuelDamage(p: Player, dmg: number, msg: (id: number, t: string) => void): number {
  for (const j of [...p.jokers]) {
    if (j.defId !== 'bodyguard' || dmg <= 0) continue
    const left = j.state.left ?? 5
    const absorbed = Math.min(left, dmg)
    dmg -= absorbed
    j.state.left = left - absorbed
    msg(p.id, `Garde du Corps : ${absorbed} dégâts bloqués`)
    if (j.state.left <= 0) {
      p.jokers = p.jokers.filter((x) => x !== j)
      jokersGone(p)
      msg(p.id, 'Ton Garde du Corps tombe en ruine')
    }
  }
  p.hp -= dmg
  return dmg
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
  // L'Empereur : dégâts × nombre de jokers
  for (const j of loser.jokers) if (j.defId === 'emperor') dmg *= loser.jokers.length
  for (const j of loser.jokers) dmg += getJoker(j.defId).damageTakenBonus ?? 0
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

/** Prépare un combat : infos du lobby pour les jokers, malédictions, Saboteur, Espion. */
function prepareCombat(gs: GameState, p: Player): CombatState {
  const info = gs.opponents[p.id]
  const opp = info && info.id >= 0 ? gs.players[info.id] : undefined
  const cs = startCombat(p, gs.rng, opp?.hp)
  cs.oppId = info?.id
  cs.vsGhost = info?.ghost
  cs.vsBoss = !!gs.boss
  cs.lobbyMaxHp = Math.max(...alivePlayers(gs).map((x) => x.hp))
  cs.lobbyJokerKinds = new Set(alivePlayers(gs).flatMap((x) => x.jokers.map((j) => j.defId))).size
  // Brouillard : une main de moins
  if (p.nextHandsMalus) {
    cs.handsLeft = Math.max(1, cs.handsLeft - p.nextHandsMalus)
    p.nextHandsMalus = 0
  }
  if (opp && !info.ghost) {
    // Saboteur adverse : une défausse de moins
    const sab = opp.jokers.filter((j) => j.defId === 'saboteur').length
    cs.discardsLeft = Math.max(0, cs.discardsLeft - sab)
  }
  // Espion (joker au hasard) et Imposteur (joker le plus à gauche) : copient l'adversaire
  const copiers = p.jokers.filter((j) => j.defId === 'spy' || j.defId === 'impostor')
  if (copiers.length && opp) {
    const pool = opp.jokers.filter((j) => {
      const d = getJoker(j.defId)
      return !d.copy && d.copyable !== false
    })
    cs.spyCopies = {}
    for (const s of copiers) {
      if (!pool.length) break
      const t = s.defId === 'impostor' ? pool[0] : gs.rng.pick(pool)
      cs.spyCopies[s.uid] = { ...t, state: { ...t.state } }
    }
  }
  if (opp) cs.oppGold = opp.gold
  // Sablier Cassé : une défausse de plus
  cs.discardsLeft += countJoker(p, 'brokenHourglass')
  // Roue de la Fortune Inversée : 1 chance sur 3 d'améliorer toute la main
  for (let i = 0; i < countJoker(p, 'wheelInv'); i++) {
    if (!gs.rng.chance(1 / 3)) continue
    for (const c of cs.hand) if (!c.enh) c.enh = gs.rng.pick(['steel', 'gold', 'glass', 'mult'] as const)
  }
  // L'Alchimiste : une carte de la main devient en Or
  for (let i = 0; i < countJoker(p, 'alchemist'); i++) {
    const pool = cs.hand.filter((c) => c.enh !== 'gold' && c.enh !== 'cursed')
    if (pool.length) gs.rng.pick(pool).enh = 'gold'
  }
  // Le Fossoyeur : la carte ressuscitée rejoint la main de départ (+50 jetons)
  for (const j of p.jokers) {
    if (j.defId !== 'gravedigger' || !j.state.rank) continue
    const c = makeCard(j.state.rank, SUITS[j.state.suit ?? 0])
    if (j.state.enh) c.enh = ENH_LIST[j.state.enh - 1]
    c.extraChips = 50
    cs.hand.push(c)
  }
  return cs
}

/** Lance un round : appariements (ou mini-boss), combats des bots, combats des humains. */
export function startRound(gs: GameState) {
  gs.round++
  gs.packs = {}
  gs.ready = {}
  gs.combats = {}
  gs.opponents = {}
  gs.phase = 'combat'
  gs.carousel = undefined
  gs.deadline = gs.timers ? Date.now() + CONFIG.combatTime : undefined
  if (isBossRound(gs.round)) {
    gs.boss = bossFor(gs.round)
    gs.matches = []
    for (const p of alivePlayers(gs)) gs.opponents[p.id] = { id: -1, ghost: false }
  } else {
    gs.boss = undefined
    gs.matches = pairUp(gs)
    for (const m of gs.matches) {
      gs.opponents[m.a] = { id: m.b, ghost: !!m.ghostB }
      if (!m.ghostB) gs.opponents[m.b] = { id: m.a, ghost: false }
    }
    // Bookmaker : la mise est prise avant le duel
    for (const p of alivePlayers(gs))
      for (const j of p.jokers) if (j.defId === 'bookmaker') j.state.bet = Math.min(10, Math.floor(Math.max(0, p.gold) * 0.25))
  }
  for (const p of alivePlayers(gs)) {
    const cs = prepareCombat(gs, p)
    if (p.isBot) {
      gs.combats[p.id] = botCombat(p, gs.rng, cs.oppHp, cs)
      gs.ready[p.id] = true
    } else gs.combats[p.id] = cs
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
    else if (isCarouselAfter(gs.round)) openCarousel(gs)
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
  gs.boss = undefined
  for (const m of gs.matches) gs.opponents[m.a] = { id: m.b, ghost: !!m.ghostB }
  for (const p of alivePlayers(gs)) gs.combats[p.id] = botCombat(p, gs.rng)
  resolveRound(gs)
  for (const p of alivePlayers(gs)) {
    const shop = newShop(p, gs.rng)
    botShop(p, shop, gs.rng, gs.round + 1, alivePlayers(gs))
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
  const ties = new Set<number>()
  const extra: Record<number, GoldLine[]> = {}
  const addExtra = (id: number, label: string, amount: number) => {
    if (amount) (extra[id] ??= []).push({ label, amount })
  }
  const count = (p: Player, id: string) => p.jokers.filter((j) => j.defId === id).length

  for (const m of gs.matches) {
    const A = gs.players[m.a]
    const B = gs.players[m.b]
    m.scoreA = gs.combats[m.a]?.score ?? 0
    m.scoreB = gs.combats[m.b]?.score ?? 0
    if (m.scoreA === m.scoreB) {
      m.winner = null
      m.damage = 0
      results.set(m.a, false)
      ties.add(m.a)
      if (!m.ghostB) {
        results.set(m.b, false)
        ties.add(m.b)
      }
      // Pacifiste : égalité
      addExtra(m.a, 'Le Pacifiste', 5 * count(A, 'pacifist'))
      if (!m.ghostB) addExtra(m.b, 'Le Pacifiste', 5 * count(B, 'pacifist'))
      continue
    }
    const aWins = m.scoreA > m.scoreB
    m.winner = aWins ? m.a : m.b
    const loser = aWins ? B : A
    const winner = aWins ? A : B
    m.damage = computeDamage(gs.round, Math.max(m.scoreA, m.scoreB), Math.min(m.scoreA, m.scoreB), winner, loser)
    const realHit = !m.ghostB || !aWins
    if (realHit) {
      const taken = takeDuelDamage(loser, m.damage, msg)
      // L'Encaisseur : +2 $ par tranche de 5 PV perdus (max 10 $)
      addExtra(loser.id, 'L’Encaisseur', countJoker(loser, 'cashier') * Math.min(10, 2 * Math.floor(taken / 5)))
      if (!m.ghostB) {
        // Miroir Divin : le gagnant subit la moitié des dégâts
        const mirror = countJoker(loser, 'divineMirror')
        if (mirror && taken > 0) {
          const back = Math.ceil(taken * 0.5) * mirror
          winner.hp -= back
          msg(winner.id, `Le Miroir Divin de ${loser.name} te renvoie ${back} dégâts`)
          msg(loser.id, `Miroir Divin : ${winner.name} subit ${back} dégâts`)
        }
        // Poupée Vaudou : 2 PV + 2 par carte maudite dans ton paquet
        const voodoo = countJoker(loser, 'voodoo')
        if (voodoo) {
          const hurt = voodoo * (2 + 2 * loser.deck.filter((c) => c.enh === 'cursed').length)
          winner.hp -= hurt
          msg(winner.id, `La Poupée Vaudou de ${loser.name} te fait perdre ${hurt} PV`)
          msg(loser.id, `Poupée Vaudou : ${winner.name} perd ${hurt} PV`)
        }
      }
    }
    results.set(m.a, aWins)
    if (!m.ghostB) results.set(m.b, !aWins)
    // La Vengeance : on retient qui nous a battus
    const realLoser = m.ghostB && aWins ? null : loser
    if (realLoser && !realLoser.beatenBy.includes(winner.id)) realLoser.beatenBy.push(winner.id)
    const realWinner = m.ghostB && !aWins ? null : winner
    if (realWinner) {
      // Pickpocket : vol de 2 $ au perdant (pas sur un fantôme)
      if (!m.ghostB) {
        const steal = Math.min(Math.max(0, loser.gold), 2 * count(winner, 'pickpocket'))
        if (steal) {
          loser.gold -= steal
          addExtra(winner.id, 'Le Pickpocket', steal)
          msg(loser.id, `${winner.name} t’a volé ${steal} $ (Pickpocket)`)
        }
      }
      // Pacifiste : victoire serrée
      if (Math.min(m.scoreA, m.scoreB) >= 0.9 * Math.max(m.scoreA, m.scoreB)) addExtra(winner.id, 'Le Pacifiste', 5 * count(winner, 'pacifist'))
    }
  }

  // ---- mini-boss ----
  let bossInfo: RoundReport['boss']
  if (gs.boss) {
    const boss = gs.boss
    bossInfo = { ...boss, results: {} }
    for (const p of alivePlayers(gs)) {
      const score = gs.combats[p.id]?.score ?? 0
      const won = score >= boss.target
      const reward = won ? boss.reward : 0
      bossInfo.results[p.id] = { score, won, reward }
      results.set(p.id, won)
      if (won) addExtra(p.id, `${boss.name} vaincu`, reward)
      msg(p.id, won ? `Mini-boss vaincu : +${reward} $` : `Mini-boss raté (${score} / ${boss.target})`)
    }
  }

  for (const p of alivePlayers(gs)) {
    const won = results.get(p.id) ?? false
    // les séries ne comptent que les duels (pas les mini-boss)
    if (!gs.boss) {
      if (won) {
        p.winStreak++
        p.loseStreak = 0
        p.stats.roundsWon++
      } else {
        p.loseStreak++
        p.winStreak = 0
      }
    }
    const lines: GoldLine[] = []
    const add = (label: string, amount: number) => {
      if (amount) lines.push({ label, amount })
    }
    add('Revenu de base', CONFIG.baseIncome)
    const cap = p.vouchers.includes('seedMoney') ? 10 : CONFIG.interestCap
    const g = Math.max(0, p.gold)
    if (!countJoker(p, 'leakyPurse')) add('Intérêts', Math.min(cap, Math.floor(g / CONFIG.interestPer)))
    const moons = p.jokers.filter((j) => j.defId === 'toTheMoon').length
    add('Vers la Lune', moons * Math.floor(g / 5))
    if (!gs.boss) {
      if (won) add('Victoire', 1)
      add(won ? 'Série de victoires' : 'Série de défaites', streakBonus(won ? p.winStreak : p.loseStreak))
      // Bookmaker : mise gagnée ou perdue
      for (const j of p.jokers)
        if (j.defId === 'bookmaker' && j.state.bet && !ties.has(p.id)) {
          if (won) add('Le Bookmaker (mise gagnée)', j.state.bet)
          else {
            const lost = Math.min(Math.max(0, p.gold), j.state.bet)
            p.gold -= lost
            msg(p.id, `Le Bookmaker : mise perdue (−${lost} $)`)
          }
        }
    }
    for (const l of extra[p.id] ?? []) lines.push(l)

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
      const r = getJoker(j.defId).onRoundEnd?.(p, j, { won, rng: gs.rng, duel: !gs.boss && !ties.has(p.id) })
      if (!r) continue
      if (r.money) add(getJoker(j.defId).name, r.money)
      if (r.destroy) {
        p.jokers = p.jokers.filter((x) => x !== j)
        jokersGone(p)
        if (r.msg) msg(p.id, r.msg)
      } else if (r.msg) msg(p.id, r.msg)
    }
    // L'Usurier : chaque $ dû coûte 1 PV
    if (p.debt) {
      p.hp -= p.debt
      msg(p.id, `Dette de ${p.debt} $ : −${p.debt} PV`)
    }
    for (const l of lines) p.gold += l.amount
    goldAll[p.id] = lines
  }

  // Cendres du Phénix : on renaît au lieu de mourir
  for (const p of alivePlayers(gs)) {
    if (p.hp > 0) continue
    const ash = p.jokers.find((j) => j.defId === 'phoenixAshes')
    if (!ash) continue
    ash.defId = 'phoenix'
    ash.state = {}
    p.hp = 20
    msg(p.id, 'Le Phénix renaît de ses cendres ! Tu reviens à 20 PV')
    for (const o of gs.players) if (o.id !== p.id) msg(o.id, `${p.name} renaît de ses cendres !`)
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

  gs.lastReport = { round: gs.round, matches: gs.matches, gold: goldAll, messages, eliminated, boss: bossInfo }
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
    botShop(p, gs.shops[id], gs.rng, gs.round + 1, alivePlayers(gs))
    gs.ready[id] = true
  } else if (gs.phase === 'carousel' && gs.carousel && gs.carousel.order[gs.carousel.turn] === id) {
    runCarousel(gs)
    return
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
    botShop(p, gs.shops[id], gs.rng, gs.round + 1, alivePlayers(gs))
    gs.ready[id] = true
  } else if (gs.phase === 'carousel' && gs.carousel && gs.carousel.order[gs.carousel.turn] === id) {
    const c = gs.carousel
    const best = c.items.findIndex((it) => it.takenBy === undefined)
    if (best >= 0) carouselPick(gs, id, best)
    return
  }
  if (advance) maybeAdvance(gs)
}

/** Temps écoulé : les humains en retard finissent automatiquement (combat joué par l'IA, boutique fermée). */
/** Heure limite d'un joueur (Sablier Cassé : moitié du temps en combat). */
export function personalDeadline(gs: GameState, id: number): number | undefined {
  if (!gs.deadline) return undefined
  const p = gs.players[id]
  if (gs.phase === 'combat' && p && countJoker(p, 'brokenHourglass')) return gs.deadline - CONFIG.combatTime / 2
  return gs.deadline
}

export function checkTimeout(gs: GameState, now = Date.now()): boolean {
  if (gs.phase === 'carousel' && gs.deadline && now >= gs.deadline && gs.carousel) {
    // temps écoulé : on prend le premier joker libre pour le joueur en retard
    const c = gs.carousel
    const free = c.items.findIndex((it) => it.takenBy === undefined)
    if (free >= 0) carouselPick(gs, c.order[c.turn], free)
    return true
  }
  // Sablier Cassé : la moitié du temps seulement pour jouer ses mains
  if (gs.phase === 'combat' && gs.deadline && now < gs.deadline) {
    const rushed = waitingFor(gs).filter((p) => countJoker(p, 'brokenHourglass') && now >= personalDeadline(gs, p.id)!)
    if (!rushed.length) return false
    for (const p of rushed) autoPlayHuman(gs, p.id, false)
    maybeAdvance(gs)
    return true
  }
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
