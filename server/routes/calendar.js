import express from 'express'
import crypto from 'crypto'
import { supabaseAdmin } from '../config/supabase-admin.js'

const router = express.Router()

// Simple token: hmac of userId with server secret — deterministic, no DB needed
const CALENDAR_SECRET = process.env.CALENDAR_SECRET || 'gestion-locative-ical-secret'

function makeToken(userId) {
  return crypto.createHmac('sha256', CALENDAR_SECRET).update(userId).digest('hex').slice(0, 32)
}

function escapeIcs(str = '') {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

function formatIcsDate(dateStr, timeStr) {
  if (!dateStr) return null
  const d = dateStr.replace(/-/g, '')
  if (timeStr) {
    const t = timeStr.replace(':', '') + '00'
    return `${d}T${t}`
  }
  return d  // DATE only (all-day)
}

function buildVevent({ uid, summary, description, dtstart, dtend, allDay }) {
  const lines = ['BEGIN:VEVENT']
  lines.push(`UID:${uid}`)
  lines.push(`SUMMARY:${escapeIcs(summary)}`)
  if (description) lines.push(`DESCRIPTION:${escapeIcs(description)}`)
  if (allDay) {
    lines.push(`DTSTART;VALUE=DATE:${dtstart}`)
    lines.push(`DTEND;VALUE=DATE:${dtend || dtstart}`)
  } else {
    lines.push(`DTSTART:${dtstart}`)
    lines.push(`DTEND:${dtend || dtstart}`)
  }
  lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`)
  lines.push('END:VEVENT')
  return lines.join('\r\n')
}

/**
 * GET /api/calendar/token
 * Returns the subscription token for the current authenticated user
 * Header: Authorization: Bearer <supabase_jwt>
 */
router.get('/token', async (req, res) => {
  const jwt = req.headers.authorization?.replace('Bearer ', '')
  if (!jwt) return res.status(401).json({ error: 'Non autorisé' })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(jwt)
  if (error || !user) return res.status(401).json({ error: 'Token invalide' })

  res.json({ token: makeToken(user.id), userId: user.id })
})

/**
 * GET /api/calendar/feed/:userId?token=xxx
 * Public ICS feed. Validates token before returning data.
 */
router.get('/feed/:userId', async (req, res) => {
  const { userId } = req.params
  const { token } = req.query

  // Allow any origin — calendar apps don't send a browser Origin header
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (!token || token !== makeToken(userId)) {
    return res.status(403).send('Token invalide')
  }

  try {
    const vevents = []

    // 1. Manual calendar_events
    const { data: events } = await supabaseAdmin
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)

    for (const evt of events || []) {
      const dtstart = formatIcsDate(evt.date, evt.heure)
      if (!dtstart) continue
      const allDay = !evt.heure
      const dtend = allDay
        ? formatIcsDate(evt.date)   // same day for all-day
        : dtstart.slice(0, 8) + 'T' + String((parseInt(dtstart.slice(9, 13)) + 100)).padStart(4, '0') + '00'

      vevents.push(buildVevent({
        uid: `evt-${evt.id}@gestion-locative`,
        summary: evt.titre || 'Événement',
        description: evt.description || '',
        dtstart,
        dtend,
        allDay,
      }))
    }

    // 2. Locations — fin de bail + alertes
    const { data: locations } = await supabaseAdmin
      .from('locations')
      .select('*, appartements(titre), locataires(nom, prenom)')
      .eq('user_id', userId)
      .eq('statut', 'actif')

    for (const loc of locations || []) {
      const appt = loc.appartements?.titre || 'Appartement'
      const tenant = `${loc.locataires?.prenom || ''} ${loc.locataires?.nom || ''}`.trim()

      // Fin de bail
      if (loc.date_fin) {
        const d = formatIcsDate(loc.date_fin)
        vevents.push(buildVevent({
          uid: `bail-fin-${loc.id}@gestion-locative`,
          summary: `Fin de bail — ${appt}`,
          description: tenant ? `Locataire : ${tenant}` : '',
          dtstart: d,
          dtend: d,
          allDay: true,
        }))

        // Alerte 3 mois avant
        const alertDate = new Date(loc.date_fin)
        alertDate.setMonth(alertDate.getMonth() - 3)
        const ad = formatIcsDate(alertDate.toISOString().split('T')[0])
        vevents.push(buildVevent({
          uid: `bail-alerte-${loc.id}@gestion-locative`,
          summary: `Bail bientôt — ${appt} (dans 3 mois)`,
          description: tenant ? `Locataire : ${tenant}` : '',
          dtstart: ad,
          dtend: ad,
          allDay: true,
        }))
      }

      // Loyers mensuels (prochain 12 mois)
      if (loc.date_debut) {
        const start = new Date(loc.date_debut)
        const today = new Date()
        const limit = new Date(today)
        limit.setFullYear(limit.getFullYear() + 1)

        let d = new Date(start)
        d.setDate(loc.jour_paiement || 1)
        if (d < today) {
          d.setMonth(d.getMonth() + 1)
        }
        let count = 0
        while (d <= limit && count < 13) {
          const ds = formatIcsDate(d.toISOString().split('T')[0])
          const amount = (loc.loyer_mensuel || 0) + (loc.charges_mensuelles || 0)
          vevents.push(buildVevent({
            uid: `loyer-${loc.id}-${ds}@gestion-locative`,
            summary: `Loyer ${appt} — ${amount.toLocaleString('fr-FR')} EUR`,
            description: tenant ? `Locataire : ${tenant}` : '',
            dtstart: ds,
            dtend: ds,
            allDay: true,
          }))
          d.setMonth(d.getMonth() + 1)
          count++
        }
      }
    }

    // 3. Build ICS
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Gestion Locative//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Gestion Locative',
      'X-WR-TIMEZONE:Europe/Paris',
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',  // apps should refresh every 1h
      ...vevents,
      'END:VCALENDAR',
    ].join('\r\n')

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', 'inline; filename="gestion-locative.ics"')
    res.setHeader('Cache-Control', 'no-cache, no-store')
    res.send(ics)

  } catch (err) {
    console.error('Erreur génération ICS:', err)
    res.status(500).send('Erreur serveur')
  }
})

export default router
