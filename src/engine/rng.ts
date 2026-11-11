// Générateur aléatoire avec graine (mulberry32) : parties reproductibles et tests faciles.
export class Rng {
  private s: number
  constructor(seed: number) {
    this.s = seed >>> 0
  }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0
    let t = this.s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }
  chance(p: number): boolean {
    return this.next() < p
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]
  }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }
  weighted<T>(items: readonly { item: T; w: number }[]): T {
    const total = items.reduce((a, b) => a + b.w, 0)
    let r = this.next() * total
    for (const it of items) {
      r -= it.w
      if (r <= 0) return it.item
    }
    return items[items.length - 1].item
  }
}

/** Rng « prévisualisation » : aucune chance ne se déclenche (pour les estimations). */
export class NoLuckRng extends Rng {
  constructor() {
    super(1)
  }
  override next(): number {
    return 0.999999
  }
}

let uidCounter = 1
export function nextUid(): number {
  return uidCounter++
}
