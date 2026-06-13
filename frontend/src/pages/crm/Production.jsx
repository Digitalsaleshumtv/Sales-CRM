import { useEffect, useState } from 'react'
import { Plus, X, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const EXPENSE_TYPES = ['Crew','Equipment','Location','Post-Production','Talent','Misc']
const TYPE_COLORS = { Crew:'bg-blue-100 text-blue-700', Equipment:'bg-purple-100 text-purple-700', Location:'bg-green-100 text-green-700', 'Post-Production':'bg-orange-100 text-orange-700', Talent:'bg-pink-100 text-pink-700', Misc:'bg-gray-100 text-gray-600' }
function fmt(n){if(!n&&n!==0)return'—';if(n>=10000000)return`₨${(n/10000000).toFixed(1)}Cr`;if(n>=100000)return`₨${(n/100000).toFixed(1)}L`;return`₨${Number(n).toLocaleString()}`}

export default function Production() {
  const [expenses, setExpenses] = useState([])
  const [shows, setShows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [form, setForm] = useState({show_id:'',expense_type:EXPENSE_TYPES[0],vendor:'',date:new Date().toISOString().split('T')[0],amount:'',po_number:'',invoice_received:false,budget_code:'',notes:''})

  useEffect(()=>{
    fetchAll()
    supabase.from('shows').select('id,name,paid_drama_budget').order('name').then(({data})=>setShows(data||[]))
  },[])

  async function fetchAll(){
    setLoading(true)
    const {data}=await supabase.from('production_expenses').select('*, shows(name,paid_drama_budget)').order('date',{ascending:false})
    setExpenses(data||[])
    setLoading(false)
  }

  async function save(e){
    e.preventDefault();setSaving(true)
    const payload={...form,amount:Number(form.amount),show_id:form.show_id||null}
    const {error}=await supabase.from('production_expenses').insert([payload])
    if(!error){setShowModal(false);fetchAll()}else alert(error.message)
    setSaving(false)
  }

  const filtered=expenses.filter(e=>filterType==='all'||e.expense_type===filterType)
  const totalSpent=expenses.reduce((s,e)=>s+(e.amount||0),0)

  // Per show budget vs spent
  const showSummary=shows.map(sh=>{
    const spent=expenses.filter(e=>e.show_id===sh.id).reduce((s,e)=>s+(e.amount||0),0)
    return{...sh,spent,remaining:(sh.paid_drama_budget||0)-spent,over:spent>(sh.paid_drama_budget||0)}
  }).filter(sh=>sh.spent>0||sh.paid_drama_budget)

  return(
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Production Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Total spent: <strong>{fmt(totalSpent)}</strong></p>
        </div>
        <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600"><Plus size={16}/>Add Expense</button>
      </div>

      {showSummary.length>0&&(
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {showSummary.map(sh=>(
            <div key={sh.id} className={`rounded-xl border p-4 ${sh.over?'bg-red-50 border-red-200':'bg-white border-gray-200'}`}>
              <p className="font-medium text-gray-900 text-sm">{sh.name}</p>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Budget</span><span className="font-medium">{fmt(sh.paid_drama_budget)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Spent</span><span className="font-medium">{fmt(sh.spent)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Remaining</span><span className={`font-semibold ${sh.over?'text-red-600':'text-green-600'}`}>{sh.over?`Over by ${fmt(Math.abs(sh.remaining))}`:fmt(sh.remaining)}</span></div>
              </div>
              {sh.paid_drama_budget>0&&(
                <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${sh.over?'bg-red-500':'bg-brand-500'}`} style={{width:`${Math.min((sh.spent/sh.paid_drama_budget)*100,100)}%`}}/>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {['all',...EXPENSE_TYPES].map(t=>(
          <button key={t} onClick={()=>setFilterType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterType===t?'bg-brand-500 text-white border-brand-500':'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{t==='all'?'All':t}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading?<div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>
        :filtered.length===0?<div className="text-center py-16 text-gray-400"><p>No expenses yet</p></div>
        :(
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Show','Type','Vendor','Date','Amount','PO Number','Invoice','Notes'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(e=>(
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800 text-xs">{e.shows?.name||'—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[e.expense_type]}`}>{e.expense_type}</span></td>
                  <td className="px-4 py-3 text-gray-700">{e.vendor||'—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{e.date}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{fmt(e.amount)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{e.po_number||'—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${e.invoice_received?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{e.invoice_received?'Received':'Pending'}</span></td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[150px] truncate">{e.notes||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Add Production Expense</h2>
              <button onClick={()=>setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18}/></button>
            </div>
            <form onSubmit={save} className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Show</label>
                  <select value={form.show_id} onChange={e=>setForm({...form,show_id:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Select show...</option>{shows.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.expense_type} onChange={e=>setForm({...form,expense_type:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {EXPENSE_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"/>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Vendor</label>
                  <input value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Vendor name"/>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Amount (PKR) *</label>
                  <input required type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0"/>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">PO Number</label>
                  <input value={form.po_number} onChange={e=>setForm({...form,po_number:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"/>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="inv" checked={form.invoice_received} onChange={e=>setForm({...form,invoice_received:e.target.checked})} className="rounded"/>
                  <label htmlFor="inv" className="text-sm text-gray-700">Invoice Received</label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-60">{saving?'Saving...':'Add Expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
