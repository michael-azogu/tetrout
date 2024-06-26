import './style.css'

import theme from '../public/audio/theme.wav'
import wall_bounce_tone from '../public/audio/wall.wav'
import brick_break_tone from '../public/audio/brick.wav'

const play = (url: string) => new Audio(url).play()

type Brick = { x: number; y: number; color: string; isBody: boolean }

let broken = 0
let ended = false

let time = 0
setInterval(() => time++, 1000)

const HIGH_SCORE_KEY = 'hiscore'
let high_score = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0)
const score_div = document.getElementById('score')!

const brick_size = 20

setTimeout(() => {
  play(theme)
  setInterval(() => play(theme), 40e3)
}, 2000)

const well = document.createElement('canvas')
well.width = brick_size * 9
well.height = brick_size * 16

const scene = well.getContext('2d')!
const blank = scene.createImageData(well.width, well.height)
document.querySelector<HTMLDivElement>('#game')!.append(well)

const bg_layer = document.createElement('canvas')
bg_layer.width = well.width
bg_layer.height = well.height
const bg_ctx = bg_layer.getContext('2d')!

function paint_bg() {
  redraw_layer(bg_ctx, (ctx) => {
    ctx.fillStyle = '#333'
    ctx.rect(0, 0, well.width, well.height)
    ctx.fill()
    ctx.strokeStyle = '#777'
    ctx.lineWidth = 1
    for (let x = 0; x <= well.width; x += brick_size) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, well.height)
      ctx.stroke()
    }
    for (let y = 0; y <= well.height; y += brick_size) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(well.width, y)
      ctx.stroke()
    }
    ctx.closePath()
  })
}

const tetris_layer = document.createElement('canvas')
tetris_layer.width = well.width
tetris_layer.height = well.height
const tetris_ctx = tetris_layer.getContext('2d')!

const balls_layer = document.createElement('canvas')
balls_layer.width = well.width
balls_layer.height = well.height
const balls_ctx = balls_layer.getContext('2d')!

const layers: HTMLCanvasElement[] = [bg_layer, tetris_layer, balls_layer]
paint_bg()

const tetriminos: Brick[][][] = [
  {
    color: '#F1CF48',
    cells: [
      [1, 1],
      [1, 1],
    ],
  },
  {
    color: '#7CC661',
    cells: [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  {
    color: '#FE7633',
    cells: [
      [1, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
  },
  {
    color: '#3F42E7',
    cells: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
  },
  {
    color: '#FA524D',
    cells: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
].map((data) =>
  data.cells.map((row, y) =>
    row.map((cell, x) => ({
      x: (3 + x) * brick_size,
      y: (-3 + y) * brick_size,
      color: data.color,
      isBody: cell == 1,
    }))
  )
)

const next_tetrimino = (() => {
  let index = 0
  return () => {
    const tetrimino = tetriminos[index]
    index = (index + 1) % tetriminos.length
    return tetrimino.map((row) => row.map((part) => ({ ...part } as Brick)))
  }
})()

let current_tetrimino = next_tetrimino()
const get_body = (list: Brick[][]) => list.flat().filter((cell) => cell.isBody)

let settled: Brick[] = []

function paint_tetriminos() {
  redraw_layer(tetris_ctx, (ctx) => {
    ;[...settled, ...current_tetrimino.flat()].forEach(
      ({ x, y, color, isBody }) => {
        if (isBody) {
          ctx.beginPath()
          ctx.rect(x, y, brick_size, brick_size)
          ctx.fillStyle = color
          ctx.fill()
          ctx.stroke()
          ctx.closePath()
        }
      }
    )
  })
}

class Ball {
  radius: number = 5
  cx: number = this.radius
  cy: number = this.radius

  dx: number = 0.7071
  dy: number = 0.7071

  update() {
    const { cx, cy, dx, dy, radius } = this

    let collided: { x: number; y: number } = { x: -1, y: -1 }
    settled.forEach((part) => {
      const { x, y } = part

      const closestX = Math.max(x, Math.min(cx, x + brick_size))
      const closestY = Math.max(y, Math.min(cy, y + brick_size))

      const distanceX = cx - closestX
      const distanceY = cy - closestY

      const distanceSquared = distanceX * distanceX + distanceY * distanceY
      if (distanceSquared <= radius ** 2) {
        broken++

        let overlapX = radius - Math.abs(distanceX)
        let overlapY = radius - Math.abs(distanceY)

        if (overlapX < overlapY) {
          this.dx = -this.dx
        } else {
          this.dy = -this.dy
        }
        collided.x = x
        collided.y = y
        play(brick_break_tone)
      }
    })

    settled = settled.filter(
      (part) => !(part.x == collided.x && part.y == collided.y)
    )

    if (cx + dx > well.width - radius || cx + dx < radius) {
      this.dx = -dx
      play(wall_bounce_tone)
    }
    if (cy + dy > well.height - radius || cy + dy < radius) {
      this.dy = -dy
      play(wall_bounce_tone)
    }
    this.cx += dx
    this.cy += dy
  }
}

const balls = [new Ball()]

setTimeout(() => balls.push(new Ball()), 20e3)

function paint_balls() {
  redraw_layer(balls_ctx, (ctx) => {
    balls.forEach(({ cx, cy, radius }) => {
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#ccc'
      ctx.stroke()
      ctx.closePath()
    })
  })
}
paint_balls()

let balltick = setInterval(() => {
  if (ended) clearInterval(balltick)
  balls.forEach((ball) => {
    ball.update()
  })
  paint_balls()
}, 6)

let tick_down = setInterval(() => {
  if (ended) clearInterval(tick_down)

  const next = current_tetrimino.map((row) =>
    row.map((t) => ({ ...t, y: t.y + brick_size }))
  )
  const nextBody = get_body(next)

  if (with_settled(nextBody) && nextBody.some((part) => part.y <= 0)) {
    ended = true
    alert('Game Over')
    return location.reload()
  }

  current_tetrimino = next
  if (
    with_settled(nextBody) ||
    nextBody.some((part) => part.isBody && part.y >= well.height - brick_size)
  ) {
    settled.push(...nextBody.flat())

    current_tetrimino = next_tetrimino()
  }

  paint_tetriminos()
}, 180)

function with_wall(body: Brick[]) {
  return body.some(
    (part) => part.isBody && (part.x < 0 || part.x >= well.width)
  )
}

function with_settled(body: Brick[]) {
  return settled.flat().some((ps) => {
    return body.some(
      (pb) =>
        ps.isBody && pb.isBody && pb.x == ps.x && pb.y == ps.y - brick_size
    )
  })
}

// copied from github.com/antfu/utils/blob/main/src/array.ts#L138
function range(...args: any): number[] {
  let start: number, stop: number, step: number

  if (args.length === 1) {
    start = 0
    step = 1
    ;[stop] = args
  } else {
    ;[start, stop, step = 1] = args
  }

  const arr: number[] = []
  let current = start
  while (current < stop) {
    arr.push(current)
    current += step || 1
  }
  return arr
}

document.addEventListener('keydown', (e) => {
  if (e.key == 'ArrowLeft' || e.key == 'ArrowRight') {
    const by = e.key == 'ArrowLeft' ? -brick_size : brick_size
    const shiftedBlock = current_tetrimino.map((row) =>
      row.map((t) => ({ ...t, x: t.x + by } as Brick))
    )

    const bodyMovedSideways = get_body(shiftedBlock)

    if (!with_wall(bodyMovedSideways) && !with_settled(bodyMovedSideways)) {
      current_tetrimino = shiftedBlock
    }
  }

  if (e.key == 'ArrowDown' || e.key == 'ArrowUp') {
    const next = current_tetrimino.map((row) =>
      row.map((t) => ({ ...t } as Brick))
    )

    const Clockwise = range(0, current_tetrimino[0].length, 1).map((i) =>
      range(0, current_tetrimino.length, 1)
        .map((j) => ({ ...current_tetrimino[j][i] }))
        .reverse()
    )

    const AntiClockwise = range(0, current_tetrimino[0].length, 1)
      .reverse()
      .map((i) =>
        range(0, current_tetrimino.length, 1).map((j) => ({
          ...current_tetrimino[j][i],
        }))
      )

    const rotation = [Clockwise, AntiClockwise]
    const rotatedBlock = rotation[e.key == 'ArrowDown' ? 0 : 1]
    for (let i = 0; i < current_tetrimino.length; i++) {
      for (let j = 0; j < current_tetrimino[i].length; j++) {
        next[i][j].isBody = rotatedBlock[i][j].isBody
      }
    }

    const rotatedBody = get_body(next)

    if (!with_settled(rotatedBody) && !with_wall(rotatedBody)) {
      current_tetrimino = next
    }
  }
})

function redraw_layer(
  ctx: CanvasRenderingContext2D,
  cb: (ctx: CanvasRenderingContext2D) => void
) {
  ctx.clearRect(0, 0, well.width, well.height)
  ctx.putImageData(blank, well.width, well.height)
  cb(ctx)
  compose()
}

function compose() {
  scene.clearRect(0, 0, well.width, well.height)
  layers.forEach((layer) => scene.drawImage(layer, 0, 0))

  const score = time + broken
  if (score > high_score) {
    localStorage.setItem(HIGH_SCORE_KEY, String(high_score))
    high_score = score
  }
  score_div.textContent = String('HISCORE: ' + high_score + ' SCORE: ' + score)
}
