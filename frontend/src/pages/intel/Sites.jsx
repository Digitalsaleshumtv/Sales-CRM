import { useEffect, useState } from 'react'
import { Plus, X, Play, Pause, Trash2, ExternalLink, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const CATEGORIES = ['News', 'Entertainment', 'E-commerce', 'Lifestyle', 'Other']

export default function Sites() {
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scrapingId, setScrapingId] = useState(null)
  const [form, setForm] = useState({ url: '', nickname: '', category: 'News' })

  useEffect(() => { fetchSites() }, [])

  async function fetchSites() {
    setLoading(true)
    const { data } = await supabase.from('sites').select('*').order('created_at', { ascending: false })
    setSites(data || [])
    setLoading(false)
  }

  async function addSite(e) {
    e.preventDefault(); setSaving(true)
    const { error } = await supabase.from('sites').insert([{ ...form, is_active: true }])
    if (!error) { setShowModal(false); setForm({ url: '', nickname: '', category: 'News' }); fetchSites() }
    else alert(error.message)
    setSaving(false)
  }

  async function toggleActive(site) {
    await supabase.from('sites').update({ is_active: !site.is_active }).eq('id', site.id)
    fetchSites()
  }

  async function deleteSite(id) {
    if (!confirm('Delete this site?')) return
    await supabase.from('sites').delete().eq('id', id)
    fetchSites()
  }

  async function scrapeSite(site) {
    setScrapingId(site.id)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const res = await fetch(`${apiUrl}/api/scrape/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: site.url, site_id: site.id }),
      })
      const data = await res.json()
      if (res.ok) {
        alert(`✅ Scrape complete!\nBrands detected: ${data.brands_found?.length > 0 ? data.brands_found.join(', ') : 'None found'}`)
        fetchSites()
      } else {
        alert('Scrape failed: ' + (data.error || 'Unknown error'))
      }
    } catch {
      alert('❌ Backend not running. Start the backend server first (START.bat)')
    }
    setScrapingId(null)
  }

  async function scrapeAll() {
    if (!confirm(`Scrape all ${sites.filter(s=>s.is_active).length} active sites now?`)) return
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const res = await fetch(`${apiUrl}/api/scrape/run-all`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        alert(`✅ Scraped ${data.scraped} sites.\n${data.results?.map(r => `${r.url}: ${r.brands?.length || 0} brands`).join('\n')}`)
        fetchSites()
      } else alert('Scrape all failed')
    } catch {
      alert('❌ Backend not running. Start backend first.')
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Website Monitor</h1>
          <p className="text-sm text-gray-500 mt-0.5">{sites.filter(s=>s.is_active).length} active sites · auto-scraped daily at 8AM PKT</p>
        </div>
        <div className="flex gap-2">
          <button onClick={scrapeAll} className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            <RefreshCw size={15} /> Scrape All Now
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
            <Plus size={16} /> Add Site
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Site','URL','Category','Last Scraped','Status','Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sites.map(site => (
                <tr key={site.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{site.nickname || site.url}</td>
                  <td className="px-4 py-3">
                    <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-500 hover:underline flex items-center gap-1">
                      {site.url.replace('https://','').replace('http://','')} <ExternalLink size={11} />
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{site.category}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {site.last_scraped_at ? new Date(site.last_scraped_at).toLocaleString('en-PK') : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${site.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {site.is_active ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => scrapeSite(site)} disabled={scrapingId === site.id} className="text-xs flex items-center gap-1 text-blue-600 hover:underline disabled:opacity-50">
                        <Play size={12} /> {scrapingId === site.id ? 'Running...' : 'Scrape'}
                      </button>
                      <button onClick={() => toggleActive(site)} className="text-xs flex items-center gap-1 text-gray-500 hover:underline">
                        {site.is_active ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Resume</>}
                      </button>
                      <button onClick={() => deleteSite(site.id)} className="text-xs flex items-center gap-1 text-red-400 hover:underline">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Add New Site</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={addSite} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">URL *</label>
                <input required type="url" value={form.url} onChange={e => setForm({...form, url: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="https://example.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nickname</label>
                <input value={form.nickname} onChange={e => setForm({...form, nickname: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Dawn.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-60">{saving ? 'Adding...' : 'Add Site'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
