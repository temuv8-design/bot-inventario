import { Telegraf, Markup, session } from 'telegraf'
import axios from 'axios'
import { GoogleSpreadsheet } from 'google-spreadsheet'

/* ===============================
   CONFIGURACIÓN
================================ */

// 🔐 Telegram
const BOT_TOKEN = '8277605226:AAE2umv8jq7RYa4i1FX9hJCspASyp2vg_YQ'

// 🔐 OpenRouter
const OPENROUTER_API_KEY = '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'
const OPENROUTER_MODEL = 'openai/gpt-3.5-turbo'

// 🔐 Google Sheets
const GOOGLE_SHEET_ID = '154lrq8dHXnxfDUXzgseIKT0MpGEKY9NGlgOBxXOM0wk'

// Credenciales extraídas de tu JSON
const GOOGLE_SERVICE_ACCOUNT = {
  client_email: 'bot-inventario-139@bot-inventario-telegram.iam.gserviceaccount.com',
  private_key: `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCwaE6jORznYlM3
amwtf7G2CGljLalR7GF7dEyV8Qcr2+rBClslqaccWygUGYuJEZT+/IoNHOl5GW5W
fYfy0QT8M2Mx/LWY5XQ9XNX/eoicE4m2yg1b1tkqVDPUmgZFU7MIolUhulZU6IUp
kJ9nSJGVyqrmKgEbzagCGmMsLglPGjwREFTYD3BFTXyT/+em/Ci9wQBKML7vaFQ9
lK0rWjn2YK/LAJDkxScm2x0dyrT07E6+lb6dzWaNWDgDsQbAmHl1MUuV/Nl10znY
XwauSmwx+Q4krYSgrWBZYqTY2R8fkZ6lJxtRkAzJb8EtSuGbQQRwOl5wygBbJ272
bJcXQ4dlAgMBAAECggEACKnOtthesYRUJuQMlP1w6komds7uwk20Cd6PxktUeVRv
BnTuPf7DbLKTWM1aW2xoH0+irfsuAhr8HrZCf2vBbWtOo01QU8Zs+3h8L/RCEjwp
ZrcsicaW2qvQ8c9woGX4ZGOof6QJiljy9TQbh/R55dvSocQNUuK6LgRCu5A1N9Oy
mb9UfnZasY/IEo/FBFfw8f6IrUK6IufKHM0CoZycBwIyNb4Kbt9ZrLFjoG5XCKLY
gNbN1g1zhk//rSF6wEuUHebsz7pDek3sURnowpfdRYTI+2uIquWNziN8E8RI8CPV
mnCxwIj+SRqQtVQYS4N2tlcz+POGM9uMt2Dv/I5mIQKBgQDf5IG0xYs/lDCIKfAK
7Z4nHbXSL2If330aMcakYfJ0wMqleQweBC8GOE3/5/2gqiXV/G4ZHhb6lAseT37B
3aY29QpKAFL5BwwIyF0Tm5FGsZQIhjN5fCdGZ73uklnML4GfGTcbxyw655h5O4Vr
gTL3B72Sw9Kwq2In/wk5HrzOlQKBgQDJtIlbPzCzTbCcQasJ7wU3cHDHb0lR+iun
INVbf7E28T5KRnstAhcPOxBUdxECZb+9Tq2J1I8fb2qcVprfsIgKd1Hw3noEVva1
DreM+6+7UyG7HQYbVal7DBFEZMX6p3XerLlg61RxbplfvEGnSergrrA7shi+5KUO
vLcN1agxkQKBgHpWP9FpB5dr/8DHOZSfFgXFpC3/GhzUX2VKwYHcy0Ckf5Y/ODHG
k3NQnL4yI1IA5r+wOPCckm3FKvYa9eY0mLf62O5qkuvjv92krccjABSiv4KQ4duF
zWgZE50idtKtOqSWgJg7Ep31IklMDrEZXaHBpwJk4eELJI06O+3sL7qpAoGAAzaR
CZcUG4cdTR/urZXVK3DrGwI21Mt7boojW/XIyOtG5sAArlLeMyvpsq7C4prkVwut
0AhGz2Vi+WKXzQBu6lvEPmYM44zPGUtGuUQ5JG7KlsR7mGvg60jh7Yj9bmTEh+uQ
eG7HRZdRcij5ksSmrTWbMRhBNKlHx9hRwjKpH0ECgYBbtait8a48CmHHIsZsgcqh
z/8xqSgbfG+rs0GeX+6pwgoR7POMPxLpaYDjfWGlzhkVFGKJPuwYrvAw87MQ4vfS
4r6t/JlMlugadGv3iul2p7n5QHQsAJhUBjktJ2Gb1esDLuve2+DTysckAsRAgAih
URSywPm4R4ejxbyfHlb23A==
-----END PRIVATE KEY-----`
}

/* ===============================
   INIT
================================ */

const bot = new Telegraf(BOT_TOKEN)
bot.use(session())

const sheet = new GoogleSpreadsheet(GOOGLE_SHEET_ID)

/* ===============================
   GOOGLE SHEETS
================================ */

async function loadSheet() {
  await sheet.useServiceAccountAuth(GOOGLE_SERVICE_ACCOUNT)
  await sheet.loadInfo()
  return sheet.sheetsByIndex[0]
}

async function getInventory() {
  const ws = await loadSheet()
  return await ws.getRows()
}

async function updateStock(row, newStock) {
  row.Stock = newStock
  await row.save()
}

/* ===============================
   OPENROUTER IA
================================ */

async function interpretQuery(text) {
  try {
    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Extrae solo las palabras clave más importantes del pedido separadas por espacio.'
          },
          { role: 'user', content: text }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    return res.data.choices[0].message.content.toLowerCase()
  } catch {
    return text.toLowerCase()
  }
}

/* ===============================
   BÚSQUEDA
================================ */

function searchProducts(rows, keywords) {
  return rows.filter((row) => {
    const blob = `${row.Nombre} ${row.Marca} ${row.Modelo} ${row.Sinonimos}`.toLowerCase()
    return keywords.split(' ').every((k) => blob.includes(k))
  })
}

/* ===============================
   BOT
================================ */

bot.start((ctx) => {
  ctx.reply('👋 Bienvenido\nEscribe el repuesto que buscas.')
})

bot.on('text', async (ctx) => {
  ctx.sendChatAction('typing')
  const keywords = await interpretQuery(ctx.message.text)
  const inventory = await getInventory()
  const results = searchProducts(inventory, keywords)

  if (!results.length) return ctx.reply('❌ No encontré ese repuesto.')

  ctx.session = { results }

  ctx.reply(
    `🔎 Encontré ${results.length} opciones`,
    Markup.inlineKeyboard(
      results.map((r, i) =>
        Markup.button.callback(`${i + 1}️⃣ ${r.Marca} – S/${r.Precio}`, `select_${i}`)
      )
    )
  )
})

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

console.log('🤖 Bot activo')
