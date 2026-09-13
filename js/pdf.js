
import { state, getCicloActual } from './state.js';
import { formatearMoneda } from './utils.js';

function totalTicket(ticket) {
  return ticket.items.reduce((suma, item) => suma + (Number(item.subtotal) || 0), 0);
}

export function descargarTicketPDF(ticketId) {
  const ciclo = getCicloActual();
  const ticket = ciclo.pedidos.find((t) => t.id === ticketId);

  if (!ticket) {
    alert("Ticket no encontrado.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 150]
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CONTROL DE MENUDOS", 40, 10, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`TICKET DE ENTREGA #${ticket.id.toString().padStart(3, "0")}`, 40, 15, { align: "center" });
  doc.text(`Ciclo: ${state.diaActivo}`, 40, 20, { align: "center" });
  doc.text(`Hora: ${ticket.hora}`, 40, 25, { align: "center" });
  doc.text("------------------------------------------", 40, 28, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.text(`CASERA: ${ticket.casera.toUpperCase()}`, 5, 34);

  const tableData = ticket.items.map((it) => [
    it.peso ? `${it.peso} kg` : it.cant.toString(),
    it.prod.toUpperCase(),
    it.tipo.toUpperCase(),
    formatearMoneda(it.subtotal)
  ]);

  doc.autoTable({
    startY: 38,
    head: [["Cant.", "Producto", "Tipo", "Subtotal"]],
    body: tableData,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fontStyle: "bold", fillColor: [230, 230, 230] },
    margin: { left: 5, right: 5 }
  });

  let finalY = doc.lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`TOTAL: ${formatearMoneda(totalTicket(ticket))}`, 75, finalY, { align: "right" });

  finalY += 8;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("¡Gracias por su preferencia!", 40, finalY, { align: "center" });

  doc.save(`Ticket_${ticket.id.toString().padStart(3, "0")}_${ticket.casera}.pdf`);
}

export function exportarReporteDiaPDF() {
  const ciclo = getCicloActual();
  const despachados = ciclo.pedidos.filter((t) => t.despachado);

  if (despachados.length === 0) {
    alert(`No hay entregas despachadas en el ciclo actual (${state.diaActivo}) para exportar.`);
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("REPORTE GENERAL DE ENTREGAS Y TIQUES", 14, 15);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Día / Ciclo Operativo: ${state.diaActivo}`, 14, 22);
  doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 14, 27);
  doc.text(`Total Tiques Entregados: ${despachados.length}`, 14, 32);

  const ingresoTotal = despachados.reduce((suma, t) => suma + totalTicket(t), 0);
  doc.text(`Ingreso Total del Ciclo: ${formatearMoneda(ingresoTotal)}`, 14, 37);

  let startY = 44;

  despachados.forEach((tique, index) => {
    const tableData = tique.items.map((it) => [
      it.peso ? `${it.peso} kg` : it.cant.toString(),
      it.prod.toUpperCase(),
      it.tipo.toUpperCase(),
      formatearMoneda(it.subtotal)
    ]);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(
      `${index + 1}. Ticket #${tique.id.toString().padStart(3, "0")} - Casera: ${tique.casera.toUpperCase()} (${tique.fechaDespacho || tique.hora})`,
      14,
      startY
    );

    doc.autoTable({
      startY: startY + 2,
      head: [["Cantidad", "Producto / Pieza", "Origen (Vaca/Toro)", "Subtotal"]],
      body: tableData,
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 14, right: 14 }
    });

    startY = doc.lastAutoTable.finalY + 8;

    if (startY > 260 && index < despachados.length - 1) {
      doc.addPage();
      startY = 15;
    }
  });

  doc.save(`Reporte_Entregas_${state.diaActivo}_${new Date().toISOString().split("T")[0]}.pdf`);
}
