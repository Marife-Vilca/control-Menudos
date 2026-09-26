
import { formatearMoneda } from './utils.js';
import { buscarTiqueVentaPorId } from './ventaDia.js';
import { buscarCompraPorId } from './comprasProveedores.js';

function detalleItemVenta(item) {
  if (item.modo === "directo") return "Monto directo";
  if (item.modo === "kilo") return `${item.peso} kg x ${formatearMoneda(item.precioUnitario)}`;
  return `${item.cantidad} x ${formatearMoneda(item.precioUnitario)}`;
}

export function descargarTiqueVentaPDF(tiqueId) {
  const tique = buscarTiqueVentaPorId(tiqueId);
  if (!tique) {
    alert("Tique no encontrado.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 170] });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("VENTA DEL DÍA", 40, 10, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`TIQUE #${tique.id.toString().padStart(3, "0")}`, 40, 15, { align: "center" });
  doc.text(`${tique.fecha} - ${tique.hora}`, 40, 20, { align: "center" });
  doc.text("------------------------------------------", 40, 23, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.text(`CASERA: ${tique.casera.toUpperCase()}`, 5, 29);

  const tableData = tique.items.map((it) => [
    detalleItemVenta(it),
    it.prod.toUpperCase(),
    formatearMoneda(it.subtotal)
  ]);

  doc.autoTable({
    startY: 33,
    head: [["Detalle", "Producto", "Subtotal"]],
    body: tableData,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fontStyle: "bold", fillColor: [230, 230, 230] },
    margin: { left: 5, right: 5 }
  });

  let y = doc.lastAutoTable.finalY + 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  if (tique.pasaje > 0) {
    doc.text("Pasaje:", 5, y);
    doc.text(formatearMoneda(tique.pasaje), 75, y, { align: "right" });
    y += 5;
  }
  if (tique.deudaAnterior > 0) {
    doc.text("Deuda anterior:", 5, y);
    doc.text(formatearMoneda(tique.deudaAnterior), 75, y, { align: "right" });
    y += 5;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL:", 5, y);
  doc.text(formatearMoneda(tique.totalCuenta), 75, y, { align: "right" });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Pagado:", 5, y);
  doc.text(formatearMoneda(tique.montoPagado), 75, y, { align: "right" });
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.text(tique.saldoACuenta > 0 ? "QUEDA A CUENTA:" : "SALDO:", 5, y);
  doc.text(formatearMoneda(tique.saldoACuenta), 75, y, { align: "right" });

  y += 8;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("¡Gracias por su preferencia!", 40, y, { align: "center" });

  doc.save(`Venta_${tique.id.toString().padStart(3, "0")}_${tique.casera}.pdf`);
}

export function descargarCompraPDF(compraId) {
  const compra = buscarCompraPorId(compraId);
  if (!compra) {
    alert("Compra no encontrada.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 160] });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("COMPRA A PROVEEDOR", 40, 10, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`COMPRA #${compra.id.toString().padStart(3, "0")}`, 40, 15, { align: "center" });
  doc.text(`${compra.fecha} - ${compra.hora}`, 40, 20, { align: "center" });
  doc.text("------------------------------------------", 40, 23, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.text(`PROVEEDOR: ${compra.proveedor.toUpperCase()}`, 5, 29);

  const tableData = compra.items.map((it) => [
    `${it.cantidad} ${it.modo === "kilo" ? "kg" : "u"}`,
    it.prod.toUpperCase(),
    formatearMoneda(it.precioUnitario),
    formatearMoneda(it.subtotal)
  ]);

  doc.autoTable({
    startY: 33,
    head: [["Cant.", "Producto", "P.Unit", "Subtotal"]],
    body: tableData,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fontStyle: "bold", fillColor: [230, 230, 230] },
    margin: { left: 5, right: 5 }
  });

  let y = doc.lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL:", 5, y);
  doc.text(formatearMoneda(compra.total), 75, y, { align: "right" });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Adelanto:", 5, y);
  doc.text(formatearMoneda(compra.adelanto), 75, y, { align: "right" });
  y += 5;

  if (compra.pagosAdicionales > 0) {
    doc.text("Pagos adicionales:", 5, y);
    doc.text(formatearMoneda(compra.pagosAdicionales), 75, y, { align: "right" });
    y += 5;
  }

  doc.setFont("helvetica", "bold");
  doc.text("SALDO POR PAGAR:", 5, y);
  doc.text(formatearMoneda(compra.saldoPorPagar), 75, y, { align: "right" });

  doc.save(`Compra_${compra.id.toString().padStart(3, "0")}_${compra.proveedor}.pdf`);
}
