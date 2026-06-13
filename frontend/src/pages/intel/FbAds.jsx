import { useEffect, useState } from 'react'
import { Search, Clock, RefreshCw, ExternalLink, Plus, Tv } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAppStore from '../../store/useAppStore'

const COUNTRIES = [
  { code: 'PK', label: 'Pakistan' }, { code: 'AE', label: 'UAE' }, { code: 'SA', label: 'Saudi Arabia' },
  { code: 'US', label: 'United States' }, { code: 'GB', label: 'United Kingdom' },
]
const PLATFORMS = ['ALL', 'facebook', 'instagram', 'messenger', 'audience_network']

// Competitor channels — one-click search
const COMPETITOR_BRANDS = [
  { label: 'ARY Digital',       query: 'ARY Digital',         group: 'HUM TV' },
  { label: 'Geo Entertainment', query: 'Geo Entertainment',   group: 'HUM TV' },
  { label: 'Green Entertainment',query:'Green Entertainment', group: 'HUM TV' },
  { label: 'Geo News',          query: 'Geo News Pakistan',   group: 'HUM News' },
  { label: 'ARY News',          query: 'ARY News',            group: 'HUM News' },
  { label: 'Samaa TV',          query: 'Samaa TV',            group: 'HUM News' },
  { label: 'Dunya News',        query: 'Dunya News',          group: 'HUM News' },
  { label: 'Express News',      query: 'Express News Pakistan',group:'HUM News' },
  { label: 'ARY Zindagi',       query: 'ARY Zindagi',         group: 'Masala TV' },
  { label: 'Food Fusion',       query: 'Food Fusion',         group: 'Masala TV' },
]

const GROUP_COLORS = {
  'HUM TV':    'bg-red-100 text-red-700 border-red-200',
  'HUM News':  'bg-blue-100 text-blue-700 border-blue-200',
  'Masala TV': 'bg-orange-100 text-orange-700 border-orange-200',
}

function AdCard({ ad, onAddToCRM }) {
  const platforms = ad.publisher_platforms || []
  const platformIcons = { facebook: '📘', instagram: '📸', messenger: '💬', audience_network: '🌐' }
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{ad.page_name || 'Unknown Brand'}</p>
          <p className="text-xs text-gray-400 mt-0.5">ID: {ad.id}</p>
        </div>
        <div className="flex gap-1">
          {platforms.map(p => <span key={p} title={p} className="text-lg">{platformIcons[p] || '📱'}</span>)}
        </div>
      </div>
      {(ad.ad_creative_body || ad.ad_creative_link_caption) && (
        <p className="text-sm text-gray-600 line-clamp-3 border-l-2 border-gray-100 pl-3">
          {ad.ad_creative_body || ad.ad_creative_link_caption}
        </p>
      )}
      {ad.ad_snapshot_url && (
        <img src={ad.ad_snapshot_url} alt="Ad creative" className="rounded-lg w-full object-cover max-h-40 bg-gray-50"
          onError={e => e.target.style.display='none'} />
      )}
      <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-2 border-t border-gray-50">
        <span>Started: {ad.ad_delivery_start_time ? new Date(ad.ad_delivery_start_time).toLocaleDateString() : '—'}</span>
        {ad.reach_estimate && <span>Reach: {ad.reach_estimate.lower_bound?.toLocaleString()}–{ad.reach_estimate.upper_bound?.toLocaleString()}</span>}
      </div>
      <div className="flex gap-2">
        <a href={`https://www.facebook.com/ads/library/?id=${ad.id}`} target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1 text-xs border border-gray-200 text-gray-600 py-1.5 rounded-lg hover:bg-gray-50">
          <ExternalLink size={12} /> View on Meta
        </a>
        <button onClick={() => onAddToCRM(ad.page_name)}
          className="flex-1 flex items-center justify-center gap-1 text-xs bg-brand-500 text-white py-1.5 rounded-lg hover:bg-brand-600">
          <Plus size={12} /> Add to CRM
        </button>
      </div>
    </div>
  )
}

export default function FbAds() {
  const { user } = useAppStore()
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('PK')
  const [platform, setPlatform] = useState('ALL')
  const [results, setResults] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [currentQuery, setCurrentQuery] = useState('')
  const [metaToken] = useState(import.meta.env.VITE_META_ACCESS_TOKEN || '')
  const [error, setError] = useState('')

  useEffect(() => { fetchHistory() }, [])

  async function fetchHistory() {
    const { data } = await supabase.from('fb_ad_searches')
      .select('*').order('searched_at', { ascending: false }).limit(10)
    setHistory(data || [])
  }

  async function runSearch(searchQuery, searchCountry = country) {
    if (!searchQuery?.trim()) return
    if (!metaToken) { setError('Meta Access Token not configured. Add VITE_META_ACCESS_TOKEN to your .env.local file.'); return }
    setLoading(true); setError(''); setSearched(true); setCurrentQuery(searchQuery)

    try {
      const params = new URLSearchParams({
        access_token: metaToken,
        search_terms: searchQuery,
        ad_reached_countries: searchCountry,
        ad_active_status: 'ACTIVE',
        fields: 'id,ad_creative_body,ad_creative_link_caption,ad_delivery_start_time,publisher_platforms,reach_estimate,ad_snapshot_url,page_name',
        limit: 50,
      })
      if (platform !== 'ALL') params.set('publisher_platforms', platform)

      const res = await fetch(`https://graph.facebook.com/v19.0/ads_archive?${params}`)
      const json = await res.json()

      if (json.error) { setError(`Meta API: ${json.error.message}`); setResults([]); setLoading(false); return }

      const ads = json.data || []
      setResults(ads)

      await supabase.from('fb_ad_searches').insert([{
        search_query: searchQuery, country: searchCountry, platform_filter: platform,
        status_filter: 'ACTIVE', results: ads, result_count: ads.length,
        searched_by: user?.id,
      }])
      fetchHistory()
    } catch {
      setError('Failed to reach Meta API. Check your token.')
    }
    setLoading(false)
  }

  async function addToCRM(brandName) {
    const { error } = await supabase.from('clients').insert([{
      name: brandName, type: 'brand', status: 'active',
      notes: `Prospect — detected via Facebook Ads Library on ${new Date().toLocaleDateString()}`,
    }])
    if (!error) alert(`✓ "${brandName}" added as a prospect in CRM Clients tab!`)
    else if (error.message.includes('duplicate') || error.message.includes('unique')) alert(`"${brandName}" already exists in CRM.`)
    else alert('Error: ' + error.message)
  }

  const groups = [...new Set(COMPETITOR_BRANDS.map(b => b.group))]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Facebook Ads Library</h1>
        <p className="text-sm text-gray-500 mt-1">Search all active Pakistan ads on Meta platforms</p>
      </div>

      {/* Competitor Quick Search */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tv size={16} className="text-brand-500"/>
          <h2 className="font-semibold text-gray-800 text-sm">Competitor Channels — One-Click Search</h2>
        </div>
        <div className="space-y-3">
          {groups.map(group => (
            <div key={group}>
              <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">{group} Competitors</p>
              <div className="flex flex-wrap gap-2">
                {COMPETITOR_BRANDS.filter(b => b.group === group).map(b => (
                  <button key={b.label} onClick={() => { setQuery(b.query); runSearch(b.query) }}
                    disabled={loading}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all hover:shadow-sm disabled:opacity-50 ${GROUP_COLORS[group]}`}>
                    {loading && query === b.query ? '⏳ ' : ''}{b.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <form onSubmit={e => { e.preventDefault(); runSearch(query) }} className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search brand name e.g. 'Nestlé Pakistan', 'Coca Cola Pakistan'..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <select value={country} onChange={e => setCountry(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
            <select value={platform} onChange={e => setPlatform(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
            <button type="submit" disabled={loading || !query}
              className="bg-brand-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {!metaToken && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              ⚠️ <strong>Meta Access Token required.</strong> Add <code className="bg-amber-100 px-1 rounded">VITE_META_ACCESS_TOKEN=your_token</code> to <code className="bg-amber-100 px-1 rounded">frontend/.env.local</code>, then restart.
              <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="ml-2 underline">Get token →</a>
            </div>
          )}
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{error}</p>}
        </form>
      </div>

      {/* Results */}
      {searched && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {loading ? 'Searching...' : `${results.length} active ads found for `}
              {!loading && <strong>"{currentQuery}"</strong>}
            </p>
            {!loading && results.length > 0 && (
              <p className="text-xs text-gray-400">{country} · {platform === 'ALL' ? 'All platforms' : platform}</p>
            )}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>
          ) : results.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <p>No active ads found for "{currentQuery}" in {COUNTRIES.find(c=>c.code===country)?.label}</p>
              <p className="text-sm mt-1">Try a different country or check the brand name spelling</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map(ad => <AdCard key={ad.id} ad={ad} onAddToCRM={addToCRM} />)}
            </div>
          )}
        </div>
      )}

      {/* Search history */}
      {history.length > 0 && !searched && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Clock size={16} /> Recent Searches</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {history.map(h => (
              <div key={h.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                onClick={() => { setQuery(h.search_query); setCountry(h.country) }}>
                <div>
                  <p className="text-sm font-medium text-gray-800">"{h.search_query}"</p>
                  <p className="text-xs text-gray-400">{h.country} · {h.result_count} ads · {new Date(h.searched_at).toLocaleString('en-PK')}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); runSearch(h.search_query, h.country) }}
                  className="text-xs text-brand-500 hover:underline flex items-center gap-1">
                  <RefreshCw size={12} /> Re-run
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
