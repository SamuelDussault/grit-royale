// Types de base du jeu. Le moteur (dossier engine) ne dépend pas de React :
// il pourra tourner tel quel sur un serveur pour le multijoueur en ligne.

export type Suit = 'S' | 'H' | 'D' | 'C' // Pique, Cœur, Carreau, Trèfle

export type Enhancement = 'bonus' | 'mult' | 'wild' | 'glass' | 'steel' | 'stone' | 'gold' | 'lucky' | 'cursed'
export type Edition = 'foil' | 'holo' | 'poly' | 'negative'
export type Seal = 'gold' | 'red' | 'blue' | 'purple'

export interface Card {
  id: number
  rank: number // 2..14 (11 = Valet, 12 = Dame, 13 = Roi, 14 = As)
  suit: Suit
  enh?: Enhancement
  edition?: Edition
  seal?: Seal
  extraChips?: number // jetons bonus permanents (ex. Randonneur)
}

export type HandType =
  | 'high'
  | 'pair'
  | 'twoPair'
  | 'three'
  | 'straight'
  | 'flush'
  | 'fullHouse'
  | 'four'
  | 'straightFlush'
  | 'five'
  | 'flushHouse'
  | 'flushFive'

export interface JokerInst {
  uid: number
  defId: string
  edition?: Edition
  state: Record<string, number>
  sellBonus: number // valeur de revente ajoutée (Œuf, etc.)
  basePrice: number
}

export type ConsumableKind = 'tarot' | 'planet' | 'spectral' | 'curse'

export interface Consumable {
  uid: number
  kind: ConsumableKind
  defId: string
}

export interface Player {
  id: number
  name: string
  isBot: boolean
  hp: number
  maxHp: number
  gold: number
  deck: Card[]
  jokers: JokerInst[]
  consumables: Consumable[]
  handLevels: Record<HandType, number>
  handPlays: Record<HandType, number> // nombre de fois jouée (toute la partie)
  maxJokers: number
  consumableSlots: number
  handsPerRound: number
  discardsPerRound: number
  handSize: number
  winStreak: number
  loseStreak: number
  alive: boolean
  placement: number
  vouchers: string[]
  /** Joueurs qui t'ont battu au moins une fois (La Vengeance). */
  beatenBy: number[]
  /** Mains en moins au prochain combat (malédiction Brouillard). */
  nextHandsMalus?: number
  /** Mode équipes : numéro d'équipe (les coéquipiers partagent leurs PV). */
  team?: number
  /** Mode équipes : le cadeau de joker a déjà été fait. */
  giftUsed?: boolean
  /** L’Usurier : or emprunté à la banque (1 PV perdu par $ dû à chaque fin de round). */
  debt?: number
  lastConsumable?: { kind: ConsumableKind; defId: string } // pour Le Mat
  stats: {
    planetsUsed: number
    tarotsUsed: number
    cardsAdded: number
    glassBroken: number
    luckyTriggers: number
    cardsSold: number
    roundsWon: number
  }
  bot?: BotProfile
}

export interface BotProfile {
  skill: number // 0..1 : qualité des choix de main
  greed: number // 0..1 : tendance à garder de l'or pour les intérêts
  favorite?: HandType
}

export interface CombatState {
  drawPile: Card[]
  hand: Card[]
  handsLeft: number
  discardsLeft: number
  score: number
  handScores: number[]
  playedTypes: HandType[] // types joués ce round
  /** Mains jouées ce combat (pour les spectateurs). */
  history?: { cards: Card[]; type: HandType; total: number }[]
  finished: boolean
  oppHp?: number // PV de l'adversaire (pour certains jokers)
  oppId?: number // -1 = mini-boss
  vsGhost?: boolean
  vsBoss?: boolean
  lobbyMaxHp?: number
  lobbyJokerKinds?: number
  /** L'Espion : joker copié chez l'adversaire, par uid d'Espion. */
  spyCopies?: Record<number, JokerInst>
  /** Jokers volés par le Marionnettiste adverse (inactifs ce combat). */
  stolen?: number[]
  /** Or de l'adversaire au début du duel (Le Fanfaron). */
  oppGold?: number
  /** Le Maître du Temps : rediffusion déjà utilisée ce combat. */
  rewindUsed?: boolean
  /** Le Maître du Temps : une rediffusion est possible maintenant. */
  canRewind?: boolean
}

export interface ScoreTarget {
  card?: number // id de la carte qui déclenche
  joker?: number // uid du joker qui déclenche
  held?: boolean // carte gardée en main
}

export interface ScoreEvent {
  source: string
  text: string
  kind: 'chips' | 'mult' | 'xmult' | 'money' | 'info'
  target?: ScoreTarget
  chips: number // jetons après l'effet (pour animer les compteurs)
  mult: number // Grit après l'effet
}

export interface ScoreResult {
  type: HandType
  baseChips: number
  baseMult: number
  played: Card[]
  scoring: Card[]
  chips: number
  mult: number
  total: number
  events: ScoreEvent[]
  money: number
  destroyed: Card[]
  containsStraight?: boolean
}
