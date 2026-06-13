import { useEffect, useState } from 'react'
import { Plus, X, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const TABS = ['Follow-ups', 'RO Tracker', 'Meeting Log']
const FOLLOW_UP_TYPES = ['Call', 'Email', 'In-Person Meeting', 'WhatsApp', 'Presentation', 'Other']
const MEETING_TYPES = ['In-Person', 'Online', 'Phone Call']

function StatusBadge({ status }) {
  const map = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Done: 'bg-green-100 text-green-700',
    Overdue: 'bg-red-100 text-red-600',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>
}

export default function Pipeline() {
  const [activeTab, setActiveTab] = useState('Follow-ups')
  const [followUps, setFollowUps] = useState([])
  const [meetings, setMeetings] = useState([])
  const [deals, setDeals] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFUModal, setShowFUModal] = useState(false)
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const [fuForm, setFuForm] = useState({ client_id: '', deal_id: '', follow_up_date: today, type: 'Call', notes: '', status: 'Pending', next_action: '', next_follow_up_date: '' })
  const [meetForm, setMeetForm] = useState({ client_id: '', deal_id: '', meeting_date: today, type: 'In-Person', outcome: '', deal_status_after: '', notes: '', next_steps: '' })

  useEffect(() => {
    fetchAll()
    supabase.from('clients').select('id,name').order('name').then(({ data }) => setClients(data || []))
    supabase.from('deals').select('id,name,status').order('name').then(({ data }) => setDeals(data || []))
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: fu }, { data: ml }] = await Promise.all([
      supabase.from('follow_ups').select('*, clients(name), deals(name)').order('follow_up_date'),
      supabase.from('meeting_logs').select('*, clients(name), deals(name)').order('meeting_date', { ascending: false }),
    ])
    // Auto-mark overdue
    const enriched = (fu || []).map(f => ({
      ...f,
      status: f.status === 'Pending' && f.follow_up_date < today ? 'Overdue' : f.status,
    }))
    setFollowUps(enriched)
    setMeetings(ml || [])
    setLoading(false)
  }

  async function saveFU(e) {
    e.preventDefault(); setSaving(true)
    const { error } = await supabase.from('follow_ups').insert([fuForm])
    if (!error) { setShowFUModal(false); setFuForm({ client_id: '', deal_id: '', follow_up_date: today, type: 'Call', notes: '', status: 'Pending', next_action: '', next_follow_up_date: '' }); fetchAll() }
    else alert(error.message)
    setSaving(false)
  }

  async function saveMeeting(e) {
    e.preventDefault(); setSaving(true)
    const { error } = await supabase.from('meeting_logs').insert([meetForm])
    if (!error) { setShowMeetingModal(false); setMeetForm({ client_id: '', deal_id: '', meeting_date: today, type: 'In-Person', outcome: '', deal_status_after: '', notes: '', next_steps: '' }); fetchAll() }
    else alert(error.message)
    setSaving(false)
  }

  async function markDone(id) {
    await supabase.from('follow_ups').update({ status: 'Done' }).eq('id', id)
    fetchAll()
  }

  const pending = followUps.filter(f => f.status === 'Pending').length
  const overdue = followUps.filter(f => f.status === 'Overdue').length
  const done = followUps.filter(f => f.status === 'Done').length

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline & Follow-ups</h1>
          <div className="flex gap-4 mt-1 text-sm">
            <span className="text-yellow-600 font-medium">{pending} pending</span>
            <span className="text-red-500 font-medium">{overdue} overdue</span>
            <span className="text-green-600 font-medium">{done} done</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFUModal(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
            <Plus size={16} /> Follow-up
          </button>
          <button onClick={() => setShowMeetingModal(true)} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900">
            <Plus size={16} /> Meeting
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : activeTab === 'Follow-ups' ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Client','Deal','Date','Type','Notes','Status','Next Action',''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {followUps.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No follow-ups yet</td></tr>
              ) : followUps.map(f => (
                <tr key={f.id} className={`hover:bg-gray-50 transition-colors ${f.status === 'Overdue' ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{f.clients?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{f.deals?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{f.follow_up_date}</td>
                  <td className="px-4 py-3 text-gray-600">{f.type}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{f.notes || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{f.next_action || '—'}</td>
                  <td className="px-4 py-3">
                    {f.status !== 'Done' && (
                      <button onClick={() => markDone(f.id)} className="text-xs text-green-600 hover:underline flex items-center gap-1"><CheckCircle size={13} /> Mark Done</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'RO Tracker' ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Deal','Client','Status','RO Received','RO Number','Transfer Done','Billing Done','Sent to Finance','Payment'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {deals.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No deals yet</td></tr>
              ) : deals.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{d.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{d.client_name || '—'}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{d.status}</span></td>
                  <td className="px-4 py-3">{d.ro_received ? <CheckCircle size={16} className="text-green-500" /> : <X size={16} className="text-gray-300" />}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{d.ro_number || '—'}</td>
                  <td className="px-4 py-3">{d.transfer_done ? <CheckCircle size={16} className="text-green-500" /> : <X size={16} className="text-gray-300" />}</td>
                  <td className="px-4 py-3">{d.billing_done ? <CheckCircle size={16} className="text-green-500" /> : <X size={16} className="text-gray-300" />}</td>
                  <td className="px-4 py-3">{d.sent_to_finance ? <CheckCircle size={16} className="text-green-500" /> : <X size={16} className="text-gray-300" />}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{d.payment_status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Date','Client','Type','Deal','Outcome','Deal Status After','Next Steps'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {meetings.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No meetings logged yet</td></tr>
              ) : meetings.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{m.meeting_date}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{m.clients?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{m.type}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{m.deals?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{m.outcome || '—'}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{m.deal_status_after || '—'}</span></td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">{m.next_steps || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Follow-up Modal */}
      {showFUModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Add Follow-up</h2>
              <button onClick={() => setShowFUModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={saveFU} className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Client</label>
                  <select value={fuForm.client_id} onChange={e => setFuForm({...fuForm, client_id: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Select...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Deal</label>
                  <select value={fuForm.deal_id} onChange={e => setFuForm({...fuForm, deal_id: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Select...</option>
                    {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
                  <input required type="date" value={fuForm.follow_up_date} onChange={e => setFuForm({...fuForm, follow_up_date: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select value={fuForm.type} onChange={e => setFuForm({...fuForm, type: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {FOLLOW_UP_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={fuForm.notes} onChange={e => setFuForm({...fuForm, notes: e.target.value})} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Next Action</label>
                  <input value={fuForm.next_action} onChange={e => setFuForm({...fuForm, next_action: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Send revised proposal" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowFUModal(false)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-60">{saving ? 'Saving...' : 'Add Follow-up'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Meeting Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Log Meeting</h2>
              <button onClick={() => setShowMeetingModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={saveMeeting} className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Client</label>
                  <select value={meetForm.client_id} onChange={e => setMeetForm({...meetForm, client_id: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Select...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
                  <input required type="date" value={meetForm.meeting_date} onChange={e => setMeetForm({...meetForm, meeting_date: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select value={meetForm.type} onChange={e => setMeetForm({...meetForm, type: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {MEETING_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Deal</label>
                  <select value={meetForm.deal_id} onChange={e => setMeetForm({...meetForm, deal_id: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Select...</option>
                    {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Outcome</label>
                  <textarea value={meetForm.outcome} onChange={e => setMeetForm({...meetForm, outcome: e.target.value})} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="What was discussed and agreed..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Next Steps</label>
                  <input value={meetForm.next_steps} onChange={e => setMeetForm({...meetForm, next_steps: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Send proposal by Friday" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowMeetingModal(false)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-gray-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-60">{saving ? 'Saving...' : 'Log Meeting'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
