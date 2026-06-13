import { useEffect, useState } from 'react'
import { Plus, X, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const MODES = ['Flight','Train','Car','Bus','Other']
function fmt(n) { if(!n&&n!==0)return'—'; if(n>=100000)return`₨${(n/100000).toFixed(1)}L`; return`₨${Number(n).toLocaleString()}` }

export default function Travel() {
  const [records, setRecords] = useState([])
  const [users, setUsers] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({user_id:'',start_date:today,end_date:today,destination:'',purpose:'',client_id:'',mode:'Flight',accommodation:0,transport:0,meals:0,budget:'',notes:''})

  useEffect(() => {
    fetchAll()
    supabase.from('users').select('id,name').then(({data})=>setUsers(data||[]))
    supabase.from('clients').select('id,name').order('name').then(({data})=>setClients(data||[]))
  },[])

  async function fetchAll() {
    setLoading(true)
    const {data} = await supabase.from('travel_records').select('*, users(name), clients(name)').order('start_date',{ascending:false})
    setRecords(data||[])
    setLoading(false)
  }

  async function save(e) {
    e.preventDefault(); setSaving(true)
    const payload = {...form, accommodation:Number(form.accommodation)||0, transport:Number(form.transport)||0, meals:Number(form.meals)||0, budget:form.budget?Number(form.budget):null, client_id:form.client_id||null, user_id:form.user_id||null}
    const {error} = await supabase.from('travel_records').insert([payload])
    if(!error){setShowModal(false);fetchAll()}else alert(error.message)
    setSaving(false)
  }

  function exportCSV() {
    const rows=[['Traveler','Dates','Destination','Purpose','Client','Mode','Accommodation','Transport','Meals','Total','Budget','Over/Under']]
    records.forEach(r=>{
      const total=(r.accommodation||0)+(r.transport||0)+(r.meals||0)
      rows.push([r.users?.name,`${r.start_date} to ${r.end_date}`,r.destination,r.purpose,r.clients?.name||'',r.mode,r.accommodation,r.transport,r.meals,total,r.budget||'',r.budget?total-r.budget:''])
    })
    const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'})
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='travel.csv';a.click()
  }

  const ytdTotal = records.reduce((s,r)=>{
    const y=new Date(r.start_date).getFullYear()
    return y===new Date().getFullYear()?s+(r.accommodation||0)+(r.transport||0)+(r.meals||0):s
  },0)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Travel Budget</h1>
          <p className="text-sm text-gray-500 mt-0.5">YTD: <span className="font-semibold text-gray-700">{fmt(ytdTotal)}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"><Download size={15}/> Export</button>
          <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600"><Plus size={16}/> Add Record</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading?<div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>
        :records.length===0?<div className="text-center py-16 text-gray-400"><p>No travel records yet</p></div>
        :(
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Traveler','Dates','Destination','Purpose','Client','Mode','Accommodation','Transport','Meals','Total','Budget','Over/Under'].map(h=>
                <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              )}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map(r=>{
                const total=(r.accommodation||0)+(r.transport||0)+(r.meals||0)
                const diff=r.budget?total-r.budget:null
                return(
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-medium text-gray-800">{r.users?.name||'—'}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{r.start_date}<br/>{r.end_date}</td>
                    <td className="px-3 py-3 text-gray-700">{r.destination||'—'}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs max-w-[120px] truncate">{r.purpose||'—'}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{r.clients?.name||'—'}</td>
                    <td className="px-3 py-3 text-xs"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{r.mode}</span></td>
                    <td className="px-3 py-3 text-gray-600">{fmt(r.accommodation)}</td>
                    <td className="px-3 py-3 text-gray-600">{fmt(r.transport)}</td>
                    <td className="px-3 py-3 text-gray-600">{fmt(r.meals)}</td>
                    <td className="px-3 py-3 font-semibold text-gray-800">{fmt(total)}</td>
                    <td className="px-3 py-3 text-gray-500">{fmt(r.budget)}</td>
                    <td className="px-3 py-3"><span className={`text-xs font-medium ${diff===null?'text-gray-300':diff>0?'text-red-600':'text-green-600'}`}>{diff===null?'—':diff>0?`+${fmt(diff)}`:fmt(diff)}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Add Travel Record</h2>
              <button onClick={()=>setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18}/></button>
            </div>
            <form onSubmit={save} className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Traveler</label>
                  <select value={form.user_id} onChange={e=>setForm({...form,user_id:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Select...</option>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Mode</label>
                  <select value={form.mode} onChange={e=>setForm({...form,mode:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {MODES.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"/>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"/>
                </div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Destination *</label>
                  <input required value={form.destination} onChange={e=>setForm({...form,destination:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Lahore"/>
                </div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Purpose</label>
                  <input value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Client meeting — Nestle"/>
                </div>
                {[['Accommodation (PKR)','accommodation'],['Transport (PKR)','transport'],['Meals (PKR)','meals'],['Approved Budget (PKR)','budget']].map(([l,k])=>(
                  <div key={k}><label className="block text-xs font-medium text-gray-700 mb-1">{l}</label>
                    <input type="number" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0"/>
                  </div>
                ))}
                {form.accommodation&&form.transport&&form.meals?<div className="col-span-2 bg-gray-50 rounded-lg p-3 text-sm">
                  Total: <strong>{fmt(Number(form.accommodation)+Number(form.transport)+Number(form.meals))}</strong>
                  {form.budget&&<span className={`ml-3 ${Number(form.accommodation)+Number(form.transport)+Number(form.meals)>Number(form.budget)?'text-red-600':'text-green-600'}`}>
                    ({Number(form.accommodation)+Number(form.transport)+Number(form.meals)>Number(form.budget)?'Over':'Under'} budget by {fmt(Math.abs(Number(form.accommodation)+Number(form.transport)+Number(form.meals)-Number(form.budget)))})
                  </span>}
                </div>:null}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-60">{saving?'Saving...':'Add Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
