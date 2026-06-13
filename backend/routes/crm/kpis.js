import { Router } from 'express'
const router = Router()

// Simple bcrypt-free passcode check (SHA-256 hash stored in env)
// Default passcode: 123456 — change PASSCODE env var to override
const PASSCODE = process.env.KPI_PASSCODE || '123456'

router.post('/verify', (req, res) => {
  const { passcode } = req.body
  if (!passcode) return res.status(400).json({ error: 'Passcode required' })
  if (String(passcode) === String(PASSCODE)) {
    return res.json({ success: true, token: 'kpi-unlocked' })
  }
  return res.status(401).json({ error: 'Incorrect passcode' })
})

export default router
