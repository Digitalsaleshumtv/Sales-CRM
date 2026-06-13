import { useEffect, useState } from 'react'
import { Plus, X, Play, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const CHANNELS = ['HUM TV', 'Masala TV', 'HUM News', 'HUM Network']
const STATUSES = ['Live', 'Upcoming', 'Completed', 'On Break']
const ANNUAL_EVENTS = ['BCW', 'HUM Awards', 'Masala Family Festival', 'Women Leaders Awards', 'HUM Spelling Whizz']

const STATUS_COLORS = {
  Live:      'bg-green-100 text-green-700',
  Upcoming:  'bg-blue-100 text-blue-700',
  Completed: 'bg-gray-100 text-gray-500',
  'On Break':'bg-yellow-100 text-yellow-700',
}

export default function Shows() {
  const [shows, setShows] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [form, setForm] = useState(defaultForm())

  function defaultForm() {
    return { name: '', channel: 'HUM TV', schedule: '', status: 'Live', youtube_upload: false, episode_count: '', paid_drama_budget: '', presenting_client_id: '', powered_client_id: '', associated_client_id: '' }
  }

  useEffect(() => {
    fetchShows()
    supabase.from('clients').select('id,name').eq('status','active').order('name').then(({data}) => setClients(data||[]))
  }, [])

  async function fetchShows() {
    setLoading(true)
    const { data } = await supabase.from('shows').select(`
      *,
      presenting:presenting_client_id(name),
      powered:powered_client_id(name),
      associated:associated_client_id(name)
    `).order('created_at', { ascending: false })
    setShows(data || [])
    setLoading(false)
  }

  async function saveShow(e) {
    e.preventDefault(); setSaving(true)
    const payload = {
      ...form,
      episode_count: form.episode_count ? Number(form.episode_count) : null,
      paid_drama_budget: form.paid_drama_budget ? Number(form.paid_drama_budget) : null,
      presenting_client_id: form.presenting_client_id || null,
      powered_client_id: form.powered_client_id || null,
      associated_client_id: form.associated_client_id || null,
    }
    const { error } = await supabase.from('shows').insert([payload])
    if (!error) { setShowModal(false); setForm(defaultForm()); fetchShows() }
    else alert(error.message)
    setSaving(false)
  }

  const filtered = shows.filter(s => filterStatus === 'all' || s.status === filterStatus)
  const live = shows.filter(s => s.status === 'Live').length
  const upcoming = shows.filter(s => s.status === 'Upcoming').length

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Shows & Events</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="text-green-600 font-medium">{live} Live</span>
            <span className="mx-2 text-gray-300">·</span>
            <span className="text-blue-600 font-medium">{upcoming} Upcoming</span>
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
          <Plus size={16} /> Add Show / Event
        </button>
      </div>

      {/* Annual Events banner */}
      <div className="bg-gradient-to-r from-brand-500 to-brand-700 rounded-xl p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-75 mb-2">Annual Events</p>
        <div className="flex flex-wrap gap-2">
          {ANNUAL_EVENTS.map(e => (
            <span key={e} className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">{e}</span>
          ))}
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {['all', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterStatus===s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <p className="text-lg">No shows yet</p>
          <p className="text-sm mt-1">Add your first drama or event using the button above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(show => (
            <div key={show.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{show.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{show.channel} · {show.schedule || 'Schedule TBD'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[show.status]}`}>{show.status}</span>
              </div>

              {/* Sponsor slots */}
              <div className="space-y-1.5">
                {[
                  { label: 'Presenting', client: show.presenting },
                  { label: 'Powered By', client: show.powered },
                  { label: 'Associated By', client: show.associated },
                ].map(slot => (
                  <div key={slot.label} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 w-24">{slot.label}</span>
                    {slot.client ? (
                      <span className="text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">{slot.client.name}</span>
                    ) : (
                      <span className="text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">Open</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-xs text-gray-400">
                <span>{show.episode_count ? `${show.episode_count} episodes` : ''}</span>
                <div className="flex items-center gap-2">
                  {show.youtube_upload && <span className="flex items-center gap-1 text-red-500"><Play size={12} /> YouTube</span>}
                  {show.paid_drama_budget && <span>Budget: ₨{Number(show.paid_drama_budget).toLocaleString()}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Show Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Add Show / Event</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={saveShow} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Show / Event Name *</label>
                  <input required value={form.name} onChange={e => setForm({...form,name:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Aye Dil Aazma Nahin" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
                  <select value={form.channel} onChange={e => setForm({...form,channel:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {CHANNELS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form,status:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Air Schedule</label>
                  <input value={form.schedule} onChange={e => setForm({...form,schedule:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Mon–Tue 8:00 PM" />
                </div>
                {[
                  {label:'Presenting Partner', key:'presenting_client_id'},
                  {label:'Powered By', key:'powered_client_id'},
                  {label:'Associated By', key:'associated_client_id'},
                ].map(slot => (
                  <div key={slot.key} className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">{slot.label} <span className="text-gray-400">(sponsor)</span></label>
                    <select value={form[slot.key]} onChange={e => setForm({...form,[slot.key]:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                      <option value="">— Open slot —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
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
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-60">{saving ? 'Saving...' : 'Add Show'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
