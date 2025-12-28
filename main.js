const express = require('express')
const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')

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
    console.log('[BOT] Spawned in the world')
    // ❌ removed auto "yo"
  })

  /* ---------- CHAT COMMANDS ---------- */

  bot.on('chat', async (username, message) => {
    if (username === bot.username) return

    // respond to "yo"
    if (message.toLowerCase() === 'yo') {
      bot.chat('yo')
      return
    }

    // sleep command
    if (message.toLowerCase() === 'alex sleep') {
      try {
        const bed = bot.findBlock({
          matching: block => bot.isABed(block),
          maxDistance: 32
        })

        if (!bed) {
          bot.chat("I can't find a bed nearby.")
          return
        }

        const mcData = require('minecraft-data')(bot.version)
        const movements = new Movements(bot, mcData)
        bot.pathfinder.setMovements(movements)

        bot.chat('Going to bed...')

        await bot.pathfinder.goto(
          new goals.GoalBlock(bed.position.x, bed.position.y, bed.position.z)
        )

        await bot.sleep(bed)
        bot.chat('Respawn point set 👍')

      } catch (err) {
        bot.chat("Can't sleep right now.")
        console.log('[BOT] Sleep error:', err.message)
      }
    }
  })

  bot.on('kicked', reason => {
    console.log('[BOT] Kicked:', reason)
  })

  bot.on('end', reason => {
    console.log('[BOT] Disconnected:', reason)
    bot = null

    setTimeout(() => {
      console.log('[BOT] Reconnecting...')
      createBot()
    }, 5000)
  })

  bot.on('error', err => {
    console.error('[BOT] Error:', err)
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

/* ---------- AUTO START BOT ---------- */

createBot()
