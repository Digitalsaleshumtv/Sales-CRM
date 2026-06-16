import { useEffect, useState } from 'react'
import { Award, TrendingUp, Users, Target } from 'lucide-react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
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

const COMMITTED_STATUSES = ['Locked','RO Received','Billed','Sent to Finance','Completed']
const PIPELINE_STATUSES  = ['Pitch Sent','In Negotiation','Under Process']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const YEARLY_TARGET  = 8_333_333
const MONTHLY_TARGET = Math.round(YEARLY_TARGET / 12)

function fmt(n) {
  if (!n && n !== 0) return '—'
  if (n >= 10_000_000) return `₨${(n/10_000_000).toFixed(2)}Cr`
  if (n >= 100_000)    return `₨${(n/100_000).toFixed(2)}L`
  return `₨${Number(n).toLocaleString()}`
}

function pct(v, t) { if (!t) return 0; return Math.min(Math.round((v/t)*100), 100) }

function fyRange() {
  const now = new Date(); const m = now.getMonth()+1; const y = now.getFullYear()
  const fyStartYear = m >= 7 ? y : y-1
  return { start: `${fyStartYear}-07-01`, label: `FY${fyStartYear}-${String(fyStartYear+1).slice(2)}` }
}

function getLast6Months() {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { label: MONTHS[d.getMonth()], year: d.getFullYear(), month: d.getMonth()+1 }
  })
}

function SparkBar({ data, target }) {
  const max = Math.max(...data.map(d => d.value), target * 0.5, 1)
  return (
    <div className="flex items-end gap-0.5 h-10">
      {data.map((d, i) => {
        const h = Math.max((d.value / max) * 100, d.value > 0 ? 8 : 2)
        const isTarget = d.value >= target
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end" title={`${d.label}: ${fmt(d.value)}`}>
            <div
              className={`w-full rounded-sm transition-all ${isTarget ? 'bg-green-400' : d.value > 0 ? 'bg-brand-400' : 'bg-gray-100'}`}
              style={{ height: `${h}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}

export default function KPIs() {
  const [allDeals, setAllDeals] = useState([])
  const [loading, setLoading]   = useState(true)
  const now      = new Date()
  const curMonth = now.getMonth()+1
  const curYear  = now.getFullYear()
  const { start: fyStart, label: fyLabel } = fyRange()
  const last6    = getLast6Months()

  useEffect(() => { fetchDeals() }, [])

  async function fetchDeals() {
    setLoading(true)
    const { data } = await supabase
      .from('deals')
      .select('value_net, status, assigned_to, created_at')
    setAllDeals(data || [])
    setLoading(false)
  }

  function committedDeals(name) {
    return allDeals.filter(d => d.assigned_to === name && COMMITTED_STATUSES.includes(d.status))
  }

  function monthlyRev(name) {
    return committedDeals(name).filter(d => {
      const dm = new Date(d.created_at)
      return dm.getMonth()+1 === curMonth && dm.getFullYear() === curYear
    }).reduce((s, d) => s + (d.value_net || 0), 0)
  }

  function ytdRev(name) {
    return committedDeals(name).filter(d => d.created_at >= fyStart)
      .reduce((s, d) => s + (d.value_net || 0), 0)
  }

  function sparkData(name) {
    return last6.map(({ label, year, month }) => ({
      label,
      value: committedDeals(name).filter(d => {
        const dm = new Date(d.created_at)
        return dm.getFullYear() === year && dm.getMonth()+1 === month
      }).reduce((s, d) => s + (d.value_net || 0), 0),
    }))
  }

  const teamStats = TEAM.map(({ name, title }) => {
    const monthly = monthlyRev(name)
    const ytd     = ytdRev(name)
    return { name, title, monthly, ytd, monthlyPct: pct(monthly, MONTHLY_TARGET), ytdPct: pct(ytd, YEARLY_TARGET), spark: sparkData(name) }
  })

  const teamMonthly        = teamStats.reduce((s, m) => s + m.monthly, 0)
  const teamYtd            = teamStats.reduce((s, m) => s + m.ytd, 0)
  const teamMonthlyTarget  = TEAM.length * MONTHLY_TARGET
  const teamYearlyTarget   = TEAM.length * YEARLY_TARGET
  const teamMonthlyPct     = pct(teamMonthly, teamMonthlyTarget)
  const teamYtdPct         = pct(teamYtd, teamYearlyTarget)

  // Pipeline forecast
  const committedYtd = allDeals.filter(d => COMMITTED_STATUSES.includes(d.status) && d.created_at >= fyStart).reduce((s,d) => s+(d.value_net||0), 0)
  const pipelineVal  = allDeals.filter(d => PIPELINE_STATUSES.includes(d.status)).reduce((s,d) => s+(d.value_net||0), 0)
  const forecast     = committedYtd + pipelineVal * 0.5
  const gap          = Math.max(0, teamYearlyTarget - committedYtd)
  const forecastPct  = pct(forecast, teamYearlyTarget)

  // Stage funnel for all deals
  const allStages = ['Prospecting','Pitch Sent','In Negotiation','Under Process','Locked','RO Received','Billed','Completed']
  const stageChart = allStages.map(s => ({
    name: s.length > 14 ? s.slice(0,13)+'…' : s,
    count: allDeals.filter(d => d.status === s).length,
    value: allDeals.filter(d => d.status === s).reduce((sum, d) => sum + (d.value_net||0), 0),
  })).filter(s => s.count > 0)

  const STAGE_COLORS = ['#94a3b8','#60a5fa','#fbbf24','#fb923c','#a78bfa','#818cf8','#4ade80','#22c55e']

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Targets & KPIs</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {MONTHS[curMonth-1]} {curYear} · {fyLabel} · {TEAM.length} team members
        </p>
      </div>

      {/* Team summary banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-brand-500 to-brand-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-medium opacity-75 uppercase tracking-wide">Team — {MONTHS[curMonth-1]} {curYear}</p>
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

      {/* Target info banner */}
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
                  <div className={`h-1.5 rounded-full transition-all ${m.monthlyPct >= 100 ? 'bg-green-500' : m.monthlyPct >= 60 ? 'bg-brand-500' : 'bg-orange-400'}`} style={{ width: `${m.monthlyPct}%` }} />
                </div>
                <p className="text-xs text-gray-400 text-right">{m.monthlyPct}% of {fmt(MONTHLY_TARGET)}</p>
              </div>

              {/* YTD */}
              <div className="space-y-1 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">YTD ({fyLabel})</span>
                  <span className="font-semibold text-gray-900">{fmt(m.ytd)}</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${m.ytdPct >= 100 ? 'bg-green-500' : m.ytdPct >= 60 ? 'bg-indigo-500' : 'bg-orange-400'}`} style={{ width: `${m.ytdPct}%` }} />
                </div>
                <p className="text-xs text-gray-400 text-right">{m.ytdPct}% of {fmt(YEARLY_TARGET)}</p>
              </div>

              {/* 6-month sparkline */}
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Last 6 months</p>
                <SparkBar data={m.spark} target={MONTHLY_TARGET} />
                <div className="flex justify-between mt-1">
                  {m.spark.map(d => <span key={d.label} className="text-[9px] text-gray-300 flex-1 text-center">{d.label}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline Forecast */}
      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-brand-500" />
            <h2 className="font-semibold text-gray-800">Pipeline Forecast — {fyLabel}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Committed YTD', value: fmt(committedYtd), sub: 'Locked + Billed + Completed', color: 'bg-green-50 border-green-100' },
              { label: 'Active Pipeline', value: fmt(pipelineVal), sub: 'Pitch + Negotiation + In Process', color: 'bg-blue-50 border-blue-100' },
              { label: '50% Weighted Forecast', value: fmt(forecast), sub: 'Committed + 50% of pipeline', color: 'bg-purple-50 border-purple-100' },
              { label: 'Gap to Target', value: fmt(gap), sub: `${pct(committedYtd, teamYearlyTarget)}% achieved`, color: gap > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100' },
            ].map(c => (
              <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{c.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{c.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
              </div>
            ))}
          </div>
          {/* Stacked forecast bar */}
          <div>
            <div className="flex h-5 rounded-full overflow-hidden bg-gray-100">
              <div className="bg-green-400 transition-all" style={{ width: `${pct(committedYtd, teamYearlyTarget)}%` }} title={`Committed: ${fmt(committedYtd)}`} />
              <div className="bg-blue-300 transition-all" style={{ width: `${Math.min(pct(pipelineVal * 0.5, teamYearlyTarget), 100 - pct(committedYtd, teamYearlyTarget))}%` }} title={`Pipeline (50%): ${fmt(pipelineVal * 0.5)}`} />
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" />Committed {pct(committedYtd, teamYearlyTarget)}%</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-blue-300 inline-block" />Pipeline (50% weighted)</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-gray-200 inline-block" />Remaining gap</span>
              <span className="ml-auto text-xs font-semibold text-gray-600">Target: {fmt(teamYearlyTarget)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Deal stage funnel chart */}
      {!loading && stageChart.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-gray-400" />
            <h2 className="font-semibold text-gray-800">Deal Stage Distribution</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stageChart} layout="vertical" margin={{ left: 10, right: 60 }}>
              <XAxis type="number" hide />
              <Tooltip
                formatter={(v, _, p) => [p.payload.count + ' deals · ' + fmt(p.payload.value), 'Stage']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 11, fill: '#6b7280', formatter: (v, entry, i) => `${v} (${fmt(stageChart[i]?.value)})` }}>
                {stageChart.map((_, i) => <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
            {[...teamStats].sort((a, b) => b.ytd - a.ytd).map((m, i) => (
              <div key={m.name} className="px-5 py-3 flex items-center gap-4">
                <span className={`w-6 text-center text-sm font-bold ${i===0?'text-yellow-500':i===1?'text-gray-400':i===2?'text-orange-400':'text-gray-300'}`}>{i+1}</span>
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs flex-shrink-0">{m.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800">{m.name}</span>
                    <span className="text-sm font-bold text-gray-900">{fmt(m.ytd)}</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${m.ytdPct>=100?'bg-green-500':'bg-brand-500'}`} style={{ width: `${m.ytdPct}%` }} />
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
