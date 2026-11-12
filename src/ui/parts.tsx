// Composants visuels : cartes avec effet 3D, info-bulles, plateaux.
import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Card, ConsumableKind, Edition, JokerInst, Player } from '../engine/types'
import { cardChips, EDITION_DESC, EDITION_NAME, ENH_DESC, ENH_NAME, rankName, SEAL_DESC, SEAL_NAME, SUIT_NAME } from '../engine/cards'
import { getJoker, RARITY_NAME, sellValue, type Rarity } from '../engine/jokers'
import { getConsumable } from '../engine/consumables'
import { HAND_TYPES, handBase, HANDS } from '../engine/hands'
import { getVoucher, PACK_DESC, packSpec, type PackKind, type PackSize } from '../engine/shop'
import { ConsumableArt, JokerArt, PackArt, PlayingCardArt, VoucherArt } from './art'

export function fmt(n: number): string {
  if (n >= 1e11) return n.toExponential(2).replace('+', '')
  return Math.round(n).toLocaleString('fr-CA')
}

// ---------- texte coloré ----------
const TOKEN = /(×\s?\d+(?:[.,]\d+)?\s?Grit|[+−-]?\d+(?:[.,]\d+)?\s?Grit|[+−-]?\d+\s?jetons|[+−-]?\d+\s?\$|Cœurs?|Carreaux?|Piques?|Trèfles?)/g

export function Colorize({ text }: { text: string }) {
  const parts = text.split(TOKEN)
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0) return p
        let cls = 't-money'
        if (p.startsWith('×')) cls = 't-xmult'
        else if (p.endsWith('Grit')) cls = 't-mult'
        else if (p.endsWith('jetons')) cls = 't-chips'
        else if (/^(Cœur|Carreau)/.test(p)) cls = 't-red'
        else if (/^(Pique|Trèfle)/.test(p)) cls = 't-dark'
        return (
          <span key={i} className={cls}>
            {p}
          </span>
        )
      })}
    </>
  )
}

const RARITY_CLASS: Record<Rarity, string> = { 1: 'pill-blue', 2: 'pill-green', 3: 'pill-red', 4: 'pill-purple' }

export function TipBox({ title, children, pills }: { title: string; children?: ReactNode; pills?: { text: string; cls: string }[] }) {
  return (
    <div className="tipbox">
      <div className="tip-title">{title}</div>
      {children && <div className="tip-body">{children}</div>}
      {pills && pills.length > 0 && (
        <div className="tip-pills">
          {pills.map((p, i) => (
            <span key={i} className={`pill ${p.cls}`}>
              {p.text}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function cardTip(c: Card) {
  const title = c.enh === 'stone' ? 'Carte de Pierre' : `${rankName(c.rank)} de ${SUIT_NAME[c.suit]}`
  return (
    <TipBox
      title={title}
      pills={[
        ...(c.enh ? [{ text: ENH_NAME[c.enh], cls: 'pill-orange' }] : []),
        ...(c.edition ? [{ text: EDITION_NAME[c.edition], cls: 'pill-purple' }] : []),
        ...(c.seal ? [{ text: SEAL_NAME[c.seal], cls: 'pill-gold' }] : []),
      ]}
    >
      <div>
        <Colorize text={`+${cardChips(c)} jetons`} />
      </div>
      {c.enh && c.enh !== 'stone' && (
        <div>
          <Colorize text={ENH_DESC[c.enh]} />
        </div>
      )}
      {c.edition && (
        <div>
          <Colorize text={EDITION_DESC[c.edition]} />
        </div>
      )}
      {c.seal && <div>{SEAL_DESC[c.seal]}</div>}
    </TipBox>
  )
}

export function jokerTip(defId: string, edition?: Edition, inst?: JokerInst, player?: Player) {
  const d = getJoker(defId)
  const j = inst ?? { uid: 0, defId, edition, state: {}, sellBonus: 0, basePrice: d.cost }
  return (
    <TipBox
      title={d.name}
      pills={[
        { text: RARITY_NAME[d.rarity], cls: RARITY_CLASS[d.rarity] },
        ...(edition ? [{ text: `${EDITION_NAME[edition]} : ${EDITION_DESC[edition]}`, cls: 'pill-purple' }] : []),
        ...(d.pvp ? [{ text: 'Lobby', cls: 'pill-red' }] : []),
      ]}
    >
      <Colorize text={d.desc(j, player)} />
      {inst && <div className="tip-sub">Revente : {sellValue(inst)} $</div>}
    </TipBox>
  )
}

export function consumableTip(defId: string) {
  const d = getConsumable(defId)
  const kind = { tarot: 'Tarot', planet: 'Planète', spectral: 'Spectrale', curse: 'Malédiction : vise un adversaire' }[d.kind]
  const cls = { tarot: 'pill-purple', planet: 'pill-blue', spectral: 'pill-dark', curse: 'pill-red' }[d.kind]
  return (
    <TipBox title={d.name} pills={[{ text: kind, cls }]}>
      <Colorize text={d.desc} />
    </TipBox>
  )
}

export function packTip(kind: PackKind, size: PackSize) {
  const s = packSpec(kind, size)
  return (
    <TipBox title={s.name} pills={[{ text: 'Paquet', cls: 'pill-gold' }]}>
      Choisis {s.picks} parmi {s.choices} : {PACK_DESC[kind]}
    </TipBox>
  )
}

export function voucherTip(id: string) {
  const v = getVoucher(id)
  return (
    <TipBox title={v.name} pills={[{ text: 'Bon', cls: 'pill-orange' }]}>
      {v.desc}
    </TipBox>
  )
}

// ---------- carte générique (effet 3D + info-bulle + éditions) ----------
export function GameCard({
  children,
  tip,
  tipBelow,
  selected,
  onClick,
  edition,
  className = '',
  style,
  dataId,
  juice,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  overlay,
}: {
  children: ReactNode
  overlay?: ReactNode
  tip?: ReactNode
  tipBelow?: boolean
  selected?: boolean
  onClick?: () => void
  edition?: Edition
  className?: string
  style?: React.CSSProperties
  dataId?: string
  juice?: number
  draggable?: boolean
  onDragStart?: React.DragEventHandler
  onDragOver?: React.DragEventHandler
  onDrop?: React.DragEventHandler
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [tipAt, setTipAt] = useState<null | { x: number; y: number; below: boolean }>(null)
  const showTip = () => {
    const el = ref.current
    if (!el || !tip) return
    const r = el.getBoundingClientRect()
    const W = 262
    // toujours entièrement visible : on borne la bulle aux bords de l'écran
    const x = Math.max(8, Math.min(window.innerWidth - W - 8, r.left + r.width / 2 - W / 2))
    const below = tipBelow ? r.bottom + 230 < window.innerHeight || r.top < 230 : r.top < 230
    setTipAt({ x, y: below ? r.bottom + 10 : r.top - 10, below })
  }
  const move = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--ry', `${x * 22}deg`)
    el.style.setProperty('--rx', `${-y * 22}deg`)
    el.style.setProperty('--mx', `${(x + 0.5) * 100}%`)
  }
  const leave = () => {
    ref.current?.style.setProperty('--ry', '0deg')
    ref.current?.style.setProperty('--rx', '0deg')
    setTipAt(null)
  }
  return (
    <div
      className={`gcard ${selected ? 'selected' : ''} ${onClick ? 'clickable' : ''} ${className}`}
      style={style}
      data-target={dataId}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div ref={ref} className="gcard-inner" onMouseEnter={showTip} onMouseMove={move} onMouseLeave={leave} onClick={onClick}>
        <div key={juice} className={`gcard-face ${juice ? 'juice' : ''} ${edition ? 'ed-' + edition : ''}`}>
          {children}
          {edition && edition !== 'negative' && <div className="shine" />}
        </div>
        {overlay && (
          <div className="card-overlay" onClick={(e) => e.stopPropagation()}>
            {overlay}
          </div>
        )}
      </div>
      {tip &&
        tipAt &&
        createPortal(
          <div className={`tip-float ${tipAt.below ? 'below' : 'above'}`} style={{ left: tipAt.x, top: tipAt.y }}>
            {tip}
          </div>,
          document.body,
        )}
    </div>
  )
}

export function PlayingCard(props: { card: Card; selected?: boolean; onClick?: () => void; tipBelow?: boolean; juice?: number; style?: React.CSSProperties; className?: string }) {
  const { card } = props
  return (
    <GameCard
      tip={cardTip(card)}
      tipBelow={props.tipBelow}
      selected={props.selected}
      onClick={props.onClick}
      edition={card.edition}
      dataId={`c${card.id}`}
      juice={props.juice}
      style={props.style}
      className={`pcard ${props.className ?? ''}`}
    >
      <PlayingCardArt card={card} />
    </GameCard>
  )
}

export function JokerCard(props: {
  defId: string
  edition?: Edition
  inst?: JokerInst
  player?: Player
  selected?: boolean
  onClick?: () => void
  juice?: number
  tipBelow?: boolean
  style?: React.CSSProperties
  draggable?: boolean
  onDragStart?: React.DragEventHandler
  onDragOver?: React.DragEventHandler
  onDrop?: React.DragEventHandler
  overlay?: ReactNode
}) {
  return (
    <GameCard
      overlay={props.overlay}
      tip={jokerTip(props.defId, props.edition, props.inst, props.player)}
      tipBelow={props.tipBelow}
      selected={props.selected}
      onClick={props.onClick}
      edition={props.edition}
      dataId={props.inst ? `j${props.inst.uid}` : undefined}
      juice={props.juice}
      style={props.style}
      className={getJoker(props.defId).rarity === 4 ? 'jcard legendary' : 'jcard'}
      draggable={props.draggable}
      onDragStart={props.onDragStart}
      onDragOver={props.onDragOver}
      onDrop={props.onDrop}
    >
      <JokerArt defId={props.defId} edition={props.edition} />
    </GameCard>
  )
}

export function ConsumableCard(props: { kind: ConsumableKind; defId: string; selected?: boolean; onClick?: () => void; tipBelow?: boolean; overlay?: ReactNode }) {
  return (
    <GameCard overlay={props.overlay} tip={consumableTip(props.defId)} tipBelow={props.tipBelow} selected={props.selected} onClick={props.onClick} className="ccard">
      <ConsumableArt kind={props.kind} defId={props.defId} />
    </GameCard>
  )
}

export function PackCard(props: { kind: PackKind; size: PackSize; onClick?: () => void; selected?: boolean }) {
  return (
    <GameCard tip={packTip(props.kind, props.size)} onClick={props.onClick} selected={props.selected} className="packcard">
      <PackArt kind={props.kind} size={props.size} />
    </GameCard>
  )
}

export function VoucherCard(props: { id: string; onClick?: () => void; selected?: boolean }) {
  return (
    <GameCard tip={voucherTip(props.id)} onClick={props.onClick} selected={props.selected} className="vcard">
      <VoucherArt name={getVoucher(props.id).name} />
    </GameCard>
  )
}

// ---------- panneaux ----------
export function HandLevels({ player }: { player: Player }) {
  return (
    <div className="levels">
      {HAND_TYPES.filter((t) => !HANDS[t].secret || player.handPlays[t] > 0 || player.handLevels[t] > 1).map((t) => {
        const b = handBase(t, player.handLevels[t])
        return (
          <div key={t} className="level-row">
            <span className="lvl">niv.{player.handLevels[t]}</span>
            <span className="lname">{HANDS[t].name}</span>
            <span className="chips-box sm">{b.chips}</span>
            <span className="x">×</span>
            <span className="mult-box sm">{b.mult}</span>
            <span className="played">#{player.handPlays[t]}</span>
          </div>
        )
      })}
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal panel-ui" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn orange" onClick={onClose}>
            Retour
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function DeckView({ player }: { player: Player }) {
  const suits = ['S', 'H', 'C', 'D'] as const
  return (
    <div>
      <p className="muted">{player.deck.length} cartes</p>
      {suits.map((s) => (
        <div key={s} className="deck-row">
          {player.deck
            .filter((c) => c.suit === s && c.enh !== 'stone')
            .sort((a, b) => b.rank - a.rank)
            .map((c, i) => (
              <PlayingCard key={c.id} card={c} className="mini" style={{ marginLeft: i ? -20 : 0 }} />
            ))}
        </div>
      ))}
      <div className="deck-row">
        {player.deck
          .filter((c) => c.enh === 'stone')
          .map((c, i) => (
            <PlayingCard key={c.id} card={c} className="mini" style={{ marginLeft: i ? -20 : 0 }} />
          ))}
      </div>
    </div>
  )
}

export function ScoutView({ player }: { player: Player }) {
  return (
    <div className="scout">
      <div className="scout-stats">
        <span className="hp">♥ {Math.max(0, player.hp)} PV</span>
        <span className="t-money">{player.gold} $</span>
        <span>{player.winStreak ? `${player.winStreak} victoire(s) de suite` : `${player.loseStreak} défaite(s) de suite`}</span>
      </div>
      <div className="tray scout-jokers">
        {player.jokers.length === 0 && <span className="muted">Aucun joker</span>}
        {player.jokers.map((j) => (
          <JokerCard key={j.uid} defId={j.defId} edition={j.edition} inst={j} player={player} tipBelow />
        ))}
      </div>
      <HandLevels player={player} />
    </div>
  )
}
