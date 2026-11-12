import type { Card, CombatState, HandType, JokerInst, Player, ScoreEvent, ScoreResult, ScoreTarget } from './types'
import { cardChips, cardLabel, isFace } from './cards'
import { evaluateHand, handBase, HANDS, type EvalRules } from './hands'
import { getJoker, resolveCopy, type JokerDef } from './jokers'
import type { Rng } from './rng'

export interface Rules extends EvalRules {
  pareidolia?: boolean
}

export function collectRules(jokers: JokerInst[]): Rules {
  const r: Rules = {}
  for (const j of jokers) Object.assign(r, getJoker(j.defId).rules ?? {})
  return r
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ''))

/** Contexte de calcul d'une main : passé à tous les effets de jokers. */
export class ScoreCtx {
  chips = 0
  mult = 0
  money = 0
  events: ScoreEvent[] = []
  destroyed: Card[] = []
  readonly type: HandType
  readonly scoring: Card[]
  readonly contains: Set<HandType>
  readonly player: Player
  readonly combat: CombatState
  readonly played: Card[]
  readonly held: Card[]
  readonly rules: Rules
  readonly rng: Rng
  readonly preview: boolean
  readonly isFinalHand: boolean
  /** Qui déclenche l'effet en cours (pour l'animation) */
  cur: ScoreTarget | undefined

  constructor(o: {
    player: Player
    combat: CombatState
    played: Card[]
    held: Card[]
    rng: Rng
    preview: boolean
  }) {
    this.player = o.player
    this.combat = o.combat
    this.played = o.played
    this.held = o.held
    this.rng = o.rng
    this.preview = o.preview
    this.rules = collectRules(o.player.jokers)
    const ev = evaluateHand(o.played, this.rules)
    this.type = ev.type
    this.scoring = ev.scoring
    this.contains = ev.contains
    this.isFinalHand = o.combat.handsLeft === 1
    const base = handBase(this.type, o.player.handLevels[this.type])
    this.chips = base.chips
    this.mult = base.mult
  }

  isFace(c: Card) {
    return isFace(c, this.rules.pareidolia)
  }
  private push(source: string, text: string, kind: ScoreEvent['kind']) {
    this.events.push({ source, text, kind, target: this.cur, chips: this.chips, mult: this.mult })
  }
  addChips(n: number, source: string) {
    if (!n) return
    this.chips += n
    this.push(source, `+${fmt(n)}`, 'chips')
  }
  addMult(n: number, source: string) {
    if (!n) return
    this.mult += n
    this.push(source, `${n >= 0 ? '+' : ''}${fmt(n)} Grit`, 'mult')
  }
  xMult(n: number, source: string) {
    if (n === 1) return
    this.mult *= n
    this.push(source, `×${fmt(n)} Grit`, 'xmult')
  }
  addMoney(n: number, source: string) {
    if (!n) return
    this.money += n
    this.push(source, `+${n} $`, 'money')
  }
  info(source: string, text: string) {
    this.push(source, text, 'info')
  }
}

/** Chaque joker « actif » avec la définition à utiliser (les copieurs prennent celle de leur cible). */
function activeJokers(player: Player, combat: CombatState): { j: JokerInst; def: JokerDef; self: JokerInst }[] {
  const out: { j: JokerInst; def: JokerDef; self: JokerInst }[] = []
  player.jokers.forEach((self, i) => {
    if (self.defId === 'spy') {
      const target = combat.spyCopies?.[self.uid]
      if (target) out.push({ j: target, def: getJoker(target.defId), self })
      return
    }
    const target = resolveCopy(player.jokers, i)
    if (!target) return
    out.push({ j: target, def: getJoker(target.defId), self })
  })
  return out
}

/**
 * Calcule le score d'une main jouée.
 * preview = true : aucune modification de l'état (pour l'IA et les estimations).
 */
export function scoreHand(o: {
  player: Player
  combat: CombatState
  played: Card[]
  held: Card[]
  rng: Rng
  preview: boolean
}): ScoreResult {
  const preview = o.preview
  // En prévisualisation on travaille sur une copie des jokers : leur état ne bouge pas.
  const player: Player = preview
    ? { ...o.player, jokers: o.player.jokers.map((j) => ({ ...j, state: { ...j.state } })), stats: { ...o.player.stats } }
    : o.player
  const ctx = new ScoreCtx({ ...o, player })
  const jokers = activeJokers(player, o.combat)
  const name = (j: JokerInst) => getJoker(j.defId).name

  // 1) Avant le calcul : jokers évolutifs (seulement les vrais, pas les copies)
  for (const j of player.jokers) getJoker(j.defId).before?.(ctx, j)

  // 2) Cartes qui comptent, de gauche à droite
  const scoringOnce = (c: Card) => {
    const label = cardLabel(c)
    ctx.cur = { card: c.id }
    ctx.addChips(cardChips(c), label)
    if (c.enh === 'mult') ctx.addMult(4, label)
    if (c.enh === 'lucky') {
      let hit = false
      if (ctx.rng.chance(1 / 5)) {
        ctx.addMult(20, `${label} (Chance)`)
        hit = true
      }
      if (ctx.rng.chance(1 / 15)) {
        ctx.addMoney(20, `${label} (Chance)`)
        hit = true
      }
      if (hit && !preview) {
        player.stats.luckyTriggers++
        for (const j of player.jokers) if (j.defId === 'luckyCat') j.state.x = (j.state.x ?? 1) + 0.25
      }
    }
    if (c.enh === 'glass') ctx.xMult(2, `${label} (Verre)`)
    if (c.edition === 'foil') ctx.addChips(50, `${label} (Métallique)`)
    if (c.edition === 'holo') ctx.addMult(10, `${label} (Holo)`)
    if (c.edition === 'poly') ctx.xMult(1.5, `${label} (Polychrome)`)
    if (c.seal === 'gold') ctx.addMoney(3, `${label} (Sceau doré)`)
    for (const { j, def, self } of jokers) {
      ctx.cur = { joker: self.uid }
      def.onScored?.(ctx, j, c, self === j ? name(j) : `${name(self)} → ${name(j)}`)
    }
  }
  for (const c of ctx.scoring) {
    let reps = 1 + (c.seal === 'red' ? 1 : 0)
    for (const { j, def } of jokers) reps += def.retrigger?.(ctx, j, c) ?? 0
    for (let r = 0; r < reps; r++) scoringOnce(c)
  }

  // 3) Cartes gardées en main
  for (const c of o.held) {
    let reps = 1 + (c.seal === 'red' ? 1 : 0)
    for (const { j, def } of jokers) reps += def.retriggerHeld?.(ctx, j, c) ?? 0
    for (let r = 0; r < reps; r++) {
      ctx.cur = { card: c.id, held: true }
      if (c.enh === 'steel') ctx.xMult(1.5, `${cardLabel(c)} (Acier, en main)`)
      for (const { j, def, self } of jokers) {
        ctx.cur = { joker: self.uid }
        def.onHeld?.(ctx, j, c, self === j ? name(j) : `${name(self)} → ${name(j)}`)
      }
    }
  }

  // 4) Jokers, de gauche à droite (éditions comprises)
  for (const { j, def, self } of jokers) {
    const label = self === j ? name(j) : `${name(self)} → ${name(j)}`
    ctx.cur = { joker: self.uid }
    if (self.edition === 'foil') ctx.addChips(50, `${name(self)} (Métallique)`)
    if (self.edition === 'holo') ctx.addMult(10, `${name(self)} (Holo)`)
    def.onJoker?.(ctx, j, label)
    if (self.edition === 'poly') ctx.xMult(1.5, `${name(self)} (Polychrome)`)
  }

  // 5) Après : verre qui se brise, jokers qui s'usent
  if (!preview) {
    for (const c of ctx.scoring) {
      ctx.cur = { card: c.id }
      if (c.enh === 'glass' && ctx.rng.chance(1 / 4)) {
        ctx.destroyed.push(c)
        ctx.info(cardLabel(c), 'se brise !')
      }
    }
    for (const j of [...player.jokers]) getJoker(j.defId).after?.(ctx, j)
  }

  const total = Math.floor(ctx.chips * ctx.mult)
  const base = handBase(ctx.type, player.handLevels[ctx.type])
  return {
    type: ctx.type,
    baseChips: base.chips,
    baseMult: base.mult,
    played: o.played,
    scoring: ctx.scoring,
    chips: Math.round(ctx.chips),
    mult: Math.round(ctx.mult * 100) / 100,
    total: Number.isFinite(total) ? total : Number.MAX_SAFE_INTEGER,
    events: ctx.events,
    money: ctx.money,
    destroyed: ctx.destroyed,
  }
}

export function handName(t: HandType): string {
  return HANDS[t].name
}
