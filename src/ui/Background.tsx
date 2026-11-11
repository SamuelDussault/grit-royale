// Fond animé : peinture psychédélique qui tourbillonne, pixelisée (shader WebGL original).
import { useEffect, useRef } from 'react'

export type Mood = 'menu' | 'combat' | 'shop' | 'win' | 'lose'

const PALETTES: Record<Mood, [number[], number[], number[]]> = {
  menu: [[0.85, 0.24, 0.25], [0.13, 0.42, 0.62], [0.09, 0.1, 0.16]],
  combat: [[0.78, 0.21, 0.21], [0.07, 0.42, 0.44], [0.1, 0.09, 0.14]],
  shop: [[0.16, 0.52, 0.42], [0.8, 0.28, 0.27], [0.07, 0.11, 0.14]],
  win: [[0.9, 0.7, 0.18], [0.85, 0.3, 0.35], [0.15, 0.08, 0.2]],
  lose: [[0.35, 0.25, 0.55], [0.15, 0.2, 0.35], [0.05, 0.05, 0.09]],
}

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`
const FRAG = `
precision mediump float;
uniform float t;
uniform vec2 res;
uniform vec3 c1; uniform vec3 c2; uniform vec3 c3;
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*res) / res.y;
  float r = length(uv);
  float a = atan(uv.y, uv.x) + t*0.08 - r*2.2;
  vec2 q = vec2(cos(a), sin(a)) * r * 3.5;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    q += 0.6 * vec2(sin(q.y*1.25 + t*0.35 + fi*1.3), cos(q.x*1.15 - t*0.28 + fi*1.9));
  }
  float v = 0.5 + 0.5*sin(q.x + q.y);
  float w = 0.5 + 0.5*sin(length(q)*1.6 - t*0.4);
  vec3 col = mix(c3, c1, smoothstep(0.15, 0.85, v));
  col = mix(col, c2, smoothstep(0.45, 0.95, w) * 0.85);
  col = floor(col * 10.0) / 10.0;
  col *= 1.0 - 0.35*smoothstep(0.4, 1.1, r);
  gl_FragColor = vec4(col, 1.0);
}`

export default function Background({ mood }: { mood: Mood }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const target = useRef(PALETTES[mood])
  target.current = PALETTES[mood]

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
    const uT = gl.getUniformLocation(prog, 't')
    const uRes = gl.getUniformLocation(prog, 'res')
    const uC = [gl.getUniformLocation(prog, 'c1'), gl.getUniformLocation(prog, 'c2'), gl.getUniformLocation(prog, 'c3')]
    const cur = target.current.map((c) => [...c])

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
      for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) cur[i][k] += (target.current[i][k] - cur[i][k]) * 0.03
      gl.uniform1f(uT, t)
      gl.uniform2f(uRes, canvas.width, canvas.height)
      uC.forEach((u, i) => gl.uniform3f(u, cur[i][0], cur[i][1], cur[i][2]))
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
