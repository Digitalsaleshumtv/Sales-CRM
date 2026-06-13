import { useEffect, useState } from 'react'
import { Plus, X, Send, Mail, Clock, CheckCircle, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const TEMPLATES = [
  { label:'Intro Pitch', body:`Dear [Name],\n\nI hope this message finds you well. I'm reaching out from HUM TV's Digital Sales team to introduce an exciting sponsorship opportunity for [Brand] on [Show].\n\nHUM TV reaches over 50 million viewers across Pakistan and internationally, making it the ideal platform to amplify your brand's message.\n\nI'd love to schedule a brief call to walk you through our current packages.\n\nWarm regards,\n[Your Name]\nHUM TV Digital Sales` },
  { label:'Follow Up', body:`Hi [Name],\n\nJust following up on my earlier email regarding the sponsorship proposal for [Show].\n\nHave you had a chance to review it? I'm happy to customise the package further to align with your campaign objectives.\n\nLooking forward to your feedback.\n\nBest,\n[Your Name]` },
  { label:'Rate Card', body:`Dear [Name],\n\nAs requested, please find attached our updated rate card for HUM TV, Masala TV, and HUM News.\n\nHighlights:\n• Drama Sponsorship (Presenting): ₨25L/episode\n• Social Media Posts: From ₨80K/post\n• Website Banners: From ₨50K CPM\n\nAll rates are exclusive of GST (18%). Volume discounts available.\n\nPlease let me know if you'd like a custom proposal.\n\nRegards,\n[Your Name]` },
  { label:'Post-Meeting', body:`Hi [Name],\n\nThank you for taking the time to meet with us today. It was great discussing how HUM TV can support [Brand]'s upcoming campaign.\n\nAs discussed, I'll send over a tailored proposal by [Date].\n\nIn the meantime, please feel free to reach out with any questions.\n\nBest regards,\n[Your Name]` },
]

const STATUS_COLORS = { sent:'bg-green-100 text-green-700', draft:'bg-gray-100 text-gray-600', scheduled:'bg-blue-100 text-blue-700', bounced:'bg-red-100 text-red-600' }

export default function Email() {
  const [logs, setLogs] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')

  const [form, setForm] = useState({client_id:'',recipient_name:'',recipient_email:'',subject:'',body:'',status:'sent',sent_at:new Date().toISOString().split('T')[0]})

  useEffect(()=>{
    fetchAll()
    supabase.from('clients').select('id,name,contact_email,contact_name').order('name').then(({data})=>setClients(data||[]))
  },[])

  async function fetchAll(){
    setLoading(true)
    const {data}=await supabase.from('email_logs').select('*, clients(name)').order('sent_at',{ascending:false})
    setLogs(data||[])
    setLoading(false)
  }

  function applyTemplate(t){
    setForm(f=>({...f,body:t.body,subject:t.label+' — HUM TV'}))
  }

  function selectClient(id){
    const c=clients.find(x=>x.id===id)
    setForm(f=>({...f,client_id:id,recipient_email:c?.contact_email||'',recipient_name:c?.contact_name||''}))
  }

  async function aiDraft(){
    if(!aiPrompt.trim())return
    setAiLoading(true)
    // Simulate AI response (real Anthropic API call goes through backend)
    await new Promise(r=>setTimeout(r,1000))
    const draft=`Dear [Name],\n\n${aiPrompt}\n\nI'd love the opportunity to discuss how HUM TV can help [Brand] achieve its marketing goals. Our platform delivers unmatched reach across drama, news, and digital channels.\n\nPlease let me know a convenient time to connect.\n\nWarm regards,\n[Your Name]\nHUM TV Digital Sales`
    setForm(f=>({...f,body:draft}))
    setAiLoading(false)
  }

  async function save(e){
    e.preventDefault();setSaving(true)
    const payload={...form,client_id:form.client_id||null}
    const {error}=await supabase.from('email_logs').insert([payload])
    if(!error){setShowModal(false);setForm({client_id:'',recipient_name:'',recipient_email:'',subject:'',body:'',status:'sent',sent_at:new Date().toISOString().split('T')[0]});fetchAll()}
    else alert(error.message)
    setSaving(false)
  }

  const sent=logs.filter(l=>l.status==='sent').length
  const drafts=logs.filter(l=>l.status==='draft').length

  return(
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email & Outreach</h1>
          <p className="text-sm text-gray-500 mt-0.5"><span className="text-green-600 font-medium">{sent} sent</span> · <span className="text-gray-500">{drafts} draft{drafts!==1?'s':''}</span></p>
        </div>
        <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600"><Plus size={16}/> Log Email</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading?<div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>
        :logs.length===0?<div className="text-center py-16 text-gray-400"><Mail size={32} className="mx-auto mb-3 opacity-30"/><p>No emails logged yet</p><p className="text-sm mt-1">Use the "Log Email" button to track outreach</p></div>
        :(
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Date','To','Client','Subject','Status'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map(l=>(
                <tr key={l.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 text-gray-500 text-xs">{l.sent_at}</td>
                  <td className="px-4 py-3"><p className="font-medium text-gray-800 text-xs">{l.recipient_name||'—'}</p><p className="text-gray-400 text-xs">{l.recipient_email||''}</p></td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{l.clients?.name||'—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-700 max-w-[250px] truncate">{l.subject||'—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[l.status]||'bg-gray-100 text-gray-600'}`}>{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Log / Draft Email</h2>
              <button onClick={()=>setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18}/></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Quick templates */}
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Quick Templates</p>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map(t=>(
                    <button key={t.label} type="button" onClick={()=>applyTemplate(t)} className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:border-brand-300">{t.label}</button>
                  ))}
                </div>
              </div>

              {/* AI draft */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-4">
                <div className="flex items-center gap-2 mb-2"><Sparkles size={14} className="text-purple-500"/><p className="text-xs font-semibold text-purple-700">AI Draft Assistant</p></div>
                <div className="flex gap-2">
                  <input value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} placeholder="e.g. Pitch Nestle for Ramzan drama sponsorship" className="flex-1 border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"/>
                  <button type="button" onClick={aiDraft} disabled={aiLoading||!aiPrompt.trim()} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1">
                    {aiLoading?<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<Sparkles size={14}/>}{aiLoading?'Drafting...':'Draft'}
                  </button>
                </div>
              </div>

              <form onSubmit={save} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Client</label>
                    <select value={form.client_id} onChange={e=>selectClient(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                      <option value="">Select client...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                      {['sent','draft','scheduled','bounced'].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Recipient Name</label>
                    <input value={form.recipient_name} onChange={e=>setForm({...form,recipient_name:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="John Smith"/>
                  </div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Recipient Email</label>
                    <input type="email" value={form.recipient_email} onChange={e=>setForm({...form,recipient_email:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="john@brand.com"/>
                  </div>
                  <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Subject *</label>
                    <input required value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="HUM TV Sponsorship Opportunity — [Show Name]"/>
                  </div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" value={form.sent_at} onChange={e=>setForm({...form,sent_at:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"/>
                  </div>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Email Body</label>
                  <textarea rows={8} value={form.body} onChange={e=>setForm({...form,body:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono" placeholder="Email content..."/>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={()=>setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-60 flex items-center justify-center gap-2">
                    <Send size={14}/>{saving?'Saving...':'Log Email'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
