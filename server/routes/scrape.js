import express from 'express'
import axios from 'axios'

const router = express.Router()

/**
 * GET /api/scrape/leboncoin?url=https://www.leboncoin.fr/locations/...
 *
 * Fetches the Leboncoin listing page server-side (no CORS),
 * extracts the embedded __NEXT_DATA__ JSON, and returns structured data.
 */
router.get('/leboncoin', async (req, res) => {
  const { url } = req.query

  if (!url || !url.includes('leboncoin.fr')) {
    return res.status(400).json({ error: 'URL Leboncoin invalide' })
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Cache-Control': 'no-cache',
      },
      timeout: 10000,
    })

    const html = response.data

    // ── Méthode 1 : __NEXT_DATA__ (Next.js embedded JSON) ──────────────────
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1])
        const ad = nextData?.props?.pageProps?.ad

        if (ad) {
          const result = extractFromNextData(ad)
          return res.json({ success: true, source: 'next_data', ...result })
        }
      } catch (e) {
        console.warn('Erreur parsing __NEXT_DATA__:', e.message)
      }
    }

    // ── Méthode 2 : JSON-LD (schema.org) ───────────────────────────────────
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1])
        const result = extractFromJsonLd(jsonLd)
        if (result.titre) {
          return res.json({ success: true, source: 'json_ld', ...result })
        }
      } catch (e) {
        console.warn('Erreur parsing JSON-LD:', e.message)
      }
    }

    // ── Méthode 3 : Meta tags OG ───────────────────────────────────────────
    const result = extractFromMeta(html)
    if (result.titre) {
      return res.json({ success: true, source: 'meta', ...result })
    }

    return res.status(422).json({ error: 'Impossible d\'extraire les données de cette annonce.' })

  } catch (error) {
    if (error.response?.status === 403 || error.response?.status === 429) {
      return res.status(503).json({ error: 'Leboncoin bloque la requête (anti-bot). Essayez à nouveau dans quelques secondes.' })
    }
    console.error('Erreur scraping Leboncoin:', error.message)
    return res.status(500).json({ error: 'Erreur lors du chargement de l\'annonce.' })
  }
})

// ── Extracteurs ─────────────────────────────────────────────────────────────

function extractFromNextData(ad) {
  const location = ad.location || {}
  const attributes = ad.attributes || []

  const getAttr = (key) => attributes.find(a => a.key === key)?.value_label || attributes.find(a => a.key === key)?.value

  const surface = parseFloat(getAttr('square') || getAttr('rooms_surface_area') || 0) || undefined
  const nb_pieces = parseInt(getAttr('rooms') || 0) || undefined
  const loyer = parseFloat(ad.price?.[0] || 0) || undefined

  // Charges
  const chargesRaw = getAttr('charges_included')
  const charges = chargesRaw === '1' ? undefined : parseFloat(getAttr('monthly_charges') || 0) || undefined

  // ── Address precision detection ──────────────────────────────
  // Leboncoin often hides the exact address and shows things like:
  // "Centre ville", "Quartier Gare", "Proche commerces", etc.
  const rawAddress = location.address || ''
  const city = location.city || ''
  const zipcode = location.zipcode || ''
  const district = location.district_name || location.area_label || location.city_label || ''

  // Detect if rawAddress is genuinely a street address.
  // Real street: "12 Rue Victor Hugo", "3 Avenue de la Gare"
  // Fake/vague:  "73000, Chambéry", "73000 Chambéry", "Centre ville", "Quartier Gare"

  // Pattern: starts with 4-5 digit postal code (optionally followed by comma/space + city)
  const ZIPCODE_CITY_RE = /^\d{4,5}[,\s]/

  // Pattern: real street = number + known street keyword
  const REAL_STREET_RE = /^\d+[\s,]*(rue|avenue|av\.|boulevard|bd|chemin|impasse|allée|passage|voie|route|place|cité|hameau|résidence|villa|domaine)/i

  // Known vague labels from Leboncoin
  const VAGUE_PATTERNS = [
    /^centre.ville/i, /^hyper.centre/i, /^centre$/i,
    /^quartier/i, /^proche/i, /^pr[eè]s/i, /^secteur/i,
    /^nord$/i, /^sud$/i, /^est$/i, /^ouest$/i,
    /^zone/i, /^boulevard\s*$/i, /^rue\s*$/i,
    /^[a-zàâçéèêëîïôùûü\s-]{2,40}$/i,  // purely alphabetic (no number) = vague
  ]

  const isZipCity = ZIPCODE_CITY_RE.test(rawAddress.trim())      // "73000, Chambéry"
  const isRealStreet = REAL_STREET_RE.test(rawAddress.trim())    // "12 Rue Victor Hugo"
  const isVagueLabel = VAGUE_PATTERNS.some(p => p.test(rawAddress.trim()))
  const isVague = !rawAddress || isZipCity || (!isRealStreet && isVagueLabel)

  // Build best possible address — leave empty if vague so form field stays blank
  const adresse = isVague ? '' : rawAddress

  return {
    titre: ad.subject || '',
    adresse,                          // empty if inexact (so form stays blank)
    ville: city,
    code_postal: zipcode,
    quartier: district || rawAddress, // show as hint in modal
    adresse_incomplete: isVague,
    loyer_base: loyer,
    charges,
    surface,
    nb_pieces,
    description: ad.body || '',
    images: (ad.images?.urls || []).slice(0, 8),
  }
}

function extractFromJsonLd(data) {
  return {
    titre: data.name || '',
    adresse: data.address?.streetAddress || '',
    ville: data.address?.addressLocality || '',
    code_postal: data.address?.postalCode || '',
    loyer_base: parseFloat(data.offers?.price) || undefined,
    description: data.description || '',
  }
}

function extractFromMeta(html) {
  const og = (prop) => {
    const m = html.match(new RegExp(`<meta property="og:${prop}" content="([^"]*)"`, 'i'))
    return m ? m[1] : ''
  }
  return {
    titre: og('title') || '',
    description: og('description') || '',
  }
}

// ── Image Proxy ──────────────────────────────────────────────────────────────
// Fetches Leboncoin images server-side to bypass CORS + hotlink protection.
// Returns the raw binary, client converts to File and uploads to Supabase.
router.get('/image-proxy', async (req, res) => {
  const { url } = req.query

  if (!url) return res.status(400).json({ error: 'URL manquante' })

  // Only allow Leboncoin image CDN domains
  const ALLOWED = ['img.leboncoin.fr', 'static.leboncoin.fr', 'photos.leboncoin.fr', 'img-leboncoin.fr']
  let hostname
  try { hostname = new URL(url).hostname } catch { return res.status(400).json({ error: 'URL invalide' }) }
  if (!ALLOWED.some(d => hostname.endsWith(d))) {
    return res.status(403).json({ error: 'Domaine non autorisé' })
  }

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.leboncoin.fr/',
        'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
      },
    })

    const ct = response.headers['content-type'] || 'image/jpeg'
    res.setHeader('Content-Type', ct)
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.send(Buffer.from(response.data))
  } catch (e) {
    console.error('Image proxy error:', e.message)
    res.status(502).json({ error: 'Impossible de télécharger l\'image' })
  }
})

export default router
