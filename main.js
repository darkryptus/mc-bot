const express = require('express')
const mineflayer = require('mineflayer')
const { pathfinder } = require('mineflayer-pathfinder')

const app = express()
const PORT = 3000

let bot = null
let isBusy = false // used to stop random movement when sleeping

/* ---------- BOT ---------- */

function createBot () {
  console.log('[BOT] Initializing...')

  bot = mineflayer.createBot({
    host: 'play.darkryptus.us.to',
    port: 12949,
    username: 'alex71',
    version: '1.8.9',
    auth: 'offline',
    keepAlive: true
  })

  bot.loadPlugin(pathfinder)

  bot.on('login', () => {
    console.log('[BOT] Logged in')
  })

  bot.on('spawn', () => {
    console.log('[BOT] Spawned')
    startRandomMovement()
  })

  /* ---------- CHAT COMMANDS ---------- */

  bot.on('chat', async (username, message) => {
    if (username === bot.username) return
    message = message.toLowerCase()

    if (message === 'yo') {
      bot.chat('yo')
      return
    }

    if (message === 'alex sleep') {
      isBusy = true

      try {
        const bed = bot.findBlock({
          matching: block => bot.isABed(block),
          maxDistance: 32
        })

        if (!bed) {
          bot.chat('No bed nearby.')
          isBusy = false
          return
        }

        bot.pathfinder.setGoal(null)
        bot.clearControlStates()

        await bot.lookAt(bed.position.offset(0.5, 0.5, 0.5), true)
        await bot.waitForTicks(20)
        await bot.sleep(bed)

        bot.chat('Sleeping. Respawn set.')
      } catch (err) {
        bot.chat("Can't sleep now.")
        console.log('[BOT] Sleep error:', err.message)
      }

      isBusy = false
    }
  })

  bot.on('kicked', reason => {
    console.log('[BOT] Kicked:', reason)
  })

  bot.on('end', () => {
    console.log('[BOT] Disconnected')
    bot = null

    setTimeout(() => {
      console.log('[BOT] Reconnecting...')
      createBot()
    }, 5000)
  })

  bot.on('error', err => {
    console.log('[BOT] Error:', err.message)
  })
}

/* ---------- RANDOM MOVEMENT ---------- */

function randomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function startRandomMovement () {
  setInterval(async () => {
    if (!bot || !bot.entity || isBusy) return

    const action = randomInt(1, 8)
    bot.clearControlStates()

    switch (action) {
      case 1: // walk forward
        bot.setControlState('forward', true)
        setTimeout(() => bot.clearControlStates(), 2000)
        break

      case 2: // circle movement
        bot.setControlState('forward', true)
        bot.setControlState(Math.random() > 0.5 ? 'left' : 'right', true)
        setTimeout(() => bot.clearControlStates(), 2500)
        break

      case 3: // jump
        bot.setControlState('jump', true)
        setTimeout(() => bot.setControlState('jump', false), 400)
        break

      case 4: // sneak
        bot.setControlState('sneak', true)
        setTimeout(() => bot.setControlState('sneak', false), 2000)
        break

      case 5: // look around
        bot.look(Math.random() * Math.PI * 2, 0)
        break

      case 6: // break block below
        try {
          const block = bot.blockAt(bot.entity.position.offset(0, -1, 0))
          if (block && bot.canDigBlock(block)) {
            await bot.dig(block)
          }
        } catch {}
        break

      case 7: // place block below
        try {
          const item = bot.inventory.items()[0]
          if (!item) return

          const refBlock = bot.blockAt(bot.entity.position.offset(0, -1, 0))
          if (!refBlock) return

          await bot.equip(item, 'hand')
          await bot.placeBlock(refBlock, { x: 0, y: 1, z: 0 })
        } catch {}
        break

      case 8: // idle
        break
    }
  }, 4000)
}

/* ---------- EXPRESS ---------- */

app.get('/', (req, res) => {
  res.json({
    status: bot ? 'ONLINE' : 'OFFLINE'
  })
})

app.listen(PORT, () => {
  console.log(`[WEB] Server running on http://localhost:${PORT}`)
})

/* ---------- START ---------- */

createBot()
