import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Phone, Mail, MapPin, DollarSign, Briefcase, MessageSquare, Calendar, FileText, Tag } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const STATUS_COLORS = {
  Prospecting: 'bg-gray-100 text-gray-600',
  'Pitch Sent': 'bg-blue-100 text-blue-700',
  'In Negotiation': 'bg-yellow-100 text-yellow-700',
  'Under Process': 'bg-orange-100 text-orange-700',
  Locked: 'bg-purple-100 text-purple-700',
  'RO Received': 'bg-indigo-100 text-indigo-700',
  Billed: 'bg-green-100 text-green-700',
  'Sent to Finance': 'bg-teal-100 text-teal-700',
  Completed: 'bg-green-200 text-green-800',
  Cancelled: 'bg-red-100 text-red-600',
}

const INV_COLORS = { Unpaid: 'bg-gray-100 text-gray-600', Partial: 'bg-yellow-100 text-yellow-700', Paid: 'bg-green-100 text-green-700', Overdue: 'bg-red-100 text-red-600' }
const FU_COLORS  = { Pending: 'bg-yellow-100 text-yellow-700', Done: 'bg-green-100 text-green-700', Overdue: 'bg-red-100 text-red-600' }

function fmt(n) {
  if (!n) return '—'
  if (n >= 1e7) return `₨${(n/1e7).toFixed(2)}Cr`
  if (n >= 1e5) return `₨${(n/1e5).toFixed(2)}L`
  return `₨${Number(n).toLocaleString()}`
}

function StatBox({ label, value, sub, accent }) {
  return (
    <div className={`rounded-xl p-4 border ${accent || 'bg-white border-gray-200'}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

const TABS = ['Deals', 'Follow-ups', 'Meetings', 'Invoices']

export default function ClientProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient]   = useState(null)
  const [deals, setDeals]     = useState([])
  const [followUps, setFUs]   = useState([])
  const [meetings, setMeets]  = useState([])
  const [invoices, setInvs]   = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('Deals')

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    setLoading(true)
    const [{ data: c }, { data: d }, { data: fu }, { data: ml }, { data: inv }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('deals').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('follow_ups').select('*, deals(name)').eq('client_id', id).order('follow_up_date', { ascending: false }),
      supabase.from('meeting_logs').select('*, deals(name)').eq('client_id', id).order('meeting_date', { ascending: false }),
      supabase.from('invoices').select('*, deals(name)').eq('client_id', id).order('invoice_date', { ascending: false }),
    ])
    setClient(c)
    setDeals(d || [])
    setFUs((fu || []).map(f => ({ ...f, status: f.status === 'Pending' && f.follow_up_date < new Date().toISOString().split('T')[0] ? 'Overdue' : f.status })))
    setMeets(ml || [])
    setInvs(inv || [])
    setLoading(false)
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!client) return (
    <div className="p-6 text-center text-gray-400">
      <p>Client not found.</p>
      <button onClick={() => navigate('/crm/clients')} className="text-brand-500 hover:underline mt-2 text-sm">← Back to clients</button>
    </div>
  )

  const totalDealsValue   = deals.reduce((s, d) => s + (d.value_net || 0), 0)
  const pipelineValue     = deals.filter(d => !['Completed','Cancelled','Billed','Sent to Finance'].includes(d.status)).reduce((s, d) => s + (d.value_net || 0), 0)
  const totalInvoiced     = invoices.reduce((s, i) => s + (i.amount_gross || 0), 0)
  const outstanding       = invoices.reduce((s, i) => s + ((i.amount_gross || 0) - (i.amount_received || 0)), 0)
  const overdueFollowUps  = followUps.filter(f => f.status === 'Overdue').length

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Back + header */}
      <div>
        <button onClick={() => navigate('/crm/clients')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors">
          <ArrowLeft size={15} /> Back to Clients
        </button>

        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {client.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${client.type === 'agency' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                {client.type === 'agency' ? 'Agency' : 'Direct Brand'}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {client.status}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
              {client.region && <span className="flex items-center gap-1"><MapPin size={13} />{client.region}</span>}
              {client.contact_name && <span className="flex items-center gap-1"><Building2 size={13} />{client.contact_name}</span>}
              {client.contact_email && <span className="flex items-center gap-1"><Mail size={13} />{client.contact_email}</span>}
              {client.contact_phone && <span className="flex items-center gap-1"><Phone size={13} />{client.contact_phone}</span>}
              {client.entertainment_budget && <span className="flex items-center gap-1"><DollarSign size={13} />{fmt(client.entertainment_budget)} budget</span>}
            </div>
            {(client.industry || []).length > 0 && (
              <div className="flex gap-1.5 mt-2">
                {(client.industry || []).map(i => <span key={i} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"><Tag size={10} />{i}</span>)}
              </div>
            )}
            {client.notes && <p className="text-sm text-gray-400 mt-2 italic max-w-xl">{client.notes}</p>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox label="Total Deals" value={deals.length} sub={fmt(totalDealsValue) + ' total value'} />
        <StatBox label="Pipeline" value={fmt(pipelineValue)} sub={`${deals.filter(d => !['Completed','Cancelled','Billed','Sent to Finance'].includes(d.status)).length} active deals`} accent="bg-purple-50 border-purple-100" />
        <StatBox label="Total Invoiced" value={fmt(totalInvoiced)} sub={`${invoices.length} invoices`} accent="bg-green-50 border-green-100" />
        <StatBox label="Outstanding" value={fmt(outstanding)} sub={overdueFollowUps ? `${overdueFollowUps} overdue follow-up${overdueFollowUps > 1 ? 's' : ''}` : 'No overdue follow-ups'} accent={outstanding > 0 ? "bg-orange-50 border-orange-100" : "bg-gray-50 border-gray-100"} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0.5">
          {TABS.map(t => {
            const counts = { Deals: deals.length, 'Follow-ups': followUps.length, Meetings: meetings.length, Invoices: invoices.length }
            return (
              <button key={t} onClick={() => setTab(t)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t} <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500'}`}>{counts[t]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {tab === 'Deals' && (
          deals.length === 0
            ? <EmptyState icon={Briefcase} text="No deals yet" />
            : <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Deal Name','Type','Channel','Value (Net)','Status','Dates','Assigned To'].map(h => <Th key={h}>{h}</Th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {deals.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><p className="font-medium text-gray-900">{d.name}</p>{d.tier && <p className="text-xs text-gray-400">{d.tier}</p>}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{d.type}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{(d.channel || []).join(', ')}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{fmt(d.value_net)}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status] || ''}`}>{d.status}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-400">{d.start_date} {d.start_date && d.end_date ? '→' : ''} {d.end_date}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{d.assigned_to || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
        )}

        {tab === 'Follow-ups' && (
          followUps.length === 0
            ? <EmptyState icon={MessageSquare} text="No follow-ups yet" />
            : <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Date','Type','Notes','Next Action','Status'].map(h => <Th key={h}>{h}</Th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {followUps.map(f => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-medium text-gray-700 whitespace-nowrap">{f.follow_up_date}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{f.type}</span></td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs"><p className="truncate text-sm">{f.notes}</p>{f.deals?.name && <p className="text-xs text-gray-400 mt-0.5">Deal: {f.deals.name}</p>}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{f.next_action || '—'}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FU_COLORS[f.status] || ''}`}>{f.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
        )}

        {tab === 'Meetings' && (
          meetings.length === 0
            ? <EmptyState icon={Calendar} text="No meetings logged yet" />
            : <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Date','Type','Outcome','Next Steps','Deal'].map(h => <Th key={h}>{h}</Th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {meetings.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-medium text-gray-700 whitespace-nowrap">{m.meeting_date}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{m.type}</span></td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs"><p className="text-sm">{m.outcome}</p>{m.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{m.notes}</p>}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate">{m.next_steps || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{m.deals?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
        )}

        {tab === 'Invoices' && (
          invoices.length === 0
            ? <EmptyState icon={FileText} text="No invoices yet" />
            : <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Invoice #','Date','Due Date','Gross','Received','Outstanding','Status'].map(h => <Th key={h}>{h}</Th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map(i => {
                    const owed = (i.amount_gross || 0) - (i.amount_received || 0)
                    return (
                      <tr key={i.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{i.invoice_number}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{i.invoice_date}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{i.due_date || '—'}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{fmt(i.amount_gross)}</td>
                        <td className="px-4 py-3 text-green-700">{fmt(i.amount_received)}</td>
                        <td className="px-4 py-3 font-medium text-orange-700">{owed > 0 ? fmt(owed) : '—'}</td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INV_COLORS[i.status] || ''}`}>{i.status}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
        )}
      </div>
    </div>
  )
}

function Th({ children }) {
  return <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{children}</th>
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-gray-300">
      <Icon size={32} className="mb-3" />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  )
}
