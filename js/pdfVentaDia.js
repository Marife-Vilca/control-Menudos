
import { formatearMoneda } from './utils.js';
import { buscarTiqueVentaPorId, getDeudores } from './ventaDia.js';
import { buscarCompraPorId } from './comprasProveedores.js';
import { MANROPE_REGULAR_BASE64, MANROPE_BOLD_BASE64 } from './fonts/manrope-pdf.js';

const COLOR_FUERTE = [45, 45, 48];
const COLOR_SUAVE = [120, 120, 125];
const COLOR_LINEA = [225, 225, 228];

let fuenteRegistrada = false;

function crearDocumento(alto) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, alto] });

  try {
    doc.addFileToVFS("Manrope-Regular.ttf", MANROPE_REGULAR_BASE64);
    doc.addFont("Manrope-Regular.ttf", "Manrope", "normal");
    doc.addFileToVFS("Manrope-Bold.ttf", MANROPE_BOLD_BASE64);
    doc.addFont("Manrope-Bold.ttf", "Manrope", "bold");
    doc.setFont("Manrope", "normal");
    fuenteRegistrada = true;
  } catch (e) {
    fuenteRegistrada = false;
  }

  return doc;
}

function fuente(doc, peso) {
  doc.setFont(fuenteRegistrada ? "Manrope" : "helvetica", peso);
}

function lineaSuave(doc, y) {
  doc.setDrawColor(...COLOR_LINEA);
  doc.setLineWidth(0.2);
  doc.line(5, y, 75, y);
}

function dibujarTiqueVenta(doc, tique) {
  let y = 12;

  fuente(doc, "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLOR_FUERTE);
  doc.text(tique.casera.toUpperCase(), 5, y);

  fuente(doc, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_SUAVE);
  doc.text(`Tique #${tique.id.toString().padStart(3, "0")}  ·  ${tique.fecha}  ·  ${tique.hora}`, 5, y + 5);

  y += 12;
  lineaSuave(doc, y);
  y += 6;

  fuente(doc, "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_FUERTE);

  tique.items.forEach((item) => {
    doc.text(item.prod.toUpperCase(), 5, y);
    doc.text(formatearMoneda(item.subtotal), 75, y, { align: "right" });
    y += 6;
  });

  if (tique.pasaje > 0) {
    doc.setTextColor(...COLOR_SUAVE);
    doc.text("Pasaje", 5, y);
    doc.text(formatearMoneda(tique.pasaje), 75, y, { align: "right" });
    doc.setTextColor(...COLOR_FUERTE);
    y += 6;
  }

  y += 1;
  lineaSuave(doc, y);
  y += 7;

  if (tique.deudaAnterior > 0) {
    fuente(doc, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_SUAVE);
    doc.text("Deuda anterior", 5, y);
    doc.text(formatearMoneda(tique.deudaAnterior), 75, y, { align: "right" });
    y += 7;
  }

  fuente(doc, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_FUERTE);
  doc.text("TOTAL A PAGAR", 5, y);
  doc.text(formatearMoneda(tique.totalCuenta), 75, y, { align: "right" });
  y += 8;

  fuente(doc, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_SUAVE);
  doc.text("Pagado", 5, y);
  doc.text(formatearMoneda(tique.montoPagado), 75, y, { align: "right" });
  y += 5.5;

  if (tique.saldoACuenta > 0) {
    fuente(doc, "bold");
    doc.setFontSize(9);
    doc.setTextColor(180, 60, 55);
    doc.text("QUEDA A CUENTA", 5, y);
    doc.text(formatearMoneda(tique.saldoACuenta), 75, y, { align: "right" });
    y += 6;
  }

  y += 6;
  fuente(doc, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_SUAVE);
  doc.text("Gracias por su preferencia", 40, y, { align: "center" });

  return y;
}

function nombreArchivoTique(tique) {
  return `Venta_${tique.id.toString().padStart(3, "0")}_${tique.casera}.pdf`;
}

function calcularAltoTique(tique) {
  return 90 + tique.items.length * 6;
}

export function descargarTiqueVentaPDF(tiqueId) {
  const tique = buscarTiqueVentaPorId(tiqueId);
  if (!tique) {
    alert("Tique no encontrado.");
    return;
  }

  const doc = crearDocumento(calcularAltoTique(tique));
  dibujarTiqueVenta(doc, tique);
  doc.save(nombreArchivoTique(tique));
}

function generarArchivoTiqueVenta(tique) {
  const doc = crearDocumento(calcularAltoTique(tique));
  dibujarTiqueVenta(doc, tique);

  const nombreArchivo = nombreArchivoTique(tique);
  const blob = doc.output("blob");
  return new File([blob], nombreArchivo, { type: "application/pdf" });
}

export async function compartirTiqueVentaPDF(tiqueId) {
  const tique = buscarTiqueVentaPorId(tiqueId);
  if (!tique) {
    alert("Tique no encontrado.");
    return;
  }

  const archivo = generarArchivoTiqueVenta(tique);

  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({
        files: [archivo],
        title: `Venta - ${tique.casera}`,
        text: `Cuenta de ${tique.casera}: ${formatearMoneda(tique.totalCuenta)}`
      });
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return; // el usuario canceló, no es un error
    }
  }

  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = archivo.name;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
  alert("Tu navegador no permite compartir directo. Se descargó el PDF: adjúntalo tú misma en WhatsApp.");
}

export function descargarEstadoCuentaPDF(nombreCasera) {
  const deudor = getDeudores().find((d) => d.nombre.toLowerCase() === nombreCasera.toLowerCase());
  if (!deudor) {
    alert("Esa casera no tiene saldo pendiente.");
    return;
  }

  const tiquesOrdenados = deudor.tiques.slice().sort((a, b) => a.id - b.id);
  const alto = 65 + tiquesOrdenados.length * 7;
  const doc = crearDocumento(alto);
  let y = 12;

  fuente(doc, "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLOR_FUERTE);
  doc.text(deudor.nombre.toUpperCase(), 5, y);

  fuente(doc, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_SUAVE);
  doc.text("Estado de cuenta", 5, y + 5);

  y += 12;
  lineaSuave(doc, y);
  y += 7;

  fuente(doc, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_FUERTE);

  tiquesOrdenados.forEach((t) => {
    doc.text(`Venta ${t.fecha} (#${t.id.toString().padStart(3, "0")})`, 5, y);
    doc.text(formatearMoneda(t.saldoACuenta), 75, y, { align: "right" });
    y += 7;
  });

  y += 1;
  lineaSuave(doc, y);
  y += 8;

  fuente(doc, "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(180, 60, 55);
  doc.text("TOTAL QUE DEBE", 5, y);
  doc.text(formatearMoneda(deudor.saldoTotal), 75, y, { align: "right" });

  doc.save(`Estado_Cuenta_${deudor.nombre}.pdf`);
}

export function descargarCompraPDF(compraId) {
  const compra = buscarCompraPorId(compraId);
  if (!compra) {
    alert("Compra no encontrada.");
    return;
  }

  const alto = 65 + compra.items.length * 10;
  const doc = crearDocumento(alto);
  let y = 12;

  fuente(doc, "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLOR_FUERTE);
  doc.text(compra.proveedor.toUpperCase(), 5, y);

  fuente(doc, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_SUAVE);
  doc.text(`Compra #${compra.id.toString().padStart(3, "0")}  ·  ${compra.fecha}  ·  ${compra.hora}`, 5, y + 5);

  y += 12;
  lineaSuave(doc, y);
  y += 6;

  fuente(doc, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_FUERTE);

  compra.items.forEach((it) => {
    const cantidadTexto = `${it.cantidad} ${it.modo === "kilo" ? "kg" : "u"} x ${formatearMoneda(it.precioUnitario)}`;
    doc.text(it.prod.toUpperCase(), 5, y);
    doc.setTextColor(...COLOR_SUAVE);
    doc.setFontSize(7.5);
    doc.text(cantidadTexto, 5, y + 4);
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_FUERTE);
    doc.text(formatearMoneda(it.subtotal), 75, y, { align: "right" });
    y += 10;
  });

  lineaSuave(doc, y);
  y += 7;

  fuente(doc, "bold");
  doc.setFontSize(11);
  doc.text("TOTAL", 5, y);
  doc.text(formatearMoneda(compra.total), 75, y, { align: "right" });
  y += 7;

  fuente(doc, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_SUAVE);
  doc.text("Adelanto", 5, y);
  doc.text(formatearMoneda(compra.adelanto), 75, y, { align: "right" });
  y += 5.5;

  if (compra.pagosAdicionales > 0) {
    doc.text("Pagos adicionales", 5, y);
    doc.text(formatearMoneda(compra.pagosAdicionales), 75, y, { align: "right" });
    y += 5.5;
  }

  fuente(doc, "bold");
  doc.setFontSize(9);
  doc.setTextColor(compra.saldoPorPagar > 0 ? 180 : 45, compra.saldoPorPagar > 0 ? 60 : 45, compra.saldoPorPagar > 0 ? 55 : 48);
  doc.text("SALDO POR PAGAR", 5, y);
  doc.text(formatearMoneda(compra.saldoPorPagar), 75, y, { align: "right" });

  doc.save(`Compra_${compra.id.toString().padStart(3, "0")}_${compra.proveedor}.pdf`);
}
