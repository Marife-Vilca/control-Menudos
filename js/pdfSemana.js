import { formatearMoneda } from './utils.js';
import { crearDocumento, altoDelPlan, dibujarTiqueVenta, compartirArchivoPDF } from './pdfVentaDia.js';
import { buscarTiqueSemanaPorId, etiquetaDiaFecha, sumarEntregas } from './semana.js';

/** Mismo estilo que el tique de venta: monto a la izquierda, día y fecha a la derecha. */
function construirPlanTiqueSemana(tique) {
  const plan = [{ tipo: "titulo" }, { tipo: "cliente" }, { tipo: "espacio" }];

  tique.entregas.forEach((entrega) => {
    plan.push({ tipo: "fila", monto: entrega.monto, etiqueta: etiquetaDiaFecha(entrega.fechaISO) });
  });

  if (tique.deudaAnterior > 0) {
    plan.push({ tipo: "linea" });
    plan.push({ tipo: "fila", monto: sumarEntregas(tique.entregas), etiqueta: "", negrita: true });
    plan.push({ tipo: "fila", signo: "+", monto: tique.deudaAnterior, etiqueta: "anterior" });
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

function nombreArchivoTiqueSemana(tique) {
  return `Cuenta_${tique.id.toString().padStart(3, "0")}_${tique.casera}.pdf`;
}

function crearPdfTiqueSemana(tique) {
  const plan = construirPlanTiqueSemana(tique);
  const doc = crearDocumento(altoDelPlan(plan));
  dibujarTiqueVenta(doc, tique, plan);
  return doc;
}

export function descargarTiqueSemanaPDF(tiqueId) {
  const tique = buscarTiqueSemanaPorId(tiqueId);
  if (!tique) {
    alert("Cuenta no encontrada.");
    return;
  }
  crearPdfTiqueSemana(tique).save(nombreArchivoTiqueSemana(tique));
}

export async function compartirTiqueSemanaPDF(tiqueId) {
  const tique = buscarTiqueSemanaPorId(tiqueId);
  if (!tique) {
    alert("Cuenta no encontrada.");
    return;
  }

  const blob = crearPdfTiqueSemana(tique).output("blob");
  const archivo = new File([blob], nombreArchivoTiqueSemana(tique), { type: "application/pdf" });

  await compartirArchivoPDF(archivo, {
    titulo: `Cuenta - ${tique.casera}`,
    texto: `Cuenta de ${tique.casera}: ${formatearMoneda(tique.totalCuenta)}`
  });
}
