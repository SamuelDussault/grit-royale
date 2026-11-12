// Toutes les actions qu'un joueur peut faire. L'hôte (ou le jeu solo) les applique sur l'état.
import type { Card, CombatState, JokerInst, Player, ScoreResult } from './types'
import { discardCards, playHand } from './combat'
import { applyConsumable, getConsumable, useBlocker, type UseEnv } from './consumables'
import { buy, pickPackOption, reroll, sellConsumable, sellJoker, toggleLock } from './shop'
import { carouselPick, launchGame, maybeAdvance, type GameMode, type GameState } from './game'
import { pickShopItem } from './bot'
import { getJoker, jokersGone } from './jokers'

export type Action =
  | { type: 'start' }
  | { type: 'play'; ids: number[] }
  | { type: 'discard'; ids: number[] }
  | { type: 'use'; uid: number; ids: number[]; target?: number }
  | { type: 'sellJoker'; uid: number }
  | { type: 'sellCons'; uid: number }
  | { type: 'moveJoker'; from: number; to: number }
  | { type: 'buy'; key: number }
  | { type: 'reroll' }
  | { type: 'lock'; key: number }
  | { type: 'carousel'; index: number }
  | { type: 'pick'; index: number; ids: number[] }
  | { type: 'skipPack' }
  | { type: 'ready' }
  | { type: 'finishCombat' }
  | { type: 'rewind' }
  | { type: 'setMode'; mode: GameMode }
  | { type: 'feed'; uid: number }
  | { type: 'devour'; uid?: number; key?: number }
  | { type: 'fate'; ids: number[] }
  | { type: 'loan'; amount: number }

interface Snapshot {
  cs: CombatState
  deck: Card[]
  jokers: JokerInst[]
  handPlays: Player['handPlays']
  stats: Player['stats']
  gold: number
}
/** Photos pour Le Maître du Temps (gardées hors de l'état partagé). */
const snapshots = new Map<number, Snapshot>()

function takeSnapshot(p: Player, cs: CombatState): Snapshot {
  // un seul structuredClone : les cartes partagées entre paquet et combat restent les mêmes objets
  const { deck, jokers, handPlays, stats, gold } = p
  return structuredClone({ cs: { ...cs, canRewind: false }, deck, jokers, handPlays, stats, gold })
}

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
      case 'setMode':
        if (pid !== gs.hostId || gs.phase !== 'lobby') return { error: 'Seul l’hôte peut changer le mode' }
        gs.mode = a.mode
        return {}
      case 'start':
        if (pid !== gs.hostId) return { error: 'Seul l’hôte peut lancer la partie' }
        launchGame(gs)
        return {}
      case 'play': {
        const cs = gs.combats[pid]
        if (gs.phase !== 'combat' || !cs || gs.ready[pid]) return { error: 'Pas de combat en cours' }
        // Le Maître du Temps : on garde une photo avant la main pour pouvoir la rejouer
        const snap = me.jokers.some((j) => j.defId === 'timeMaster') && !cs.rewindUsed ? takeSnapshot(me, cs) : undefined
        const score = playHand(me, cs, a.ids, gs.rng)
        if (snap) {
          snapshots.set(pid, snap)
          cs.canRewind = true
        }
        return { score }
      }
      case 'rewind': {
        const cs = gs.combats[pid]
        const snap = snapshots.get(pid)
        if (gs.phase !== 'combat' || !cs || gs.ready[pid] || !snap || cs.rewindUsed || !cs.canRewind)
          return { error: 'Aucune main à rejouer' }
        snapshots.delete(pid)
        const old = snap.cs
        me.deck = snap.deck
        me.jokers = snap.jokers
        me.handPlays = snap.handPlays
        me.stats = snap.stats
        me.gold = snap.gold
        old.rewindUsed = true
        old.canRewind = false
        gs.combats[pid] = old
        return { msg: 'Le Maître du Temps : la dernière main est annulée, rejoue-la !' }
      }
      case 'feed': {
        const j = me.jokers.find((x) => x.uid === a.uid && x.defId === 'gluttony')
        if (!j || gs.phase !== 'shop' || gs.ready[pid]) return { error: 'Seulement en boutique' }
        if (j.state.r === gs.round) return { error: 'Déjà nourrie dans cette boutique' }
        if (me.hp <= 5) return { error: 'Pas assez de PV' }
        me.hp -= 5
        j.state.r = gs.round
        j.state.g = (j.state.g ?? 0) + 5
        return { msg: `Gluttonie dévore 5 PV : +${j.state.g} Grit` }
      }
      case 'devour': {
        const hole = me.jokers.find((j) => j.defId === 'blackHole' && j.state.r !== gs.round)
        if (!hole || gs.phase !== 'shop' || gs.ready[pid]) return { error: 'Le Trou Noir a déjà mangé dans cette boutique' }
        let defId: string
        if (a.uid !== undefined) {
          const victim = me.jokers.find((j) => j.uid === a.uid)
          if (!victim || victim === hole) return { error: 'Joker introuvable' }
          me.jokers = me.jokers.filter((j) => j !== victim)
          jokersGone(me)
          defId = victim.defId
        } else {
          const item = gs.shops[pid]?.cards.find((i) => i.key === a.key && i.kind === 'joker' && !i.sold)
          if (!item) return { error: 'Joker introuvable' }
          item.sold = true
          defId = item.id
        }
        const legend = getJoker(defId).rarity === 4
        hole.state.x = (hole.state.x ?? 1) + (legend ? 2 : 0.5)
        hole.state.r = gs.round
        return { msg: `Le Trou Noir avale ${getJoker(defId).name} : ×${hole.state.x.toFixed(1)} Grit` }
      }
      case 'fate': {
        const cs = gs.combats[pid]
        if (gs.phase !== 'combat' || !cs || gs.ready[pid] || !me.jokers.some((j) => j.defId === 'fateEye')) return { error: 'Impossible' }
        const n = Math.min(10, cs.drawPile.length)
        const top = cs.drawPile.slice(cs.drawPile.length - n) // la fin de la pioche sort en premier
        if (a.ids.length !== n || !a.ids.every((id) => top.some((c) => c.id === id))) return { error: 'Ordre invalide' }
        const ordered = a.ids.map((id) => top.find((c) => c.id === id)!)
        cs.drawPile = [...cs.drawPile.slice(0, cs.drawPile.length - n), ...ordered.reverse()]
        return {}
      }
      case 'loan': {
        if (gs.phase !== 'shop' || gs.ready[pid]) return { error: 'Seulement en boutique' }
        const debt = me.debt ?? 0
        if (a.amount > 0) {
          if (!me.jokers.some((j) => j.defId === 'usurer')) return { error: 'Il te faut L’Usurier pour emprunter' }
          const n = Math.min(a.amount, 20 - debt)
          if (n <= 0) return { error: 'Tu dois déjà 20 $' }
          me.debt = debt + n
          me.gold += n
          return { msg: `Emprunt : +${n} $ (dette : ${me.debt} $)` }
        }
        const n = Math.min(-a.amount, debt, Math.max(0, me.gold))
        if (n <= 0) return { error: debt ? 'Pas assez d’or' : 'Aucune dette' }
        me.debt = debt - n
        me.gold -= n
        return { msg: `Remboursé : ${n} $ (dette : ${me.debt} $)` }
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
        const env: UseEnv = { rng: gs.rng, handCards, inCombat, target: a.target !== undefined ? gs.players[a.target] : undefined }
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
      case 'carousel':
        return carouselPick(gs, pid, a.index)
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
