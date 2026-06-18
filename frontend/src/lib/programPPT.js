import pptxgen from 'pptxgenjs'

const RED   = 'DC2626'
const WHITE = 'FFFFFF'
const DARK  = '111827'
const GRAY  = '6B7280'
const LIGHT = 'F9FAFB'

function fmt(n) {
  if (!n) return '—'
  if (n >= 10_000_000) return `PKR ${(n/10_000_000).toFixed(2)}Cr`
  if (n >= 100_000)    return `PKR ${(n/100_000).toFixed(2)}L`
  return `PKR ${Number(n).toLocaleString()}`
}

async function toBase64(url) {
  try {
    const res  = await fetch(url)
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

export async function exportProgramPPT(program, deals = [], sponsors = []) {
  const prs = new pptxgen()
  prs.layout = 'LAYOUT_WIDE'

  // ── Slide 1: Program Overview ──────────────────────────────────────────────
  const s1 = prs.addSlide()
  s1.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.4, fill: { color: RED } })
  s1.addText('HUM Network Digital Sales', { x: 0.5, y: 0.15, w: 9, h: 0.4, color: WHITE, fontSize: 11, italic: true })
  s1.addText(program.name, { x: 0.5, y: 0.5, w: 12, h: 0.75, color: WHITE, fontSize: 32, bold: true })
  s1.addShape(prs.ShapeType.rect, { x: 0, y: 1.4, w: '100%', h: 5.6, fill: { color: LIGHT } })

  const meta = [
    ['Channel',    program.channel       || '—'],
    ['Category',   program.category      || '—'],
    ['Status',     program.status        || '—'],
    ['Schedule',   program.schedule      || '—'],
    ['Episodes',   program.episode_count ? `${program.episode_count} eps` : '—'],
    ['On YouTube', program.youtube_upload ? 'Yes' : 'No'],
  ]
  meta.forEach(([label, value], i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x   = 0.5 + col * 4.2
    const y   = 1.7 + row * 1.1
    s1.addShape(prs.ShapeType.rect, { x, y, w: 3.8, h: 0.9, fill: { color: WHITE }, line: { color: 'E5E7EB', width: 1 }, rectRadius: 0.05 })
    s1.addText(label.toUpperCase(), { x: x+0.15, y: y+0.08, w: 3.5, h: 0.25, fontSize: 8,  color: GRAY, bold: true })
    s1.addText(value,               { x: x+0.15, y: y+0.38, w: 3.5, h: 0.4,  fontSize: 14, color: DARK, bold: true })
  })

  if (program.start_date || program.end_date) {
    s1.addShape(prs.ShapeType.rect, { x: 0.5, y: 4.0, w: 12.3, h: 0.6, fill: { color: RED }, rectRadius: 0.05 })
    s1.addText(`📅  ${program.start_date || '?'}  →  ${program.end_date || 'Ongoing'}`, {
      x: 0.5, y: 4.0, w: 12.3, h: 0.6, color: WHITE, fontSize: 14, bold: true, align: 'center', valign: 'middle',
    })
  }

  if (program.paid_drama_budget) {
    s1.addText(`Paid Drama Budget: ${fmt(program.paid_drama_budget)}`, {
      x: 0.5, y: 4.8, w: 12, h: 0.4, color: GRAY, fontSize: 12, italic: true,
    })
  }

  // ── Slide 2+: Sponsorship (3 per slide, with logos) ───────────────────────
  const allSponsors = sponsors.length > 0
    ? sponsors
    : [{ sponsor_label: 'PRESENTED BY' }, { sponsor_label: 'POWERED BY' }, { sponsor_label: 'ASSOCIATED BY' }]

  // Pre-fetch all logos as base64
  const logoCache = {}
  await Promise.all(
    allSponsors.map(async s => {
      if (s.logo_url) logoCache[s.logo_url] = await toBase64(s.logo_url)
    })
  )

  // Split into pages of 3
  for (let page = 0; page < Math.ceil(allSponsors.length / 3); page++) {
    const chunk = allSponsors.slice(page * 3, page * 3 + 3)
    const ss    = prs.addSlide()

    ss.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.0, fill: { color: RED } })
    const pageLabel = Math.ceil(allSponsors.length / 3) > 1
      ? `${program.name}  ·  Sponsorship  (${page+1}/${Math.ceil(allSponsors.length/3)})`
      : `${program.name}  ·  Sponsorship`
    ss.addText(pageLabel, { x: 0.5, y: 0.15, w: 12, h: 0.7, color: WHITE, fontSize: 22, bold: true, valign: 'middle' })

    const cols = chunk.length
    const colW = (12.3 - (cols - 1) * 0.2) / cols

    chunk.forEach((s, i) => {
      const x         = 0.5 + i * (colW + 0.2)
      const name      = s.client?.name || s.sponsor_name || ''
      const hasName   = !!name
      const logoB64   = s.logo_url ? logoCache[s.logo_url] : null

      ss.addShape(prs.ShapeType.rect, {
        x, y: 1.3, w: colW, h: 4.7,
        fill: { color: hasName ? WHITE : 'FEF3C7' },
        line: { color: hasName ? 'E5E7EB' : 'FCD34D', width: 2 },
        rectRadius: 0.08,
      })

      ss.addText((s.sponsor_label || '').toUpperCase(), {
        x: x+0.15, y: 1.45, w: colW-0.3, h: 0.35, fontSize: 9, color: GRAY, bold: true,
      })
      ss.addShape(prs.ShapeType.line, { x: x+0.15, y: 1.85, w: colW-0.3, h: 0, line: { color: 'E5E7EB', width: 1 } })

      if (hasName) {
        if (logoB64) {
          // Logo image centred
          ss.addImage({ data: logoB64, x: x+0.2, y: 2.0, w: colW-0.4, h: 1.4 })
          // Name below logo
          ss.addText(name, { x: x+0.1, y: 3.55, w: colW-0.2, h: 0.5, fontSize: 12, color: DARK, bold: true, align: 'center' })
        } else {
          // No logo — large name text
          ss.addText(name, { x: x+0.1, y: 2.2, w: colW-0.2, h: 1.5, fontSize: 18, color: DARK, bold: true, align: 'center', valign: 'middle' })
        }
      } else {
        ss.addText('OPEN SLOT', { x: x+0.1, y: 2.5, w: colW-0.2, h: 0.7, fontSize: 20, color: 'D97706', bold: true, align: 'center', valign: 'middle' })
        ss.addText('Available for sponsorship', { x: x+0.1, y: 3.3, w: colW-0.2, h: 0.4, fontSize: 10, color: GRAY, align: 'center' })
      }
    })
  }

  // ── Slide 3+: Connected Deals ──────────────────────────────────────────────
  if (deals.length > 0) {
    const s3 = prs.addSlide()
    s3.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.0, fill: { color: DARK } })
    s3.addText(`${program.name}  ·  Active Deals`, { x: 0.5, y: 0.15, w: 12, h: 0.7, color: WHITE, fontSize: 22, bold: true, valign: 'middle' })

    const totalVal = deals.reduce((sum, d) => sum + (d.value_net || 0), 0)
    s3.addShape(prs.ShapeType.rect, { x: 0.5, y: 1.1, w: 12.3, h: 0.55, fill: { color: RED }, rectRadius: 0.05 })
    s3.addText(`${deals.length} Deal${deals.length > 1 ? 's' : ''}  ·  Total: ${fmt(totalVal)}`, {
      x: 0.5, y: 1.1, w: 12.3, h: 0.55, color: WHITE, fontSize: 13, bold: true, align: 'center', valign: 'middle',
    })

    deals.slice(0, 8).forEach((d, i) => {
      const y     = 1.85 + i * 0.65
      const isEven = i % 2 === 0
      s3.addShape(prs.ShapeType.rect, { x: 0.5, y, w: 12.3, h: 0.58, fill: { color: isEven ? WHITE : LIGHT }, line: { color: 'E5E7EB', width: 1 } })
      s3.addText(d.name           || '—', { x: 0.65, y: y+0.08, w: 5,   h: 0.4, fontSize: 11, color: DARK,    bold: true })
      s3.addText(d.clients?.name  || '—', { x: 5.5,  y: y+0.08, w: 3,   h: 0.4, fontSize: 11, color: GRAY })
      s3.addText(fmt(d.value_net),         { x: 9.5,  y: y+0.08, w: 1.8, h: 0.4, fontSize: 11, color: '059669', bold: true, align: 'right' })
      s3.addText(d.status         || '—', { x: 11.4, y: y+0.08, w: 1.3, h: 0.4, fontSize: 9,  color: GRAY,  align: 'right' })
    })
  }

  await prs.writeFile({ fileName: `${program.name.replace(/[^a-z0-9]/gi, '_')}_Program.pptx` })
}
