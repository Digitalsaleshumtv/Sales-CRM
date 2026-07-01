import { useEffect, useState } from 'react'
import { Award, TrendingUp, Users, Target, X, ChevronRight, Phone, PhoneCall, Clock, CalendarCheck, CheckCircle2, AlertCircle } from 'lucide-react'
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

const STATUS_COLORS = {
  'Locked':          'bg-purple-100 text-purple-700',
  'RO Received':     'bg-indigo-100 text-indigo-700',
  'Billed':          'bg-green-100 text-green-700',
  'Sent to Finance': 'bg-teal-100 text-teal-700',
  'Completed':       'bg-gray-100 text-gray-600',
  'Pitch Sent':      'bg-blue-100 text-blue-700',
  'In Negotiation':  'bg-yellow-100 text-yellow-700',
  'Under Process':   'bg-orange-100 text-orange-700',
  'Prospecting':     'bg-slate-100 text-slate-600',
}

const LATE_THRESHOLD = '09:15' // check-in after this = Late

function normName(s) { return String(s || '').trim().toLowerCase() }
function matchRep(repName, teamName) {
  const r = normName(repName), t = normName(teamName)
  return r === t || r.includes(t.split(' ')[0]) || t.includes(r.split(' ')[0])
}

export default function KPIs() {
  const [allDeals, setAllDeals]       = useState([])
  const [callReports, setCallReports] = useState([])
  const [attendance, setAttendance]   = useState([])
  const [checkingIn, setCheckingIn]   = useState(null)
  const [loading, setLoading]         = useState(true)
  const [selectedPerson, setSelected] = useState(null)
  const now      = new Date()
  const curMonth = now.getMonth()+1
  const curYear  = now.getFullYear()
  const { start: fyStart, label: fyLabel } = fyRange()
  const last6    = getLast6Months()

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const [{ data: deals }, { data: calls }, { data: att }] = await Promise.all([
      supabase.from('deals').select('id, name, value_net, status, assigned_to, created_at, start_date, end_date, channel, clients(name)'),
      supabase.from('call_reports').select('*').gte('report_date', monthStart),
      supabase.from('attendance').select('*').gte('date', monthStart),
    ])
    setAllDeals(deals || [])
    setCallReports(calls || [])
    setAttendance(att || [])
    setLoading(false)
  }

  async function handleCheckIn(teamName) {
    setCheckingIn(teamName)
    const today = now.toISOString().split('T')[0]
    const timeNow = now.toTimeString().slice(0, 5)
    const status = timeNow > LATE_THRESHOLD ? 'Late' : 'Present'
    await supabase.from('attendance').upsert({ rep_name: teamName, date: today, check_in_time: timeNow, status }, { onConflict: 'rep_name,date' })
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const { data } = await supabase.from('attendance').select('*').gte('date', monthStart)
    setAttendance(data || [])
    setCheckingIn(null)
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

  function repCalls(name) { return callReports.filter(c => matchRep(c.rep_name, name)) }
  function repAttendance(name) { return attendance.filter(a => matchRep(a.rep_name, name)) }
  function todayAttendance(name) {
    const today = now.toISOString().split('T')[0]
    return attendance.find(a => matchRep(a.rep_name, name) && a.date === today)
  }

  const teamStats = TEAM.map(({ name, title }) => {
    const monthly  = monthlyRev(name)
    const ytd      = ytdRev(name)
    const calls    = repCalls(name)
    const att      = repAttendance(name)
    const connected = calls.filter(c => c.call_status === 'Connected').length
    const daysIn   = att.filter(a => a.status !== 'Absent').length
    const lateDays = att.filter(a => a.status === 'Late').length
    const avgCheckIn = att.filter(a => a.check_in_time).length > 0
      ? att.filter(a => a.check_in_time).map(a => a.check_in_time).sort()[Math.floor(att.length / 2)]
      : null
    return { name, title, monthly, ytd, monthlyPct: pct(monthly, MONTHLY_TARGET), ytdPct: pct(ytd, YEARLY_TARGET), spark: sparkData(name), calls: calls.length, connected, connectionRate: calls.length ? Math.round((connected / calls.length) * 100) : 0, daysIn, lateDays, avgCheckIn, todayIn: !!todayAttendance(name) }
  })

  // Team-level call stats
  const teamCalls      = callReports.length
  const teamConnected  = callReports.filter(c => c.call_status === 'Connected').length
  const teamConnRate   = teamCalls ? Math.round((teamConnected / teamCalls) * 100) : 0
  const teamFollowUps  = callReports.filter(c => c.follow_up_date).length
  const teamDealValue  = callReports.reduce((s, c) => s + (parseFloat(c.deal_amount) || 0), 0)

  // Team attendance stats
  const today = now.toISOString().split('T')[0]
  const todayPresent = attendance.filter(a => a.date === today && a.status !== 'Absent').length
  const monthDaysWorked = [...new Set(attendance.map(a => a.date))].length

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
            <div key={m.name} onClick={() => setSelected(m.name)} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 cursor-pointer hover:border-brand-300 hover:shadow-md transition-all group">
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
                <div className="flex items-center gap-1">
                  {m.ytdPct >= 100 && <Award size={18} className="text-yellow-500" />}
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-brand-400 transition-colors" />
                </div>
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
              <div className="mb-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Last 6 months</p>
                <SparkBar data={m.spark} target={MONTHLY_TARGET} />
                <div className="flex justify-between mt-1">
                  {m.spark.map(d => <span key={d.label} className="text-[9px] text-gray-300 flex-1 text-center">{d.label}</span>)}
                </div>
              </div>

              {/* Call + Attendance mini-row */}
              <div className="border-t border-gray-50 pt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs font-bold text-gray-800">{m.calls}</p>
                  <p className="text-[9px] text-gray-400 uppercase">Calls</p>
                  <p className="text-[9px] text-green-600">{m.connectionRate}% conn.</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">{m.daysIn}</p>
                  <p className="text-[9px] text-gray-400 uppercase">Days In</p>
                  {m.lateDays > 0 && <p className="text-[9px] text-orange-500">{m.lateDays} late</p>}
                </div>
                <div>
                  {m.todayIn ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle2 size={14} className="text-green-500" />
                      <p className="text-[9px] text-green-600">Checked in</p>
                    </div>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); handleCheckIn(m.name) }}
                      disabled={checkingIn === m.name}
                      className="text-[9px] bg-brand-500 text-white px-2 py-1 rounded-lg hover:bg-brand-600 disabled:opacity-50 w-full"
                    >
                      {checkingIn === m.name ? '...' : 'Check In'}
                    </button>
                  )}
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

      {/* ── Call Activity KPIs ─────────────────────────────────────────────── */}
      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <PhoneCall size={16} className="text-rose-500" />
            <h2 className="font-semibold text-gray-800">Call Activity KPIs — This Month</h2>
            <a href="/crm/call-report" className="ml-auto text-xs text-brand-500 hover:underline">View full log →</a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Calls', value: teamCalls, sub: 'logged this month', icon: Phone, color: 'text-rose-500 bg-rose-50' },
              { label: 'Connected', value: `${teamConnected} (${teamConnRate}%)`, sub: 'connection rate', icon: PhoneCall, color: 'text-green-600 bg-green-50' },
              { label: 'Follow-ups Set', value: teamFollowUps, sub: 'from call logs', icon: CalendarCheck, color: 'text-blue-600 bg-blue-50' },
              { label: 'Pipeline from Calls', value: teamDealValue > 0 ? fmt(teamDealValue) : '—', sub: 'deal value logged', icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-gray-100 p-4 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>
                  <s.icon size={16} />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{s.value}</p>
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">{s.label}</p>
                  <p className="text-[10px] text-gray-400">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Per-rep call table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  {['Rep', 'Calls', 'Connected', 'Conn. Rate', 'Follow-ups', 'Deal Value', 'Win Rate*'].map(h => (
                    <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teamStats.map(m => {
                  const calls = repCalls(m.name)
                  const connected = calls.filter(c => c.call_status === 'Connected').length
                  const followUps = calls.filter(c => c.follow_up_date).length
                  const dealVal = calls.reduce((s, c) => s + (parseFloat(c.deal_amount) || 0), 0)
                  const winRate = calls.length ? Math.round((calls.filter(c => c.call_status === 'Connected').length / calls.length) * 100) : 0
                  return (
                    <tr key={m.name} className="hover:bg-gray-50">
                      <td className="py-2 pr-4 font-medium text-gray-900">{m.name.split(' ')[0]}</td>
                      <td className="py-2 pr-4 text-gray-700">{calls.length || '—'}</td>
                      <td className="py-2 pr-4 text-green-600 font-medium">{connected || '—'}</td>
                      <td className="py-2 pr-4">
                        {calls.length > 0 ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${winRate >= 70 ? 'bg-green-100 text-green-700' : winRate >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                            {winRate}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2 pr-4 text-gray-600">{followUps || '—'}</td>
                      <td className="py-2 pr-4 text-gray-700">{dealVal > 0 ? fmt(dealVal) : '—'}</td>
                      <td className="py-2 text-gray-400 text-xs">*based on connected calls</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Attendance KPIs ─────────────────────────────────────────────────── */}
      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-indigo-500" />
            <h2 className="font-semibold text-gray-800">Attendance — This Month</h2>
            <span className="ml-2 text-xs text-gray-400">Late = check-in after 9:15 AM · Click "Check In" on each card above</span>
            <div className="ml-auto flex gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Present today: <strong>{todayPresent}/{TEAM.length}</strong></span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> Working days this month: <strong>{monthDaysWorked}</strong></span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  {['Rep', 'Days Present', 'Days Late', 'Avg Check-in', 'Today'].map(h => (
                    <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pr-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teamStats.map(m => (
                  <tr key={m.name} className="hover:bg-gray-50">
                    <td className="py-2.5 pr-6 font-medium text-gray-900">{m.name.split(' ')[0]}</td>
                    <td className="py-2.5 pr-6">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{m.daysIn}</span>
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${Math.min((m.daysIn / Math.max(monthDaysWorked, 1)) * 100, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-6">
                      {m.lateDays > 0
                        ? <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full font-medium">{m.lateDays} late</span>
                        : <span className="text-xs text-green-600">On time ✓</span>}
                    </td>
                    <td className="py-2.5 pr-6 text-gray-600 font-mono text-xs">{m.avgCheckIn || '—'}</td>
                    <td className="py-2.5">
                      {m.todayIn
                        ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle2 size={13} /> Present</span>
                        : <span className="flex items-center gap-1 text-gray-400 text-xs"><AlertCircle size={13} /> Not checked in</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Deal breakdown drawer */}
      {selectedPerson && (() => {
        const personDeals    = allDeals.filter(d => d.assigned_to === selectedPerson)
        const committed      = personDeals.filter(d => COMMITTED_STATUSES.includes(d.status))
        const pipeline       = personDeals.filter(d => PIPELINE_STATUSES.includes(d.status))
        const committedTotal = committed.reduce((s, d) => s + (d.value_net || 0), 0)
        const pipelineTotal  = pipeline.reduce((s, d) => s + (d.value_net || 0), 0)
        const person         = TEAM.find(t => t.name === selectedPerson)
        return (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelected(null)} />
            <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white z-50 shadow-2xl flex flex-col">
              {/* Drawer header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-brand-500 to-brand-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-sm">
                    {selectedPerson[0]}
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg leading-tight">{selectedPerson}</p>
                    <p className="text-xs text-white/70">{person?.title}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10">
                  <X size={20} />
                </button>
              </div>

              {/* Summary strip */}
              <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50 border-b border-gray-100">
                {[
                  { label: 'Committed', value: fmt(committedTotal), color: 'text-green-600' },
                  { label: 'Pipeline',  value: fmt(pipelineTotal),  color: 'text-blue-600'  },
                  { label: 'Total Deals', value: personDeals.length, color: 'text-gray-800' },
                ].map(s => (
                  <div key={s.label} className="px-4 py-3 text-center">
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* Call Activity Summary */}
                {(() => {
                  const calls = repCalls(selectedPerson)
                  const connected = calls.filter(c => c.call_status === 'Connected').length
                  const attRec = repAttendance(selectedPerson)
                  if (calls.length === 0 && attRec.length === 0) return null
                  return (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-rose-700 flex items-center gap-2"><PhoneCall size={14} /> This Month Activity</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Calls', value: calls.length },
                          { label: 'Connected', value: `${connected} (${calls.length ? Math.round((connected/calls.length)*100) : 0}%)` },
                          { label: 'Days In', value: attRec.filter(a=>a.status!=='Absent').length },
                        ].map(s => (
                          <div key={s.label} className="bg-white rounded-lg p-2 text-center">
                            <p className="text-base font-bold text-gray-900">{s.value}</p>
                            <p className="text-[10px] text-gray-500">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      {calls.length > 0 && (
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {calls.slice(0, 10).map(c => (
                            <div key={c.id} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-1.5">
                              <span className="font-medium text-gray-700">{c.customer_name}</span>
                              <span className="text-gray-400">{c.report_date}</span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${c.call_status === 'Connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.call_status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Committed deals */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                    Committed Deals ({committed.length}) — {fmt(committedTotal)}
                  </h3>
                  {committed.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No committed deals yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {[...committed].sort((a, b) => (b.value_net||0) - (a.value_net||0)).map(d => (
                        <div key={d.id} className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm">{d.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{d.clients?.name || '—'}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-green-700 text-sm">{fmt(d.value_net)}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-500'}`}>
                                {d.status}
                              </span>
                            </div>
                          </div>
                          {(d.start_date || d.end_date) && (
                            <p className="text-[11px] text-gray-400 mt-1.5">📅 {d.start_date || '?'} → {d.end_date || '?'}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pipeline deals */}
                {pipeline.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                      Pipeline ({pipeline.length}) — {fmt(pipelineTotal)}
                    </h3>
                    <div className="space-y-2">
                      {[...pipeline].sort((a, b) => (b.value_net||0) - (a.value_net||0)).map(d => (
                        <div key={d.id} className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm">{d.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{d.clients?.name || '—'}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-blue-700 text-sm">{fmt(d.value_net)}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-500'}`}>
                                {d.status}
                              </span>
                            </div>
                          </div>
                          {(d.start_date || d.end_date) && (
                            <p className="text-[11px] text-gray-400 mt-1.5">📅 {d.start_date || '?'} → {d.end_date || '?'}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}
