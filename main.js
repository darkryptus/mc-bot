const express = require('express')
const mineflayer = require('mineflayer')
const { pathfinder } = require('mineflayer-pathfinder')

const app = express()
const PORT = 3000

let bot = null

function createBot () {
  console.log('[BOT] Initializing...')

  bot = mineflayer.createBot({
    host: 'play.darkryptus.us.to',
    port: 12949,
    username: 'AlexWalker',
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

    // 🔒 HARD LOCK: bot can NEVER dig
    bot.canDig = false
  })

  /* ---------- CHAT COMMANDS ---------- */

  bot.on('chat', async (username, message) => {
    if (username === bot.username) return
    message = message.toLowerCase()

    // respond to "yo"
    if (message === 'yo') {
      bot.chat('yo')
      return
    }

    // alex sleep command
    if (message === 'alex sleep') {
      try {
        const bed = bot.findBlock({
          matching: block => bot.isABed(block),
          maxDistance: 32
        })

        if (!bed) {
          bot.chat('No bed nearby.')
          return
        }

        // 🛑 FULL STOP — NO MOVEMENT, NO ATTACK
        bot.pathfinder.setGoal(null)
        bot.clearControlStates()
        bot.setControlState('attack', false)
        bot.setControlState('forward', false)
        bot.setControlState('back', false)
        bot.setControlState('left', false)
        bot.setControlState('right', false)

        // 👀 LOOK AT BED
        await bot.lookAt(bed.position.offset(0.5, 0.5, 0.5), true)

        // ⏳ REQUIRED DELAY (1.8.9 FIX)
        await bot.waitForTicks(20)

        // ✅ RIGHT CLICK ONLY — NO BREAKING
        await bot.sleep(bed)

        bot.chat('Sleeping. Respawn set.')

      } catch (err) {
        bot.chat("Can't sleep now.")
        console.log('[BOT] Sleep error:', err.message)
      }
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

/* ---------- EXPRESS ---------- */

app.get('/', (req, res) => {
  res.json({
    status: bot ? 'ONLINE' : 'OFFLINE'
  })
})

app.listen(PORT, () => {
  console.log(`[WEB] Server running on http://localhost:${PORT}`)
})

/* ---------- START BOT ---------- */

createBot()
