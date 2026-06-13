import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { downloadExcel } from '../../lib/exportExcel'

const INDUSTRIES = ['FMCG','Telecom','Banking & Finance','Automotive','Real Estate','Retail','Healthcare','Education','Fashion & Apparel','Food & Beverage','Technology','Media & Entertainment','Energy & Utilities','Travel & Tourism','Insurance','Construction','Agriculture','E-commerce','Pharmaceuticals','Other']
const COLORS = ['#c0392b','#e74c3c','#e67e22','#f39c12','#2ecc71','#27ae60','#3498db','#2980b9','#9b59b6','#8e44ad','#1abc9c','#16a085','#d35400','#e91e63','#34495e','#7f8c8d','#2c3e50','#ff5722','#795548','#607d8b']

function fmt(n){if(!n&&n!==0)return'—';if(n>=10000000)return`₨${(n/10000000).toFixed(1)}Cr`;if(n>=100000)return`₨${(n/100000).toFixed(1)}L`;return`₨${Number(n).toLocaleString()}`}

function ChartToggle({ value, onChange, options }) {
  return (
    <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${value === o ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          {o}
        </button>
      ))}
    </div>
  )
}

export default function Industries() {
  const [deals, setDeals] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [industryChartType, setIndustryChartType] = useState('Pie')
  const [regionChartType, setRegionChartType] = useState('Bar')

  useEffect(()=>{
    Promise.all([
      supabase.from('deals').select('amount_pkr,status,client_id,clients(industry)').in('status',['won','active']),
      supabase.from('clients').select('id,name,industry,status,region').eq('status','active'),
    ]).then(([{data:d},{data:c}])=>{
      setDeals(d||[])
      setClients(c||[])
      setLoading(false)
    })
  },[])

  const totalRevenue = deals.reduce((s,d)=>s+(d.amount_pkr||0),0)
  const activeClients = clients.length

  const revByIndustry = INDUSTRIES.map((ind,i)=>{
    const rev = deals.filter(d=>d.clients?.industry===ind).reduce((s,d)=>s+(d.amount_pkr||0),0)
    const count = clients.filter(c=>c.industry===ind).length
    return {name:ind,revenue:rev,clients:count,color:COLORS[i%COLORS.length]}
  }).filter(x=>x.revenue>0||x.clients>0).sort((a,b)=>b.revenue-a.revenue)

  const pieData = revByIndustry.filter(x=>x.clients>0).slice(0,8)

  const regionMap = {}
  clients.forEach(c=>{ const r=c.region||'Unknown'; regionMap[r]=(regionMap[r]||0)+1 })
  const regionData = Object.entries(regionMap).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)

  if(loading) return <div className="flex items-center justify-center py-32"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>

  return(
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Industry Intelligence</h1>
        <p className="text-sm text-gray-500 mt-0.5">{activeClients} active clients · {fmt(totalRevenue)} total pipeline</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Clients by Industry</h2>
            <ChartToggle value={industryChartType} onChange={setIndustryChartType} options={['Pie','Bar']} />
          </div>
          {pieData.length===0?<div className="text-center text-gray-400 py-12">No client data yet</div>:
            industryChartType === 'Pie' ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="clients" paddingAngle={3}>
                      {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                    </Pie>
                    <Tooltip formatter={(v)=>[`${v} clients`]}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5 text-xs">
                  {pieData.map((e,i)=>(
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:e.color}}/>
                        <span className="text-gray-600 truncate max-w-[120px]">{e.name}</span>
                      </div>
                      <span className="font-medium text-gray-800 ml-2">{e.clients}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pieData} layout="vertical" margin={{left:10,right:20}}>
                  <XAxis type="number" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" tick={{fontSize:11}} width={120} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={v=>[`${v} clients`]}/>
                  <Bar dataKey="clients" radius={[0,4,4,0]}>
                    {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Clients by Region</h2>
            <ChartToggle value={regionChartType} onChange={setRegionChartType} options={['Bar','Pie']} />
          </div>
          {regionData.length===0?<div className="text-center text-gray-400 py-12">No region data yet</div>:
            regionChartType === 'Bar' ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={regionData} layout="vertical" margin={{left:10,right:20}}>
                  <XAxis type="number" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" tick={{fontSize:11}} width={80} axisLine={false} tickLine={false}/>
                  <Tooltip/>
                  <Bar dataKey="value" fill="#c0392b" radius={[0,4,4,0]} name="Clients"/>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={regionData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {regionData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={(v)=>[`${v} clients`]}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5 text-xs">
                  {regionData.map((e,i)=>(
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:COLORS[i%COLORS.length]}}/>
                        <span className="text-gray-600">{e.name}</span>
                      </div>
                      <span className="font-medium text-gray-800 ml-2">{e.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </div>
      </div>

      {revByIndustry.filter(x=>x.revenue>0).length>0&&(
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Revenue by Industry</h2>
          <div className="space-y-3">
            {revByIndustry.filter(x=>x.revenue>0).map((ind,i)=>{
              const pct=totalRevenue>0?(ind.revenue/totalRevenue)*100:0
              return(
                <div key={ind.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{ind.name}</span>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>{ind.clients} clients</span>
                      <span className="font-semibold text-gray-800">{fmt(ind.revenue)}</span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{width:`${pct}%`,background:ind.color}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">All Industries</h2>
          <button onClick={() => downloadExcel(
            revByIndustry.map(r => ({ Industry: r.name, 'Active Clients': r.clients, 'Pipeline Revenue (PKR)': r.revenue })),
            'Industries', 'Industries'
          )} className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50">
            <Download size={13}/> Export Excel
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{['Industry','Active Clients','Pipeline Revenue','Share'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {INDUSTRIES.map((ind,i)=>{
              const row = revByIndustry.find(r=>r.name===ind)||{revenue:0,clients:0,color:COLORS[i%COLORS.length]}
              const pct = totalRevenue>0&&row.revenue>0?((row.revenue/totalRevenue)*100).toFixed(1):0
              return(
                <tr key={ind} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{background:COLORS[i%COLORS.length]}}/><span className="font-medium text-gray-800">{ind}</span></div></td>
                  <td className="px-4 py-3 text-gray-600">{row.clients||0}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{row.revenue>0?fmt(row.revenue):'—'}</td>
                  <td className="px-4 py-3">{pct>0?<div className="flex items-center gap-2"><div className="bg-gray-100 rounded-full h-1.5 w-24"><div className="h-1.5 rounded-full bg-brand-500" style={{width:`${Math.min(Number(pct),100)}%`}}/></div><span className="text-xs text-gray-500">{pct}%</span></div>:'—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
