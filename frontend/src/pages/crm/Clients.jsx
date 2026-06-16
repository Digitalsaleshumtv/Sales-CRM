import { useEffect, useState } from 'react'
import { Plus, Search, X, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { downloadExcel } from '../../lib/exportExcel'

const INDUSTRIES = ['FMCG','Telecom','Banking & Finance','Automotive','Real Estate','Retail','Food & Beverage','Health & Pharma','Fashion & Apparel','Technology','Media & Entertainment','Education','Travel & Tourism','Energy','Government','NGO / Non-Profit','Agriculture','E-commerce','Other']

const REGIONS = ['Karachi','Lahore','Islamabad']

function Badge({ active }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCity, setFilterCity] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(defaultForm())

  function defaultForm() {
    return { name: '', type: 'brand', industry: [], region: 'Karachi', contact_name: '', contact_email: '', contact_phone: '', entertainment_budget: '', notes: '', status: 'active' }
  }

  useEffect(() => { fetchClients() }, [])

  async function fetchClients() {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  async function saveClient(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, entertainment_budget: form.entertainment_budget ? Number(form.entertainment_budget) : null }
    const { error } = await supabase.from('clients').insert([payload])
    if (!error) { setShowModal(false); setForm(defaultForm()); fetchClients() }
    else alert('Error: ' + error.message)
    setSaving(false)
  }

  const cityCounts = { all: clients.length, ...REGIONS.reduce((acc, r) => ({ ...acc, [r]: clients.filter(c => c.region === r).length }), {}) }
  const typeCounts = { all: clients.length, brand: clients.filter(c => c.type === 'brand').length, agency: clients.filter(c => c.type === 'agency').length }

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_name || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    const matchCity   = filterCity   === 'all' || c.region === filterCity
    const matchType   = filterType   === 'all' || c.type === filterType
    return matchSearch && matchStatus && matchCity && matchType
  })

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients & Agencies</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients.length} total · {filtered.length} shown</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadExcel(
            filtered.map(c => ({
              Name: c.name,
              Type: c.type,
              Industry: Array.isArray(c.industry) ? c.industry.join(', ') : (c.industry || ''),
              Region: c.region || '',
              Status: c.status,
              'Contact Name': c.contact_name || '',
              'Contact Email': c.contact_email || '',
              'Contact Phone': c.contact_phone || '',
              'Entertainment Budget (PKR)': c.entertainment_budget || '',
              Notes: c.notes || '',
            })),
            'Clients', 'Clients'
          )} className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            <Download size={15}/> Export Excel
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">
            <Plus size={16} /> Add Client
          </button>
        </div>
      </div>

      {/* Type Filter */}
      <div className="flex gap-2">
        {[['all', 'All Types'], ['brand', 'Direct Brands'], ['agency', 'Agencies']].map(([val, label]) => (
          <button key={val} onClick={() => setFilterType(val)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              filterType === val
                ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${filterType === val ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {typeCounts[val] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* City Tabs */}
      <div className="flex gap-2">
        {[['all','All Cities'], ...REGIONS.map(r => [r, r])].map(([val, label]) => (
          <button key={val} onClick={() => setFilterCity(val)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              filterCity === val
                ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            {val === 'all' ? '🗺️' : val === 'Karachi' ? '🏙️' : val === 'Lahore' ? '🌆' : '🏛️'}
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              filterCity === val ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {cityCounts[val] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Status Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients or agencies..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No clients found</p>
            <p className="text-sm mt-1">Add your first client using the button above</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Client Name','Type','Industry','Region','Contact','Status','Budget'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    {c.notes && <p className="text-xs text-gray-400 truncate max-w-[200px]">{c.notes}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.type === 'agency' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{c.type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{(c.industry || []).join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.region || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-800">{c.contact_name || '—'}</p>
                    <p className="text-xs text-gray-400">{c.contact_email || ''}</p>
                  </td>
                  <td className="px-4 py-3"><Badge active={c.status === 'active'} /></td>
                  <td className="px-4 py-3 text-gray-600">{c.entertainment_budget ? `₨${Number(c.entertainment_budget).toLocaleString()}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Add New Client</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={saveClient} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Client Name *</label>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Nestle Pakistan" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="brand">Direct Brand</option>
                    <option value="agency">Agency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Region</label>
                  <select value={form.region} onChange={e => setForm({...form, region: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {REGIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Industry</label>
                  <select multiple value={form.industry} onChange={e => setForm({...form, industry: Array.from(e.target.selectedOptions, o => o.value)})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 h-24">
                    {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Hold Ctrl to select multiple</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person</label>
                  <input value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="+92 300 0000000" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="contact@company.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Entertainment Budget (PKR)</label>
                  <input type="number" value={form.entertainment_budget} onChange={e => setForm({...form, entertainment_budget: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Any notes..." />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-60">{saving ? 'Saving...' : 'Add Client'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
