import { useEffect, useRef, useState } from 'react'
import { Bell, X, CheckCheck, Clock, Users, Briefcase, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAppStore from '../../store/useAppStore'

const TYPE_CONFIG = {
  new_deal:           { icon: Briefcase, color: 'text-blue-500',   bg: 'bg-blue-50'   },
  new_followup:       { icon: Calendar,  color: 'text-yellow-600', bg: 'bg-yellow-50' },
  new_meeting:        { icon: Users,     color: 'text-green-500',  bg: 'bg-green-50'  },
  followup_reminder:  { icon: Clock,     color: 'text-red-500',    bg: 'bg-red-50'    },
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationCenter() {
  const { user } = useAppStore()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [reminders, setReminders] = useState([])
  const ref = useRef(null)

  useEffect(() => {
    if (!user) return
    loadNotifications()
    loadReminders()

    const chan = supabase.channel('notifications_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        loadNotifications()
      })
      .subscribe()

    return () => supabase.removeChannel(chan)
  }, [user])

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
  }

  async function loadReminders() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('follow_ups')
      .select('id, follow_up_date, type, notes, clients(name), status')
      .in('status', ['Pending', 'Overdue'])
      .lte('follow_up_date', today)
    setReminders(data || [])
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (!unreadIds.length) return
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
    setNotifications(ns => ns.map(n => ({ ...n, is_read: true })))
  }

  // Close on outside click
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = notifications.filter(n => !n.is_read).length
  const total = unread + reminders.length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
      >
        <Bell size={18} />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
              {unread > 0 && (
                <span className="text-xs bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
            {/* Follow-up reminders (shown to all employees) */}
            {reminders.map(r => (
              <div key={`r-${r.id}`} className="px-4 py-3 bg-red-50 flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock size={13} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-700">Follow-up overdue</p>
                  <p className="text-xs text-red-600 truncate">
                    {r.clients?.name || 'Client'} · {r.type} · due {r.follow_up_date}
                  </p>
                </div>
                <span className="text-[10px] text-red-400 whitespace-nowrap mt-0.5">Reminder</span>
              </div>
            ))}

            {/* DB notifications */}
            {notifications.map(n => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.new_deal
              const Icon = cfg.icon
              return (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`px-4 py-3 flex gap-3 items-start cursor-pointer hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon size={13} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-medium leading-snug ${n.is_read ? 'text-gray-500' : 'text-gray-900'}`}>
                        {n.title}
                      </p>
                      {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />}
                    </div>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">
                      {timeAgo(n.created_at)}
                      {n.created_by_email ? ` · by ${n.created_by_email.split('@')[0]}` : ''}
                    </p>
                  </div>
                </div>
              )
            })}

            {notifications.length === 0 && reminders.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm">
                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                No notifications
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
