// Sessions de jeu : solo, hôte ou invité.
// L'hôte fait tourner le moteur (et les bots) dans son navigateur ; les invités lui envoient
// leurs actions et reçoivent l'état de la partie. Connexion directe entre navigateurs (WebRTC
// via PeerJS) : aucun serveur à héberger, le service gratuit de PeerJS ne sert qu'à se trouver.
import Peer, { type DataConnection } from 'peerjs'
import { applyAction, type Action, type ActionResult } from '../engine/actions'
import { checkTimeout, newGame, newLobby, seatHuman, unseatHuman, type GameState } from '../engine/game'

export type Mode = 'solo' | 'host' | 'guest'

type Msg =
  | { t: 'hello'; name: string }
  | { t: 'welcome'; you: number }
  | { t: 'state'; gs: string; now: number }
  | { t: 'act'; id: number; action: Action }
  | { t: 'res'; id: number; res: ActionResult }
  | { t: 'full' }

/** Lien de transport minimal (PeerJS en vrai, BroadcastChannel pour tester sur un seul ordi). */
interface Link {
  send(m: Msg): void
  onMsg(cb: (m: Msg) => void): void
  onClose(cb: () => void): void
  close(): void
}

export class Session {
  mode: Mode
  meId = 0
  gs: GameState | null = null
  status = ''
  error = ''
  inviteLink = ''
  private listeners = new Set<() => void>()
  private guests = new Map<Link, number>()
  private hostLink?: Link
  private pending = new Map<number, (r: ActionResult) => void>()
  private reqId = 1
  private peer?: Peer
  private bc?: BroadcastChannel
  private timer?: number
  /** Décalage entre l'horloge de l'hôte et la nôtre (invités). */
  private skew = 0

  /** Temps restant (ms) avant la fin de la phase, ou null s'il n'y a pas de minuterie. */
  remaining(): number | null {
    const d = this.gs?.deadline
    if (!d) return null
    return Math.max(0, d - (Date.now() - this.skew))
  }

  /** L'hôte vérifie les minuteries : les joueurs en retard finissent automatiquement. */
  private startClock() {
    this.timer = window.setInterval(() => {
      if (this.gs && checkTimeout(this.gs)) {
        this.broadcast()
        this.changed()
      }
    }, 500)
  }

  private constructor(mode: Mode) {
    this.mode = mode
  }

  subscribe(cb: () => void) {
    this.listeners.add(cb)
    return () => void this.listeners.delete(cb)
  }
  private changed() {
    for (const cb of this.listeners) cb()
  }

  // ---------------- création ----------------
  static solo(name: string): Session {
    const s = new Session('solo')
    s.gs = newGame(name)
    return s
  }

  static host(name: string, local = false): Session {
    const s = new Session('host')
    s.gs = newLobby(name)
    s.gs.timers = true
    s.startClock()
    s.status = 'Création du salon…'
    const roomId = 'grit-' + Math.random().toString(36).slice(2, 8)
    const base = `${location.origin}${location.pathname}`
    const finish = (id: string) => {
      s.inviteLink = `${base}?join=${id}${local ? '&local=1' : ''}`
      s.status = 'Salon ouvert'
      s.changed()
    }
    if (local) {
      s.bc = new BroadcastChannel(roomId)
      listenLocalHost(s.bc, (link) => s.acceptGuest(link))
      finish(roomId)
    } else {
      const peer = new Peer(roomId)
      s.peer = peer
      peer.on('open', (id) => finish(id))
      peer.on('connection', (conn) => conn.on('open', () => s.acceptGuest(peerLink(conn))))
      peer.on('error', (e) => {
        s.error = `Réseau : ${e.message}`
        s.changed()
      })
    }
    return s
  }

  static join(roomId: string, name: string, local = false): Session {
    const s = new Session('guest')
    s.status = 'Connexion à la partie…'
    const onLink = (link: Link) => {
      s.hostLink = link
      link.onMsg((m) => s.onHostMsg(m))
      link.onClose(() => {
        s.error = 'Connexion perdue avec l’hôte.'
        s.changed()
      })
      link.send({ t: 'hello', name })
    }
    if (local) onLink(localGuestLink(roomId))
    else {
      const peer = new Peer()
      s.peer = peer
      peer.on('open', () => {
        const conn = peer.connect(roomId, { reliable: true })
        conn.on('open', () => onLink(peerLink(conn)))
        conn.on('error', (e) => {
          s.error = `Réseau : ${e.message}`
          s.changed()
        })
      })
      peer.on('error', (e) => {
        s.error = e.type === 'peer-unavailable' ? 'Partie introuvable : le lien est peut-être expiré, ou l’hôte a fermé son jeu.' : `Réseau : ${e.message}`
        s.changed()
      })
    }
    return s
  }

  // ---------------- hôte ----------------
  private acceptGuest(link: Link) {
    link.onMsg((m) => {
      const gs = this.gs!
      if (m.t === 'hello') {
        const id = seatHuman(gs, (m.name || 'Ami').slice(0, 14))
        if (id === null) {
          link.send({ t: 'full' })
          return
        }
        this.guests.set(link, id)
        link.send({ t: 'welcome', you: id })
        this.broadcast()
        this.changed()
      } else if (m.t === 'act') {
        const pid = this.guests.get(link)
        if (pid === undefined) return
        const res = applyAction(gs, pid, m.action)
        link.send({ t: 'res', id: m.id, res })
        this.broadcast()
        this.changed()
      }
    })
    link.onClose(() => {
      const pid = this.guests.get(link)
      this.guests.delete(link)
      if (pid !== undefined && this.gs) {
        unseatHuman(this.gs, pid)
        this.broadcast()
        this.changed()
      }
    })
  }

  private broadcast() {
    if (!this.gs || !this.guests.size) return
    const json = JSON.stringify(this.gs)
    const now = Date.now()
    for (const link of this.guests.keys()) link.send({ t: 'state', gs: json, now })
  }

  // ---------------- invité ----------------
  private onHostMsg(m: Msg) {
    if (m.t === 'welcome') {
      this.meId = m.you
      this.status = 'Connecté'
    } else if (m.t === 'state') {
      this.gs = JSON.parse(m.gs)
      this.skew = Date.now() - m.now
    } else if (m.t === 'res') {
      this.pending.get(m.id)?.(m.res)
      this.pending.delete(m.id)
      return
    } else if (m.t === 'full') {
      this.error = 'La partie est pleine (plus de bot à remplacer).'
    }
    this.changed()
  }

  // ---------------- actions ----------------
  /** Envoie une action : appliquée tout de suite en solo/hôte, transmise à l'hôte sinon. */
  send(action: Action): Promise<ActionResult> {
    if (this.mode === 'guest') {
      if (!this.hostLink) return Promise.resolve({ error: 'Pas connecté' })
      const id = this.reqId++
      return new Promise((resolve) => {
        this.pending.set(id, resolve)
        this.hostLink!.send({ t: 'act', id, action })
      })
    }
    const res = applyAction(this.gs!, this.meId, action)
    this.broadcast()
    this.changed()
    return Promise.resolve(res)
  }

  close() {
    if (this.timer) clearInterval(this.timer)
    for (const l of this.guests.keys()) l.close()
    this.hostLink?.close()
    this.peer?.destroy()
    this.bc?.close()
  }
}

// ---------------- transports ----------------
function peerLink(conn: DataConnection): Link {
  return {
    send: (m) => conn.send(m),
    onMsg: (cb) => conn.on('data', (d) => cb(d as Msg)),
    onClose: (cb) => conn.on('close', cb),
    close: () => conn.close(),
  }
}

/** Transport local (plusieurs onglets du même navigateur) pour tester sans réseau. */
type BcMsg = { kind: 'connect' | 'msg' | 'close'; from: string; to: string; data?: Msg }

function listenLocalHost(bc: BroadcastChannel, onGuest: (l: Link) => void) {
  const links = new Map<string, { msg: (m: Msg) => void; close: () => void }>()
  bc.onmessage = (e: MessageEvent<BcMsg>) => {
    const m = e.data
    if (m.to !== 'host') return
    if (m.kind === 'connect') {
      let onMsg: (m: Msg) => void = () => {}
      let onClose: () => void = () => {}
      links.set(m.from, { msg: (x) => onMsg(x), close: () => onClose() })
      onGuest({
        send: (data) => bc.postMessage({ kind: 'msg', from: 'host', to: m.from, data } satisfies BcMsg),
        onMsg: (cb) => (onMsg = cb),
        onClose: (cb) => (onClose = cb),
        close: () => bc.postMessage({ kind: 'close', from: 'host', to: m.from } satisfies BcMsg),
      })
    } else if (m.kind === 'msg') links.get(m.from)?.msg(m.data!)
    else if (m.kind === 'close') {
      links.get(m.from)?.close()
      links.delete(m.from)
    }
  }
}

function localGuestLink(roomId: string): Link {
  const bc = new BroadcastChannel(roomId)
  const me = Math.random().toString(36).slice(2)
  let onMsg: (m: Msg) => void = () => {}
  let onClose: () => void = () => {}
  bc.onmessage = (e: MessageEvent<BcMsg>) => {
    if (e.data.to !== me) return
    if (e.data.kind === 'msg') onMsg(e.data.data!)
    else if (e.data.kind === 'close') onClose()
  }
  window.addEventListener('beforeunload', () => bc.postMessage({ kind: 'close', from: me, to: 'host' } satisfies BcMsg))
  bc.postMessage({ kind: 'connect', from: me, to: 'host' } satisfies BcMsg)
  return {
    send: (data) => bc.postMessage({ kind: 'msg', from: me, to: 'host', data } satisfies BcMsg),
    onMsg: (cb) => (onMsg = cb),
    onClose: (cb) => (onClose = cb),
    close: () => bc.postMessage({ kind: 'close', from: me, to: 'host' } satisfies BcMsg),
  }
}
