import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()

// CRM Routes
import clientsRouter from './routes/crm/clients.js'
import dealsRouter from './routes/crm/deals.js'
import followUpsRouter from './routes/crm/followUps.js'
import meetingLogsRouter from './routes/crm/meetingLogs.js'
import revenueRouter from './routes/crm/revenue.js'
import kpisRouter from './routes/crm/kpis.js'
import invoicesRouter from './routes/crm/invoices.js'
import emailRouter from './routes/crm/email.js'
import presentationsRouter from './routes/crm/presentations.js'
import travelRouter from './routes/crm/travel.js'
import productionRouter from './routes/crm/production.js'
import ratesRouter from './routes/crm/rates.js'
import targetsRouter from './routes/crm/targets.js'
import dashboardRouter from './routes/crm/dashboard.js'

// Intel Routes
import sitesRouter from './routes/intel/sites.js'
import scrapeRouter from './routes/intel/scrape.js'
import fbSearchRouter from './routes/intel/fbSearch.js'
import brandsRouter from './routes/intel/brands.js'
import intelDashboardRouter from './routes/intel/dashboard.js'

const app = express()

app.use(cors({ origin: (origin, cb) => cb(null, true), credentials: true }))
app.use(express.json({ limit: '10mb' }))

// Health check — used by frontend to detect if backend is online
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

// CRM
app.use('/api/crm/dashboard', dashboardRouter)
app.use('/api/clients', clientsRouter)
app.use('/api/deals', dealsRouter)
app.use('/api/follow-ups', followUpsRouter)
app.use('/api/meeting-logs', meetingLogsRouter)
app.use('/api/revenue', revenueRouter)
app.use('/api/kpis', kpisRouter)
app.use('/api/invoices', invoicesRouter)
app.use('/api/email', emailRouter)
app.use('/api/presentations', presentationsRouter)
app.use('/api/travel', travelRouter)
app.use('/api/production', productionRouter)
app.use('/api/rates', ratesRouter)
app.use('/api/targets', targetsRouter)

// Intel
app.use('/api/intel/dashboard', intelDashboardRouter)
app.use('/api/sites', sitesRouter)
app.use('/api/scrape', scrapeRouter)
app.use('/api/fb-search', fbSearchRouter)
app.use('/api/brands', brandsRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`))
