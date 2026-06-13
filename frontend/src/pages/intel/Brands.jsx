import { useEffect, useState } from 'react'
import { Search, TrendingUp, Plus, Link } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const SPEND_COLORS = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-gray-100 text-gray-500',
}
const SOURCE_LABELS = {
  scrape:   '🌐 Web',
  facebook: '📘 Facebook',
  both:     '🌐📘 Both',
}

export default function Brands() {
  const [brands, setBrands] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCRM, setFilterCRM] = useState('all')
  const [linkingId, setLinkingId] = useState(null)
  const [selectedClientId, setSelectedClientId] = useState('')

  useEffect(() => {
    fetchBrands()
    supabase.from('clients').select('id,name').order('name').then(({ data }) => setClients(data || []))
  }, [])

  async function fetchBrands() {
    setLoading(true)
    const { data } = await supabase.from('detected_brands')
      .select('*, clients(name, status)').order('last_detected_at', { ascending: false })
    setBrands(data || [])
    setLoading(false)
  }

  async function addAsProspect(brand) {
    const { error } = await supabase.from('clients').insert([{
      name: brand.brand_name, type: 'brand', status: 'active',
      notes: `Prospect from Ad Intelligence — detected via ${SOURCE_LABELS[brand.detection_source]} on ${new Date(brand.last_detected_at).toLocaleDateString()}`,
    }])
    if (!error) { alert(`✓ "${brand.brand_name}" added as CRM prospect!`); fetchBrands() }
    else alert(error.message)
  }

  async function linkToClient(brandId) {
    if (!selectedClientId) return
    const { error } = await supabase.from('detected_brands')
      .update({ crm_client_id: selectedClientId }).eq('id', brandId)
    if (!error) { setLinkingId(null); setSelectedClientId(''); fetchBrands() }
    else alert(error.message)
  }

  const filtered = brands.filter(b => {
    const matchSearch = b.brand_name.toLowerCase().includes(search.toLowerCase())
    const matchCRM = filterCRM === 'all'
      ? true : filterCRM === 'in_crm' ? !!b.crm_client_id : !b.crm_client_id
    return matchSearch && matchCRM
  })

  const inCRM = brands.filter(b => b.crm_client_id).length
  const prospects = brands.filter(b => !b.crm_client_id).length

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Competitor Brands</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Brands actively spending on digital ads — cross-referenced with your CRM
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Detected', value: brands.length, color: 'bg-blue-50 border-blue-100' },
          { label: 'In CRM', value: inCRM, color: 'bg-green-50 border-green-100' },
          { label: 'Pitch Opportunities', value: prospects, color: 'bg-orange-50 border-orange-100' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{c.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search brands..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[['all','All'],['in_crm','In CRM'],['not_in_crm','Not in CRM']].map(([v,l]) => (
            <button key={v} onClick={() => setFilterCRM(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterCRM===v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3 text-gray-400">
            <TrendingUp size={40} className="mx-auto opacity-20" />
            <p className="text-lg">No brands detected yet</p>
            <p className="text-sm">Run website scrapes or search Facebook Ads to start detecting brands</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Brand','Detected On','FB Ads','Last Seen','Spend Signal','CRM Status','Assigned To','Action'].map(h =>
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              )}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900">{b.brand_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{SOURCE_LABELS[b.detection_source]}</td>
                  <td className="px-4 py-3 text-gray-600">{b.fb_ad_count || 0}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(b.last_detected_at).toLocaleDateString('en-PK')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SPEND_COLORS[b.spend_signal] || 'bg-gray-100 text-gray-500'}`}>
                      {b.spend_signal}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {b.clients ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        ✓ {b.clients.name}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                        Not in CRM
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">—</td>
                  <td className="px-4 py-3">
                    {linkingId === b.id ? (
                      <div className="flex items-center gap-1">
                        <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}
                          className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none w-36">
                          <option value="">Select client...</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={() => linkToClient(b.id)} className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">Link</button>
                        <button onClick={() => setLinkingId(null)} className="text-xs text-gray-400 hover:underline">✕</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {!b.crm_client_id && (
                          <button onClick={() => addAsProspect(b)}
                            className="text-xs flex items-center gap-1 text-brand-500 hover:underline">
                            <Plus size={12} /> Add Prospect
                          </button>
                        )}
                        <button onClick={() => setLinkingId(b.id)}
                          className="text-xs flex items-center gap-1 text-gray-500 hover:underline">
                          <Link size={12} /> Link
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
