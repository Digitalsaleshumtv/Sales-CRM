import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Building2, Briefcase, Phone, Calendar, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ clients: [], deals: [], followUps: [], meetings: [] })
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else { setQuery(''); setResults({ clients: [], deals: [], followUps: [], meetings: [] }) }
  }, [open])

  // Escape to close
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults({ clients: [], deals: [], followUps: [], meetings: [] }); return }
    const t = setTimeout(() => runSearch(query), 280)
    return () => clearTimeout(t)
  }, [query])

  async function runSearch(q) {
    setLoading(true)
    const [{ data: clients }, { data: deals }, { data: followUps }, { data: meetings }] = await Promise.all([
      supabase.from('clients').select('id, name, type, region, contact_name').ilike('name', `%${q}%`).limit(5),
      supabase.from('deals').select('id, name, status, value_net, clients(name)').or(`name.ilike.%${q}%`).limit(5),
      supabase.from('follow_ups').select('id, notes, follow_up_date, type, clients(name)').ilike('notes', `%${q}%`).limit(4),
      supabase.from('meeting_logs').select('id, notes, meeting_date, outcome, clients(name)').ilike('notes', `%${q}%`).limit(3),
    ])
    setResults({ clients: clients || [], deals: deals || [], followUps: followUps || [], meetings: meetings || [] })
    setLoading(false)
  }

  function go(path) { navigate(path); onClose() }

  const total = results.clients.length + results.deals.length + results.followUps.length + results.meetings.length

  const STATUS_COLORS = {
    Prospecting: 'bg-gray-100 text-gray-600',
    'Pitch Sent': 'bg-blue-100 text-blue-700',
    'In Negotiation': 'bg-yellow-100 text-yellow-700',
    'Under Process': 'bg-orange-100 text-orange-700',
    Locked: 'bg-purple-100 text-purple-700',
    'RO Received': 'bg-indigo-100 text-indigo-700',
    Billed: 'bg-green-100 text-green-700',
    Completed: 'bg-green-200 text-green-800',
  }

  function fmtV(n) {
    if (!n) return null
    if (n >= 1e7) return `₨${(n/1e7).toFixed(1)}Cr`
    if (n >= 1e5) return `₨${(n/1e5).toFixed(1)}L`
    return `₨${Number(n).toLocaleString()}`
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search size={17} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search clients, deals, notes..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
          />
          {loading
            ? <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            : query && <button onClick={() => setQuery('')}><X size={15} className="text-gray-400 hover:text-gray-600" /></button>
          }
          <kbd className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[65vh] overflow-y-auto">
          {query && !loading && total === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No results for "{query}"</p>
          )}

          {results.clients.length > 0 && (
            <section className="p-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 py-1">Clients & Agencies</p>
              {results.clients.map(c => (
                <button key={c.id} onClick={() => go(`/crm/clients/${c.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left group transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Building2 size={14} className="text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.type} · {c.region}{c.contact_name ? ` · ${c.contact_name}` : ''}</p>
                  </div>
                  <ArrowRight size={13} className="text-gray-300 group-hover:text-brand-400 transition-colors" />
                </button>
              ))}
            </section>
          )}

          {results.deals.length > 0 && (
            <section className="p-2 border-t border-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 py-1">Deals</p>
              {results.deals.map(d => (
                <button key={d.id} onClick={() => go('/crm/deals')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left group transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Briefcase size={14} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.clients?.name}{d.value_net ? ` · ${fmtV(d.value_net)}` : ''}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-500'}`}>{d.status}</span>
                </button>
              ))}
            </section>
          )}

          {results.followUps.length > 0 && (
            <section className="p-2 border-t border-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 py-1">Follow-ups</p>
              {results.followUps.map(f => (
                <button key={f.id} onClick={() => go('/crm/pipeline')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left group transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center flex-shrink-0">
                    <Phone size={14} className="text-yellow-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{f.clients?.name || 'Unknown'} <span className="font-normal text-gray-500">· {f.type}</span></p>
                    <p className="text-xs text-gray-400 truncate">{f.notes?.slice(0, 70)}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{f.follow_up_date}</span>
                </button>
              ))}
            </section>
          )}

          {results.meetings.length > 0 && (
            <section className="p-2 border-t border-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 py-1">Meeting Logs</p>
              {results.meetings.map(m => (
                <button key={m.id} onClick={() => go('/crm/pipeline')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left group transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <Calendar size={14} className="text-teal-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{m.clients?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400 truncate">{m.outcome?.slice(0, 60)}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{m.meeting_date}</span>
                </button>
              ))}
            </section>
          )}

          {!query && (
            <div className="p-6 text-center">
              <Search size={28} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Search across clients, deals, follow-ups and meetings</p>
              <p className="text-xs text-gray-300 mt-1">Press <kbd className="bg-gray-100 text-gray-500 px-1 rounded font-mono">Ctrl+K</kbd> anytime to open</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
