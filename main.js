const express = require('express')
const mineflayer = require('mineflayer')
const { pathfinder } = require('mineflayer-pathfinder')

const app = express()
const PORT = 3000

let bot = null
let isBusy = false
let reconnecting = false
let isRotating = false
let movementInterval = null
let headInterval = null

/* ---------- USERNAME ROTATION ---------- */

let nameIndex = 1                 // start from alex1
const MAX_INDEX = 100
const ROTATION_INTERVAL = 2 * 60 * 1000 // ✅ EVERY 2 MINUTES

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
  console.log(`[BOT] Initializing as ${username}...`)

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
    startRandomMovement()
    startHeadMovement()
  })

  bot.on('end', () => {
    console.log('[BOT] Disconnected')

    if (movementInterval) {
      clearInterval(movementInterval)
      movementInterval = null
    }

    if (headInterval) {
      clearInterval(headInterval)
      headInterval = null
    }

    // ❌ do NOT reconnect here if this disconnect was for rotation
    if (isRotating) return

    if (reconnecting) return
    reconnecting = true
    bot = null

    setImmediate(() => {
      reconnecting = false
      createBot()
    })
  })

  bot.on('kicked', r => console.log('[BOT] Kicked:', r))
  bot.on('error', e => console.log('[BOT] Error:', e.message))
}

/* ---------- MOVEMENT ---------- */

function randomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function doJump () {
  bot.setControlState('jump', true)
  setTimeout(() => bot.setControlState('jump', false), 300)

  if (Math.random() < 0.3) {
    setTimeout(() => {
      bot.setControlState('jump', true)
      setTimeout(() => bot.setControlState('jump', false), 250)
    }, 400)
  }
}

function startRandomMovement () {
  if (movementInterval) clearInterval(movementInterval)

  movementInterval = setInterval(() => {
    if (!bot || !bot.entity || isBusy) return

    bot.clearControlStates()

    if (Math.random() < 0.3) doJump()

    const action = randomInt(1, 4)

    switch (action) {
      case 1:
        bot.setControlState('forward', true)
        setTimeout(() => bot.clearControlStates(), randomInt(800, 1400))
        break

      case 2:
        bot.setControlState('forward', true)
        bot.setControlState(Math.random() > 0.5 ? 'left' : 'right', true)
        setTimeout(() => bot.clearControlStates(), randomInt(900, 1500))
        break

      case 3:
        bot.setControlState('sneak', true)
        setTimeout(() => bot.setControlState('sneak', false), randomInt(600, 1200))
        break

      case 4:
        break
    }
  }, 1500)
}

/* ---------- HEAD MOVEMENT ---------- */

let targetYaw = 0
let targetPitch = 0

function startHeadMovement () {
  if (headInterval) clearInterval(headInterval)

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

    const yawDiff = normalizeAngle(targetYaw - yaw)
    const pitchDiff = targetPitch - pitch

    bot.look(
      yaw + yawDiff * 0.2,
      pitch + pitchDiff * 0.2,
      true
    )
  }, 250)
}

function normalizeAngle (a) {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

/* ---------- ROTATION TIMER ---------- */

setInterval(() => {
  console.log('[BOT] Rotating username...')

  isRotating = true
  if (bot) bot.quit()

  incrementUsername()

  setImmediate(() => {
    isRotating = false
    createBot()
  })
}, ROTATION_INTERVAL)

/* ---------- EXPRESS ---------- */

app.get('/', (req, res) => {
  res.json({
    status: bot ? 'ONLINE' : 'OFFLINE',
    username: bot ? bot.username : null
  })
})

app.listen(PORT, () => {
  console.log(`[WEB] Server running on http://localhost:${PORT}`)
})

/* ---------- START ---------- */

createBot()
