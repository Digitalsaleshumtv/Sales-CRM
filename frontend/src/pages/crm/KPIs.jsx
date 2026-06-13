import { useEffect, useState } from 'react'
import { Plus, X, Target, TrendingUp, Award } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const TEAM = ['Hassan','Aamish','Zainab','Farhan','Mahnoor','Usman']
const PERIODS = ['Monthly','Quarterly','Annual']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(n){if(!n&&n!==0)return'—';if(n>=10000000)return`₨${(n/10000000).toFixed(1)}Cr`;if(n>=100000)return`₨${(n/100000).toFixed(1)}L`;return`₨${Number(n).toLocaleString()}`}
function pct(v,t){if(!t)return 0;return Math.min(Math.round((v/t)*100),100)}

export default function KPIs() {
  const [targets, setTargets] = useState([])
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const now = new Date()
  const curMonth = now.getMonth()+1
  const curYear = now.getFullYear()

  const [form, setForm] = useState({
    salesperson_name: TEAM[0], period_type: 'Monthly',
    year: curYear, month: curMonth, quarter: 1,
    revenue_target: '', deals_target: '', meetings_target: '', proposals_target: ''
  })

  useEffect(()=>{
    fetchAll()
  },[])

  async function fetchAll(){
    setLoading(true)
    const [t, d] = await Promise.all([
      supabase.from('sales_targets').select('*').order('year',{ascending:false}).order('month',{ascending:false}),
      supabase.from('deals').select('amount_pkr,status,assigned_to,created_at').in('status',['won','active']),
    ])
    setTargets(t.data||[])
    setDeals(d.data||[])
    setLoading(false)
  }

  async function save(e){
    e.preventDefault();setSaving(true)
    const payload={...form,year:Number(form.year),month:form.period_type==='Monthly'?Number(form.month):null,quarter:form.period_type==='Quarterly'?Number(form.quarter):null,revenue_target:Number(form.revenue_target)||null,deals_target:Number(form.deals_target)||null,meetings_target:Number(form.meetings_target)||null,proposals_target:Number(form.proposals_target)||null}
    const {error}=await supabase.from('sales_targets').insert([payload])
    if(!error){setShowModal(false);fetchAll()}else alert(error.message)
    setSaving(false)
  }

  // Monthly targets for current month
  const monthlyTargets = targets.filter(t=>t.period_type==='Monthly'&&t.month===curMonth&&t.year===curYear)

  // Actuals from deals this month
  function getActual(name){
    return deals.filter(d=>{
      const dm=new Date(d.created_at);
      return d.assigned_to===name&&dm.getMonth()+1===curMonth&&dm.getFullYear()===curYear
    }).reduce((s,d)=>s+(d.amount_pkr||0),0)
  }
  function getDealsCount(name){
    return deals.filter(d=>{
      const dm=new Date(d.created_at);
      return d.assigned_to===name&&dm.getMonth()+1===curMonth&&dm.getFullYear()===curYear&&d.status==='won'
    }).length
  }

  const teamStats = TEAM.map(name=>{
    const t = monthlyTargets.find(x=>x.salesperson_name===name)
    const revenue = getActual(name)
    const dealsWon = getDealsCount(name)
    return {name,t,revenue,dealsWon,revPct:pct(revenue,t?.revenue_target),dealsPct:pct(dealsWon,t?.deals_target)}
  })

  const totalTarget = monthlyTargets.reduce((s,t)=>s+(t.revenue_target||0),0)
  const totalActual = teamStats.reduce((s,m)=>s+m.revenue,0)
  const overallPct = pct(totalActual,totalTarget)

  return(
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Targets & KPIs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{MONTHS[curMonth-1]} {curYear} — Team Performance</p>
        </div>
        <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600"><Plus size={16}/> Set Target</button>
      </div>

      {/* Overall progress */}
      <div className="bg-gradient-to-r from-brand-500 to-brand-700 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium opacity-80">Team Revenue — {MONTHS[curMonth-1]}</p>
            <p className="text-3xl font-bold mt-1">{fmt(totalActual)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-80">Target</p>
            <p className="text-xl font-semibold">{fmt(totalTarget)||'Not set'}</p>
          </div>
        </div>
        <div className="bg-white/20 rounded-full h-3">
          <div className="h-3 rounded-full bg-white transition-all" style={{width:`${overallPct}%`}}/>
        </div>
        <p className="text-sm mt-2 opacity-80">{overallPct}% of monthly target achieved</p>
      </div>

      {/* Per-person cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamStats.map(m=>(
          <div key={m.name} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-sm">{m.name[0]}</div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{m.name}</p>
                  <p className="text-xs text-gray-400">Sales Executive</p>
                </div>
              </div>
              {m.revPct>=100&&<Award size={18} className="text-yellow-500"/>}
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Revenue</span>
                  <span className="font-medium text-gray-800">{fmt(m.revenue)} / {fmt(m.t?.revenue_target)||'No target'}</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${m.revPct>=100?'bg-green-500':m.revPct>=60?'bg-brand-500':'bg-orange-400'}`} style={{width:`${m.revPct}%`}}/>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 text-right">{m.revPct}%</p>
              </div>

              {m.t?.deals_target&&(
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Deals Won</span>
                    <span className="font-medium text-gray-800">{m.dealsWon} / {m.t.deals_target}</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${m.dealsPct>=100?'bg-green-500':'bg-blue-400'}`} style={{width:`${m.dealsPct}%`}}/>
                  </div>
                </div>
              )}
            </div>

            {!m.t&&<p className="text-xs text-gray-400 mt-3 italic">No target set for this month</p>}
          </div>
        ))}
      </div>

      {/* Targets history table */}
      {targets.length>0&&(
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-800">All Targets</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Person','Period','Revenue Target','Deals Target','Meetings Target'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {targets.map(t=>(
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{t.salesperson_name}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{t.period_type} · {t.month?MONTHS[t.month-1]+' ':''}{t.year}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{fmt(t.revenue_target)}</td>
                  <td className="px-4 py-3 text-gray-600">{t.deals_target||'—'}</td>
                  <td className="px-4 py-3 text-gray-600">{t.meetings_target||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Set Sales Target</h2>
              <button onClick={()=>setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18}/></button>
            </div>
            <form onSubmit={save} className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Person</label>
                  <select value={form.salesperson_name} onChange={e=>setForm({...form,salesperson_name:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {TEAM.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Period</label>
                  <select value={form.period_type} onChange={e=>setForm({...form,period_type:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {PERIODS.map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                  <input type="number" value={form.year} onChange={e=>setForm({...form,year:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"/>
                </div>
                {form.period_type==='Monthly'&&<div><label className="block text-xs font-medium text-gray-700 mb-1">Month</label>
                  <select value={form.month} onChange={e=>setForm({...form,month:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
                  </select>
                </div>}
                {form.period_type==='Quarterly'&&<div><label className="block text-xs font-medium text-gray-700 mb-1">Quarter</label>
                  <select value={form.quarter} onChange={e=>setForm({...form,quarter:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {[1,2,3,4].map(q=><option key={q} value={q}>Q{q}</option>)}
                  </select>
                </div>}
                {[['Revenue Target (PKR)','revenue_target'],['Deals Won Target','deals_target'],['Meetings Target','meetings_target'],['Proposals Target','proposals_target']].map(([l,k])=>(
                  <div key={k}><label className="block text-xs font-medium text-gray-700 mb-1">{l}</label>
                    <input type="number" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0"/>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-60">{saving?'Saving...':'Set Target'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
