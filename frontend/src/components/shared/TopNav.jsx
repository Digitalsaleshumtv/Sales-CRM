import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BarChart2, Search, LogOut } from 'lucide-react'
import useAppStore from '../../store/useAppStore'
import { supabase } from '../../lib/supabase'
import NotificationCenter from './NotificationCenter'

const CRM_TABS = [
  { path: '/crm', label: 'Home' },
  { path: '/crm/shows', label: 'Shows' },
  { path: '/crm/clients', label: 'Clients' },
  { path: '/crm/deals', label: 'Deals' },
  { path: '/crm/pipeline', label: 'Pipeline' },
  { path: '/crm/revenue', label: 'Revenue' },
  { path: '/crm/kpis', label: 'KPIs' },
  { path: '/crm/rates', label: 'Rates' },
  { path: '/crm/deliverables', label: 'Deliverables' },
  { path: '/crm/presentations', label: 'Presentations' },
  { path: '/crm/billing', label: 'Billing' },
  { path: '/crm/travel', label: 'Travel' },
  { path: '/crm/production', label: 'Production' },
  { path: '/crm/industries', label: 'Industries' },
  { path: '/crm/email', label: 'Email' },
  { path: '/crm/activity', label: 'Activity' },
]

const INTEL_TABS = [
  { path: '/intel', label: 'Dashboard' },
  { path: '/intel/sites', label: 'Website Monitor' },
  { path: '/intel/results', label: 'Scrape Results' },
  { path: '/intel/facebook', label: 'Facebook Ads' },
  { path: '/intel/brands', label: 'Competitor Brands' },
  { path: '/intel/social', label: '📱 Competitor Social' },
]

export default function TopNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { activeModule, setActiveModule, user } = useAppStore()

  const tabs = activeModule === 'crm' ? CRM_TABS : INTEL_TABS

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        {/* Logo + Module Switcher */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">H</span>
            </div>
            <span className="font-semibold text-gray-900 text-sm">Hum Network Digital Sales</span>
          </div>

          <div className="h-5 w-px bg-gray-300" />

          {/* Module Switcher */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setActiveModule('crm'); navigate('/crm') }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeModule === 'crm'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart2 size={14} />
              Sales CRM
            </button>
            <button
              onClick={() => { setActiveModule('intel'); navigate('/intel') }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeModule === 'intel'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Search size={14} />
              Ad Intelligence
            </button>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <NotificationCenter />
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <div className="w-7 h-7 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xs font-semibold">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="hidden md:block">{user?.email?.split('@')[0]}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-4 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive =
            tab.path === (activeModule === 'crm' ? '/crm' : '/intel')
              ? location.pathname === tab.path
              : location.pathname.startsWith(tab.path)
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`whitespace-nowrap px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
