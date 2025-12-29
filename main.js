const express = require('express')
const mineflayer = require('mineflayer')
const { pathfinder } = require('mineflayer-pathfinder')

const app = express()
const PORT = 3000

let bot = null
let isBusy = false
let antiAfkTimeout = null

/* ---------- BOT ---------- */

function createBot () {
  console.log('[BOT] Initializing...')

  bot = mineflayer.createBot({
    host: 'play.darkryptus.us.to',
    port: 12949,
    username: 'Alex_Walker',
    version: '1.8.9',
    auth: 'offline',
    keepAlive: true
  })

  bot.loadPlugin(pathfinder)

  bot.on('spawn', () => {
    console.log('[BOT] Spawned')
    startSmartAntiAfk()
  })

  bot.on('chat', async (username, message) => {
    if (username === bot.username) return
    message = message.toLowerCase()

    if (message === 'yo') {
      bot.chat('yo')
      return
    }

    if (message === 'alex sleep') {
      isBusy = true
      stopAntiAfk()

      try {
        const bed = bot.findBlock({
          matching: block => bot.isABed(block),
          maxDistance: 32
        })

        if (!bed) {
          bot.chat('No bed nearby.')
          isBusy = false
          startSmartAntiAfk()
          return
        }

        bot.clearControlStates()
        await bot.lookAt(bed.position.offset(0.5, 0.5, 0.5), true)
        await bot.waitForTicks(20)
        await bot.sleep(bed)

        bot.chat('Sleeping.')
      } catch (e) {
        bot.chat("Can't sleep.")
      }

      isBusy = false
      startSmartAntiAfk()
    }
  })

  bot.on('end', () => {
    console.log('[BOT] Disconnected')
    stopAntiAfk()
    bot = null
    setTimeout(createBot, 5000)
  })

  bot.on('error', err => console.log('[BOT] Error:', err.message))
}

/* ---------- SMART ANTI-AFK ---------- */

function rand (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function stopAntiAfk () {
  if (antiAfkTimeout) clearTimeout(antiAfkTimeout)
}

function startSmartAntiAfk () {
  stopAntiAfk()

  const run = async () => {
    if (!bot || !bot.entity || isBusy) return scheduleNext()

    bot.clearControlStates()

    // 🔍 Check nearby players
    const nearby = Object.values(bot.entities)
      .find(e => e.type === 'player' && e.username !== bot.username && e.position.distanceTo(bot.entity.position) < 5)

    if (nearby) {
      await bot.lookAt(nearby.position.offset(0, 1.6, 0), true)
      bot.setControlState('sneak', true)
      setTimeout(() => bot.setControlState('sneak', false), 800)
      return scheduleNext()
    }

    const state = rand(1, 8)

    switch (state) {
      case 1: // idle
        break

      case 2: // micro walk
        bot.setControlState('forward', true)
        setTimeout(() => bot.clearControlStates(), rand(300, 900))
        break

      case 3: // circle
        bot.setControlState('forward', true)
        bot.setControlState(Math.random() > 0.5 ? 'left' : 'right', true)
        setTimeout(() => bot.clearControlStates(), rand(1000, 2000))
        break

      case 4: // look around
        bot.look(Math.random() * Math.PI * 2, rand(-0.3, 0.3))
        break

      case 5: // sneak tap
        bot.setControlState('sneak', true)
        setTimeout(() => bot.setControlState('sneak', false), rand(300, 1000))
        break

      case 6: // inventory interaction
        try {
          bot.setQuickBarSlot(rand(0, 8))
          await bot.waitForTicks(10)
        } catch {}
        break

      case 7: // jump
        bot.setControlState('jump', true)
        setTimeout(() => bot.setControlState('jump', false), 300)
        break

      case 8: // break block below (rare)
        try {
          const block = bot.blockAt(bot.entity.position.offset(0, -1, 0))
          if (block && bot.canDigBlock(block)) {
            await bot.dig(block)
          }
        } catch {}
        break
    }

    scheduleNext()
  }

  const scheduleNext = () => {
    antiAfkTimeout = setTimeout(run, rand(3000, 12000))
  }

  scheduleNext()
}

/* ---------- EXPRESS ---------- */

app.get('/', (req, res) => {
  res.json({ status: bot ? 'ONLINE' : 'OFFLINE' })
})

app.listen(PORT, () => {
  console.log(`[WEB] Running on http://localhost:${PORT}`)
})

/* ---------- START ---------- */

createBot()
