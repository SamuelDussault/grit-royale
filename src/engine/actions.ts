// Toutes les actions qu'un joueur peut faire. L'hôte (ou le jeu solo) les applique sur l'état.
import type { ScoreResult } from './types'
import { discardCards, playHand } from './combat'
import { applyConsumable, getConsumable, useBlocker, type UseEnv } from './consumables'
import { buy, pickPackOption, reroll, sellConsumable, sellJoker, toggleLock } from './shop'
import { launchGame, maybeAdvance, type GameState } from './game'
import { pickShopItem } from './bot'

export type Action =
  | { type: 'start' }
  | { type: 'play'; ids: number[] }
  | { type: 'discard'; ids: number[] }
  | { type: 'use'; uid: number; ids: number[] }
  | { type: 'sellJoker'; uid: number }
  | { type: 'sellCons'; uid: number }
  | { type: 'moveJoker'; from: number; to: number }
  | { type: 'buy'; key: number }
  | { type: 'reroll' }
  | { type: 'lock'; key: number }
  | { type: 'pick'; index: number; ids: number[] }
  | { type: 'skipPack' }
  | { type: 'ready' }
  | { type: 'finishCombat' }

export interface ActionResult {
  error?: string
  msg?: string
  score?: ScoreResult
  packOpened?: boolean
}

export function applyAction(gs: GameState, pid: number, a: Action): ActionResult {
  const me = gs.players[pid]
  if (!me) return { error: 'Joueur inconnu' }
  try {
    switch (a.type) {
      case 'start':
        if (pid !== gs.hostId) return { error: 'Seul l’hôte peut lancer la partie' }
        launchGame(gs)
        return {}
      case 'play': {
        const cs = gs.combats[pid]
        if (gs.phase !== 'combat' || !cs || gs.ready[pid]) return { error: 'Pas de combat en cours' }
        return { score: playHand(me, cs, a.ids, gs.rng) }
      }
      case 'discard': {
        const cs = gs.combats[pid]
        if (gs.phase !== 'combat' || !cs || gs.ready[pid]) return { error: 'Pas de combat en cours' }
        const r = discardCards(me, cs, a.ids, gs.rng)
        return { msg: r.msgs.join(' · ') || undefined }
      }
      case 'finishCombat': {
        const cs = gs.combats[pid]
        if (gs.phase !== 'combat' || !cs) return {}
        if (!cs.finished) return { error: 'Le combat n’est pas fini' }
        gs.ready[pid] = true
        maybeAdvance(gs)
        return {}
      }
      case 'use': {
        const c = me.consumables.find((x) => x.uid === a.uid)
        if (!c) return { error: 'Introuvable' }
        const inCombat = gs.phase === 'combat' && !gs.ready[pid] && !!gs.combats[pid]
        const handCards = inCombat ? gs.combats[pid].hand : (gs.packs[pid]?.handCards ?? [])
        const env: UseEnv = { rng: gs.rng, handCards, inCombat }
        const selected = handCards.filter((h) => a.ids.includes(h.id))
        me.consumables = me.consumables.filter((x) => x !== c)
        const block = useBlocker(me, c.defId, selected, env)
        if (block) {
          me.consumables.push(c)
          return { error: block }
        }
        const msg = applyConsumable(me, c.defId, selected, env)
        if (inCombat) {
          const cs = gs.combats[pid]
          while (cs.hand.length > me.handSize) cs.drawPile.push(cs.hand.pop()!)
        }
        return { msg: `${getConsumable(c.defId).name} : ${msg}` }
      }
      case 'sellJoker':
        return { msg: `Vendu : +${sellJoker(me, a.uid)} $` }
      case 'sellCons':
        return { msg: `Vendu : +${sellConsumable(me, a.uid)} $` }
      case 'moveJoker': {
        const { from, to } = a
        if (from < 0 || to < 0 || from >= me.jokers.length || to >= me.jokers.length) return {}
        const [moved] = me.jokers.splice(from, 1)
        me.jokers.splice(to, 0, moved)
        return {}
      }
      case 'buy': {
        if (gs.phase !== 'shop' || gs.ready[pid]) return { error: 'La boutique est fermée' }
        const item = pickShopItem(gs.shops[pid], a.key)
        if (!item) return { error: 'Article introuvable' }
        const r = buy(me, item, gs.rng)
        if (r.pack) {
          gs.packs[pid] = r.pack
          return { packOpened: true }
        }
        return { error: r.error, msg: r.msg }
      }
      case 'reroll': {
        if (gs.phase !== 'shop' || gs.ready[pid]) return { error: 'La boutique est fermée' }
        const err = reroll(me, gs.shops[pid], gs.rng)
        return err ? { error: err } : {}
      }
      case 'lock': {
        if (gs.phase !== 'shop' || gs.ready[pid]) return { error: 'La boutique est fermée' }
        const r = toggleLock(gs.shops[pid], a.key)
        if (r === null) return { error: 'Impossible de verrouiller cet article' }
        return { msg: r ? 'Verrouillé : il restera au prochain round' : 'Déverrouillé' }
      }
      case 'pick': {
        const pack = gs.packs[pid]
        if (!pack) return { error: 'Aucun paquet ouvert' }
        const chosen = pack.handCards.filter((c) => a.ids.includes(c.id))
        const r = pickPackOption(me, pack, a.index, chosen, gs.rng)
        if (!r.error && pack.picksLeft <= 0) gs.packs[pid] = undefined
        return r
      }
      case 'skipPack':
        gs.packs[pid] = undefined
        return {}
      case 'ready':
        if (gs.phase !== 'shop') return {}
        gs.packs[pid] = undefined
        gs.ready[pid] = true
        maybeAdvance(gs)
        return {}
    }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
