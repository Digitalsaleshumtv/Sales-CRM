import { useEffect, useState } from 'react'
import { FileText, ExternalLink, Search, Upload, X, Filter } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const TYPE_COLORS = {
  'Drama Sponsorship':       'bg-purple-100 text-purple-700',
  'Event Sponsorship':       'bg-blue-100 text-blue-700',
  'Branded Content Package': 'bg-orange-100 text-orange-700',
  'Social Media Posts':      'bg-pink-100 text-pink-700',
  'Website Banners':         'bg-teal-100 text-teal-700',
  'Product Integration':     'bg-yellow-100 text-yellow-700',
}

function fileIcon(url) {
  if (!url) return '📄'
  if (url.includes('.pptx')) return '📊'
  if (url.includes('.pdf')) return '📕'
  if (url.includes('.docx')) return '📝'
  return '📄'
}

export default function Presentations() {
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterChannel, setFilterChannel] = useState('all')
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'Drama Sponsorship', channel: [], notes: '' })
  const [file, setFile] = useState(null)

  useEffect(() => { fetchDecks() }, [])

  async function fetchDecks() {
    setLoading(true)
    const { data } = await supabase.from('presentations').select('*').order('created_at', { ascending: false })
    setDecks(data || [])
    setLoading(false)
  }

  async function uploadDeck(e) {
    e.preventDefault()
    if (!file) return alert('Please select a file')
    setUploading(true)

    const storagePath = `decks/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    const { error: upErr } = await supabase.storage.from('presentations').upload(storagePath, file, { contentType: file.type })
    if (upErr) { alert('Upload error: ' + upErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('presentations').getPublicUrl(storagePath)
    const { error: dbErr } = await supabase.from('presentations').insert([{ ...form, file_url: publicUrl, status: 'Active' }])
    if (dbErr) alert('DB error: ' + dbErr.message)
    else { setShowUpload(false); setForm({ name: '', type: 'Drama Sponsorship', channel: [], notes: '' }); setFile(null); fetchDecks() }
    setUploading(false)
  }

  const types = [...new Set(decks.map(d => d.type).filter(Boolean))]
  const channels = [...new Set(decks.flatMap(d => d.channel || []))]

  const filtered = decks.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || (d.notes || '').toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || d.type === filterType
    const matchChannel = filterChannel === 'all' || (d.channel || []).includes(filterChannel)
    return matchSearch && matchType && matchChannel
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Presentations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{decks.length} pitch decks</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
          <Upload size={15} /> Upload Deck
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search presentations..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="all">All Types</option>
          {types.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="all">All Channels</option>
          {channels.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(deck => (
            <div key={deck.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{fileIcon(deck.file_url)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm leading-snug">{deck.name}</p>
                  {deck.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{deck.notes}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {deck.type && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[deck.type] || 'bg-gray-100 text-gray-600'}`}>{deck.type}</span>}
                {(deck.channel || []).map(c => <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{c}</span>)}
              </div>
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                <span className="text-xs text-gray-400">{deck.created_at ? new Date(deck.created_at).toLocaleDateString('en-PK') : ''}</span>
                {deck.file_url && (
                  <a href={deck.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-700 font-medium">
                    Open <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-4 text-center py-16 text-gray-400">
              <p>No presentations found</p>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Upload Pitch Deck</h2>
              <button onClick={() => setShowUpload(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={uploadDeck} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Deck Name *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Nestle Maggi — Drama Q3 Pitch" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {['Drama Sponsorship','Event Sponsorship','Branded Content Package','Social Media Posts','Website Banners','Product Integration','Other'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Channel(s)</label>
                  <select multiple value={form.channel} onChange={e => setForm({...form, channel: Array.from(e.target.selectedOptions, o => o.value)})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 h-20">
                    {['HUM TV','Masala TV','HUM News','HUM Network'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes / Client</label>
                <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Client: Nestle Pakistan" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">File (PDF, PPTX, DOCX) *</label>
                <input type="file" accept=".pdf,.pptx,.docx,.ppt" onChange={e => setFile(e.target.files[0])} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowUpload(false)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={uploading} className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-60">{uploading ? 'Uploading...' : 'Upload'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
