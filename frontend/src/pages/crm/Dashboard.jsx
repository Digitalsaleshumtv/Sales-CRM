import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Briefcase, Users, Send, Lock, Calendar, AlertCircle, Phone, PhoneCall } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAppStore from '../../store/useAppStore'

function StatCard({ title, value, sub, icon: Icon, color, href }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => href && navigate(href)}
      className={`bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 shadow-sm transition-all ${href ? 'cursor-pointer hover:shadow-md hover:border-brand-200 hover:-translate-y-0.5' : ''}`}
    >
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function fmt(n) {
  if (n == null) return '—'
  if (n >= 10000000) return `₨${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `₨${(n / 100000).toFixed(1)}L`
  return `₨${n.toLocaleString()}`
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

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

export default function Dashboard() {
  const { user } = useAppStore()
  const firstName = (user?.user_metadata?.full_name?.split(' ')?.[0]
    || user?.email?.split('@')?.[0]?.split('.')?.[0]
    || 'there').replace(/^\w/, c => c.toUpperCase())
  const [stats, setStats] = useState({})
  const [recentDeals, setRecentDeals] = useState([])
  const [overdueFollowUps, setOverdueFollowUps] = useState([])
  const [todaysCalls, setTodaysCalls] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchDashboard() }, [])

  async function fetchDashboard() {
    setLoading(true)
    const now = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

    const [
      { data: deals },
      { data: clients },
      { data: invoices },
      { data: followUps },
      { data: meetings },
      { data: callsToday },
    ] = await Promise.all([
      supabase.from('deals').select('*'),
      supabase.from('clients').select('id, status'),
      supabase.from('invoices').select('*'),
      supabase.from('follow_ups').select('*, clients(name)'),
      supabase.from('meeting_logs').select('id').gte('meeting_date', monthStart),
      supabase.from('call_reports').select('*').eq('report_date', now).order('created_at', { ascending: false }),
    ])

    const activeDeals = (deals || []).filter(d => !['Completed','Cancelled'].includes(d.status))
    const mtdRevenue = (invoices || [])
      .filter(i => i.invoice_date >= monthStart && i.status !== 'Unpaid')
      .reduce((s, i) => s + (i.amount_net || 0), 0)
    const overdueInvoices = (invoices || []).filter(i => i.due_date < now && i.status !== 'Paid')
    const overdueAmt = overdueInvoices.reduce((s, i) => s + ((i.amount_gross || 0) - (i.amount_received || 0)), 0)
    const proposalsSent = (deals || []).filter(d => d.created_at >= monthStart && d.status === 'Pitch Sent').length
    const dealsLocked = (deals || []).filter(d => d.locked_at && d.locked_at >= monthStart).length
    const overdueFollowUpsList = (followUps || []).filter(f => f.follow_up_date < now && f.status === 'Pending')

    const calls = callsToday || []
    const connectedCalls = calls.filter(c => c.call_status === 'Connected').length
    setStats({ mtdRevenue, activeDeals: activeDeals.length, activeClients: (clients || []).filter(c => c.status === 'active').length, proposalsSent, dealsLocked, meetingsHeld: meetings?.length || 0, overdueInvoicesCount: overdueInvoices.length, overdueInvoicesAmt: overdueAmt, callsToday: calls.length, connectedToday: connectedCalls })
    setRecentDeals((deals || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5))
    setOverdueFollowUps(overdueFollowUpsList.slice(0, 5))
    setTodaysCalls(calls.slice(0, 8))
    setLoading(false)
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good {greeting()}, {firstName} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">{new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Revenue (MTD)" value={fmt(stats.mtdRevenue)} sub="Net billed this month" icon={TrendingUp} color="bg-green-500" href="/crm/revenue" />
        <StatCard title="Active Deals" value={stats.activeDeals} sub="Excl. completed/cancelled" icon={Briefcase} color="bg-blue-500" href="/crm/deals" />
        <StatCard title="Active Clients" value={stats.activeClients} sub="In the last 90 days" icon={Users} color="bg-purple-500" href="/crm/clients" />
        <StatCard title="Proposals Sent" value={stats.proposalsSent} sub="This month" icon={Send} color="bg-orange-500" href="/crm/deals" />
        <StatCard title="Deals Locked" value={stats.dealsLocked} sub="This month" icon={Lock} color="bg-indigo-500" href="/crm/deals" />
        <StatCard title="Meetings Held" value={stats.meetingsHeld} sub="This month" icon={Calendar} color="bg-teal-500" href="/crm/pipeline" />
        <StatCard title="Overdue Invoices" value={stats.overdueInvoicesCount} sub={stats.overdueInvoicesAmt ? fmt(stats.overdueInvoicesAmt) + ' outstanding' : 'All clear'} icon={AlertCircle} color={stats.overdueInvoicesCount > 0 ? 'bg-red-500' : 'bg-gray-400'} href="/crm/billing" />
        <StatCard title="Calls Today" value={stats.callsToday ?? 0} sub={`${stats.connectedToday ?? 0} connected`} icon={Phone} color="bg-rose-500" href="/crm/call-report" />
      </div>

      {/* Today's Call Activity */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhoneCall size={16} className="text-rose-500" />
            <h2 className="font-semibold text-gray-900">Today's Call Activity</h2>
            {todaysCalls.length > 0 && (
              <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-medium">{todaysCalls.length} logged</span>
            )}
          </div>
          <a href="/crm/call-report" className="text-xs text-brand-500 hover:underline">View all →</a>
        </div>
        {todaysCalls.length === 0 ? (
          <p className="text-sm text-gray-400 p-5 text-center">No calls logged today — <a href="/crm/call-report" className="text-brand-500 hover:underline">log the first one</a></p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Rep', 'Customer', 'Type', 'Status', 'Requirement', 'Follow-up', 'Deal (PKR)'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {todaysCalls.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{c.rep_name}</td>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{c.customer_name}</td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{c.call_type}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.call_status === 'Connected' ? 'bg-green-100 text-green-700' :
                        c.call_status === 'Not Connected' ? 'bg-red-100 text-red-600' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{c.call_status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-[200px]">
                      <p className="truncate" title={c.customer_requirement}>{c.customer_requirement || '—'}</p>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{c.follow_up_date || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-700 font-medium whitespace-nowrap">
                      {c.deal_amount ? Number(c.deal_amount).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Deals</h2>
            <a href="/crm/deals" className="text-xs text-brand-500 hover:underline">View all →</a>
          </div>
          <div className="divide-y divide-gray-50">
            {recentDeals.length === 0 ? (
              <p className="text-sm text-gray-400 p-5 text-center">No deals yet — add your first deal in the Deals tab</p>
            ) : recentDeals.map(deal => (
              <div key={deal.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{deal.name}</p>
                  <p className="text-xs text-gray-400">{deal.type} · {fmt(deal.value_net)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[deal.status] || 'bg-gray-100 text-gray-600'}`}>{deal.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Overdue Follow-ups</h2>
            <a href="/crm/pipeline" className="text-xs text-brand-500 hover:underline">View all →</a>
          </div>
          <div className="divide-y divide-gray-50">
            {overdueFollowUps.length === 0 ? (
              <p className="text-sm text-gray-400 p-5 text-center">🎉 No overdue follow-ups!</p>
            ) : overdueFollowUps.map(f => (
              <div key={f.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{f.clients?.name || 'Unknown client'}</p>
                  <p className="text-xs text-gray-400">{f.type} · Due {f.follow_up_date}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600 font-medium">Overdue</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
