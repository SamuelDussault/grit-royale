// Sons du jeu, entièrement synthétisés (Web Audio) : aucun fichier à charger.
// - Effets : sélection, jeu de la main, chaque bonus (la note monte à chaque effet), achats…
// - Musique de fond : boucle d'accords douce générée en direct.

type Settings = { music: boolean; sfx: boolean }

const KEY = 'grit-royale-sound'
function load(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '')
    if (typeof s.music === 'boolean' && typeof s.sfx === 'boolean') return s
  } catch {
    /* rien */
  }
  return { music: true, sfx: true }
}

class SoundEngine {
  settings: Settings = load()
  private ctx?: AudioContext
  private master?: GainNode
  private sfxGain?: GainNode
  private musicGain?: GainNode
  private musicTimer?: number
  private nextBeat = 0
  private beat = 0
  private listeners = new Set<() => void>()

  subscribe(cb: () => void) {
    this.listeners.add(cb)
    return () => void this.listeners.delete(cb)
  }

  /** À appeler lors d'un clic (les navigateurs exigent un geste de l'utilisateur). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.8
      this.master.connect(this.ctx.destination)
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = this.settings.sfx ? 0.55 : 0
      this.sfxGain.connect(this.master)
      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = this.settings.music ? 0.18 : 0
      this.musicGain.connect(this.master)
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
    if (!this.musicTimer) this.startMusic()
  }

  toggle(kind: 'music' | 'sfx') {
    this.settings = { ...this.settings, [kind]: !this.settings[kind] }
    try {
      localStorage.setItem(KEY, JSON.stringify(this.settings))
    } catch {
      /* rien */
    }
    if (this.ctx) {
      const t = this.ctx.currentTime
      this.musicGain?.gain.setTargetAtTime(this.settings.music ? 0.18 : 0, t, 0.1)
      this.sfxGain?.gain.setTargetAtTime(this.settings.sfx ? 0.55 : 0, t, 0.05)
    }
    for (const cb of this.listeners) cb()
  }

  // ---------------- briques ----------------
  private tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.25, when = 0, slide?: number, out?: AudioNode) {
    if (!this.ctx || !this.settings.sfx) return
    const t = this.ctx.currentTime + when
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(out ?? this.sfxGain!)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  private noise(dur: number, from: number, to: number, vol = 0.2, when = 0) {
    if (!this.ctx || !this.settings.sfx) return
    const t = this.ctx.currentTime + when
    const len = Math.floor(this.ctx.sampleRate * dur)
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const f = this.ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 1.2
    f.frequency.setValueAtTime(from, t)
    f.frequency.exponentialRampToValueAtTime(to, t + dur)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f).connect(g).connect(this.sfxGain!)
    src.start(t)
  }

  // ---------------- effets ----------------
  select() {
    this.tone(880, 0.05, 'square', 0.12)
  }
  deselect() {
    this.tone(620, 0.05, 'square', 0.1)
  }
  playHand() {
    this.noise(0.25, 600, 3000, 0.25)
    this.tone(220, 0.15, 'triangle', 0.2, 0, 440)
  }
  discard() {
    this.noise(0.18, 2500, 500, 0.2)
  }
  /** Un bonus pendant le calcul : la note monte à chaque effet (step). */
  bonus(kind: 'chips' | 'mult' | 'xmult' | 'money' | 'info', step: number) {
    const semis = Math.min(step, 24)
    const f = 330 * Math.pow(2, semis / 12)
    if (kind === 'chips') {
      this.tone(f, 0.12, 'triangle', 0.28)
      this.tone(f * 2, 0.08, 'sine', 0.1, 0.01)
    } else if (kind === 'mult') {
      this.tone(f * 0.75, 0.14, 'square', 0.18)
      this.tone(f * 1.5, 0.1, 'triangle', 0.12, 0.02)
    } else if (kind === 'xmult') {
      this.tone(f * 0.5, 0.35, 'sawtooth', 0.2, 0, f * 0.25)
      this.tone(f, 0.25, 'square', 0.15, 0.03)
      this.tone(f * 1.5, 0.25, 'square', 0.12, 0.06)
      this.noise(0.2, 200, 80, 0.3)
    } else if (kind === 'money') this.coin()
    else this.tone(200, 0.12, 'sawtooth', 0.12, 0, 120)
  }
  total() {
    ;[523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.22, i * 0.06))
  }
  coin() {
    this.tone(1320, 0.08, 'square', 0.15)
    this.tone(1980, 0.18, 'square', 0.15, 0.07)
  }
  sell() {
    this.tone(1980, 0.08, 'square', 0.14)
    this.tone(1320, 0.16, 'square', 0.14, 0.07)
  }
  reroll() {
    for (let i = 0; i < 5; i++) this.tone(400 + i * 120, 0.05, 'square', 0.1, i * 0.04)
  }
  packOpen() {
    this.noise(0.6, 300, 5000, 0.25)
    ;[784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.15, 0.55 + i * 0.05))
  }
  win() {
    ;[523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'square', 0.16, i * 0.09))
  }
  lose() {
    ;[392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.2, i * 0.14))
  }
  neutral() {
    ;[523, 659].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.18, i * 0.1))
  }
  error() {
    this.tone(140, 0.18, 'sawtooth', 0.15)
  }
  tick() {
    this.tone(1200, 0.04, 'square', 0.08)
  }

  // ---------------- musique ----------------
  private startMusic() {
    if (!this.ctx) return
    this.nextBeat = this.ctx.currentTime + 0.1
    this.musicTimer = window.setInterval(() => this.schedule(), 100)
  }

  private note(freq: number, t: number, dur: number, type: OscillatorType, vol: number, cutoff = 1800) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const f = ctx.createBiquadFilter()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = freq
    f.type = 'lowpass'
    f.frequency.value = cutoff
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(f).connect(g).connect(this.musicGain!)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  private schedule() {
    const ctx = this.ctx!
    const spb = 60 / 84 / 2 // croches à 84 BPM
    // progression : la mineur – fa – do – sol (style lounge un peu jazzy)
    const chords = [
      [220, 261.6, 329.6, 392],
      [174.6, 220, 261.6, 329.6],
      [130.8, 196, 261.6, 329.6],
      [196, 246.9, 293.7, 349.2],
    ]
    while (this.nextBeat < ctx.currentTime + 0.3) {
      const b = this.beat
      const chord = chords[Math.floor(b / 16) % 4]
      const t = this.nextBeat
      if (b % 16 === 0) for (const f of chord) this.note(f, t, spb * 15, 'sawtooth', 0.035, 900)
      if (b % 4 === 0) this.note(chord[0] / 2, t, spb * 3, 'sine', 0.22, 400)
      if (b % 4 === 2) this.note(chord[0] / 2, t, spb * 1.5, 'sine', 0.12, 400)
      const arp = [0, 2, 1, 3, 2, 1, 3, 2]
      if (b % 2 === 0 || b % 8 === 7) this.note(chord[arp[b % 8]] * 2, t, spb * 1.6, 'triangle', 0.05, 2400)
      this.nextBeat += spb
      this.beat++
    }
  }
}

export const sound = new SoundEngine()
