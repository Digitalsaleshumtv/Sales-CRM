import { useEffect, useState } from 'react'
import { Award, TrendingUp, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const TEAM = [
  { name: 'Aamish Mirza',  title: 'Associate Manager Digital Partnerships' },
  { name: 'Sarfaraz',      title: 'Manager Digital Partnerships' },
  { name: 'Talal',         title: 'Manager Digital Partnerships' },
  { name: 'Asif',          title: 'Senior Manager Digital Partnerships' },
  { name: 'Erum',          title: 'Manager Digital Partnerships' },
  { name: 'Ans',           title: 'Manager Digital Partnerships' },
  { name: 'Meesum',        title: 'Assistant Manager Digital Partnerships' },
]

const YEARLY_TARGET  = 8_333_333
const MONTHLY_TARGET = Math.round(YEARLY_TARGET / 12)   // ≈ 694,444

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(n) {
  if (!n && n !== 0) return '—'
  if (n >= 10_000_000) return `₨${(n / 10_000_000).toFixed(2)}Cr`
  if (n >= 100_000)    return `₨${(n / 100_000).toFixed(2)}L`
  return `₨${Number(n).toLocaleString()}`
}

function pct(v, t) {
  if (!t) return 0
  return Math.min(Math.round((v / t) * 100), 100)
}

// Financial year: Jul–Jun (Pakistan standard)
function fyRange() {
  const now = new Date()
  const m = now.getMonth() + 1  // 1-based
  const y = now.getFullYear()
  const fyStartYear = m >= 7 ? y : y - 1
  return {
    start: `${fyStartYear}-07-01`,
    label: `FY${fyStartYear}-${String(fyStartYear + 1).slice(2)}`,
  }
}

export default function KPIs() {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const now     = new Date()
  const curMonth = now.getMonth() + 1
  const curYear  = now.getFullYear()
  const { start: fyStart, label: fyLabel } = fyRange()

  useEffect(() => { fetchDeals() }, [])

  async function fetchDeals() {
    setLoading(true)
    const { data } = await supabase
      .from('deals')
      .select('amount_pkr, status, assigned_to, created_at')
      .in('status', ['won', 'active'])
    setDeals(data || [])
    setLoading(false)
  }

  function monthlyRev(name) {
    return deals
      .filter(d => {
        const dm = new Date(d.created_at)
        return d.assigned_to === name && dm.getMonth() + 1 === curMonth && dm.getFullYear() === curYear
      })
      .reduce((s, d) => s + (d.amount_pkr || 0), 0)
  }

  function ytdRev(name) {
    return deals
      .filter(d => d.assigned_to === name && d.created_at >= fyStart)
      .reduce((s, d) => s + (d.amount_pkr || 0), 0)
  }

  const teamStats = TEAM.map(({ name, title }) => {
    const monthly = monthlyRev(name)
    const ytd     = ytdRev(name)
    return {
      name, title, monthly, ytd,
      monthlyPct: pct(monthly, MONTHLY_TARGET),
      ytdPct:     pct(ytd,     YEARLY_TARGET),
    }
  })

  const teamMonthly  = teamStats.reduce((s, m) => s + m.monthly, 0)
  const teamYtd      = teamStats.reduce((s, m) => s + m.ytd, 0)
  const teamMonthlyTarget = TEAM.length * MONTHLY_TARGET
  const teamYearlyTarget  = TEAM.length * YEARLY_TARGET
  const teamMonthlyPct = pct(teamMonthly, teamMonthlyTarget)
  const teamYtdPct     = pct(teamYtd, teamYearlyTarget)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Targets & KPIs</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {MONTHS[curMonth - 1]} {curYear} · {fyLabel} · {TEAM.length} team members
        </p>
      </div>

      {/* Team summary banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-medium opacity-75 uppercase tracking-wide">Team — {MONTHS[curMonth - 1]} {curYear}</p>
              <p className="text-3xl font-bold mt-1">{fmt(teamMonthly)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-75">Monthly target</p>
              <p className="text-lg font-semibold">{fmt(teamMonthlyTarget)}</p>
            </div>
          </div>
          <div className="bg-white/20 rounded-full h-2.5">
            <div className="h-2.5 rounded-full bg-white transition-all" style={{ width: `${teamMonthlyPct}%` }} />
          </div>
          <p className="text-xs mt-2 opacity-75">{teamMonthlyPct}% of monthly target</p>
        </div>

        {/* YTD */}
        <div className="bg-gradient-to-r from-gray-700 to-gray-900 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-medium opacity-75 uppercase tracking-wide">Team — {fyLabel} YTD</p>
              <p className="text-3xl font-bold mt-1">{fmt(teamYtd)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-75">Annual target</p>
              <p className="text-lg font-semibold">{fmt(teamYearlyTarget)}</p>
            </div>
          </div>
          <div className="bg-white/20 rounded-full h-2.5">
            <div className="h-2.5 rounded-full bg-white transition-all" style={{ width: `${teamYtdPct}%` }} />
          </div>
          <p className="text-xs mt-2 opacity-75">{teamYtdPct}% of annual target</p>
        </div>
      </div>

      {/* Target reference */}
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        <TrendingUp size={16} className="text-amber-500 flex-shrink-0" />
        <span>Individual annual target: <strong>{fmt(YEARLY_TARGET)}</strong> · Monthly implied: <strong>{fmt(MONTHLY_TARGET)}</strong></span>
      </div>

      {/* Per-person cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {teamStats.map(m => (
            <div key={m.name} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              {/* Avatar + name */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {m.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{m.name}</p>
                    <p className="text-xs text-gray-400 leading-tight mt-0.5">{m.title}</p>
                  </div>
                </div>
                {m.ytdPct >= 100 && <Award size={18} className="text-yellow-500 flex-shrink-0" />}
              </div>

              {/* This month */}
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">This month</span>
                  <span className="font-medium text-gray-800">{fmt(m.monthly)}</span>
                </div>
                <div className="bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${m.monthlyPct >= 100 ? 'bg-green-500' : m.monthlyPct >= 60 ? 'bg-brand-500' : 'bg-orange-400'}`}
                    style={{ width: `${m.monthlyPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 text-right">{m.monthlyPct}% of {fmt(MONTHLY_TARGET)}</p>
              </div>

              {/* YTD */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">YTD ({fyLabel})</span>
                  <span className="font-semibold text-gray-900">{fmt(m.ytd)}</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${m.ytdPct >= 100 ? 'bg-green-500' : m.ytdPct >= 60 ? 'bg-indigo-500' : 'bg-orange-400'}`}
                    style={{ width: `${m.ytdPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 text-right">{m.ytdPct}% of {fmt(YEARLY_TARGET)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Users size={16} className="text-gray-400" />
            <h2 className="font-semibold text-gray-800">Team Leaderboard — {fyLabel} YTD</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {[...teamStats]
              .sort((a, b) => b.ytd - a.ytd)
              .map((m, i) => (
                <div key={m.name} className="px-5 py-3 flex items-center gap-4">
                  <span className={`w-6 text-center text-sm font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-300'}`}>
                    {i + 1}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {m.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">{m.name}</span>
                      <span className="text-sm font-bold text-gray-900">{fmt(m.ytd)}</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${m.ytdPct >= 100 ? 'bg-green-500' : 'bg-brand-500'}`}
                        style={{ width: `${m.ytdPct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-10 text-right">{m.ytdPct}%</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
