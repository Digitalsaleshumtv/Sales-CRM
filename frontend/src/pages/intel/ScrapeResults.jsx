import { useEffect, useState } from 'react'
import { Search, Globe, AlertCircle, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function timeAgo(ts){
  const diff=Math.floor((Date.now()-new Date(ts))/1000)
  if(diff<60)return'just now'
  if(diff<3600)return`${Math.floor(diff/60)}m ago`
  if(diff<86400)return`${Math.floor(diff/3600)}h ago`
  return`${Math.floor(diff/86400)}d ago`
}

export default function ScrapeResults() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({})

  useEffect(()=>{
    supabase.from('scrape_results').select('*, sites(url,nickname,category)').order('scraped_at',{ascending:false}).limit(200)
      .then(({data,error})=>{ setResults(data||[]); setLoading(false) })
  },[])

  const filtered = results.filter(r=>{
    const q=search.toLowerCase()
    return !q||(r.sites?.url||'').includes(q)||(r.sites?.nickname||'').toLowerCase().includes(q)||(r.raw_text||'').toLowerCase().includes(q)||(r.page_url||'').includes(q)
  })

  // Group by site
  const grouped = {}
  filtered.forEach(r=>{
    const key=r.site_id||'unknown'
    if(!grouped[key])grouped[key]={site:r.sites,results:[]}
    grouped[key].results.push(r)
  })

  const toggle = (id)=>setExpanded(e=>({...e,[id]:!e[id]}))

  return(
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scrape Results</h1>
        <p className="text-sm text-gray-500 mt-0.5">{results.length} scrape records stored</p>
      </div>

      {results.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5"/>
          <div className="text-sm text-amber-800">
            <p className="font-semibold">No scrape results yet</p>
            <p className="mt-0.5 text-amber-700">Open a terminal → <code className="bg-amber-100 px-1 rounded font-mono">cd backend</code> → <code className="bg-amber-100 px-1 rounded font-mono">node index.js</code> — then go to <strong>Website Monitor</strong> and click <strong>Scrape All Now</strong>.</p>
          </div>
        </div>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by site or keyword..." className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"/>
      </div>

      {loading?(
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>
      ):Object.keys(grouped).length===0?(
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <Globe size={32} className="mx-auto mb-3 opacity-30"/>
          <p>No scrape results yet</p>
          <p className="text-sm mt-1">Trigger a scrape from the Website Monitor tab</p>
        </div>
      ):(
        <div className="space-y-3">
          {Object.entries(grouped).map(([key,{site,results:siteResults}])=>(
            <div key={key} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button onClick={()=>toggle(key)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <Globe size={16} className="text-gray-400"/>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800 text-sm">{site?.nickname||site?.url||'Unknown site'}</p>
                    <p className="text-xs text-gray-400">{site?.url} · {siteResults.length} scrape{siteResults.length!==1?'s':''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{timeAgo(siteResults[0]?.scraped_at)}</span>
                  {expanded[key]?<ChevronDown size={16} className="text-gray-400"/>:<ChevronRight size={16} className="text-gray-400"/>}
                </div>
              </button>
              {expanded[key]&&(
                <div className="border-t border-gray-100">
                  {siteResults.map(r=>(
                    <div key={r.id} className="px-5 py-4 border-b border-gray-50 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status==='success'?'bg-green-100 text-green-700':r.status==='failed'?'bg-red-100 text-red-600':'bg-gray-100 text-gray-500'}`}>{r.status}</span>
                          <span className="text-xs text-gray-400">{timeAgo(r.scraped_at)}</span>
                          {r.brands_detected?.length>0&&<span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full font-medium">{r.brands_detected.length} brands found</span>}
                        </div>
                        {r.page_url&&<a href={r.page_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-500 hover:underline flex items-center gap-1"><ExternalLink size={11}/>View page</a>}
                      </div>
                      {r.brands_detected?.length>0&&(
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {r.brands_detected.map(b=><span key={b} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{b}</span>)}
                        </div>
                      )}
                      {r.raw_text&&(
                        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 font-mono leading-relaxed line-clamp-4">{r.raw_text.slice(0,400)}{r.raw_text.length>400?'…':''}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
