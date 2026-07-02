// ─────────────────────────────────────────────────────────────────────────────
// HUM Network · Digital Direct Sales · FY2023-24, FY2024-25, FY2025-26
// Sources:
//  - "Digital Direct sales revenue, July, 2024 to June, 2025.xlsx" (monthly + category, FY24-25)
//  - "Digital Sales Business 2026.xlsx" (campaign-level W&S bookings, FY25-26)
//  - "DIGITAL SALES BUSINESS" PPT (FY23-24 monthly, agency & business-type tables)
//  - "HUM_Digital_Sales_Master_Report_FINAL" PPT (FY25-26 monthly actuals, channel splits)
// ─────────────────────────────────────────────────────────────────────────────

export const FY_LIST = ['FY2023-24', 'FY2024-25', 'FY2025-26']
export const FY_TARGET = 'FY2026-27'
export const TARGET_TOTAL = 500000000      // PKR 500M target for FY2026-27
export const TARGET_MONTHLY = Math.round(TARGET_TOTAL / 12)

export const FY_META = {
  'FY2023-24': { label: 'FY 2023-24', range: 'Jul 2023 – Jun 2024', total: 156774312, status: 'Complete · 12 months' },
  'FY2024-25': { label: 'FY 2024-25', range: 'Jul 2024 – Jun 2025', total: 245320227, status: 'Complete · 12 months · Record year' },
  'FY2025-26': { label: 'FY 2025-26', range: 'Jul 2025 – Jun 2026', total: 224883950, status: 'Complete · 12 months · Jul 2025 – Jun 2026' },
  'FY2026-27': { label: 'FY 2026-27', range: 'Jul 2026 – Jun 2027', total: 0, status: `Target year · PKR 500M goal (≈PKR ${(TARGET_MONTHLY / 1000000).toFixed(1)}M/month)` },
}

// One record per month. key = 'YYYY-MM'. total = full network revenue (PKR).
// cat = business-type split where the source provides it (FY24-25 from Excel).
// status: 'complete' | 'partial' (W&S bookings only so far) | 'pending'
export const MONTHS = [
  // ── FY2023-24 (PPT, complete) ──
  { key: '2023-07', fy: 'FY2023-24', label: 'Jul 2023', total: 9197596,  status: 'complete' },
  { key: '2023-08', fy: 'FY2023-24', label: 'Aug 2023', total: 5577340,  status: 'complete' },
  { key: '2023-09', fy: 'FY2023-24', label: 'Sep 2023', total: 13469756, status: 'complete' },
  { key: '2023-10', fy: 'FY2023-24', label: 'Oct 2023', total: 7155109,  status: 'complete' },
  { key: '2023-11', fy: 'FY2023-24', label: 'Nov 2023', total: 8780249,  status: 'complete' },
  { key: '2023-12', fy: 'FY2023-24', label: 'Dec 2023', total: 20692201, status: 'complete' },
  { key: '2024-01', fy: 'FY2023-24', label: 'Jan 2024', total: 8467186,  status: 'complete' },
  { key: '2024-02', fy: 'FY2023-24', label: 'Feb 2024', total: 8239224,  status: 'complete' },
  { key: '2024-03', fy: 'FY2023-24', label: 'Mar 2024', total: 37628941, status: 'complete' },
  { key: '2024-04', fy: 'FY2023-24', label: 'Apr 2024', total: 8181746,  status: 'complete' },
  { key: '2024-05', fy: 'FY2023-24', label: 'May 2024', total: 12284970, status: 'complete' },
  { key: '2024-06', fy: 'FY2023-24', label: 'Jun 2024', total: 17099994, status: 'complete' },
  // ── FY2024-25 (Excel, complete, with category split) ──
  { key: '2024-07', fy: 'FY2024-25', label: 'Jul 2024', total: 11632110, status: 'complete', cat: { drama: 10536304, events: 0,        exclusive: 0,       live: 0,       web_social: 735806,  glam: 360000 } },
  { key: '2024-08', fy: 'FY2024-25', label: 'Aug 2024', total: 10427906, status: 'complete', cat: { drama: 9418304,  events: 0,        exclusive: 0,       live: 0,       web_social: 949602,  glam: 60000 } },
  { key: '2024-09', fy: 'FY2024-25', label: 'Sep 2024', total: 49604122, status: 'complete', cat: { drama: 10561974, events: 30605000, exclusive: 0,       live: 7500000, web_social: 577148,  glam: 360000 } },
  { key: '2024-10', fy: 'FY2024-25', label: 'Oct 2024', total: 12471762, status: 'complete', cat: { drama: 7246380,  events: 0,        exclusive: 0,       live: 0,       web_social: 3750382, glam: 1475000 } },
  { key: '2024-11', fy: 'FY2024-25', label: 'Nov 2024', total: 8023514,  status: 'complete', cat: { drama: 4748304,  events: 0,        exclusive: 2100000, live: 0,       web_social: 975210,  glam: 200000 } },
  { key: '2024-12', fy: 'FY2024-25', label: 'Dec 2024', total: 29756528, status: 'complete', cat: { drama: 8388030,  events: 9600000,  exclusive: 2800000, live: 7500000, web_social: 1468498, glam: 0 } },
  { key: '2025-01', fy: 'FY2024-25', label: 'Jan 2025', total: 15086333, status: 'complete', cat: { drama: 14586333, events: 0,        exclusive: 0,       live: 0,       web_social: 500000,  glam: 0 } },
  { key: '2025-02', fy: 'FY2024-25', label: 'Feb 2025', total: 8426667,  status: 'complete', cat: { drama: 7926667,  events: 0,        exclusive: 0,       live: 0,       web_social: 500000,  glam: 0 } },
  { key: '2025-03', fy: 'FY2024-25', label: 'Mar 2025', total: 68726285, status: 'complete', cat: { drama: 60526285, events: 0,        exclusive: 0,       live: 7500000, web_social: 700000,  glam: 0 } },
  { key: '2025-04', fy: 'FY2024-25', label: 'Apr 2025', total: 9431000,  status: 'complete', cat: { drama: 8931000,  events: 0,        exclusive: 0,       live: 0,       web_social: 500000,  glam: 0 } },
  { key: '2025-05', fy: 'FY2024-25', label: 'May 2025', total: 9844000,  status: 'complete', cat: { drama: 9344000,  events: 0,        exclusive: 0,       live: 0,       web_social: 500000,  glam: 0 } },
  { key: '2025-06', fy: 'FY2024-25', label: 'Jun 2025', total: 11890000, status: 'complete', cat: { drama: 3890000,  events: 0,        exclusive: 0,       live: 7500000, web_social: 500000,  glam: 0 } },
  // ── FY2025-26 (Master report actuals Jul–Mar; Apr–May = W&S bookings only) ──
  { key: '2025-07', fy: 'FY2025-26', label: 'Jul 2025', total: 4190000,  status: 'complete' },
  { key: '2025-08', fy: 'FY2025-26', label: 'Aug 2025', total: 5070000,  status: 'complete' },
  { key: '2025-09', fy: 'FY2025-26', label: 'Sep 2025', total: 13260000, status: 'complete' },
  { key: '2025-10', fy: 'FY2025-26', label: 'Oct 2025', total: 15940000, status: 'complete' },
  { key: '2025-11', fy: 'FY2025-26', label: 'Nov 2025', total: 40530000, status: 'complete' },
  { key: '2025-12', fy: 'FY2025-26', label: 'Dec 2025', total: 76460000, status: 'complete' },
  { key: '2026-01', fy: 'FY2025-26', label: 'Jan 2026', total: 6360000,  status: 'complete' },
  { key: '2026-02', fy: 'FY2025-26', label: 'Feb 2026', total: 16310000, status: 'complete' },
  { key: '2026-03', fy: 'FY2025-26', label: 'Mar 2026', total: 21390000, status: 'complete' },
  { key: '2026-04', fy: 'FY2025-26', label: 'Apr 2026', total: 5606000,   status: 'complete', cat: { drama: 5240000, events: 0, exclusive: 0, live: 0, web_social: 366000,  glam: 0 } },
  { key: '2026-05', fy: 'FY2025-26', label: 'May 2026', total: 11289950,  status: 'complete', cat: { drama: 10494000, events: 0, exclusive: 0, live: 0, web_social: 795950, glam: 0 } },
  { key: '2026-06', fy: 'FY2025-26', label: 'Jun 2026', total: 8478000,   status: 'complete', cat: { drama: 7718000, events: 0, exclusive: 0, live: 0, web_social: 760000,  glam: 0 } },
  // ── FY2026-27 (target year — PKR 500M goal split evenly; actuals fill in from live entries) ──
  { key: '2026-07', fy: 'FY2026-27', label: 'Jul 2026', total: 0, status: 'target', target: TARGET_MONTHLY },
  { key: '2026-08', fy: 'FY2026-27', label: 'Aug 2026', total: 0, status: 'target', target: TARGET_MONTHLY },
  { key: '2026-09', fy: 'FY2026-27', label: 'Sep 2026', total: 0, status: 'target', target: TARGET_MONTHLY },
  { key: '2026-10', fy: 'FY2026-27', label: 'Oct 2026', total: 0, status: 'target', target: TARGET_MONTHLY },
  { key: '2026-11', fy: 'FY2026-27', label: 'Nov 2026', total: 0, status: 'target', target: TARGET_MONTHLY },
  { key: '2026-12', fy: 'FY2026-27', label: 'Dec 2026', total: 0, status: 'target', target: TARGET_MONTHLY },
  { key: '2027-01', fy: 'FY2026-27', label: 'Jan 2027', total: 0, status: 'target', target: TARGET_MONTHLY },
  { key: '2027-02', fy: 'FY2026-27', label: 'Feb 2027', total: 0, status: 'target', target: TARGET_MONTHLY },
  { key: '2027-03', fy: 'FY2026-27', label: 'Mar 2027', total: 0, status: 'target', target: TARGET_MONTHLY },
  { key: '2027-04', fy: 'FY2026-27', label: 'Apr 2027', total: 0, status: 'target', target: TARGET_MONTHLY },
  { key: '2027-05', fy: 'FY2026-27', label: 'May 2027', total: 0, status: 'target', target: TARGET_MONTHLY },
  { key: '2027-06', fy: 'FY2026-27', label: 'Jun 2027', total: 0, status: 'target', target: TARGET_MONTHLY },
]

// Distinct, non-clashing palette: red / blue / teal / amber / violet / pink
export const CAT_META = [
  { id: 'drama',      name: 'Drama Sponsorship', color: '#c0392b' },
  { id: 'events',     name: 'Events',            color: '#2563eb' },
  { id: 'live',       name: 'Live Streaming',    color: '#0d9488' },
  { id: 'exclusive',  name: 'Exclusive Content', color: '#f59e0b' },
  { id: 'web_social', name: 'Web / Social',      color: '#7c3aed' },
  { id: 'glam',       name: 'Glam Magazine',     color: '#db2777' },
]

// Business-type totals per half-year period (from PPT tables, totals verified)
export const BUSINESS_TYPE_PERIODS = [
  {
    period: 'H1 FY2023-24 (Jul–Dec 2023)', total: 64872251,
    types: [
      { name: 'Drama Sponsorships', value: 46746805 },
      { name: 'Events', value: 5500000 },
      { name: 'Exclusive Content', value: 1200000 },
      { name: 'Podcast', value: 800000 },
      { name: 'Website Banners / PR', value: 9194454 },
      { name: 'Social Media Posts', value: 1430992 },
      { name: 'Glam Magazine', value: 0 },
    ],
  },
  {
    period: 'H1 FY2024-25 (Jul–Dec 2024)', total: 121915942,
    types: [
      { name: 'Drama Sponsorships', value: 49966570 },
      { name: 'Events', value: 45150000 },
      { name: 'Live Streaming', value: 15000000 },
      { name: 'Web-series / Telefilm', value: 3567726 },
      { name: 'Website Banners / PR', value: 5452646 },
      { name: 'Social Media Posts', value: 324000 },
      { name: 'Glam Magazine', value: 2455000 },
    ],
  },
]

// Channel revenue per fiscal year (PKR). FY24-25 = H1 confirmed split only.
export const CHANNELS_BY_FY = [
  {
    fy: 'FY2023-24', scope: 'Full year', total: 156774312,
    channels: { 'HUM TV Entertainment': 144389898, 'HUM News': 8950923, 'Masala TV': 3433491, 'Glam Magazine': 0 },
    note: 'Glam Magazine revenue reported inside HUM TV for this year (~PKR 0.7M).',
  },
  {
    fy: 'FY2024-25', scope: 'H1 confirmed (Jul–Dec 2024)', total: 121915942,
    channels: { 'HUM TV Entertainment': 112517946, 'HUM News': 5199326, 'Masala TV': 1743670, 'Glam Magazine': 2455000 },
    note: 'Channel split confirmed for H1 only; full-year total was PKR 245.3M.',
  },
  {
    fy: 'FY2025-26', scope: '9 months (Jul 2025 – Mar 2026)', total: 199480000,
    channels: { 'HUM TV Entertainment': 149600000, 'HUM News': 42500000, 'Masala TV': 6650000, 'Glam Magazine': 730000 },
    note: 'HUM News grew from PKR 9M (FY2023-24) to PKR 42.5M — +372% in two years.',
  },
]

export const CHANNEL_COLORS = {
  'HUM TV Entertainment': '#c0392b',
  'HUM News': '#2563eb',
  'Masala TV': '#0d9488',
  'Glam Magazine': '#db2777',
}

// Agency / brand totals per period (PPT tables — totals tie out to period totals)
// type: 'agency' = media/ad agency · 'brand' = advertiser billed directly · 'direct' = assorted direct deals
export const ENTITIES = [
  { name: 'Mobilink',               type: 'brand',  fy24h1: 15000000, fy25h1: 16500000, note: 'Brand (telecom). “Mobilik” in FY23-24 source. Consistent both years.' },
  { name: 'IG Square',              type: 'agency', fy24h1: 0,        fy25h1: 38400000, note: 'New in FY24-25 — single largest agency that half.' },
  { name: 'Blitz Advertising',      type: 'agency', fy24h1: 0,        fy25h1: 12000000, note: 'New — one large Sep-24 booking.' },
  { name: 'GroupM',                 type: 'agency', fy24h1: 9545000,  fy25h1: 1415000,  note: 'Down 85% H1-over-H1 — recovery priority.' },
  { name: 'BrainChild / Starcom',   type: 'agency', fy24h1: 7567268,  fy25h1: 8140000,  note: 'Present in all three years.' },
  { name: 'Time & Space',           type: 'agency', fy24h1: 7241075,  fy25h1: 1485000,  note: 'Down 79% H1-over-H1 — recovery priority.' },
  { name: 'Media Networks',         type: 'agency', fy24h1: 6250000,  fy25h1: 6875000,  note: 'Consistent recurring.' },
  { name: 'Starcrest',              type: 'agency', fy24h1: 5055000,  fy25h1: 6576900,  note: 'Growing.' },
  { name: 'Digital Creation',       type: 'agency', fy24h1: 2918000,  fy25h1: 7379000,  note: 'Up 154% H1-over-H1.' },
  { name: 'Wings Media',            type: 'agency', fy24h1: 0,        fy25h1: 6570000,  note: 'New entrant FY24-25.' },
  { name: 'Dubai Economy & Tourism',type: 'brand',  fy24h1: 0,        fy25h1: 3567726,  note: 'Direct advertiser — web-series deal.' },
  { name: 'Adcom',                  type: 'agency', fy24h1: 600000,   fy25h1: 3030000 },
  { name: 'Synergy',                type: 'agency', fy24h1: 2952754,  fy25h1: 0 },
  { name: 'Direct',                 type: 'direct', fy24h1: 1195676,  fy25h1: 1963000,  note: 'Direct client deals — growing every year, no agency commission.' },
  { name: 'Z2C',                    type: 'agency', fy24h1: 1800000,  fy25h1: 0 },
  { name: 'Digital Marvels',        type: 'agency', fy24h1: 568421,   fy25h1: 1749277 },
  { name: 'Pak Media Com',          type: 'agency', fy24h1: 0,        fy25h1: 1520000,  note: 'FY25-26 breakout — Nestlé Spelling Whizz (PKR 17.75M).' },
  { name: 'Oktopus',                type: 'agency', fy24h1: 1675000,  fy25h1: 360000 },
  { name: 'RG Blue',                type: 'agency', fy24h1: 1200000,  fy25h1: 0 },
  { name: 'Alliancez',              type: 'agency', fy24h1: 84408,    fy25h1: 875675 },
  { name: 'Wounder Ideas',          type: 'agency', fy24h1: 0,        fy25h1: 520000 },
  { name: 'Adpulse',                type: 'agency', fy24h1: 0,        fy25h1: 500000 },
  { name: 'Red Ocean Communication',type: 'agency', fy24h1: 0,        fy25h1: 500000 },
  { name: 'Skin White',             type: 'brand',  fy24h1: 0,        fy25h1: 400000,   note: 'Brand billed directly.' },
  { name: 'IO Digital',             type: 'agency', fy24h1: 373349,   fy25h1: 400000 },
  { name: 'Sound & Vision',         type: 'agency', fy24h1: 480000,   fy25h1: 0 },
  { name: 'MIL',                    type: 'agency', fy24h1: 0,        fy25h1: 300000 },
  { name: 'TNS Digital',            type: 'agency', fy24h1: 0,        fy25h1: 285000 },
  { name: 'Smartways',              type: 'agency', fy24h1: 128700,   fy25h1: 0 },
  { name: 'RAAS',                   type: 'agency', fy24h1: 0,        fy25h1: 120000 },
  { name: 'Walee',                  type: 'agency', fy24h1: 0,        fy25h1: 112264,   note: 'Mostly government campaigns.' },
  { name: 'Digital Guru',           type: 'agency', fy24h1: 0,        fy25h1: 105020 },
  { name: 'Talking Point',          type: 'agency', fy24h1: 0,        fy25h1: 94080 },
  { name: 'DGS',                    type: 'agency', fy24h1: 0,        fy25h1: 75000 },
  { name: 'Convex Interactive',     type: 'agency', fy24h1: 0,        fy25h1: 60000 },
  { name: 'Viral Edge',             type: 'agency', fy24h1: 60000,    fy25h1: 30000 },
  { name: 'Media Matters',          type: 'agency', fy24h1: 50000,    fy25h1: 0 },
  { name: 'Ekon7',                  type: 'agency', fy24h1: 50000,    fy25h1: 0 },
  { name: 'PR PMC',                 type: 'agency', fy24h1: 47600,    fy25h1: 0 },
  { name: 'BodyBeat',               type: 'agency', fy24h1: 30000,    fy25h1: 8000 },
]

// Canonical agency names for FY25-26 campaign rows (source spellings vary)
const AGENCY_ALIASES = {
  'starcom': 'BrainChild / Starcom', 'brainchild': 'BrainChild / Starcom',
  'brain child.starcom pakistan': 'BrainChild / Starcom', 'brain child, starcom pakistan': 'BrainChild / Starcom',
  'io digital': 'IO Digital', 'body beat': 'BodyBeat', 'bodybeat': 'BodyBeat',
  'mesh media': 'Mesh Media', 'hakuna media': 'Hakuna Matata', 'hakuna matata': 'Hakuna Matata',
  'resonance': 'Resonance Digital', 'resonance digital': 'Resonance Digital',
  'pak media communications': 'Pak Media Com', 'pak media com': 'Pak Media Com',
  'time and space': 'Time & Space', 'wings': 'Wings Media', 'media matters': 'Media Matters',
  'digitalk': 'Digitalk', 'walee': 'Walee', 'dgs': 'DGS', 'mil': 'MIL', 'adcom': 'Adcom',
  'direct': 'Direct', 'barter': 'Barter', 'marcom': 'Marcom', 'devcom': 'Devcom',
  'revolution': 'Revolution', 'strategix': 'Strategix', 'digital marvels': 'Digital Marvels',
}
const BRAND_ALIASES = {
  'sngpl': 'SNGPL', 'federal government': 'Federal Govt', 'federal govt': 'Federal Govt',
  'gop': 'Govt of Punjab', 'planning': 'Ministry of Planning', 'ministry of planning': 'Ministry of Planning',
  'pser': 'PSER (Punjab Social Protection)', 'punjab social protection authority': 'PSER (Punjab Social Protection)',
  'moib ramzan relief': 'MOIB', 'moib': 'MOIB',
}
function canon(raw, aliases) {
  const k = String(raw).trim().toLowerCase()
  return aliases[k] || String(raw).trim()
}

// FY2025-26 campaign-level bookings — Website & Social Media sales only
// (drama / event sponsorships for FY25-26 are not itemised in the source file).
// Rows preserved exactly as recorded, including repeated entries present in the source.
const RAW_CAMPAIGNS_FY26 = [
  ['2025-07', 'Resonance Digital', 'Ministry of Planning', 'Hum News Insta', 'Ministry of Planning', 20000],
  ['2025-07', 'MIL', 'UBL', 'Glam Magazine', 'UBL', 100000],
  ['2025-07', 'Starcom', 'Coronet Foods', 'HUM News Website', 'EBM', 120000],
  ['2025-07', 'BrainChild', 'Personal Loan', 'Hum News', 'HBL', 200000],
  ['2025-07', 'Direct', 'Stiles', 'Glam Magazine', 'Stiles', 60000],
  ['2025-07', 'IO Digital', 'Haier', 'HUM News Website', 'Haier', 155052],
  ['2025-07', 'Direct', 'KP Government Article', 'HUM News Website', 'KP Government', 40000],
  ['2025-08', 'Revolution', 'DGPR - Azaadi campaign', 'Hum News Website + Video', 'DGPR', 380000],
  ['2025-08', 'Walee', 'Federal Government', 'Hum News Website and Insta', 'Federal Govt', 150000],
  ['2025-08', 'Walee', 'Federal Government', 'Hum News Instagram', 'Federal Govt', 15000],
  ['2025-08', 'Revolution', 'DGPR - CM Punjab Japan Visit', 'Hum News Website + Video', 'DGPR', 379726],
  ['2025-08', 'Marcom', 'AEO', 'HUM TV Insta and Facebook', 'AEO', 116100],
  ['2025-08', 'Devcom', 'MOPDSI', 'Hum News Instagram', 'Ministry of Planning', 40000],
  ['2025-08', 'IO Digital', 'REF', 'HUM News Website', 'Haier', 160801],
  ['2025-08', 'Direct', 'mohsinnawaz.sports', 'Hum News Insta', 'mohsinnawaz.sports', 8000],
  ['2025-08', 'Resonance Digital', 'International Youth Day', 'Hum News Insta', 'Govt of Punjab', 10000],
  ['2025-08', 'Resonance Digital', 'Independence Day Campaign', 'Hum News Insta', 'Govt of Punjab', 10000],
  ['2025-08', 'Direct', 'Italy Client for Glam (50% advance)', 'Glam', 'Ezza', 50000],
  ['2025-08', 'Starcom', 'Independence Day CEO Snippet', 'HUM News Digital', 'Syngenta', 85000],
  ['2025-08', 'Direct', 'Independence Day CEO Snippet', 'HUM News Digital', 'Hemani Herbal', 115000],
  ['2025-08', 'Starcom', 'Independence Day CEO Snippet', 'HUM News Digital', 'Dawlance', 100000],
  ['2025-08', 'IO Digital', 'REF', 'HUM News Digital', 'Haier', 160801],
  ['2025-09', 'Time and Space', 'FFC Roadblock', 'Hum News Urdu Website', 'FFC', 75000],
  ['2025-09', 'Resonance', 'Digital Invoicing', 'Hum News Urdu Website', 'FBR', 145000],
  ['2025-09', 'Walee', 'FBR Publications', 'Instagram and Facebook', 'FBR', 86747],
  ['2025-09', 'DGS', 'Simplified Income Tax Returns', 'Hum News Urdu Website', 'FBR', 42300],
  ['2025-09', 'Direct', 'Shahid Afridi Signing', 'Hum News English Website', 'Gillani Group', 40000],
  ['2025-09', 'Resonance Digital', 'FBR', 'Hum News', 'FBR', 145000],
  ['2025-09', 'MIL', 'UBL', 'Glam', 'UBL', 100000],
  ['2025-09', 'Direct', 'Stiles', 'Glam', 'Stiles', 60000],
  ['2025-09', 'Direct', 'Dinners', 'Glam', 'Dinner Sohayee', 100000],
  ['2025-10', 'Adcom', 'K&N Product Launch', 'HUM Network Website', 'K&N', 200000],
  ['2025-10', 'Direct', 'LUMU Mart Opening Soon', 'Hum News + Hum TV Insta', 'LUMU', 60000],
  ['2025-10', 'Body Beat', 'Komal Rizvi', 'Hum TV Insta', 'Komal Rizvi Song', 28000],
  ['2025-11', 'Starcom', 'Retail | Freedom Account', 'HUM News Urdu Website', 'HBL', 250000],
  ['2025-11', 'Pak Media Communications', 'Nido Hum Spelling Whizz', 'Hum News Social', 'Nestle', 17500000],
  ['2025-11', 'Direct', 'Onderland Hum Spelling Whizz', 'Hum News Social', 'Lucky Entertainment', 1000000],
  ['2025-11', 'Hakuna Matata', 'Punjab Social Protection Authority', 'Hum News', 'PSER (Punjab Social Protection)', 170000],
  ['2025-11', 'Mesh Media', 'Hum Awards Insta Post', 'Hum TV Insta', 'Haier', 500000],
  ['2025-11', 'Wings', 'Choco Hum Spelling Whizz', 'Hum News Social', 'Innovative', 2000000],
  ['2025-11', 'Direct', 'OGDCL Hum Spelling Whizz', 'Hum News Social', 'OGDCL', 4000000],
  ['2025-11', 'Barter', 'Burger O Clock Spelling Whizz', 'News and Masala Social', 'Burger O Clock', 750000],
  ['2025-11', 'Barter', 'Avari Spelling Whizz', 'Hum News Social', 'Avari Xpress', 3500000],
  ['2025-11', 'Direct', 'mohsinnawaz.sports', 'Hum News Insta', 'mohsinnawaz.sports', 8000],
  ['2025-11', 'Direct', 'UBL', 'Glam', 'UBL', 100000],
  ['2025-11', 'Direct', 'Falaknaz', 'Glam', 'Falaknaz', 100000],
  ['2025-11', 'Direct', 'Stiles', 'Glam', 'Stiles', 60000],
  ['2025-11', 'Hakuna Matata', 'PSER', 'Hum News', 'PSER (Punjab Social Protection)', 170000],
  ['2025-12', 'Media Matters', 'Bank Alfalah Flood Donation', 'Instagram', 'Bank Alfalah', 10000],
  ['2025-12', 'Walee', 'PM Laptop Scheme', 'Hum News Instagram', 'Federal Govt', 15000],
  ['2025-12', 'Digital Marvels', 'SMOG', 'Hum News Instagram', 'DGPR', 100000],
  ['2025-12', 'Walee', "NAB's Recovery & Economic Impact", 'Hum News Video + Podcast', 'NAB', 1500000],
  ['2025-12', 'DGS', 'Social Protection Wallet', 'Hum News Website + Video', 'BISP', 263225],
  ['2025-12', 'Hakuna media', 'Awareness', 'Hum News Website', 'SNGPL', 220000],
  ['2025-12', 'Adcom', 'K&N Croissant', 'HUM Network Website', 'K&N', 250000],
  ['2025-12', 'Digitalk', 'Metro Station Lahore', 'Hum News Insta', 'Metro Station Lahore', 8050],
  ['2025-12', 'BodyBeat', 'BYD', 'Hum News Insta', 'BYD', 10000],
  ['2025-12', 'Mesh Media', 'Haier', 'Hum Awards Insta', 'Haier', 500000],
  ['2025-12', 'Hakuna Matata', 'Awareness', 'Hum News', 'SNGPL', 220000],
  ['2026-01', 'Hakuna media', 'Awareness', 'Hum News Website', 'SNGPL', 220000],
  ['2026-01', 'Marcom', 'AEO', 'HUM TV Social Posts', 'AEO', 147420],
  ['2026-02', 'Hakuna media', 'Awareness', 'Hum News Website', 'SNGPL', 220000],
  ['2026-02', 'Brain Child.Starcom Pakistan', 'Brand Awareness (Clock Widget)', 'HUM News Website', 'HBL', 1000000],
  ['2026-02', 'DGS', 'Islamic Relief', 'Hum News Website', 'Islamic Relief', 177101],
  ['2026-02', 'DGS', 'BOK', 'Hum News Website', 'BOK', 158063],
  ['2026-02', 'Walee', 'MOIB Ramzan Relief', 'Hum News', 'MOIB', 750000],
  ['2026-03', 'Hakuna media', 'Awareness', 'Hum News Website', 'SNGPL', 220000],
  ['2026-03', 'Brain Child, Starcom Pakistan', 'Brand Refresher', 'HUM TV YouTube / Drama', 'HBL', 1000000],
  ['2026-03', 'Pak Media Com', 'Whitelisting', 'HUM Masala', 'Nestle', 250000],
  ['2026-03', 'Brain Child, Starcom Pakistan', 'Whitelisting', 'HUM Masala', 'Dawlance', 1500000],
  ['2026-03', 'Brain Child, Starcom Pakistan', 'Brand Refresher', 'HUM News Website', 'HBL', 95000],
  ['2026-03', 'Brain Child, Starcom Pakistan', 'Remittances', 'HUM News Website', 'HBL', 180000],
  ['2026-03', 'DGS', 'BISP Kafalat', 'Hum News', 'BISP', 263225],
  ['2026-04', 'Hakuna media', 'Awareness', 'Hum News Website', 'SNGPL', 63000],
  ['2026-04', 'Walee', 'PM Laptop Scheme', 'Hum News Instagram', 'MOIB', 28000],
  ['2026-04', 'DGS', 'BOK', 'Hum News Socials', 'BOK', 200000],
  ['2026-04', 'BodyBeat', 'Nida Yasir', 'Glam Insta', 'Nida Yasir', 5000],
  ['2026-04', 'Strategix', 'Tap Tap Send', 'Hum English Website', 'Tap Tap Send', 70000],
  ['2026-05', 'DGS', 'Marka e Haq', 'HUM News Website', 'MOIB', 145950],
  ['2026-05', 'DGS', 'Marka e Haq', 'HUM News Socials', 'MOIB', 250000],
  ['2026-05', 'Walee', 'PM Visit to China', 'Hum News Socials', 'MOIB', 400000],
  // ── June 2026 W&S ──
  ['2026-06', 'Walee', 'MOIB Budget', 'Hum News', 'MOIB', 400000],
  ['2026-06', 'DGS', 'BISP', 'Hum News', 'BISP', 200000],
  ['2026-06', 'Linkers', 'BISP Digital Wallet', 'Hum News', 'BISP', 160000],
  // ── June 2026 Drama (recorded separately — not in W&S file) ──
  ['2026-06', 'Time & Space', 'Presented by Khursheed fan (Zanjeerain)', 'HUM TV', 'Khursheed Fans', 1520000],
  ['2026-06', 'Media Network', 'Powered by Master Paint (Zanjeerain)', 'HUM TV', 'Master Paint', 1224000],
  ['2026-06', 'Vince', 'Associated by Vince (Zanjeerain)', 'HUM TV', 'Vince', 1200000],
  ['2026-06', 'Brighto Paints', 'Presented by Brighto Paints (Leader)', 'HUM TV', 'Brighto Paints', 760000],
  ['2026-06', 'WPP', 'Presented by Sunsilk (Winter Love)', 'HUM TV', 'Sunsilk', 1360000],
  ['2026-06', 'Skinwhite', 'Associated by Skinwhite (Winter Love)', 'HUM TV', 'Skinwhite', 1160000],
  ['2026-06', 'Digital Creation', 'TikTok Reel (Black Beauty / Zanjeerain)', 'HUM TV', 'Black Beauty', 38000],
  ['2026-06', 'Digital Creation', 'TikTok Reel (SIA Beauty Cream / Zanjeerain)', 'HUM TV', 'SIA Beauty Cream', 456000],
  // ── April 2026 Drama (recorded separately) ──
  ['2026-04', 'Time & Space', 'Presented by Khursheed fan (Zanjeerain)', 'HUM TV', 'Khursheed Fans', 380000],
  ['2026-04', 'Media Network', 'Powered by Master Paint (Muamma)', 'HUM TV', 'Master Paint', 1224000],
  ['2026-04', 'Media Network', 'Powered by Master Paint (Zanjeerain)', 'HUM TV', 'Master Paint', 306000],
  ['2026-04', 'Brighto Paints', 'Presented by Brighto Paints (Leader)', 'HUM TV', 'Brighto Paints', 1140000],
  ['2026-04', 'Vince', 'Associated by Vince (Zanjeerain)', 'HUM TV', 'Vince', 300000],
  ['2026-04', 'GroupM', 'Presented by Sunsilk (Winter Love)', 'HUM TV', 'Sunsilk', 1020000],
  ['2026-04', 'Skinwhite', 'Associated by Skinwhite (Winter Love)', 'HUM TV', 'Skinwhite', 870000],
  // ── May 2026 Drama (recorded separately) ──
  ['2026-05', 'Time & Space', 'Presented by Khursheed fan (Zanjeerain)', 'HUM TV', 'Khursheed Fans', 1520000],
  ['2026-05', 'Media Network', 'Powered by Master Paint (Zanjeerain)', 'HUM TV', 'Master Paint', 1224000],
  ['2026-05', 'Brighto Paints', 'Presented by Brighto Paints (Leader)', 'HUM TV', 'Brighto Paints', 950000],
  ['2026-05', 'Vince', 'Associated by Vince (Zanjeerain)', 'HUM TV', 'Vince', 1200000],
  ['2026-05', 'WPP', 'Presented by Sunsilk (Winter Love)', 'HUM TV', 'Sunsilk', 1700000],
  ['2026-05', 'WPP', 'Knorr Presents Meat Menu', 'HUM TV', 'Knorr', 1700000],
  ['2026-05', 'WPP', 'Knorr Presents Khana Kahani', 'HUM TV', 'Knorr', 750000],
  ['2026-05', 'Skinwhite', 'Associated by Skinwhite (Winter Love)', 'HUM TV', 'Skinwhite', 1450000],
]

export const CAMPAIGNS_FY26 = RAW_CAMPAIGNS_FY26.map(([month, agency, campaign, portal, client, amount]) => ({
  month,
  agency: canon(agency, AGENCY_ALIASES),
  campaign,
  portal,
  brand: canon(client, BRAND_ALIASES),
  amount,
}))

export const SPECIAL_EVENTS = [
  { label: '9th HUM Awards sponsorship', month: '2024-09', amount: 36050000 },
  { label: 'Bridal Couture Week sponsorship', month: '2024-12', amount: 9600000 },
]

// Canonical portal names used in the Add Entry form
export const PORTAL_OPTIONS  = ['Website', 'FB Post', 'Insta Post', 'FB Reel', 'Insta Reel', 'YouTube', 'Other']
export const CHANNEL_OPTIONS = ['HUM News', 'Masala TV', 'HUM TV', 'Glam', 'Special Project']

// Classify a campaign portal as 'website', 'social', 'glam', or 'drama'
// YouTube is social media (user confirmed)
export function classifyPortal(portal) {
  const p = (portal || '').toLowerCase().trim()
  if (!p) return 'other'
  // Canonical names from Add Entry form — social includes YouTube
  if (['fb post', 'insta post', 'fb reel', 'insta reel', 'youtube'].includes(p)) return 'social'
  if (p === 'website') return 'website'
  // Glam — check exact before keyword scan
  if (p === 'glam' || p === 'glam magazine') return 'glam'
  // Social keywords
  if (p.includes('insta') || p.includes('instagram') || p.includes('facebook') || p.includes('tiktok') || p.includes('social') || p.includes('reel') || p.includes('youtube')) return 'social'
  // Remaining glam variants
  if (p.includes('glam')) return 'glam'
  // Drama — only explicit broadcast TV portal
  if (p === 'hum tv' || p.startsWith('hum tv ') || p.startsWith('hum tv,')) return 'drama'
  // Everything else (hum news, hum masala, hum network website, podcast, video, pr, etc.) = website
  return 'website'
}

// ── helpers ──────────────────────────────────────────────────────────────────
export function monthsInRange(from, to) {
  return MONTHS.filter(m => m.key >= from && m.key <= to)
}

export function fmtPKR(n, unit = 'M') {
  if (n === null || n === undefined) return '—'
  if (n === 0) return '—'
  if (unit === 'Cr') {
    if (Math.abs(n) >= 10000000) return `₨${(n / 10000000).toFixed(2)} Cr`
    if (Math.abs(n) >= 100000) return `₨${(n / 100000).toFixed(1)} L`
    return `₨${Number(n).toLocaleString()}`
  }
  if (Math.abs(n) >= 1000000) return `PKR ${(n / 1000000).toFixed(n >= 100000000 ? 0 : 2)}M`
  if (Math.abs(n) >= 1000) return `PKR ${(n / 1000).toFixed(0)}K`
  return `PKR ${Number(n).toLocaleString()}`
}
