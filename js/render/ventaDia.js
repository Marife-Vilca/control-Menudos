
import { formatearMoneda } from '../utils.js';
import {
  getVentaDelDia,
  crearTiqueVenta,
  actualizarTiqueVenta,
  registrarPagoVenta,
  eliminarTiqueVenta,
  cerrarVentaDelDia,
  sugerirDeudaAnterior,
  getDeudores,
  buscarTiqueVentaPorId,
  calcularTotalCuenta,
  etiquetaDescuento
} from '../ventaDia.js';
import {
  agregarFilaVenta,
  conectarFilasVenta,
  recolectarItemsVenta,
  sumarSubtotales
} from './filaVenta.js';
import { descargarTiqueVentaPDF, compartirTiqueVentaPDF, descargarEstadoCuentaPDF } from '../pdfVentaDia.js';
import { leerTexto } from '../tts.js';

export function activarSubvista(nombre) {
  document.querySelectorAll(".subvista-tab").forEach((tab) => {
    tab.classList.toggle("subvista-tab-activo", tab.dataset.subvista === nombre);
  });
  document.querySelectorAll(".subvista-panel").forEach((panel) => {
    panel.classList.toggle("subvista-panel-activo", panel.dataset.subvista === nombre);
  });
}

function abrirModal(idModal) {
  document.getElementById(idModal).classList.add("abierto");
}

function cerrarModal(idModal) {
  document.getElementById(idModal).classList.remove("abierto");
}

function actualizarTotales({ contenedor, inputPasaje, inputDeuda, inputDescuento, inputPagado, spanTotal, spanSaldo }) {
  const totalCuenta = calcularTotalCuenta({
    totalItems: sumarSubtotales(contenedor),
    pasaje: parseFloat(inputPasaje.value),
    deudaAnterior: parseFloat(inputDeuda.value),
    descuento: parseFloat(inputDescuento.value)
  });

  spanTotal.textContent = formatearMoneda(totalCuenta);

  const pagado = Math.min(parseFloat(inputPagado.value) || 0, totalCuenta);
  const saldo = Math.max(0, totalCuenta - pagado);

  spanSaldo.textContent = formatearMoneda(saldo);
  spanSaldo.classList.toggle("saldo-pendiente", saldo > 0);
}

/** Lee los ítems del contenedor; si hay un error de captura lo avisa y devuelve null. */
function leerItemsOAvisar(contenedor) {
  try {
    const items = recolectarItemsVenta(contenedor);
    if (items.length === 0) {
      alert("Ingrese al menos un producto con monto mayor a 0.");
      return null;
    }
    return items;
  } catch (error) {
    alert(error.message);
    return null;
  }
}

function resumenCantidadItem(item) {
  if (item.modo === "directo") return "Monto directo";
  if (item.modo === "kilo") return `${item.peso} kg`;
  return `${item.cantidad} u`;
}

function construirTextoVentaTique(tique) {
  const detalle = tique.items.map((it) => `${it.prod} (${resumenCantidadItem(it)})`).join(", ");
  let texto = `Venta de ${tique.casera}. Lleva: ${detalle}.`;
  if (tique.pasaje > 0) texto += ` Pasaje: ${formatearMoneda(tique.pasaje)}.`;
  if (tique.deudaAnterior > 0) texto += ` Deuda anterior: ${formatearMoneda(tique.deudaAnterior)}.`;
  if (tique.descuento > 0) texto += ` Descuento de ${etiquetaDescuento(tique)}: ${formatearMoneda(tique.descuento)}.`;
  texto += ` Total: ${formatearMoneda(tique.totalCuenta)}.`;
  texto += tique.saldoACuenta > 0
    ? ` Queda a cuenta: ${formatearMoneda(tique.saldoACuenta)}.`
    : " Pagado completo.";
  return texto;
}

function montoHTML(valor) {
  return `<span class="tv-monto"><span>S/</span><span>${Number(valor).toFixed(2)}</span></span>`;
}

function tvFila(etiqueta, valor, extraClase = "") {
  return `<div class="tv-fila ${extraClase}"><span class="tv-etiqueta">${etiqueta}</span>${montoHTML(valor)}</div>`;
}

function renderVentaTiqueCard(tique) {
  const totalItems = tique.items.reduce((suma, it) => suma + (Number(it.subtotal) || 0), 0);
  const itemsHtml = tique.items.map((it) => tvFila(it.prod, it.subtotal, "tv-producto")).join("");

  const badge = tique.saldoACuenta > 0
    ? `<span class="status-badge status-bad">DEBE ${formatearMoneda(tique.saldoACuenta)}</span>`
    : `<span class="status-badge status-ok">PAGADO</span>`;

  return `
    <div class="kfc-ticket ticket-venta ${tique.saldoACuenta === 0 ? "ticket-despachado" : ""}">
      <div class="ticket-top">
        <div class="ticket-number">
          <span>VENTA #${tique.id.toString().padStart(3, "0")}</span>
          <span class="ticket-time">${tique.fecha} · ${tique.hora}</span>
        </div>
        <div class="ticket-customer"><i class="fa-solid fa-user"></i> ${tique.casera}</div>
      </div>
      <div class="ticket-body">
        ${itemsHtml}
        <div class="tv-separador"></div>
        <div class="tv-totales">
          ${tvFila("Subtotal", totalItems)}
          ${tique.pasaje > 0 ? tvFila("+ Pasaje", tique.pasaje) : ""}
          ${tique.deudaAnterior > 0 ? tvFila("+ Deuda anterior", tique.deudaAnterior) : ""}
          ${tique.descuento > 0 ? tvFila(`- ${etiquetaDescuento(tique)}`, tique.descuento) : ""}
          <div class="tv-separador"></div>
          ${tvFila("Total", tique.totalCuenta, "tv-negrita")}
          ${tvFila("Pagado", tique.montoPagado)}
        </div>
      </div>
      <div class="ticket-footer">
        <div class="ticket-footer-top">${badge}</div>
        <div class="ticket-footer-secundario">
          ${tique.saldoACuenta > 0 ? `<button class="btn-secondary btn-sm" data-action="pagar-venta" data-id="${tique.id}"><i class="fa-solid fa-hand-holding-dollar"></i> Pago</button>` : ""}
          <button class="btn-secondary btn-sm" data-action="editar-venta" data-id="${tique.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-secondary btn-sm" data-action="pdf-venta" data-id="${tique.id}" title="Descargar PDF"><i class="fa-solid fa-file-pdf"></i></button>
          <button class="btn-secondary btn-sm" data-action="whatsapp-venta" data-id="${tique.id}" title="Enviar PDF por WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
          <button class="btn-secondary btn-sm btn-escuchar-ticket" data-action="escuchar-venta" data-id="${tique.id}" title="Escuchar"><i class="fa-solid fa-volume-high"></i></button>
          <button class="btn-secondary btn-sm" data-action="eliminar-venta" data-id="${tique.id}" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>
    </div>
  `;
}

export function renderVentaDelDia() {
  const contenedor = document.getElementById("venta-tickets-grid");
  if (!contenedor) return;

  const ventaDelDia = getVentaDelDia();

  if (ventaDelDia.tiques.length === 0) {
    contenedor.innerHTML = `
      <div class="estado-vacio-tickets">
        <i class="fa-solid fa-receipt"></i>
        <p>No hay ventas registradas hoy.</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = ventaDelDia.tiques.slice().reverse().map(renderVentaTiqueCard).join("");
}

export function renderDeudoresModal() {
  const contenedor = document.getElementById("deudores-lista");
  if (!contenedor) return;

  const deudores = getDeudores();

  if (deudores.length === 0) {
    contenedor.innerHTML = `<p class="texto-vacio">No hay caseras con saldo pendiente. 🎉</p>`;
    return;
  }

  contenedor.innerHTML = deudores
    .map(
      (d) => `
      <div class="deudor-card">
        <div class="deudor-header">
          <span class="deudor-nombre"><i class="fa-solid fa-user"></i> ${d.nombre}</span>
          <span class="deudor-saldo">${formatearMoneda(d.saldoTotal)}</span>
        </div>
        <div class="deudor-tiques">
          ${d.tiques
            .map(
              (t) => `
              <div class="deudor-tique-fila">
                <span>#${t.id.toString().padStart(3, "0")} · ${t.fecha}</span>
                <span>${formatearMoneda(t.saldoACuenta)}</span>
                <div class="deudor-tique-acciones">
                  <button class="btn-secondary btn-sm" data-action="pagar-venta" data-id="${t.id}" title="Registrar pago">
                    <i class="fa-solid fa-hand-holding-dollar"></i>
                  </button>
                  <button class="btn-secondary btn-sm" data-action="pdf-venta" data-id="${t.id}" title="Descargar PDF de este tique">
                    <i class="fa-solid fa-file-pdf"></i>
                  </button>
                </div>
              </div>`
            )
            .join("")}
          ${d.tiques.length > 1 ? `
          <button class="btn-secondary btn-sm btn-estado-cuenta" data-action="estado-cuenta" data-nombre="${d.nombre}">
            <i class="fa-solid fa-file-invoice"></i> Estado de Cuenta (${d.tiques.length} tiques)
          </button>` : ""}
        </div>
      </div>`
    )
    .join("");
}

let tiqueEnEdicionId = null;

function refsFormularioEdicion() {
  return {
    contenedor: document.getElementById("edit-venta-items-container"),
    inputCasera: document.getElementById("edit-venta-casera-nombre"),
    inputPasaje: document.getElementById("edit-venta-pasaje"),
    inputDeuda: document.getElementById("edit-venta-deuda-anterior"),
    inputDescuento: document.getElementById("edit-venta-descuento"),
    inputDescuentoConcepto: document.getElementById("edit-venta-descuento-concepto"),
    inputPagado: document.getElementById("edit-venta-monto-pagado"),
    spanTotal: document.getElementById("edit-venta-total-preview"),
    spanSaldo: document.getElementById("edit-venta-saldo-preview")
  };
}

function abrirEdicionVenta(tiqueId) {
  const tique = buscarTiqueVentaPorId(tiqueId);
  if (!tique) return;

  tiqueEnEdicionId = tiqueId;
  const refs = refsFormularioEdicion();
  const onTotales = () => actualizarTotales(refs);

  refs.inputCasera.value = tique.casera;
  refs.inputPasaje.value = tique.pasaje || 0;
  refs.inputDeuda.value = tique.deudaAnterior || 0;
  refs.inputDescuento.value = tique.descuento || 0;
  refs.inputDescuentoConcepto.value = tique.descuentoConcepto || "";
  refs.inputPagado.value = tique.montoPagado || 0;

  refs.contenedor.innerHTML = "";
  tique.items.forEach((item) => agregarFilaVenta(refs.contenedor, refs.inputCasera, onTotales, item));

  onTotales();
  abrirModal("modal-editar-venta");
}

function guardarEdicionVenta(onChange) {
  if (tiqueEnEdicionId === null) return;
  const refs = refsFormularioEdicion();

  const casera = refs.inputCasera.value.trim();
  if (!casera) {
    alert("Ingrese el nombre de la casera.");
    return;
  }

  const items = leerItemsOAvisar(refs.contenedor);
  if (!items) return;

  actualizarTiqueVenta(tiqueEnEdicionId, {
    casera,
    items,
    pasaje: parseFloat(refs.inputPasaje.value) || 0,
    deudaAnterior: parseFloat(refs.inputDeuda.value) || 0,
    descuento: parseFloat(refs.inputDescuento.value) || 0,
    descuentoConcepto: refs.inputDescuentoConcepto.value,
    montoPagado: parseFloat(refs.inputPagado.value) || 0
  });

  tiqueEnEdicionId = null;
  cerrarModal("modal-editar-venta");
  onChange();
}

function manejarAccionVenta(evento, onChange) {
  const boton = evento.target.closest("[data-action]");
  if (!boton) return;

  if (boton.dataset.action === "estado-cuenta") {
    descargarEstadoCuentaPDF(boton.dataset.nombre);
    return;
  }

  if (boton.dataset.action === "editar-venta") {
    abrirEdicionVenta(Number(boton.dataset.id));
    return;
  }

  const id = Number(boton.dataset.id);

  switch (boton.dataset.action) {
    case "pagar-venta": {
      const tique = buscarTiqueVentaPorId(id);
      if (!tique) return;
      const monto = prompt(
        `Registrar pago de ${tique.casera} (queda: ${formatearMoneda(tique.saldoACuenta)}):`,
        tique.saldoACuenta.toFixed(2)
      );
      if (monto === null) return;
      const valor = parseFloat(monto);
      if (isNaN(valor) || valor <= 0) {
        alert("Ingrese un monto válido mayor a 0.");
        return;
      }
      registrarPagoVenta(id, valor);
      onChange();
      break;
    }
    case "pdf-venta":
      descargarTiqueVentaPDF(id);
      break;
    case "whatsapp-venta":
      compartirTiqueVentaPDF(id);
      break;
    case "escuchar-venta": {
      const tique = buscarTiqueVentaPorId(id);
      if (tique) leerTexto(construirTextoVentaTique(tique), boton);
      break;
    }
    case "eliminar-venta":
      if (confirm("¿Eliminar esta venta? Esta acción no se puede deshacer.")) {
        eliminarTiqueVenta(id);
        onChange();
      }
      break;
  }
}

export function configurarVentaDia(onChange) {
  document.querySelectorAll(".subvista-tab").forEach((tab) => {
    tab.addEventListener("click", () => activarSubvista(tab.dataset.subvista));
  });

  const contenedorVenta = document.getElementById("venta-items-container");
  const formVenta = document.getElementById("form-venta-dia");
  const inputCasera = document.getElementById("venta-casera-nombre");

  const refsFormNuevo = {
    contenedor: contenedorVenta,
    inputPasaje: document.getElementById("venta-pasaje"),
    inputDeuda: document.getElementById("venta-deuda-anterior"),
    inputDescuento: document.getElementById("venta-descuento"),
    inputDescuentoConcepto: document.getElementById("venta-descuento-concepto"),
    inputPagado: document.getElementById("venta-monto-pagado"),
    spanTotal: document.getElementById("venta-total-preview"),
    spanSaldo: document.getElementById("venta-saldo-preview")
  };
  const onTotalesFormNuevo = () => actualizarTotales(refsFormNuevo);

  const alCambiarCasera = conectarFilasVenta(contenedorVenta, inputCasera, onTotalesFormNuevo);

  document.getElementById("btn-add-venta-row").addEventListener("click", () => {
    agregarFilaVenta(contenedorVenta, inputCasera, onTotalesFormNuevo);
  });

  inputCasera.addEventListener("input", alCambiarCasera);

  inputCasera.addEventListener("change", () => {
    const textoAyuda = document.getElementById("venta-deuda-sugerida");
    const casera = inputCasera.value.trim();

    if (!casera) {
      textoAyuda.textContent = "";
      refsFormNuevo.inputDeuda.dataset.origenIds = "[]";
      return;
    }

    const { monto, origenIds } = sugerirDeudaAnterior(casera);
    refsFormNuevo.inputDeuda.dataset.origenIds = JSON.stringify(origenIds);

    if (monto > 0) {
      refsFormNuevo.inputDeuda.value = monto.toFixed(2);
      textoAyuda.textContent = `${casera} tiene ${formatearMoneda(monto)} pendiente de antes (editable).`;
    } else {
      textoAyuda.textContent = "";
    }

    onTotalesFormNuevo();
  });

  [refsFormNuevo.inputPasaje, refsFormNuevo.inputDeuda, refsFormNuevo.inputDescuento, refsFormNuevo.inputPagado].forEach((input) => {
    input.addEventListener("input", onTotalesFormNuevo);
  });

  formVenta.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const casera = inputCasera.value.trim();
    if (!casera) {
      alert("Ingrese el nombre de la casera.");
      return;
    }

    const items = leerItemsOAvisar(contenedorVenta);
    if (!items) return;

    let origenIds = [];
    try {
      origenIds = JSON.parse(refsFormNuevo.inputDeuda.dataset.origenIds || "[]");
    } catch (e) {
      origenIds = [];
    }

    crearTiqueVenta({
      casera,
      items,
      pasaje: parseFloat(refsFormNuevo.inputPasaje.value) || 0,
      deudaAnterior: parseFloat(refsFormNuevo.inputDeuda.value) || 0,
      descuento: parseFloat(refsFormNuevo.inputDescuento.value) || 0,
      descuentoConcepto: refsFormNuevo.inputDescuentoConcepto.value,
      deudaAnteriorOrigenIds: origenIds,
      montoPagado: parseFloat(refsFormNuevo.inputPagado.value) || 0
    });

    formVenta.reset();
    contenedorVenta.innerHTML = "";
    agregarFilaVenta(contenedorVenta, inputCasera, onTotalesFormNuevo);
    document.getElementById("venta-deuda-sugerida").textContent = "";
    refsFormNuevo.spanSaldo.textContent = formatearMoneda(0);

    onChange();
  });

  agregarFilaVenta(contenedorVenta, inputCasera, onTotalesFormNuevo);

  const refsEdicion = refsFormularioEdicion();
  const onTotalesEdicion = () => actualizarTotales(refsEdicion);

  conectarFilasVenta(refsEdicion.contenedor, refsEdicion.inputCasera, onTotalesEdicion);

  document.getElementById("btn-add-edit-venta-row").addEventListener("click", () => {
    agregarFilaVenta(refsEdicion.contenedor, refsEdicion.inputCasera, onTotalesEdicion);
  });

  [refsEdicion.inputPasaje, refsEdicion.inputDeuda, refsEdicion.inputDescuento, refsEdicion.inputPagado].forEach((input) => {
    input.addEventListener("input", onTotalesEdicion);
  });

  document.getElementById("form-editar-venta").addEventListener("submit", (evento) => {
    evento.preventDefault();
    guardarEdicionVenta(onChange);
  });

  document.getElementById("btn-cancelar-edicion-venta").addEventListener("click", () => {
    tiqueEnEdicionId = null;
    cerrarModal("modal-editar-venta");
  });

  document.getElementById("modal-editar-venta").addEventListener("click", (evento) => {
    if (evento.target.id === "modal-editar-venta") {
      tiqueEnEdicionId = null;
      cerrarModal("modal-editar-venta");
    }
  });

  document.getElementById("venta-tickets-grid").addEventListener("click", (evento) => manejarAccionVenta(evento, onChange));
  document.getElementById("deudores-lista").addEventListener("click", (evento) => manejarAccionVenta(evento, onChange));

  document.getElementById("btn-abrir-deudores").addEventListener("click", () => {
    renderDeudoresModal();
    abrirModal("modal-deudores");
  });
  document.getElementById("btn-cerrar-modal-deudores").addEventListener("click", () => cerrarModal("modal-deudores"));
  document.getElementById("modal-deudores").addEventListener("click", (evento) => {
    if (evento.target.id === "modal-deudores") cerrarModal("modal-deudores");
  });

  document.getElementById("btn-cerrar-venta-dia").addEventListener("click", () => {
    const ventaDelDia = getVentaDelDia();
    const pendientes = ventaDelDia.tiques.filter((t) => t.saldoACuenta > 0).length;

    let mensaje = "¿Cerrar la Venta del Día? Se archivará el tablero para empezar uno nuevo.";
    if (pendientes > 0) {
      mensaje += `\n\n⚠ Hay ${pendientes} venta(s) con saldo pendiente. Seguirán apareciendo en "Deudores" hasta que se cobren.`;
    }
    if (!confirm(mensaje)) return;

    if (!cerrarVentaDelDia()) {
      alert("No hay ventas registradas para cerrar.");
      return;
    }
    onChange();
    alert("Venta del Día cerrada y archivada correctamente.");
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key !== "Escape") return;
    if (document.getElementById("modal-deudores").classList.contains("abierto")) cerrarModal("modal-deudores");
    if (document.getElementById("modal-editar-venta").classList.contains("abierto")) {
      tiqueEnEdicionId = null;
      cerrarModal("modal-editar-venta");
    }
  });
}
