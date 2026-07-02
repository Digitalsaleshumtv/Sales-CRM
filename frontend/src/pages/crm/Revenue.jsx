import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart, ReferenceLine,
} from 'recharts'
import { Download, X, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Presentation, Plus, Radio } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  MONTHS, FY_LIST, FY_TARGET, FY_META, CAT_META, BUSINESS_TYPE_PERIODS, CHANNELS_BY_FY,
  CHANNEL_COLORS, ENTITIES, CAMPAIGNS_FY26, SPECIAL_EVENTS, TARGET_MONTHLY, TARGET_TOTAL, fmtPKR, classifyPortal,
  PORTAL_OPTIONS, CHANNEL_OPTIONS,
} from '../../data/revenueData'

const VIEWS = ['Overview', 'Compare Years', 'Channels', 'Business Type', 'Agencies & Brands', 'Campaigns', 'Website', 'Social Media']
const FY_COLORS = { 'FY2023-24': '#64748b', 'FY2024-25': '#c0392b', 'FY2025-26': '#d4a017', 'FY2026-27': '#0e7490' }
const MONTH_ORDER = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
const CHART_MODES = ['Bars', 'Line', 'Cumulative', 'Pie', 'Donut']
const PIE_COLORS = ['#c0392b', '#2563eb', '#0d9488', '#f59e0b', '#7c3aed', '#db2777', '#16a34a', '#0891b2', '#9333ea', '#ca8a04', '#64748b', '#dc2626']

function pct(curr, prev) {
  if (!prev) return null
  return ((curr - prev) / prev) * 100
}

function Delta({ value, suffix = '%' }) {
  if (value === null || value === undefined || !isFinite(value)) return <span className="text-gray-300">—</span>
  const up = value >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  )
}

export default function Revenue() {
  const [view, setView] = useState('Overview')
  const [unit, setUnit] = useState('M')
  const [preset, setPreset] = useState('All Time')
  const [from, setFrom] = useState(MONTHS[0].key)
  const [to, setTo] = useState(MONTHS[MONTHS.length - 1].key)
  const [drillMonth, setDrillMonth] = useState(null)
  const [chartMode, setChartMode] = useState('Bars')
  const [showPpt, setShowPpt] = useState(false)
  const [showEntry, setShowEntry] = useState(false)
  const [drillCat, setDrillCat] = useState(null) // selected category id for Business Type drill

  // ── Live entries from Supabase (auto-updates via realtime) ──
  const [entries, setEntries] = useState([])
  const [liveStatus, setLiveStatus] = useState('loading') // loading | ok | missing

  useEffect(() => {
    let chan
    async function load() {
      const { data, error } = await supabase.from('revenue_entries').select('*').order('created_at')
      if (error) { setLiveStatus('missing'); return }
      setEntries(data || [])
      setLiveStatus('ok')
      chan = supabase.channel('revenue_entries_live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'revenue_entries' }, () => {
          supabase.from('revenue_entries').select('*').order('created_at').then(({ data: d }) => setEntries(d || []))
        })
        .subscribe()
    }
    load()
    return () => { if (chan) supabase.removeChannel(chan) }
  }, [])

  const liveByMonth = useMemo(() => {
    const m = {}
    entries.forEach(e => { m[e.month] = (m[e.month] || 0) + Number(e.amount || 0) })
    return m
  }, [entries])

  // Static history + live entries merged — every view reads from this
  const months = useMemo(() => MONTHS.map(m => {
    const live = liveByMonth[m.key] || 0
    return { ...m, live, total: m.total + live }
  }), [liveByMonth])

  const liveTotal = entries.reduce((a, e) => a + Number(e.amount || 0), 0)

  const fmt = n => fmtPKR(n, unit)

  function applyPreset(p) {
    setPreset(p)
    setDrillMonth(null)
    if (p === 'All Time') { setFrom(MONTHS[0].key); setTo(MONTHS[MONTHS.length - 1].key) }
    else if (FY_LIST.includes(p) || p === FY_TARGET) {
      const ms = MONTHS.filter(m => m.fy === p)
      setFrom(ms[0].key); setTo(ms[ms.length - 1].key)
    } else if (p === 'Last 6 Months') {
      const withData = months.filter(m => m.total > 0)
      const last6 = withData.slice(-6)
      setFrom(last6[0].key); setTo(last6[last6.length - 1].key)
    }
  }

  function applyHalf(half) {
    const ms = MONTHS.filter(m => m.fy === preset)
    const slice = half === 'H1' ? ms.slice(0, 6) : ms.slice(6)
    setFrom(slice[0].key); setTo(slice[slice.length - 1].key)
  }

  const range = useMemo(() => months.filter(m => m.key >= from && m.key <= to), [months, from, to])
  const rangeWithData = range.filter(m => m.total > 0)
  const total = range.reduce((a, m) => a + m.total, 0)
  const avg = rangeWithData.length ? Math.round(total / rangeWithData.length) : 0
  const best = rangeWithData.length ? [...rangeWithData].sort((a, b) => b.total - a.total)[0] : null
  const rangeTarget = range.reduce((a, m) => a + (m.target || 0), 0)
  const allTargetMonths = range.length > 0 && range.every(m => m.fy === FY_TARGET)
  const hasTargets = range.some(m => m.target)

  const yoyTotal = useMemo(() => {
    const prevKeys = range.map(m => `${parseInt(m.key.slice(0, 4)) - 1}${m.key.slice(4)}`)
    const prev = months.filter(m => prevKeys.includes(m.key))
    if (prev.length !== range.length || prev.some(m => m.total === 0)) return null
    return prev.reduce((a, m) => a + m.total, 0)
  }, [months, from, to])

  const drill = drillMonth ? months.find(m => m.key === drillMonth) : null
  const drillPrevYear = drill ? months.find(m => m.key === `${parseInt(drill.key.slice(0, 4)) - 1}${drill.key.slice(4)}`) : null
  const drillCampaigns = drill ? CAMPAIGNS_FY26.filter(c => c.month === drill.key) : []
  const drillLive = drill ? entries.filter(e => e.month === drill.key) : []
  const drillEvents = drill ? SPECIAL_EVENTS.filter(e => e.month === drill.key) : []

  function exportCSV() {
    const rows = [['Month', 'Fiscal Year', 'Revenue (PKR)', 'Target (PKR)', 'Status']]
    range.forEach(m => rows.push([m.label, m.fy, m.total, m.target || '', m.status]))
    rows.push(['TOTAL', '', total, rangeTarget || '', ''])
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `revenue_${from}_to_${to}.csv`; a.click()
  }

  const axisFmt = v => unit === 'Cr'
    ? (v >= 10000000 ? `${(v / 10000000).toFixed(1)}Cr` : `${(v / 100000).toFixed(0)}L`)
    : (v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : `${(v / 1000).toFixed(0)}K`)

  const cumData = useMemo(() => {
    let run = 0, runT = 0
    return range.map(m => { run += m.total; runT += m.target || 0; return { ...m, cumulative: run, cumTarget: hasTargets ? runT : undefined } })
  }, [range, hasTargets])

  // Pie data: per month when short range, per fiscal year when long
  const pieData = useMemo(() => {
    if (range.length <= 13) return rangeWithData.map(m => ({ name: m.label, value: m.total }))
    const byFy = {}
    rangeWithData.forEach(m => { byFy[m.fy] = (byFy[m.fy] || 0) + m.total })
    return Object.entries(byFy).map(([fy, value]) => ({ name: FY_META[fy].label, value }))
  }, [range, rangeWithData])

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
            {liveStatus === 'ok' && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                <Radio size={11} className="animate-pulse" /> Live sync on{entries.length > 0 && ` · ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`}
              </span>
            )}
            {liveStatus === 'missing' && (
              <button onClick={() => setShowEntry(true)} className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 hover:bg-amber-100">
                ⚠ Live entries setup needed — click for instructions
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Digital Direct Sales · All HUM Network channels · Jul 2023 – Jun 2027</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {['M', 'Cr'].map(u => (
              <button key={u} onClick={() => setUnit(u)} className={`px-2.5 py-1 rounded-md text-xs font-semibold ${unit === u ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {u === 'M' ? 'PKR M' : '₨ Cr/L'}
              </button>
            ))}
          </div>
          <button onClick={() => setShowEntry(true)} className="flex items-center gap-2 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            <Plus size={14} /> Add Entry
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => setShowPpt(true)} className="flex items-center gap-2 bg-brand-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
            <Presentation size={14} /> Create PPT
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {['All Time', ...FY_LIST, FY_TARGET, 'Last 6 Months', 'Custom'].map(p => (
            <button key={p} onClick={() => applyPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${preset === p ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
              {FY_META[p] ? FY_META[p].label : p}{p === FY_TARGET && ' 🎯'}
            </button>
          ))}
          {(FY_LIST.includes(preset) || preset === FY_TARGET) && (
            <div className="flex gap-1 ml-1">
              {['Full Year', 'H1', 'H2'].map(h => (
                <button key={h} onClick={() => h === 'Full Year' ? applyPreset(preset) : applyHalf(h)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">{h}</button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto text-sm">
            <span className="text-gray-400 text-xs">From</span>
            <select value={from} onChange={e => { setFrom(e.target.value); setPreset('Custom'); if (e.target.value > to) setTo(e.target.value) }}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 bg-white">
              {MONTHS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <span className="text-gray-400 text-xs">To</span>
            <select value={to} onChange={e => { setTo(e.target.value); setPreset('Custom'); if (e.target.value < from) setFrom(e.target.value) }}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 bg-white">
              {MONTHS.filter(m => m.key >= from).map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Showing <span className="font-semibold text-gray-600">{range[0]?.label} – {range[range.length - 1]?.label}</span> ({range.length} month{range.length !== 1 ? 's' : ''}).
          Tip: set From and To to the same month to see a single month. Click any bar in the chart to drill into that month.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border p-5 shadow-sm bg-gradient-to-br from-brand-500 to-brand-700 text-white border-brand-500">
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">Total Revenue</p>
          <p className="text-2xl font-bold mt-1">{fmt(total)}</p>
          <p className="text-xs mt-0.5 opacity-70">{range.length} months selected{liveTotal > 0 && range.some(m => m.live > 0) ? ' · includes live entries' : ''}</p>
        </div>
        <div className="rounded-xl border p-5 shadow-sm bg-white border-gray-200">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Avg per Month</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{fmt(avg)}</p>
          <p className="text-xs mt-0.5 text-gray-400">{rangeWithData.length} months with revenue</p>
        </div>
        <div className="rounded-xl border p-5 shadow-sm bg-white border-gray-200">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Best Month</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{best ? fmt(best.total) : '—'}</p>
          <p className="text-xs mt-0.5 text-gray-400">{best ? best.label : ''}</p>
        </div>
        {allTargetMonths ? (
          <div className="rounded-xl border p-5 shadow-sm bg-cyan-50 border-cyan-200">
            <p className="text-xs font-medium uppercase tracking-wide text-cyan-700">Target Progress</p>
            <p className="text-2xl font-bold mt-1 text-cyan-900">{rangeTarget ? `${((total / rangeTarget) * 100).toFixed(1)}%` : '—'}</p>
            <p className="text-xs mt-0.5 text-cyan-700">{fmt(total)} of {fmt(rangeTarget)} target</p>
          </div>
        ) : (
          <div className="rounded-xl border p-5 shadow-sm bg-white border-gray-200">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">vs Same Period Last Year</p>
            <p className="text-2xl font-bold mt-1 text-gray-900">{yoyTotal !== null ? <Delta value={pct(total, yoyTotal)} /> : <span className="text-gray-300 text-lg">n/a</span>}</p>
            <p className="text-xs mt-0.5 text-gray-400">{yoyTotal !== null ? `prior period: ${fmt(yoyTotal)}` : 'no full prior-year data for this range'}</p>
          </div>
        )}
      </div>

      {/* View tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {VIEWS.map(v => (
          <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{v}</button>
        ))}
      </div>

      {/* ───────────────────────── OVERVIEW ───────────────────────── */}
      {view === 'Overview' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">Monthly Revenue</h2>
                <p className="text-xs text-gray-400">Click a bar to drill into that month{hasTargets ? ' · dashed teal line = FY2026-27 monthly target' : ''}</p>
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {CHART_MODES.map(m => (
                  <button key={m} onClick={() => setChartMode(m)} className={`px-2.5 py-1 rounded-md text-xs font-medium ${chartMode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{m}</button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              {chartMode === 'Bars' ? (
                <ComposedChart data={range} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={range.length > 18 ? 2 : 0} angle={range.length > 12 ? -35 : 0} textAnchor={range.length > 12 ? 'end' : 'middle'} height={range.length > 12 ? 55 : 30} />
                  <YAxis tickFormatter={axisFmt} tick={{ fontSize: 10 }} width={55} />
                  <Tooltip formatter={(v, name) => [fmt(v), name]} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} name="Revenue" cursor="pointer"
                    onClick={d => { const k = d?.payload?.key ?? d?.key; if (k) setDrillMonth(k) }}>
                    {range.map(m => <Cell key={m.key} fill={drillMonth === m.key ? '#1f2937' : FY_COLORS[m.fy]} opacity={m.status === 'partial' ? 0.45 : 1} />)}
                  </Bar>
                  {hasTargets && <Line type="monotone" dataKey="target" stroke="#0e7490" strokeWidth={2} strokeDasharray="6 4" dot={false} name="Monthly Target" />}
                </ComposedChart>
              ) : chartMode === 'Line' ? (
                <LineChart data={range} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={range.length > 18 ? 2 : 0} />
                  <YAxis tickFormatter={axisFmt} tick={{ fontSize: 10 }} width={55} />
                  <Tooltip formatter={(v, name) => [fmt(v), name]} />
                  <Line type="monotone" dataKey="total" stroke="#c0392b" strokeWidth={2.5} dot={{ r: 3 }} name="Revenue" />
                  {hasTargets && <Line type="monotone" dataKey="target" stroke="#0e7490" strokeWidth={2} strokeDasharray="6 4" dot={false} name="Monthly Target" />}
                </LineChart>
              ) : chartMode === 'Cumulative' ? (
                <AreaChart data={cumData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={range.length > 18 ? 2 : 0} />
                  <YAxis tickFormatter={axisFmt} tick={{ fontSize: 10 }} width={55} />
                  <Tooltip formatter={(v, name) => [fmt(v), name]} />
                  <Area type="monotone" dataKey="cumulative" stroke="#c0392b" fill="#fee2e2" strokeWidth={2} name="Cumulative" />
                  {hasTargets && <Line type="monotone" dataKey="cumTarget" stroke="#0e7490" strokeWidth={2} strokeDasharray="6 4" dot={false} name="Cumulative Target" />}
                </AreaChart>
              ) : (
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={120} innerRadius={chartMode === 'Donut' ? 65 : 0} dataKey="value" paddingAngle={2}
                    label={pieData.length <= 13 ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : false} labelLine={pieData.length <= 13}>
                    {pieData.map((e, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} />
                  <Legend formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
                </PieChart>
              )}
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              {[...FY_LIST, FY_TARGET].filter(fy => range.some(m => m.fy === fy)).map(fy => (
                <span key={fy} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded-sm" style={{ background: FY_COLORS[fy] }} />{FY_META[fy].label}{fy === FY_TARGET ? ' (target year)' : ''}
                </span>
              ))}
              {range.some(m => m.status === 'partial') && <span className="text-xs text-gray-400 italic">Faded bars = partial (W&S bookings recorded so far)</span>}
            </div>
            {pieData.length > 13 && (chartMode === 'Pie' || chartMode === 'Donut') && (
              <p className="text-xs text-gray-400 mt-1">Long ranges are grouped by fiscal year in pie view — narrow the date filter to see individual months.</p>
            )}
          </div>

          {/* Month drill-down */}
          {drill && (
            <div className="bg-white rounded-xl border-2 border-brand-200 shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{drill.label} — {fmt(drill.total)}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {FY_META[drill.fy].label}
                    {drillPrevYear && drillPrevYear.total > 0 && <> · vs {drillPrevYear.label} ({fmt(drillPrevYear.total)}): <Delta value={pct(drill.total, drillPrevYear.total)} /></>}
                    {drill.target ? <> · monthly target {fmt(drill.target)} ({drill.total > 0 ? `${((drill.total / drill.target) * 100).toFixed(0)}% achieved` : 'no revenue yet'})</> : null}
                    {drill.status === 'partial' && ' · partial month — W&S bookings only'}
                  </p>
                </div>
                <button onClick={() => setDrillMonth(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                {drill.cat ? (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Business type split</p>
                    <div className="space-y-2">
                      {CAT_META.filter(c => drill.cat[c.id] > 0).map(c => (
                        <div key={c.id}>
                          <div className="flex justify-between text-sm mb-0.5">
                            <span className="flex items-center gap-2 text-gray-700"><span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />{c.name}</span>
                            <span className="font-medium text-gray-800">{fmt(drill.cat[c.id])}</span>
                          </div>
                          <div className="bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width: `${(drill.cat[c.id] / drill.total) * 100}%`, background: c.color }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">
                    {drill.fy === 'FY2023-24'
                      ? 'Business-type split is available at half-year level for FY2023-24 — see the Business Type tab.'
                      : drill.fy === FY_TARGET
                        ? 'Target-year month — revenue appears here as entries are added via “Add Entry”.'
                        : 'Full business-type split not itemised for this month — campaign-level W&S bookings shown on the right.'}
                  </div>
                )}
                <div>
                  {drillEvents.length > 0 && (
                    <div className="mb-3 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                      {drillEvents.map(e => <p key={e.label}>📌 {e.label}: <strong>{fmt(e.amount)}</strong></p>)}
                    </div>
                  )}
                  {(drillCampaigns.length > 0 || drillLive.length > 0) && (
                    <>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bookings & entries ({drillCampaigns.length + drillLive.length})</p>
                      <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                        {drillCampaigns.map((c, i) => (
                          <div key={`s${i}`} className="flex justify-between py-1.5 text-xs">
                            <span className="text-gray-600 truncate pr-3">{c.brand} · <span className="text-gray-400">{c.agency}</span></span>
                            <span className="font-medium text-gray-800 whitespace-nowrap">{fmt(c.amount)}</span>
                          </div>
                        ))}
                        {drillLive.map((e, i) => (
                          <div key={`l${i}`} className="flex justify-between py-1.5 text-xs">
                            <span className="text-gray-600 truncate pr-3">
                              <span className="text-green-600 font-semibold">LIVE</span> {e.brand || e.campaign || e.category || 'Entry'}{e.agency ? <span className="text-gray-400"> · {e.agency}</span> : null}
                            </span>
                            <span className="font-medium text-gray-800 whitespace-nowrap">{fmt(Number(e.amount))}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Monthly table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 overflow-x-auto">
            <h2 className="font-semibold text-gray-900 mb-3">Month-by-Month Detail</h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Month', 'Fiscal Year', 'Revenue', 'MoM Change', 'Same Month Last Year', 'YoY Change', ...(hasTargets ? ['Target', 'vs Target'] : []), 'Status'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {range.map((m, i) => {
                  const prevM = i > 0 ? range[i - 1] : null
                  const ly = months.find(x => x.key === `${parseInt(m.key.slice(0, 4)) - 1}${m.key.slice(4)}`)
                  return (
                    <tr key={m.key} className="hover:bg-gray-50 cursor-pointer" onClick={() => setDrillMonth(m.key)}>
                      <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">{m.label}</td>
                      <td className="px-3 py-2 text-gray-500">{m.fy}</td>
                      <td className="px-3 py-2 font-semibold text-gray-900">{m.total > 0 ? fmt(m.total) : '—'}{m.live > 0 && <span className="text-green-600 text-[10px] ml-1" title={`Includes ${fmt(m.live)} live entries`}>●</span>}</td>
                      <td className="px-3 py-2">{prevM && prevM.total > 0 && m.total > 0 ? <Delta value={pct(m.total, prevM.total)} /> : <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 text-gray-600">{ly && ly.total > 0 ? fmt(ly.total) : '—'}</td>
                      <td className="px-3 py-2">{ly && ly.total > 0 && m.total > 0 ? <Delta value={pct(m.total, ly.total)} /> : <span className="text-gray-300">—</span>}</td>
                      {hasTargets && (
                        <>
                          <td className="px-3 py-2 text-cyan-700">{m.target ? fmt(m.target) : '—'}</td>
                          <td className="px-3 py-2">{m.target && m.total > 0 ? <span className={m.total >= m.target ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>{((m.total / m.target) * 100).toFixed(0)}%</span> : <span className="text-gray-300">—</span>}</td>
                        </>
                      )}
                      <td className="px-3 py-2">
                        {m.status === 'complete' ? <span className="text-green-600">●</span>
                          : m.status === 'partial' ? <span className="text-amber-500">◐ partial</span>
                          : m.status === 'target' ? <span className="text-cyan-600">🎯 target</span>
                          : <span className="text-gray-300">○ pending</span>}
                      </td>
                    </tr>
                  )
                })}
                <tr className="bg-brand-50 border-t-2 border-brand-200">
                  <td className="px-3 py-2 font-bold text-brand-700">TOTAL</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 font-bold text-brand-700 text-sm">{fmt(total)}</td>
                  <td className="px-3 py-2" colSpan={3} />
                  {hasTargets && (
                    <>
                      <td className="px-3 py-2 font-bold text-cyan-700">{fmt(rangeTarget)}</td>
                      <td className="px-3 py-2 font-bold">{rangeTarget && total > 0 ? `${((total / rangeTarget) * 100).toFixed(1)}%` : '—'}</td>
                    </>
                  )}
                  <td className="px-3 py-2" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────── COMPARE YEARS ───────────────────────── */}
      {view === 'Compare Years' && (() => {
        const allFys = [...FY_LIST, FY_TARGET]
        const rows = MONTH_ORDER.map((mo, i) => {
          const row = { month: mo }
          allFys.forEach(fy => {
            const m = months.filter(x => x.fy === fy)[i]
            row[fy] = m.total
            row[`${fy}_status`] = m.status
            if (fy === FY_TARGET) row.target = m.target
          })
          return row
        })
        const fyTotals = {}
        allFys.forEach(fy => { fyTotals[fy] = months.filter(m => m.fy === fy).reduce((a, m) => a + m.total, 0) })
        const h1 = {}, h2 = {}
        allFys.forEach(fy => {
          const ms = months.filter(m => m.fy === fy)
          h1[fy] = ms.slice(0, 6).reduce((a, m) => a + m.total, 0)
          h2[fy] = ms.slice(6).reduce((a, m) => a + m.total, 0)
        })
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {FY_LIST.map(fy => (
                <div key={fy} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm" style={{ background: FY_COLORS[fy] }} />
                    <p className="text-sm font-semibold text-gray-700">{FY_META[fy].label}</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{fmt(fyTotals[fy])}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{FY_META[fy].status}</p>
                  {fy !== 'FY2023-24' && (
                    <p className="text-xs mt-1.5">vs prior year: <Delta value={pct(fyTotals[fy], fyTotals[FY_LIST[FY_LIST.indexOf(fy) - 1]])} /></p>
                  )}
                </div>
              ))}
              <div className="bg-cyan-50 rounded-xl border border-cyan-200 shadow-sm p-5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ background: FY_COLORS[FY_TARGET] }} />
                  <p className="text-sm font-semibold text-cyan-800">{FY_META[FY_TARGET].label} 🎯</p>
                </div>
                <p className="text-2xl font-bold text-cyan-900 mt-2">{fmt(TARGET_TOTAL)}</p>
                <p className="text-xs text-cyan-700 mt-0.5">Target · ≈{fmt(TARGET_MONTHLY)}/month</p>
                <p className="text-xs mt-1.5 text-cyan-800">
                  {fyTotals[FY_TARGET] > 0
                    ? <>Booked so far: <strong>{fmt(fyTotals[FY_TARGET])}</strong> ({((fyTotals[FY_TARGET] / TARGET_TOTAL) * 100).toFixed(1)}%)</>
                    : 'Revenue will appear as entries are added'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Same Month, Year by Year</h2>
              <p className="text-xs text-gray-400 mb-4">All fiscal years run July → June. Dashed teal line = FY2026-27 monthly target ({fmt(TARGET_MONTHLY)}).</p>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={rows} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={axisFmt} tick={{ fontSize: 10 }} width={55} />
                  <Tooltip formatter={(v, name) => [fmt(v), FY_META[name]?.label || name]} />
                  <Legend formatter={v => <span style={{ fontSize: 12 }}>{FY_META[v]?.label || v}</span>} />
                  {FY_LIST.map(fy => <Bar key={fy} dataKey={fy} fill={FY_COLORS[fy]} radius={[3, 3, 0, 0]} />)}
                  {fyTotals[FY_TARGET] > 0 && <Bar dataKey={FY_TARGET} fill={FY_COLORS[FY_TARGET]} radius={[3, 3, 0, 0]} />}
                  <ReferenceLine y={TARGET_MONTHLY} stroke="#0e7490" strokeDasharray="6 4" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 overflow-x-auto">
              <h2 className="font-semibold text-gray-900 mb-3">Year-over-Year Comparison Table</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Month</th>
                    {FY_LIST.map(fy => <th key={fy} className="text-right px-3 py-2 text-gray-500 font-semibold uppercase whitespace-nowrap">{FY_META[fy].label}</th>)}
                    <th className="text-right px-3 py-2 text-gray-500 font-semibold uppercase whitespace-nowrap">FY25 vs FY24</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-semibold uppercase whitespace-nowrap">FY26 vs FY25</th>
                    <th className="text-right px-3 py-2 text-cyan-700 font-semibold uppercase whitespace-nowrap">FY26-27 🎯</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(r => (
                    <tr key={r.month} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-700">{r.month}</td>
                      {FY_LIST.map(fy => (
                        <td key={fy} className="px-3 py-2 text-right text-gray-700">
                          {r[fy] > 0 ? fmt(r[fy]) : '—'}{r[`${fy}_status`] === 'partial' && <span className="text-amber-500" title="Partial — W&S bookings only">*</span>}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">{r['FY2023-24'] > 0 && r['FY2024-25'] > 0 ? <Delta value={pct(r['FY2024-25'], r['FY2023-24'])} /> : '—'}</td>
                      <td className="px-3 py-2 text-right">{r['FY2024-25'] > 0 && r['FY2025-26'] > 0 && r['FY2025-26_status'] === 'complete' ? <Delta value={pct(r['FY2025-26'], r['FY2024-25'])} /> : '—'}</td>
                      <td className="px-3 py-2 text-right text-cyan-800">
                        {r[FY_TARGET] > 0 ? <>{fmt(r[FY_TARGET])} <span className="text-gray-400">/ {fmt(r.target)}</span></> : <span className="text-cyan-600/60">{fmt(r.target)}</span>}
                      </td>
                    </tr>
                  ))}
                  {[['H1 (Jul–Dec)', h1], ['H2 (Jan–Jun)', h2], ['Full Year', fyTotals]].map(([label, obj]) => (
                    <tr key={label} className="bg-gray-50 font-semibold">
                      <td className="px-3 py-2 text-gray-700">{label}</td>
                      {FY_LIST.map(fy => <td key={fy} className="px-3 py-2 text-right text-gray-800">{fmt(obj[fy])}</td>)}
                      <td className="px-3 py-2 text-right"><Delta value={pct(obj['FY2024-25'], obj['FY2023-24'])} /></td>
                      <td className="px-3 py-2 text-right text-gray-400 text-[10px]">{label === 'H1 (Jul–Dec)' ? <Delta value={pct(obj['FY2025-26'], obj['FY2024-25'])} /> : 'incomplete'}</td>
                      <td className="px-3 py-2 text-right text-cyan-800">{label === 'Full Year' ? fmt(TARGET_TOTAL) : fmt(TARGET_MONTHLY * 6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-2">* Partial month — only website & social bookings recorded so far. FY2026-27 column shows actual entries against the {fmt(TARGET_MONTHLY)}/month target.</p>
            </div>
          </div>
        )
      })()}

      {/* ───────────────────────── CHANNELS ───────────────────────── */}
      {view === 'Channels' && (() => {
        const channelNames = Object.keys(CHANNEL_COLORS)
        const chartRows = CHANNELS_BY_FY.map(c => ({ fy: FY_META[c.fy].label, ...c.channels }))
        const growth = channelNames.map(ch => {
          const v1 = CHANNELS_BY_FY[0].channels[ch], v3 = CHANNELS_BY_FY[2].channels[ch]
          return { ch, v1, v2: CHANNELS_BY_FY[1].channels[ch], v3, growth: v1 > 0 ? pct(v3, v1) : null }
        })
        return (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Revenue by Channel, Year by Year</h2>
              <p className="text-xs text-gray-400 mb-4">FY2024-25 shows the confirmed H1 split · FY2025-26 covers 9 months</p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartRows} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="fy" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={axisFmt} tick={{ fontSize: 10 }} width={55} />
                  <Tooltip formatter={(v, name) => [fmt(v), name]} />
                  <Legend formatter={v => <span style={{ fontSize: 12 }}>{v}</span>} />
                  {channelNames.map(ch => <Bar key={ch} dataKey={ch} fill={CHANNEL_COLORS[ch]} radius={[3, 3, 0, 0]} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {CHANNELS_BY_FY.map(c => (
                <div key={c.fy} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <p className="text-sm font-semibold text-gray-700">{FY_META[c.fy].label}</p>
                  <p className="text-xs text-gray-400">{c.scope} · {fmt(c.total)}</p>
                  <div className="mt-3 space-y-2.5">
                    {Object.entries(c.channels).filter(([, v]) => v > 0).map(([ch, v]) => (
                      <div key={ch}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-gray-600">{ch}</span>
                          <span className="font-medium text-gray-800">{fmt(v)} <span className="text-gray-400">({((v / c.total) * 100).toFixed(1)}%)</span></span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width: `${(v / c.total) * 100}%`, background: CHANNEL_COLORS[ch] }} /></div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-3 italic">{c.note}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 overflow-x-auto">
              <h2 className="font-semibold text-gray-900 mb-3">Channel Growth</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Channel', 'FY2023-24 (full)', 'FY2024-25 (H1)', 'FY2025-26 (9 mo)', 'FY24 → FY26'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-gray-500 font-semibold uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {growth.map(g => (
                    <tr key={g.ch} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-700 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: CHANNEL_COLORS[g.ch] }} />{g.ch}</td>
                      <td className="px-3 py-2 text-gray-700">{g.v1 > 0 ? fmt(g.v1) : '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{g.v2 > 0 ? fmt(g.v2) : '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{g.v3 > 0 ? fmt(g.v3) : '—'}</td>
                      <td className="px-3 py-2">{g.growth !== null ? <Delta value={g.growth} /> : <span className="text-gray-300">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                <strong>HUM News is the growth story</strong> — PKR 9M → PKR 42.5M in two years (+372%), moving from 6% to 21% of total revenue. HUM TV Entertainment remains the stable backbone at PKR 144–150M.
              </div>
            </div>
          </div>
        )
      })()}

      {/* ───────────────────────── BUSINESS TYPE ───────────────────────── */}
      {view === 'Business Type' && (() => {
        const fy25 = MONTHS.filter(m => m.fy === 'FY2024-25')
        const catTotals = CAT_META.map(c => ({ ...c, value: fy25.reduce((a, m) => a + (m.cat?.[c.id] || 0), 0) }))
        const fy25Total = fy25.reduce((a, m) => a + m.total, 0)
        const allTypes = [...new Set(BUSINESS_TYPE_PERIODS.flatMap(p => p.types.map(t => t.name)))]

        // Drill panel: campaigns for selected category
        const drillInfo = drillCat ? CAT_META.find(c => c.id === drillCat) : null
        const drillMonthRows = drillCat
          ? MONTHS.filter(m => m.cat?.[drillCat] > 0).map(m => ({ label: m.label, key: m.key, fy: m.fy, value: m.cat[drillCat] }))
          : []
        // Campaign-level detail (FY25-26 only, from CAMPAIGNS_FY26)
        const drillCampaignRows = drillCat === 'web_social'
          ? CAMPAIGNS_FY26.filter(c => ['website', 'social', 'other'].includes(classifyPortal(c.portal)))
          : drillCat === 'drama'
          ? CAMPAIGNS_FY26.filter(c => classifyPortal(c.portal) === 'drama')
          : drillCat === 'glam'
          ? CAMPAIGNS_FY26.filter(c => classifyPortal(c.portal) === 'glam')
          : []
        const websiteCampaigns = drillCat === 'web_social' ? drillCampaignRows.filter(c => classifyPortal(c.portal) === 'website') : []
        const socialCampaigns  = drillCat === 'web_social' ? drillCampaignRows.filter(c => classifyPortal(c.portal) === 'social') : []

        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-1">FY2024-25 Mix by Business Type</h2>
                <p className="text-xs text-gray-400 mb-1">Full year · PKR 245.3M · <span className="text-brand-500">Click a slice to drill in</span></p>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={catTotals}
                      cx="50%" cy="50%"
                      outerRadius={95}
                      dataKey="value"
                      paddingAngle={3}
                      onClick={(d) => setDrillCat(prev => prev === d.id ? null : d.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {catTotals.map((e) => (
                        <Cell
                          key={e.id}
                          fill={e.color}
                          opacity={drillCat && drillCat !== e.id ? 0.3 : 1}
                          stroke={drillCat === e.id ? '#1f2937' : 'none'}
                          strokeWidth={drillCat === e.id ? 2 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} />
                    <Legend formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-1">FY2024-25 Category Breakdown</h2>
                <p className="text-xs text-gray-400 mb-3">Click a row to see exact detail</p>
                <div className="space-y-2.5">
                  {catTotals.map(c => (
                    <div
                      key={c.id}
                      onClick={() => setDrillCat(prev => prev === c.id ? null : c.id)}
                      className={`p-2 rounded-lg cursor-pointer transition-colors ${drillCat === c.id ? 'bg-gray-50 ring-2 ring-offset-1' : 'hover:bg-gray-50'}`}
                      style={drillCat === c.id ? { ringColor: c.color } : {}}
                    >
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-2 text-gray-700 font-medium">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.color }} />{c.name}
                        </span>
                        <span className="text-xs text-gray-500">{((c.value / fy25Total) * 100).toFixed(1)}% · <span className="font-semibold text-gray-800">{fmt(c.value)}</span></span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${(c.value / fy25Total) * 100}%`, background: c.color }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Drill-down panel ── */}
            {drillCat && drillInfo && (
              <div className="bg-white rounded-xl border-2 shadow-sm p-6 space-y-4" style={{ borderColor: drillInfo.color }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: drillInfo.color }} />
                      {drillInfo.name} — Detailed Breakdown
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Monthly revenue by fiscal year · campaign detail available for FY2025-26</p>
                  </div>
                  <button onClick={() => setDrillCat(null)} className="text-gray-400 hover:text-gray-600 text-xs border border-gray-200 rounded-lg px-2 py-1">✕ Close</button>
                </div>

                {/* Monthly breakdown table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Month</th>
                        <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">FY</th>
                        <th className="text-right px-3 py-2 text-gray-500 font-semibold uppercase">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {drillMonthRows.map(r => (
                        <tr key={r.key} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-700">{r.label}</td>
                          <td className="px-3 py-2 text-gray-500">{r.fy}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-800">{fmt(r.value)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold">
                        <td colSpan={2} className="px-3 py-2 text-gray-700">Total</td>
                        <td className="px-3 py-2 text-right text-gray-900">{fmt(drillMonthRows.reduce((a, r) => a + r.value, 0))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Campaign-level detail for web_social: split website vs social */}
                {drillCat === 'web_social' && drillCampaignRows.length > 0 && (
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Website Banners / PR</p>
                        <p className="text-lg font-bold text-blue-800">{fmt(websiteCampaigns.reduce((a, c) => a + c.amount, 0))}</p>
                        <p className="text-xs text-blue-500 mt-0.5">{websiteCampaigns.length} campaigns · FY2025-26</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Social Media Posts</p>
                        <p className="text-lg font-bold text-purple-800">{fmt(socialCampaigns.reduce((a, c) => a + c.amount, 0))}</p>
                        <p className="text-xs text-purple-500 mt-0.5">{socialCampaigns.length} campaigns · FY2025-26</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">All FY2025-26 Campaigns</p>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Month</th>
                            <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Agency</th>
                            <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Brand</th>
                            <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Portal</th>
                            <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Type</th>
                            <th className="text-right px-3 py-2 text-gray-500 font-semibold uppercase">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {drillCampaignRows.map((c, i) => {
                            const type = classifyPortal(c.portal)
                            return (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-500">{c.month}</td>
                                <td className="px-3 py-2 text-gray-700">{c.agency}</td>
                                <td className="px-3 py-2 font-medium text-gray-800">{c.brand}</td>
                                <td className="px-3 py-2 text-gray-500 max-w-[160px] truncate">{c.portal}</td>
                                <td className="px-3 py-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${type === 'website' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                    {type === 'website' ? 'Website' : 'Social'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-800">₨{c.amount.toLocaleString()}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Campaign-level detail for drama / glam */}
                {(drillCat === 'drama' || drillCat === 'glam') && drillCampaignRows.length > 0 && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">FY2025-26 Campaign Detail</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Month</th>
                          <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Agency</th>
                          <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Campaign</th>
                          <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Brand</th>
                          <th className="text-right px-3 py-2 text-gray-500 font-semibold uppercase">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {drillCampaignRows.map((c, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-500">{c.month}</td>
                            <td className="px-3 py-2 text-gray-700">{c.agency}</td>
                            <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{c.campaign}</td>
                            <td className="px-3 py-2 font-medium text-gray-800">{c.brand}</td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-800">₨{c.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-bold">
                          <td colSpan={4} className="px-3 py-2 text-gray-700">Total (FY25-26 only)</td>
                          <td className="px-3 py-2 text-right text-gray-900">₨{drillCampaignRows.reduce((a, c) => a + c.amount, 0).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-1">FY2024-25 Monthly Composition</h2>
              <p className="text-xs text-gray-400 mb-4">Stacked by business type</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={fy25.map(m => ({ label: m.label, ...m.cat }))} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={axisFmt} tick={{ fontSize: 10 }} width={55} />
                  <Tooltip formatter={(v, name) => [fmt(v), CAT_META.find(c => c.id === name)?.name || name]} />
                  <Legend formatter={v => <span style={{ fontSize: 11 }}>{CAT_META.find(c => c.id === v)?.name || v}</span>} />
                  {CAT_META.map(c => <Bar key={c.id} dataKey={c.id} stackId="a" fill={c.color} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 overflow-x-auto">
              <h2 className="font-semibold text-gray-900 mb-1">H1 vs H1 — How the Business Mix Shifted</h2>
              <p className="text-xs text-gray-400 mb-3">July–December window, FY2023-24 vs FY2024-25 (from source reports)</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Business Type</th>
                    {BUSINESS_TYPE_PERIODS.map(p => <th key={p.period} className="text-right px-3 py-2 text-gray-500 font-semibold uppercase whitespace-nowrap">{p.period}</th>)}
                    <th className="text-right px-3 py-2 text-gray-500 font-semibold uppercase">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allTypes.map(t => {
                    const v1 = BUSINESS_TYPE_PERIODS[0].types.find(x => x.name === t)?.value ?? null
                    const v2 = BUSINESS_TYPE_PERIODS[1].types.find(x => x.name === t)?.value ?? null
                    return (
                      <tr key={t} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-700">{t}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{v1 ? fmt(v1) : '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{v2 ? fmt(v2) : '—'}</td>
                        <td className="px-3 py-2 text-right">{v1 && v2 ? <Delta value={pct(v2, v1)} /> : v2 ? <span className="text-green-600 font-medium">new</span> : v1 ? <span className="text-red-400">gone</span> : '—'}</td>
                      </tr>
                    )
                  })}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2 text-gray-700">Total</td>
                    {BUSINESS_TYPE_PERIODS.map(p => <td key={p.period} className="px-3 py-2 text-right text-gray-800">{fmt(p.total)}</td>)}
                    <td className="px-3 py-2 text-right"><Delta value={pct(BUSINESS_TYPE_PERIODS[1].total, BUSINESS_TYPE_PERIODS[0].total)} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* ───────────────────────── AGENCIES & BRANDS ───────────────────────── */}
      {view === 'Agencies & Brands' && <AgenciesBrands fmt={fmt} axisFmt={axisFmt} entries={entries} />}

      {/* ───────────────────────── CAMPAIGNS ───────────────────────── */}
      {view === 'Campaigns' && <Campaigns fmt={fmt} from={from} to={to} entries={entries} />}

      {/* ───────────────────────── WEBSITE ───────────────────────── */}
      {view === 'Website' && (() => {
        // Merge historical + live entries — filtered by selected date range
        const allPortalRows = [
          ...CAMPAIGNS_FY26.map(c => ({ month: c.month, portal: c.portal, amount: c.amount, impressions: c.impressions || 0, agency: c.agency, brand: c.brand, campaign: c.campaign })),
          ...entries.map(e => ({ month: e.month, portal: e.portal || '', amount: Number(e.amount || 0), impressions: Number(e.impressions || 0), agency: e.agency || '', brand: e.brand || '', campaign: e.campaign || '', ro_number: e.ro_number, live: true })),
        ].filter(c => c.month >= from && c.month <= to)
        // Exact portal breakdown (for live entries with canonical portal names)
        const portalBreakdown = {}
        PORTAL_OPTIONS.forEach(p => { portalBreakdown[p] = 0 })
        entries.forEach(e => {
          if (e.portal && PORTAL_OPTIONS.includes(e.portal)) portalBreakdown[e.portal] = (portalBreakdown[e.portal] || 0) + Number(e.amount || 0)
        })

        const webCampaigns = allPortalRows.filter(c => classifyPortal(c.portal) === 'website')
        const socialCampaigns = allPortalRows.filter(c => classifyPortal(c.portal) === 'social')
        const webTotal = webCampaigns.reduce((a, c) => a + c.amount, 0)
        const socialTotal = socialCampaigns.reduce((a, c) => a + c.amount, 0)
        const webByMonth = {}
        webCampaigns.forEach(c => { webByMonth[c.month] = (webByMonth[c.month] || 0) + c.amount })
        const socialByMonth = {}
        socialCampaigns.forEach(c => { socialByMonth[c.month] = (socialByMonth[c.month] || 0) + c.amount })
        const allMonthKeys = [...new Set([...Object.keys(webByMonth), ...Object.keys(socialByMonth)])].sort()
        const chartData = allMonthKeys.map(k => ({
          label: MONTHS.find(m => m.key === k)?.label || k,
          Website: webByMonth[k] || 0,
          Social: socialByMonth[k] || 0,
        }))
        // Group web campaigns by brand for top-brand view
        const byBrand = {}
        webCampaigns.forEach(c => { byBrand[c.brand] = (byBrand[c.brand] || 0) + c.amount })
        const topBrands = Object.entries(byBrand).sort((a, b) => b[1] - a[1])
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                <p className="text-xs text-blue-500 font-semibold uppercase mb-1">Website Revenue</p>
                <p className="text-2xl font-bold text-blue-800">{fmt(webTotal)}</p>
                <p className="text-xs text-blue-400 mt-1">{webCampaigns.length} campaigns</p>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
                <p className="text-xs text-purple-500 font-semibold uppercase mb-1">Social Media Revenue</p>
                <p className="text-2xl font-bold text-purple-800">{fmt(socialTotal)}</p>
                <p className="text-xs text-purple-400 mt-1">{socialCampaigns.length} campaigns</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Website Share</p>
                <p className="text-2xl font-bold text-gray-800">{webTotal + socialTotal > 0 ? ((webTotal / (webTotal + socialTotal)) * 100).toFixed(1) : '—'}%</p>
                <p className="text-xs text-gray-400 mt-1">of Web + Social combined</p>
              </div>
            </div>

            {/* Exact portal breakdown from live entries */}
            {Object.values(portalBreakdown).some(v => v > 0) && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-1">Revenue by Exact Placement</h2>
                <p className="text-xs text-gray-400 mb-4">From live entries only (data entered via Add Entry form)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                  {PORTAL_OPTIONS.filter(p => p !== 'Other').map(p => {
                    const amt = portalBreakdown[p] || 0
                    const colors = {
                      'Website':    'bg-blue-50 text-blue-700 border-blue-100',
                      'FB Post':    'bg-sky-50 text-sky-700 border-sky-100',
                      'Insta Post': 'bg-pink-50 text-pink-700 border-pink-100',
                      'FB Reel':    'bg-cyan-50 text-cyan-700 border-cyan-100',
                      'Insta Reel': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
                      'YouTube':    'bg-red-50 text-red-700 border-red-100',
                    }
                    return (
                      <div key={p} className={`rounded-lg border p-3 text-center ${colors[p] || 'bg-gray-50 text-gray-600 border-gray-100'} ${amt === 0 ? 'opacity-40' : ''}`}>
                        <p className="text-[10px] font-semibold uppercase mb-1">{p}</p>
                        <p className="text-sm font-bold">{amt > 0 ? fmt(amt) : '—'}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Website vs Social — Monthly Revenue</h2>
              <p className="text-xs text-gray-400 mb-4">FY2025-26 · Campaign-level data</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={axisFmt} tick={{ fontSize: 10 }} width={60} />
                  <Tooltip formatter={(v, name) => [fmt(v), name]} />
                  <Legend />
                  <Bar dataKey="Website" fill="#2563eb" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Social" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-3">Top Brands — Website</h2>
                <div className="space-y-2">
                  {topBrands.slice(0, 10).map(([brand, amt]) => (
                    <div key={brand} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="font-medium text-gray-700">{brand}</span>
                          <span className="text-gray-500">{fmt(amt)}</span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${(amt / topBrands[0][1]) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-3">Top Brands — Social Media</h2>
                <div className="space-y-2">
                  {(() => {
                    const sb = {}
                    socialCampaigns.forEach(c => { sb[c.brand] = (sb[c.brand] || 0) + c.amount })
                    const sorted = Object.entries(sb).sort((a, b) => b[1] - a[1])
                    return sorted.slice(0, 10).map(([brand, amt]) => (
                      <div key={brand} className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="font-medium text-gray-700">{brand}</span>
                            <span className="text-gray-500">{fmt(amt)}</span>
                          </div>
                          <div className="bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${(amt / sorted[0][1]) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 overflow-x-auto">
              <h2 className="font-semibold text-gray-900 mb-1">All Website Campaigns</h2>
              <p className="text-xs text-gray-400 mb-3">Historical + live entries · <span className="text-green-600 font-medium">green = live entry</span></p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Month</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Agency</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Campaign</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Brand</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Portal</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-semibold uppercase">Impressions</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-semibold uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {webCampaigns.sort((a, b) => a.month.localeCompare(b.month)).map((c, i) => (
                    <tr key={i} className={`transition-colors ${c.live ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-blue-50'}`}>
                      <td className="px-3 py-2 text-gray-500">{c.month}</td>
                      <td className="px-3 py-2 text-gray-700">{c.agency}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{c.campaign}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{c.brand}</td>
                      <td className="px-3 py-2 text-gray-500 max-w-[140px] truncate">{c.portal}</td>
                      <td className="px-3 py-2 text-right text-gray-400">{c.impressions ? Number(c.impressions).toLocaleString() : '—'}</td>
                      <td className="px-3 py-2 text-right font-semibold text-blue-700">₨{c.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 font-bold">
                    <td colSpan={6} className="px-3 py-2 text-gray-700">Total</td>
                    <td className="px-3 py-2 text-right text-blue-800">₨{webTotal.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* ───────────────────────── SOCIAL MEDIA ───────────────────────── */}
      {view === 'Social Media' && (() => {
        const SOCIAL_PORTALS = ['FB Post', 'FB Reel', 'Insta Post', 'Insta Reel', 'YouTube']
        const SOCIAL_COLORS  = { 'FB Post': '#1877f2', 'FB Reel': '#0c63d4', 'Insta Post': '#e1306c', 'Insta Reel': '#c13584', 'YouTube': '#ff0000' }

        // All rows filtered by date range
        const allRows = [
          ...CAMPAIGNS_FY26.map(c => ({ month: c.month, portal: c.portal, amount: c.amount, impressions: c.impressions || 0, agency: c.agency, brand: c.brand, campaign: c.campaign })),
          ...entries.map(e => ({ month: e.month, portal: e.portal || '', amount: Number(e.amount || 0), impressions: Number(e.impressions || 0), agency: e.agency || '', brand: e.brand || '', campaign: e.campaign || '', ro_number: e.ro_number, live: true })),
        ].filter(c => c.month >= from && c.month <= to && classifyPortal(c.portal) === 'social')

        const totalSocial = allRows.reduce((a, c) => a + c.amount, 0)
        const totalImpressions = allRows.reduce((a, c) => a + (c.impressions || 0), 0)

        // Per exact placement (live entries only — historical lumped as 'Social')
        const byPlacement = {}
        SOCIAL_PORTALS.forEach(p => { byPlacement[p] = { amount: 0, impressions: 0, count: 0 } })
        byPlacement['Other Social'] = { amount: 0, impressions: 0, count: 0 }
        entries.filter(e => e.month >= from && e.month <= to && classifyPortal(e.portal) === 'social').forEach(e => {
          const key = SOCIAL_PORTALS.includes(e.portal) ? e.portal : 'Other Social'
          byPlacement[key].amount      += Number(e.amount || 0)
          byPlacement[key].impressions += Number(e.impressions || 0)
          byPlacement[key].count++
        })

        // Monthly trend
        const byMonth = {}
        allRows.forEach(c => { byMonth[c.month] = (byMonth[c.month] || 0) + c.amount })
        const monthChartData = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => ({ label: MONTHS.find(m => m.key === k)?.label || k, amount: v }))

        // Top brands
        const byBrand = {}
        allRows.forEach(c => { byBrand[c.brand] = (byBrand[c.brand] || 0) + c.amount })
        const topBrands = Object.entries(byBrand).sort((a, b) => b[1] - a[1]).slice(0, 10)

        return (
          <div className="space-y-5">
            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-pink-50 border border-pink-100 rounded-xl p-5">
                <p className="text-xs text-pink-500 font-semibold uppercase mb-1">Social Media Revenue</p>
                <p className="text-2xl font-bold text-pink-800">{fmt(totalSocial)}</p>
                <p className="text-xs text-pink-400 mt-1">{allRows.length} campaigns in selected period</p>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
                <p className="text-xs text-purple-500 font-semibold uppercase mb-1">Total Impressions</p>
                <p className="text-2xl font-bold text-purple-800">{totalImpressions > 0 ? totalImpressions.toLocaleString() : '—'}</p>
                <p className="text-xs text-purple-400 mt-1">from live entries with impressions data</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Platforms Active</p>
                <p className="text-2xl font-bold text-gray-800">{Object.values(byPlacement).filter(v => v.amount > 0).length}</p>
                <p className="text-xs text-gray-400 mt-1">of {SOCIAL_PORTALS.length} placements used</p>
              </div>
            </div>

            {/* Per-placement breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Revenue by Placement</h2>
              <p className="text-xs text-gray-400 mb-4">Exact placement breakdown from live entries · historical data shown as combined Social row</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                {SOCIAL_PORTALS.map(p => {
                  const d = byPlacement[p]
                  const color = SOCIAL_COLORS[p]
                  return (
                    <div key={p} className={`rounded-xl border p-4 text-center ${d.amount > 0 ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-40'}`}>
                      <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ background: color }} />
                      <p className="text-[11px] font-bold text-gray-500 uppercase mb-1">{p}</p>
                      <p className="text-base font-bold text-gray-900">{d.amount > 0 ? fmt(d.amount) : '—'}</p>
                      {d.impressions > 0 && <p className="text-[10px] text-gray-400 mt-0.5">{d.impressions.toLocaleString()} impr.</p>}
                      {d.count > 0 && <p className="text-[10px] text-gray-400">{d.count} campaign{d.count > 1 ? 's' : ''}</p>}
                    </div>
                  )
                })}
              </div>

              {/* Historical social campaigns (from CAMPAIGNS_FY26, no exact placement) */}
              {allRows.filter(c => !c.live).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 font-semibold uppercase mb-2">Historical campaigns (portal as recorded in source data)</p>
                  <div className="space-y-1">
                    {allRows.filter(c => !c.live).map((c, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-600 py-1">
                        <span>{c.month} · <span className="font-medium">{c.brand}</span> · {c.agency} <span className="text-gray-400">({c.portal})</span></span>
                        <span className="font-semibold">₨{c.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Monthly trend chart */}
            {monthChartData.length > 1 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Social Media Revenue — Monthly Trend</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={axisFmt} tick={{ fontSize: 10 }} width={55} />
                    <Tooltip formatter={v => [fmt(v), 'Social Revenue']} />
                    <Bar dataKey="amount" fill="#e1306c" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top brands */}
            {topBrands.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-3">Top Brands — Social Media</h2>
                <div className="space-y-2">
                  {topBrands.map(([brand, amt]) => (
                    <div key={brand}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="font-medium text-gray-700">{brand}</span>
                        <span className="text-gray-500">{fmt(amt)}</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-pink-500" style={{ width: `${(amt / topBrands[0][1]) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full campaign table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 overflow-x-auto">
              <h2 className="font-semibold text-gray-900 mb-3">All Social Media Campaigns</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Month</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Agency</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Brand</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Campaign</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Placement</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-semibold uppercase">Impressions</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-semibold uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allRows.sort((a, b) => a.month.localeCompare(b.month)).map((c, i) => (
                    <tr key={i} className={c.live ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-pink-50'}>
                      <td className="px-3 py-2 text-gray-500">{c.month}</td>
                      <td className="px-3 py-2 text-gray-700">{c.agency}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{c.brand}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate">{c.campaign}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                          style={{ background: SOCIAL_COLORS[c.portal] ? SOCIAL_COLORS[c.portal] + '20' : '#f3e8ff', color: SOCIAL_COLORS[c.portal] || '#7c3aed' }}>
                          {c.portal || 'Social'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-400">{c.impressions > 0 ? c.impressions.toLocaleString() : '—'}</td>
                      <td className="px-3 py-2 text-right font-semibold text-pink-700">₨{c.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-pink-50 font-bold border-t-2">
                    <td colSpan={6} className="px-3 py-2 text-gray-700">Total</td>
                    <td className="px-3 py-2 text-right text-pink-800">₨{totalSocial.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Modals */}
      {showPpt && <PptModal onClose={() => setShowPpt(false)} months={months} range={range} rangeLabel={`${range[0]?.label} – ${range[range.length - 1]?.label}`} liveTotal={liveTotal} />}
      {showEntry && <EntryModal onClose={() => setShowEntry(false)} liveStatus={liveStatus} />}
    </div>
  )
}

// ── Agencies & Brands view ────────────────────────────────────────────────────
function AgenciesBrands({ fmt, axisFmt, entries }) {
  const [typeFilter, setTypeFilter]   = useState('All')
  const [sortBy,     setSortBy]       = useState('total')
  const [sortDir,    setSortDir]      = useState('desc')
  const [expanded,   setExpanded]     = useState(null)
  const [brandDrill, setBrandDrill]   = useState(null) // {agency, brand} for campaign list

  // Merge historical campaigns + live entries into one flat list
  const allCampaigns = useMemo(() => [
    ...CAMPAIGNS_FY26.map(c => ({ ...c, live: false })),
    ...entries.map(e => ({
      month: e.month, agency: e.agency || 'Direct', brand: e.brand || '—',
      campaign: e.campaign || e.notes || '', portal: e.portal || e.channel || '',
      amount: Number(e.amount || 0), live: true, ro_number: e.ro_number,
    })),
  ], [entries])

  // Agency totals (all campaigns combined)
  const agencyTotals = useMemo(() => {
    const m = {}
    allCampaigns.forEach(c => { m[c.agency] = (m[c.agency] || 0) + c.amount })
    return m
  }, [allCampaigns])

  // Agency → brand breakdown
  const agencyBrands = useMemo(() => {
    const m = {}
    allCampaigns.forEach(c => {
      if (!m[c.agency]) m[c.agency] = {}
      m[c.agency][c.brand] = (m[c.agency][c.brand] || 0) + c.amount
    })
    return m
  }, [allCampaigns])

  const rows = useMemo(() => {
    const known = new Set(ENTITIES.map(e => e.name))
    const merged = ENTITIES.map(e => ({ ...e, total: (e.fy24h1 || 0) + (e.fy25h1 || 0) + (agencyTotals[e.name] || 0), live: agencyTotals[e.name] || 0 }))
    Object.entries(agencyTotals).forEach(([name, amt]) => {
      if (!known.has(name)) merged.push({ name, type: name === 'Direct' ? 'direct' : 'agency', fy24h1: 0, fy25h1: 0, live: amt, total: amt })
    })
    return merged
  }, [agencyTotals])

  const filtered = rows
    .filter(r => typeFilter === 'All' || (typeFilter === 'Agencies' ? r.type === 'agency' : r.type !== 'agency'))
    .sort((a, b) => {
      const va = a[sortBy] ?? 0, vb = b[sortBy] ?? 0
      return sortDir === 'desc' ? vb - va : va - vb
    })

  const top10 = [...rows].sort((a, b) => b.total - a.total).slice(0, 10)

  const brandTotals = useMemo(() => {
    const m = {}
    allCampaigns.forEach(c => { m[c.brand] = (m[c.brand] || 0) + c.amount })
    return Object.entries(m).map(([brand, amount]) => ({ brand, amount })).sort((a, b) => b.amount - a.amount).slice(0, 12)
  }, [allCampaigns])

  function clickSort(col) {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const typeBadge = t => t === 'agency'
    ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600">AGENCY</span>
    : t === 'brand'
      ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-600">BRAND</span>
      : <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-600">DIRECT</span>

  const SortHead = ({ col, children }) => (
    <th className="text-right px-3 py-2 text-gray-500 font-semibold uppercase whitespace-nowrap cursor-pointer select-none hover:text-gray-700" onClick={() => clickSort(col)}>
      <span className="inline-flex items-center gap-1">{children}{sortBy === col && (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}</span>
    </th>
  )

  // Campaigns for a specific agency+brand drill
  const drillCampaigns = brandDrill
    ? allCampaigns.filter(c => c.agency === brandDrill.agency && (!brandDrill.brand || c.brand === brandDrill.brand))
    : null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {['All', 'Agencies', 'Brands & Direct'].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${typeFilter === t ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>{t}</button>
        ))}
        <p className="text-xs text-gray-400 ml-2">Click a row to see per-brand breakdown · click a brand to see all campaigns</p>
      </div>

      {/* Agency → Brand drill panel */}
      {brandDrill && drillCampaigns && (
        <div className="bg-white rounded-xl border-2 border-brand-500 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900">
                {brandDrill.agency}{brandDrill.brand ? ` → ${brandDrill.brand}` : ' — All Brands'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {drillCampaigns.length} campaigns · Total: <span className="font-semibold text-gray-700">{fmt(drillCampaigns.reduce((a, c) => a + c.amount, 0))}</span>
              </p>
            </div>
            <button onClick={() => setBrandDrill(null)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-50">✕ Close</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Month</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Brand</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Campaign</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Portal</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">RO#</th>
                  <th className="text-right px-3 py-2 text-gray-500 font-semibold uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {drillCampaigns.sort((a, b) => a.month.localeCompare(b.month)).map((c, i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${c.live ? 'bg-green-50/40' : ''}`}>
                    <td className="px-3 py-2 text-gray-500">{c.month}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{c.brand}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate">{c.campaign}</td>
                    <td className="px-3 py-2 text-gray-500">{c.portal}</td>
                    <td className="px-3 py-2 text-gray-400">{c.ro_number || '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-800">₨{c.amount.toLocaleString()}{c.live && <span className="ml-1 text-[9px] text-green-600">LIVE</span>}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold border-t-2">
                  <td colSpan={5} className="px-3 py-2 text-gray-700">Total</td>
                  <td className="px-3 py-2 text-right text-brand-600">₨{drillCampaigns.reduce((a, c) => a + c.amount, 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 overflow-x-auto">
        <h2 className="font-semibold text-gray-900 mb-1">Agency &amp; Brand Revenue — All Years</h2>
        <p className="text-xs text-gray-400 mb-3">Click a row to expand brands · click a brand name to drill into campaigns</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Agency / Brand</th>
              <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase">Type</th>
              <SortHead col="fy24h1">H1 FY23-24</SortHead>
              <SortHead col="fy25h1">H1 FY24-25</SortHead>
              <SortHead col="live">FY25-26 Live</SortHead>
              <SortHead col="total">Total</SortHead>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(r => {
              const brands = agencyBrands[r.name] ? Object.entries(agencyBrands[r.name]).sort((a, b) => b[1] - a[1]) : []
              const isOpen = expanded === r.name
              return (
                <Fragment key={r.name}>
                  <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(isOpen ? null : r.name)}>
                    <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-1">
                      {brands.length > 0 && <span className="text-gray-400">{isOpen ? '▾' : '▸'}</span>}
                      {r.name}
                    </td>
                    <td className="px-3 py-2">{typeBadge(r.type)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{r.fy24h1 ? fmt(r.fy24h1) : '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{r.fy25h1 ? fmt(r.fy25h1) : '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{r.live ? fmt(r.live) : '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900">{r.total ? fmt(r.total) : '—'}</td>
                  </tr>
                  {/* Per-brand breakdown */}
                  {isOpen && brands.length > 0 && brands.map(([brand, amt]) => (
                    <tr key={brand} className="bg-blue-50/40 hover:bg-blue-50 cursor-pointer"
                      onClick={e => { e.stopPropagation(); setBrandDrill({ agency: r.name, brand }) }}>
                      <td className="pl-8 pr-3 py-1.5 text-gray-600 flex items-center gap-1">
                        <span className="text-gray-300 text-[10px]">└</span> {brand}
                        <span className="ml-1 text-[9px] text-blue-500">view campaigns →</span>
                      </td>
                      <td colSpan={4} className="px-3 py-1.5">
                        <div className="bg-gray-100 rounded-full h-1.5 w-full">
                          <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(amt / brands[0][1]) * 100}%` }} />
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium text-gray-800">{fmt(amt)}</td>
                    </tr>
                  ))}
                  {isOpen && brands.length > 0 && (
                    <tr className="bg-blue-50/40 border-b">
                      <td className="pl-8 pr-3 py-1.5 font-semibold text-gray-700 cursor-pointer hover:underline"
                        onClick={e => { e.stopPropagation(); setBrandDrill({ agency: r.name, brand: null }) }}>
                        All campaigns →
                      </td>
                      <td colSpan={4} />
                      <td className="px-3 py-1.5 text-right font-bold text-brand-600">{fmt(brands.reduce((a, [, v]) => a + v, 0))}</td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Top 10 Overall</h2>
          <p className="text-xs text-gray-400 mb-3">Sum across all recorded periods</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top10.map(r => ({ name: r.name, total: r.total }))} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={axisFmt} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
              <Tooltip formatter={v => [fmt(v), 'Total']} />
              <Bar dataKey="total" fill="#c0392b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Top Brands</h2>
          <p className="text-xs text-gray-400 mb-3">End advertisers — click to drill into campaigns</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={brandTotals} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={axisFmt} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="brand" tick={{ fontSize: 10 }} width={130} />
              <Tooltip formatter={v => [fmt(v), 'Booked']} />
              <Bar dataKey="amount" fill="#7c3aed" radius={[0, 4, 4, 0]}
                onClick={d => setBrandDrill({ agency: null, brand: d.brand })} style={{ cursor: 'pointer' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ── Campaigns view (static FY25-26 bookings + live entries) ──────────────────
function Campaigns({ fmt, from, to, entries }) {
  const [search, setSearch] = useState('')
  const [agency, setAgency] = useState('All')
  const [brand, setBrand] = useState('All')
  const [groupBy, setGroupBy] = useState('None')

  const allRows = useMemo(() => [
    ...CAMPAIGNS_FY26.map(c => ({ ...c, live: false })),
    ...entries.map(e => ({
      month: e.month,
      agency: e.agency || 'Direct',
      campaign: e.campaign || e.notes || e.category || 'Manual entry',
      portal: e.portal || e.channel || '',
      brand: e.brand || '—',
      amount: Number(e.amount || 0),
      live: true,
    })),
  ], [entries])

  const agencies = ['All', ...new Set(allRows.map(c => c.agency))].sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b))
  const brands = ['All', ...new Set(allRows.map(c => c.brand))].sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b))

  const filtered = allRows.filter(c =>
    c.month >= from && c.month <= to &&
    (agency === 'All' || c.agency === agency) &&
    (brand === 'All' || c.brand === brand) &&
    (!search || [c.campaign, c.agency, c.brand, c.portal].join(' ').toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => a.month.localeCompare(b.month))
  const sum = filtered.reduce((a, c) => a + c.amount, 0)

  const grouped = useMemo(() => {
    if (groupBy === 'None') return null
    const key = groupBy === 'Agency' ? 'agency' : groupBy === 'Brand' ? 'brand' : 'month'
    const m = {}
    filtered.forEach(c => { (m[c[key]] = m[c[key]] || []).push(c) })
    return Object.entries(m).map(([k, items]) => ({ k, items, total: items.reduce((a, c) => a + c.amount, 0) })).sort((a, b) => b.total - a.total)
  }, [filtered, groupBy])

  const Row = c => (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{c.month}</td>
      <td className="px-3 py-2 font-medium text-gray-800">{c.campaign}{c.live && <span className="ml-1.5 px-1 py-0.5 rounded text-[9px] font-bold bg-green-50 text-green-600">LIVE</span>}</td>
      <td className="px-3 py-2 text-gray-600">{c.agency}</td>
      <td className="px-3 py-2 text-gray-600">{c.brand}</td>
      <td className="px-3 py-2 text-gray-500">{c.portal}</td>
      <td className="px-3 py-2 text-right font-semibold text-gray-900 whitespace-nowrap">{fmt(c.amount)}</td>
    </tr>
  )

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaign, brand, agency…"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:border-brand-500" />
        <select value={agency} onChange={e => setAgency(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white text-gray-700">
          {agencies.map(a => <option key={a}>{a}</option>)}
        </select>
        <select value={brand} onChange={e => setBrand(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white text-gray-700">
          {brands.map(b => <option key={b}>{b}</option>)}
        </select>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 ml-auto">
          {['None', 'Agency', 'Brand', 'Month'].map(g => (
            <button key={g} onClick={() => setGroupBy(g)} className={`px-2.5 py-1 rounded-md text-xs font-medium ${groupBy === g ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              {g === 'None' ? 'Flat list' : `Group: ${g}`}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 overflow-x-auto">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Campaign Bookings</h2>
          <p className="text-sm text-gray-500">{filtered.length} bookings · <span className="font-bold text-gray-900">{fmt(sum)}</span></p>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          FY2025-26 website & social bookings from the source file, plus any live entries added through the dashboard (tagged LIVE). Respects the date filter above.
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Month', 'Campaign', 'Agency', 'Brand', 'Portal', 'Amount'].map((h, i) => (
                <th key={h} className={`px-3 py-2 text-gray-500 font-semibold uppercase whitespace-nowrap ${i === 5 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {grouped ? grouped.map(g => (
              <Fragment key={g.k}>
                <tr className="bg-gray-50">
                  <td colSpan={5} className="px-3 py-2 font-bold text-gray-700">{g.k} <span className="font-normal text-gray-400">({g.items.length})</span></td>
                  <td className="px-3 py-2 text-right font-bold text-brand-700">{fmt(g.total)}</td>
                </tr>
                {g.items.map((c, i) => <Row key={`${g.k}-${i}`} {...c} />)}
              </Fragment>
            )) : filtered.map((c, i) => <Row key={i} {...c} />)}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">No campaigns match the current filters / date range.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── PPT export modal ──────────────────────────────────────────────────────────
const PPT_SECTIONS = [
  ['title', 'Title slide'],
  ['kpis', 'Key numbers (KPIs)'],
  ['monthly', 'Monthly revenue chart (filtered range)'],
  ['compare', 'Year-over-year comparison'],
  ['channels', 'Revenue by channel'],
  ['biztype', 'Business mix (FY2024-25 pie)'],
  ['agencies', 'Agencies & brands table'],
  ['target', 'FY2026-27 target (PKR 500M)'],
]

function PptModal({ onClose, months, range, rangeLabel, liveTotal }) {
  const [sections, setSections] = useState(Object.fromEntries(PPT_SECTIONS.map(([k]) => [k, true])))
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const [err, setErr] = useState(null)

  async function generate() {
    setBusy(true); setErr(null); setDone(null)
    try {
      const { exportRevenuePpt } = await import('../../lib/revenuePpt')
      const fy25 = months.filter(m => m.fy === 'FY2024-25')
      const fy25cats = {}
      CAT_META.forEach(c => { fy25cats[c.id] = fy25.reduce((a, m) => a + (m.cat?.[c.id] || 0), 0) })
      const fname = await exportRevenuePpt({
        months: range,
        rangeLabel,
        liveTotal,
        sections: { ...sections, _allMonths: months, _fy25cats: fy25cats },
      })
      setDone(fname)
    } catch (e) {
      setErr(e.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900">Create PowerPoint</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Builds a .pptx from the dashboard numbers · period: <span className="font-medium text-gray-600">{rangeLabel}</span></p>
        <div className="space-y-2 mb-5">
          {PPT_SECTIONS.map(([k, label]) => (
            <label key={k} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={sections[k]} onChange={e => setSections(s => ({ ...s, [k]: e.target.checked }))}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
              {label}
            </label>
          ))}
        </div>
        {err && <p className="text-xs text-red-500 mb-3">Failed: {err}</p>}
        {done && <p className="text-xs text-green-600 mb-3">✓ Downloaded: {done}</p>}
        <button onClick={generate} disabled={busy || !Object.values(sections).some(Boolean)}
          className="w-full bg-brand-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2">
          <Presentation size={15} /> {busy ? 'Building presentation…' : 'Generate & Download .pptx'}
        </button>
      </div>
    </div>
  )
}

// ── Add revenue entry modal ───────────────────────────────────────────────────
function EntryModal({ onClose, liveStatus }) {
  const today = new Date()
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  // Header fields (shared across all portal rows)
  const [month,       setMonth]       = useState(MONTHS.some(m => m.key === defaultMonth) ? defaultMonth : '2026-07')
  const [ro,          setRo]          = useState('')
  const [agency,      setAgency]      = useState('')
  const [brand,       setBrand]       = useState('')
  const [campaign,    setCampaign]    = useState('')
  const [category,    setCategory]    = useState('')
  const [notes,       setNotes]       = useState('')
  const [channel,     setChannel]     = useState('HUM News')
  const [projectName, setProjectName] = useState('')

  // Per-portal amounts + impressions
  const [lines, setLines] = useState(PORTAL_OPTIONS.map(p => ({ portal: p, customName: '', amount: '', impressions: '' })))

  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState(null)
  const [done, setDone] = useState(false)

  const setLine = (i, k, v) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l))

  const activeLines = lines.filter(l => Number(l.amount) > 0)
  const total       = activeLines.reduce((a, l) => a + Number(l.amount), 0)
  const effectiveCh = channel === 'Special Project' ? (projectName.trim() || 'Special Project') : channel

  async function save() {
    if (activeLines.length === 0) { setErr('Enter at least one amount.'); return }
    if (!ro.trim()) { setErr('RO number is required.'); return }
    setBusy(true); setErr(null)

    const rows = activeLines.map(l => ({
      month,
      ro_number:   ro.trim(),
      agency:      agency.trim()   || null,
      brand:       brand.trim()    || null,
      campaign:    campaign.trim() || null,
      category:    category        || null,
      notes:       notes.trim()    || null,
      channel:     effectiveCh,
      portal:      l.portal === 'Other' ? (l.customName.trim() || 'Other') : l.portal,
      amount:      Number(l.amount),
      impressions: Number(l.impressions) || null,
    }))

    const { error } = await supabase.from('revenue_entries').insert(rows)
    if (error) { setBusy(false); setErr(error.message); return }

    // Auto-create brand + agency in clients table
    const toUpsert = []
    if (brand.trim()) toUpsert.push({ name: brand.trim(), type: 'brand', source: 'revenue' })
    if (agency.trim() && agency.trim().toLowerCase() !== 'direct')
      toUpsert.push({ name: agency.trim(), type: 'agency', source: 'revenue' })
    if (toUpsert.length > 0)
      await supabase.from('clients').upsert(toUpsert, { onConflict: 'name', ignoreDuplicates: true })

    setBusy(false); setDone(true)
    setTimeout(onClose, 1200)
  }

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[94vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Sticky header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">New Revenue Entry</h2>
            <p className="text-xs text-gray-400 mt-0.5">Saved instantly · brand &amp; agency auto-added to Clients tab</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* ── Section 1: Core details ── */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Details</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-500 font-medium">Month *
                <select value={month} onChange={e => setMonth(e.target.value)} className={`mt-1 ${inp}`}>
                  {MONTHS.filter(m => m.key >= '2025-07').map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-500 font-medium">RO Number *
                <input value={ro} onChange={e => setRo(e.target.value)} placeholder="e.g. HUM-2025-001" className={`mt-1 ${inp}`} />
              </label>
              <label className="text-xs text-gray-500 font-medium">Agency
                <input value={agency} onChange={e => setAgency(e.target.value)} placeholder="e.g. GroupM, BrainChild" className={`mt-1 ${inp}`} />
              </label>
              <label className="text-xs text-gray-500 font-medium">Brand / Client
                <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Nestle, HBL" className={`mt-1 ${inp}`} />
              </label>
              <label className="text-xs text-gray-500 font-medium">Campaign Name
                <input value={campaign} onChange={e => setCampaign(e.target.value)} placeholder="e.g. Spelling Whizz S2" className={`mt-1 ${inp}`} />
              </label>
              <label className="text-xs text-gray-500 font-medium">Business Type
                <select value={category} onChange={e => setCategory(e.target.value)} className={`mt-1 ${inp}`}>
                  <option value="">— select —</option>
                  {CAT_META.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-500 font-medium col-span-2">Notes
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" className={`mt-1 ${inp}`} />
              </label>
            </div>
          </div>

          {/* ── Section 2: Platform ── */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Platform *</p>
            <div className="flex flex-wrap gap-2">
              {CHANNEL_OPTIONS.map(ch => (
                <button key={ch} type="button" onClick={() => setChannel(ch)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${channel === ch ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  {ch}
                </button>
              ))}
            </div>
            {channel === 'Special Project' && (
              <input value={projectName} onChange={e => setProjectName(e.target.value)}
                placeholder="Project name (e.g. HUM Awards, Bridal Couture Week)"
                className={`mt-2 ${inp}`} />
            )}
          </div>

          {/* ── Section 3: Placement breakdown ── */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Revenue by Placement</p>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs">
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase">Placement</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-gray-500 uppercase">Amount (PKR)</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-gray-500 uppercase">Impressions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map((l, i) => (
                    <tr key={l.portal} className={`transition-colors ${Number(l.amount) > 0 ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-2.5 font-medium text-gray-700">
                        {l.portal === 'Other'
                          ? <input value={l.customName} onChange={e => setLine(i, 'customName', e.target.value)}
                              placeholder="Specify placement…"
                              className="w-36 border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-brand-500" />
                          : l.portal}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-gray-400 text-xs">₨</span>
                          <input type="number" min="0" value={l.amount} onChange={e => setLine(i, 'amount', e.target.value)}
                            placeholder="0"
                            className="w-28 text-right border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500" />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <input type="number" min="0" value={l.impressions} onChange={e => setLine(i, 'impressions', e.target.value)}
                          placeholder="0"
                          className="w-28 text-right border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500" />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                    <td className="px-4 py-3 text-gray-700">Total</td>
                    <td className="px-4 py-3 text-right text-brand-600 text-base">₨{total.toLocaleString()}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {err  && <p className="text-xs text-red-500 font-medium">{err}</p>}
          {done && <p className="text-xs text-green-600 font-medium">✓ Saved {activeLines.length} row{activeLines.length > 1 ? 's' : ''} — dashboard updated in real time.</p>}

          <button onClick={save} disabled={busy}
            className="w-full bg-brand-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            <Plus size={15} /> {busy ? 'Saving…' : `Save Entry${total > 0 ? ` · ₨${total.toLocaleString()}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
