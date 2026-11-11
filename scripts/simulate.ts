// Simule des parties complètes (l'humain est joué par l'IA) pour vérifier le moteur.
import { autoPlayHuman, newLobby, seatHuman, unseatHuman } from '../src/engine/game'
import { applyAction } from '../src/engine/actions'
import { evaluateHand } from '../src/engine/hands'
import { makeCard } from '../src/engine/cards'

// --- tests rapides de l'évaluation des mains ---
const h = (s: string) =>
  s.split(' ').map((t) => {
    const suit = t.slice(-1) as 'S' | 'H' | 'D' | 'C'
    const r = t.slice(0, -1)
    const rank = ({ J: 11, Q: 12, K: 13, A: 14 } as Record<string, number>)[r] ?? Number(r)
    return makeCard(rank, suit)
  })
const cases: [string, string, object?][] = [
  ['AS KS QS JS 10S', 'straightFlush'],
  ['AS 2H 3D 4C 5S', 'straight'],
  ['2S 2H 3D 3C 3S', 'fullHouse'],
  ['2S 2H 3D 3C', 'twoPair'],
  ['9S 9H 9D 9C', 'four'],
  ['2S 5S 7S 9S KS', 'flush'],
  ['2S 5S 7S 9S', 'flush', { fourFingers: true }],
  ['10S 8H 6D 5C 3S', 'straight', { shortcut: true }],
  ['2H 5D 7H 9D KH', 'flush', { smeared: true }],
  ['KS', 'high'],
  ['7S 7H 7D 7C 7S', 'five'],
  ['7S 7S 7S 7S 7S', 'flushFive'],
]
for (const [s, want, rules] of cases) {
  const got = evaluateHand(h(s), rules as never).type
  if (got !== want) throw new Error(`${s} → ${got}, attendu ${want}`)
}
console.log('Évaluation des mains : OK')

// --- parties complètes (2 humains joués par l'IA + 6 bots) ---
let totalRounds = 0
const games = Number(process.argv[2] ?? 20)
for (let g = 0; g < games; g++) {
  const gs = newLobby('Test', 1000 + g)
  const friend = seatHuman(gs, 'Ami')!
  applyAction(gs, 0, { type: 'start' })
  let guard = 0
  while (gs.phase !== 'over' && guard++ < 400) {
    for (const id of [0, friend]) if (gs.players[id].alive && !gs.ready[id]) autoPlayHuman(gs, id)
    // un ami qui part en plein milieu redevient un bot
    if (gs.round === 5 && g % 3 === 0 && !gs.players[friend].isBot) unseatHuman(gs, friend)
  }
  if (guard >= 400) throw new Error('Boucle infinie')
  totalRounds += gs.round
  const winner = gs.players.find((p) => p.placement === 1)
  console.log(`Partie ${g + 1}: ${gs.round} rounds, toi #${gs.players[0].placement}, ami #${gs.players[friend].placement}, gagnant ${winner?.name}`)
}
console.log(`Moyenne : ${(totalRounds / games).toFixed(1)} rounds par partie`)
