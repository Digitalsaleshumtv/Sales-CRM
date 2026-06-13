import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, Zap, TrendingUp, Search, RefreshCw, ExternalLink, CheckCircle, XCircle, Clock, AlertCircle, BarChart2, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function StatCard({ title, value, sub, icon: Icon, color, onClick }) {
  return (
    <div onClick={onClick} className={`bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function IntelDashboard() {
  const navigate = useNavigate()
  const [stats, setStats]               = useState({})
  const [recentScrapes, setRecentScrapes] = useState([])
  const [recentBrands, setRecentBrands]   = useState([])
  const [topBrands, setTopBrands]         = useState([])
  const [loading, setLoading]             = useState(true)
  const [scrapeUrl, setScrapeUrl]         = useState('')
  const [scraping, setScraping]           = useState(false)
  const [scrapeMsg, setScrapeMsg]         = useState('')
  const [scrapeMsgType, setScrapeMsgType] = useState('success')
  const [bulkScraping, setBulkScraping]   = useState(false)
  const [bulkProgress, setBulkProgress]   = useState([]) // [{site, status, brands}]
  const [backendOnline, setBackendOnline] = useState(null)
  const pollRef = useRef(null)

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  useEffect(() => {
    fetchDashboard()
    checkBackend()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function checkBackend() {
    try {
      const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(3000) })
      setBackendOnline(res.ok)
    } catch {
      setBackendOnline(false)
    }
  }

  async function fetchDashboard() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    const [
      { data: sites },
      { data: scrapes },
      { data: brands },
      { data: fbSearches },
    ] = await Promise.all([
      supabase.from('sites').select('id, is_active, nickname, url, last_scraped_at'),
      supabase.from('scrape_results').select('*, sites(nickname, url)').order('scraped_at', { ascending: false }).limit(20),
      supabase.from('detected_brands').select('*').order('last_detected_at', { ascending: false }).limit(50),
      supabase.from('fb_ad_searches').select('id, search_query, result_count, searched_at').order('searched_at', { ascending: false }).limit(7),
    ])

    const todayScrapes   = (scrapes || []).filter(s => s.scraped_at?.startsWith(today))
    const successScrapes = (scrapes || []).filter(s => s.status === 'success')
    const totalBrandsFound = (scrapes || []).reduce((sum, s) => sum + (s.brands_detected?.length || 0), 0)
    const crmMatched     = (brands || []).filter(b => b.crm_client_id).length

    // Top brands by frequency across all scrapes
    const brandCount = {}
    ;(scrapes || []).forEach(s => {
      (s.brands_detected || []).forEach(b => { brandCount[b] = (brandCount[b] || 0) + 1 })
    })
    const top = Object.entries(brandCount).sort((a,b) => b[1]-a[1]).slice(0,10)
    setTopBrands(top)

    setStats({
      totalSites:    (sites || []).length,
      activeSites:   (sites || []).filter(s => s.is_active).length,
      scrapedToday:  todayScrapes.length,
      totalScrapes:  (scrapes || []).length,
      successRate:   (scrapes||[]).length ? Math.round(successScrapes.length / (scrapes||[]).length * 100) : 0,
      totalBrands:   (brands || []).length,
      totalBrandsFound,
      crmMatched,
      fbSearches:    (fbSearches || []).length,
      fbSearchList:  fbSearches || [],
    })
    setRecentScrapes((scrapes || []).slice(0, 8))
    setRecentBrands((brands || []).slice(0, 8))
    setLoading(false)
  }

  async function triggerScrape(e) {
    e.preventDefault()
    if (!scrapeUrl.trim()) return
    setScraping(true); setScrapeMsg(''); setScrapeMsgType('success')
    try {
      const res  = await fetch(`${apiUrl}/api/scrape/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl }),
      })
      const data = await res.json()
      if (res.ok) {
        const n = data.brands_found?.length || 0
        setScrapeMsg(`✅ Done! ${n > 0 ? `${n} brands: ${data.brands_found.join(', ')}` : 'No brands detected on this page.'}`)
        setScrapeMsgType('success')
        setScrapeUrl('')
        fetchDashboard()
      } else {
        setScrapeMsg(`❌ ${data.error || 'Scrape failed'}`)
        setScrapeMsgType('error')
      }
    } catch {
      setScrapeMsg('❌ Backend offline — run: cd backend → node index.js')
      setScrapeMsgType('error')
      setBackendOnline(false)
    }
    setScraping(false)
    setTimeout(() => setScrapeMsg(''), 8000)
  }

  async function scrapeAll() {
    if (bulkScraping) return
    setBulkScraping(true)
    setBulkProgress([])

    // Get active sites
    const { data: sites } = await supabase.from('sites').select('*').eq('is_active', true)
    if (!sites?.length) { setBulkScraping(false); return }

    // Initialize progress
    setBulkProgress(sites.map(s => ({ id: s.id, name: s.nickname || s.url, url: s.url, status: 'pending', brands: [] })))

    // Scrape each one sequentially with live updates
    for (let i = 0; i < sites.length; i++) {
      const site = sites[i]
      setBulkProgress(prev => prev.map(p => p.id === site.id ? { ...p, status: 'running' } : p))
      try {
        const res  = await fetch(`${apiUrl}/api/scrape/run`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: site.url, site_id: site.id }),
        })
        const data = await res.json()
        setBulkProgress(prev => prev.map(p => p.id === site.id
          ? { ...p, status: res.ok ? 'success' : 'error', brands: data.brands_found || [], error: data.error }
          : p))
      } catch {
        setBulkProgress(prev => prev.map(p => p.id === site.id ? { ...p, status: 'error', error: 'Request failed' } : p))
      }
    }
    setBulkScraping(false)
    fetchDashboard()
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const successCount = bulkProgress.filter(p => p.status === 'success').length
  const errorCount   = bulkProgress.filter(p => p.status === 'error').length
  const pendingCount = bulkProgress.filter(p => p.status === 'pending').length
  const runningItem  = bulkProgress.find(p => p.status === 'running')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ad Intelligence</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor competitor ad spend across Pakistan's top digital properties</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border ${
            backendOnline === true  ? 'bg-green-50 text-green-700 border-green-200' :
            backendOnline === false ? 'bg-red-50 text-red-600 border-red-200' :
            'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${backendOnline === true ? 'bg-green-500' : backendOnline === false ? 'bg-red-500' : 'bg-gray-400'} animate-pulse`}/>
            {backendOnline === true ? 'Backend Online' : backendOnline === false ? 'Backend Offline' : 'Checking...'}
          </div>
          <button onClick={() => { fetchDashboard(); checkBackend() }}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">
            <RefreshCw size={14}/> Refresh
          </button>
        </div>
      </div>

      {/* Backend offline warning */}
      {backendOnline === false && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5"/>
          <div className="text-sm text-red-800">
            <p className="font-semibold">Backend server is offline — scraping is disabled</p>
            <p className="mt-1 text-red-700">Open a terminal and run: <code className="bg-red-100 px-1.5 py-0.5 rounded font-mono">cd "C:\Users\aamish.mirza\Desktop\Sales Dashboard\backend"</code> then <code className="bg-red-100 px-1.5 py-0.5 rounded font-mono">node index.js</code></p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Sites Monitored"   value={stats.activeSites}       sub={`${stats.totalSites} total`}                      icon={Globe}     color="bg-blue-500"   onClick={() => navigate('/intel/sites')} />
        <StatCard title="Scrapes Run"        value={stats.totalScrapes}      sub={`${stats.scrapedToday} today · ${stats.successRate}% success`} icon={Zap}       color="bg-purple-500" onClick={() => navigate('/intel/results')} />
        <StatCard title="Brands Detected"   value={stats.totalBrandsFound}  sub={`${stats.totalBrands} unique brands`}             icon={TrendingUp} color="bg-orange-500" onClick={() => navigate('/intel/brands')} />
        <StatCard title="FB Searches (7d)"  value={stats.fbSearches}        sub="Facebook Ads Library"                             icon={Search}    color="bg-pink-500"   onClick={() => navigate('/intel/facebook')} />
      </div>

      {/* Quick Scrape */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white">
        <h2 className="font-semibold text-lg mb-1">🔍 Scrape a URL Now</h2>
        <p className="text-gray-400 text-sm mb-4">Paste any Pakistani news/entertainment site URL to detect active brand advertisers</p>
        <form onSubmit={triggerScrape} className="flex gap-3">
          <input value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)}
            placeholder="https://dawn.com or https://geo.tv"
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/40"/>
          <button type="submit" disabled={scraping || !scrapeUrl || backendOnline === false}
            className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors whitespace-nowrap">
            {scraping ? '⏳ Scanning...' : 'Scrape Now'}
          </button>
        </form>
        {scrapeMsg && (
          <p className={`text-sm mt-3 ${scrapeMsgType === 'error' ? 'text-red-300' : 'text-green-300'}`}>{scrapeMsg}</p>
        )}
      </div>

      {/* Bulk Scrape with Live Progress */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Scrape All Monitored Sites</h2>
            <p className="text-xs text-gray-400 mt-0.5">{stats.activeSites} active sites — see live status below as each site is scanned</p>
          </div>
          <button onClick={scrapeAll} disabled={bulkScraping || backendOnline === false}
            className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
            <RefreshCw size={14} className={bulkScraping ? 'animate-spin' : ''}/> {bulkScraping ? 'Scraping...' : 'Scrape All Now'}
          </button>
        </div>

        {bulkProgress.length > 0 && (
          <div className="p-4">
            {/* Progress summary */}
            <div className="flex items-center gap-4 mb-4 text-sm">
              <span className="flex items-center gap-1.5 text-green-600 font-medium"><CheckCircle size={14}/> {successCount} done</span>
              {errorCount > 0 && <span className="flex items-center gap-1.5 text-red-500 font-medium"><XCircle size={14}/> {errorCount} failed</span>}
              {pendingCount > 0 && <span className="flex items-center gap-1.5 text-gray-400"><Clock size={14}/> {pendingCount} waiting</span>}
              {runningItem && <span className="flex items-center gap-1.5 text-blue-600 font-medium animate-pulse">⏳ Scanning {runningItem.name}...</span>}
              {!bulkScraping && <span className="text-gray-500 ml-auto">Complete!</span>}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
              <div className="bg-brand-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${bulkProgress.length ? ((successCount + errorCount) / bulkProgress.length * 100) : 0}%` }}/>
            </div>

            {/* Per-site status */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {bulkProgress.map(p => (
                <div key={p.id} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  p.status === 'running'  ? 'bg-blue-50 border border-blue-100' :
                  p.status === 'success'  ? 'bg-green-50' :
                  p.status === 'error'    ? 'bg-red-50' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center gap-2">
                    {p.status === 'pending'  && <Clock size={13} className="text-gray-400"/>}
                    {p.status === 'running'  && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>}
                    {p.status === 'success'  && <CheckCircle size={13} className="text-green-500"/>}
                    {p.status === 'error'    && <XCircle size={13} className="text-red-500"/>}
                    <span className={`font-medium ${p.status === 'running' ? 'text-blue-700' : p.status === 'success' ? 'text-green-700' : p.status === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
                      {p.name}
                    </span>
                  </div>
                  <div className="text-xs text-right">
                    {p.status === 'success' && p.brands.length > 0 && (
                      <span className="text-green-600 font-medium">{p.brands.length} brands: {p.brands.slice(0,3).join(', ')}{p.brands.length > 3 ? '...' : ''}</span>
                    )}
                    {p.status === 'success' && p.brands.length === 0 && <span className="text-gray-400">No brands detected</span>}
                    {p.status === 'error'   && <span className="text-red-500">{p.error || 'Failed'}</span>}
                    {p.status === 'running' && <span className="text-blue-500 animate-pulse">Scanning...</span>}
                    {p.status === 'pending' && <span className="text-gray-300">Waiting</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Scrapes */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Scrapes</h2>
            <button onClick={() => navigate('/intel/results')} className="text-xs text-brand-500 hover:underline">View all →</button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentScrapes.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Globe size={28} className="mx-auto mb-2 opacity-30"/>
                <p className="text-sm">No scrapes yet — click Scrape All Now above</p>
              </div>
            ) : recentScrapes.map(s => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.sites?.nickname || s.page_url || 'Unknown'}</p>
                  <p className="text-xs text-gray-400">{new Date(s.scraped_at).toLocaleString('en-PK')} · {(s.brands_detected||[]).length} brands</p>
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  {(s.brands_detected||[]).length > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{(s.brands_detected||[]).length}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status==='success'?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Brands by Frequency */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">🔥 Most Active Brands</h2>
            <button onClick={() => navigate('/intel/brands')} className="text-xs text-brand-500 hover:underline">View all →</button>
          </div>
          {topBrands.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <TrendingUp size={28} className="mx-auto mb-2 opacity-30"/>
              <p className="text-sm">Run scrapes to detect active brands</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {topBrands.map(([brand, count], i) => (
                <div key={brand} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-4 font-medium">{i+1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium text-gray-800">{brand}</span>
                      <span className="text-xs text-gray-400">{count} site{count!==1?'s':''}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${(count/topBrands[0][1])*100}%` }}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FB Search History */}
      {stats.fbSearchList?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">📘 Recent Facebook Ads Searches</h2>
            <button onClick={() => navigate('/intel/facebook')} className="text-xs text-brand-500 hover:underline">Search more →</button>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.fbSearchList.map(s => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">"{s.search_query}"</p>
                  <p className="text-xs text-gray-400">{new Date(s.searched_at).toLocaleString('en-PK')}</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{s.result_count || 0} ads</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
