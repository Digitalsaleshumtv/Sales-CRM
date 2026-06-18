import { useEffect, useState } from 'react'
import { Plus, X, Play, Pencil, Trash2, Check, FileDown, Briefcase, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { exportProgramPPT } from '../../lib/programPPT'

const CHANNELS   = ['HUM TV', 'Masala TV', 'HUM News', 'HUM Network']
const STATUSES   = ['Live', 'Upcoming', 'Completed', 'On Break']
const CATEGORIES = ['Drama', 'Web Series', 'Website Banners', 'Social Media Posts', 'BCW', 'HUM Masala', 'Spelling Whizz', 'Women Leaders Awards', 'HUM Awards']

const ANNUAL_EVENTS = [
  { label: 'BCW',                    category: 'BCW'                  },
  { label: 'HUM Awards',             category: 'HUM Awards'           },
  { label: 'Masala Family Festival',  category: 'HUM Masala'          },
  { label: 'Women Leaders Awards',   category: 'Women Leaders Awards' },
  { label: 'HUM Spelling Whizz',     category: 'Spelling Whizz'       },
]

const STATUS_COLORS = {
  Live:       'bg-green-100 text-green-700',
  Upcoming:   'bg-blue-100 text-blue-700',
  Completed:  'bg-gray-100 text-gray-500',
  'On Break': 'bg-yellow-100 text-yellow-700',
}

const CATEGORY_COLORS = {
  Drama:                  'bg-purple-100 text-purple-700',
  'Web Series':           'bg-indigo-100 text-indigo-700',
  'Website Banners':      'bg-cyan-100 text-cyan-700',
  'Social Media Posts':   'bg-pink-100 text-pink-700',
  BCW:                    'bg-red-100 text-red-700',
  'HUM Masala':           'bg-orange-100 text-orange-700',
  'Spelling Whizz':       'bg-yellow-100 text-yellow-800',
  'Women Leaders Awards': 'bg-rose-100 text-rose-700',
  'HUM Awards':           'bg-brand-100 text-brand-700',
}

function emptyRow() {
  return { sponsor_label: '', client_id: '', sponsor_name: '', logo_url: '', _logoFile: null, _tmpUrl: '' }
}

function SponsorRow({ idx, row, clients, onChange, onRemove }) {
  const previewUrl = row._tmpUrl || row.logo_url
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <input
          placeholder="Sponsor type (e.g. Knowledge Partner, Title Sponsor)"
          value={row.sponsor_label}
          onChange={e => onChange(idx, 'sponsor_label', e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button type="button" onClick={() => onRemove(idx)} className="p-1 text-red-400 hover:text-red-600 flex-shrink-0">
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={row.client_id || ''}
          onChange={e => onChange(idx, 'client_id', e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">— From Clients list —</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          placeholder="Or type name manually"
          value={row.sponsor_name || ''}
          onChange={e => onChange(idx, 'sponsor_name', e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div className="flex items-center gap-3">
        {previewUrl ? (
          <img src={previewUrl} alt="logo" className="h-10 w-24 object-contain rounded-lg border border-gray-200 bg-gray-50 p-1" />
        ) : (
          <div className="h-10 w-24 bg-gray-50 border border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <span className="text-[10px] text-gray-400">No logo</span>
          </div>
        )}
        <label className="cursor-pointer flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium">
          <Upload size={12} />
          {previewUrl ? 'Change logo' : 'Upload logo'}
          <input type="file" className="hidden" accept="image/*"
            onChange={e => {
              const file = e.target.files[0]
              if (!file) return
              onChange(idx, '_logoFile', file)
              onChange(idx, '_tmpUrl', URL.createObjectURL(file))
            }}
          />
        </label>
        {previewUrl && (
          <button type="button"
            onClick={() => { onChange(idx, '_logoFile', null); onChange(idx, '_tmpUrl', ''); onChange(idx, 'logo_url', '') }}
            className="text-[10px] text-red-400 hover:text-red-600">Remove</button>
        )}
      </div>
    </div>
  )
}

function defaultForm() {
  return {
    name: '', channel: 'HUM TV', category: 'Drama', schedule: '',
    status: 'Live', start_date: '', end_date: '',
    youtube_upload: false, episode_count: '', paid_drama_budget: '',
  }
}

async function uploadLogo(showId, idx, file) {
  const ext  = file.name.split('.').pop().toLowerCase()
  const path = `${showId}/${idx}_${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('program-logos').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('program-logos').getPublicUrl(path)
  return data.publicUrl
}

async function resolveSponsors(showId, rows) {
  const out = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r.sponsor_label.trim()) continue
    let logo_url = r.logo_url
    if (r._logoFile) {
      try { logo_url = await uploadLogo(showId, i, r._logoFile) } catch (e) { console.error('Logo upload failed:', e) }
    }
    out.push({
      show_id:       showId,
      sponsor_label: r.sponsor_label,
      client_id:     r.client_id  || null,
      sponsor_name:  r.sponsor_name || null,
      logo_url:      logo_url     || null,
      sort_order:    i,
    })
  }
  return out
}

export default function Shows() {
  const navigate = useNavigate()
  const [shows, setShows]                  = useState([])
  const [sponsorsByShow, setSponsorsByShow] = useState({})
  const [clients, setClients]              = useState([])
  const [dealCounts, setDealCounts]        = useState({})
  const [loading, setLoading]              = useState(true)
  const [showModal, setShowModal]          = useState(false)
  const [saving, setSaving]                = useState(false)
  const [filterStatus, setFilterStatus]    = useState('all')
  const [filterCat, setFilterCat]          = useState('all')
  const [form, setForm]                    = useState(defaultForm())
  const [formSponsors, setFormSponsors]    = useState([emptyRow()])
  const [editingId, setEditingId]          = useState(null)
  const [editSponsors, setEditSponsors]    = useState([])
  const [deletingId, setDeletingId]        = useState(null)

  useEffect(() => {
    fetchAll()
    supabase.from('clients').select('id,name,type').eq('status','active').order('name')
      .then(({ data }) => setClients(data || []))
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: showsData }, { data: sponsorsData }, { data: dealsData }] = await Promise.all([
      supabase.from('shows').select('*').order('created_at', { ascending: false }),
      supabase.from('show_sponsors').select('*, client:client_id(id,name)').order('sort_order'),
      supabase.from('deals').select('id,program_id,value_net,status,name,clients(name)').not('program_id','is',null),
    ])
    setShows(showsData || [])

    const byShow = {}
    ;(sponsorsData || []).forEach(s => {
      if (!byShow[s.show_id]) byShow[s.show_id] = []
      byShow[s.show_id].push(s)
    })
    setSponsorsByShow(byShow)

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

  function updateRow(setter, idx, key, val) {
    setter(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r))
  }

  async function saveShow(e) {
    e.preventDefault(); setSaving(true)
    const payload = {
      ...form,
      episode_count:     form.episode_count     ? Number(form.episode_count)     : null,
      paid_drama_budget: form.paid_drama_budget ? Number(form.paid_drama_budget) : null,
      start_date:        form.start_date        || null,
      end_date:          form.end_date          || null,
    }
    const { data, error } = await supabase.from('shows').insert([payload]).select().single()
    if (error) { alert(error.message); setSaving(false); return }

    const resolved = await resolveSponsors(data.id, formSponsors)
    if (resolved.length > 0) await supabase.from('show_sponsors').insert(resolved)

    setShowModal(false); setForm(defaultForm()); setFormSponsors([emptyRow()]); fetchAll()
    setSaving(false)
  }

  function startEditSponsors(show) {
    const existing = (sponsorsByShow[show.id] || []).map(s => ({
      id:            s.id,
      sponsor_label: s.sponsor_label,
      client_id:     s.client_id    || '',
      sponsor_name:  s.sponsor_name || '',
      logo_url:      s.logo_url     || '',
      _logoFile:     null,
      _tmpUrl:       '',
    }))
    setEditSponsors(existing.length ? existing : [emptyRow()])
    setEditingId(show.id)
  }

  async function saveEditSponsors(showId) {
    setSaving(true)
    await supabase.from('show_sponsors').delete().eq('show_id', showId)
    const resolved = await resolveSponsors(showId, editSponsors)
    if (resolved.length > 0) await supabase.from('show_sponsors').insert(resolved)
    setEditingId(null); fetchAll()
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

  async function handlePPT(show) {
    const linked      = dealCounts[show.id]?.deals || []
    const sponsorList = sponsorsByShow[show.id]    || []
    await exportProgramPPT(show, linked, sponsorList)
  }

  const filtered = shows.filter(s => {
    const ok1 = filterStatus === 'all' || s.status   === filterStatus
    const ok2 = filterCat    === 'all' || s.category === filterCat
    return ok1 && ok2
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

      {/* Annual Events banner */}
      <div className="bg-gradient-to-r from-brand-500 to-brand-700 rounded-xl p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-75 mb-3">Annual Events — click to filter</p>
        <div className="flex flex-wrap gap-2">
          {ANNUAL_EVENTS.map(ev => {
            const isActive = filterCat === ev.category
            return (
              <button key={ev.label} onClick={() => handleEventClick(ev.category)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${isActive ? 'bg-white text-brand-700 border-white shadow-lg scale-105' : 'bg-white/20 border-white/30 text-white hover:bg-white/30'}`}>
                {ev.label}
                {ev.label === 'HUM Spelling Whizz' && (
                  <span className="ml-1.5 text-[10px] bg-green-400 text-white px-1.5 py-0.5 rounded-full font-bold">LIVE</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filters */}
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
          <p className="text-sm mt-1">{filterCat !== 'all' || filterStatus !== 'all' ? 'Try clearing the filters' : 'Add your first program above'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(show => {
            const linked   = dealCounts[show.id]
            const sponsors = sponsorsByShow[show.id] || []
            return (
              <div key={show.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 leading-tight">{show.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{show.channel} · {show.schedule || 'Schedule TBD'}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[show.status]}`}>{show.status}</span>
                    <button onClick={() => handlePPT(show)} className="p-1 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg" title="Export PPT"><FileDown size={13} /></button>
                    <button onClick={() => startEditSponsors(show)} className="p-1 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg" title="Edit sponsors"><Pencil size={13} /></button>
                    <button onClick={() => setDeletingId(show.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {show.category && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${CATEGORY_COLORS[show.category] || 'bg-gray-100 text-gray-500'}`}>
                      {show.category}
                    </span>
                  )}
                  {(show.start_date || show.end_date) && (
                    <span className="text-[11px] text-gray-400">📅 {show.start_date || '?'} → {show.end_date || 'Ongoing'}</span>
                  )}
                </div>

                {/* Sponsors — view */}
                {editingId !== show.id && (
                  <div className="space-y-1.5">
                    {sponsors.length === 0 ? (
                      <p className="text-[11px] text-orange-400 italic">No sponsors — click ✏️ to add</p>
                    ) : sponsors.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-xs gap-2">
                        <span className="text-gray-400 text-[11px] w-32 flex-shrink-0 truncate">{s.sponsor_label}</span>
                        <div className="flex items-center gap-1.5 justify-end flex-1 min-w-0">
                          {s.logo_url && <img src={s.logo_url} alt="" className="h-5 w-auto object-contain max-w-[44px] rounded" />}
                          <span className="font-medium text-gray-800 truncate">
                            {s.client?.name || s.sponsor_name || <span className="text-orange-400 font-normal">Open</span>}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sponsors — edit */}
                {editingId === show.id && (
                  <div className="space-y-2 bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sponsorship</p>
                    {editSponsors.map((row, idx) => (
                      <SponsorRow key={idx} idx={idx} row={row} clients={clients}
                        onChange={(i, k, v) => updateRow(setEditSponsors, i, k, v)}
                        onRemove={i => setEditSponsors(p => p.filter((_, j) => j !== i))}
                      />
                    ))}
                    <button type="button" onClick={() => setEditSponsors(p => [...p, emptyRow()])}
                      className="w-full border border-dashed border-gray-300 text-gray-500 py-1.5 rounded-lg text-xs hover:bg-white flex items-center justify-center gap-1">
                      <Plus size={12} /> Add Sponsor Slot
                    </button>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditingId(null)} className="flex-1 border border-gray-200 text-gray-600 py-1.5 rounded-lg text-xs font-medium hover:bg-white">Cancel</button>
                      <button onClick={() => saveEditSponsors(show.id)} disabled={saving}
                        className="flex-1 bg-brand-500 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-brand-600 flex items-center justify-center gap-1 disabled:opacity-60">
                        <Check size={12} /> {saving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-xs">
                  <div className="flex items-center gap-2 text-gray-400">
                    {show.episode_count && <span>{show.episode_count} eps</span>}
                    {show.youtube_upload && <span className="flex items-center gap-1 text-red-500"><Play size={11} /> YouTube</span>}
                  </div>
                  {linked ? (
                    <button onClick={() => navigate('/crm/deals')} className="flex items-center gap-1 text-brand-600 font-medium hover:underline">
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
              <button onClick={() => { setShowModal(false); setForm(defaultForm()); setFormSponsors([emptyRow()]) }} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={saveShow} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Program Name *</label>
                  <input required value={form.name} onChange={e => setForm({...form,name:e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g. HUM Spelling Whizz 2026" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
                  <select value={form.channel} onChange={e => setForm({...form,channel:e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {CHANNELS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({...form,category:e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form,status:e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Air Schedule</label>
                  <input value={form.schedule} onChange={e => setForm({...form,schedule:e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g. Mon–Tue 8:00 PM" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({...form,start_date:e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({...form,end_date:e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Episode Count</label>
                  <input type="number" value={form.episode_count} onChange={e => setForm({...form,episode_count:e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. 26" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Paid Drama Budget (PKR)</label>
                  <input type="number" value={form.paid_drama_budget} onChange={e => setForm({...form,paid_drama_budget:e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0" />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="yt" checked={form.youtube_upload} onChange={e => setForm({...form,youtube_upload:e.target.checked})} className="rounded" />
                  <label htmlFor="yt" className="text-sm text-gray-700 flex items-center gap-1"><Play size={14} className="text-red-500" /> Uploaded to YouTube</label>
                </div>
              </div>

              {/* Sponsor slots */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Sponsorship</p>
                  <button type="button" onClick={() => setFormSponsors(p => [...p, emptyRow()])}
                    className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
                    <Plus size={12} /> Add Slot
                  </button>
                </div>
                <div className="space-y-2">
                  {formSponsors.map((row, idx) => (
                    <SponsorRow key={idx} idx={idx} row={row} clients={clients}
                      onChange={(i, k, v) => updateRow(setFormSponsors, i, k, v)}
                      onRemove={i => setFormSponsors(p => p.filter((_, j) => j !== i))}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setForm(defaultForm()); setFormSponsors([emptyRow()]) }}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-60">
                  {saving ? 'Saving...' : 'Add Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h2 className="font-semibold text-gray-900 mb-1">Delete Program?</h2>
            <p className="text-sm text-gray-500 mb-5">This cannot be undone. All sponsor data will also be removed.</p>
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
