const express = require('express')
const mineflayer = require('mineflayer')
const { pathfinder } = require('mineflayer-pathfinder')

const app = express()
const PORT = 3000

let bot = null
let reconnecting = false
let isRotating = false

let movementInterval = null
let headInterval = null
let rotationInterval = null // 🔒 SINGLETON ROTATION TIMER

/* ---------- USERNAME ROTATION ---------- */

let nameIndex = 1
const MAX_INDEX = 100
const ROTATION_INTERVAL = 5 * 60 * 1000 // ✅ 5 MINUTES

function getUsername () {
  return `alex${nameIndex}`
}

function incrementUsername () {
  nameIndex++
  if (nameIndex > MAX_INDEX) nameIndex = 1
}

/* ---------- BOT ---------- */

function createBot () {
  const username = getUsername()
  console.log(`[BOT] Connecting as ${username}`)

  bot = mineflayer.createBot({
    host: 'play.darkryptus.us.to',
    port: 12949,
    username,
    version: '1.8.9',
    auth: 'offline',
    keepAlive: true
  })

  bot.loadPlugin(pathfinder)

  bot.on('spawn', () => {
    console.log('[BOT] Spawned')
    startMovement()
    startHeadMovement()
  })

  bot.on('end', () => {
    console.log('[BOT] Disconnected')

    stopMovement()
    stopHeadMovement()

    // ❌ DO NOT auto-reconnect if rotation caused this
    if (isRotating) return

    if (reconnecting) return
    reconnecting = true

    setTimeout(() => {
      reconnecting = false
      createBot()
    }, 3000) // small safe delay (prevents throttle)
  })

  bot.on('kicked', r => console.log('[BOT] Kicked:', r?.toString()))
  bot.on('error', e => console.log('[BOT] Error:', e.message))
}

/* ---------- ROTATION (FIXED) ---------- */

function startRotationTimer () {
  if (rotationInterval) return // 🔒 PREVENT DUPLICATES

  rotationInterval = setInterval(() => {
    console.log('[BOT] Rotating username')

    isRotating = true
    if (bot) bot.quit()

    incrementUsername()

    setTimeout(() => {
      isRotating = false
      createBot()
    }, 3000) // grace delay so server doesn’t rage
  }, ROTATION_INTERVAL)
}

/* ---------- MOVEMENT ---------- */

function startMovement () {
  stopMovement()

  movementInterval = setInterval(() => {
    if (!bot || !bot.entity) return

    bot.clearControlStates()

    // frequent jump
    if (Math.random() < 0.3) {
      bot.setControlState('jump', true)
      setTimeout(() => bot.setControlState('jump', false), 300)
    }

    const r = Math.random()

    if (r < 0.4) {
      bot.setControlState('forward', true)
      setTimeout(() => bot.clearControlStates(), 1200)
    } else if (r < 0.7) {
      bot.setControlState('forward', true)
      bot.setControlState(Math.random() > 0.5 ? 'left' : 'right', true)
      setTimeout(() => bot.clearControlStates(), 1400)
    }
  }, 1500)
}

function stopMovement () {
  if (movementInterval) {
    clearInterval(movementInterval)
    movementInterval = null
  }
}

/* ---------- HEAD MOVEMENT ---------- */

let targetYaw = 0
let targetPitch = 0

function startHeadMovement () {
  stopHeadMovement()

  targetYaw = bot.entity.yaw
  targetPitch = bot.entity.pitch

  headInterval = setInterval(() => {
    if (!bot || !bot.entity) return

    if (Math.random() < 0.25) {
      targetYaw = Math.random() * Math.PI * 2
      targetPitch = (Math.random() * 0.6) - 0.3
    }

    const yaw = bot.entity.yaw
    const pitch = bot.entity.pitch

    bot.look(
      yaw + normalizeAngle(targetYaw - yaw) * 0.2,
      pitch + (targetPitch - pitch) * 0.2,
      true
    )
  }, 250)
}

function stopHeadMovement () {
  if (headInterval) {
    clearInterval(headInterval)
    headInterval = null
  }
}

function normalizeAngle (a) {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

/* ---------- EXPRESS ---------- */

app.get('/', (req, res) => {
  res.json({
    status: bot ? 'ONLINE' : 'OFFLINE',
    username: bot?.username || null
  })
})

app.listen(PORT, () => {
  console.log(`[WEB] http://localhost:${PORT}`)
})

/* ---------- START ---------- */

createBot()
startRotationTimer()
