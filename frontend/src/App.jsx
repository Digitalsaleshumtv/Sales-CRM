import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import useAppStore from './store/useAppStore'
import TopNav from './components/shared/TopNav'
import Login from './pages/Login'
import PasscodeGate from './components/shared/PasscodeGate'

// CRM Pages
import Dashboard from './pages/crm/Dashboard'
import Shows from './pages/crm/Shows'
import Clients from './pages/crm/Clients'
import Deals from './pages/crm/Deals'
import Pipeline from './pages/crm/Pipeline'
import Revenue from './pages/crm/Revenue'
import KPIs from './pages/crm/KPIs'
import Rates from './pages/crm/Rates'
import Deliverables from './pages/crm/Deliverables'
import Presentations from './pages/crm/Presentations'
import Billing from './pages/crm/Billing'
import Travel from './pages/crm/Travel'
import Production from './pages/crm/Production'
import Industries from './pages/crm/Industries'
import Email from './pages/crm/Email'
import Activity from './pages/crm/Activity'

// Intel Pages
import IntelDashboard from './pages/intel/IntelDashboard'
import Sites from './pages/intel/Sites'
import ScrapeResults from './pages/intel/ScrapeResults'
import FbAds from './pages/intel/FbAds'
import Brands from './pages/intel/Brands'
import CompetitorSocial from './pages/intel/CompetitorSocial'

function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <main className="max-w-screen-2xl mx-auto">
        <Routes>
          <Route path="/crm" element={<Dashboard />} />
          <Route path="/crm/shows" element={<Shows />} />
          <Route path="/crm/clients" element={<Clients />} />
          <Route path="/crm/deals" element={<Deals />} />
          <Route path="/crm/pipeline" element={<Pipeline />} />
          <Route path="/crm/revenue" element={<PasscodeGate type="revenue"><Revenue /></PasscodeGate>} />
          <Route path="/crm/kpis" element={<PasscodeGate><KPIs /></PasscodeGate>} />
          <Route path="/crm/rates" element={<Rates />} />
          <Route path="/crm/deliverables" element={<Deliverables />} />
          <Route path="/crm/presentations" element={<Presentations />} />
          <Route path="/crm/billing" element={<Billing />} />
          <Route path="/crm/travel" element={<Travel />} />
          <Route path="/crm/production" element={<Production />} />
          <Route path="/crm/industries" element={<Industries />} />
          <Route path="/crm/email" element={<Email />} />
          <Route path="/crm/activity" element={<Activity />} />
          <Route path="/intel" element={<IntelDashboard />} />
          <Route path="/intel/sites" element={<Sites />} />
          <Route path="/intel/results" element={<ScrapeResults />} />
          <Route path="/intel/facebook" element={<FbAds />} />
          <Route path="/intel/brands" element={<Brands />} />
          <Route path="/intel/social" element={<CompetitorSocial />} />
          <Route path="*" element={<Navigate to="/crm" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const { user, setUser } = useAppStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      {user ? <AppLayout /> : <Login />}
    </BrowserRouter>
  )
}
