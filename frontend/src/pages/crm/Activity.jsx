import { useEffect, useState } from 'react'
import { Bell, Info, DollarSign, Users, FileText, Calendar, TrendingUp, Phone } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const TYPE_ICONS = {
  deal:    <DollarSign size={14}/>,
  client:  <Users size={14}/>,
  invoice: <FileText size={14}/>,
  meeting: <Calendar size={14}/>,
  followup:<Bell size={14}/>,
  call:    <Phone size={14}/>,
  kpi:     <TrendingUp size={14}/>,
  system:  <Info size={14}/>,
}
const TYPE_COLORS = {
  deal:    'bg-green-100 text-green-700',
  client:  'bg-blue-100 text-blue-700',
  invoice: 'bg-orange-100 text-orange-700',
  meeting: 'bg-purple-100 text-purple-700',
  followup:'bg-yellow-100 text-yellow-700',
  call:    'bg-rose-100 text-rose-600',
  kpi:     'bg-pink-100 text-pink-700',
  system:  'bg-gray-100 text-gray-600',
}

function timeAgo(ts){
  const diff=Math.floor((Date.now()-new Date(ts))/1000)
  if(diff<60)return'just now'
  if(diff<3600)return`${Math.floor(diff/60)}m ago`
  if(diff<86400)return`${Math.floor(diff/3600)}h ago`
  return`${Math.floor(diff/86400)}d ago`
}

export default function Activity() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(()=>{
    fetchAll()
  },[])

  async function fetchAll(){
    setLoading(true)
    // Pull from multiple tables and merge into a timeline
    const [deals, clients, invoices, meetings, followups, calls] = await Promise.all([
      supabase.from('deals').select('id,name,status,created_at,amount_pkr').order('created_at',{ascending:false}).limit(20),
      supabase.from('clients').select('id,name,created_at,type').order('created_at',{ascending:false}).limit(20),
      supabase.from('invoices').select('id,invoice_number,status,created_at,total_pkr').order('created_at',{ascending:false}).limit(20),
      supabase.from('meeting_logs').select('id,subject,meeting_date,attendees').order('meeting_date',{ascending:false}).limit(20),
      supabase.from('follow_ups').select('id,note,due_date,status,created_at').order('created_at',{ascending:false}).limit(20),
      supabase.from('call_reports').select('id,rep_name,customer_name,call_type,call_status,deal_amount,report_date,created_at').order('created_at',{ascending:false}).limit(30),
    ])

    const all = [
      ...(deals.data||[]).map(d=>({id:`deal-${d.id}`,type:'deal',title:`Deal: ${d.name}`,subtitle:`₨${Number(d.amount_pkr||0).toLocaleString()} · ${d.status}`,ts:d.created_at})),
      ...(clients.data||[]).map(c=>({id:`client-${c.id}`,type:'client',title:`New ${c.type||'client'}: ${c.name}`,subtitle:'Added to CRM',ts:c.created_at})),
      ...(invoices.data||[]).map(i=>({id:`inv-${i.id}`,type:'invoice',title:`Invoice ${i.invoice_number||'#'} — ${i.status}`,subtitle:`₨${Number(i.total_pkr||0).toLocaleString()}`,ts:i.created_at})),
      ...(meetings.data||[]).map(m=>({id:`mtg-${m.id}`,type:'meeting',title:`Meeting: ${m.subject||'—'}`,subtitle:m.attendees||'',ts:m.meeting_date})),
      ...(followups.data||[]).map(f=>({id:`fu-${f.id}`,type:'followup',title:`Follow-up: ${f.note?.slice(0,50)||'—'}`,subtitle:`Due: ${f.due_date} · ${f.status}`,ts:f.created_at})),
      ...(calls.data||[]).map(c=>({id:`call-${c.id}`,type:'call',title:`${c.rep_name} called ${c.customer_name}`,subtitle:`${c.call_type} · ${c.call_status}${c.deal_amount?` · ₨${Number(c.deal_amount).toLocaleString()}`:''}`,ts:c.created_at})),
    ].sort((a,b)=>new Date(b.ts)-new Date(a.ts))

    setEvents(all)
    setLoading(false)
  }

  const types = ['all','call','deal','client','invoice','meeting','followup']
  const filtered = filter==='all'?events:events.filter(e=>e.type===filter)

  // Group by date
  const grouped = {}
  filtered.forEach(e=>{
    const d = e.ts?new Date(e.ts).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'}):'Unknown'
    if(!grouped[d])grouped[d]=[]
    grouped[d].push(e)
  })

  return(
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
          <p className="text-sm text-gray-500 mt-0.5">{events.length} recent events across all modules</p>
        </div>
        <button onClick={fetchAll} className="text-sm text-brand-500 hover:underline">Refresh</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {types.map(t=>(
          <button key={t} onClick={()=>setFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${filter===t?'bg-brand-500 text-white border-brand-500':'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{t==='all'?'All':t+'s'}</button>
        ))}
      </div>

      {loading?(
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>
      ):filtered.length===0?(
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <Bell size={32} className="mx-auto mb-3 opacity-30"/>
          <p>No activity yet</p>
          <p className="text-sm mt-1">Activity will appear here as you use the CRM</p>
        </div>
      ):(
        <div className="space-y-6">
          {Object.entries(grouped).map(([date,items])=>(
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{date}</span>
                <div className="flex-1 border-t border-gray-100"/>
              </div>
              <div className="space-y-2">
                {items.map(e=>(
                  <div key={e.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${TYPE_COLORS[e.type]}`}>
                      {TYPE_ICONS[e.type]||<Info size={14}/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{e.title}</p>
                      {e.subtitle&&<p className="text-xs text-gray-400 truncate mt-0.5">{e.subtitle}</p>}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(e.ts)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
