import { useState } from 'react'
import { Lock } from 'lucide-react'
import useAppStore from '../../store/useAppStore'

// type: 'kpi' | 'revenue'
export default function PasscodeGate({ children, type = 'kpi' }) {
  const { kpiUnlocked, setKpiUnlocked, revenueUnlocked, setRevenueUnlocked } = useAppStore()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)

  const isUnlocked = type === 'revenue' ? revenueUnlocked : kpiUnlocked
  const setUnlocked = type === 'revenue' ? setRevenueUnlocked : setKpiUnlocked

  const TITLES = {
    kpi: { heading: 'KPI Access', sub: 'Enter your 6-digit passcode to view sales targets' },
    revenue: { heading: 'Revenue Access', sub: 'Enter your 6-digit passcode to view revenue data' },
  }
  const { heading, sub } = TITLES[type] || TITLES.kpi

  if (isUnlocked) return children

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (attempts >= 3) return

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const res = await fetch(`${apiUrl}/api/kpis/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: code }),
      })
      if (res.ok) {
        setUnlocked(true)
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        setError(newAttempts >= 3 ? 'Too many attempts. Locked.' : 'Incorrect passcode.')
        setCode('')
      }
    } catch {
      setError('Backend not running. Start the backend server.')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="text-brand-600" size={24} />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{heading}</h2>
        <p className="text-sm text-gray-500 mb-6">{sub}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-center text-xl tracking-widest mb-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="• • • • • •"
            disabled={attempts >= 3}
            autoFocus
          />
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          <button
            type="submit"
            disabled={code.length < 6 || attempts >= 3}
            className="w-full bg-brand-500 text-white py-2 rounded-lg font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Unlock
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-4">Default passcode: <span className="font-mono">123456</span></p>
      </div>
    </div>
  )
}
