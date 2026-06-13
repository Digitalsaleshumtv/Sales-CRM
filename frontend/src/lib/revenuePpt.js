// Builds a PowerPoint report from the Revenue dashboard data (client-side, pptxgenjs)
import {
  FY_LIST, FY_META, CAT_META, CHANNELS_BY_FY, CHANNEL_COLORS, ENTITIES,
  TARGET_TOTAL, TARGET_MONTHLY,
} from '../data/revenueData.js'

const MAROON = 'C0392B'
const DARK = '1F2937'
const GRAY = '6B7280'
const LIGHT = 'F3F4F6'
const FY_HEX = { 'FY2023-24': '64748B', 'FY2024-25': 'C0392B', 'FY2025-26': 'D4A017', 'FY2026-27': '0E7490' }
const MONTH_ORDER = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

const M = n => +(n / 1000000).toFixed(2)
const fmtM = n => `PKR ${(n / 1000000).toFixed(n >= 100000000 ? 0 : 1)}M`

function header(slide, title, subtitle) {
  slide.addText(title, { x: 0.5, y: 0.32, w: 12.3, h: 0.55, fontSize: 24, bold: true, color: DARK, fontFace: 'Calibri' })
  if (subtitle) slide.addText(subtitle, { x: 0.5, y: 0.85, w: 12.3, h: 0.35, fontSize: 12, color: GRAY, fontFace: 'Calibri' })
  slide.addText('HUM Network · Digital Sales', { x: 0.5, y: 7.05, w: 6, h: 0.3, fontSize: 9, color: GRAY, fontFace: 'Calibri' })
}

export async function exportRevenuePpt({ months, rangeLabel, sections, liveTotal }) {
  const PptxGenJS = (await import('pptxgenjs')).default
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 })
  pptx.layout = 'WIDE'

  const withData = months.filter(m => m.total > 0)
  const total = months.reduce((a, m) => a + m.total, 0)
  const best = withData.length ? [...withData].sort((a, b) => b.total - a.total)[0] : null

  // ── Title slide ──
  if (sections.title) {
    const s = pptx.addSlide()
    s.background = { color: '1A1A2E' }
    s.addText('HUM NETWORK · DIGITAL SALES', { x: 0.8, y: 1.6, w: 11.7, h: 0.4, fontSize: 14, color: 'D4A017', charSpacing: 3, fontFace: 'Calibri' })
    s.addText('Digital Sales Revenue Report', { x: 0.8, y: 2.1, w: 11.7, h: 1.0, fontSize: 40, bold: true, color: 'FFFFFF', fontFace: 'Calibri' })
    s.addText(rangeLabel, { x: 0.8, y: 3.2, w: 11.7, h: 0.45, fontSize: 18, color: 'CCCCCC', fontFace: 'Calibri' })
    s.addText([
      { text: `${fmtM(total)}`, options: { fontSize: 30, bold: true, color: 'FFFFFF' } },
      { text: `   total revenue in selected period`, options: { fontSize: 14, color: 'AAAAAA' } },
    ], { x: 0.8, y: 4.2, w: 11.7, h: 0.7, fontFace: 'Calibri' })
    s.addText(`Generated from the Sales Dashboard · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      { x: 0.8, y: 6.6, w: 11.7, h: 0.35, fontSize: 11, color: '888888', fontFace: 'Calibri' })
  }

  // ── KPI summary ──
  if (sections.kpis) {
    const s = pptx.addSlide()
    header(s, 'Key Numbers', rangeLabel)
    const kpis = [
      ['Total Revenue', fmtM(total)],
      ['Avg per Month', withData.length ? fmtM(total / withData.length) : '—'],
      ['Best Month', best ? `${best.label} · ${fmtM(best.total)}` : '—'],
      ['Months Covered', `${withData.length} with revenue`],
    ]
    kpis.forEach(([label, value], i) => {
      const x = 0.6 + (i % 2) * 6.2, y = 1.6 + Math.floor(i / 2) * 2.4
      s.addShape(pptx.ShapeType.roundRect, { x, y, w: 5.8, h: 2.0, fill: { color: i === 0 ? MAROON : LIGHT }, rectRadius: 0.08, line: { type: 'none' } })
      s.addText(label.toUpperCase(), { x: x + 0.35, y: y + 0.3, w: 5.1, h: 0.35, fontSize: 12, color: i === 0 ? 'F5C6C0' : GRAY, charSpacing: 1.5, fontFace: 'Calibri' })
      s.addText(value, { x: x + 0.35, y: y + 0.75, w: 5.1, h: 0.85, fontSize: 30, bold: true, color: i === 0 ? 'FFFFFF' : DARK, fontFace: 'Calibri' })
    })
    if (liveTotal > 0) s.addText(`Includes ${fmtM(liveTotal)} from live entries recorded in the dashboard.`, { x: 0.6, y: 6.45, w: 12, h: 0.35, fontSize: 11, italic: true, color: GRAY, fontFace: 'Calibri' })
  }

  // ── Monthly revenue chart ──
  if (sections.monthly && withData.length > 0) {
    const s = pptx.addSlide()
    header(s, 'Monthly Revenue', `${rangeLabel} · PKR millions`)
    s.addChart(pptx.ChartType.bar, [{
      name: 'Revenue (PKR M)',
      labels: months.map(m => m.label),
      values: months.map(m => M(m.total)),
    }], {
      x: 0.5, y: 1.4, w: 12.3, h: 5.4,
      barDir: 'col', chartColors: [MAROON],
      catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
      showValue: months.length <= 16, dataLabelFontSize: 8, dataLabelPosition: 'outEnd', dataLabelColor: DARK,
      valGridLine: { color: 'E5E7EB', style: 'solid', size: 1 }, catGridLine: { style: 'none' },
      showLegend: false,
    })
  }

  // ── Year vs Year ──
  if (sections.compare) {
    const s = pptx.addSlide()
    header(s, 'Year-over-Year Comparison', 'Same month across fiscal years · PKR millions · all years run July to June')
    const series = FY_LIST.map(fy => {
      const ms = (sections._allMonths || []).filter(m => m.fy === fy)
      return { name: FY_META[fy].label, labels: MONTH_ORDER, values: ms.map(m => M(m.total)) }
    })
    s.addChart(pptx.ChartType.bar, series, {
      x: 0.5, y: 1.4, w: 12.3, h: 4.6,
      barDir: 'col', chartColors: FY_LIST.map(fy => FY_HEX[fy]),
      catAxisLabelFontSize: 10, valAxisLabelFontSize: 9,
      showLegend: true, legendPos: 'b', legendFontSize: 10,
      valGridLine: { color: 'E5E7EB', style: 'solid', size: 1 },
    })
    const totals = FY_LIST.map(fy => `${FY_META[fy].label}: ${fmtM(FY_META[fy].total)}`).join('    ·    ')
    s.addText(totals, { x: 0.5, y: 6.25, w: 12.3, h: 0.4, fontSize: 13, bold: true, color: DARK, align: 'center', fontFace: 'Calibri' })
  }

  // ── Channels ──
  if (sections.channels) {
    const s = pptx.addSlide()
    header(s, 'Revenue by Channel', 'FY2024-25 shows confirmed H1 split · FY2025-26 covers 9 months · PKR millions')
    const channelNames = Object.keys(CHANNEL_COLORS)
    const series = channelNames.map(ch => ({
      name: ch,
      labels: CHANNELS_BY_FY.map(c => FY_META[c.fy].label),
      values: CHANNELS_BY_FY.map(c => M(c.channels[ch] || 0)),
    }))
    s.addChart(pptx.ChartType.bar, series, {
      x: 0.5, y: 1.4, w: 7.6, h: 5.2,
      barDir: 'col', chartColors: channelNames.map(ch => CHANNEL_COLORS[ch].replace('#', '')),
      catAxisLabelFontSize: 10, valAxisLabelFontSize: 9,
      showLegend: true, legendPos: 'b', legendFontSize: 9,
      valGridLine: { color: 'E5E7EB', style: 'solid', size: 1 },
    })
    s.addText([
      { text: 'HUM News — the growth story\n', options: { fontSize: 15, bold: true, color: MAROON } },
      { text: 'PKR 9M → PKR 42.5M in two years (+372%), moving from 6% to 21% of total revenue.\n\n', options: { fontSize: 12, color: DARK } },
      { text: 'HUM TV Entertainment\n', options: { fontSize: 15, bold: true, color: DARK } },
      { text: 'Stable backbone at PKR 144–150M across all three years, carried by drama sponsorships.', options: { fontSize: 12, color: DARK } },
    ], { x: 8.4, y: 1.8, w: 4.4, h: 4.4, valign: 'top', fontFace: 'Calibri' })
  }

  // ── Business type ──
  if (sections.biztype) {
    const s = pptx.addSlide()
    header(s, 'Business Mix — FY2024-25', 'Full year · PKR 245.3M · share by business type')
    const cats = CAT_META.map(c => ({ ...c, value: (sections._fy25cats || {})[c.id] || 0 })).filter(c => c.value > 0)
    s.addChart(pptx.ChartType.pie, [{
      name: 'FY2024-25',
      labels: cats.map(c => c.name),
      values: cats.map(c => M(c.value)),
    }], {
      x: 0.7, y: 1.5, w: 6.4, h: 5.2,
      chartColors: cats.map(c => c.color.replace('#', '')),
      showLegend: true, legendPos: 'r', legendFontSize: 10,
      showPercent: true, dataLabelFontSize: 9, dataLabelColor: 'FFFFFF',
    })
    const rows = [[
      { text: 'Business Type', options: { bold: true, color: 'FFFFFF', fill: { color: MAROON } } },
      { text: 'Revenue', options: { bold: true, color: 'FFFFFF', fill: { color: MAROON } } },
      { text: 'Share', options: { bold: true, color: 'FFFFFF', fill: { color: MAROON } } },
    ]]
    const catTotal = cats.reduce((a, c) => a + c.value, 0)
    cats.forEach(c => rows.push([{ text: c.name }, { text: fmtM(c.value) }, { text: `${((c.value / catTotal) * 100).toFixed(1)}%` }]))
    s.addTable(rows, { x: 7.6, y: 1.7, w: 5.2, fontSize: 11, fontFace: 'Calibri', color: DARK, border: { type: 'solid', color: 'E5E7EB', pt: 0.5 }, rowH: 0.38, valign: 'middle' })
  }

  // ── Agencies & brands ──
  if (sections.agencies) {
    const s = pptx.addSlide()
    header(s, 'Agencies & Brands', 'H1 = July–December window · FY2025-26 = website & social bookings')
    const top = [...ENTITIES].sort((a, b) => (b.fy24h1 + b.fy25h1) - (a.fy24h1 + a.fy25h1)).slice(0, 12)
    const rows = [[
      { text: 'Agency / Brand', options: { bold: true, color: 'FFFFFF', fill: { color: MAROON } } },
      { text: 'Type', options: { bold: true, color: 'FFFFFF', fill: { color: MAROON } } },
      { text: 'H1 FY2023-24', options: { bold: true, color: 'FFFFFF', fill: { color: MAROON } } },
      { text: 'H1 FY2024-25', options: { bold: true, color: 'FFFFFF', fill: { color: MAROON } } },
      { text: 'Change', options: { bold: true, color: 'FFFFFF', fill: { color: MAROON } } },
    ]]
    top.forEach(e => {
      const delta = e.fy24h1 && e.fy25h1 ? `${e.fy25h1 >= e.fy24h1 ? '+' : ''}${(((e.fy25h1 - e.fy24h1) / e.fy24h1) * 100).toFixed(0)}%` : e.fy25h1 ? 'new' : 'gone'
      rows.push([
        { text: e.name },
        { text: e.type === 'agency' ? 'Agency' : e.type === 'brand' ? 'Brand' : 'Direct', options: { color: e.type === 'agency' ? '2563EB' : '7C3AED' } },
        { text: e.fy24h1 ? fmtM(e.fy24h1) : '—' },
        { text: e.fy25h1 ? fmtM(e.fy25h1) : '—' },
        { text: delta, options: { color: delta.startsWith('+') || delta === 'new' ? '16A34A' : 'DC2626', bold: true } },
      ])
    })
    s.addTable(rows, { x: 0.6, y: 1.5, w: 12.1, fontSize: 10.5, fontFace: 'Calibri', color: DARK, border: { type: 'solid', color: 'E5E7EB', pt: 0.5 }, rowH: 0.36, valign: 'middle' })
  }

  // ── FY2026-27 target ──
  if (sections.target) {
    const s = pptx.addSlide()
    header(s, 'FY2026-27 Target', 'July 2026 – June 2027')
    s.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 1.6, w: 12.1, h: 1.9, fill: { color: '0E7490' }, rectRadius: 0.08, line: { type: 'none' } })
    s.addText([
      { text: 'PKR 500M', options: { fontSize: 40, bold: true, color: 'FFFFFF' } },
      { text: `   annual target  ·  ≈ ${fmtM(TARGET_MONTHLY)} per month`, options: { fontSize: 16, color: 'CFFAFE' } },
    ], { x: 1.0, y: 2.1, w: 11.3, h: 0.9, fontFace: 'Calibri' })
    const prior = [
      ['FY2023-24 actual', 156774312], ['FY2024-25 actual', 245320227],
      ['FY2025-26 to date', FY_META['FY2025-26'].total], ['FY2026-27 target', TARGET_TOTAL],
    ]
    s.addChart(pptx.ChartType.bar, [{
      name: 'PKR M',
      labels: prior.map(p => p[0]),
      values: prior.map(p => M(p[1])),
    }], {
      x: 0.6, y: 3.8, w: 12.1, h: 3.1,
      barDir: 'col', chartColors: ['64748B', 'C0392B', 'D4A017', '0E7490'],
      showValue: true, dataLabelFontSize: 10, dataLabelPosition: 'outEnd', dataLabelColor: DARK,
      catAxisLabelFontSize: 10, valAxisLabelFontSize: 9, showLegend: false,
      valGridLine: { color: 'E5E7EB', style: 'solid', size: 1 },
    })
  }

  const fname = `HUM_Digital_Sales_${rangeLabel.replace(/[^\w]+/g, '_')}.pptx`
  await pptx.writeFile({ fileName: fname })
  return fname
}
