const express = require('express')
const mineflayer = require('mineflayer')
const { pathfinder } = require('mineflayer-pathfinder')

const app = express()
const PORT = 3000

let bot = null
let isBusy = false
let reconnecting = false
let movementInterval = null
let headInterval = null

/* ---------- USERNAME ROTATION ---------- */

let nameIndex = 0
const MAX_INDEX = 100
const ROTATION_INTERVAL = 3 * 60 * 60 * 1000

function getUsername () {
  return `alex${nameIndex}`
}

function incrementUsername () {
  nameIndex++
  if (nameIndex > MAX_INDEX) nameIndex = 0
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

  bot.on('login', () => {
    console.log(`[BOT] Logged in as ${username}`)
  })

  bot.on('spawn', () => {
    console.log('[BOT] Spawned')
    startRandomMovement()
    startHeadMovement()
  })

  bot.on('chat', async (username, message) => {
    if (username === bot.username) return
    message = message.toLowerCase()

    if (message === 'yo') {
      bot.chat('yo')
      return
    }
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

    if (reconnecting) return
    reconnecting = true
    bot = null

    setImmediate(() => {
      reconnecting = false
      createBot()
    })
  })

  bot.on('kicked', reason => {
    console.log('[BOT] Kicked:', reason)
  })

  bot.on('error', err => {
    console.log('[BOT] Error:', err.message)
  })
}

/* ---------- RANDOM MOVEMENT ---------- */

function randomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function doJump () {
  bot.setControlState('jump', true)
  setTimeout(() => bot.setControlState('jump', false), 350)

  // 30% chance to double-jump
  if (Math.random() < 0.3) {
    setTimeout(() => {
      bot.setControlState('jump', true)
      setTimeout(() => bot.setControlState('jump', false), 300)
    }, 450)
  }
}

function startRandomMovement () {
  if (movementInterval) clearInterval(movementInterval)

  movementInterval = setInterval(async () => {
    if (!bot || !bot.entity || isBusy) return

    const roll = Math.random()

    // 🔼 EXTRA frequent jumps (independent of actions)
    if (roll < 0.35) {
      doJump()
      return
    }

    const action = randomInt(1, 6)
    bot.clearControlStates()

    switch (action) {
      case 1:
        bot.setControlState('forward', true)
        setTimeout(() => bot.clearControlStates(), 1800)
        break

      case 2:
        bot.setControlState('forward', true)
        bot.setControlState(Math.random() > 0.5 ? 'left' : 'right', true)
        setTimeout(() => bot.clearControlStates(), 2200)
        break

      case 3:
        bot.setControlState('sneak', true)
        setTimeout(() => bot.setControlState('sneak', false), 1600)
        break

      case 4:
        break

      case 5:
        break

      case 6:
        break
    }
  }, 3000) // faster decision loop
}

/* ---------- SMOOTH HEAD ROTATION ---------- */

let targetYaw = 0
let targetPitch = 0

function startHeadMovement () {
  if (headInterval) clearInterval(headInterval)

  targetYaw = bot.entity.yaw
  targetPitch = bot.entity.pitch

  headInterval = setInterval(() => {
    if (!bot || !bot.entity) return

    if (Math.random() < 0.2) {
      targetYaw = Math.random() * Math.PI * 2
      targetPitch = (Math.random() * 0.6) - 0.3
    }

    const yaw = bot.entity.yaw
    const pitch = bot.entity.pitch

    const yawDiff = normalizeAngle(targetYaw - yaw)
    const pitchDiff = targetPitch - pitch

    bot.look(
      yaw + yawDiff * 0.18,
      pitch + pitchDiff * 0.18,
      true
    )
  }, 250)
}

function normalizeAngle (angle) {
  while (angle > Math.PI) angle -= Math.PI * 2
  while (angle < -Math.PI) angle += Math.PI * 2
  return angle
}

/* ---------- USERNAME ROTATION ---------- */

setInterval(() => {
  console.log('[BOT] Rotating username...')

  reconnecting = true
  if (bot) bot.quit()

  incrementUsername()

  setImmediate(() => {
    reconnecting = false
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
