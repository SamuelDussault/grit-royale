import type { Card, CombatState, HandType, JokerInst, Player, Suit } from './types'
import type { Rules, ScoreCtx } from './scoring'
import { isSuit, makeCard, SUIT_PLURAL, SUITS } from './cards'
import { HANDS } from './hands'
import type { Rng } from './rng'

export type Rarity = 1 | 2 | 3 | 4
export const RARITY_NAME: Record<Rarity, string> = { 1: 'Commun', 2: 'Peu commun', 3: 'Rare', 4: 'Légendaire' }

export interface RoundEndInfo {
  won: boolean
  rng: Rng
  /** Vrai duel (pas un mini-boss) et pas une égalité. */
  duel?: boolean
}

export interface JokerDef {
  id: string
  name: string
  rarity: Rarity
  cost: number
  desc: (j: JokerInst, p?: Player) => string
  rules?: Rules
  copy?: 'right' | 'left'
  copyable?: boolean
  pvp?: boolean
  /** Avant le calcul (jokers qui évoluent). Pas déclenché par les copies. */
  before?(ctx: ScoreCtx, j: JokerInst): void
  onScored?(ctx: ScoreCtx, j: JokerInst, c: Card, label: string): void
  onHeld?(ctx: ScoreCtx, j: JokerInst, c: Card, label: string): void
  onJoker?(ctx: ScoreCtx, j: JokerInst, label: string): void
  retrigger?(ctx: ScoreCtx, j: JokerInst, c: Card): number
  retriggerHeld?(ctx: ScoreCtx, j: JokerInst, c: Card): number
  after?(ctx: ScoreCtx, j: JokerInst): void
  onDiscard?(p: Player, j: JokerInst, cards: Card[], combat: CombatState): number
  onRoundEnd?(p: Player, j: JokerInst, info: RoundEndInfo): { money?: number; destroy?: boolean; msg?: string } | void
  onSellAny?(p: Player, j: JokerInst): void
  onElimination?(p: Player, j: JokerInst): number
  /** Quand le joker arrive chez le joueur (achat, paquet, carrousel…). */
  onAcquire?(p: Player, j: JokerInst, rng: Rng): string | void
  /** N'apparaît jamais en boutique / paquet / carrousel (ex. Phénix, né des Cendres). */
  hidden?: boolean
  damageBonus?: number
  damageTakenMult?: number
  /** Dégâts supplémentaires subis en cas de défaite. */
  damageTakenBonus?: number
}

const rankShort = (r: number) => (r <= 10 ? String(r) : ({ 11: 'Valet', 12: 'Dame', 13: 'Roi', 14: 'As' } as Record<number, string>)[r])
/** Le Cash-Out : ×1.1 après 1 défaite, ×2.5 après 5, ×6.5 après 10, ×12.5 après 15. */
export const cashoutX = (n: number) => 1 + 0.05 * n * (n + 1)
const faceVal = (r: number) => (r === 14 ? 11 : r >= 11 ? 10 : r)
const st = (j: JokerInst, k: string, d = 0) => j.state[k] ?? d

// ---------- fabriques ----------
function suitJoker(id: string, name: string, suit: Suit): JokerDef {
  return {
    id,
    name,
    rarity: 1,
    cost: 5,
    desc: () => `Les ${SUIT_PLURAL[suit]} qui comptent donnent +3 Grit`,
    onScored: (ctx, _j, c, label) => {
      if (isSuit(c, suit, ctx.rules.smeared)) ctx.addMult(3, label)
    },
  }
}

function containsJoker(
  id: string,
  name: string,
  type: HandType,
  eff: { mult?: number; chips?: number; x?: number },
  rarity: Rarity,
  cost: number,
): JokerDef {
  const what = eff.mult ? `+${eff.mult} Grit` : eff.chips ? `+${eff.chips} jetons` : `×${eff.x} Grit`
  return {
    id,
    name,
    rarity,
    cost,
    desc: () => `${what} si la main contient : ${HANDS[type].name}`,
    onJoker: (ctx, _j, label) => {
      if (!ctx.contains.has(type)) return
      if (eff.mult) ctx.addMult(eff.mult, label)
      if (eff.chips) ctx.addChips(eff.chips, label)
      if (eff.x) ctx.xMult(eff.x, label)
    },
  }
}

const LIST: JokerDef[] = [
  // ================= COMMUNS =================
  {
    id: 'joker',
    name: 'Joker',
    rarity: 1,
    cost: 2,
    desc: () => '+4 Grit',
    onJoker: (ctx, _j, l) => ctx.addMult(4, l),
  },
  suitJoker('greedy', 'Joker Avare', 'D'),
  suitJoker('lusty', 'Joker Ardent', 'H'),
  suitJoker('wrathful', 'Joker Colérique', 'S'),
  suitJoker('gluttonous', 'Joker Glouton', 'C'),
  containsJoker('jolly', 'Joker Jovial', 'pair', { mult: 8 }, 1, 3),
  containsJoker('zany', 'Joker Loufoque', 'three', { mult: 12 }, 1, 4),
  containsJoker('mad', 'Joker Fou', 'twoPair', { mult: 10 }, 1, 4),
  containsJoker('crazy', 'Joker Dingue', 'straight', { mult: 12 }, 1, 4),
  containsJoker('droll', 'Joker Drôle', 'flush', { mult: 10 }, 1, 4),
  containsJoker('sly', 'Joker Sournois', 'pair', { chips: 50 }, 1, 3),
  containsJoker('wily', 'Joker Rusé', 'three', { chips: 100 }, 1, 4),
  containsJoker('clever', 'Joker Malin', 'twoPair', { chips: 80 }, 1, 4),
  containsJoker('devious', 'Joker Retors', 'straight', { chips: 100 }, 1, 4),
  containsJoker('crafty', 'Joker Astucieux', 'flush', { chips: 80 }, 1, 4),
  {
    id: 'half',
    name: 'Demi-Joker',
    rarity: 1,
    cost: 5,
    desc: () => '+20 Grit si la main jouée a 3 cartes ou moins',
    onJoker: (ctx, _j, l) => {
      if (ctx.played.length <= 3) ctx.addMult(20, l)
    },
  },
  {
    id: 'banner',
    name: 'Bannière',
    rarity: 1,
    cost: 5,
    desc: () => '+30 jetons par défausse restante',
    onJoker: (ctx, _j, l) => ctx.addChips(30 * ctx.combat.discardsLeft, l),
  },
  {
    id: 'summit',
    name: 'Sommet Mystique',
    rarity: 1,
    cost: 5,
    desc: () => '+15 Grit quand il ne reste aucune défausse',
    onJoker: (ctx, _j, l) => {
      if (ctx.combat.discardsLeft === 0) ctx.addMult(15, l)
    },
  },
  {
    id: 'misprint',
    name: 'Erreur d’impression',
    rarity: 1,
    cost: 4,
    desc: () => '+0 à +23 Grit (aléatoire)',
    onJoker: (ctx, _j, l) => ctx.addMult(ctx.rng.int(0, 23), l),
  },
  {
    id: 'raisedFist',
    name: 'Poing Levé',
    rarity: 1,
    cost: 5,
    desc: () => 'Ajoute le double de la valeur de la plus basse carte gardée en main au Grit',
    onHeld: (ctx, _j, c, l) => {
      const ranked = ctx.held.filter((h) => h.enh !== 'stone' && h.enh !== 'cursed')
      if (!ranked.length) return
      const low = ranked.reduce((a, b) => (b.rank < a.rank ? b : a))
      if (c === low) ctx.addMult(2 * faceVal(c.rank), l)
    },
  },
  {
    id: 'fibonacci',
    name: 'Fibonacci',
    rarity: 2,
    cost: 7,
    desc: () => 'Chaque As, 2, 3, 5 ou 8 qui compte donne +8 Grit',
    onScored: (ctx, _j, c, l) => {
      if (c.enh !== 'stone' && [14, 2, 3, 5, 8].includes(c.rank)) ctx.addMult(8, l)
    },
  },
  {
    id: 'scary',
    name: 'Visage Effrayant',
    rarity: 1,
    cost: 4,
    desc: () => 'Les figures qui comptent donnent +30 jetons',
    onScored: (ctx, _j, c, l) => {
      if (ctx.isFace(c)) ctx.addChips(30, l)
    },
  },
  {
    id: 'smiley',
    name: 'Visage Souriant',
    rarity: 1,
    cost: 4,
    desc: () => 'Les figures qui comptent donnent +5 Grit',
    onScored: (ctx, _j, c, l) => {
      if (ctx.isFace(c)) ctx.addMult(5, l)
    },
  },
  {
    id: 'even',
    name: 'Pair Steven',
    rarity: 1,
    cost: 4,
    desc: () => 'Les cartes paires (10, 8, 6, 4, 2) qui comptent donnent +4 Grit',
    onScored: (ctx, _j, c, l) => {
      if (c.enh !== 'stone' && c.rank <= 10 && c.rank % 2 === 0) ctx.addMult(4, l)
    },
  },
  {
    id: 'odd',
    name: 'Impair Todd',
    rarity: 1,
    cost: 4,
    desc: () => 'Les cartes impaires (A, 9, 7, 5, 3) qui comptent donnent +31 jetons',
    onScored: (ctx, _j, c, l) => {
      if (c.enh !== 'stone' && (c.rank === 14 || (c.rank <= 10 && c.rank % 2 === 1))) ctx.addChips(31, l)
    },
  },
  {
    id: 'scholar',
    name: 'Érudit',
    rarity: 1,
    cost: 4,
    desc: () => 'Les As qui comptent donnent +20 jetons et +4 Grit',
    onScored: (ctx, _j, c, l) => {
      if (c.enh !== 'stone' && c.rank === 14) {
        ctx.addChips(20, l)
        ctx.addMult(4, l)
      }
    },
  },
  {
    id: 'walkie',
    name: 'Talkie-walkie',
    rarity: 1,
    cost: 4,
    desc: () => 'Les 10 et les 4 qui comptent donnent +10 jetons et +4 Grit',
    onScored: (ctx, _j, c, l) => {
      if (c.enh !== 'stone' && (c.rank === 10 || c.rank === 4)) {
        ctx.addChips(10, l)
        ctx.addMult(4, l)
      }
    },
  },
  {
    id: 'abstract',
    name: 'Joker Abstrait',
    rarity: 1,
    cost: 4,
    desc: (_j, p) => `+3 Grit par joker possédé${p ? ` (actuel : +${3 * p.jokers.length})` : ''}`,
    onJoker: (ctx, _j, l) => ctx.addMult(3 * ctx.player.jokers.length, l),
  },
  {
    id: 'grosMichel',
    name: 'Gros Michel',
    rarity: 1,
    cost: 5,
    copyable: true,
    desc: () => '+15 Grit. 1 chance sur 6 d’être détruit à la fin du round',
    onJoker: (ctx, _j, l) => ctx.addMult(15, l),
    onRoundEnd: (_p, _j, { rng }) => (rng.chance(1 / 6) ? { destroy: true, msg: 'Gros Michel a pourri !' } : undefined),
  },
  {
    id: 'golden',
    name: 'Joker Doré',
    rarity: 1,
    cost: 6,
    desc: () => '+4 $ à la fin de chaque round',
    onRoundEnd: () => ({ money: 4 }),
  },
  {
    id: 'egg',
    name: 'Œuf',
    rarity: 1,
    cost: 4,
    desc: (j) => `Gagne 3 $ de valeur de revente à chaque round (revente +${j.sellBonus} $)`,
    onRoundEnd: (_p, j) => {
      j.sellBonus += 3
    },
  },
  {
    id: 'rideBus',
    name: 'Dans le Bus',
    rarity: 1,
    cost: 6,
    desc: (j) => `+1 Grit par main consécutive sans figure qui compte (actuel : +${st(j, 'm')})`,
    before: (ctx, j) => {
      j.state.m = ctx.scoring.some((c) => ctx.isFace(c)) ? 0 : st(j, 'm') + 1
    },
    onJoker: (ctx, j, l) => ctx.addMult(st(j, 'm'), l),
  },
  {
    id: 'supernova',
    name: 'Supernova',
    rarity: 1,
    cost: 5,
    desc: () => 'Ajoute au Grit le nombre de fois que ce type de main a été joué cette partie',
    onJoker: (ctx, _j, l) => ctx.addMult(ctx.player.handPlays[ctx.type] + 1, l),
  },
  {
    id: 'iceCream',
    name: 'Crème Glacée',
    rarity: 1,
    cost: 5,
    desc: (j) => `+${st(j, 'c', 100)} jetons, −5 jetons par main jouée`,
    onJoker: (ctx, j, l) => ctx.addChips(st(j, 'c', 100), l),
    after: (ctx, j) => {
      j.state.c = st(j, 'c', 100) - 5
      if (j.state.c <= 0) {
        ctx.player.jokers = ctx.player.jokers.filter((x) => x !== j)
        jokersGone(ctx.player)
      }
    },
  },
  {
    id: 'popcorn',
    name: 'Pop-corn',
    rarity: 1,
    cost: 5,
    desc: (j) => `+${st(j, 'm', 20)} Grit, −4 Grit à chaque round`,
    onJoker: (ctx, j, l) => ctx.addMult(st(j, 'm', 20), l),
    onRoundEnd: (_p, j) => {
      j.state.m = st(j, 'm', 20) - 4
      if (j.state.m <= 0) return { destroy: true, msg: 'Le Pop-corn est vide.' }
    },
  },
  {
    id: 'blue',
    name: 'Joker Bleu',
    rarity: 1,
    cost: 5,
    desc: () => '+2 jetons par carte restante dans la pioche',
    onJoker: (ctx, _j, l) => ctx.addChips(2 * ctx.combat.drawPile.length, l),
  },
  {
    id: 'green',
    name: 'Joker Vert',
    rarity: 1,
    cost: 4,
    desc: (j) => `+1 Grit par main jouée, −1 par défausse (actuel : +${st(j, 'm')})`,
    before: (_ctx, j) => {
      j.state.m = st(j, 'm') + 1
    },
    onJoker: (ctx, j, l) => ctx.addMult(st(j, 'm'), l),
    onDiscard: (_p, j) => {
      j.state.m = Math.max(0, st(j, 'm') - 1)
      return 0
    },
  },
  {
    id: 'square',
    name: 'Joker Carré',
    rarity: 1,
    cost: 4,
    desc: (j) => `Gagne +4 jetons si la main jouée a exactement 4 cartes (actuel : +${st(j, 'c')})`,
    before: (ctx, j) => {
      if (ctx.played.length === 4) j.state.c = st(j, 'c') + 4
    },
    onJoker: (ctx, j, l) => ctx.addChips(st(j, 'c'), l),
  },
  {
    id: 'business',
    name: 'Carte de Visite',
    rarity: 1,
    cost: 4,
    desc: () => 'Les figures qui comptent ont 1 chance sur 2 de donner 2 $',
    onScored: (ctx, _j, c, l) => {
      if (ctx.isFace(c) && ctx.rng.chance(1 / 2)) ctx.addMoney(2, l)
    },
  },
  {
    id: 'delayed',
    name: 'Gratification Différée',
    rarity: 1,
    cost: 4,
    desc: () => '+2 $ par défausse non utilisée à la fin du round',
    // géré dans la fin de combat (on a besoin des défausses restantes)
  },
  {
    id: 'arrowhead',
    name: 'Pointe de Flèche',
    rarity: 2,
    cost: 7,
    desc: () => 'Les Piques qui comptent donnent +50 jetons',
    onScored: (ctx, _j, c, l) => {
      if (isSuit(c, 'S', ctx.rules.smeared)) ctx.addChips(50, l)
    },
  },
  {
    id: 'onyx',
    name: 'Agate d’Onyx',
    rarity: 2,
    cost: 7,
    desc: () => 'Les Trèfles qui comptent donnent +7 Grit',
    onScored: (ctx, _j, c, l) => {
      if (isSuit(c, 'C', ctx.rules.smeared)) ctx.addMult(7, l)
    },
  },
  {
    id: 'roughGem',
    name: 'Pierre Brute',
    rarity: 2,
    cost: 7,
    desc: () => 'Les Carreaux qui comptent donnent 1 $',
    onScored: (ctx, _j, c, l) => {
      if (isSuit(c, 'D', ctx.rules.smeared)) ctx.addMoney(1, l)
    },
  },
  {
    id: 'bloodstone',
    name: 'Héliotrope',
    rarity: 2,
    cost: 7,
    desc: () => 'Les Cœurs qui comptent ont 1 chance sur 2 de donner ×1.5 Grit',
    onScored: (ctx, _j, c, l) => {
      if (isSuit(c, 'H', ctx.rules.smeared) && ctx.rng.chance(1 / 2)) ctx.xMult(1.5, l)
    },
  },
  {
    id: 'stencil',
    name: 'Joker Pochoir',
    rarity: 2,
    cost: 8,
    desc: () => '×0.25 Grit par emplacement de joker vide (en plus de ×1)',
    onJoker: (ctx, _j, l) => {
      const empty = Math.max(0, ctx.player.maxJokers - ctx.player.jokers.filter((x) => x.edition !== 'negative').length)
      ctx.xMult(1 + 0.25 * empty, l)
    },
  },
  {
    id: 'swashbuckler',
    name: 'Bretteur',
    rarity: 1,
    cost: 4,
    desc: () => 'Ajoute au Grit la valeur de revente de tous les autres jokers',
    onJoker: (ctx, j, l) => {
      const v = ctx.player.jokers.filter((x) => x !== j).reduce((a, x) => a + sellValue(x), 0)
      ctx.addMult(v, l)
    },
  },

  // ================= PEU COMMUNS =================
  {
    id: 'steelJoker',
    name: 'Joker d’Acier',
    rarity: 2,
    cost: 7,
    desc: (_j, p) =>
      `×0.2 Grit par carte d’Acier dans le paquet${p ? ` (actuel : ×${(1 + 0.2 * p.deck.filter((c) => c.enh === 'steel').length).toFixed(1)})` : ''}`,
    onJoker: (ctx, _j, l) => ctx.xMult(1 + 0.2 * ctx.player.deck.filter((c) => c.enh === 'steel').length, l),
  },
  {
    id: 'blackboard',
    name: 'Tableau Noir',
    rarity: 2,
    cost: 6,
    desc: () => '×3 Grit si toutes les cartes gardées en main sont Piques ou Trèfles',
    onJoker: (ctx, _j, l) => {
      if (ctx.held.every((c) => isSuit(c, 'S', ctx.rules.smeared) || isSuit(c, 'C', ctx.rules.smeared))) ctx.xMult(3, l)
    },
  },
  {
    id: 'shootMoon',
    name: 'Viser la Lune',
    rarity: 1,
    cost: 5,
    desc: () => '+13 Grit par Dame gardée en main',
    onHeld: (ctx, _j, c, l) => {
      if (c.enh !== 'stone' && c.rank === 12) ctx.addMult(13, l)
    },
  },
  {
    id: 'photograph',
    name: 'Photographie',
    rarity: 1,
    cost: 5,
    desc: () => 'La première figure qui compte donne ×2 Grit',
    onScored: (ctx, _j, c, l) => {
      if (ctx.scoring.find((x) => ctx.isFace(x)) === c) ctx.xMult(2, l)
    },
  },
  {
    id: 'hack',
    name: 'Piratage',
    rarity: 2,
    cost: 6,
    desc: () => 'Redéclenche chaque 2, 3, 4 et 5 joué',
    retrigger: (_ctx, _j, c) => (c.enh !== 'stone' && c.rank >= 2 && c.rank <= 5 ? 1 : 0),
  },
  {
    id: 'sock',
    name: 'Brodequin et Socque',
    rarity: 2,
    cost: 6,
    desc: () => 'Redéclenche chaque figure jouée',
    retrigger: (ctx, _j, c) => (ctx.isFace(c) ? 1 : 0),
  },
  {
    id: 'dusk',
    name: 'Crépuscule',
    rarity: 2,
    cost: 5,
    desc: () => 'Redéclenche toutes les cartes jouées lors de la dernière main du round',
    retrigger: (ctx) => (ctx.isFinalHand ? 1 : 0),
  },
  {
    id: 'chad',
    name: 'Chad Suspendu',
    rarity: 1,
    cost: 4,
    desc: () => 'Redéclenche 2 fois la première carte qui compte',
    retrigger: (ctx, _j, c) => (ctx.scoring[0] === c ? 2 : 0),
  },
  {
    id: 'mime',
    name: 'Mime',
    rarity: 2,
    cost: 5,
    desc: () => 'Redéclenche les effets des cartes gardées en main',
    retriggerHeld: () => 1,
  },
  {
    id: 'seltzer',
    name: 'Eau Gazeuse',
    rarity: 2,
    cost: 6,
    desc: (j) => `Redéclenche toutes les cartes jouées pour les ${st(j, 'n', 10)} prochaines mains`,
    retrigger: () => 1,
    after: (ctx, j) => {
      j.state.n = st(j, 'n', 10) - 1
      if (j.state.n <= 0) {
        ctx.player.jokers = ctx.player.jokers.filter((x) => x !== j)
        jokersGone(ctx.player)
      }
    },
  },
  {
    id: 'constellation',
    name: 'Constellation',
    rarity: 2,
    cost: 6,
    desc: (j) => `Gagne ×0.1 Grit à chaque planète utilisée (actuel : ×${st(j, 'x', 1).toFixed(1)})`,
    onJoker: (ctx, j, l) => ctx.xMult(st(j, 'x', 1), l),
  },
  {
    id: 'hologram',
    name: 'Hologramme',
    rarity: 2,
    cost: 7,
    desc: (j) => `Gagne ×0.25 Grit à chaque carte ajoutée au paquet (actuel : ×${st(j, 'x', 1).toFixed(2)})`,
    onJoker: (ctx, j, l) => ctx.xMult(st(j, 'x', 1), l),
  },
  {
    id: 'vampire',
    name: 'Vampire',
    rarity: 2,
    cost: 7,
    desc: (j) =>
      `Gagne ×0.1 Grit par carte améliorée jouée qui compte, et lui retire son amélioration (actuel : ×${st(j, 'x', 1).toFixed(1)})`,
    before: (ctx, j) => {
      const enh = ctx.scoring.filter((c) => c.enh && c.enh !== 'stone')
      if (!enh.length) return
      j.state.x = st(j, 'x', 1) + 0.1 * enh.length
      if (!ctx.preview) for (const c of enh) c.enh = undefined
    },
    onJoker: (ctx, j, l) => ctx.xMult(st(j, 'x', 1), l),
  },
  {
    id: 'cardSharp',
    name: 'Tricheur',
    rarity: 2,
    cost: 6,
    desc: () => '×3 Grit si ce type de main a déjà été joué ce round',
    onJoker: (ctx, _j, l) => {
      if (ctx.combat.playedTypes.includes(ctx.type)) ctx.xMult(3, l)
    },
  },
  containsJoker('duo', 'Le Duo', 'pair', { x: 2 }, 3, 8),
  containsJoker('trio', 'Le Trio', 'three', { x: 3 }, 3, 8),
  containsJoker('family', 'La Famille', 'four', { x: 4 }, 3, 8),
  containsJoker('order', 'L’Ordre', 'straight', { x: 3 }, 3, 8),
  containsJoker('tribe', 'La Tribu', 'flush', { x: 2 }, 3, 8),
  {
    id: 'fourFingers',
    name: 'Quatre Doigts',
    rarity: 2,
    cost: 7,
    desc: () => 'Les Couleurs et les Suites peuvent se faire avec 4 cartes',
    rules: { fourFingers: true },
    copyable: false,
  },
  {
    id: 'shortcut',
    name: 'Raccourci',
    rarity: 2,
    cost: 7,
    desc: () => 'Les Suites peuvent avoir des trous d’un rang (ex. 10 8 6 5 3)',
    rules: { shortcut: true },
    copyable: false,
  },
  {
    id: 'smeared',
    name: 'Joker Barbouillé',
    rarity: 2,
    cost: 7,
    desc: () => 'Cœurs et Carreaux comptent comme la même couleur, Piques et Trèfles aussi',
    rules: { smeared: true },
    copyable: false,
  },
  {
    id: 'pareidolia',
    name: 'Paréidolie',
    rarity: 2,
    cost: 5,
    desc: () => 'Toutes les cartes sont considérées comme des figures',
    rules: { pareidolia: true },
    copyable: false,
  },
  {
    id: 'splash',
    name: 'Éclaboussure',
    rarity: 1,
    cost: 3,
    desc: () => 'Toutes les cartes jouées comptent dans le score',
    rules: { splash: true },
    copyable: false,
  },
  {
    id: 'luckyCat',
    name: 'Chat Porte-bonheur',
    rarity: 2,
    cost: 6,
    desc: (j) => `Gagne ×0.25 Grit à chaque déclenchement d’une carte Chance (actuel : ×${st(j, 'x', 1).toFixed(2)})`,
    onJoker: (ctx, j, l) => ctx.xMult(st(j, 'x', 1), l),
  },
  {
    id: 'glassJoker',
    name: 'Joker de Verre',
    rarity: 2,
    cost: 6,
    desc: (j) => `Gagne ×0.75 Grit à chaque carte de Verre brisée (actuel : ×${st(j, 'x', 1).toFixed(2)})`,
    onJoker: (ctx, j, l) => ctx.xMult(st(j, 'x', 1), l),
  },
  {
    id: 'campfire',
    name: 'Feu de Camp',
    rarity: 3,
    cost: 9,
    desc: (j) => `Gagne ×0.25 Grit à chaque carte vendue (actuel : ×${st(j, 'x', 1).toFixed(2)})`,
    onJoker: (ctx, j, l) => ctx.xMult(st(j, 'x', 1), l),
    onSellAny: (_p, j) => {
      j.state.x = st(j, 'x', 1) + 0.25
    },
  },
  {
    id: 'bull',
    name: 'Taureau',
    rarity: 2,
    cost: 6,
    desc: (_j, p) => `+2 jetons par $ possédé${p ? ` (actuel : +${2 * Math.max(0, p.gold)})` : ''}`,
    onJoker: (ctx, _j, l) => ctx.addChips(2 * Math.max(0, ctx.player.gold), l),
  },
  {
    id: 'bootstraps',
    name: 'Débrouillard',
    rarity: 2,
    cost: 7,
    desc: (_j, p) => `+2 Grit par tranche de 5 $ possédés${p ? ` (actuel : +${2 * Math.floor(Math.max(0, p.gold) / 5)})` : ''}`,
    onJoker: (ctx, _j, l) => ctx.addMult(2 * Math.floor(Math.max(0, ctx.player.gold) / 5), l),
  },
  {
    id: 'faceless',
    name: 'Joker sans Visage',
    rarity: 1,
    cost: 4,
    desc: () => '+5 $ si tu défausses 3 figures ou plus d’un coup',
    onDiscard: (p, _j, cards) => (cards.filter((c) => c.enh !== 'stone' && c.rank >= 11 && c.rank <= 13).length >= 3 ? 5 : 0),
  },
  {
    id: 'rocket',
    name: 'Fusée',
    rarity: 2,
    cost: 6,
    desc: (j) => `+${st(j, 'm', 1)} $ à la fin du round. Augmente de 2 $ à chaque victoire`,
    onRoundEnd: (_p, j, { won }) => {
      const m = st(j, 'm', 1)
      if (won) j.state.m = m + 2
      return { money: m }
    },
  },
  {
    id: 'toTheMoon',
    name: 'Vers la Lune',
    rarity: 2,
    cost: 5,
    desc: () => '+1 $ d’intérêt supplémentaire par tranche de 5 $ à la fin du round',
    // géré dans l'économie
  },
  {
    id: 'obelisk',
    name: 'Obélisque',
    rarity: 3,
    cost: 8,
    desc: (j) => `Gagne ×0.2 Grit par main consécutive qui n’est pas ta main la plus jouée (actuel : ×${st(j, 'x', 1).toFixed(1)})`,
    before: (ctx, j) => {
      const plays = ctx.player.handPlays
      const max = Math.max(...Object.values(plays))
      if (max > 0 && plays[ctx.type] === max) j.state.x = 1
      else j.state.x = st(j, 'x', 1) + 0.2
    },
    onJoker: (ctx, j, l) => ctx.xMult(st(j, 'x', 1), l),
  },
  {
    id: 'cavendish',
    name: 'Cavendish',
    rarity: 2,
    cost: 4,
    desc: () => '×3 Grit. 1 chance sur 1000 d’être détruit à la fin du round',
    onJoker: (ctx, _j, l) => ctx.xMult(3, l),
    onRoundEnd: (_p, _j, { rng }) => (rng.chance(1 / 1000) ? { destroy: true, msg: 'Cavendish a pourri !' } : undefined),
  },

  // ================= RARES =================
  {
    id: 'baron',
    name: 'Baron',
    rarity: 3,
    cost: 8,
    desc: () => 'Chaque Roi gardé en main donne ×1.5 Grit',
    onHeld: (ctx, _j, c, l) => {
      if (c.enh !== 'stone' && c.rank === 13) ctx.xMult(1.5, l)
    },
  },
  {
    id: 'blueprint',
    name: 'Plan',
    rarity: 3,
    cost: 10,
    copy: 'right',
    desc: () => 'Copie l’effet du joker à sa droite',
  },
  {
    id: 'brainstorm',
    name: 'Remue-méninges',
    rarity: 3,
    cost: 10,
    copy: 'left',
    desc: () => 'Copie l’effet du joker le plus à gauche',
  },
  {
    id: 'drivers',
    name: 'Permis de Conduire',
    rarity: 3,
    cost: 7,
    desc: (_j, p) =>
      `×3 Grit si le paquet contient au moins 16 cartes améliorées${p ? ` (actuel : ${p.deck.filter((c) => c.enh).length})` : ''}`,
    onJoker: (ctx, _j, l) => {
      if (ctx.player.deck.filter((c) => c.enh).length >= 16) ctx.xMult(3, l)
    },
  },

  // ================= LÉGENDAIRES (via L’Âme) =================
  {
    id: 'triboulet',
    name: 'Triboulet',
    rarity: 4,
    cost: 20,
    desc: () => 'Les Rois et les Dames qui comptent donnent ×2 Grit',
    onScored: (ctx, _j, c, l) => {
      if (c.enh !== 'stone' && (c.rank === 12 || c.rank === 13)) ctx.xMult(2, l)
    },
  },
  {
    id: 'chicot',
    name: 'Chicot',
    rarity: 4,
    cost: 20,
    desc: () => '×1.5 Grit par carte jouée qui compte (max ×4)',
    onJoker: (ctx, _j, l) => ctx.xMult(Math.min(4, Math.pow(1.5, ctx.scoring.length)), l),
  },
  {
    id: 'canio',
    name: 'Canio',
    rarity: 4,
    cost: 20,
    desc: (j) => `Gagne ×1 Grit quand une figure est détruite (actuel : ×${st(j, 'x', 1)})`,
    onJoker: (ctx, j, l) => ctx.xMult(st(j, 'x', 1), l),
  },

  // ================= JOKERS DE LOBBY (idées originales pour le mode PvP) =================
  {
    id: 'duelist',
    name: 'Le Revanchard',
    rarity: 2,
    cost: 6,
    pvp: true,
    desc: () => '×2 Grit si tu as perdu ton dernier combat',
    onJoker: (ctx, _j, l) => {
      if (ctx.player.loseStreak > 0) ctx.xMult(2, l)
    },
  },
  {
    id: 'hotStreak',
    name: 'Série Chaude',
    rarity: 2,
    cost: 7,
    pvp: true,
    desc: (_j, p) => `×0.3 Grit par victoire consécutive${p ? ` (actuel : ×${(1 + 0.3 * p.winStreak).toFixed(1)})` : ''}`,
    onJoker: (ctx, _j, l) => ctx.xMult(1 + 0.3 * ctx.player.winStreak, l),
  },
  {
    id: 'survivor',
    name: 'Le Survivant',
    rarity: 1,
    cost: 5,
    pvp: true,
    desc: (_j, p) => `+1 Grit par tranche de 4 PV perdus${p ? ` (actuel : +${Math.floor((p.maxHp - p.hp) / 4)})` : ''}`,
    onJoker: (ctx, _j, l) => ctx.addMult(Math.floor(Math.max(0, ctx.player.maxHp - ctx.player.hp) / 4), l),
  },
  {
    id: 'executioner',
    name: 'Le Bourreau',
    rarity: 2,
    cost: 6,
    pvp: true,
    desc: () => 'Tes victoires infligent +4 dégâts',
    damageBonus: 4,
  },
  {
    id: 'shield',
    name: 'Le Bouclier',
    rarity: 2,
    cost: 6,
    pvp: true,
    desc: () => 'Tu subis 30 % de dégâts en moins',
    damageTakenMult: 0.7,
  },
  {
    id: 'parasite',
    name: 'Le Parasite',
    rarity: 1,
    cost: 4,
    pvp: true,
    desc: () => 'Chaque victoire te rapporte +3 $',
    onRoundEnd: (_p, _j, { won }) => (won ? { money: 3 } : undefined),
  },
  {
    id: 'scavenger',
    name: 'Le Charognard',
    rarity: 2,
    cost: 6,
    pvp: true,
    desc: (j) => `Quand un joueur est éliminé : +4 $ et +×0.25 Grit permanent (actuel : ×${st(j, 'x', 1).toFixed(2)})`,
    onJoker: (ctx, j, l) => ctx.xMult(st(j, 'x', 1), l),
    onElimination: (_p, j) => {
      j.state.x = st(j, 'x', 1) + 0.25
      return 4
    },
  },
  {
    id: 'underdog',
    name: 'L’Outsider',
    rarity: 1,
    cost: 5,
    pvp: true,
    desc: () => '+12 Grit si ton adversaire a plus de PV que toi',
    onJoker: (ctx, _j, l) => {
      if ((ctx.combat.oppHp ?? 0) > ctx.player.hp) ctx.addMult(12, l)
    },
  },
  {
    id: 'spy',
    name: 'L’Espion',
    rarity: 3,
    cost: 9,
    pvp: true,
    copyable: false,
    desc: () => 'Copie l’effet d’un joker au hasard de ton adversaire du round',
  },
  {
    id: 'pickpocket',
    name: 'Le Pickpocket',
    rarity: 1,
    cost: 5,
    pvp: true,
    desc: () => 'Quand tu gagnes un duel, tu voles 2 $ à ton adversaire',
  },
  {
    id: 'bookmaker',
    name: 'Le Bookmaker',
    rarity: 2,
    cost: 6,
    pvp: true,
    desc: () => 'Avant chaque duel, mise 25 % de ton or (max 10 $) : victoire = mise doublée, défaite = mise perdue',
  },
  {
    id: 'vengeance',
    name: 'La Vengeance',
    rarity: 3,
    cost: 8,
    pvp: true,
    desc: (_j, p) => `×1 Grit de plus par joueur différent qui t’a battu cette partie${p ? ` (actuel : ×${1 + p.beatenBy.length})` : ''}`,
    onJoker: (ctx, _j, l) => ctx.xMult(1 + ctx.player.beatenBy.length, l),
  },
  {
    id: 'kingHill',
    name: 'Le Roi de la Colline',
    rarity: 2,
    cost: 7,
    pvp: true,
    desc: () => '×2 Grit si tu as le plus de PV du lobby. Tes défaites te coûtent 3 PV de plus',
    damageTakenBonus: 3,
    onJoker: (ctx, _j, l) => {
      if (ctx.player.hp >= (ctx.combat.lobbyMaxHp ?? Infinity)) ctx.xMult(2, l)
    },
  },
  {
    id: 'lastBreath',
    name: 'Le Dernier Souffle',
    rarity: 2,
    cost: 6,
    pvp: true,
    desc: () => '×3 Grit quand il te reste 20 PV ou moins',
    onJoker: (ctx, _j, l) => {
      if (ctx.player.hp <= 20) ctx.xMult(3, l)
    },
  },
  {
    id: 'pacifist',
    name: 'Le Pacifiste',
    rarity: 1,
    cost: 4,
    pvp: true,
    desc: () => '+5 $ si ton duel finit à égalité ou par une victoire serrée (moins de 10 % d’écart)',
  },
  {
    id: 'collector',
    name: 'Le Collectionneur',
    rarity: 1,
    cost: 5,
    pvp: true,
    desc: () => '+1 Grit par joker différent présent dans tout le lobby',
    onJoker: (ctx, _j, l) => ctx.addMult(ctx.combat.lobbyJokerKinds ?? 0, l),
  },
  {
    id: 'saboteur',
    name: 'Le Saboteur',
    rarity: 2,
    cost: 6,
    pvp: true,
    desc: () => 'Ton adversaire commence le duel avec 1 défausse de moins',
  },
  {
    id: 'ghostHunter',
    name: 'Le Chasseur de Fantômes',
    rarity: 1,
    cost: 4,
    pvp: true,
    desc: () => '+50 jetons par main contre un fantôme ou un mini-boss',
    onJoker: (ctx, _j, l) => {
      if (ctx.combat.vsGhost || ctx.combat.vsBoss) ctx.addChips(50, l)
    },
  },
  // ================= NOUVEAUX : COMMUNS =================
  {
    id: 'electric',
    name: 'Joker Électrique',
    rarity: 1,
    cost: 4,
    desc: () => '+15 Grit. Jouer une main qui contient une Suite te coûte aussi 1 défausse',
    onJoker: (ctx, _j, l) => ctx.addMult(15, l),
  },
  {
    id: 'gambler',
    name: 'Le Parieur',
    rarity: 1,
    cost: 5,
    desc: () => '1 chance sur 4 de donner ×2 Grit, sinon rien',
    onJoker: (ctx, _j, l) => {
      if (ctx.rng.chance(1 / 4)) ctx.xMult(2, l)
      else ctx.info(l, 'Raté !')
    },
  },
  {
    id: 'brokenMirror',
    name: 'Miroir Brisé',
    rarity: 1,
    cost: 4,
    desc: () => 'Juste avant les jokers, échange tes jetons et ton Grit (les bonus de jetons des jokers deviennent énormes)',
  },
  {
    id: 'rusty',
    name: 'Joker Rouillé',
    rarity: 1,
    cost: 3,
    desc: () => '+10 Grit. Perd 1 $ de valeur de revente à chaque fin de round',
    onJoker: (ctx, _j, l) => ctx.addMult(10, l),
    onRoundEnd: (_p, j) => {
      j.sellBonus -= 1
    },
  },
  {
    id: 'swissKnife',
    name: 'Couteau Suisse',
    rarity: 1,
    cost: 5,
    desc: () => '+20 jetons si la main jouée contient au moins un Cœur, un Carreau, un Pique et un Trèfle',
    onJoker: (ctx, _j, l) => {
      const ok = SUITS.every((s) => ctx.played.some((c) => c.enh !== 'stone' && c.enh !== 'cursed' && isSuit(c, s, ctx.rules.smeared)))
      if (ok) ctx.addChips(20, l)
    },
  },
  {
    id: 'greenBill',
    name: 'Billet Vert',
    rarity: 1,
    cost: 4,
    desc: (_j, p) => `+1 $ à la fin du round par tranche de 10 cartes dans ton paquet${p ? ` (actuel : +${Math.floor(p.deck.length / 10)} $)` : ''}`,
    onRoundEnd: (p) => ({ money: Math.floor(p.deck.length / 10) }),
  },
  {
    id: 'sick',
    name: 'Joker Malade',
    rarity: 1,
    cost: 3,
    desc: (_j, p) => `+5 Grit par tranche de 10 PV qui te manquent${p ? ` (actuel : +${5 * Math.floor(Math.max(0, p.maxHp - p.hp) / 10)})` : ''}`,
    onJoker: (ctx, _j, l) => ctx.addMult(5 * Math.floor(Math.max(0, ctx.player.maxHp - ctx.player.hp) / 10), l),
  },
  {
    id: 'holeySock',
    name: 'Chaussette Trouée',
    rarity: 1,
    cost: 3,
    desc: () => 'Les 2 et les 3 qui comptent donnent +25 jetons',
    onScored: (ctx, _j, c, l) => {
      if (c.enh !== 'stone' && (c.rank === 2 || c.rank === 3)) ctx.addChips(25, l)
    },
  },
  {
    id: 'braggart',
    name: 'Le Fanfaron',
    rarity: 1,
    cost: 4,
    pvp: true,
    desc: () => '+30 jetons par main si tu commences le duel avec strictement moins d’or que ton adversaire',
    onJoker: (ctx, _j, l) => {
      if (ctx.combat.oppGold !== undefined && ctx.player.gold < ctx.combat.oppGold) ctx.addChips(30, l)
    },
  },
  {
    id: 'cashier',
    name: 'L’Encaisseur',
    rarity: 1,
    cost: 5,
    pvp: true,
    desc: () => 'Quand tu perds des PV en duel : +2 $ par tranche de 5 PV perdus (max 10 $)',
  },

  // ================= NOUVEAUX : PEU COMMUNS =================
  {
    id: 'string',
    name: 'Bout de Ficelle',
    rarity: 2,
    cost: 6,
    desc: () => '×1.3 Grit si la main jouée est une Couleur (pas une Quinte flush)',
    onJoker: (ctx, _j, l) => {
      if (ctx.type === 'flush') ctx.xMult(1.3, l)
    },
  },
  {
    id: 'brokenHourglass',
    name: 'Sablier Cassé',
    rarity: 2,
    cost: 6,
    desc: () => '+1 défausse par combat, mais en ligne tu n’as que la moitié du temps pour jouer tes mains',
  },
  {
    id: 'usurer',
    name: 'L’Usurier',
    rarity: 2,
    cost: 7,
    desc: (_j, p) =>
      `Te permet d’emprunter jusqu’à 20 $ à la banque. À chaque fin de round, chaque $ dû te retire 1 PV${p?.debt ? ` (dette : ${p.debt} $)` : ''}`,
  },
  {
    id: 'voodoo',
    name: 'Poupée Vaudou',
    rarity: 2,
    cost: 6,
    pvp: true,
    desc: () => 'Quand tu perds un duel, ton adversaire perd 2 PV, +2 PV par carte maudite dans ton paquet',
  },
  {
    id: 'lead',
    name: 'Joker de Plomb',
    rarity: 2,
    cost: 6,
    pvp: true,
    desc: () => 'Tu subis 50 % de dégâts en moins, mais ×0.8 Grit',
    damageTakenMult: 0.5,
    onJoker: (ctx, _j, l) => ctx.xMult(0.8, l),
  },
  {
    id: 'megalith',
    name: 'Mégalithe',
    rarity: 2,
    cost: 7,
    desc: () => '+50 Grit, mais tu ne pioches plus après avoir joué ou défaussé (seulement ta main de départ)',
    onJoker: (ctx, _j, l) => ctx.addMult(50, l),
  },
  {
    id: 'impostor',
    name: 'L’Imposteur',
    rarity: 2,
    cost: 6,
    pvp: true,
    copyable: false,
    desc: () => 'Copie l’effet du joker le plus à gauche de ton adversaire du round',
  },
  {
    id: 'doubleEdge',
    name: 'Double Tranchant',
    rarity: 2,
    cost: 6,
    pvp: true,
    desc: () => 'Tes victoires infligent +8 dégâts, mais tes défaites te coûtent 4 PV de plus',
    damageBonus: 8,
    damageTakenBonus: 4,
  },
  {
    id: 'catalyst',
    name: 'Catalyseur',
    rarity: 2,
    cost: 7,
    desc: (j) => `Gagne ×0.1 Grit à chaque carte détruite de ton paquet (actuel : ×${st(j, 'x', 1).toFixed(1)})`,
    onJoker: (ctx, j, l) => ctx.xMult(st(j, 'x', 1), l),
  },
  {
    id: 'alchemist',
    name: 'L’Alchimiste',
    rarity: 2,
    cost: 6,
    desc: () => 'Au début de chaque combat, 1 carte au hasard de ta main devient une carte en Or',
  },
  {
    id: 'bodyguard',
    name: 'Garde du Corps',
    rarity: 2,
    cost: 6,
    pvp: true,
    desc: (j) => `Bloque les ${st(j, 'left', 5)} prochains PV de dégâts que tu subis en duel, puis tombe en ruine`,
  },
  {
    id: 'leakyPurse',
    name: 'Bourse Crevée',
    rarity: 2,
    cost: 5,
    desc: () => 'Tu ne gagnes plus d’intérêts, mais les Carreaux qui comptent donnent +10 jetons',
    onScored: (ctx, _j, c, l) => {
      if (isSuit(c, 'D', ctx.rules.smeared)) ctx.addChips(10, l)
    },
  },

  // ================= NOUVEAUX : RARES =================
  {
    id: 'wheelInv',
    name: 'La Roue de la Fortune Inversée',
    rarity: 3,
    cost: 8,
    desc: () => 'Au début de chaque combat, 1 chance sur 3 : toutes les cartes sans amélioration de ta main deviennent Acier, Or, Verre ou Grit (au hasard)',
  },
  {
    id: 'timeMaster',
    name: 'Le Maître du Temps',
    rarity: 3,
    cost: 9,
    desc: () => 'Une fois par combat, tu peux annuler la dernière main jouée et la rejouer',
  },
  {
    id: 'devilPact',
    name: 'Pacte avec le Diable',
    rarity: 3,
    cost: 8,
    desc: () => '×3 Grit. Tu perds 10 PV quand tu obtiens ce joker',
    onJoker: (ctx, _j, l) => ctx.xMult(3, l),
    onAcquire: (p) => {
      p.hp = Math.max(1, p.hp - 10)
      return 'Pacte scellé : −10 PV'
    },
  },
  {
    id: 'strategist',
    name: 'Le Stratège',
    rarity: 3,
    cost: 8,
    desc: (_j, p) => {
      const n = p ? Object.values(p.handPlays).filter((v) => v > 0).length : 0
      return `×0.5 Grit par type de main différent joué cette partie${p ? ` (actuel : ×${(1 + 0.5 * n).toFixed(1)})` : ''}`
    },
    onJoker: (ctx, _j, l) => {
      const types = new Set(Object.entries(ctx.player.handPlays).filter(([, v]) => v > 0).map(([t]) => t))
      types.add(ctx.type)
      ctx.xMult(1 + 0.5 * types.size, l)
    },
  },
  {
    id: 'divineMirror',
    name: 'Joker Miroir Divin',
    rarity: 3,
    cost: 10,
    pvp: true,
    desc: () => 'Quand tu perds un duel, ton adversaire subit 50 % des dégâts qu’il t’inflige',
  },
  {
    id: 'gravedigger',
    name: 'Le Fossoyeur',
    rarity: 3,
    cost: 8,
    desc: (j) =>
      j.state.rank
        ? `Ressuscite la carte détruite (${rankShort(j.state.rank)}) dans ta main de départ à chaque combat, avec +50 jetons`
        : 'Ressuscite la première carte détruite de ton paquet : elle revient dans ta main de départ à chaque combat, avec +50 jetons',
  },
  {
    id: 'champagne',
    name: 'Bouchon de Champagne',
    rarity: 3,
    cost: 9,
    desc: () => '×4 Grit pour la première main du combat, puis ce joker est détruit',
    onJoker: (ctx, _j, l) => {
      if (ctx.combat.handScores.length === 0) ctx.xMult(4, l)
    },
    onRoundEnd: () => ({ destroy: true, msg: 'Le Bouchon de Champagne a sauté !' }),
  },

  {
    id: 'cashout',
    name: 'Le Cash-Out',
    rarity: 3,
    cost: 8,
    pvp: true,
    desc: (j) =>
      j.state.locked
        ? `Encaissé ! ×${cashoutX(st(j, 'n')).toFixed(2)} Grit pour toujours`
        : `Chaque duel perdu d’affilée fait grimper son Grit, de plus en plus vite. À ta première victoire, la valeur est encaissée pour toujours (actuel : ×${cashoutX(st(j, 'n')).toFixed(2)}, ${st(j, 'n')} défaite${st(j, 'n') > 1 ? 's' : ''} de suite)`,
    onJoker: (ctx, j, l) => ctx.xMult(cashoutX(st(j, 'n')), l),
    onRoundEnd: (_p, j, { won, duel }) => {
      if (j.state.locked || !duel) return
      if (won) {
        j.state.locked = 1
        return { msg: `Cash-Out encaissé : ×${cashoutX(st(j, 'n')).toFixed(2)} Grit pour toujours !` }
      }
      j.state.n = st(j, 'n') + 1
    },
  },

  // ================= NOUVEAUX : LÉGENDAIRES =================
  {
    id: 'promethee',
    name: 'Prométhée',
    rarity: 4,
    cost: 20,
    desc: (j) => `Gagne ×0.5 Grit permanent à chaque joker vendu ou détruit (actuel : ×${st(j, 'x', 1).toFixed(1)})`,
    onJoker: (ctx, j, l) => ctx.xMult(st(j, 'x', 1), l),
  },
  {
    id: 'pandora',
    name: 'Pandore',
    rarity: 4,
    cost: 20,
    desc: () => 'Quand tu l’obtiens : ton paquet est remplacé par 15 figures toutes en Acier ou en Verre',
    onAcquire: (p, _j, rng) => {
      p.deck = Array.from({ length: 15 }, () => {
        const c = makeCard(rng.int(11, 13), rng.pick(SUITS))
        c.enh = rng.chance(0.5) ? 'steel' : 'glass'
        if (rng.chance(0.15)) c.edition = rng.pick(['foil', 'holo', 'poly'] as const)
        return c
      })
      return 'La boîte de Pandore est ouverte : ton paquet n’a plus que 15 figures améliorées !'
    },
  },
  {
    id: 'divineDie',
    name: 'Le Dé Divin',
    rarity: 4,
    cost: 20,
    desc: () => 'À chaque main, lance un dé : 1-2 = ×0.5 Grit, 3-4 = ×2 Grit, 5-6 = ×4 Grit',
    onJoker: (ctx, _j, l) => {
      if (ctx.preview) return ctx.xMult(2, l) // estimation moyenne pour l'IA
      const roll = ctx.rng.int(1, 6)
      ctx.info(l, `Dé : ${roll}`)
      ctx.xMult(roll <= 2 ? 0.5 : roll <= 4 ? 2 : 4, l)
    },
  },
  {
    id: 'chronomancer',
    name: 'Le Chronomancien',
    rarity: 4,
    cost: 20,
    desc: () => 'La première main de chaque combat est rejouée automatiquement avec les mêmes cartes (elle compte deux fois)',
  },
  {
    id: 'emperor',
    name: 'L’Empereur',
    rarity: 4,
    cost: 20,
    pvp: true,
    desc: (_j, p) =>
      `×0.5 Grit par joker que tu possèdes (lui compris, à partir de ×1), mais tes défaites te coûtent autant de fois plus de dégâts qu’il y a de jokers${p ? ` (actuel : ×${(0.5 + 0.5 * p.jokers.length).toFixed(1)} Grit, dégâts ×${p.jokers.length})` : ''}`,
    onJoker: (ctx, _j, l) => ctx.xMult(0.5 + 0.5 * ctx.player.jokers.length, l),
  },
  {
    id: 'phoenixAshes',
    name: 'Les Cendres du Phénix',
    rarity: 4,
    cost: 20,
    desc: () => 'Inutile tant que tu es en vie. Si tu devais mourir, tu reviens à 20 PV et les cendres renaissent en Phénix (×3 Grit)',
  },
  {
    id: 'phoenix',
    name: 'Le Phénix',
    rarity: 4,
    cost: 20,
    hidden: true,
    desc: () => '×3 Grit. Renaît des Cendres du Phénix quand tu aurais dû mourir',
    onJoker: (ctx, _j, l) => ctx.xMult(3, l),
  },
  {
    id: 'gluttony',
    name: 'Gluttonie',
    rarity: 4,
    cost: 20,
    desc: (j) => `Une fois par boutique, tu peux sacrifier 5 PV pour lui donner +5 Grit pour toujours (actuel : +${st(j, 'g')} Grit)`,
    onJoker: (ctx, j, l) => ctx.addMult(st(j, 'g'), l),
  },
  {
    id: 'puppeteer',
    name: 'Le Marionnettiste',
    rarity: 4,
    cost: 20,
    pvp: true,
    copyable: false,
    desc: () => 'Au début de chaque duel, prend le contrôle du meilleur joker de ton adversaire : tu l’utilises, et lui le perd pendant ce combat',
  },
  {
    id: 'ouroboros',
    name: 'L’Ouroboros',
    rarity: 4,
    cost: 20,
    desc: (j) =>
      `Chaque main jouée lui donne +×0.2 Grit pour le reste du combat. À la fin du round, il garde 25 % de ce gain pour toujours (base actuelle : ×${st(j, 'x', 1).toFixed(2)})`,
    onJoker: (ctx, j, l) => {
      const gain = st(j, 'c') + 0.2
      if (!ctx.preview) j.state.c = gain
      ctx.xMult(st(j, 'x', 1) + gain, l)
    },
    onRoundEnd: (_p, j) => {
      j.state.x = st(j, 'x', 1) + 0.25 * st(j, 'c')
      j.state.c = 0
    },
  },
  {
    id: 'midas',
    name: 'Midas',
    rarity: 4,
    cost: 20,
    desc: () =>
      'Toutes les cartes que tu joues deviennent en Or. Chaque carte en Or gardée en main donne ×1.2 Grit. Malédiction : à chaque fin de round, tu perds 1 PV par tranche de 3 $ que tu possèdes',
    onJoker: (ctx, _j, l) => {
      const n = ctx.held.filter((c) => c.enh === 'gold').length
      if (n) ctx.xMult(Math.pow(1.2, n), l)
    },
    after: (ctx) => {
      for (const c of ctx.played) if (c.enh !== 'cursed' && c.enh !== 'stone' && !ctx.destroyed.includes(c)) c.enh = 'gold'
    },
  },
  {
    id: 'fateEye',
    name: 'L’Œil du Destin',
    rarity: 4,
    cost: 20,
    desc: () => 'En combat, tu vois les 10 prochaines cartes de ta pioche et tu peux les réordonner. Tes Quintes Flush (et mieux) donnent ×3 Grit',
    onJoker: (ctx, _j, l) => {
      if (['straightFlush', 'five', 'flushHouse', 'flushFive'].includes(ctx.type)) ctx.xMult(3, l)
    },
  },
  {
    id: 'celestialBanker',
    name: 'Le Banquier Céleste',
    rarity: 4,
    cost: 20,
    desc: (j) =>
      `Tes intérêts n’ont plus de maximum. À chaque fin de round, gagne ×0.1 Grit pour toujours par tranche de 10 $ que tu gardes (actuel : ×${st(j, 'x', 1).toFixed(1)})`,
    onJoker: (ctx, j, l) => ctx.xMult(st(j, 'x', 1), l),
    onRoundEnd: (p, j) => {
      j.state.x = st(j, 'x', 1) + 0.1 * Math.floor(Math.max(0, p.gold) / 10)
    },
  },
  {
    id: 'blackHole',
    name: 'Le Trou Noir',
    rarity: 4,
    cost: 20,
    desc: (j) =>
      `Une fois par boutique, il peut avaler un de tes jokers ou un joker en vente : +×0.5 Grit pour toujours (+×2 si c’est un légendaire) (actuel : ×${st(j, 'x', 1).toFixed(1)})`,
    onJoker: (ctx, j, l) => ctx.xMult(st(j, 'x', 1), l),
  },
]

export const JOKERS: Record<string, JokerDef> = Object.fromEntries(LIST.map((d) => [d.id, d]))
export const JOKER_LIST = LIST

export function getJoker(id: string): JokerDef {
  const d = JOKERS[id]
  if (!d) throw new Error(`Joker inconnu : ${id}`)
  return d
}

/** Cible effective d'un joker (les copieurs renvoient la carte copiée, ou null). */
export function resolveCopy(jokers: JokerInst[], index: number, depth = 0): JokerInst | null {
  const j = jokers[index]
  if (!j || depth > jokers.length) return null
  const def = getJoker(j.defId)
  if (!def.copy) return j
  const ti = def.copy === 'right' ? index + 1 : 0
  if (ti === index) return null
  const target = jokers[ti]
  if (!target) return null
  const tdef = getJoker(target.defId)
  if (tdef.copyable === false) return null
  return resolveCopy(jokers, ti, depth + 1)
}

export function sellValue(j: JokerInst): number {
  return Math.max(0, Math.max(1, Math.floor(j.basePrice / 2)) + j.sellBonus)
}

/** Un ou plusieurs jokers ont été vendus ou détruits (Prométhée). */
export function jokersGone(p: Player, n = 1) {
  for (const j of p.jokers) if (j.defId === 'promethee') j.state.x = (j.state.x ?? 1) + 0.5 * n
}

export function countJoker(p: Player, id: string): number {
  return p.jokers.filter((j) => j.defId === id).length
}

export function jokerSlotsUsed(p: Player): number {
  return p.jokers.filter((j) => j.edition !== 'negative').length
}
