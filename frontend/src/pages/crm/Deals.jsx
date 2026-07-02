import { useEffect, useState } from 'react'
import { Plus, Search, X, Download, LayoutList, Columns, Phone, Calendar, Clock, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { notifyAdmin } from '../../lib/notify'
import { downloadExcel } from '../../lib/exportExcel'

const DEAL_TYPES = ['Drama Sponsorship','Social Media Posts','Website Banners','Exclusive Content','Product Integration','Drama Integration','Podcast','Webseries','Event Sponsorship','Branded Content Package']
const CHANNELS   = ['HUM News','Masala TV','HUM TV','Glam','Special Project']
const STATUSES   = ['Prospecting','Pitch Sent','In Negotiation','Under Process','Locked','RO Received','Billed','Sent to Finance','Completed','Cancelled']
const TIERS      = ['Presenting','Powered By','Associated']
const KANBAN_STAGES = ['Prospecting','Pitch Sent','In Negotiation','Under Process','Locked','RO Received','Billed']

const STATUS_COLORS = {
  Prospecting:    'bg-gray-100 text-gray-600',
  'Pitch Sent':   'bg-blue-100 text-blue-700',
  'In Negotiation':'bg-yellow-100 text-yellow-700',
  'Under Process':'bg-orange-100 text-orange-700',
  Locked:         'bg-purple-100 text-purple-700',
  'RO Received':  'bg-indigo-100 text-indigo-700',
  Billed:         'bg-green-100 text-green-700',
  'Sent to Finance':'bg-teal-100 text-teal-700',
  Completed:      'bg-green-200 text-green-800',
  Cancelled:      'bg-red-100 text-red-600',
}

const STAGE_HEADER_COLORS = {
  Prospecting:    'bg-gray-50 border-gray-200',
  'Pitch Sent':   'bg-blue-50 border-blue-200',
  'In Negotiation':'bg-yellow-50 border-yellow-200',
  'Under Process':'bg-orange-50 border-orange-200',
  Locked:         'bg-purple-50 border-purple-200',
  'RO Received':  'bg-indigo-50 border-indigo-200',
  Billed:         'bg-green-50 border-green-200',
}

const TL_ICON_COLORS = {
  Call: 'bg-blue-100 text-blue-600',
  Email: 'bg-gray-100 text-gray-600',
  'In-Person Meeting': 'bg-green-100 text-green-600',
  WhatsApp: 'bg-green-100 text-green-600',
  Presentation: 'bg-purple-100 text-purple-600',
  'In-Person': 'bg-teal-100 text-teal-600',
  Online: 'bg-sky-100 text-sky-600',
  'Phone Call': 'bg-blue-100 text-blue-600',
}

function fmt(n) {
  if (!n) return '—'
  if (n >= 10000000) return `₨${(n/10000000).toFixed(1)}Cr`
  if (n >= 100000) return `₨${(n/100000).toFixed(1)}L`
  return `₨${Number(n).toLocaleString()}`
}

export default function Deals() {
  const [deals, setDeals]         = useState([])
  const [clients, setClients]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [view, setView]           = useState('list')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState(defaultForm())

  // Timeline drawer
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [timeline, setTimeline]   = useState([])
  const [tlLoading, setTlLoading] = useState(false)

  function defaultForm() {
    return { name: '', ro_number: '', type: DEAL_TYPES[0], client_id: '', channel: [], special_project_name: '', tier: '', start_date: '', end_date: '', value_net: '', status: 'Prospecting', notes: '', assigned_to: '', agency_commission_pct: 15 }
  }

  useEffect(() => {
    fetchDeals()
    supabase.from('clients').select('id, name').order('name').then(({ data }) => setClients(data || []))
  }, [])

  async function fetchDeals() {
    setLoading(true)
    const { data } = await supabase.from('deals').select('*, clients(name)').order('created_at', { ascending: false })
    setDeals(data || [])
    setLoading(false)
  }

  async function saveDeal(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      value_net: form.value_net ? Number(form.value_net) : null,
      agency_commission_pct: Number(form.agency_commission_pct),
      // Store Special Project custom name as the channel entry
      channel: form.channel.map(c => c === 'Special Project' && form.special_project_name.trim() ? `Special Project: ${form.special_project_name.trim()}` : c),
    }
    delete payload.special_project_name
    const { error, data } = await supabase.from('deals').insert([payload]).select('*, clients(name)')
    if (!error) {
      const clientName = data?.[0]?.clients?.name || 'a client'
      const amount = payload.value_net ? ` · PKR ${(payload.value_net / 1000000).toFixed(1)}M` : ''
      notifyAdmin('new_deal', `New deal: ${form.name}`, `${clientName}${amount} · ${form.status}`)
      setShowModal(false); setForm(defaultForm()); fetchDeals()
    } else alert('Error: ' + error.message)
    setSaving(false)
  }

  async function updateStatus(dealId, status) {
    await supabase.from('deals').update({ status }).eq('id', dealId)
    fetchDeals()
  }

  async function openTimeline(deal) {
    setSelectedDeal(deal)
    setTlLoading(true)
    const [{ data: fu }, { data: ml }] = await Promise.all([
      supabase.from('follow_ups').select('*').eq('deal_id', deal.id).order('follow_up_date'),
      supabase.from('meeting_logs').select('*').eq('deal_id', deal.id).order('meeting_date'),
    ])
    const combined = [
      ...(fu || []).map(f => ({ ...f, _kind: 'followup', _date: f.follow_up_date })),
      ...(ml || []).map(m => ({ ...m, _kind: 'meeting',  _date: m.meeting_date })),
    ].sort((a, b) => new Date(b._date) - new Date(a._date))
    setTimeline(combined)
    setTlLoading(false)
  }

  const filtered = deals.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || (d.clients?.name || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || d.status === filterStatus
    return matchSearch && matchStatus
  })

  // Stage funnel summary
  const stageData = KANBAN_STAGES.map(s => ({
    stage: s,
    count: deals.filter(d => d.status === s).length,
    value: deals.filter(d => d.status === s).reduce((sum, d) => sum + (d.value_net || 0), 0),
  }))
  const maxCount = Math.max(...stageData.map(s => s.count), 1)

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
          <p className="text-sm text-gray-500 mt-0.5">{deals.length} total · {filtered.length} shown</p>
        </div>
        <div className="flex gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setView('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view==='list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
              <LayoutList size={13}/> List
            </button>
            <button onClick={() => setView('board')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view==='board' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
              <Columns size={13}/> Board
            </button>
          </div>
          <button onClick={() => downloadExcel(
            filtered.map(d => ({
              'Deal Name': d.name, Client: d.clients?.name || '', Type: d.type,
              Channel: (d.channel || []).join(', '), Tier: d.tier || '', Status: d.status,
              'Value Net (PKR)': d.value_net || 0, 'Value Gross (PKR)': d.value_gross || 0,
              'Start Date': d.start_date || '', 'End Date': d.end_date || '',
              'Assigned To': d.assigned_to || '', Notes: d.notes || '',
            })),
            'Deals', 'Deals'
          )} className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            <Download size={15}/> Export Excel
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">
            <Plus size={16} /> New Deal
          </button>
        </div>
      </div>

      {/* Stage funnel bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Pipeline Funnel</p>
        <div className="space-y-1.5">
          {stageData.map(s => (
            <div key={s.stage} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-28 flex-shrink-0 truncate">{s.stage}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
                <div
                  className={`h-5 rounded-full transition-all ${STATUS_COLORS[s.stage]?.replace('text-', 'bg-').replace('100', '400').replace('bg-gray-400','bg-gray-300') || 'bg-gray-300'}`}
                  style={{ width: `${s.count ? Math.max((s.count / maxCount) * 100, 4) : 0}%` }}
                />
              </div>
              <div className="flex items-center gap-2 w-32 flex-shrink-0">
                <span className="text-xs font-semibold text-gray-700">{s.count}</span>
                <span className="text-xs text-gray-400">{fmt(s.value)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals or clients..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400"><p className="text-lg">No deals found</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Deal Name','Client','Type','Channel','Value (Net)','GST','Gross','Status','Assigned To','Dates',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{d.name}</p>
                      {d.tier && <p className="text-xs text-gray-400">{d.tier}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{d.clients?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{d.type}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{(d.channel || []).join(', ') || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{fmt(d.value_net)}</td>
                    <td className="px-4 py-3 text-gray-500">{fmt(d.gst)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{fmt(d.value_gross)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-600'}`}>{d.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{d.assigned_to || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {d.start_date && <span>{d.start_date}</span>}
                      {d.start_date && d.end_date && <span> → </span>}
                      {d.end_date && <span>{d.end_date}</span>}
                      {!d.start_date && '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openTimeline(d)} className="text-xs text-brand-500 hover:text-brand-700 flex items-center gap-0.5 whitespace-nowrap">
                        Activity <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* BOARD VIEW */}
      {view === 'board' && !loading && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3" style={{ minWidth: `${KANBAN_STAGES.length * 260}px` }}>
            {KANBAN_STAGES.map(stage => {
              const stageDeals = filtered.filter(d => d.status === stage)
              const stageVal = stageDeals.reduce((s, d) => s + (d.value_net || 0), 0)
              return (
                <div key={stage} className="w-60 flex-shrink-0">
                  <div className={`rounded-t-xl px-3 py-2.5 border ${STAGE_HEADER_COLORS[stage] || 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[stage]}`}>{stage}</span>
                      <span className="text-xs text-gray-500">{stageDeals.length}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{fmt(stageVal)}</p>
                  </div>
                  <div className="space-y-2 mt-2">
                    {stageDeals.length === 0 && (
                      <div className="border-2 border-dashed border-gray-200 rounded-xl h-20 flex items-center justify-center">
                        <p className="text-xs text-gray-300">No deals</p>
                      </div>
                    )}
                    {stageDeals.map(d => (
                      <div key={d.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 hover:border-brand-200 hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => openTimeline(d)}>
                        <p className="text-sm font-semibold text-gray-800 leading-tight mb-1">{d.name}</p>
                        <p className="text-xs text-gray-500 mb-2">{d.clients?.name || '—'}</p>
                        {d.value_net && <p className="text-sm font-bold text-brand-600 mb-2">{fmt(d.value_net)}</p>}
                        {d.assigned_to && <p className="text-xs text-gray-400 mb-2">{d.assigned_to}</p>}
                        {/* Quick status move */}
                        <div className="flex gap-1 mt-2">
                          {(() => {
                            const idx = KANBAN_STAGES.indexOf(stage)
                            const buttons = []
                            if (idx > 0) buttons.push(
                              <button key="prev" onClick={e => { e.stopPropagation(); updateStatus(d.id, KANBAN_STAGES[idx-1]) }}
                                className="flex-1 text-[10px] bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 px-2 py-1 rounded-lg transition-colors truncate">
                                ← {KANBAN_STAGES[idx-1].split(' ')[0]}
                              </button>
                            )
                            if (idx < KANBAN_STAGES.length - 1) buttons.push(
                              <button key="next" onClick={e => { e.stopPropagation(); updateStatus(d.id, KANBAN_STAGES[idx+1]) }}
                                className="flex-1 text-[10px] bg-brand-50 border border-brand-200 text-brand-600 hover:bg-brand-100 px-2 py-1 rounded-lg transition-colors truncate">
                                {KANBAN_STAGES[idx+1].split(' ')[0]} →
                              </button>
                            )
                            return buttons
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TIMELINE DRAWER */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedDeal(null)} />
          <div className="relative bg-white w-full max-w-md shadow-2xl flex flex-col h-full overflow-hidden">
            {/* Drawer header */}
            <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{selectedDeal.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{selectedDeal.clients?.name || '—'} · {fmt(selectedDeal.value_net)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selectedDeal.status] || ''}`}>{selectedDeal.status}</span>
                  <button onClick={() => setSelectedDeal(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
                </div>
              </div>
              {selectedDeal.notes && <p className="text-xs text-gray-400 mt-2 line-clamp-2">{selectedDeal.notes}</p>}
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Activity Timeline</p>
              {tlLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : timeline.length === 0 ? (
                <div className="text-center py-12 text-gray-300">
                  <Clock size={28} className="mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No activity logged for this deal yet</p>
                  <p className="text-xs text-gray-300 mt-1">Add follow-ups or meeting logs in Pipeline</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />
                  <div className="space-y-5">
                    {timeline.map((item, i) => (
                      <div key={item.id} className="flex gap-4 relative">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${TL_ICON_COLORS[item.type] || 'bg-gray-100 text-gray-500'}`}>
                          {item._kind === 'followup' ? <Phone size={13} /> : <Calendar size={13} />}
                        </div>
                        <div className="flex-1 min-w-0 bg-gray-50 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-700">{item.type}</span>
                            <span className="text-xs text-gray-400">{item._date}</span>
                          </div>
                          {item._kind === 'followup' ? (
                            <>
                              <p className="text-sm text-gray-700">{item.notes}</p>
                              {item.next_action && <p className="text-xs text-brand-600 mt-1.5">→ {item.next_action}</p>}
                              {item.status && (
                                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1.5 ${item.status === 'Done' ? 'bg-green-100 text-green-700' : item.status === 'Overdue' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {item.status}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-gray-700 font-medium">{item.outcome}</p>
                              {item.notes && <p className="text-xs text-gray-500 mt-1">{item.notes}</p>}
                              {item.next_steps && <p className="text-xs text-brand-600 mt-1.5">Next: {item.next_steps}</p>}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Deal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">New Deal</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={saveDeal} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Deal Name *</label>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Nestle Maggi — Drama Sponsorship Q3" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">RO Number</label>
                  <input value={form.ro_number} onChange={e => setForm({...form, ro_number: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. RO/CC-00699/42758" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
                  <select value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Select...</option>
                    {['Aamish Mirza','Sarfaraz','Talal','Asif','Erum','Ans','Meesum'].map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Client</label>
                  <select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Deal Type *</label>
                  <select required value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {DEAL_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Platform / Channel</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CHANNELS.map(c => (
                      <button type="button" key={c}
                        onClick={() => setForm(f => ({ ...f, channel: f.channel.includes(c) ? f.channel.filter(x => x !== c) : [...f.channel, c] }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.channel.includes(c) ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                  {form.channel.includes('Special Project') && (
                    <input value={form.special_project_name} onChange={e => setForm({...form, special_project_name: e.target.value})}
                      className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Project name (e.g. Spelling Whizz)" />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tier</label>
                  <select value={form.tier} onChange={e => setForm({...form, tier: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">None</option>
                    {TIERS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Value Net (PKR) *</label>
                  <input required type="number" value={form.value_net} onChange={e => setForm({...form, value_net: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0" />
                  {form.value_net && <p className="text-xs text-gray-400 mt-1">GST: ₨{(form.value_net*0.18).toLocaleString()} · Gross: ₨{(form.value_net*1.18).toLocaleString()}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Agency Commission %</label>
                  <input type="number" value={form.agency_commission_pct} onChange={e => setForm({...form, agency_commission_pct: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-60">{saving ? 'Saving...' : 'Create Deal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
