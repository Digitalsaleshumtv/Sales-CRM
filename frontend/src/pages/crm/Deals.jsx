import { useEffect, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const DEAL_TYPES = ['Drama Sponsorship','Social Media Posts','Website Banners','Exclusive Content','Product Integration','Drama Integration','Podcast','Webseries','Event Sponsorship','Branded Content Package']
const CHANNELS = ['HUM TV','Masala TV','HUM News','HUM Network']
const STATUSES = ['Prospecting','Pitch Sent','In Negotiation','Under Process','Locked','RO Received','Billed','Sent to Finance','Completed','Cancelled']
const TIERS = ['Presenting','Powered By','Associated']

const STATUS_COLORS = {
  Prospecting: 'bg-gray-100 text-gray-600',
  'Pitch Sent': 'bg-blue-100 text-blue-700',
  'In Negotiation': 'bg-yellow-100 text-yellow-700',
  'Under Process': 'bg-orange-100 text-orange-700',
  Locked: 'bg-purple-100 text-purple-700',
  'RO Received': 'bg-indigo-100 text-indigo-700',
  Billed: 'bg-green-100 text-green-700',
  'Sent to Finance': 'bg-teal-100 text-teal-700',
  Completed: 'bg-green-200 text-green-800',
  Cancelled: 'bg-red-100 text-red-600',
}

function fmt(n) {
  if (!n) return '—'
  if (n >= 10000000) return `₨${(n/10000000).toFixed(1)}Cr`
  if (n >= 100000) return `₨${(n/100000).toFixed(1)}L`
  return `₨${Number(n).toLocaleString()}`
}

export default function Deals() {
  const [deals, setDeals] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(defaultForm())

  function defaultForm() {
    return { name: '', type: DEAL_TYPES[0], client_id: '', channel: [], tier: '', start_date: '', end_date: '', value_net: '', status: 'Prospecting', notes: '', agency_commission_pct: 15 }
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
    const payload = { ...form, value_net: form.value_net ? Number(form.value_net) : null, agency_commission_pct: Number(form.agency_commission_pct) }
    const { error } = await supabase.from('deals').insert([payload])
    if (!error) { setShowModal(false); setForm(defaultForm()); fetchDeals() }
    else alert('Error: ' + error.message)
    setSaving(false)
  }

  const filtered = deals.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || (d.clients?.name || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || d.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
          <p className="text-sm text-gray-500 mt-0.5">{deals.length} total deals</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">
          <Plus size={16} /> New Deal
        </button>
      </div>

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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No deals found</p>
            <p className="text-sm mt-1">Create your first deal using the button above</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Deal Name','Client','Type','Channel','Value (Net)','GST','Gross','Status','Dates'].map(h => (
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
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {d.start_date && <span>{d.start_date}</span>}
                    {d.start_date && d.end_date && <span> → </span>}
                    {d.end_date && <span>{d.end_date}</span>}
                    {!d.start_date && '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
                  <label className="block text-xs font-medium text-gray-700 mb-1">Channel(s)</label>
                  <select multiple value={form.channel} onChange={e => setForm({...form, channel: Array.from(e.target.selectedOptions, o => o.value)})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 h-20">
                    {CHANNELS.map(c => <option key={c}>{c}</option>)}
                  </select>
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
