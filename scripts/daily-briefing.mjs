/**
 * HUM Network Digital Sales — Daily Morning Briefing
 * Sends a summary email (Resend) + WhatsApp message (CallMeBot) at 8 AM PKT
 * Triggered by GitHub Actions cron: .github/workflows/daily-briefing.yml
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const RESEND_API_KEY    = process.env.RESEND_API_KEY
const RECIPIENT_EMAILS  = (process.env.RECIPIENT_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
const WHATSAPP_PHONE    = process.env.WHATSAPP_PHONE     // e.g. 923001234567
const CALLMEBOT_APIKEY  = process.env.CALLMEBOT_APIKEY

// ── helpers ──────────────────────────────────────────────────────────────────

function pkrFmt(n) {
  if (!n) return '—'
  if (n >= 10_000_000) return `₨${(n/10_000_000).toFixed(1)}Cr`
  if (n >= 100_000)    return `₨${(n/100_000).toFixed(1)}L`
  return `₨${Number(n).toLocaleString()}`
}

function daysBetween(d1, d2 = new Date()) {
  return Math.floor((new Date(d2) - new Date(d1)) / 86_400_000)
}

function todayStr() { return new Date().toISOString().split('T')[0] }

function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function friendlyDate(d) {
  return new Date(d).toLocaleDateString('en-PK', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
}

// ── data queries ──────────────────────────────────────────────────────────────

async function fetchBriefingData() {
  const today     = todayStr()
  const yesterday = yesterdayStr()
  const ago14     = new Date(Date.now() - 14 * 86_400_000).toISOString().split('T')[0]

  const [
    { data: overdueFollowUps },
    { data: todayFollowUps },
    { data: stuckDeals },
    { data: overdueInvoices },
    { data: scrapeResults },
  ] = await Promise.all([
    // 1. Overdue follow-ups — due before today, still Pending
    supabase
      .from('follow_ups')
      .select('id, follow_up_date, type, notes, assigned_to, next_action, clients(name), deals(name)')
      .lt('follow_up_date', today)
      .eq('status', 'Pending')
      .order('follow_up_date'),

    // 2. Follow-ups due today
    supabase
      .from('follow_ups')
      .select('id, follow_up_date, type, notes, assigned_to, clients(name), deals(name)')
      .eq('follow_up_date', today)
      .eq('status', 'Pending')
      .order('assigned_to'),

    // 3. Stuck deals — created >14 days ago, still in early stages
    supabase
      .from('deals')
      .select('id, name, status, value_net, assigned_to, created_at, clients(name)')
      .not('status', 'in', '("Completed","Cancelled","Billed","Sent to Finance","RO Received","Locked")')
      .lt('created_at', ago14)
      .order('created_at'),

    // 4. Overdue invoices — due before today, not paid
    supabase
      .from('invoices')
      .select('id, invoice_number, invoice_date, due_date, amount_gross, amount_received, status, clients(name)')
      .lt('due_date', today)
      .not('status', 'eq', 'Paid')
      .order('due_date'),

    // 5. Yesterday's scrape results
    supabase
      .from('scrape_results')
      .select('brands_detected, scraped_at, sites(nickname, url)')
      .gte('scraped_at', `${yesterday}T00:00:00`)
      .order('scraped_at', { ascending: false }),
  ])

  return {
    overdueFollowUps: overdueFollowUps || [],
    todayFollowUps:   todayFollowUps   || [],
    stuckDeals:       stuckDeals       || [],
    overdueInvoices:  overdueInvoices  || [],
    scrapeResults:    scrapeResults    || [],
  }
}

// ── email HTML ────────────────────────────────────────────────────────────────

function buildEmailHtml(data, dateStr) {
  const { overdueFollowUps, todayFollowUps, stuckDeals, overdueInvoices, scrapeResults } = data

  const totalOverdueAmt = overdueInvoices.reduce((s, i) => s + ((i.amount_gross || 0) - (i.amount_received || 0)), 0)

  const sectionStyle = 'margin: 20px 0; border-radius: 10px; overflow: hidden; border: 1px solid #e5e7eb;'
  const headerStyle  = (color) => `background: ${color}; color: white; padding: 12px 18px; font-size: 14px; font-weight: bold;`
  const tableStyle   = 'width: 100%; border-collapse: collapse; font-size: 13px;'
  const thStyle      = 'padding: 8px 14px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; text-align: left; font-weight: 600; color: #374151; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;'
  const tdStyle      = 'padding: 9px 14px; border-bottom: 1px solid #f3f4f6; color: #374151; vertical-align: top;'
  const emptyStyle   = 'padding: 16px 18px; color: #9ca3af; font-style: italic; font-size: 13px;'

  function badge(text, bg, color) {
    return `<span style="background:${bg};color:${color};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;">${text}</span>`
  }

  // ── Section 1: Overdue follow-ups ──
  let s1 = `<div style="${sectionStyle}">
    <div style="${headerStyle('#dc2626')}">🔴 Overdue Follow-ups (${overdueFollowUps.length})</div>`
  if (overdueFollowUps.length === 0) {
    s1 += `<p style="${emptyStyle}">All caught up — no overdue follow-ups!</p>`
  } else {
    s1 += `<table style="${tableStyle}"><tr>
      <th style="${thStyle}">Client</th><th style="${thStyle}">Deal</th><th style="${thStyle}">Type</th>
      <th style="${thStyle}">Due Date</th><th style="${thStyle}">Days Late</th><th style="${thStyle}">Assigned To</th>
    </tr>`
    overdueFollowUps.forEach(f => {
      const days = daysBetween(f.follow_up_date)
      s1 += `<tr>
        <td style="${tdStyle}"><strong>${f.clients?.name || '—'}</strong></td>
        <td style="${tdStyle}">${f.deals?.name ? f.deals.name.slice(0,35) + (f.deals.name.length > 35 ? '…' : '') : '—'}</td>
        <td style="${tdStyle}">${badge(f.type, '#fef3c7', '#92400e')}</td>
        <td style="${tdStyle}">${f.follow_up_date}</td>
        <td style="${tdStyle}">${badge(days + 'd late', '#fee2e2', '#991b1b')}</td>
        <td style="${tdStyle}">${f.assigned_to || '—'}</td>
      </tr>
      ${f.notes ? `<tr><td colspan="6" style="padding:4px 14px 10px; font-size:12px; color:#6b7280; border-bottom:1px solid #f3f4f6;">💬 ${f.notes.slice(0,100)}${f.notes.length > 100 ? '…' : ''}</td></tr>` : ''}`
    })
    s1 += `</table>`
  }
  s1 += `</div>`

  // ── Section 2: Due today ──
  let s2 = `<div style="${sectionStyle}">
    <div style="${headerStyle('#f97316')}">📅 Due Today (${todayFollowUps.length})</div>`
  if (todayFollowUps.length === 0) {
    s2 += `<p style="${emptyStyle}">Nothing scheduled for today.</p>`
  } else {
    s2 += `<table style="${tableStyle}"><tr>
      <th style="${thStyle}">Client</th><th style="${thStyle}">Deal</th><th style="${thStyle}">Type</th>
      <th style="${thStyle}">Assigned To</th><th style="${thStyle}">Notes</th>
    </tr>`
    todayFollowUps.forEach(f => {
      s2 += `<tr>
        <td style="${tdStyle}"><strong>${f.clients?.name || '—'}</strong></td>
        <td style="${tdStyle}">${f.deals?.name ? f.deals.name.slice(0,30) + (f.deals.name.length > 30 ? '…' : '') : '—'}</td>
        <td style="${tdStyle}">${badge(f.type, '#dbeafe', '#1e40af')}</td>
        <td style="${tdStyle}">${f.assigned_to || '—'}</td>
        <td style="${tdStyle}" style="font-size:12px;color:#6b7280;">${(f.notes || '').slice(0, 80)}${(f.notes||'').length > 80 ? '…' : ''}</td>
      </tr>`
    })
    s2 += `</table>`
  }
  s2 += `</div>`

  // ── Section 3: Stuck deals ──
  let s3 = `<div style="${sectionStyle}">
    <div style="${headerStyle('#7c3aed')}">⚠️ Stuck Deals — 14+ Days (${stuckDeals.length})</div>`
  if (stuckDeals.length === 0) {
    s3 += `<p style="${emptyStyle}">No stuck deals — pipeline moving well!</p>`
  } else {
    s3 += `<table style="${tableStyle}"><tr>
      <th style="${thStyle}">Deal</th><th style="${thStyle}">Client</th><th style="${thStyle}">Status</th>
      <th style="${thStyle}">Value</th><th style="${thStyle}">Age</th><th style="${thStyle}">Assigned To</th>
    </tr>`
    stuckDeals.forEach(d => {
      const age = daysBetween(d.created_at)
      const statusColors = {
        Prospecting: ['#f3f4f6','#374151'], 'Pitch Sent': ['#dbeafe','#1e40af'],
        'In Negotiation': ['#fef3c7','#92400e'], 'Under Process': ['#ffedd5','#c2410c'],
      }
      const [sbg, sfg] = statusColors[d.status] || ['#f3f4f6','#374151']
      s3 += `<tr>
        <td style="${tdStyle}"><strong>${d.name.slice(0,35)}${d.name.length > 35 ? '…' : ''}</strong></td>
        <td style="${tdStyle}">${d.clients?.name || '—'}</td>
        <td style="${tdStyle}">${badge(d.status, sbg, sfg)}</td>
        <td style="${tdStyle}">${pkrFmt(d.value_net)}</td>
        <td style="${tdStyle}">${badge(age + ' days', '#f3e8ff', '#6b21a8')}</td>
        <td style="${tdStyle}">${d.assigned_to || '—'}</td>
      </tr>`
    })
    s3 += `</table>`
  }
  s3 += `</div>`

  // ── Section 4: Overdue invoices ──
  let s4 = `<div style="${sectionStyle}">
    <div style="${headerStyle('#b45309')}">💰 Overdue Invoices (${overdueInvoices.length}) — ${pkrFmt(totalOverdueAmt)} outstanding</div>`
  if (overdueInvoices.length === 0) {
    s4 += `<p style="${emptyStyle}">No overdue invoices — collections on track!</p>`
  } else {
    s4 += `<table style="${tableStyle}"><tr>
      <th style="${thStyle}">Invoice #</th><th style="${thStyle}">Client</th><th style="${thStyle}">Due Date</th>
      <th style="${thStyle}">Days Late</th><th style="${thStyle}">Outstanding</th><th style="${thStyle}">Status</th>
    </tr>`
    overdueInvoices.forEach(i => {
      const days = daysBetween(i.due_date)
      const outstanding = (i.amount_gross || 0) - (i.amount_received || 0)
      s4 += `<tr>
        <td style="${tdStyle}"><code style="font-size:11px;">${i.invoice_number}</code></td>
        <td style="${tdStyle}"><strong>${i.clients?.name || '—'}</strong></td>
        <td style="${tdStyle}">${i.due_date}</td>
        <td style="${tdStyle}">${badge(days + 'd overdue', '#fee2e2', '#991b1b')}</td>
        <td style="${tdStyle};font-weight:600;color:#b45309;">${pkrFmt(outstanding)}</td>
        <td style="${tdStyle}">${badge(i.status, '#fef3c7', '#92400e')}</td>
      </tr>`
    })
    s4 += `</table>`
  }
  s4 += `</div>`

  // ── Section 5: Scrape results ──
  const allBrands = scrapeResults.flatMap(r => r.brands_detected || [])
  const uniqueBrands = [...new Set(allBrands)]
  let s5 = `<div style="${sectionStyle}">
    <div style="${headerStyle('#0891b2')}">🕷️ Yesterday's Brand Detection — ${scrapeResults.length} sites · ${uniqueBrands.length} brands found</div>`
  if (scrapeResults.length === 0) {
    s5 += `<p style="${emptyStyle}">No scrapes ran yesterday. Go to Website Monitor to run one.</p>`
  } else {
    s5 += `<div style="padding:14px 18px;">`
    scrapeResults.forEach(r => {
      const brands = r.brands_detected || []
      const siteName = r.sites?.nickname || r.sites?.url || 'Unknown'
      s5 += `<div style="margin-bottom:10px;">
        <span style="font-size:12px;font-weight:600;color:#374151;">🌐 ${siteName}</span>
        &nbsp;`
      if (brands.length === 0) {
        s5 += `<span style="font-size:12px;color:#9ca3af;">no brands detected</span>`
      } else {
        brands.forEach(b => {
          s5 += `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;margin-right:4px;">${b}</span>`
        })
      }
      s5 += `</div>`
    })
    s5 += `</div>`
  }
  s5 += `</div>`

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:680px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:28px 24px;text-align:center;">
    <div style="font-size:28px;margin-bottom:6px;">🌅</div>
    <h1 style="margin:0;color:white;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Morning Briefing</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">HUM Network Digital Sales · ${dateStr}</p>
  </div>

  <!-- Quick summary bar -->
  <div style="display:flex;background:#1f2937;padding:14px 20px;gap:24px;justify-content:center;flex-wrap:wrap;">
    ${[
      ['🔴', overdueFollowUps.length, 'Overdue FUs'],
      ['📅', todayFollowUps.length,   'Due Today'],
      ['⚠️', stuckDeals.length,       'Stuck Deals'],
      ['💰', overdueInvoices.length,  'Overdue Invs'],
      ['🕷️', uniqueBrands.length,    'Brands Found'],
    ].map(([ico, n, lbl]) =>
      `<div style="text-align:center;">
        <div style="font-size:20px;font-weight:700;color:white;">${ico} ${n}</div>
        <div style="font-size:11px;color:#9ca3af;">${lbl}</div>
      </div>`
    ).join('')}
  </div>

  <!-- Content -->
  <div style="padding:16px 16px 8px;">
    ${s1}${s2}${s3}${s4}${s5}
  </div>

  <!-- Footer -->
  <div style="background:#f9fafb;padding:16px 20px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">
      HUM Network Digital Sales Dashboard · Auto-generated daily at 8:00 AM PKT
      <br>Manage your data at <a href="https://hum-sales.vercel.app" style="color:#dc2626;">hum-sales.vercel.app</a>
    </p>
  </div>
</div>
</body></html>`
}

// ── WhatsApp text ─────────────────────────────────────────────────────────────

function buildWhatsAppText(data, dateStr) {
  const { overdueFollowUps, todayFollowUps, stuckDeals, overdueInvoices, scrapeResults } = data
  const totalOverdueAmt = overdueInvoices.reduce((s, i) => s + ((i.amount_gross || 0) - (i.amount_received || 0)), 0)
  const allBrands = [...new Set(scrapeResults.flatMap(r => r.brands_detected || []))]

  let msg = `🌅 *HUM Digital Sales — Morning Briefing*\n📅 ${dateStr}\n\n`

  // Overdue follow-ups
  if (overdueFollowUps.length === 0) {
    msg += `✅ No overdue follow-ups\n\n`
  } else {
    msg += `🔴 *OVERDUE FOLLOW-UPS (${overdueFollowUps.length})*\n`
    overdueFollowUps.slice(0, 5).forEach(f => {
      const days = daysBetween(f.follow_up_date)
      msg += `• ${f.assigned_to || '?'} → ${f.clients?.name || '?'} (${days}d late)\n`
    })
    if (overdueFollowUps.length > 5) msg += `• ...and ${overdueFollowUps.length - 5} more\n`
    msg += `\n`
  }

  // Due today
  if (todayFollowUps.length > 0) {
    msg += `📅 *DUE TODAY (${todayFollowUps.length})*\n`
    todayFollowUps.slice(0, 5).forEach(f => {
      msg += `• ${f.assigned_to || '?'} → ${f.clients?.name || '?'} [${f.type}]\n`
    })
    if (todayFollowUps.length > 5) msg += `• ...and ${todayFollowUps.length - 5} more\n`
    msg += `\n`
  }

  // Overdue invoices
  if (overdueInvoices.length > 0) {
    msg += `💰 *OVERDUE INVOICES (${overdueInvoices.length}) — ${pkrFmt(totalOverdueAmt)}*\n`
    overdueInvoices.slice(0, 4).forEach(i => {
      const owed = (i.amount_gross || 0) - (i.amount_received || 0)
      const days = daysBetween(i.due_date)
      msg += `• ${i.clients?.name || '?'} — ${pkrFmt(owed)} (${days}d)\n`
    })
    msg += `\n`
  }

  // Stuck deals
  if (stuckDeals.length > 0) {
    msg += `⚠️ *STUCK DEALS (${stuckDeals.length})*\n`
    stuckDeals.slice(0, 3).forEach(d => {
      const age = daysBetween(d.created_at)
      msg += `• ${d.name.slice(0, 30)} — ${d.status} (${age}d)\n`
    })
    if (stuckDeals.length > 3) msg += `• ...and ${stuckDeals.length - 3} more\n`
    msg += `\n`
  }

  // Scrape results
  if (allBrands.length > 0) {
    msg += `🕷️ *YESTERDAY'S BRANDS (${allBrands.length})*\n`
    msg += allBrands.slice(0, 8).join(', ')
    if (allBrands.length > 8) msg += `, +${allBrands.length - 8} more`
    msg += `\n\n`
  } else {
    msg += `🕷️ No scrape results from yesterday\n\n`
  }

  msg += `_View full dashboard: hum-sales.vercel.app_`
  return msg
}

// ── send functions ────────────────────────────────────────────────────────────

async function sendEmail(subject, html) {
  if (!RESEND_API_KEY || RECIPIENT_EMAILS.length === 0) {
    console.log('⚠️  Resend not configured — skipping email')
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'HUM Digital Sales <onboarding@resend.dev>',
      to: RECIPIENT_EMAILS,
      subject,
      html,
    }),
  })
  const data = await res.json()
  if (res.ok) console.log('✅ Email sent:', data.id)
  else console.error('❌ Email failed:', data)
}

async function sendWhatsApp(message) {
  if (!WHATSAPP_PHONE || !CALLMEBOT_APIKEY) {
    console.log('⚠️  CallMeBot not configured — skipping WhatsApp')
    return
  }
  const encoded = encodeURIComponent(message)
  const url = `https://api.callmebot.com/whatsapp.php?phone=${WHATSAPP_PHONE}&text=${encoded}&apikey=${CALLMEBOT_APIKEY}`
  const res = await fetch(url)
  const text = await res.text()
  if (res.ok) console.log('✅ WhatsApp sent')
  else console.error('❌ WhatsApp failed:', text)
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌅 Starting daily briefing:', new Date().toISOString())

  const data    = await fetchBriefingData()
  const dateStr = friendlyDate(new Date())

  console.log(`📊 Data fetched:
  - Overdue follow-ups: ${data.overdueFollowUps.length}
  - Due today:          ${data.todayFollowUps.length}
  - Stuck deals:        ${data.stuckDeals.length}
  - Overdue invoices:   ${data.overdueInvoices.length}
  - Scrape results:     ${data.scrapeResults.length}`)

  const emailHtml   = buildEmailHtml(data, dateStr)
  const waText      = buildWhatsAppText(data, dateStr)
  const emailSubject = `Morning Briefing — ${dateStr}`

  await sendEmail(emailSubject, emailHtml)
  await sendWhatsApp(waText)

  console.log('✅ Daily briefing complete')
}

main().catch(err => { console.error('❌ Fatal error:', err); process.exit(1) })
