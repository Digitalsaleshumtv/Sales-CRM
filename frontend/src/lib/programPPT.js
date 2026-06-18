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

export function exportProgramPPT(program, deals = []) {
  const prs = new pptxgen()
  prs.layout = 'LAYOUT_WIDE'

  // ── Slide 1: Program Overview ──────────────────────────────────────────────
  const s1 = prs.addSlide()
  s1.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.4, fill: { color: RED } })
  s1.addText('HUM Network Digital Sales', { x: 0.5, y: 0.15, w: 9, h: 0.4, color: WHITE, fontSize: 11, italic: true })
  s1.addText(program.name, { x: 0.5, y: 0.5, w: 12, h: 0.75, color: WHITE, fontSize: 32, bold: true })

  s1.addShape(prs.ShapeType.rect, { x: 0, y: 1.4, w: '100%', h: 5.6, fill: { color: LIGHT } })

  // Meta grid
  const meta = [
    ['Channel',   program.channel || '—'],
    ['Category',  program.category || '—'],
    ['Status',    program.status || '—'],
    ['Schedule',  program.schedule || '—'],
    ['Episodes',  program.episode_count ? `${program.episode_count} aired` : '—'],
    ['On YouTube', program.youtube_upload ? 'Yes' : 'No'],
  ]
  meta.forEach(([label, value], i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = 0.5 + col * 4.2
    const y = 1.7 + row * 1.1
    s1.addShape(prs.ShapeType.rect, { x, y, w: 3.8, h: 0.9, fill: { color: WHITE }, line: { color: 'E5E7EB', width: 1 }, rectRadius: 0.05 })
    s1.addText(label.toUpperCase(), { x: x+0.15, y: y+0.08, w: 3.5, h: 0.25, fontSize: 8, color: GRAY, bold: true })
    s1.addText(value, { x: x+0.15, y: y+0.38, w: 3.5, h: 0.4, fontSize: 14, color: DARK, bold: true })
  })

  // Date range bar
  if (program.start_date || program.end_date) {
    s1.addShape(prs.ShapeType.rect, { x: 0.5, y: 4.0, w: 12.3, h: 0.6, fill: { color: RED }, rectRadius: 0.05 })
    const dateLabel = `${program.start_date || '?'}  →  ${program.end_date || 'Ongoing'}`
    s1.addText(`📅  ${dateLabel}`, { x: 0.5, y: 4.0, w: 12.3, h: 0.6, color: WHITE, fontSize: 14, bold: true, align: 'center', valign: 'middle' })
  }

  // Budget
  if (program.paid_drama_budget) {
    s1.addText(`Paid Drama Budget: ${fmt(program.paid_drama_budget)}`, { x: 0.5, y: 4.8, w: 12, h: 0.4, color: GRAY, fontSize: 12, italic: true })
  }

  // ── Slide 2: Sponsorship ───────────────────────────────────────────────────
  const s2 = prs.addSlide()
  s2.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.0, fill: { color: RED } })
  s2.addText(`${program.name}  ·  Sponsorship`, { x: 0.5, y: 0.15, w: 12, h: 0.7, color: WHITE, fontSize: 22, bold: true, valign: 'middle' })

  const slots = [
    { label: 'PRESENTED BY', brand: program.presenting, agency: program.presenting_agency },
    { label: 'POWERED BY',   brand: program.powered,    agency: program.powered_agency    },
    { label: 'ASSOCIATED BY',brand: program.associated, agency: program.associated_agency },
  ]

  slots.forEach((slot, i) => {
    const x = 0.5 + i * 4.2
    const hasBrand = slot.brand?.name
    s2.addShape(prs.ShapeType.rect, { x, y: 1.3, w: 3.8, h: 4.7, fill: { color: hasBrand ? WHITE : 'FEF3C7' }, line: { color: hasBrand ? 'E5E7EB' : 'FCD34D', width: 2 }, rectRadius: 0.08 })
    s2.addText(slot.label, { x: x+0.15, y: 1.45, w: 3.5, h: 0.35, fontSize: 9, color: GRAY, bold: true })
    s2.addShape(prs.ShapeType.line, { x: x+0.15, y: 1.85, w: 3.5, h: 0, line: { color: 'E5E7EB', width: 1 } })

    if (hasBrand) {
      s2.addText(slot.brand.name, { x: x+0.15, y: 2.0, w: 3.5, h: 1.2, fontSize: 18, color: DARK, bold: true, valign: 'middle' })
      if (slot.agency?.name) {
        s2.addShape(prs.ShapeType.rect, { x: x+0.15, y: 3.4, w: 3.5, h: 0.55, fill: { color: 'DBEAFE' }, rectRadius: 0.05 })
        s2.addText(`via ${slot.agency.name}`, { x: x+0.15, y: 3.4, w: 3.5, h: 0.55, fontSize: 11, color: '1E40AF', bold: true, align: 'center', valign: 'middle' })
      }
    } else {
      s2.addText('OPEN SLOT', { x: x+0.15, y: 2.5, w: 3.5, h: 0.7, fontSize: 20, color: 'D97706', bold: true, align: 'center', valign: 'middle' })
      s2.addText('Available for sponsorship', { x: x+0.15, y: 3.3, w: 3.5, h: 0.4, fontSize: 10, color: GRAY, align: 'center' })
    }
  })

  // ── Slide 3: Connected Deals (if any) ─────────────────────────────────────
  if (deals.length > 0) {
    const s3 = prs.addSlide()
    s3.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.0, fill: { color: DARK } })
    s3.addText(`${program.name}  ·  Active Deals`, { x: 0.5, y: 0.15, w: 12, h: 0.7, color: WHITE, fontSize: 22, bold: true, valign: 'middle' })

    const totalVal = deals.reduce((s, d) => s + (d.value_net || 0), 0)
    s3.addShape(prs.ShapeType.rect, { x: 0.5, y: 1.1, w: 12.3, h: 0.55, fill: { color: RED }, rectRadius: 0.05 })
    s3.addText(`${deals.length} Deal${deals.length > 1 ? 's' : ''}  ·  Total Value: ${fmt(totalVal)}`, {
      x: 0.5, y: 1.1, w: 12.3, h: 0.55, color: WHITE, fontSize: 13, bold: true, align: 'center', valign: 'middle'
    })

    deals.slice(0, 8).forEach((d, i) => {
      const y = 1.85 + i * 0.65
      const isEven = i % 2 === 0
      s3.addShape(prs.ShapeType.rect, { x: 0.5, y, w: 12.3, h: 0.58, fill: { color: isEven ? WHITE : LIGHT }, line: { color: 'E5E7EB', width: 1 } })
      s3.addText(d.name || '—',          { x: 0.65, y: y+0.08, w: 5, h: 0.4, fontSize: 11, color: DARK, bold: true })
      s3.addText(d.clients?.name || '—', { x: 5.5,  y: y+0.08, w: 3, h: 0.4, fontSize: 11, color: GRAY })
      s3.addText(fmt(d.value_net),        { x: 9.5,  y: y+0.08, w: 1.8, h: 0.4, fontSize: 11, color: '059669', bold: true, align: 'right' })
      s3.addText(d.status || '—',         { x: 11.4, y: y+0.08, w: 1.3, h: 0.4, fontSize: 9,  color: GRAY, align: 'right' })
    })
  }

  prs.writeFile({ fileName: `${program.name.replace(/[^a-z0-9]/gi, '_')}_Program.pptx` })
}
