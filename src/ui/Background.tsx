// Fonds animés : peintures psychédéliques pixelisées (shaders WebGL originaux).
// Plusieurs motifs et palettes ; à chaque combat on change de motif, avec un fondu.
import { useEffect, useRef } from 'react'

export type Mood = 'menu' | 'combat' | 'shop' | 'win' | 'lose'

type Pal = [number[], number[], number[]]

const MOOD_PAL: Record<Exclude<Mood, 'combat'>, Pal> = {
  menu: [[0.85, 0.24, 0.25], [0.13, 0.42, 0.62], [0.09, 0.1, 0.16]],
  shop: [[0.16, 0.52, 0.42], [0.8, 0.28, 0.27], [0.07, 0.11, 0.14]],
  win: [[0.9, 0.7, 0.18], [0.85, 0.3, 0.35], [0.15, 0.08, 0.2]],
  lose: [[0.35, 0.25, 0.55], [0.15, 0.2, 0.35], [0.05, 0.05, 0.09]],
}

/** Palettes des combats (une par round, en boucle). */
const COMBAT_PALS: Pal[] = [
  [[0.78, 0.21, 0.21], [0.07, 0.42, 0.44], [0.1, 0.09, 0.14]], // rouge / sarcelle
  [[0.55, 0.22, 0.72], [0.95, 0.7, 0.2], [0.08, 0.05, 0.14]], // violet / or
  [[0.12, 0.55, 0.85], [0.95, 0.45, 0.2], [0.04, 0.07, 0.14]], // bleu / orange
  [[0.9, 0.25, 0.55], [0.2, 0.8, 0.7], [0.1, 0.05, 0.12]], // rose / menthe
  [[0.2, 0.65, 0.3], [0.85, 0.85, 0.3], [0.04, 0.1, 0.06]], // vert / citron
  [[0.75, 0.12, 0.2], [0.25, 0.25, 0.75], [0.06, 0.04, 0.12]], // cramoisi / indigo
  [[0.95, 0.55, 0.15], [0.55, 0.2, 0.6], [0.12, 0.05, 0.08]], // orange / prune
]

export const PATTERN_COUNT = 7

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`
const FRAG = `
precision mediump float;
uniform float t;
uniform vec2 res;
uniform vec3 c1; uniform vec3 c2; uniform vec3 c3;
uniform float modeA; uniform float modeB; uniform float blend;

// Renvoie deux champs (v, w) dans [0,1] selon le motif
vec2 pattern(float m, vec2 uv) {
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  if (m < 0.5) {
    // 0 : tourbillon de peinture
    float aa = a + t*0.08 - r*2.2;
    vec2 q = vec2(cos(aa), sin(aa)) * r * 3.5;
    for (int i = 0; i < 5; i++) { float fi = float(i); q += 0.6*vec2(sin(q.y*1.25 + t*0.35 + fi*1.3), cos(q.x*1.15 - t*0.28 + fi*1.9)); }
    return vec2(0.5+0.5*sin(q.x+q.y), 0.5+0.5*sin(length(q)*1.6 - t*0.4));
  } else if (m < 1.5) {
    // 1 : tunnel d'anneaux
    float z = 1.0 / max(r, 0.05);
    float v = 0.5+0.5*sin(z*2.2 - t*1.4 + sin(a*3.0 + t*0.3)*0.8);
    float w = 0.5+0.5*sin(a*6.0 + z*0.8 + t*0.5);
    return vec2(v, w);
  } else if (m < 2.5) {
    // 2 : vagues qui ondulent
    float y = uv.y + 0.18*sin(uv.x*3.0 + t*0.6) + 0.1*sin(uv.x*7.0 - t*0.9);
    float v = 0.5+0.5*sin(y*9.0 + t*0.5);
    float w = 0.5+0.5*sin(uv.x*4.0 + sin(y*5.0 + t)*1.5 - t*0.3);
    return vec2(v, w);
  } else if (m < 3.5) {
    // 3 : plasma
    float v = sin(uv.x*5.0 + t*0.7) + sin(uv.y*6.0 - t*0.5) + sin((uv.x+uv.y)*4.0 + t*0.4) + sin(r*8.0 - t*0.9);
    return vec2(0.5+0.125*v, 0.5+0.5*sin(v*1.7 + t*0.2));
  } else if (m < 4.5) {
    // 4 : spirale galactique
    float s = a*3.0 + log(r + 0.02)*5.0 - t*0.6;
    float v = 0.5+0.5*sin(s);
    float w = smoothstep(0.9, 0.1, r) * (0.5+0.5*sin(s*2.0 + r*10.0));
    return vec2(v, w);
  } else if (m < 5.5) {
    // 5 : damier déformé
    vec2 q = uv * 7.0;
    q += 0.45*vec2(sin(q.y*1.3 + t*0.6), cos(q.x*1.1 - t*0.5));
    q = vec2(q.x*cos(t*0.05) - q.y*sin(t*0.05), q.x*sin(t*0.05) + q.y*cos(t*0.05));
    float c = step(0.0, sin(q.x*1.6)*sin(q.y*1.6));
    float w = 0.5+0.5*sin(length(q)*1.2 - t*0.6);
    return vec2(c*0.8 + 0.1, w);
  } else {
    // 6 : bulles de lave
    float f = 0.0;
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      vec2 c = 0.55*vec2(sin(t*0.23 + fi*1.7), cos(t*0.19 + fi*2.3));
      f += 0.045 / (dot(uv - c, uv - c) + 0.01);
    }
    return vec2(smoothstep(0.6, 1.4, f), 0.5+0.5*sin(f*2.0 - t*0.4));
  }
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*res) / res.y;
  vec2 A = pattern(modeA, uv);
  vec2 B = pattern(modeB, uv);
  vec2 f = mix(A, B, blend);
  vec3 col = mix(c3, c1, smoothstep(0.15, 0.85, f.x));
  col = mix(col, c2, smoothstep(0.45, 0.95, f.y) * 0.85);
  col = floor(col * 10.0) / 10.0;
  col *= 1.0 - 0.35*smoothstep(0.4, 1.1, length(uv));
  gl_FragColor = vec4(col, 1.0);
}`

/** variant : numéro du combat (change le motif et la palette). */
export default function Background({ mood, variant = 0 }: { mood: Mood; variant?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const palette: Pal = mood === 'combat' ? COMBAT_PALS[((variant % COMBAT_PALS.length) + COMBAT_PALS.length) % COMBAT_PALS.length] : MOOD_PAL[mood]
  const pattern = mood === 'combat' ? (((variant % PATTERN_COUNT) + PATTERN_COUNT) % PATTERN_COUNT) : mood === 'shop' ? 0 : mood === 'menu' ? 0 : 3
  const target = useRef({ palette, pattern })
  target.current = { palette, pattern }

  useEffect(() => {
    const canvas = ref.current!
    const gl = canvas.getContext('webgl')
    if (!gl) return
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const u = (n: string) => gl.getUniformLocation(prog, n)
    const uT = u('t')
    const uRes = u('res')
    const uC = [u('c1'), u('c2'), u('c3')]
    const uA = u('modeA')
    const uB = u('modeB')
    const uBlend = u('blend')
    const cur = target.current.palette.map((c) => [...c])
    let modeA = target.current.pattern
    let modeB = modeA
    let blend = 1

    const PIXEL = 4 // rendu basse résolution = effet pixel
    const resize = () => {
      canvas.width = Math.ceil(window.innerWidth / PIXEL)
      canvas.height = Math.ceil(window.innerHeight / PIXEL)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)
    let raf = 0
    const start = performance.now()
    const frame = () => {
      const t = (performance.now() - start) / 1000
      const tg = target.current
      for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) cur[i][k] += (tg.palette[i][k] - cur[i][k]) * 0.03
      // nouveau motif : on part du mélange actuel vers le nouveau
      if (tg.pattern !== modeB) {
        modeA = blend > 0.5 ? modeB : modeA
        modeB = tg.pattern
        blend = 0
      }
      blend = Math.min(1, blend + 0.012)
      gl.uniform1f(uT, t)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      uC.forEach((uc, i) => gl.uniform3f(uc, cur[i][0], cur[i][1], cur[i][2]))
      gl.uniform1f(uA, modeA)
      gl.uniform1f(uB, modeB)
      gl.uniform1f(uBlend, blend * blend * (3 - 2 * blend))
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      raf = requestAnimationFrame(frame)
    }
    frame()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <>
      <canvas ref={ref} className="bg-canvas" />
      <div className="crt" />
    </>
  )
}
