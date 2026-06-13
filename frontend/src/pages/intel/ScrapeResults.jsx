import { useEffect, useState } from 'react'
import { Search, Globe, ExternalLink, ChevronDown, ChevronRight, RefreshCw, Tag } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function ScrapeResults() {
  const navigate = useNavigate()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    supabase
      .from('scrape_results')
      .select('*, sites(url, nickname, category)')
      .order('scraped_at', { ascending: false })
      .limit(300)
      .then(({ data }) => {
        const rows = data || []
        setResults(rows)
        setLoading(false)
        // Auto-expand sites from the latest scrape run (within 10 min of most recent)
        if (rows.length > 0) {
          const latestTs = new Date(rows[0].scraped_at).getTime()
          const autoExpand = {}
          rows.forEach(r => {
            if (latestTs - new Date(r.scraped_at).getTime() < 10 * 60 * 1000) {
              autoExpand[r.site_id || 'unknown'] = true
            }
          })
          setExpanded(autoExpand)
        }
      })
  }, [])

  const filtered = results.filter(r => {
    const q = search.toLowerCase()
    return !q ||
      (r.sites?.url || '').includes(q) ||
      (r.sites?.nickname || '').toLowerCase().includes(q) ||
      (r.brands_detected || []).some(b => b.toLowerCase().includes(q))
  })

  // Group by site (latest result per site first)
  const grouped = {}
  filtered.forEach(r => {
    const key = r.site_id || 'unknown'
    if (!grouped[key]) grouped[key] = { site: r.sites, results: [] }
    grouped[key].results.push(r)
  })

  // Latest run summary: results scraped within 10 min of the most recent record
  const latestRun = (() => {
    if (!results.length) return []
    const latestTs = new Date(results[0].scraped_at).getTime()
    return results.filter(r => latestTs - new Date(r.scraped_at).getTime() < 10 * 60 * 1000)
  })()

  const latestBrands = latestRun.flatMap(r => (r.brands_detected || []).map(b => ({ brand: b, site: r.sites?.nickname || r.sites?.url || 'Unknown' })))
  const latestTs = results[0]?.scraped_at

  const toggle = id => setExpanded(e => ({ ...e, [id]: !e[id] }))

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scrape Results</h1>
          <p className="text-sm text-gray-500 mt-0.5">{results.length} records · {Object.keys(grouped).length} sites</p>
        </div>
        <button onClick={() => navigate('/intel/sites')} className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
          <RefreshCw size={15} /> Run New Scrape
        </button>
      </div>

      {/* Latest run summary */}
      {latestRun.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-gray-800">Latest Scrape Run</h2>
              <p className="text-xs text-gray-400 mt-0.5">{latestRun.length} sites · {timeAgo(latestTs)}</p>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
              {latestBrands.length} brands detected
            </span>
          </div>

          {latestBrands.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No brands detected in latest run.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {latestBrands.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-brand-50 border border-brand-100 rounded-full px-3 py-1">
                  <Tag size={11} className="text-brand-500" />
                  <span className="text-xs font-semibold text-brand-700">{item.brand}</span>
                  <span className="text-xs text-gray-400">· {item.site}</span>
                </div>
              ))}
            </div>
          )}

          {/* Per-site quick summary */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {latestRun.map(r => (
              <div key={r.id} className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-xs text-gray-600 truncate">{r.sites?.nickname || r.sites?.url?.replace('https://', '') || 'Unknown'}</span>
                <span className={`text-xs font-bold flex-shrink-0 ${(r.brands_detected?.length || 0) > 0 ? 'text-brand-600' : 'text-gray-400'}`}>
                  {r.brands_detected?.length || 0} brands
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by site or brand name..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <Globe size={32} className="mx-auto mb-3 opacity-30" />
          <p>No scrape results yet</p>
          <p className="text-sm mt-1">Go to Website Monitor and click Scrape All Now</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">All Sites — Full History</h2>
          {Object.entries(grouped).map(([key, { site, results: siteResults }]) => {
            const totalBrands = [...new Set(siteResults.flatMap(r => r.brands_detected || []))]
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <button onClick={() => toggle(key)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Globe size={16} className="text-gray-400 flex-shrink-0" />
                    <div className="text-left">
                      <p className="font-semibold text-gray-800 text-sm">{site?.nickname || site?.url || 'Unknown site'}</p>
                      <p className="text-xs text-gray-400">{site?.url} · {siteResults.length} scrape{siteResults.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {totalBrands.length > 0 && (
                      <div className="flex flex-wrap gap-1 max-w-xs justify-end">
                        {totalBrands.slice(0, 4).map(b => (
                          <span key={b} className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full font-medium">{b}</span>
                        ))}
                        {totalBrands.length > 4 && <span className="text-xs text-gray-400">+{totalBrands.length - 4} more</span>}
                      </div>
                    )}
                    <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(siteResults[0]?.scraped_at)}</span>
                    {expanded[key] ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  </div>
                </button>

                {expanded[key] && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {siteResults.map(r => (
                      <div key={r.id} className="px-5 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'success' ? 'bg-green-100 text-green-700' : r.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                              {r.status}
                            </span>
                            <span className="text-xs text-gray-400">{timeAgo(r.scraped_at)}</span>
                          </div>
                          {r.page_url && (
                            <a href={r.page_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-500 hover:underline flex items-center gap-1">
                              <ExternalLink size={11} /> View page
                            </a>
                          )}
                        </div>
                        {r.brands_detected?.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {r.brands_detected.map(b => (
                              <span key={b} className="flex items-center gap-1 text-xs bg-brand-50 border border-brand-100 text-brand-700 px-2.5 py-1 rounded-full font-medium">
                                <Tag size={10} /> {b}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">No brands detected</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
