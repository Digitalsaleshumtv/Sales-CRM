import { useEffect, useState } from 'react'
import { Plus, X, Play, Pencil, Trash2, Check, FileDown, Briefcase } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { exportProgramPPT } from '../../lib/programPPT'

const CHANNELS   = ['HUM TV', 'Masala TV', 'HUM News', 'HUM Network']
const STATUSES   = ['Live', 'Upcoming', 'Completed', 'On Break']
const CATEGORIES = ['Drama', 'Web Series', 'Website Banners', 'Social Media Posts', 'BCW', 'HUM Masala', 'Spelling Whizz', 'Women Leaders Awards', 'HUM Awards']

const ANNUAL_EVENTS = [
  { label: 'BCW',                  category: 'BCW'                  },
  { label: 'HUM Awards',           category: 'HUM Awards'           },
  { label: 'Masala Family Festival',category: 'HUM Masala'          },
  { label: 'Women Leaders Awards', category: 'Women Leaders Awards' },
  { label: 'HUM Spelling Whizz',   category: 'Spelling Whizz'      },
]

const STATUS_COLORS = {
  Live:       'bg-green-100 text-green-700',
  Upcoming:   'bg-blue-100 text-blue-700',
  Completed:  'bg-gray-100 text-gray-500',
  'On Break': 'bg-yellow-100 text-yellow-700',
}

const CATEGORY_COLORS = {
  Drama:                 'bg-purple-100 text-purple-700',
  'Web Series':          'bg-indigo-100 text-indigo-700',
  'Website Banners':     'bg-cyan-100 text-cyan-700',
  'Social Media Posts':  'bg-pink-100 text-pink-700',
  BCW:                   'bg-red-100 text-red-700',
  'HUM Masala':          'bg-orange-100 text-orange-700',
  'Spelling Whizz':      'bg-yellow-100 text-yellow-800',
  'Women Leaders Awards':'bg-rose-100 text-rose-700',
  'HUM Awards':          'bg-brand-100 text-brand-700',
}

const SPONSOR_SLOTS = [
  { label: 'Presented By',   brandKey: 'presenting_client_id',  agencyKey: 'presenting_agency_id',  brandRef: 'presenting',  agencyRef: 'presenting_agency'  },
  { label: 'Powered By',     brandKey: 'powered_client_id',     agencyKey: 'powered_agency_id',     brandRef: 'powered',     agencyRef: 'powered_agency'     },
  { label: 'Associated By',  brandKey: 'associated_client_id',  agencyKey: 'associated_agency_id',  brandRef: 'associated',  agencyRef: 'associated_agency'  },
]

function defaultForm() {
  return {
    name: '', channel: 'HUM TV', category: 'Drama', schedule: '',
    status: 'Live', start_date: '', end_date: '',
    youtube_upload: false, episode_count: '', paid_drama_budget: '',
    presenting_client_id: '', presenting_agency_id: '',
    powered_client_id: '',    powered_agency_id: '',
    associated_client_id: '', associated_agency_id: '',
  }
}

export default function Shows() {
  const navigate = useNavigate()
  const [shows, setShows]               = useState([])
  const [brands, setBrands]             = useState([])
  const [agencies, setAgencies]         = useState([])
  const [dealCounts, setDealCounts]     = useState({})
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [saving, setSaving]             = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCat, setFilterCat]       = useState('all')
  const [form, setForm]                 = useState(defaultForm())
  const [editingId, setEditingId]       = useState(null)
  const [sponsorDraft, setSponsorDraft] = useState({})
  const [deletingId, setDeletingId]     = useState(null)

  useEffect(() => {
    fetchAll()
    supabase.from('clients').select('id,name,type').eq('status','active').order('name')
      .then(({ data }) => {
        const all = data || []
        setBrands(all.filter(c => c.type === 'brand'))
        setAgencies(all.filter(c => c.type === 'agency'))
      })
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: showsData }, { data: dealsData }] = await Promise.all([
      supabase.from('shows').select(`
        *,
        presenting:presenting_client_id(id,name),
        presenting_agency:presenting_agency_id(id,name),
        powered:powered_client_id(id,name),
        powered_agency:powered_agency_id(id,name),
        associated:associated_client_id(id,name),
        associated_agency:associated_agency_id(id,name)
      `).order('created_at', { ascending: false }),
      supabase.from('deals').select('id,program_id,value_net,status,name,clients(name)').not('program_id','is',null),
    ])
    setShows(showsData || [])
    // Build deal counts per program
    const counts = {}
    ;(dealsData || []).forEach(d => {
      if (!counts[d.program_id]) counts[d.program_id] = { count: 0, total: 0, deals: [] }
      counts[d.program_id].count++
      counts[d.program_id].total += (d.value_net || 0)
      counts[d.program_id].deals.push(d)
    })
    setDealCounts(counts)
    setLoading(false)
  }

  async function saveShow(e) {
    e.preventDefault(); setSaving(true)
    const payload = {
      ...form,
      episode_count:       form.episode_count       ? Number(form.episode_count)       : null,
      paid_drama_budget:   form.paid_drama_budget   ? Number(form.paid_drama_budget)   : null,
      start_date:          form.start_date           || null,
      end_date:            form.end_date             || null,
      presenting_client_id:  form.presenting_client_id  || null,
      presenting_agency_id:  form.presenting_agency_id  || null,
      powered_client_id:     form.powered_client_id     || null,
      powered_agency_id:     form.powered_agency_id     || null,
      associated_client_id:  form.associated_client_id  || null,
      associated_agency_id:  form.associated_agency_id  || null,
    }
    const { error } = await supabase.from('shows').insert([payload])
    if (!error) { setShowModal(false); setForm(defaultForm()); fetchAll() }
    else alert(error.message)
    setSaving(false)
  }

  function startEditSponsors(show) {
    setEditingId(show.id)
    setSponsorDraft({
      presenting_client_id:  show.presenting_client_id  || '',
      presenting_agency_id:  show.presenting_agency_id  || '',
      powered_client_id:     show.powered_client_id     || '',
      powered_agency_id:     show.powered_agency_id     || '',
      associated_client_id:  show.associated_client_id  || '',
      associated_agency_id:  show.associated_agency_id  || '',
    })
  }

  async function saveSponsors(showId) {
    setSaving(true)
    const patch = {}
    Object.entries(sponsorDraft).forEach(([k, v]) => { patch[k] = v || null })
    const { error } = await supabase.from('shows').update(patch).eq('id', showId)
    if (!error) { setEditingId(null); fetchAll() }
    else alert(error.message)
    setSaving(false)
  }

  async function deleteShow(id) {
    const { error } = await supabase.from('shows').delete().eq('id', id)
    if (!error) { setDeletingId(null); fetchAll() }
    else alert(error.message)
  }

  function handleEventClick(category) {
    setFilterCat(prev => prev === category ? 'all' : category)
    setFilterStatus('all')
  }

  function handlePPT(show) {
    const linked = dealCounts[show.id]?.deals || []
    exportProgramPPT(show, linked)
  }

  const filtered = shows.filter(s => {
    const matchStatus = filterStatus === 'all' || s.status === filterStatus
    const matchCat    = filterCat === 'all'    || s.category === filterCat
    return matchStatus && matchCat
  })

  const live     = shows.filter(s => s.status === 'Live').length
  const upcoming = shows.filter(s => s.status === 'Upcoming').length

  function fmt(n) {
    if (!n) return '—'
    if (n >= 10_000_000) return `₨${(n/10_000_000).toFixed(1)}Cr`
    if (n >= 100_000)    return `₨${(n/100_000).toFixed(1)}L`
    return `₨${Number(n).toLocaleString()}`
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programs & Events</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="text-green-600 font-medium">{live} Live</span>
            <span className="mx-2 text-gray-300">·</span>
            <span className="text-blue-600 font-medium">{upcoming} Upcoming</span>
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
          <Plus size={16} /> Add Program
        </button>
      </div>

      {/* Annual Events — clickable */}
      <div className="bg-gradient-to-r from-brand-500 to-brand-700 rounded-xl p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-75 mb-3">Annual Events — click to filter</p>
        <div className="flex flex-wrap gap-2">
          {ANNUAL_EVENTS.map(ev => {
            const isActive = filterCat === ev.category
            return (
              <button
                key={ev.label}
                onClick={() => handleEventClick(ev.category)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  isActive
                    ? 'bg-white text-brand-700 border-white shadow-lg scale-105'
                    : 'bg-white/20 border-white/30 text-white hover:bg-white/30'
                }`}
              >
                {ev.label}
                {ev.label === 'HUM Spelling Whizz' && (
                  <span className="ml-1.5 text-[10px] bg-green-400 text-white px-1.5 py-0.5 rounded-full font-bold">LIVE</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filters row */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-gray-400 font-medium">Status:</span>
        {['all', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterStatus===s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
        <span className="ml-2 text-xs text-gray-400 font-medium">Type:</span>
        <button onClick={() => setFilterCat('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterCat==='all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
          All
        </button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilterCat(prev => prev===c ? 'all' : c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterCat===c ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <p className="text-lg">No programs found</p>
          <p className="text-sm mt-1">
            {filterCat !== 'all' || filterStatus !== 'all' ? 'Try clearing the filters' : 'Add your first program using the button above'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(show => {
            const linked = dealCounts[show.id]
            return (
              <div key={show.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 leading-tight">{show.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{show.channel} · {show.schedule || 'Schedule TBD'}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[show.status]}`}>{show.status}</span>
                    <button onClick={() => handlePPT(show)} className="p-1 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors" title="Export PPT">
                      <FileDown size={13} />
                    </button>
                    <button onClick={() => startEditSponsors(show)} className="p-1 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors" title="Edit sponsors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeletingId(show.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Category + date range */}
                <div className="flex items-center gap-2 flex-wrap">
                  {show.category && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${CATEGORY_COLORS[show.category] || 'bg-gray-100 text-gray-500'}`}>
                      {show.category}
                    </span>
                  )}
                  {(show.start_date || show.end_date) && (
                    <span className="text-[11px] text-gray-400">
                      📅 {show.start_date || '?'} → {show.end_date || 'Ongoing'}
                    </span>
                  )}
                </div>

                {/* Sponsor slots — view mode */}
                {editingId !== show.id && (
                  <div className="space-y-1.5">
                    {SPONSOR_SLOTS.map(slot => {
                      const brand  = show[slot.brandRef]
                      const agency = show[slot.agencyRef]
                      return (
                        <div key={slot.label} className="flex items-center justify-between text-xs">
                          <span className="text-gray-400 w-24 flex-shrink-0">{slot.label}</span>
                          {brand ? (
                            <div className="flex items-center gap-1 flex-wrap justify-end">
                              <span className="text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">{brand.name}</span>
                              {agency && <span className="text-gray-400 text-[10px]">via <span className="text-blue-600 font-medium">{agency.name}</span></span>}
                            </div>
                          ) : (
                            <span className="text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">Open</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Sponsor edit mode */}
                {editingId === show.id && (
                  <div className="space-y-3 bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Edit Sponsors</p>
                    {SPONSOR_SLOTS.map(slot => (
                      <div key={slot.label}>
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">{slot.label}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={sponsorDraft[slot.brandKey] || ''}
                            onChange={e => setSponsorDraft(d => ({...d, [slot.brandKey]: e.target.value}))}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                          >
                            <option value="">— Brand (Open) —</option>
                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                          <select
                            value={sponsorDraft[slot.agencyKey] || ''}
                            onChange={e => setSponsorDraft(d => ({...d, [slot.agencyKey]: e.target.value}))}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                          >
                            <option value="">— Agency (Direct) —</option>
                            {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditingId(null)} className="flex-1 border border-gray-200 text-gray-600 py-1.5 rounded-lg text-xs font-medium hover:bg-white">Cancel</button>
                      <button onClick={() => saveSponsors(show.id)} disabled={saving} className="flex-1 bg-brand-500 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-brand-600 flex items-center justify-center gap-1 disabled:opacity-60">
                        <Check size={12} /> Save
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-xs">
                  <div className="flex items-center gap-2 text-gray-400">
                    {show.episode_count && <span>{show.episode_count} eps</span>}
                    {show.youtube_upload && <span className="flex items-center gap-1 text-red-500"><Play size={11} /> YouTube</span>}
                  </div>
                  {linked ? (
                    <button
                      onClick={() => navigate('/crm/deals')}
                      className="flex items-center gap-1 text-brand-600 font-medium hover:underline"
                    >
                      <Briefcase size={11} />
                      {linked.count} deal{linked.count > 1 ? 's' : ''} · {fmt(linked.total)}
                    </button>
                  ) : (
                    <span className="text-gray-300 text-[10px]">No linked deals</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Program Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Add Program / Event</h2>
              <button onClick={() => { setShowModal(false); setForm(defaultForm()) }} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={saveShow} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Program Name *</label>
                  <input required value={form.name} onChange={e => setForm({...form,name:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Aye Dil Aazma Nahin" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
                  <select value={form.channel} onChange={e => setForm({...form,channel:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {CHANNELS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({...form,category:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form,status:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Air Schedule</label>
                  <input value={form.schedule} onChange={e => setForm({...form,schedule:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Mon–Tue 8:00 PM" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({...form,start_date:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({...form,end_date:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>

                {/* Sponsor slots */}
                {SPONSOR_SLOTS.map(slot => (
                  <div key={slot.label} className="col-span-2 space-y-2 pt-1 border-t border-gray-100">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide pt-1">{slot.label}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Brand</label>
                        <select value={form[slot.brandKey]} onChange={e => setForm({...form,[slot.brandKey]:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                          <option value="">— Open slot —</option>
                          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Via Agency</label>
                        <select value={form[slot.agencyKey]} onChange={e => setForm({...form,[slot.agencyKey]:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                          <option value="">— Direct —</option>
                          {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Episode Count</label>
                  <input type="number" value={form.episode_count} onChange={e => setForm({...form,episode_count:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. 26" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Paid Drama Budget (PKR)</label>
                  <input type="number" value={form.paid_drama_budget} onChange={e => setForm({...form,paid_drama_budget:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0" />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="yt" checked={form.youtube_upload} onChange={e => setForm({...form,youtube_upload:e.target.checked})} className="rounded" />
                  <label htmlFor="yt" className="text-sm text-gray-700 flex items-center gap-1"><Play size={14} className="text-red-500" /> Uploaded to YouTube</label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setForm(defaultForm()) }} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-60">{saving ? 'Saving...' : 'Add Program'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h2 className="font-semibold text-gray-900 mb-1">Delete Program?</h2>
            <p className="text-sm text-gray-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={() => deleteShow(deletingId)} className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
