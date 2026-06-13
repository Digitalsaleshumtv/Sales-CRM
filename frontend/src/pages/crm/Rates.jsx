import { useEffect, useState } from 'react'
import { Plus, X, Pencil, Check, DollarSign, Info } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const RATE_TYPES = [
  'Drama Sponsorship','Social Media Posts','Social Media Stories',
  'Website Banners','Road Block','Press Release',
  'Exclusive Content','Product Integration','Event Sponsorship',
  'Branded Content Package','Podcast','Webseries',
]
const CHANNELS = ['HUM TV','Masala TV','HUM News','HUM Network','YouTube']
const TIERS = ['Presenting','Powered By','Associated','Standard','Premium']

// Display helper — handles both ₨ PKR and $ USD
function fmt(rate_pkr, currency, rate_raw) {
  if (currency === 'USD') {
    if (!rate_raw && rate_raw !== 0) return '—'
    return `$${Number(rate_raw).toLocaleString()}`
  }
  const n = rate_pkr
  if (!n) return '—'
  if (n >= 10000000) return `₨${(n/10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `₨${(n/100000).toFixed(1)}L`
  return `₨${Number(n).toLocaleString()}`
}

// ─── COMPLETE RATE CARD — HUM Network Digital Tariff 2025-2026 ────────────────
// PKR rates from FY2024-25 Excel data; USD rates from PDF tariff document
const SEED_RATES = [

  // ══ DRAMA SPONSORSHIP — HUM TV (PKR) — Official Tariff 2025-2026 ═══════════
  // Deliverables: Presenting = YouTube+Facebook+Instagram+Website(400K impr)+Featured Banner
  //               Powered By = YouTube+Facebook+Website(300K impr)+Featured Banner
  //               Associate  = YouTube+Website(150K impr)+Featured Banner
  // YouTube: logo+hashtag on screen, logo on thumbnail, mentioned as Digital Partner in caption
  // Facebook: all drama creatives & videos with brand logo & hashtag
  { type:'Drama Sponsorship', channel:'HUM TV', tier:'Presenting',  rate_pkr:700000, currency:'PKR', notes:'Per episode — YouTube+FB+IG+Website 400K impr+Featured Banner' },
  { type:'Drama Sponsorship', channel:'HUM TV', tier:'Powered By',  rate_pkr:400000, currency:'PKR', notes:'Per episode — YouTube+FB+Website 300K impr+Featured Banner' },
  { type:'Drama Sponsorship', channel:'HUM TV', tier:'Associated',  rate_pkr:300000, currency:'PKR', notes:'Per episode — YouTube+Website 150K impr+Featured Banner' },

  // ══ DRAMA SPONSORSHIP — MASALA TV (PKR) ════════════════════════════════════
  { type:'Drama Sponsorship', channel:'Masala TV', tier:'Presenting',  rate_pkr:100000, currency:'PKR', notes:'Per episode' },
  { type:'Drama Sponsorship', channel:'Masala TV', tier:'Powered By',  rate_pkr:80000,  currency:'PKR', notes:'Per episode' },
  { type:'Drama Sponsorship', channel:'Masala TV', tier:'Associated',  rate_pkr:65000,  currency:'PKR', notes:'Per episode' },

  // ══ WEBSITE BANNER ADVERTISING — CPM (USD) ═════════════════════════════════
  // Applies to: humnews.pk · hum.tv · masala.tv
  { type:'Website Banners', channel:'HUM News',   tier:'Standard', rate_pkr:560,   currency:'USD', rate_raw:2,   notes:'Standard CPM — all sizes (970x250, 728x90, 300x250, 320x100, 320x50)' },
  { type:'Website Banners', channel:'HUM News',   tier:'Premium',  rate_pkr:700,   currency:'USD', rate_raw:2.5, notes:'Rich-Media CPM — all sizes' },
  { type:'Website Banners', channel:'HUM TV',     tier:'Standard', rate_pkr:560,   currency:'USD', rate_raw:2,   notes:'Standard CPM — all sizes (970x250, 728x90, 300x250, 320x100, 320x50)' },
  { type:'Website Banners', channel:'HUM TV',     tier:'Premium',  rate_pkr:700,   currency:'USD', rate_raw:2.5, notes:'Rich-Media CPM — all sizes' },
  { type:'Website Banners', channel:'Masala TV',  tier:'Standard', rate_pkr:560,   currency:'USD', rate_raw:2,   notes:'Standard CPM — all sizes (970x250, 728x90, 300x250, 320x100, 320x50)' },
  { type:'Website Banners', channel:'Masala TV',  tier:'Premium',  rate_pkr:700,   currency:'USD', rate_raw:2.5, notes:'Rich-Media CPM — all sizes' },
  // Note: 15% premium for geo-targeting outside Pakistan
  { type:'Website Banners', channel:'HUM Network',tier:'Standard', rate_pkr:0,     currency:'PKR', notes:'Geo-targeting premium: +15% on all banner rates' },

  // ══ ROAD BLOCK — Per Day (USD) ══════════════════════════════════════════════
  { type:'Road Block', channel:'HUM News',  tier:'Standard', rate_pkr:336000, currency:'USD', rate_raw:1200, notes:'Full site road block — per day' },
  { type:'Road Block', channel:'HUM TV',    tier:'Standard', rate_pkr:168000, currency:'USD', rate_raw:600,  notes:'Full site road block — per day' },
  { type:'Road Block', channel:'Masala TV', tier:'Standard', rate_pkr:140000, currency:'USD', rate_raw:500,  notes:'Full site road block — per day' },
  // Banner CPM included in road block
  { type:'Road Block', channel:'HUM News',  tier:'Premium',  rate_pkr:560,    currency:'USD', rate_raw:2,    notes:'Banner CPM included with road block' },
  { type:'Road Block', channel:'HUM TV',    tier:'Premium',  rate_pkr:560,    currency:'USD', rate_raw:2,    notes:'Banner CPM included with road block' },
  { type:'Road Block', channel:'Masala TV', tier:'Premium',  rate_pkr:560,    currency:'USD', rate_raw:2,    notes:'Banner CPM included with road block' },

  // ══ PRESS RELEASE — Per Article, 24hr Homepage (USD) ═══════════════════════
  { type:'Press Release', channel:'HUM News',  tier:'Standard', rate_pkr:84000, currency:'USD', rate_raw:300, notes:'24-hour homepage mileage' },
  { type:'Press Release', channel:'HUM TV',    tier:'Standard', rate_pkr:56000, currency:'USD', rate_raw:200, notes:'24-hour homepage mileage' },
  { type:'Press Release', channel:'Masala TV', tier:'Standard', rate_pkr:42000, currency:'USD', rate_raw:150, notes:'24-hour homepage mileage' },

  // ══ HUM NEWS — SOCIAL POSTS (USD) ══════════════════════════════════════════
  { type:'Social Media Posts', channel:'HUM News', tier:'Standard', posts_min:1,  posts_max:4,   rate_pkr:56000, currency:'USD', rate_raw:200, notes:'Facebook — per post (1 post)' },
  { type:'Social Media Posts', channel:'HUM News', tier:'Standard', posts_min:5,  posts_max:9,   rate_pkr:50400, currency:'USD', rate_raw:180, notes:'Facebook — per post (5–9 posts, 10% disc)' },
  { type:'Social Media Posts', channel:'HUM News', tier:'Standard', posts_min:10, posts_max:999, rate_pkr:47600, currency:'USD', rate_raw:170, notes:'Facebook — per post (10+ posts, 15% disc)' },

  { type:'Social Media Posts', channel:'HUM News', tier:'Standard', posts_min:1,  posts_max:4,   rate_pkr:28000, currency:'USD', rate_raw:100, notes:'Instagram — per post (1 post)' },
  { type:'Social Media Posts', channel:'HUM News', tier:'Standard', posts_min:5,  posts_max:9,   rate_pkr:25200, currency:'USD', rate_raw:90,  notes:'Instagram — per post (5–9 posts, 10% disc)' },
  { type:'Social Media Posts', channel:'HUM News', tier:'Standard', posts_min:10, posts_max:999, rate_pkr:23800, currency:'USD', rate_raw:85,  notes:'Instagram — per post (10+ posts, 15% disc)' },

  { type:'Social Media Posts', channel:'HUM News', tier:'Standard', posts_min:1,  posts_max:4,   rate_pkr:14000, currency:'USD', rate_raw:50,  notes:'Twitter — per post (1 post)' },
  { type:'Social Media Posts', channel:'HUM News', tier:'Standard', posts_min:5,  posts_max:9,   rate_pkr:12600, currency:'USD', rate_raw:45,  notes:'Twitter — per post (5–9 posts, 10% disc)' },
  { type:'Social Media Posts', channel:'HUM News', tier:'Standard', posts_min:10, posts_max:999, rate_pkr:11760, currency:'USD', rate_raw:42,  notes:'Twitter — per post (10+ posts, 15% disc)' },

  { type:'Social Media Posts', channel:'HUM News', tier:'Standard', posts_min:1,  posts_max:4,   rate_pkr:56000, currency:'USD', rate_raw:200, notes:'TikTok — per post (1 post)' },
  { type:'Social Media Posts', channel:'HUM News', tier:'Standard', posts_min:5,  posts_max:9,   rate_pkr:50400, currency:'USD', rate_raw:180, notes:'TikTok — per post (5–9 posts, 10% disc)' },
  { type:'Social Media Posts', channel:'HUM News', tier:'Standard', posts_min:10, posts_max:999, rate_pkr:47600, currency:'USD', rate_raw:170, notes:'TikTok — per post (10+ posts, 15% disc)' },

  // ══ HUM NEWS — SOCIAL STORIES (USD) ════════════════════════════════════════
  { type:'Social Media Stories', channel:'HUM News', tier:'Standard', posts_min:1,  posts_max:4,   rate_pkr:28000, currency:'USD', rate_raw:100, notes:'Facebook Story — per story (1 story)' },
  { type:'Social Media Stories', channel:'HUM News', tier:'Standard', posts_min:5,  posts_max:9,   rate_pkr:25200, currency:'USD', rate_raw:90,  notes:'Facebook Story — per story (5–9, 10% disc)' },
  { type:'Social Media Stories', channel:'HUM News', tier:'Standard', posts_min:10, posts_max:999, rate_pkr:23800, currency:'USD', rate_raw:85,  notes:'Facebook Story — per story (10+, 15% disc)' },

  { type:'Social Media Stories', channel:'HUM News', tier:'Standard', posts_min:1,  posts_max:4,   rate_pkr:14000, currency:'USD', rate_raw:50,  notes:'Instagram Story — per story (1 story)' },
  { type:'Social Media Stories', channel:'HUM News', tier:'Standard', posts_min:5,  posts_max:9,   rate_pkr:12600, currency:'USD', rate_raw:45,  notes:'Instagram Story — per story (5–9, 10% disc)' },
  { type:'Social Media Stories', channel:'HUM News', tier:'Standard', posts_min:10, posts_max:999, rate_pkr:11760, currency:'USD', rate_raw:42,  notes:'Instagram Story — per story (10+, 15% disc)' },

  // ══ HUM TV — SOCIAL POSTS (USD) ════════════════════════════════════════════
  { type:'Social Media Posts', channel:'HUM TV', tier:'Standard', posts_min:1,  posts_max:4,   rate_pkr:84000,  currency:'USD', rate_raw:300, notes:'Facebook — per post (1 post)' },
  { type:'Social Media Posts', channel:'HUM TV', tier:'Standard', posts_min:5,  posts_max:9,   rate_pkr:75600,  currency:'USD', rate_raw:270, notes:'Facebook — per post (5–9 posts, 10% disc)' },
  { type:'Social Media Posts', channel:'HUM TV', tier:'Standard', posts_min:10, posts_max:999, rate_pkr:71400,  currency:'USD', rate_raw:255, notes:'Facebook — per post (10+ posts, 15% disc)' },

  { type:'Social Media Posts', channel:'HUM TV', tier:'Standard', posts_min:1,  posts_max:4,   rate_pkr:56000,  currency:'USD', rate_raw:200, notes:'Instagram — per post (1 post)' },
  { type:'Social Media Posts', channel:'HUM TV', tier:'Standard', posts_min:5,  posts_max:9,   rate_pkr:50400,  currency:'USD', rate_raw:180, notes:'Instagram — per post (5–9 posts, 10% disc)' },
  { type:'Social Media Posts', channel:'HUM TV', tier:'Standard', posts_min:10, posts_max:999, rate_pkr:47600,  currency:'USD', rate_raw:170, notes:'Instagram — per post (10+ posts, 15% disc)' },

  { type:'Social Media Posts', channel:'HUM TV', tier:'Standard', posts_min:1,  posts_max:4,   rate_pkr:14000,  currency:'USD', rate_raw:50,  notes:'Twitter — per post (1 post)' },
  { type:'Social Media Posts', channel:'HUM TV', tier:'Standard', posts_min:5,  posts_max:9,   rate_pkr:12600,  currency:'USD', rate_raw:45,  notes:'Twitter — per post (5–9 posts, 10% disc)' },
  { type:'Social Media Posts', channel:'HUM TV', tier:'Standard', posts_min:10, posts_max:999, rate_pkr:11760,  currency:'USD', rate_raw:42,  notes:'Twitter — per post (10+ posts, 15% disc)' },

  { type:'Social Media Posts', channel:'HUM TV', tier:'Standard', posts_min:1,  posts_max:4,   rate_pkr:84000,  currency:'USD', rate_raw:300, notes:'TikTok — per post (1 post)' },
  { type:'Social Media Posts', channel:'HUM TV', tier:'Standard', posts_min:5,  posts_max:9,   rate_pkr:75600,  currency:'USD', rate_raw:270, notes:'TikTok — per post (5–9 posts, 10% disc)' },
  { type:'Social Media Posts', channel:'HUM TV', tier:'Standard', posts_min:10, posts_max:999, rate_pkr:71400,  currency:'USD', rate_raw:255, notes:'TikTok — per post (10+ posts, 15% disc)' },

  // ══ HUM TV — SOCIAL STORIES (USD) ══════════════════════════════════════════
  { type:'Social Media Stories', channel:'HUM TV', tier:'Standard', posts_min:1,  posts_max:4,   rate_pkr:28000, currency:'USD', rate_raw:100, notes:'Facebook Story — per story (1 story)' },
  { type:'Social Media Stories', channel:'HUM TV', tier:'Standard', posts_min:5,  posts_max:9,   rate_pkr:25200, currency:'USD', rate_raw:90,  notes:'Facebook Story — per story (5–9, 10% disc)' },
  { type:'Social Media Stories', channel:'HUM TV', tier:'Standard', posts_min:10, posts_max:999, rate_pkr:23800, currency:'USD', rate_raw:85,  notes:'Facebook Story — per story (10+, 15% disc)' },

  { type:'Social Media Stories', channel:'HUM TV', tier:'Standard', posts_min:1,  posts_max:4,   rate_pkr:14000, currency:'USD', rate_raw:50,  notes:'Instagram Story — per story (1 story)' },
  { type:'Social Media Stories', channel:'HUM TV', tier:'Standard', posts_min:5,  posts_max:9,   rate_pkr:12600, currency:'USD', rate_raw:45,  notes:'Instagram Story — per story (5–9, 10% disc)' },
  { type:'Social Media Stories', channel:'HUM TV', tier:'Standard', posts_min:10, posts_max:999, rate_pkr:11760, currency:'USD', rate_raw:42,  notes:'Instagram Story — per story (10+, 15% disc)' },

  // ══ HUM MASALA — SOCIAL POSTS (USD) ════════════════════════════════════════
  { type:'Social Media Posts', channel:'Masala TV', tier:'Standard', posts_min:1,  posts_max:4,   rate_pkr:42000, currency:'USD', rate_raw:150, notes:'Facebook — per post (1 post)' },
  { type:'Social Media Posts', channel:'Masala TV', tier:'Standard', posts_min:5,  posts_max:9,   rate_pkr:37800, currency:'USD', rate_raw:135, notes:'Facebook — per post (5–9 posts, 10% disc)' },
  { type:'Social Media Posts', channel:'Masala TV', tier:'Standard', posts_min:10, posts_max:999, rate_pkr:35560, currency:'USD', rate_raw:127, notes:'Facebook — per post (10+ posts, 15% disc)' },

  { type:'Social Media Posts', channel:'Masala TV', tier:'Standard', posts_min:1,  posts_max:4,   rate_pkr:14000, currency:'USD', rate_raw:50,  notes:'Instagram — per post (1 post)' },
  { type:'Social Media Posts', channel:'Masala TV', tier:'Standard', posts_min:5,  posts_max:9,   rate_pkr:12600, currency:'USD', rate_raw:45,  notes:'Instagram — per post (5–9 posts, 10% disc)' },
  { type:'Social Media Posts', channel:'Masala TV', tier:'Standard', posts_min:10, posts_max:999, rate_pkr:11760, currency:'USD', rate_raw:42,  notes:'Instagram — per post (10+ posts, 15% disc)' },

  { type:'Social Media Posts', channel:'Masala TV', tier:'Standard', posts_min:1,  posts_max:4,   rate_pkr:14000, currency:'USD', rate_raw:50,  notes:'Twitter — per post (1 post)' },
  { type:'Social Media Posts', channel:'Masala TV', tier:'Standard', posts_min:5,  posts_max:9,   rate_pkr:12600, currency:'USD', rate_raw:45,  notes:'Twitter — per post (5–9 posts, 10% disc)' },
  { type:'Social Media Posts', channel:'Masala TV', tier:'Standard', posts_min:10, posts_max:999, rate_pkr:11760, currency:'USD', rate_raw:42,  notes:'Twitter — per post (10+ posts, 15% disc)' },

  { type:'Social Media Posts', channel:'Masala TV', tier:'Standard', posts_min:1,  posts_max:4,   rate_pkr:28000, currency:'USD', rate_raw:100, notes:'TikTok — per post (1 post)' },
  { type:'Social Media Posts', channel:'Masala TV', tier:'Standard', posts_min:5,  posts_max:9,   rate_pkr:25200, currency:'USD', rate_raw:90,  notes:'TikTok — per post (5–9 posts, 10% disc)' },
  { type:'Social Media Posts', channel:'Masala TV', tier:'Standard', posts_min:10, posts_max:999, rate_pkr:23800, currency:'USD', rate_raw:85,  notes:'TikTok — per post (10+ posts, 15% disc)' },

  // ══ HUM MASALA — SOCIAL STORIES (USD) ══════════════════════════════════════
  { type:'Social Media Stories', channel:'Masala TV', tier:'Standard', posts_min:1,  posts_max:4,   rate_pkr:14000, currency:'USD', rate_raw:50,  notes:'Facebook Story — per story (1 story)' },
  { type:'Social Media Stories', channel:'Masala TV', tier:'Standard', posts_min:5,  posts_max:9,   rate_pkr:12600, currency:'USD', rate_raw:45,  notes:'Facebook Story — per story (5–9, 10% disc)' },
  { type:'Social Media Stories', channel:'Masala TV', tier:'Standard', posts_min:10, posts_max:999, rate_pkr:12040, currency:'USD', rate_raw:43,  notes:'Facebook Story — per story (10+, 15% disc)' },

  { type:'Social Media Stories', channel:'Masala TV', tier:'Standard', posts_min:1,  posts_max:4,   rate_pkr:9800,  currency:'USD', rate_raw:35,  notes:'Instagram Story — per story (1 story)' },
  { type:'Social Media Stories', channel:'Masala TV', tier:'Standard', posts_min:5,  posts_max:9,   rate_pkr:8680,  currency:'USD', rate_raw:31,  notes:'Instagram Story — per story (5–9, 10% disc)' },
  { type:'Social Media Stories', channel:'Masala TV', tier:'Standard', posts_min:10, posts_max:999, rate_pkr:8120,  currency:'USD', rate_raw:29,  notes:'Instagram Story — per story (10+, 15% disc)' },

  // ══ SOCIAL MEDIA GUIDELINES (informational) ════════════════════════════════
  // • Video post < 1 min; if > 1 min cost doubled
  // • Collaborative post: rate increases by 100%
  // • Client provides all creatives (pictures/videos); must be royalty-free
  // • Artwork & captions shared 1 day prior to publishing

  // ══ EXCLUSIVE CONTENT / YOUTUBE ════════════════════════════════════════════
  { type:'Exclusive Content', channel:'YouTube',  tier:'Standard', rate_pkr:300000, currency:'PKR', notes:'Branded video — per video' },
  { type:'Exclusive Content', channel:'YouTube',  tier:'Premium',  rate_pkr:500000, currency:'PKR', notes:'Exclusive branded series — per episode' },
  { type:'Exclusive Content', channel:'HUM TV',   tier:'Premium',  rate_pkr:7500000,currency:'PKR', notes:'Live streaming sponsorship — per event' },

  // ══ EVENT SPONSORSHIP ══════════════════════════════════════════════════════
  { type:'Event Sponsorship', channel:'HUM TV', tier:'Presenting', rate_pkr:36050000, currency:'PKR', notes:'HUM Awards — full event (FY2024-25 actual)' },
  { type:'Event Sponsorship', channel:'HUM TV', tier:'Powered By', rate_pkr:9600000,  currency:'PKR', notes:'Bridal Couture Week — full package (FY2024-25 actual)' },
  { type:'Event Sponsorship', channel:'HUM TV', tier:'Presenting', rate_pkr:15000000, currency:'PKR', notes:'General event — standard presenting rate' },
  { type:'Event Sponsorship', channel:'HUM TV', tier:'Powered By', rate_pkr:8000000,  currency:'PKR', notes:'General event — standard powered by rate' },

  // ══ BRANDED CONTENT PACKAGES ═══════════════════════════════════════════════
  { type:'Branded Content Package', channel:'HUM TV', tier:'Standard', duration_weeks_min:1,  duration_weeks_max:4,  rate_pkr:5000000, currency:'PKR', notes:'1-month campaign' },
  { type:'Branded Content Package', channel:'HUM TV', tier:'Standard', duration_weeks_min:12, duration_weeks_max:25, rate_pkr:4250000, modifier_pct:-15, currency:'PKR', notes:'3–6 month campaign (15% discount)' },
  { type:'Branded Content Package', channel:'HUM TV', tier:'Premium',  duration_weeks_min:26, duration_weeks_max:52, rate_pkr:3500000, modifier_pct:-30, currency:'PKR', notes:'6–12 month campaign (30% discount)' },

  // ══ PRODUCT INTEGRATION ════════════════════════════════════════════════════
  { type:'Product Integration', channel:'HUM TV',    tier:'Standard', rate_pkr:200000, currency:'PKR', notes:'Per scene integration — drama' },
  { type:'Product Integration', channel:'HUM TV',    tier:'Premium',  rate_pkr:350000, currency:'PKR', notes:'Featured scene integration — drama' },
  { type:'Product Integration', channel:'Masala TV', tier:'Standard', rate_pkr:100000, currency:'PKR', notes:'Per scene integration — show' },
]

const CURRENCY_BADGE = {
  USD: 'bg-green-100 text-green-700 border-green-200',
  PKR: 'bg-blue-100 text-blue-700 border-blue-200',
}

export default function Rates() {
  const [rates, setRates]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [filterChannel, setFilterChannel] = useState('all')
  const [showModal, setShowModal]   = useState(false)
  const [editingId, setEditingId]   = useState(null)
  const [editRate, setEditRate]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [form, setForm]             = useState(defaultForm())
  const [seeded, setSeeded]         = useState(false)
  const [showGuide, setShowGuide]   = useState(false)

  function defaultForm() {
    return { type: RATE_TYPES[0], channel: 'HUM TV', tier: 'Standard', rate_pkr: '', modifier_pct: 0,
      posts_min: '', posts_max: '', duration_weeks_min: '', duration_weeks_max: '', notes: '', currency: 'PKR' }
  }

  useEffect(() => { fetchRates() }, [])

  async function fetchRates() {
    setLoading(true)
    const { data } = await supabase.from('rate_cards').select('*').order('type').order('channel')
    setRates(data || [])
    setLoading(false)
  }

  async function seedRates() {
    setSaving(true)
    // Strip rate_raw (not a DB column) before inserting
    const toInsert = SEED_RATES.map(({ rate_raw, ...rest }) => rest)
    const { error } = await supabase.from('rate_cards').insert(toInsert)
    if (!error) { fetchRates(); setSeeded(true) }
    else alert('Seed error: ' + error.message)
    setSaving(false)
  }

  async function saveRate(e) {
    e.preventDefault(); setSaving(true)
    const payload = {
      ...form,
      rate_pkr: Number(form.rate_pkr),
      modifier_pct: Number(form.modifier_pct) || 0,
      posts_min: form.posts_min ? Number(form.posts_min) : null,
      posts_max: form.posts_max ? Number(form.posts_max) : null,
      duration_weeks_min: form.duration_weeks_min ? Number(form.duration_weeks_min) : null,
      duration_weeks_max: form.duration_weeks_max ? Number(form.duration_weeks_max) : null,
    }
    const { error } = await supabase.from('rate_cards').insert([payload])
    if (!error) { setShowModal(false); setForm(defaultForm()); fetchRates() }
    else alert(error.message)
    setSaving(false)
  }

  async function saveEdit(id) {
    await supabase.from('rate_cards').update({ rate_pkr: Number(editRate), updated_at: new Date().toISOString() }).eq('id', id)
    setEditingId(null); fetchRates()
  }

  // Build local enriched list from SEED_RATES map for rate_raw display
  const rateRawMap = {}
  SEED_RATES.forEach(s => {
    const key = `${s.type}|${s.channel}|${s.tier}|${s.notes}`
    rateRawMap[key] = s.rate_raw
  })

  const types    = [...new Set(rates.map(r => r.type))]
  const channels = [...new Set(rates.map(r => r.channel))]
  const filtered = rates.filter(r =>
    (filterType    === 'all' || r.type    === filterType) &&
    (filterChannel === 'all' || r.channel === filterChannel)
  )

  // Group for display
  const grouped = filtered.reduce((acc, r) => {
    const key = r.type; if (!acc[key]) acc[key] = []; acc[key].push(r); return acc
  }, {})

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rates & Tariffs</h1>
          <p className="text-sm text-gray-500 mt-0.5">HUM Network Digital Rate Card 2025–2026 · <span className="text-green-600 font-medium">USD</span> = digital/web · <span className="text-blue-600 font-medium">PKR</span> = TV/sponsorship</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-2 border border-amber-200 text-amber-700 bg-amber-50 px-3 py-2 rounded-lg text-sm font-medium hover:bg-amber-100">
            <Info size={14}/> Social Guidelines
          </button>
          {rates.length === 0 && !seeded && (
            <button onClick={seedRates} disabled={saving}
              className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
              {saving ? 'Loading...' : 'Load Default Rates'}
            </button>
          )}
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600">
            <Plus size={16}/> Add Rate
          </button>
        </div>
      </div>

      {/* Social Media Guidelines banner */}
      {showGuide && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 space-y-1">
          <p className="font-semibold mb-2">📋 Social Media Guidelines (HUM Network)</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Video post must be under 1 minute — if longer, cost is <strong>doubled</strong></li>
            <li>Collaborative post: rate increases by <strong>100%</strong></li>
            <li>Client provides all creatives (pictures/videos) — must be <strong>royalty-free</strong></li>
            <li>Artwork and captions must be shared <strong>1 day prior</strong> to publishing date</li>
            <li>Editorial reserves the right to review and edit captions without changing brand message</li>
            <li>HUM News editorial reserves the right to accept/reject any post, album or story</li>
          </ul>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-gray-400 font-medium">Type:</span>
        <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterType==='all'?'bg-brand-500 text-white border-brand-500':'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>All</button>
        {types.map(t => (
          <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterType===t?'bg-brand-500 text-white border-brand-500':'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{t}</button>
        ))}
        <span className="text-xs text-gray-400 font-medium ml-2">Channel:</span>
        <button onClick={() => setFilterChannel('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterChannel==='all'?'bg-gray-800 text-white border-gray-800':'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>All</button>
        {channels.map(c => (
          <button key={c} onClick={() => setFilterChannel(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterChannel===c?'bg-gray-800 text-white border-gray-800':'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{c}</button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <DollarSign size={32} className="mx-auto mb-3 opacity-30"/>
            <p>No rates added yet</p>
            <p className="text-sm mt-1">Click "Load Default Rates" to populate from the 2025-2026 tariff</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Type','Channel','Tier','Volume / Duration','Currency','Rate','Discount','Notes',''].map(h =>
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => {
                const rateRaw = rateRawMap[`${r.type}|${r.channel}|${r.tier}|${r.notes}`]
                const isUSD   = r.currency === 'USD'
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800 text-xs">{r.type}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{r.channel || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{r.tier || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {r.posts_min
                        ? `${r.posts_min}–${r.posts_max && r.posts_max < 999 ? r.posts_max : '+'} posts`
                        : r.duration_weeks_min
                        ? `${r.duration_weeks_min}–${r.duration_weeks_max || '+'}w`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${CURRENCY_BADGE[r.currency || 'PKR']}`}>
                        {r.currency || 'PKR'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 text-sm">
                      {editingId === r.id ? (
                        <input type="number" value={editRate} onChange={e => setEditRate(e.target.value)}
                          className="w-28 border border-brand-300 rounded px-2 py-1 text-xs focus:outline-none" autoFocus/>
                      ) : (
                        isUSD
                          ? <span className="text-green-700">{rateRaw !== undefined ? `$${Number(rateRaw).toLocaleString()}` : `$${Number(r.rate_pkr/280).toFixed(0)}`}</span>
                          : <span>{fmt(r.rate_pkr, r.currency, rateRaw)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {r.modifier_pct ? `${r.modifier_pct}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate" title={r.notes}>{r.notes || '—'}</td>
                    <td className="px-4 py-3">
                      {editingId === r.id ? (
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(r.id)} className="text-xs text-green-600 hover:underline flex items-center gap-1">
                            <Check size={12}/> Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:underline">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingId(r.id); setEditRate(r.rate_pkr) }}
                          className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
                          <Pencil size={12}/> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Rate Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Add Rate</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18}/></button>
            </div>
            <form onSubmit={saveRate} className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {RATE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
                  <select value={form.channel} onChange={e => setForm({...form, channel: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {CHANNELS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tier</label>
                  <select value={form.tier} onChange={e => setForm({...form, tier: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {TIERS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
                  <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="PKR">PKR (₨)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Rate ({form.currency === 'USD' ? '$' : '₨'}) *</label>
                  <input required type="number" value={form.rate_pkr} onChange={e => setForm({...form, rate_pkr: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Discount %</label>
                  <input type="number" value={form.modifier_pct} onChange={e => setForm({...form, modifier_pct: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                  <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Per episode — prime time drama"/>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-60">
                  {saving ? 'Saving...' : 'Add Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
