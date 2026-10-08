import * as THREE from 'three'

// Procedural canvas textures, so the 3D office ships without image or model files.
// Each texture is created once and cached.

const cache = new Map<string, THREE.Texture>()

function canvasTexture(key: string, width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number]): THREE.Texture {
  const cached = cache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(...repeat)
  }
  cache.set(key, texture)
  return texture
}

/** Deterministic pseudo-random numbers so textures look the same on every load. */
function random(seed: number) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

/** Warm parquet planks (like the reference office floor). */
export function woodFloor(repeat: [number, number]) {
  return canvasTexture(`wood-${repeat.join('x')}`, 512, 512, (ctx) => {
    const rand = random(7)
    const tones = ['#b98355', '#a9744a', '#c48f5f', '#b07b4f', '#9f6c43']
    const plankH = 64
    for (let row = 0; row < 512 / plankH; row += 1) {
      let x = row % 2 === 0 ? 0 : -96
      while (x < 512) {
        const width = 128 + Math.floor(rand() * 96)
        ctx.fillStyle = tones[Math.floor(rand() * tones.length)]
        ctx.fillRect(x, row * plankH, width, plankH)
        ctx.strokeStyle = 'rgba(60,35,20,0.18)'
        for (let grain = 0; grain < 5; grain += 1) {
          const y = row * plankH + 8 + rand() * (plankH - 16)
          ctx.beginPath(); ctx.moveTo(x + 4, y); ctx.bezierCurveTo(x + width / 3, y + 3, x + (2 * width) / 3, y - 3, x + width - 4, y); ctx.stroke()
        }
        ctx.fillStyle = 'rgba(50,28,15,0.55)'
        ctx.fillRect(x, row * plankH, 2, plankH)
        x += width
      }
      ctx.fillStyle = 'rgba(50,28,15,0.5)'
      ctx.fillRect(0, row * plankH, 512, 2)
    }
  }, repeat)
}

/** Light ceramic tiles for the pantry. */
export function tileFloor(repeat: [number, number]) {
  return canvasTexture(`tile-${repeat.join('x')}`, 256, 256, (ctx) => {
    ctx.fillStyle = '#e9e4da'; ctx.fillRect(0, 0, 256, 256)
    ctx.fillStyle = '#d6cfc2'
    for (let i = 0; i <= 256; i += 64) { ctx.fillRect(i - 1, 0, 2, 256); ctx.fillRect(0, i - 1, 256, 2) }
  }, repeat)
}

export function carpet(color: string, repeat: [number, number]) {
  return canvasTexture(`carpet-${color}-${repeat.join('x')}`, 128, 128, (ctx) => {
    const rand = random(11)
    ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 128)
    for (let i = 0; i < 900; i += 1) { ctx.fillStyle = `rgba(0,0,0,${rand() * 0.08})`; ctx.fillRect(rand() * 128, rand() * 128, 1, 1) }
  }, repeat)
}

export function grass(repeat: [number, number]) {
  return canvasTexture(`grass-${repeat.join('x')}`, 256, 256, (ctx) => {
    const rand = random(3)
    ctx.fillStyle = '#5d8f4e'; ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 2600; i += 1) {
      const shade = 70 + Math.floor(rand() * 60)
      ctx.fillStyle = `rgb(${shade - 25},${shade + 55},${shade - 30})`
      ctx.fillRect(rand() * 256, rand() * 256, 2, 3)
    }
  }, repeat)
}

export function asphalt(repeat: [number, number]) {
  return canvasTexture(`asphalt-${repeat.join('x')}`, 256, 256, (ctx) => {
    const rand = random(5)
    ctx.fillStyle = '#3d4044'; ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 3000; i += 1) { const g = 50 + Math.floor(rand() * 40); ctx.fillStyle = `rgb(${g},${g},${g + 4})`; ctx.fillRect(rand() * 256, rand() * 256, 1.5, 1.5) }
    ctx.fillStyle = '#e8dfa0'
    ctx.fillRect(0, 124, 110, 8); ctx.fillRect(146, 124, 110, 8)
  }, repeat)
}

export function pavingStones(repeat: [number, number]) {
  return canvasTexture(`paving-${repeat.join('x')}`, 256, 256, (ctx) => {
    ctx.fillStyle = '#b8b2a6'; ctx.fillRect(0, 0, 256, 256)
    ctx.fillStyle = '#a19b8f'
    for (let y = 0; y < 256; y += 32) {
      ctx.fillRect(0, y, 256, 2)
      for (let x = (y / 32) % 2 === 0 ? 0 : 32; x < 256; x += 64) ctx.fillRect(x, y, 2, 32)
    }
  }, repeat)
}

/** Painted street-food sign: bold text on a coloured board. */
export function signTexture(text: string, background: string, foreground: string, subtitle?: string) {
  return canvasTexture(`sign-${text}-${background}-${subtitle ?? ''}`, 512, 160, (ctx) => {
    ctx.fillStyle = background; ctx.fillRect(0, 0, 512, 160)
    ctx.strokeStyle = foreground; ctx.lineWidth = 8; ctx.strokeRect(10, 10, 492, 140)
    ctx.fillStyle = foreground
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = 'bold 76px Georgia, "Times New Roman", serif'
    ctx.fillText(text, 256, subtitle ? 66 : 82)
    if (subtitle) { ctx.font = 'bold 30px Arial, sans-serif'; ctx.fillText(subtitle, 256, 124) }
  })
}

/** The Indonesian flag: red over white. */
export function merahPutih() {
  return canvasTexture('merah-putih', 96, 64, (ctx) => {
    ctx.fillStyle = '#ce1126'; ctx.fillRect(0, 0, 96, 32)
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 32, 96, 32)
  })
}

export function screenTexture(active: boolean) {
  return canvasTexture(`screen-${active}`, 128, 80, (ctx) => {
    ctx.fillStyle = active ? '#15313a' : '#0d1112'; ctx.fillRect(0, 0, 128, 80)
    if (!active) return
    const rand = random(13)
    for (let line = 0; line < 9; line += 1) {
      ctx.fillStyle = ['#7ee0c3', '#f2c58a', '#a9d4ff', '#e7e7e7'][line % 4]
      ctx.fillRect(8 + (line % 3) * 6, 8 + line * 7.5, 30 + rand() * 70, 3)
    }
  })
}

/** A retro game on the arcade screens: a grid of bricks, a paddle and a ball. */
export function arcadeScreen() {
  return canvasTexture('arcade-screen', 128, 100, (ctx) => {
    ctx.fillStyle = '#0b1026'; ctx.fillRect(0, 0, 128, 100)
    const colors = ['#e63946', '#f4a261', '#f4d35e', '#2a9d8f', '#3a86ff']
    colors.forEach((color, row) => { ctx.fillStyle = color; for (let col = 0; col < 8; col += 1) ctx.fillRect(6 + col * 15, 10 + row * 7, 13, 5) })
    ctx.fillStyle = '#ffffff'; ctx.fillRect(52, 88, 26, 4); ctx.fillRect(70, 64, 4, 4)
  })
}


/** A division's hanging sign: its name in white on the division colour, with a small caption. */
export function divisionSign(text: string, color: string, caption: string) {
  return canvasTexture(`division-${text}-${color}-${caption}`, 512, 128, (ctx) => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, 512, 128)
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(0, 100, 512, 28)
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    let size = 56
    do { ctx.font = `800 ${size}px Inter, "Helvetica Neue", Arial, sans-serif`; size -= 4 } while (ctx.measureText(text).width > 470 && size > 20)
    ctx.fillText(text, 256, 52)
    ctx.font = '600 20px ui-monospace, Menlo, monospace'
    ctx.fillText(caption.toUpperCase(), 256, 114)
  })
}

/** A desk nameplate: the position the desk is for. */
export function namePlate(title: string, color: string) {
  return canvasTexture(`plate-${title}-${color}`, 256, 64, (ctx) => {
    ctx.fillStyle = '#1c2024'; ctx.fillRect(0, 0, 256, 64)
    ctx.fillStyle = color; ctx.fillRect(0, 0, 10, 64)
    ctx.fillStyle = '#f4efe6'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    let size = 30
    do { ctx.font = `700 ${size}px Inter, "Helvetica Neue", Arial, sans-serif`; size -= 2 } while (ctx.measureText(title.toUpperCase()).width > 230 && size > 12)
    ctx.fillText(title.toUpperCase(), 133, 33)
  })
}

/** The company logo: a rising arc over the wordmark (digantara: the sky, the horizon). */
export function companyLogo(name: string, tagline: string, dark = false) {
  return canvasTexture(`logo-${name}-${tagline}-${dark}`, 1024, 256, (ctx) => {
    ctx.fillStyle = dark ? '#121a2b' : '#f7f4ee'; ctx.fillRect(0, 0, 1024, 256)
    const gradient = ctx.createLinearGradient(40, 0, 220, 0)
    gradient.addColorStop(0, '#3d7fd6'); gradient.addColorStop(1, '#7c5cd6')
    ctx.strokeStyle = gradient; ctx.lineWidth = 22; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.arc(130, 190, 90, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke()
    ctx.fillStyle = '#f2b134'; ctx.beginPath(); ctx.arc(130, 150, 26, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = dark ? '#f7f4ee' : '#16213a'
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
    ctx.font = '800 112px Inter, "Helvetica Neue", Arial, sans-serif'
    ctx.fillText(name.toUpperCase(), 250, 150)
    ctx.fillStyle = dark ? '#a9b8d6' : '#4a5878'
    ctx.font = '600 38px ui-monospace, Menlo, monospace'
    ctx.fillText(tagline.toUpperCase(), 256, 212)
  })
}

/** A dashboard on the engineering wall screen: a chart and a few status rows. */
export function dashboardScreen() {
  return canvasTexture('dashboard-screen', 256, 144, (ctx) => {
    ctx.fillStyle = '#0f1a24'; ctx.fillRect(0, 0, 256, 144)
    ctx.strokeStyle = '#4fd1a5'; ctx.lineWidth = 3
    ctx.beginPath()
    const rand = random(29)
    for (let x = 0; x <= 150; x += 15) ctx.lineTo(12 + x, 110 - x * 0.35 - rand() * 28)
    ctx.stroke()
    ;['#4fd1a5', '#4fd1a5', '#f2b134', '#4fd1a5'].forEach((color, row) => {
      ctx.fillStyle = color; ctx.fillRect(180, 22 + row * 26, 10, 10)
      ctx.fillStyle = '#c9d6e3'; ctx.fillRect(196, 24 + row * 26, 44, 6)
    })
  })
}

/** Exposed red brick for feature walls. */
export function brickWall(repeat: [number, number]) {
  return canvasTexture(`brick-${repeat.join('x')}`, 256, 256, (ctx) => {
    const rand = random(41)
    ctx.fillStyle = '#d8cfc4'; ctx.fillRect(0, 0, 256, 256)
    for (let row = 0; row < 8; row += 1) {
      for (let col = -1; col < 5; col += 1) {
        const x = col * 64 + (row % 2) * 32
        const shade = 150 + Math.floor(rand() * 40)
        ctx.fillStyle = `rgb(${shade + 20}, ${Math.floor(shade * 0.45)}, ${Math.floor(shade * 0.33)})`
        ctx.fillRect(x + 2, row * 32 + 2, 60, 28)
      }
    }
  }, repeat)
}

/** Terrazzo: pale stone with coloured chips, the commons floor. */
export function terrazzo(repeat: [number, number]) {
  return canvasTexture(`terrazzo-${repeat.join('x')}`, 256, 256, (ctx) => {
    const rand = random(17)
    ctx.fillStyle = '#ece6dc'; ctx.fillRect(0, 0, 256, 256)
    const chips = ['#e76f51', '#2a9d8f', '#e9c46a', '#8d99ae', '#f4a3b4', '#264653']
    for (let i = 0; i < 260; i += 1) {
      ctx.fillStyle = chips[i % chips.length]
      ctx.beginPath()
      const x = rand() * 256; const y = rand() * 256; const r = 1.5 + rand() * 4
      ctx.ellipse(x, y, r, r * (0.5 + rand() * 0.5), rand() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
  }, repeat)
}

/** A neon tube sign: glowing script on a transparent background. */
export function neonText(text: string, color: string) {
  return canvasTexture(`neon-${text}-${color}`, 1024, 256, (ctx) => {
    ctx.clearRect(0, 0, 1024, 256)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    let size = 130
    do { ctx.font = `italic 700 ${size}px "Brush Script MT", "Segoe Script", cursive`; size -= 6 } while (ctx.measureText(text).width > 940 && size > 30)
    ctx.shadowColor = color; ctx.shadowBlur = 28
    ctx.strokeStyle = color; ctx.lineWidth = 10; ctx.strokeText(text, 512, 128)
    ctx.shadowBlur = 8
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5; ctx.strokeText(text, 512, 128)
  })
}

/** A sajadah (prayer rug): a field with a border and an arch at the head end. */
export function sajadah(color: string) {
  return canvasTexture(`sajadah-${color}`, 128, 256, (ctx) => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 256)
    ctx.strokeStyle = '#e9c46a'; ctx.lineWidth = 6; ctx.strokeRect(8, 8, 112, 240)
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(24, 110); ctx.lineTo(24, 60); ctx.quadraticCurveTo(64, 10, 104, 60); ctx.lineTo(104, 110); ctx.stroke()
    ctx.fillStyle = 'rgba(233,196,106,0.5)'
    for (let i = 0; i < 6; i += 1) ctx.fillRect(20 + i * 16, 200, 8, 30)
  })
}

/** What is on at the rooftop cinema: a sunset over the sea with a sailing boat. */
export function movieScreen() {
  return canvasTexture('movie-screen', 256, 144, (ctx) => {
    const sky = ctx.createLinearGradient(0, 0, 0, 100)
    sky.addColorStop(0, '#2b2d6e'); sky.addColorStop(0.6, '#e76f51'); sky.addColorStop(1, '#f4a261')
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 256, 100)
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(128, 98, 26, Math.PI, 0); ctx.fill()
    ctx.fillStyle = '#1d3557'; ctx.fillRect(0, 98, 256, 46)
    ctx.fillStyle = '#0d1b2a'; ctx.beginPath(); ctx.moveTo(60, 104); ctx.lineTo(96, 104); ctx.lineTo(90, 112); ctx.lineTo(66, 112); ctx.fill()
    ctx.fillRect(77, 78, 2, 26); ctx.beginPath(); ctx.moveTo(79, 80); ctx.lineTo(94, 101); ctx.lineTo(79, 101); ctx.fill()
  })
}
