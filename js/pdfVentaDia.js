
import { formatearMoneda, capitalizar } from './utils.js';
import { buscarTiqueVentaPorId, getDeudores, etiquetaDescuento } from './ventaDia.js';
import { buscarCompraPorId } from './comprasProveedores.js';
import { MANROPE_REGULAR_BASE64, MANROPE_BOLD_BASE64 } from './fonts/manrope-pdf.js';

const COLOR_FUERTE = [45, 45, 48];
const COLOR_SUAVE = [120, 120, 125];
const COLOR_LINEA = [225, 225, 228];

let fuenteRegistrada = false;

export function crearDocumento(alto) {
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

/* ---------- TIQUE DE VENTA: monto a la izquierda, descripción a la derecha ---------- */

const TIQUE = {
  margenIzq: 5,
  margenDer: 75,
  centro: 40,
  montoX: 27,      // borde derecho de la columna de montos
  etiquetaX: 30,   // inicio de la descripción
  margenSup: 8,
  margenInf: 6,
  alto: { titulo: 8, cliente: 8, fila: 6, linea: 4, pie: 8 }
};

const ALTURA_PASO = {
  titulo: TIQUE.alto.titulo,
  cliente: TIQUE.alto.cliente,
  fila: TIQUE.alto.fila,
  linea: TIQUE.alto.linea,
  cancelado: TIQUE.alto.fila,
  espacio: 2,
  pie: TIQUE.alto.pie
};

function formatearMonto(valor) {
  return Number(valor).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fechaConCeros(fecha) {
  return String(fecha).split("/").map((parte, i) => (i < 2 ? parte.padStart(2, "0") : parte)).join("/");
}

/** Describe el tique como una lista de pasos; el mismo plan calcula el alto y dibuja. */
function construirPlanTique(tique) {
  const totalItems = tique.items.reduce((suma, item) => suma + (Number(item.subtotal) || 0), 0);
  const ajustes = [];
  if (tique.pasaje > 0) ajustes.push({ signo: "+", monto: tique.pasaje, etiqueta: "pasaje" });
  if (tique.deudaAnterior > 0) ajustes.push({ signo: "+", monto: tique.deudaAnterior, etiqueta: "anterior" });
  if (tique.descuento > 0) ajustes.push({ signo: "-", monto: tique.descuento, etiqueta: etiquetaDescuento(tique).toLowerCase() });

  const plan = [{ tipo: "titulo" }, { tipo: "cliente" }, { tipo: "espacio" }];

  tique.items.forEach((item) => plan.push({ tipo: "fila", monto: item.subtotal, etiqueta: capitalizar(item.prod) }));

  if (ajustes.length > 0) {
    plan.push({ tipo: "linea" });
    plan.push({ tipo: "fila", monto: totalItems, etiqueta: "", negrita: true });
    ajustes.forEach((a) => plan.push({ tipo: "fila", signo: a.signo, monto: a.monto, etiqueta: a.etiqueta }));
  }

  plan.push({ tipo: "linea" });
  plan.push({ tipo: "fila", monto: tique.totalCuenta, etiqueta: "total", negrita: true });

  if (tique.montoPagado > 0) plan.push({ tipo: "fila", monto: tique.montoPagado, etiqueta: "pagó" });

  plan.push({ tipo: "linea", grueso: true });

  if (tique.saldoACuenta > 0) {
    plan.push({ tipo: "fila", monto: tique.saldoACuenta, etiqueta: "falta", negrita: true });
  } else {
    plan.push({ tipo: "cancelado" });
  }

  plan.push({ tipo: "pie" });
  return plan;
}

export function altoDelPlan(plan) {
  return TIQUE.margenSup + plan.reduce((suma, paso) => suma + ALTURA_PASO[paso.tipo], 0) + TIQUE.margenInf;
}

function trazarPaso(doc, paso, y, tique) {
  const { margenIzq, margenDer, centro, montoX, etiquetaX, alto } = TIQUE;
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_FUERTE);

  switch (paso.tipo) {
    case "titulo":
      fuente(doc, "bold");
      doc.setFontSize(11);
      doc.text("COMERCIAL VIRGEN DE CHAPI", centro, y + 5, { align: "center" });
      break;

    case "cliente": {
      fuente(doc, "normal");
      doc.text("Cliente: ", margenIzq, y + 5);
      const anchoRotulo = doc.getTextWidth("Cliente: ");
      fuente(doc, "bold");
      doc.text(capitalizar(tique.casera), margenIzq + anchoRotulo, y + 5);
      fuente(doc, "normal");
      doc.text(fechaConCeros(tique.fecha), margenDer, y + 5, { align: "right" });
      break;
    }

    case "linea":
      doc.setDrawColor(...COLOR_FUERTE);
      doc.setLineWidth(paso.grueso ? 0.6 : 0.3);
      doc.line(margenIzq, y + alto.linea / 2, montoX + 1, y + alto.linea / 2);
      break;

    case "fila": {
      fuente(doc, paso.negrita ? "bold" : "normal");
      const monto = `${paso.signo || ""}${formatearMonto(paso.monto)}`;
      doc.text(monto, montoX, y + 4.3, { align: "right" });
      if (paso.etiqueta) doc.text(paso.etiqueta, etiquetaX, y + 4.3);
      break;
    }

    case "cancelado":
      fuente(doc, "bold");
      doc.text("CANCELADO", centro, y + 4.3, { align: "center" });
      break;

    case "pie":
      fuente(doc, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLOR_SUAVE);
      doc.text("Gracias por su preferencia", centro, y + 5, { align: "center" });
      break;
  }
}

export function dibujarTiqueVenta(doc, tique, plan) {
  let y = TIQUE.margenSup;
  plan.forEach((paso) => {
    trazarPaso(doc, paso, y, tique);
    y += ALTURA_PASO[paso.tipo];
  });
}

function nombreArchivoTique(tique) {
  return `Venta_${tique.id.toString().padStart(3, "0")}_${tique.casera}.pdf`;
}

function crearPdfTique(tique) {
  const plan = construirPlanTique(tique);
  const doc = crearDocumento(altoDelPlan(plan));
  dibujarTiqueVenta(doc, tique, plan);
  return doc;
}

export function descargarTiqueVentaPDF(tiqueId) {
  const tique = buscarTiqueVentaPorId(tiqueId);
  if (!tique) {
    alert("Tique no encontrado.");
    return;
  }

  crearPdfTique(tique).save(nombreArchivoTique(tique));
}

function generarArchivoTiqueVenta(tique) {
  const doc = crearPdfTique(tique);

  const nombreArchivo = nombreArchivoTique(tique);
  const blob = doc.output("blob");
  return new File([blob], nombreArchivo, { type: "application/pdf" });
}

/** Comparte un PDF con el menú del celular; si no se puede, lo descarga. */
export async function compartirArchivoPDF(archivo, { titulo, texto }) {
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: titulo, text: texto });
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

export async function compartirTiqueVentaPDF(tiqueId) {
  const tique = buscarTiqueVentaPorId(tiqueId);
  if (!tique) {
    alert("Tique no encontrado.");
    return;
  }

  await compartirArchivoPDF(generarArchivoTiqueVenta(tique), {
    titulo: `Venta - ${tique.casera}`,
    texto: `Cuenta de ${tique.casera}: ${formatearMoneda(tique.totalCuenta)}`
  });
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
