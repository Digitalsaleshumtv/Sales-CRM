import { useEffect, useState } from 'react'
import { Phone, Plus, X, Download, Filter, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAppStore from '../../store/useAppStore'

const CALL_TYPES = ['Outbound', 'Inbound', 'Follow-up', 'Cold Call']
const CALL_STATUSES = ['Connected', 'Not Connected', 'Busy', 'Voicemail', 'Callback Requested']
const LEAD_SOURCES = ['Website Lead', 'Referral', 'Direct', 'Social Media', 'Cold Outreach', 'Event', 'Other']

const STATUS_COLORS = {
  'Connected': 'bg-green-100 text-green-700',
  'Not Connected': 'bg-red-100 text-red-700',
  'Busy': 'bg-yellow-100 text-yellow-700',
  'Voicemail': 'bg-blue-100 text-blue-700',
  'Callback Requested': 'bg-purple-100 text-purple-700',
}

const EMPTY_FORM = {
  report_date: new Date().toISOString().slice(0, 10),
  rep_name: '',
  customer_name: '',
  client_agency: '',
  contact_person: '',
  mobile_email: '',
  lead_source: '',
  call_type: 'Outbound',
  call_status: 'Connected',
  customer_requirement: '',
  follow_up_date: '',
  deal_amount: '',
  remarks: '',
}

export default function CallReport() {
  const { user } = useAppStore()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM, rep_name: user?.user_metadata?.full_name || '' })
  const [saving, setSaving] = useState(false)
  const [filterDate, setFilterDate] = useState('')
  const [filterRep, setFilterRep] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => { fetchRows() }, [])

  async function fetchRows() {
    setLoading(true)
    let q = supabase.from('call_reports').select('*').order('report_date', { ascending: false }).order('created_at', { ascending: false })
    const { data } = await q
    setRows(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      deal_amount: form.deal_amount ? parseFloat(form.deal_amount) : null,
      follow_up_date: form.follow_up_date || null,
      user_id: user?.id,
    }
    const { error } = await supabase.from('call_reports').insert(payload)
    if (!error) {
      setShowForm(false)
      setForm({ ...EMPTY_FORM, rep_name: user?.user_metadata?.full_name || '' })
      fetchRows()
    }
    setSaving(false)
  }

  function handleExport() {
    const headers = ['Date', 'Rep Name', 'Customer Name', 'Client/Agency', 'Contact Person', 'Mobile/Email', 'Lead Source', 'Call Type', 'Call Status', 'Customer Requirement', 'Follow-up Date', 'Deal Amount (PKR)', 'Remarks']
    const csvRows = filtered.map(r => [
      r.report_date, r.rep_name, r.customer_name, r.client_agency,
      r.contact_person, r.mobile_email, r.lead_source, r.call_type,
      r.call_status, r.customer_requirement, r.follow_up_date || '',
      r.deal_amount || '', r.remarks || ''
    ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...csvRows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `call-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const reps = [...new Set(rows.map(r => r.rep_name).filter(Boolean))]

  const filtered = rows.filter(r => {
    if (filterDate && r.report_date !== filterDate) return false
    if (filterRep && r.rep_name !== filterRep) return false
    if (filterStatus && r.call_status !== filterStatus) return false
    return true
  })

  const stats = {
    total: filtered.length,
    connected: filtered.filter(r => r.call_status === 'Connected').length,
    withAmount: filtered.filter(r => r.deal_amount > 0).length,
    totalAmount: filtered.reduce((s, r) => s + (parseFloat(r.deal_amount) || 0), 0),
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <Phone size={20} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Daily Call Report</h1>
            <p className="text-sm text-gray-500">Team sales activity log</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
            <Plus size={15} /> Log Call
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Calls', value: stats.total },
          { label: 'Connected', value: stats.connected },
          { label: 'With Deal Value', value: stats.withAmount },
          { label: 'Total Deal Value', value: `PKR ${stats.totalAmount.toLocaleString()}` },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <select value={filterRep} onChange={e => setFilterRep(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Reps</option>
          {reps.map(r => <option key={r}>{r}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          {CALL_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        {(filterDate || filterRep || filterStatus) && (
          <button onClick={() => { setFilterDate(''); setFilterRep(''); setFilterStatus('') }} className="text-sm text-red-600 hover:underline">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Phone size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No call reports yet</p>
            <p className="text-sm mt-1">Click "Log Call" to add the first entry</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Date', 'Rep', 'Customer', 'Client/Agency', 'Contact', 'Lead Source', 'Call Type', 'Status', 'Requirement', 'Follow-up', 'Deal (PKR)', 'Remarks'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{r.report_date}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{r.rep_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-900">{r.customer_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{r.client_agency}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      <div>{r.contact_person}</div>
                      <div className="text-xs text-gray-400">{r.mobile_email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{r.lead_source}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{r.call_type}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.call_status] || 'bg-gray-100 text-gray-600'}`}>
                        {r.call_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="truncate text-gray-600" title={r.customer_requirement}>{r.customer_requirement}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{r.follow_up_date || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-medium">
                      {r.deal_amount ? `${parseFloat(r.deal_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="truncate text-gray-600" title={r.remarks}>{r.remarks || '—'}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Call Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Log Call</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date *">
                  <input type="date" required value={form.report_date} onChange={e => setForm({ ...form, report_date: e.target.value })} className="input" />
                </Field>
                <Field label="Rep Name *">
                  <input required placeholder="Your name" value={form.rep_name} onChange={e => setForm({ ...form, rep_name: e.target.value })} className="input" />
                </Field>
                <Field label="Customer Name *">
                  <input required placeholder="Customer / brand name" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} className="input" />
                </Field>
                <Field label="Client / Agency">
                  <input placeholder="Agency or company" value={form.client_agency} onChange={e => setForm({ ...form, client_agency: e.target.value })} className="input" />
                </Field>
                <Field label="Contact Person">
                  <input placeholder="Name of contact" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} className="input" />
                </Field>
                <Field label="Mobile / Email">
                  <input placeholder="0300xxxxxxx or email" value={form.mobile_email} onChange={e => setForm({ ...form, mobile_email: e.target.value })} className="input" />
                </Field>
                <Field label="Lead Source">
                  <select value={form.lead_source} onChange={e => setForm({ ...form, lead_source: e.target.value })} className="input">
                    <option value="">Select...</option>
                    {LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Call Type">
                  <select value={form.call_type} onChange={e => setForm({ ...form, call_type: e.target.value })} className="input">
                    {CALL_TYPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Call Status">
                  <select value={form.call_status} onChange={e => setForm({ ...form, call_status: e.target.value })} className="input">
                    {CALL_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Follow-up Date">
                  <input type="date" value={form.follow_up_date} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} className="input" />
                </Field>
                <Field label="Deal Amount (PKR)">
                  <input type="number" placeholder="0" value={form.deal_amount} onChange={e => setForm({ ...form, deal_amount: e.target.value })} className="input" />
                </Field>
              </div>
              <Field label="Customer Requirement">
                <textarea rows={2} placeholder="What the customer is interested in..." value={form.customer_requirement} onChange={e => setForm({ ...form, customer_requirement: e.target.value })} className="input resize-none" />
              </Field>
              <Field label="Remarks">
                <textarea rows={2} placeholder="Any additional notes..." value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} className="input resize-none" />
              </Field>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Call'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
