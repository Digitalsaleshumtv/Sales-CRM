import { useEffect, useState } from 'react'
import { Plus, X, CheckCircle, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const DELIVERABLE_TYPES = ['Promo Video','Episode Upload','Short Clip Extract','Mind-Roll Reel','Branded Post','Announcement Post','Website Banner Impressions','Homepage Takeover','Logo on Thumbnail','Logo on Title Card','Logo on End Slate','Product Placement','Scene Integration','Podcast Episode','Webseries Episode','Native Article','Press Release','Morning Show Integration','Media Wall Logo','Backdrop Branding']
const STATUSES = ['Pending','In Progress','Delivered','Delayed']
const STATUS_COLORS = {
  Pending: 'bg-gray-100 text-gray-600',
  'In Progress': 'bg-blue-100 text-blue-700',
  Delivered: 'bg-green-100 text-green-700',
  Delayed: 'bg-red-100 text-red-600',
}

function fmt(n) { return n != null ? `${n}` : '—' }

export default function Deliverables() {
  const [deliverables, setDeliverables] = useState([])
  const [deals, setDeals] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [form, setForm] = useState(defaultForm())

  function defaultForm() {
    return { deal_id: '', client_id: '', type: DELIVERABLE_TYPES[0], platform: '', channel: '', qty_committed: 1, qty_delivered: 0, due_date: '', status: 'Pending', proof_url: '', notes: '' }
  }

  useEffect(() => {
    fetchAll()
    supabase.from('deals').select('id,name').order('name').then(({data}) => setDeals(data||[]))
    supabase.from('clients').select('id,name').order('name').then(({data}) => setClients(data||[]))
  }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase.from('deliverables').select('*, deals(name), clients(name)').order('due_date')
    setDeliverables(data || [])
    setLoading(false)
  }

  async function save(e) {
    e.preventDefault(); setSaving(true)
    const payload = { ...form, qty_committed: Number(form.qty_committed), qty_delivered: Number(form.qty_delivered) }
    const { error } = await supabase.from('deliverables').insert([payload])
    if (!error) { setShowModal(false); setForm(defaultForm()); fetchAll() }
    else alert(error.message)
    setSaving(false)
  }

  async function markDelivered(id) {
    await supabase.from('deliverables').update({ status: 'Delivered', delivered_date: new Date().toISOString().split('T')[0] }).eq('id', id)
    fetchAll()
  }

  const filtered = deliverables.filter(d => filterStatus === 'all' || d.status === filterStatus)
  const pending = deliverables.filter(d => d.status === 'Pending').length
  const delayed = deliverables.filter(d => d.status === 'Delayed').length
  const delivered = deliverables.filter(d => d.status === 'Delivered').length

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deliverables</h1>
          <div className="flex gap-4 mt-1 text-sm">
            <span className="text-yellow-600 font-medium">{pending} pending</span>
            <span className="text-red-500 font-medium">{delayed} delayed</span>
            <span className="text-green-600 font-medium">{delivered} delivered</span>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
          <Plus size={16}/> Add Deliverable
        </button>
      </div>

      <div className="flex gap-2">
        {['all',...STATUSES].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterStatus===s?'bg-brand-500 text-white border-brand-500':'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {s==='all'?'All':s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/></div>
        : filtered.length === 0 ? <div className="text-center py-16 text-gray-400"><p>No deliverables found</p></div>
        : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Deal','Client','Type','Channel','Committed','Delivered','Due Date','Status','Proof',''].map(h =>
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              )}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(d => (
                <tr key={d.id} className={`hover:bg-gray-50 ${d.status==='Delayed'?'bg-red-50':''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800 text-xs">{d.deals?.name||'—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{d.clients?.name||'—'}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs">{d.type}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{d.channel||d.platform||'—'}</td>
                  <td className="px-4 py-3 text-center font-medium">{d.qty_committed}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-medium ${d.qty_delivered>=d.qty_committed?'text-green-600':'text-orange-500'}`}>{d.qty_delivered}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{d.due_date||'—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status]}`}>{d.status}</span></td>
                  <td className="px-4 py-3">
                    {d.proof_url ? <a href={d.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-500 hover:underline">View</a> : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {d.status !== 'Delivered' && (
                      <button onClick={() => markDelivered(d.id)} className="text-xs text-green-600 hover:underline flex items-center gap-1">
                        <CheckCircle size={12}/> Done
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Add Deliverable</h2>
              <button onClick={()=>setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18}/></button>
            </div>
            <form onSubmit={save} className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Deal</label>
                  <select value={form.deal_id} onChange={e=>setForm({...form,deal_id:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Select...</option>{deals.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Client</label>
                  <select value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Select...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
                  <select required value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {DELIVERABLE_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Channel / Platform</label>
                  <input value={form.channel} onChange={e=>setForm({...form,channel:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. HUM TV"/>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"/>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Qty Committed</label>
                  <input type="number" min="1" value={form.qty_committed} onChange={e=>setForm({...form,qty_committed:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"/>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {STATUSES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Proof URL</label>
                  <input value={form.proof_url} onChange={e=>setForm({...form,proof_url:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="https://..."/>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-60">{saving?'Saving...':'Add Deliverable'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
