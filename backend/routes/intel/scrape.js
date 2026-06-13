import { Router } from 'express'
import { supabase } from '../../supabase.js'

const router = Router()

// Known brands to detect — uses word-boundary regex to avoid false positives
// Each entry: { name: display name, pattern: regex string }
const BRAND_PATTERNS = [
  // FMCG
  { name:'Nestlé',          pattern:'nestl[eé]' },
  { name:'Nescafé',         pattern:'nescaf[eé]' },
  { name:'Milo',            pattern:'\\bmilo\\b' },
  { name:'KitKat',          pattern:'\\bkitkat\\b' },
  { name:'Maggi',           pattern:'\\bmaggi\\b' },
  { name:'Unilever',        pattern:'\\bunilever\\b' },
  { name:'Surf Excel',      pattern:'surf.?excel' },
  { name:'Sunsilk',         pattern:'\\bsunsilk\\b' },
  { name:'Lifebuoy',        pattern:'\\blifebuoy\\b' },
  { name:'Lux',             pattern:'\\blux\\b' },
  { name:'Vim',             pattern:'\\bvim\\b' },
  { name:'Knorr',           pattern:'\\bknorr\\b' },
  { name:'Walls',           pattern:'\\bwalls\\b' },
  { name:'Cornetto',        pattern:'\\bcornetto\\b' },
  { name:'Pantene',         pattern:'\\bpantene\\b' },
  { name:'Head & Shoulders',pattern:'head.?shoulders' },
  { name:'Ariel',           pattern:'\\bariel\\b' },
  { name:'Safeguard',       pattern:'\\bsafeguard\\b' },
  { name:'Pampers',         pattern:'\\bpampers\\b' },
  // Beverages
  { name:'Coca-Cola',       pattern:'coca.?cola' },
  { name:'Pepsi',           pattern:'\\bpepsi\\b' },
  { name:'Sprite',          pattern:'\\bsprite\\b' },
  { name:'7UP',             pattern:'\\b7.?up\\b' },
  { name:'Fanta',           pattern:'\\bfanta\\b' },
  { name:'Mountain Dew',    pattern:'mountain.?dew' },
  { name:'Sting',           pattern:'\\bsting\\b' },
  { name:'Tapal',           pattern:'\\btapal\\b' },
  { name:'Lipton',          pattern:'\\blipton\\b' },
  // Telecom
  { name:'Jazz',            pattern:'\\bjazz\\b' },
  { name:'Telenor',         pattern:'\\btelenor\\b' },
  { name:'Ufone',           pattern:'\\bufone\\b' },
  { name:'Zong',            pattern:'\\bzong\\b' },
  { name:'PTCL',            pattern:'\\bptcl\\b' },
  // Banking
  { name:'Meezan Bank',     pattern:'\\bmeezan\\b' },
  { name:'HBL',             pattern:'\\bhbl\\b' },
  { name:'UBL',             pattern:'\\bubl\\b' },
  { name:'MCB',             pattern:'\\bmcb\\b' },
  { name:'Alfalah',         pattern:'\\balfalah\\b' },
  { name:'Standard Chartered', pattern:'standard.?chartered' },
  { name:'Habib Bank',      pattern:'habib.?bank' },
  { name:'Easypaisa',       pattern:'\\beasypaisa\\b' },
  { name:'JazzCash',        pattern:'\\bjazzcash\\b' },
  // Auto
  { name:'Toyota',          pattern:'\\btoyota\\b' },
  { name:'Honda',           pattern:'\\bhonda\\b' },
  { name:'Suzuki',          pattern:'\\bsuzuki\\b' },
  { name:'Kia',             pattern:'\\bkia\\b' },
  { name:'Hyundai',         pattern:'\\bhyundai\\b' },
  // Electronics
  { name:'Samsung',         pattern:'\\bsamsung\\b' },
  { name:'LG',              pattern:'\\blg electronics\\b|\\blg pakistan\\b' },
  { name:'Orient',          pattern:'\\borient\\b' },
  { name:'Dawlance',        pattern:'\\bdawlance\\b' },
  { name:'Haier',           pattern:'\\bhaier\\b' },
  // E-commerce / Delivery
  { name:'Daraz',           pattern:'\\bdaraz\\b' },
  { name:'Foodpanda',       pattern:'\\bfoodpanda\\b' },
  { name:'Uber',            pattern:'\\buber\\b' },
  { name:'Careem',          pattern:'\\bcareem\\b' },
  // Pharma
  { name:'GSK',             pattern:'\\bgsk\\b|glaxosmithkline' },
  { name:'Abbott',          pattern:'\\babbott\\b' },
  { name:'Pfizer',          pattern:'\\bpfizer\\b' },
  // Retail / Fashion
  { name:'Khaadi',          pattern:'\\bkhaadi\\b' },
  { name:'Gul Ahmed',       pattern:'gul.?ahmed' },
  { name:'Alkaram',         pattern:'\\balkaram\\b' },
  { name:'Bonanza',         pattern:'\\bbonanza\\b' },
  // Industry
  { name:'Engro',           pattern:'\\bengro\\b' },
  { name:'Fauji',           pattern:'\\bfauji\\b' },
  { name:'Reckitt',         pattern:'\\breckitt\\b' },
]

function detectBrands(html) {
  const lower = html.toLowerCase()
  const found = []
  for (const brand of BRAND_PATTERNS) {
    const re = new RegExp(brand.pattern, 'i')
    if (re.test(html)) found.push(brand.name)
  }
  return [...new Set(found)]
}

async function scrapeUrl(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    clearTimeout(timeout)
    if (!res.ok) return { status: 'error', error: `HTTP ${res.status}`, brands: [] }
    const html = await res.text()
    const unique = detectBrands(html)

    // Extract page title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim().slice(0, 100) : url

    return {
      status: 'success',
      brands: unique,
      page_title: title,
      raw_text: `Detected brands: ${unique.join(', ') || 'none'}. Page: ${title}`,
    }
  } catch (err) {
    clearTimeout(timeout)
    return { status: 'failed', error: err.message, brands: [] }
  }
}

// Upsert detected brands — uses only columns that exist in the schema
async function upsertBrands(brands, url) {
  for (const brand of brands) {
    const { data: existing } = await supabase.from('detected_brands')
      .select('id, sites_detected_on').eq('brand_name', brand).maybeSingle()

    const sites = Array.isArray(existing?.sites_detected_on) ? existing.sites_detected_on : []
    if (!sites.includes(url)) sites.push(url)
    // Spend signal scales with how many sites the brand appears on
    const spend_signal = sites.length >= 5 ? 'high' : sites.length >= 3 ? 'medium' : 'low'

    const { error } = await supabase.from('detected_brands').upsert({
      brand_name: brand,
      last_detected_at: new Date().toISOString(),
      detection_source: 'scrape',
      sites_detected_on: sites,
      spend_signal,
    }, { onConflict: 'brand_name' })
    if (error) console.error(`detected_brands upsert failed for ${brand}:`, error.message)
  }
}

// POST /api/scrape/run  — scrape a single URL immediately
router.post('/run', async (req, res) => {
  const { url, site_id } = req.body
  if (!url) return res.status(400).json({ error: 'url required' })

  const result = await scrapeUrl(url)

  // Save to scrape_results
  const { data, error } = await supabase.from('scrape_results').insert([{
    site_id: site_id || null,
    page_url: url,
    status: result.status,
    brands_detected: result.brands || [],
    raw_text: result.raw_text || result.error || '',
    scraped_at: new Date().toISOString(),
  }]).select().single()

  if (error) return res.status(500).json({ error: error.message })

  if (result.brands?.length > 0) await upsertBrands(result.brands, url)
  if (site_id) await supabase.from('sites').update({ last_scraped_at: new Date().toISOString() }).eq('id', site_id)

  res.json({ success: true, result: data, brands_found: result.brands, error: result.error })
})

// POST /api/scrape/run-all — scrape all monitored sites
router.post('/run-all', async (req, res) => {
  const { data: sites } = await supabase.from('sites').select('*').eq('is_active', true)
  if (!sites?.length) return res.json({ message: 'No active sites', scraped: 0 })

  const results = []
  for (const site of sites) {
    const result = await scrapeUrl(site.url)
    await supabase.from('scrape_results').insert([{
      site_id: site.id,
      page_url: site.url,
      status: result.status,
      brands_detected: result.brands || [],
      raw_text: result.raw_text || result.error || '',
      scraped_at: new Date().toISOString(),
    }])
    if (result.brands?.length > 0) await upsertBrands(result.brands, site.url)
    await supabase.from('sites').update({ last_scraped_at: new Date().toISOString() }).eq('id', site.id)
    results.push({ url: site.url, status: result.status, brands: result.brands })
  }

  res.json({ success: true, scraped: results.length, results })
})

export default router
