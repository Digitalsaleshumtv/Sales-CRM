import { useEffect, useState } from 'react'
import { Plus, X, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function fmt(n) {
  if (!n && n !== 0) return '—'
  if (n >= 10000000) return `₨${(n/10000000).toFixed(1)}Cr`
  if (n >= 100000) return `₨${(n/100000).toFixed(1)}L`
  return `₨${Number(n).toLocaleString()}`
}

function agingBucket(dueDate) {
  if (!dueDate) return null
  const days = Math.floor((new Date() - new Date(dueDate)) / 86400000)
  if (days <= 0) return 'Current'
  if (days <= 30) return '0–30'
  if (days <= 60) return '31–60'
  if (days <= 90) return '61–90'
  return '90+'
}

const BUCKET_COLORS = {
  'Current': 'bg-green-100 text-green-700',
  '0–30': 'bg-yellow-100 text-yellow-700',
  '31–60': 'bg-orange-100 text-orange-700',
  '61–90': 'bg-red-100 text-red-600',
  '90+': 'bg-red-200 text-red-800',
}

const STATUS_COLORS = {
  Unpaid: 'bg-gray-100 text-gray-600',
  Partial: 'bg-yellow-100 text-yellow-700',
  Paid: 'bg-green-100 text-green-700',
  Overdue: 'bg-red-100 text-red-600',
}

export default function Billing() {
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [form, setForm] = useState(defaultForm())

  function defaultForm() {
    const today = new Date().toISOString().split('T')[0]
    const due = new Date(Date.now() + 30*86400000).toISOString().split('T')[0]
    return { invoice_number: '', client_id: '', deal_id: '', invoice_date: today, amount_net: '', due_date: due, payment_date: '', amount_received: '0', status: 'Unpaid' }
  }

  useEffect(() => {
    fetchInvoices()
    supabase.from('clients').select('id,name').order('name').then(({ data }) => setClients(data || []))
    supabase.from('deals').select('id,name').order('name').then(({ data }) => setDeals(data || []))
  }, [])

  async function fetchInvoices() {
    setLoading(true)
    const { data } = await supabase.from('invoices').select('*, clients(name), deals(name)').order('invoice_date', { ascending: false })
    setInvoices(data || [])
    setLoading(false)
  }

  async function saveInvoice(e) {
    e.preventDefault(); setSaving(true)
    const payload = { ...form, amount_net: Number(form.amount_net), amount_received: Number(form.amount_received) || 0, payment_date: form.payment_date || null }
    const { error } = await supabase.from('invoices').insert([payload])
    if (!error) { setShowModal(false); setForm(defaultForm()); fetchInvoices() }
    else alert(error.message)
    setSaving(false)
  }

  function exportCSV() {
    const rows = [['Invoice #','Client','Deal','Date','Net','GST','Gross','Due Date','Received','Outstanding','Status','Aging']]
    filtered.forEach(i => {
      const outstanding = (i.amount_gross || 0) - (i.amount_received || 0)
      rows.push([i.invoice_number, i.clients?.name, i.deals?.name, i.invoice_date, i.amount_net, i.gst, i.amount_gross, i.due_date, i.amount_received, outstanding, i.status, agingBucket(i.due_date)])
    })
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'invoices.csv'; a.click()
  }

  const filtered = invoices.filter(i => filterStatus === 'all' || i.status === filterStatus)

  // Summary stats
  const totalBilled = invoices.reduce((s, i) => s + (i.amount_gross || 0), 0)
  const totalReceived = invoices.reduce((s, i) => s + (i.amount_received || 0), 0)
  const totalOutstanding = totalBilled - totalReceived
  const overdueCount = invoices.filter(i => i.due_date < new Date().toISOString().split('T')[0] && i.status !== 'Paid').length

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Aging</h1>
          <p className="text-sm text-gray-500 mt-0.5">{invoices.length} invoices</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
            <Plus size={16} /> New Invoice
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Billed', value: fmt(totalBilled), color: 'bg-blue-50 border-blue-100' },
          { label: 'Received', value: fmt(totalReceived), color: 'bg-green-50 border-green-100' },
          { label: 'Outstanding', value: fmt(totalOutstanding), color: 'bg-orange-50 border-orange-100' },
          { label: 'Overdue Invoices', value: overdueCount, color: 'bg-red-50 border-red-100' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{c.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Aging buckets */}
      <div className="grid grid-cols-5 gap-3">
        {['Current','0–30','31–60','61–90','90+'].map(bucket => {
          const bucketInvoices = invoices.filter(i => agingBucket(i.due_date) === bucket && i.status !== 'Paid')
          const total = bucketInvoices.reduce((s, i) => s + ((i.amount_gross || 0) - (i.amount_received || 0)), 0)
          return (
            <div key={bucket} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
              <p className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-2 ${BUCKET_COLORS[bucket]}`}>{bucket} days</p>
              <p className="text-lg font-bold text-gray-900">{fmt(total)}</p>
              <p className="text-xs text-gray-400">{bucketInvoices.length} invoices</p>
            </div>
          )
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all','Unpaid','Partial','Paid','Overdue'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterStatus === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Invoice #','Client','Deal','Date','Net','GST','Gross','Due Date','Received','Outstanding','Status','Aging'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-12 text-gray-400">No invoices yet</td></tr>
              ) : filtered.map(i => {
                const outstanding = (i.amount_gross || 0) - (i.amount_received || 0)
                const bucket = agingBucket(i.due_date)
                return (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{i.invoice_number}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{i.clients?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{i.deals?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{i.invoice_date}</td>
                    <td className="px-4 py-3 text-gray-700">{fmt(i.amount_net)}</td>
                    <td className="px-4 py-3 text-gray-500">{fmt(i.gst)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{fmt(i.amount_gross)}</td>
                    <td className="px-4 py-3 text-gray-600">{i.due_date || '—'}</td>
                    <td className="px-4 py-3 text-green-700">{fmt(i.amount_received)}</td>
                    <td className="px-4 py-3 font-medium text-orange-700">{outstanding > 0 ? fmt(outstanding) : '—'}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[i.status] || ''}`}>{i.status}</span></td>
                    <td className="px-4 py-3">{bucket && i.status !== 'Paid' ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BUCKET_COLORS[bucket]}`}>{bucket}d</span> : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* New Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">New Invoice</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={saveInvoice} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Number *</label>
                  <input required value={form.invoice_number} onChange={e => setForm({...form, invoice_number: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. HUM-2026-001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Client</label>
                  <select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Select...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Deal</label>
                  <select value={form.deal_id} onChange={e => setForm({...form, deal_id: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Select...</option>
                    {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Date *</label>
                  <input required type="date" value={form.invoice_date} onChange={e => setForm({...form, invoice_date: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Net Amount (PKR) *</label>
                  <input required type="number" value={form.amount_net} onChange={e => setForm({...form, amount_net: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0" />
                  {form.amount_net && <p className="text-xs text-gray-400 mt-1">GST: ₨{(form.amount_net*0.18).toLocaleString()} · Gross: ₨{(form.amount_net*1.18).toLocaleString()}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount Received</label>
                  <input type="number" value={form.amount_received} onChange={e => setForm({...form, amount_received: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Payment Date</label>
                  <input type="date" value={form.payment_date} onChange={e => setForm({...form, payment_date: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {['Unpaid','Partial','Paid','Overdue'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-60">{saving ? 'Saving...' : 'Create Invoice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
