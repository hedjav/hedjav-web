import { jsPDF } from 'jspdf'

type InvoiceData = {
  invoice_number: string
  date: Date
  user_name: string | null
  user_email: string
  ebook_title: string
  amount: number
  currency?: string
}

/**
 * Generates a PDF invoice for a purchase.
 * Returns the PDF as an ArrayBuffer.
 */
export function generateInvoicePDF(data: InvoiceData): ArrayBuffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const w = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 25

  // --- Header ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(27, 42, 74) // #1B2A4A
  doc.text('Hedjav', margin, y)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  y += 10
  doc.text('KTALYZ SARL', margin, y)
  y += 5
  doc.text('Cotonou, Benin', margin, y)
  y += 5
  doc.text('RCCM : RB/COT/24 B 12345', margin, y)
  y += 5
  doc.text('IFU : 3202400000000', margin, y)
  y += 5
  doc.text('Tel : +229 01 97 89 03 630', margin, y)

  // --- Invoice number + date (right aligned) ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(197, 160, 40) // #C5A028
  doc.text('FACTURE', w - margin, 25, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.text(`N° ${data.invoice_number}`, w - margin, 35, { align: 'right' })

  const dateStr = data.date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  doc.text(`Date : ${dateStr}`, w - margin, 42, { align: 'right' })

  // --- Separator ---
  y += 10
  doc.setDrawColor(197, 160, 40)
  doc.setLineWidth(0.5)
  doc.line(margin, y, w - margin, y)

  // --- Client ---
  y += 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(27, 42, 74)
  doc.text('FACTURER A :', margin, y)

  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.text(data.user_name ?? 'Client', margin, y)
  y += 5
  doc.text(data.user_email, margin, y)

  // --- Table ---
  y += 15
  const colX = [margin, margin + 90, margin + 115, margin + 140]
  const tableW = w - 2 * margin

  // Table header
  doc.setFillColor(27, 42, 74)
  doc.rect(margin, y - 5, tableW, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('Description', colX[0] + 4, y + 1)
  doc.text('Qte', colX[1] + 4, y + 1)
  doc.text('Prix', colX[2] + 4, y + 1)
  doc.text('Total', colX[3] + 4, y + 1)

  // Table row
  y += 12
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.setFontSize(10)

  const priceStr = new Intl.NumberFormat('fr-FR').format(data.amount) + ' ' + (data.currency ?? 'XOF')
  doc.text(data.ebook_title, colX[0] + 4, y, { maxWidth: 82 })
  doc.text('1', colX[1] + 4, y)
  doc.text(priceStr, colX[2] + 4, y)
  doc.text(priceStr, colX[3] + 4, y)

  // Line under row
  y += 6
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(margin, y, w - margin, y)

  // --- Total ---
  y += 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(27, 42, 74)
  doc.text('Total TTC :', colX[2] + 4, y)
  doc.setTextColor(197, 160, 40)
  doc.text(priceStr, colX[3] + 4, y)

  // --- Footer ---
  y += 30
  doc.setDrawColor(197, 160, 40)
  doc.setLineWidth(0.5)
  doc.line(margin, y, w - margin, y)

  y += 8
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text('Facture acquittee — Paiement via FedaPay', w / 2, y, { align: 'center' })

  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Hedjav — Ecole en ligne de la Gestion de Patrimoine — Zone UEMOA', w / 2, y, { align: 'center' })
  y += 4
  doc.text('hedjav@gmail.com — egp.hedjav.com', w / 2, y, { align: 'center' })

  return doc.output('arraybuffer')
}
