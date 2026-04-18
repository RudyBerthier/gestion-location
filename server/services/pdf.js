import PDFDocument from 'pdfkit'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchImageBuffer(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' })
    return Buffer.from(response.data, 'binary')
  } catch (error) {
    console.error("Erreur téléchargement de la signature:", error.message)
    return null
  }
}

function numberToWords(n) {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']
  if (n === 0) return 'zéro'
  let result = ''
  if (n >= 1000) {
    const m = Math.floor(n / 1000)
    result += (m === 1 ? 'mille' : numberToWords(m) + ' mille')
    n %= 1000
    if (n > 0) result += ' '
  }
  if (n >= 100) {
    const c = Math.floor(n / 100)
    result += (c === 1 ? 'cent' : units[c] + ' cent')
    n %= 100
    if (n > 0) result += ' '
  }
  if (n >= 20) {
    const t = Math.floor(n / 10)
    const u = n % 10
    if (t === 7 || t === 9) {
      result += tens[t] + '-' + units[10 + u]
    } else if (t === 8) {
      result += 'quatre-vingt' + (u > 0 ? '-' + units[u] : 's')
    } else {
      result += tens[t] + (u === 1 && t !== 8 ? '-et-un' : (u > 0 ? '-' + units[u] : ''))
    }
  } else if (n > 0) {
    result += units[n]
  }
  return result
}

function getQuittanceNumber(dateStr) {
  const d = new Date(dateStr)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function getTermeDates(dateStr) {
  const d = new Date(dateStr)
  const first = new Date(d.getFullYear(), d.getMonth(), 1)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const fmt = (dt) => dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return { debut: fmt(first), fin: fmt(last) }
}

const fmt = (n) => n % 1 === 0 ? `${n} EUR` : `${n.toFixed(2)} EUR`

export async function generateQuittancePDF(paiementId) {
  return new Promise(async (resolve, reject) => {
    try {
      const { data: paiement, error } = await supabase
        .from('paiements')
        .select(`
          *,
          locations(
            loyer_mensuel, charges_mensuelles, date_debut, type_bail,
            appartements(titre, adresse, ville, code_postal),
            locataires(nom, prenom, email, telephone)
          ),
          profiles(nom, prenom, telephone, entreprise, signature_url)
        `)
        .eq('id', paiementId)
        .single()

      if (error) { console.error("Supabase Error:", error); throw new Error("Erreur DB: " + error.message) }
      if (!paiement) throw new Error("Paiement introuvable")

      const proprio = paiement.profiles
      const loc = paiement.locations.locataires
      const apt = paiement.locations.appartements

      const loyer = Number(paiement.montant || 0)
      const charges = Number(paiement.montant_charges || 0)
      const total = loyer + charges

      const totalEnLettres = numberToWords(Math.round(total))
      const numQuittance = getQuittanceNumber(paiement.date_paiement)
      const terme = getTermeDates(paiement.date_paiement)
      const dateFait = new Date(paiement.date_paiement).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const villeFait = apt.ville || ''
      const propNom = proprio.entreprise || `${proprio.prenom || ''} ${proprio.nom || ''}`.trim()
      const locNom = `${loc.prenom || ''} ${loc.nom || ''}`.trim()

      // PDF setup
      const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `Quittance N° ${numQuittance}` } })
      const buffers = []
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => resolve(Buffer.concat(buffers)))

      const W = 595
      const H = 842
      const ML = 70

      // Fond blanc
      doc.rect(0, 0, W, H).fill('#ffffff')

      // Numéro (haut gauche)
      doc.fontSize(9).fillColor('#666666').font('Helvetica')
        .text(`N° : ${numQuittance}`, ML, 38, { width: W - ML * 2 })

      // Montant (haut droite)
      doc.fontSize(22).fillColor('#000000').font('Helvetica-Bold')
        .text(fmt(total), ML, 32, { width: W - ML * 2, align: 'right' })

      // Séparateur
      doc.rect(ML, 58, W - ML * 2, 0.5).fill('#bbbbbb')

      // Titre centré
      doc.fontSize(20).fillColor('#000000').font('Helvetica-Bold')
        .text('QUITTANCE DE LOYER', ML, 66, { width: W - ML * 2, align: 'center' })

      // Séparateur bas
      doc.rect(ML, 98, W - ML * 2, 0.5).fill('#bbbbbb')

      // Corps
      doc.y = 155

      doc.fontSize(13).fillColor('#000000').font('Helvetica')
        .text('Reçu de ', ML, doc.y, { continued: true })
        .font('Helvetica-Bold')
        .text(locNom.toUpperCase())

      doc.moveDown(0.7)

      doc.fontSize(11).fillColor('#000000').font('Helvetica')
        .text('Loyer mensuel : ', ML, doc.y, { continued: true })
        .font('Helvetica-Bold')
        .text(fmt(loyer), { continued: charges > 0 })

      if (charges > 0) {
        doc.font('Helvetica')
          .text('   +  Charges : ', { continued: true })
          .font('Helvetica-Bold')
          .text(fmt(charges))
      } else {
        doc.text('')
      }

      doc.moveDown(1.2)

      doc.fontSize(11).fillColor('#000000').font('Helvetica')
        .text('la somme de : ', ML, doc.y, { continued: true })
        .font('Helvetica-Bold')
        .text(`${totalEnLettres} euros`, { continued: true })
        .font('Helvetica')
        .text(` (${fmt(total)})`)

      doc.moveDown(1.2)

      doc.fontSize(11).font('Helvetica').fillColor('#000000')
        .text('pour loyer et accessoires des locaux sis à :', ML)

      doc.moveDown(0.5)

      // Bloc adresse (sans cadre)
      const addrY = doc.y
      doc.fontSize(12).fillColor('#000000').font('Helvetica-Bold')
        .text(apt.adresse || apt.titre, ML, addrY, { width: W - ML * 2 - 30 })
      doc.fontSize(11).fillColor('#444444').font('Helvetica')
        .text(`${apt.code_postal || ''} ${apt.ville || ''}`, ML, doc.y, { width: W - ML * 2 - 30 })

      doc.moveDown(1.5)

      doc.fontSize(11).fillColor('#000000').font('Helvetica')
        .text('en paiement du terme courant', ML)
      doc.moveDown(0.4)
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#000000')
        .text(`du ${terme.debut}`, ML, doc.y, { continued: true })
        .font('Helvetica')
        .text('   au   ', { continued: true })
        .font('Helvetica-Bold')
        .text(terme.fin)

      doc.moveDown(1)

      doc.fontSize(10).fillColor('#555555').font('Helvetica')
        .text('sous réserve de tous mes droits.', ML)

      // Séparateur
      doc.moveDown(1.5)
      doc.rect(ML, doc.y, W - ML * 2, 0.5).fill('#bbbbbb')
      doc.moveDown(1.5)

      // Fait à / Signature
      const sigZoneY = doc.y

      doc.fontSize(11).fillColor('#000000').font('Helvetica')
        .text('Fait à ', ML, sigZoneY, { continued: true })
        .font('Helvetica-Bold').text(villeFait, { continued: true })
        .font('Helvetica').text('  le  ', { continued: true })
        .font('Helvetica-Bold').text(dateFait)

      doc.moveDown(0.5)
      doc.fontSize(11).fillColor('#333333').font('Helvetica').text(propNom, ML)

      // Zone signature (sans cadre, avec libellé)
      const sigBoxX = W - ML - 180
      const sigBoxY = sigZoneY
      doc.fontSize(11).fillColor('#000000').font('Helvetica')
        .text('Signature', sigBoxX, sigBoxY + 4, { width: 180, align: 'center' })

      if (proprio.signature_url) {
        try {
          const sigBuffer = await fetchImageBuffer(proprio.signature_url)
          if (sigBuffer) doc.image(sigBuffer, sigBoxX + 10, sigBoxY + 20, { fit: [160, 70] })
        } catch (e) { console.error("Signature ignorée.") }
      }

      // Footer
      doc.rect(ML, H - 35, W - ML * 2, 0.5).fill('#bbbbbb')
      doc.fontSize(7).fillColor('#999999').font('Helvetica')
        .text(
          `Quittance N° ${numQuittance} — Conforme loi n°89-462 du 6 juillet 1989 — ${propNom}`,
          ML, H - 26, { width: W - ML * 2, align: 'center' }
        )

      doc.end()

    } catch (error) {
      console.error(error)
      reject(error)
    }
  })
}
