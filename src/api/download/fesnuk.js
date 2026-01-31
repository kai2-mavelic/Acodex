const axios = require('axios')
const crypto = require('crypto')

/* ===============================
   COOKIE GENERATOR
================================ */
function generateSaveFBSCookies() {
  const timestamp = Math.floor(Date.now() / 1000)

  const cookies = [
    `_ga_6LKB37X4CF=GS2.1.s${timestamp}$o1$g0$t${timestamp}$j60$l0$h0`,
    `_ga=GA1.1.${crypto.randomInt(100000000, 999999999)}.${timestamp}`,
    `fpestid=${crypto.randomBytes(32).toString('hex').toUpperCase()}`,
    `FCCDCF=%5Bnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2C%5B%5B32%2C%22%5B%5C%22${crypto.randomBytes(16).toString('hex')}-${crypto.randomBytes(4).toString('hex')}-${crypto.randomBytes(4).toString('hex')}-${crypto.randomBytes(4).toString('hex')}-${crypto.randomBytes(12).toString('hex')}%5C%22%2C%5B${timestamp}000000%2C${crypto.randomInt(100000000, 999999999)}%5D%5D%22%5D%5D%5D`,
    `FCNEC=%5B%5B%22${Buffer.from(crypto.randomBytes(50)).toString('base64')}%22%5D%5D`
  ]

  return cookies.join('; ')
}

/* ===============================
   PARSER
================================ */
function parseDownloadLinks(html) {
  const hd = html.match(/Download\s*\(HD\).*?href="([^"]+)"/s)
  const sd = html.match(/Download\s*\(SD\).*?href="([^"]+)"/s)
  const title = html.match(/<h3[^>]*>([^<]+)<\/h3>/)
  const owner = html.match(/<strong>Owner:<\/strong>\s*([^<]+)/)
  const thumb = html.match(/<img[^>]+src="([^"]+)"/)

  return {
    title: title ? title[1].trim() : 'Facebook Video',
    owner: owner ? owner[1].trim() : 'Unknown',
    thumbnail: thumb ? thumb[1] : null,
    hd: hd ? decodeURIComponent(hd[1]) : null,
    sd: sd ? decodeURIComponent(sd[1]) : null
  }
}

/* ===============================
   CORE DOWNLOADER
================================ */
async function saveFBS(url) {
  const payload = {
    vid: url,
    prefix: "savefbs.com",
    ex: "tik_ytb_ig_tw_pin",
    format: ""
  }

  const headers = {
    "content-type": "application/json",
    "origin": "https://savefbs.com",
    "referer": "https://savefbs.com/",
    "user-agent":
      "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
    "cookie": generateSaveFBSCookies()
  }

  const res = await axios.post(
    "https://savefbs.com/api/v1/aio/html",
    payload,
    { headers, timeout: 30000 }
  )

  return parseDownloadLinks(res.data)
}

/* ===============================
   EXPRESS ENDPOINT
================================ */
module.exports = function (app) {
  app.get('/download/facebook', async (req, res) => {
    const { url } = req.query

    if (!url)
      return res.status(400).json({
        status: false,
        message: "parameter url wajib diisi",
        author: "Kado"
      })

    try {
      const data = await saveFBS(url)
      res.json({
        status: true,
        author: "Kado",
        result: data
      })
    } catch (e) {
      res.status(500).json({
        status: false,
        author: "Kado",
        message: e.message
      })
    }
  })
                                                                   }
