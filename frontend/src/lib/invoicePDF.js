import jsPDF from 'jspdf'

function n(v) { return Number(v || 0).toLocaleString('en-PK') }

export function generateInvoicePDF(invoice) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210

  // Brand header bar
  doc.setFillColor(220, 38, 38)
  doc.rect(0, 0, W, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('HUM NETWORK LIMITED — DIGITAL SALES', 14, 11.5)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('digitalsales@hum.tv', W - 14, 11.5, { align: 'right' })

  // Invoice title block
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('TAX INVOICE', 14, 34)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(`Invoice No: ${invoice.invoice_number}`, W - 14, 24, { align: 'right' })
  doc.text(`Invoice Date: ${invoice.invoice_date || '—'}`, W - 14, 31, { align: 'right' })
  doc.text(`Due Date: ${invoice.due_date || '—'}`, W - 14, 38, { align: 'right' })
  doc.text(`Status: ${invoice.status || '—'}`, W - 14, 45, { align: 'right' })

  // Divider
  doc.setDrawColor(220, 38, 38)
  doc.setLineWidth(0.5)
  doc.line(14, 40, W - 14, 40)

  // Bill To
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('BILL TO', 14, 50)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(20, 20, 20)
  doc.text(invoice.clients?.name || 'Client', 14, 57)

  // From
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('FROM', W / 2 + 10, 50)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(20, 20, 20)
  doc.text('HUM Network Limited', W / 2 + 10, 57)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text('HUM House, Khayaban-e-Iqbal', W / 2 + 10, 63)
  doc.text('F-6/4, Islamabad, Pakistan', W / 2 + 10, 68)
  doc.text('NTN: 3277897-0', W / 2 + 10, 73)

  // Table header
  const tY = 85
  doc.setFillColor(248, 248, 248)
  doc.rect(14, tY, W - 28, 9, 'F')
  doc.setDrawColor(220, 220, 220)
  doc.rect(14, tY, W - 28, 9, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  doc.text('DESCRIPTION', 18, tY + 6)
  doc.text('NET (PKR)', 132, tY + 6, { align: 'right' })
  doc.text('GST 18%', 158, tY + 6, { align: 'right' })
  doc.text('GROSS (PKR)', W - 16, tY + 6, { align: 'right' })

  // Line item
  const lY = tY + 18
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(20, 20, 20)
  const desc = invoice.deals?.name || 'Digital Advertising & Sponsorship Services'
  const wrapped = doc.splitTextToSize(desc, 110)
  doc.text(wrapped, 18, lY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(n(invoice.amount_net), 132, lY, { align: 'right' })
  doc.text(n(invoice.gst), 158, lY, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.text(n(invoice.amount_gross), W - 16, lY, { align: 'right' })

  // Totals box
  const boxY = lY + 22
  doc.setDrawColor(220, 220, 220)
  doc.line(14, boxY - 4, W - 14, boxY - 4)

  const addRow = (label, val, bold = false, y) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text(label, 130, y, { align: 'right' })
    doc.setTextColor(20, 20, 20)
    doc.text(val, W - 16, y, { align: 'right' })
  }

  addRow('Sub-total (Net):', `PKR ${n(invoice.amount_net)}`, false, boxY + 4)
  addRow('GST (18%):', `PKR ${n(invoice.gst)}`, false, boxY + 11)
  addRow('Gross Total:', `PKR ${n(invoice.amount_gross)}`, false, boxY + 18)

  if ((invoice.amount_received || 0) > 0) {
    addRow('Amount Received:', `PKR ${n(invoice.amount_received)}`, false, boxY + 26)
    doc.setFillColor(254, 242, 242)
    doc.rect(14, boxY + 30, W - 28, 10, 'F')
    addRow('BALANCE DUE:', `PKR ${n((invoice.amount_gross || 0) - (invoice.amount_received || 0))}`, true, boxY + 37)
  } else {
    doc.setFillColor(254, 242, 242)
    doc.rect(14, boxY + 22, W - 28, 10, 'F')
    addRow('TOTAL DUE:', `PKR ${n(invoice.amount_gross)}`, true, boxY + 29)
  }

  // Payment terms note
  const noteY = boxY + 55
  doc.setFillColor(249, 250, 251)
  doc.rect(14, noteY, W - 28, 18, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text('PAYMENT TERMS', 18, noteY + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text('Payment is due within 30 days of invoice date. Late payments may incur a 2% monthly surcharge.', 18, noteY + 12)

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('This is a computer-generated invoice · HUM Network Limited · digitalsales@hum.tv', W / 2, 282, { align: 'center' })

  doc.save(`Invoice_${invoice.invoice_number}.pdf`)
}
