// ⚠️ dotenv DOIT être le PREMIER import en ES modules
// Les imports statiques sont hoistés avant l'exécution du code
import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ]
    if (!origin || allowed.includes(origin)) callback(null, true)
    else callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true }))

// Static files pour les uploads locaux
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ============================================================
// ROUTES
// ============================================================
import authRoutes from './routes/auth.js'
import emailRoutes from './routes/emails.js'
import emailAccountsRoutes from './routes/email_accounts.js'
import documentRoutes from './routes/documents.js'
import etatsDesLieuxRoutes from './routes/etats_des_lieux.js'
import scrapeRoutes from './routes/scrape.js'
import calendarRoutes from './routes/calendar.js'
import adminRoutes from './routes/admin.js'

app.use('/api/auth', authRoutes)
app.use('/api/emails', emailRoutes)
app.use('/api/email-accounts', emailAccountsRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/etats-des-lieux', etatsDesLieuxRoutes)
app.use('/api/scrape', scrapeRoutes)
app.use('/api/calendar', calendarRoutes)
app.use('/api/admin', adminRoutes)

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() })
})

// ============================================================
// DÉMARRAGE
// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 Serveur Gestion-Locative V2 lancé sur http://localhost:${PORT}`)
  console.log(`📧 Resend : ${process.env.RESEND_API_KEY ? '✅ configuré' : '⚠️  non configuré'}`)
  console.log(`🗄️  Supabase : ${process.env.SUPABASE_URL ? '✅ configuré' : '⚠️  non configuré'}`)
})

export default app
