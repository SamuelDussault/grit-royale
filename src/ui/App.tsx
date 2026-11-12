import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Card, Player, ScoreEvent, ScoreResult } from '../engine/types'
import { alivePlayers, waitingFor, type GameState } from '../engine/game'
import type { Action, ActionResult } from '../engine/actions'
import { Session } from '../net/session'
import { sound } from './sound'
import { evaluateHand, handBase, HANDS } from '../engine/hands'
import { collectRules } from '../engine/scoring'
import { getConsumable, jokerRoom, PLANET_LIST, SPECTRAL_LIST, RARE_SPECTRALS, TAROT_LIST } from '../engine/consumables'
import type { ShopItem } from '../engine/shop'
import { JOKER_LIST, sellValue } from '../engine/jokers'
import Background, { type Mood } from './Background'
import { CardBack, PackArt, SvgDefs } from './art'
import {
  ConsumableCard,
  DeckView,
  fmt,
  GameCard,
  HandLevels,
  JokerCard,
  Modal,
  PackCard,
  PlayingCard,
  ScoutView,
  VoucherCard,
} from './parts'

type Toast = { id: number; text: string; bad?: boolean }
type Pop = { id: number; x: number; y: number; text: string; kind: ScoreEvent['kind'] }
type Anim = {
  res: ScoreResult
  played: Card[]
  held: Card[]
  i: number
  chips: number
  mult: number
  stage: 'events' | 'total'
  scoreBefore: number
}
type ModalState = null | { kind: 'deck' | 'levels' | 'matches' | 'collection' } | { kind: 'scout'; id: number }

let popId = 1

// ===================== nombre animé =====================
function Num({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / 450)
      const v = a + (value - a) * (1 - Math.pow(1 - t, 3))
      setShown(v)
      if (t < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    tick()
    return () => {
      cancelAnimationFrame(raf)
      from.current = value
    }
  }, [value])
  return <span className={className}>{fmt(shown)}</span>
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => session?.subscribe(force), [session])
  useEffect(() => {
    const unlock = () => sound.unlock()
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])
  const [selected, setSelected] = useState<number[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [modal, setModal] = useState<ModalState>(null)
  const [sortBy, setSortBy] = useState<'rank' | 'suit'>('rank')
  const [name, setName] = useState('')
  const [anim, setAnim] = useState<Anim | null>(null)
  const [pops, setPops] = useState<Pop[]>([])
  const [juice, setJuice] = useState<Record<string, number>>({})
  const [ending, setEnding] = useState<null | { won: boolean | null; text: string; pending?: boolean }>(null)
  const [jokerSel, setJokerSel] = useState<number | null>(null)
  const [consSel, setConsSel] = useState<number | null>(null)
  const dragFrom = useRef<number | null>(null)

  const gs = session?.gs ?? null
  const meId = session?.meId ?? 0
  const params = new URLSearchParams(location.search)
  const joinId = params.get('join')
  const localNet = params.has('local')

  const toast = (text: string, bad = false) => {
    const id = Math.random()
    setToasts((t) => [...t.slice(-2), { id, text, bad }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), bad ? 2600 : 2000)
  }

  /** Envoie une action au jeu (local ou hôte) et affiche le résultat. */
  const act = async (a: Action, after?: (r: ActionResult) => void) => {
    if (!session) return
    const r = await session.send(a)
    if (r.error) {
      toast(r.error, true)
      sound.error()
    }
    else if (r.msg) toast(r.msg)
    after?.(r)
    force()
    return r
  }

  const spawnPop = (target: string | undefined, text: string, kind: ScoreEvent['kind']) => {
    if (!target) return
    const el = document.querySelector(`[data-target="${target}"]`)
    if (!el) return
    const r = el.getBoundingClientRect()
    const p: Pop = { id: popId++, x: r.left + r.width / 2, y: r.top + 10, text, kind }
    setPops((ps) => [...ps.slice(-14), p])
    setTimeout(() => setPops((ps) => ps.filter((x) => x.id !== p.id)), 750)
    setJuice((j) => ({ ...j, [target]: (j[target] ?? 0) + 1 }))
  }

  // ---------- déroulé de l'animation du calcul ----------
  useEffect(() => {
    if (!anim || !gs) return
    const evs = anim.res.events
    if (anim.stage === 'events') {
      if (anim.i < evs.length) {
        const delay = Math.max(110, 380 - evs.length * 9)
        const t = setTimeout(() => {
          const ev = evs[anim.i]
          const tg = ev.target
          const key = tg?.joker ? `j${tg.joker}` : tg?.card ? `c${tg.card}` : undefined
          spawnPop(key, ev.text, ev.kind)
          sound.bonus(ev.kind, anim.i)
          setAnim({ ...anim, i: anim.i + 1, chips: ev.chips, mult: ev.mult })
        }, anim.i === 0 ? 450 : delay)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => {
        sound.total()
        setAnim({ ...anim, stage: 'total' })
      }, 350)
      return () => clearTimeout(t)
    }
    // total
    const t = setTimeout(() => {
      setAnim(null)
      force()
      const g = session?.gs
      const cs = g?.combats[meId]
      if (g && cs?.finished) {
        const oppId = g.opponents[meId]?.id
        const opp = g.combats[oppId]
        // l'adversaire humain n'a peut-être pas fini : pas de verdict tant qu'on ne sait pas
        const oppDone = g.players[oppId]?.isBot || (!!g.ready[oppId] && !!opp?.finished)
        if (!oppDone) {
          setTimeout(() => {
            sound.neutral()
            setEnding({ won: null, text: 'TERMINÉ', pending: true })
          }, 300)
        } else {
          const won = cs.score === (opp?.score ?? 0) ? null : cs.score > (opp?.score ?? 0)
          // on laisse le score adverse finir de s'afficher avant le verdict
          setTimeout(() => {
            if (won) sound.win()
            else if (won === false) sound.lose()
            else sound.neutral()
            setEnding({ won, text: won === null ? 'ÉGALITÉ' : won ? 'VICTOIRE' : 'DÉFAITE' })
          }, 650)
        }
      }
    }, 900)
    return () => clearTimeout(t)
  }, [anim]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- fin de combat : on enchaîne directement sur la boutique ----------
  useEffect(() => {
    if (!ending || !gs) return
    const t = setTimeout(() => {
      act({ type: 'finishCombat' })
      setEnding(null)
      setSelected([])
      force()
    }, 1700)
    return () => clearTimeout(t)
  }, [ending]) // eslint-disable-line react-hooks/exhaustive-deps

  const mood: Mood = !gs
    ? 'menu'
    : gs.phase === 'over'
      ? gs.players[meId]?.placement === 1
        ? 'win'
        : 'lose'
      : gs.phase === 'shop'
        ? 'shop'
        : ending?.won === false
          ? 'lose'
          : 'combat'

  // ===================== MENU =====================
  if (!gs) {
    return (
      <>
        <Background mood={mood} />
        <SvgDefs />
        <div className="menu">
          <h1 className="logo">
            {'GRIT ROYALE'.split('').map((ch, i) => (
              <span key={i} style={{ animationDelay: `${i * 0.08}s` }}>
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </h1>
          <div className="menu-cards">
            {[
              { id: 1, rank: 14, suit: 'S' as const },
              { id: 2, rank: 13, suit: 'H' as const, enh: 'gold' as const },
              { id: 3, rank: 12, suit: 'D' as const, edition: 'poly' as const },
            ].map((c, i) => (
              <PlayingCard key={c.id} card={c} style={{ transform: `rotate(${(i - 1) * 10}deg) translateY(${i === 1 ? -14 : 0}px)` }} />
            ))}
            <JokerCard defId="joker" style={{ transform: 'rotate(14deg)' }} />
          </div>
          <div className="panel-ui menu-box">
            <input placeholder="Ton nom" value={name} onChange={(e) => setName(e.target.value)} maxLength={14} />
            {session ? (
              <div className="connecting">
                <div>{session.error || session.status}</div>
                {session.error && (
                  <button
                    className="btn orange"
                    onClick={() => {
                      session.close()
                      setSession(null)
                      history.replaceState(null, '', location.pathname)
                    }}
                  >
                    Retour
                  </button>
                )}
              </div>
            ) : joinId ? (
              <div className="menu-btns">
                <button className="btn green big" onClick={() => setSession(Session.join(joinId, name.trim() || 'Ami', localNet))}>
                  REJOINDRE LA PARTIE
                </button>
              </div>
            ) : (
            <div className="menu-btns">
              <button className="btn blue big" onClick={() => setSession(Session.solo(name.trim() || 'Toi'))}>
                SOLO
              </button>
              <button className="btn green big" onClick={() => setSession(Session.host(name.trim() || 'Hôte', localNet))}>
                EN LIGNE
              </button>
              <button className="btn orange big" onClick={() => setModal({ kind: 'collection' })}>
                COLLECTION
              </button>
            </div>
            )}
            <div className="rules">
              <p>8 joueurs · 100 PV · le dernier debout gagne.</p>
              <p>Chaque round : un duel contre un joueur au hasard. 4 mains, 3 défausses : le plus gros total gagne.</p>
              <p>
                Score = <span className="t-chips">jetons</span> × <span className="t-mult">Grit</span>. Entre les rounds : jokers (max 10),
                tarots, planètes, paquets.
              </p>
            </div>
          </div>
        </div>
        {modal?.kind === 'collection' && (
          <Modal title="Collection" onClose={() => setModal(null)}>
            <Collection />
          </Modal>
        )}
      </>
    )
  }

  // ===================== SALLE D'ATTENTE =====================
  if (gs.phase === 'lobby') {
    return (
      <>
        <Background mood="menu" />
        <SvgDefs />
        <LobbyRoom
          gs={gs}
          meId={meId}
          session={session!}
          onStart={() => act({ type: 'start' })}
          onCopy={() => {
            navigator.clipboard?.writeText(session!.inviteLink)
            toast('Lien copié !')
          }}
        />
        <div className="toasts">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.bad ? 'bad' : ''}`}>
              {t.text}
            </div>
          ))}
        </div>
      </>
    )
  }

  const me = gs.players[meId]
  const cs = gs.phase === 'combat' ? gs.combats[meId] : undefined
  const myDone = !!gs.ready[meId]
  const busy = !!anim || !!ending
  const toggle = (id: number) => {
    if (busy) return
    if (selected.includes(id)) sound.deselect()
    else if (selected.length < 5) sound.select()
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 5 ? s : [...s, id]))
  }

  const leave = () => {
    session?.close()
    setSession(null)
    setSelected([])
    history.replaceState(null, '', location.pathname)
  }

  const sortCards = (cards: Card[]) =>
    [...cards].sort((a, b) =>
      sortBy === 'rank' ? b.rank - a.rank || a.suit.localeCompare(b.suit) : a.suit.localeCompare(b.suit) || b.rank - a.rank,
    )

  // ---------- actions combat ----------
  const doPlay = () => {
    if (!cs || busy || !selected.length) return
    // on joue dans l'ordre affiché (gauche → droite)
    const ordered = sortCards(cs.hand)
    const played = ordered.filter((c) => selected.includes(c.id))
    const held = ordered.filter((c) => !selected.includes(c.id))
    const scoreBefore = cs.score
    setSelected([])
    sound.playHand()
    act({ type: 'play', ids: played.map((c) => c.id) }, (r) => {
      if (r.score) setAnim({ res: r.score, played, held, i: 0, chips: r.score.baseChips, mult: r.score.baseMult, stage: 'events', scoreBefore })
    })
  }
  const doDiscard = () => {
    if (!cs || busy) return
    sound.discard()
    act({ type: 'discard', ids: selected }, () => setSelected([]))
  }

  const useCons = (uid: number) =>
    act({ type: 'use', uid, ids: selected }, (r) => {
      if (!r.error) {
        setSelected([])
        setConsSel(null)
      }
    })

  // ---------- plateau de jokers ----------
  const jokerTray = (
    <div className="tray-wrap jokers-wrap">
      <div className="tray">
        {me.jokers.length === 0 && <div className="tray-empty">Jokers</div>}
        {me.jokers.map((j, i) => {
          const n = me.jokers.length
          const ml = i === 0 ? 0 : n > 7 ? -Math.min(46, (n - 7) * 10) : 6
          return (
            <div key={j.uid} className={`tray-slot ${jokerSel === j.uid ? 'sel' : ''}`} style={{ marginLeft: ml, zIndex: jokerSel === j.uid ? 50 : i }}>
              <JokerCard
                defId={j.defId}
                edition={j.edition}
                inst={j}
                player={me}
                tipBelow
                selected={jokerSel === j.uid}
                juice={juice[`j${j.uid}`]}
                onClick={() => setJokerSel(jokerSel === j.uid ? null : j.uid)}
                draggable={!busy}
                onDragStart={() => (dragFrom.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  const from = dragFrom.current
                  if (from === null || from === i) return
                  dragFrom.current = null
                  act({ type: 'moveJoker', from, to: i })
                }}
                overlay={
                  !busy && (
                    <button
                      className="btn green sell-btn"
                      onClick={() => {
                        sound.sell()
                        act({ type: 'sellJoker', uid: j.uid }, () => setJokerSel(null))
                      }}
                    >
                      Vendre <span className="t-money-dark">{sellValue(j)} $</span>
                    </button>
                  )
                }
              />
            </div>
          )
        })}
      </div>
      <div className="tray-count">
        {me.jokers.filter((j) => j.edition !== 'negative').length}/{me.maxJokers}
        <span className="muted"> · survole un joker : bouton </span>
        <span className="t-green">Vendre</span>
        <span className="muted"> · glisse pour réordonner</span>
      </div>
    </div>
  )

  const consTray = (
    <div className="tray-wrap cons-wrap">
      <div className="tray">
        {me.consumables.length === 0 && <div className="tray-empty">Consommables</div>}
        {me.consumables.map((c, i) => (
          <div key={c.uid} className={`tray-slot ${consSel === c.uid ? 'sel' : ''}`} style={{ marginLeft: i ? 6 : 0, zIndex: consSel === c.uid ? 50 : i }}>
            <ConsumableCard
              kind={c.kind}
              defId={c.defId}
              tipBelow
              selected={consSel === c.uid}
              onClick={() => setConsSel(consSel === c.uid ? null : c.uid)}
              overlay={
                !busy && (
                  <div className="cons-btns">
                    <button className="btn red sell-btn" onClick={() => useCons(c.uid)}>
                      Utiliser
                    </button>
                    <button
                      className="btn green sell-btn"
                      onClick={() => {
                        sound.sell()
                        act({ type: 'sellCons', uid: c.uid }, () => setConsSel(null))
                      }}
                    >
                      Vendre
                    </button>
                  </div>
                )
              }
            />
          </div>
        ))}
      </div>
      <div className="tray-count">
        {me.consumables.length}/{me.consumableSlots}
      </div>
    </div>
  )

  // ---------- valeurs affichées dans la barre latérale ----------
  const sel = cs ? cs.hand.filter((c) => selected.includes(c.id)) : []
  const preview = sel.length ? evaluateHand(sel, collectRules(me.jokers)) : null
  let handLabel = ''
  let chips = 0
  let mult = 0
  if (anim) {
    handLabel = HANDS[anim.res.type].name
    chips = anim.chips
    mult = anim.mult
  } else if (preview) {
    const b = handBase(preview.type, me.handLevels[preview.type])
    handLabel = HANDS[preview.type].name
    chips = b.chips
    mult = b.mult
  }
  const handLevel = anim ? me.handLevels[anim.res.type] : preview ? me.handLevels[preview.type] : 0
  const myScore = cs ? (anim && anim.stage === 'events' ? anim.scoreBefore : cs.score) : 0
  const oppInfo = gs.phase === 'combat' ? gs.opponents[meId] : undefined
  const opp = oppInfo ? gs.players[oppInfo.id] : undefined
  const oppCombat = opp ? gs.combats[opp.id] : undefined
  const revealed = cs ? cs.handScores.length - (anim ? 1 : 0) : 0
  const oppScore = oppCombat ? oppCombat.handScores.slice(0, cs?.finished && !anim ? 99 : revealed).reduce((a, b) => a + b, 0) : 0

  // ===================== BARRE LATÉRALE =====================
  const sidebar = (
    <aside className="sidebar panel-ui">
      {gs.phase === 'combat' && opp ? (
        <div className="blind red">
          <div className="blind-head">
            Round {gs.round} · Duel {oppInfo?.ghost && <span className="ghost">fantôme</span>}
            <Countdown session={session!} />
          </div>
          <div className="blind-body">
            <div className="opp-avatar" style={{ background: avatarColor(opp.id) }}>
              {opp.name[0]}
            </div>
            <div>
              <div className="opp-name">{opp.name}{!opp.isBot && ' 👤'}</div>
              <div className="hp">♥ {opp.hp} PV</div>
            </div>
            <div className="opp-score">
              <div className="muted small">Score adverse</div>
              <Num value={oppScore} className="t-red big-num" />
            </div>
          </div>
        </div>
      ) : (
        <div className="blind green">
          <div className="blind-head">
            {gs.phase === 'over' ? 'Fin de partie' : 'Boutique'}
            {gs.phase === 'shop' && <Countdown session={session!} />}
          </div>
          <div className="blind-body center">
            <div className="muted">{gs.phase === 'over' ? `${gs.round} rounds joués` : `Prochain round : ${gs.round + 1}`}</div>
          </div>
        </div>
      )}

      <div className="box score-box">
        <div className="muted small">Score du round</div>
        <Num value={myScore} className="big-num" />
      </div>

      <div className={`box hand-box ${anim?.stage === 'total' ? 'flash' : ''}`}>
        <div className="hand-name">
          {anim?.stage === 'total' ? fmt(anim.res.total) : handLabel || ' '}
          {handLevel > 0 && anim?.stage !== 'total' && <span className="lvl"> niv.{handLevel}</span>}
        </div>
        <div className="cm">
          <div className="chips-box" key={`c${chips}`}>
            {fmt(chips)}
          </div>
          <div className="x">×</div>
          <div className="mult-box" key={`m${mult}`}>
            {Number.isInteger(mult) ? fmt(mult) : mult.toFixed(1)}
          </div>
        </div>
      </div>

      <div className="side-grid">
        <div className="side-buttons">
          <button className="btn red tall" onClick={() => setModal({ kind: 'levels' })}>
            Mains
          </button>
          <button className="btn orange tall" onClick={() => setModal({ kind: 'deck' })}>
            Paquet
          </button>
          <SoundButtons />
        </div>
        <div className="stats">
          <div className="box stat">
            <div className="muted small">Mains</div>
            <div className="t-chips stat-num">{cs ? cs.handsLeft : me.handsPerRound}</div>
          </div>
          <div className="box stat">
            <div className="muted small">Défausses</div>
            <div className="t-mult stat-num">{cs ? cs.discardsLeft : me.discardsPerRound}</div>
          </div>
          <div className="box stat wide">
            <Num value={me.gold} className="t-money gold-num" />
            <span className="t-money gold-num">$</span>
          </div>
          <div className="box stat">
            <div className="muted small">PV</div>
            <div className="stat-num hp">{Math.max(0, me.hp)}</div>
          </div>
          <div className="box stat">
            <div className="muted small">Round</div>
            <div className="stat-num t-orange">{gs.round}</div>
          </div>
        </div>
      </div>

      <Lobby gs={gs} meId={meId} onScout={(id) => setModal({ kind: 'scout', id })} />
    </aside>
  )

  return (
    <>
      <Background mood={mood} />
      <SvgDefs />
      <div className="game">
        {sidebar}
        <div className="stage">
          <div className="top-row">
            {jokerTray}
            {consTray}
          </div>

          {!me.alive && gs.phase !== 'over' && (
            <div className="wait-panel panel-ui">
              <div className="stamp static lose">{me.placement}e PLACE</div>
              <p>Tu es éliminé·e. La partie continue : clique un joueur du lobby pour regarder ses jokers.</p>
              <button className="btn orange" onClick={() => leave()}>
                Quitter la partie
              </button>
            </div>
          )}

          {me.alive && gs.phase === 'combat' && myDone && !anim && !ending && <WaitPanel gs={gs} text="Combat terminé !" />}
          {me.alive && gs.phase === 'shop' && myDone && <WaitPanel gs={gs} text="Prêt !" />}

          {me.alive && gs.phase === 'combat' && cs && (!myDone || anim || ending) && (
            <CombatArea
              me={me}
              cs={cs}
              anim={anim}
              juice={juice}
              selected={selected}
              toggle={toggle}
              sortCards={sortCards}
              sortBy={sortBy}
              setSortBy={setSortBy}
              busy={busy}
              onPlay={doPlay}
              onDiscard={doDiscard}
            />
          )}

          {me.alive && gs.phase === 'shop' && !myDone && (
            <ShopArea
              gs={gs}
              me={me}
              meId={meId}
              selected={selected}
              toggle={toggle}
              onMatches={() => setModal({ kind: 'matches' })}
              onBuy={(item) =>
                act({ type: 'buy', key: item.key }, (r) => {
                  if (r.error) return
                  if (r.packOpened) {
                    setSelected([])
                    sound.packOpen()
                  } else sound.coin()
                })
              }
              onReroll={() => act({ type: 'reroll' }, (r) => !r.error && sound.reroll())}
              onPick={(i) => act({ type: 'pick', index: i, ids: selected }, (r) => !r.error && setSelected([]))}
              onSkipPack={() => act({ type: 'skipPack' })}
              onReady={() => {
                setSelected([])
                setJokerSel(null)
                setConsSel(null)
                act({ type: 'ready' })
              }}
            />
          )}

          {gs.phase === 'over' && (
            <GameOver gs={gs} meId={meId} onRestart={() => leave()} />
          )}
        </div>
      </div>

      {ending && (
        <div className="stamp-wrap">
          <div className={`stamp ${ending.pending ? 'done' : ending.won ? 'win' : ending.won === null ? 'tie' : 'lose'}`}>{ending.text}</div>
          {ending.pending && <div className="stamp-sub">Le résultat s’affichera quand ton adversaire aura fini.</div>}
        </div>
      )}

      <div className="pops">
        {pops.map((p) => (
          <div key={p.id} className={`pop pop-${p.kind}`} style={{ left: p.x, top: p.y }}>
            {p.text}
          </div>
        ))}
      </div>

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.bad ? 'bad' : ''}`}>
            {t.text}
          </div>
        ))}
      </div>

      {modal?.kind === 'deck' && (
        <Modal title="Ton paquet" onClose={() => setModal(null)}>
          <DeckView player={me} />
        </Modal>
      )}
      {modal?.kind === 'levels' && (
        <Modal title="Mains de poker" onClose={() => setModal(null)}>
          <HandLevels player={me} />
        </Modal>
      )}
      {modal?.kind === 'scout' && (
        <Modal title={gs.players[modal.id].name} onClose={() => setModal(null)}>
          <ScoutView player={gs.players[modal.id]} />
        </Modal>
      )}
      {modal?.kind === 'matches' && gs.lastReport && (
        <Modal title={`Round ${gs.lastReport.round} : tous les duels`} onClose={() => setModal(null)}>
          <MatchList gs={gs} meId={meId} />
        </Modal>
      )}
    </>
  )
}

function avatarColor(id: number): string {
  return ['#0093ff', '#fd5f55', '#35bd86', '#fda200', '#b26cbb', '#4cc9f0', '#f15bb5', '#90be6d', '#f9c74f', '#577590', '#ef476f', '#06d6a0'][id % 12]
}

// ===================== LOBBY =====================
function Lobby({ gs, meId, onScout }: { gs: GameState; meId: number; onScout: (id: number) => void }) {
  const list = [...gs.players].sort((a, b) => (a.alive === b.alive ? b.hp - a.hp || a.id - b.id : a.alive ? -1 : 1))
  return (
    <div className="lobby box">
      <div className="muted small lobby-title">Lobby · {alivePlayers(gs).length} en vie</div>
      {list.map((p) => (
        <div
          key={p.id}
          className={`lobby-row ${p.alive ? '' : 'dead'} ${p.id === meId ? 'me' : ''} ${p.id === gs.opponents[meId]?.id && gs.phase === 'combat' ? 'opp' : ''}`}
          onClick={() => onScout(p.id)}
          title="Voir ses jokers"
        >
          <span className="avatar" style={{ background: avatarColor(p.id) }}>
            {p.name[0]}
          </span>
          <span className="lname">
            {p.name}
            {!p.isBot && ' 👤'}
          </span>
          <span className="lhp">
            {p.alive ? (
              <>
                <span className="hpbar">
                  <span style={{ width: `${Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100))}%` }} />
                </span>
                {Math.max(0, p.hp)}
              </>
            ) : (
              `#${p.placement}`
            )}
          </span>
          {p.alive && p.winStreak >= 2 && <span className="streak">🔥{p.winStreak}</span>}
        </div>
      ))}
    </div>
  )
}

// ===================== COMBAT =====================
function CombatArea(props: {
  me: Player
  cs: GameState['combats'][number]
  anim: Anim | null
  juice: Record<string, number>
  selected: number[]
  toggle: (id: number) => void
  sortCards: (c: Card[]) => Card[]
  sortBy: 'rank' | 'suit'
  setSortBy: (s: 'rank' | 'suit') => void
  busy: boolean
  onPlay: () => void
  onDiscard: () => void
}) {
  const { me, cs, anim, juice, selected, busy } = props
  const hand = anim ? anim.held : props.sortCards(cs.hand)
  const n = hand.length
  const scoringIds = useMemo(() => new Set(anim?.res.scoring.map((c) => c.id) ?? []), [anim])

  return (
    <div className="combat">
      <div className="play-area">
        {anim ? (
          <div className="played-row">
            {anim.played.map((c, i) => (
              <div key={c.id} className={`played-slot ${scoringIds.has(c.id) ? 'scoring' : 'dud'}`} style={{ animationDelay: `${i * 60}ms` }}>
                <PlayingCard card={c} juice={juice[`c${c.id}`]} />
              </div>
            ))}
          </div>
        ) : (
          <div className="play-hint">{cs.finished ? '' : selected.length ? 'Jouer ou défausser ?' : 'Sélectionne jusqu’à 5 cartes'}</div>
        )}
      </div>

      <div className="hand-zone">
        <div className="hand">
          {hand.map((c, i) => {
            const mid = (n - 1) / 2
            const off = i - mid
            const sel = selected.includes(c.id)
            return (
              <div
                key={c.id}
                className="hand-slot"
                style={{
                  transform: `translateY(${Math.abs(off) * Math.abs(off) * 1.3 - (sel ? 34 : 0)}px) rotate(${off * 2.6}deg)`,
                  marginLeft: i === 0 ? 0 : n > 8 ? -26 - (n - 8) * 6 : -14,
                  zIndex: i,
                }}
              >
                <PlayingCard card={c} selected={sel} onClick={() => props.toggle(c.id)} juice={juice[`c${c.id}`]} />
              </div>
            )
          })}
        </div>
        <div className="deck-pile" title={`${cs.drawPile.length} cartes dans la pioche`}>
          <div className="pile">
            <GameCard className="pcard">
              <CardBack />
            </GameCard>
          </div>
          <div className="pile-count">
            {cs.drawPile.length}/{me.deck.length}
          </div>
        </div>
      </div>

      <div className="hand-actions">
        <button className="btn blue big" disabled={busy || !selected.length || cs.finished} onClick={props.onPlay}>
          Jouer la main
        </button>
        <div className="sort-box">
          <div className="muted small">Trier</div>
          <div className="sort-btns">
            <button className={`btn orange sm ${props.sortBy === 'rank' ? 'on' : ''}`} onClick={() => props.setSortBy('rank')}>
              Valeur
            </button>
            <button className={`btn orange sm ${props.sortBy === 'suit' ? 'on' : ''}`} onClick={() => props.setSortBy('suit')}>
              Couleur
            </button>
          </div>
        </div>
        <button className="btn red big" disabled={busy || !selected.length || cs.discardsLeft <= 0 || cs.finished} onClick={props.onDiscard}>
          Défausser
        </button>
      </div>
    </div>
  )
}

// ===================== BOUTIQUE =====================
function ShopArea(props: {
  gs: GameState
  me: Player
  meId: number
  selected: number[]
  toggle: (id: number) => void
  onMatches: () => void
  onBuy: (item: ShopItem) => unknown
  onReroll: () => unknown
  onPick: (i: number) => unknown
  onSkipPack: () => unknown
  onReady: () => unknown
}) {
  const { gs, me } = props
  const shop = gs.shops[props.meId]
  const pack = gs.packs[props.meId]
  const rep = gs.lastReport

  const priced = (item: ShopItem, card: React.ReactNode) => (
    <div key={item.key} className={`shop-item ${item.sold ? 'sold' : ''}`}>
      <div className="price">{item.sold ? '—' : `${item.price} $`}</div>
      {card}
      {!item.sold && (
        <button
          className="btn green sm buy"
          disabled={me.gold < item.price || (item.kind === 'joker' && !jokerRoom(me, { edition: item.edition } as never))}
          onClick={() => props.onBuy(item)}
        >
          {item.kind === 'pack' ? 'Ouvrir' : 'Acheter'}
        </button>
      )}
    </div>
  )

  const itemCard = (item: ShopItem) => {
    if (item.kind === 'joker') return priced(item, <JokerCard defId={item.id} edition={item.edition} />)
    if (item.kind === 'pack') return priced(item, <PackCard kind={item.packKind!} size={item.packSize!} />)
    if (item.kind === 'voucher') return priced(item, <VoucherCard id={item.id} />)
    return priced(item, <ConsumableCard kind={item.kind} defId={item.id} />)
  }

  // résumé du dernier round
  let banner: React.ReactNode = null
  if (rep) {
    const m = rep.matches.find((x) => x.a === me.id || (x.b === me.id && !x.ghostB))
    if (m) {
      const iAmA = m.a === me.id
      const mine = iAmA ? m.scoreA! : m.scoreB!
      const theirs = iAmA ? m.scoreB! : m.scoreA!
      const oppId = iAmA ? m.b : m.a
      const won = m.winner === me.id
      const tie = m.winner === null
      const myGold = rep.gold[me.id] ?? []
      const myMsgs = rep.messages[me.id] ?? []
      const total = myGold.reduce((a, b) => a + b.amount, 0)
      banner = (
        <div className={`banner ${tie ? 'tie' : won ? 'win' : 'lose'}`}>
          <div className="banner-main">
            <span className="banner-title">{tie ? 'Égalité' : won ? 'Victoire !' : 'Défaite'}</span>
            <span>
              {fmt(mine)} contre {fmt(theirs)} ({gs.players[oppId].name})
            </span>
            {!tie && (
              <span className={won ? 't-chips' : 't-mult'}>
                {won ? (m.ghostB && iAmA ? 'fantôme : pas de dégâts' : `${gs.players[oppId].name} −${m.damage} PV`) : `−${m.damage} PV`}
              </span>
            )}
          </div>
          <div className="banner-gold">
            <span className="t-money">+{total} $</span>
            <span className="muted small">{myGold.map((g) => `${g.label} +${g.amount}`).join(' · ')}</span>
            <button className="btn orange sm" onClick={props.onMatches}>
              Tous les duels
            </button>
          </div>
          {myMsgs.length > 0 && <div className="muted small">{myMsgs.join(' · ')}</div>}
        </div>
      )
    }
  }

  return (
    <div className="shop">
      {banner}
      {pack ? (
        <PackOpening key={pack.id} pack={pack} selected={props.selected} toggle={props.toggle} onPick={props.onPick} onSkip={props.onSkipPack} />
      ) : (
        <div className="shop-panel panel-ui">
          <div className="shop-left">
            <button className="btn red tall xl" onClick={props.onReady}>
              Prochain
              <br />
              round
            </button>
            <button className="btn green tall" disabled={me.gold < shop.rerollCost} onClick={props.onReroll}>
              Relancer
              <br />
              <span className="t-money-dark">{shop.rerollCost} $</span>
            </button>
          </div>
          <div className="shop-right">
            <div className="shop-row cards">{shop.cards.map(itemCard)}</div>
            <div className="shop-row bottom">
              <div className="voucher-zone">
                <div className="zone-label">Bon</div>
                {shop.voucher ? itemCard(shop.voucher) : <div className="muted">—</div>}
              </div>
              <div className="pack-zone">
                <div className="zone-label">Paquets</div>
                <div className="shop-row">{shop.packs.map(itemCard)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      <IncomeBox me={me} />
    </div>
  )
}

function MatchList({ gs, meId }: { gs: GameState; meId: number }) {
  const r = gs.lastReport!
  return (
    <div className="matches">
      {r.matches.map((m, i) => {
        const A = gs.players[m.a]
        const B = gs.players[m.b]
        const loser = m.winner === null ? null : m.winner === m.a ? B : A
        return (
          <div key={i} className={`match ${m.a === meId || (m.b === meId && !m.ghostB) ? 'mine' : ''}`}>
            <span className={m.winner === m.a ? 'w' : ''}>{A.name}</span>
            <span className="t-chips">{fmt(m.scoreA ?? 0)}</span>
            <span className="muted">vs</span>
            <span className="t-chips">{fmt(m.scoreB ?? 0)}</span>
            <span className={m.winner === m.b ? 'w' : ''}>
              {B.name}
              {m.ghostB ? ' (fantôme)' : ''}
            </span>
            <span className="t-mult">
              {m.winner === null ? 'égalité' : m.ghostB && m.winner === m.a ? 'aucun dégât' : `${loser!.name} −${m.damage} PV`}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function GameOver({ gs, meId, onRestart }: { gs: GameState; meId: number; onRestart: () => void }) {
  const me = gs.players[meId]
  const won = me.placement === 1
  const ranking = [...gs.players].sort((a, b) => (a.placement || 99) - (b.placement || 99))
  return (
    <div className="gameover panel-ui">
      <div className={`stamp static ${won ? 'win' : 'lose'}`}>{won ? 'VICTOIRE ROYALE' : `${me.placement}e PLACE`}</div>
      <p className="muted">
        {gs.round} rounds · {me.stats.roundsWon} duels gagnés
      </p>
      <div className="ranking">
        {ranking.map((p) => (
          <div key={p.id} className={`rank-row ${p.id === me.id ? 'me' : ''}`}>
            <span className="t-orange">#{p.placement || '?'}</span>
            <span className="avatar" style={{ background: avatarColor(p.id) }}>
              {p.name[0]}
            </span>
            <span>{p.name}</span>
            <span className="muted small">{p.jokers.length} jokers</span>
          </div>
        ))}
      </div>
      <button className="btn blue big" onClick={onRestart}>
        Nouvelle partie
      </button>
    </div>
  )
}

function Collection() {
  const [tab, setTab] = useState<'jokers' | 'tarot' | 'planet' | 'spectral'>('jokers')
  return (
    <div className="collection">
      <div className="tabs">
        <button className={`btn red sm ${tab === 'jokers' ? 'on' : ''}`} onClick={() => setTab('jokers')}>
          Jokers ({JOKER_LIST.length})
        </button>
        <button className={`btn red sm ${tab === 'tarot' ? 'on' : ''}`} onClick={() => setTab('tarot')}>
          Tarots
        </button>
        <button className={`btn red sm ${tab === 'planet' ? 'on' : ''}`} onClick={() => setTab('planet')}>
          Planètes
        </button>
        <button className={`btn red sm ${tab === 'spectral' ? 'on' : ''}`} onClick={() => setTab('spectral')}>
          Spectrales
        </button>
      </div>
      <div className="collection-grid">
        {tab === 'jokers' && JOKER_LIST.map((j) => <JokerCard key={j.id} defId={j.id} tipBelow />)}
        {tab === 'tarot' && TAROT_LIST.map((c) => <ConsumableCard key={c.id} kind="tarot" defId={c.id} tipBelow />)}
        {tab === 'planet' && PLANET_LIST.map((c) => <ConsumableCard key={c.id} kind="planet" defId={c.id} tipBelow />)}
        {tab === 'spectral' && [...SPECTRAL_LIST, ...RARE_SPECTRALS].map((c) => <ConsumableCard key={c.id} kind="spectral" defId={c.id} tipBelow />)}
      </div>
    </div>
  )
}

function PackOpening({
  pack,
  selected,
  toggle,
  onPick,
  onSkip,
}: {
  pack: NonNullable<GameState['packs'][number]>
  selected: number[]
  toggle: (id: number) => void
  onPick: (i: number) => void
  onSkip: () => void
}) {
  const [phase, setPhase] = useState<'shake' | 'burst' | 'open'>('shake')
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('burst'), 800)
    const t2 = setTimeout(() => setPhase('open'), 1150)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  if (phase !== 'open')
    return (
      <div className="pack-open panel-ui pack-stage">
        <div className={`pack-big ${phase}`}>
          <PackArtBig kind={pack.kind} size={pack.size} />
        </div>
        {phase === 'burst' && (
          <>
            <div className="burst" />
            {Array.from({ length: 14 }, (_, i) => (
              <span key={i} className="spark" style={{ '--a': `${(i / 14) * 360}deg`, '--d': `${90 + (i % 3) * 40}px` } as React.CSSProperties} />
            ))}
          </>
        )}
      </div>
    )

  return (
    <div className="pack-open panel-ui">
      <div className="pack-title">
        {pack.name} <span className="muted">— choisis-en {pack.picksLeft}</span>
      </div>
      <div className="pack-options">
        {pack.options.map((o, i) => {
          const card =
            o.kind === 'joker' ? (
              <JokerCard defId={o.id!} edition={o.edition} />
            ) : o.kind === 'card' ? (
              <PlayingCard card={o.card!} />
            ) : (
              <ConsumableCard kind={o.kind} defId={o.id!} />
            )
          const needs = o.id && o.kind !== 'joker' && o.kind !== 'card' ? getConsumable(o.id).select : undefined
          return (
            <div key={i} className={`shop-item deal ${o.taken ? 'sold' : ''}`} style={{ animationDelay: `${i * 110}ms` }}>
              {card}
              {!o.taken && (
                <button className="btn green sm buy" onClick={() => onPick(i)}>
                  {o.kind === 'joker' || o.kind === 'card' ? 'Prendre' : 'Utiliser'}
                  {needs ? ` (${needs[0] === needs[1] ? needs[0] : `${needs[0]}-${needs[1]}`})` : ''}
                </button>
              )}
            </div>
          )
        })}
      </div>
      {pack.handCards.length > 0 && (
        <>
          <div className="muted small">Pour un tarot qui cible des cartes : sélectionne-les ici, puis « Utiliser ».</div>
          <div className="hand pack-hand">
            {pack.handCards.map((c, i) => (
              <div key={c.id} className="hand-slot" style={{ marginLeft: i ? -14 : 0, transform: selected.includes(c.id) ? 'translateY(-26px)' : undefined }}>
                <div className="deal" style={{ animationDelay: `${300 + i * 50}ms` }}>
                  <PlayingCard card={c} selected={selected.includes(c.id)} onClick={() => toggle(c.id)} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <button className="btn orange" onClick={onSkip}>
        Passer
      </button>
    </div>
  )
}

function PackArtBig({ kind, size }: { kind: NonNullable<GameState['packs'][number]>['kind']; size: NonNullable<GameState['packs'][number]>['size'] }) {
  return <PackArt kind={kind} size={size} />
}

// ===================== SALLE D'ATTENTE / ATTENTE =====================
function LobbyRoom({ gs, meId, session, onStart, onCopy }: { gs: GameState; meId: number; session: Session; onStart: () => void; onCopy: () => void }) {
  const isHost = session.mode === 'host'
  return (
    <div className="menu">
      <h1 className="logo small-logo">SALON</h1>
      <div className="panel-ui lobby-room">
        {isHost ? (
          <>
            <div className="muted">Envoie ce lien à tes amis : chacun prend la place d’un bot.</div>
            <div className="invite">
              <input readOnly value={session.inviteLink || 'Création du salon…'} onFocus={(e) => e.target.select()} />
              <button className="btn blue" disabled={!session.inviteLink} onClick={onCopy}>
                Copier
              </button>
            </div>
            {session.error && <div className="t-red">{session.error}</div>}
          </>
        ) : (
          <div className="muted">Connecté ! En attente que l’hôte lance la partie…</div>
        )}
        <div className="seats">
          {gs.players.map((p) => (
            <div key={p.id} className={`seat ${p.isBot ? 'bot' : 'human'} ${p.id === meId ? 'me' : ''}`}>
              <span className="avatar" style={{ background: avatarColor(p.id) }}>
                {p.name[0]}
              </span>
              <span>{p.name}</span>
              <span className="muted small">{p.isBot ? 'bot' : p.id === gs.hostId ? 'hôte' : 'joueur'}</span>
            </div>
          ))}
        </div>
        {isHost && (
          <button className="btn green big" onClick={onStart}>
            LANCER LA PARTIE
          </button>
        )}
        <div className="muted small">Un ami peut aussi rejoindre en cours de partie : il reprend un bot encore en vie.</div>
      </div>
    </div>
  )
}

function WaitPanel({ gs, text }: { gs: GameState; text: string }) {
  const waiting = waitingFor(gs)
  return (
    <div className="wait-panel panel-ui">
      <div className="wait-title">{text}</div>
      <div className="muted">En attente de {waiting.map((p) => p.name).join(', ') || '…'}</div>
      <div className="dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

// ===================== minuterie, sons, revenus =====================
function Countdown({ session }: { session: Session }) {
  const [, tick] = useReducer((x: number) => x + 1, 0)
  const last = useRef(-1)
  useEffect(() => {
    const t = setInterval(tick, 250)
    return () => clearInterval(t)
  }, [])
  const ms = session.remaining()
  if (ms === null) return null
  const sec = Math.ceil(ms / 1000)
  if (sec <= 5 && sec > 0 && sec !== last.current) {
    last.current = sec
    sound.tick()
  }
  return (
    <span className={`countdown ${sec <= 10 ? 'urgent' : ''}`} title="Temps restant : ensuite, ton tour se termine automatiquement">
      ⏱ {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}
    </span>
  )
}

function SoundButtons() {
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => sound.subscribe(force), [])
  return (
    <div className="sound-btns">
      <button className={`btn sm ${sound.settings.sfx ? 'blue' : 'off'}`} onClick={() => sound.toggle('sfx')} title="Effets sonores">
        🔊
      </button>
    </div>
  )
}

/** Explique clairement l'argent du prochain round. */
function IncomeBox({ me }: { me: Player }) {
  const cap = me.vouchers.includes('seedMoney') ? 10 : 5
  const g = Math.max(0, me.gold)
  const interest = Math.min(cap, Math.floor(g / 5))
  const nextStep = interest < cap ? (Math.floor(g / 5) + 1) * 5 : null
  return (
    <div className="income panel-ui">
      <div className="income-title">💰 Ton revenu au prochain round</div>
      <div className="income-row">
        <span>Revenu de base</span>
        <span className="t-money">+5 $</span>
      </div>
      <div className="income-row">
        <span>
          Intérêts : <b>1 $ pour chaque tranche de 5 $</b> que tu gardes (max {cap} $)
        </span>
        <span className="t-money">+{interest} $</span>
      </div>
      <div className="income-row">
        <span>Victoire</span>
        <span className="t-money">+1 $</span>
      </div>
      <div className="income-row">
        <span>Série de 2+ victoires (ou de 2+ défaites)</span>
        <span className="t-money">+1 à +3 $</span>
      </div>
      <div className="muted small">
        Tu as {me.gold} $ → {interest} $ d’intérêts.
        {nextStep !== null ? ` Garde ${nextStep} $ pour en gagner ${interest + 1}.` : ' Tu touches le maximum : bravo !'} Dépenser, c’est te renforcer
        maintenant ; garder, c’est plus d’argent plus tard.
      </div>
    </div>
  )
}
