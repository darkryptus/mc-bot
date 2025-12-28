const express = require('express')
const mineflayer = require('mineflayer')

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

  bot.on('login', () => {
    console.log('[BOT] Logged in')
  })

  bot.on('spawn', () => {
    console.log('[BOT] Spawned in the world')

    // delayed chat to avoid antibot
    setTimeout(() => {
      bot.chat('yo')
    }, 3000)
  })

  bot.on('kicked', reason => {
    console.log('[BOT] Kicked:', reason)
  })

  bot.on('end', reason => {
    console.log('[BOT] Disconnected:', reason)
    bot = null

    // optional auto-reconnect
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
