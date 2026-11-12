// Profil du joueur : statistiques sauvegardées dans le navigateur (localStorage).
import { cashoutX, getJoker } from '../engine/jokers'
import type { GameState } from '../engine/game'
import type { Player } from '../engine/types'

export interface Profile {
  games: number
  wins: number
  top3: number
  placements: number // somme des places (pour la moyenne)
  bestHand: number
  bestHandType?: string
  bestRound: number // meilleur score total sur un combat
  bestCashout: number
  legendaries: number // légendaires obtenus
  phoenix: number // renaissances
  roundsPlayed: number
  byMode: Record<string, { games: number; wins: number }>
  jokers: Record<string, number> // nombre de parties où le joker a été possédé
  lastGames: { date: number; mode: string; placement: number; rounds: number }[]
  /** Parties déjà comptées (graine + mode) pour ne pas compter deux fois. */
  seen: string[]
}

const KEY = 'grit-royale-profile'

const empty = (): Profile => ({
  games: 0,
  wins: 0,
  top3: 0,
  placements: 0,
  bestHand: 0,
  bestRound: 0,
  bestCashout: 0,
  legendaries: 0,
  phoenix: 0,
  roundsPlayed: 0,
  byMode: {},
  jokers: {},
  lastGames: [],
  seen: [],
})

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty()
  } catch {
    return empty()
  }
}

function save(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* stockage indisponible : tant pis */
  }
}

export function resetProfile() {
  save(empty())
}

/** Une main jouée. */
export function recordHand(total: number, type: string) {
  const p = loadProfile()
  if (total > p.bestHand) {
    p.bestHand = total
    p.bestHandType = type
    save(p)
  }
}

/** Suivi pendant la partie : jokers possédés, Cash-Out, renaissances. */
const live = { key: '', jokers: new Set<string>(), cashout: 0, phoenix: false, bestRound: 0 }

export function trackLive(gs: GameState, me: Player) {
  const key = `${gs.seed}-${gs.mode ?? 'classic'}`
  if (live.key !== key) Object.assign(live, { key, jokers: new Set<string>(), cashout: 0, phoenix: false, bestRound: 0 })
  for (const j of me.jokers) {
    live.jokers.add(j.defId)
    if (j.defId === 'cashout' && j.state.locked) live.cashout = Math.max(live.cashout, cashoutX(j.state.n ?? 0))
    if (j.defId === 'phoenix') live.phoenix = true
  }
  const cs = gs.combats[me.id]
  if (cs) live.bestRound = Math.max(live.bestRound, cs.score)
}

/** Fin de partie pour moi (éliminé ou partie terminée) : comptée une seule fois. */
export function recordGame(gs: GameState, me: Player) {
  const p = loadProfile()
  const key = `${gs.seed}-${gs.mode ?? 'classic'}`
  if (p.seen.includes(key) || !me.placement) return
  trackLive(gs, me)
  p.seen = [...p.seen.slice(-50), key]
  p.games++
  const won = me.placement === 1
  if (won) p.wins++
  if (me.placement <= 3) p.top3++
  p.placements += me.placement
  p.roundsPlayed += gs.round
  const m = (p.byMode[gs.mode ?? 'classic'] ??= { games: 0, wins: 0 })
  m.games++
  if (won) m.wins++
  for (const id of live.jokers) {
    p.jokers[id] = (p.jokers[id] ?? 0) + 1
    if (getJoker(id).rarity === 4) p.legendaries++
  }
  p.bestCashout = Math.max(p.bestCashout, live.cashout)
  p.bestRound = Math.max(p.bestRound, live.bestRound)
  if (live.phoenix) p.phoenix++
  p.lastGames = [{ date: Date.now(), mode: gs.mode ?? 'classic', placement: me.placement, rounds: gs.round }, ...p.lastGames].slice(0, 10)
  save(p)
}
