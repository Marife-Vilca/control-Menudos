
import { state, getPrecioProducto, setPrecioEspecial } from '../state.js';
import { formatearMoneda, campoVozHTML, generarId } from '../utils.js';
import {
  getVentaDelDia,
  crearTiqueVenta,
  actualizarTiqueVenta,
  registrarPagoVenta,
  eliminarTiqueVenta,
  cerrarVentaDelDia,
  sugerirDeudaAnterior,
  getDeudores,
  buscarTiqueVentaPorId
} from '../ventaDia.js';
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

function construirOpcionesProducto() {
  return state.productos
    .map((p) => `<option value="${p.nombre}" data-tipo-precio="${p.tipoPrecio}">${p.nombre.toUpperCase()}</option>`)
    .join("");
}

function filaVentaHTML() {
  return `
    <div class="venta-item-row">
      <div class="venta-item-row-principal">
        <select class="vd-prod" required>${construirOpcionesProducto()}</select>
        <select class="vd-modo">
          <option value="directo">Monto Directo</option>
          <option value="kilo">Por Kilo</option>
          <option value="unidad">Por Unidad</option>
        </select>
        ${campoVozHTML({
          tipo: "number", clase: "vd-peso", placeholder: "Peso (kg)",
          attrs: 'min="0.1" step="0.1"', modoVoz: "numero", ariaLabel: "Dictar peso por voz"
        })}
        ${campoVozHTML({
          tipo: "number", clase: "vd-cantidad", placeholder: "Cant.",
          attrs: 'min="1" step="1"', modoVoz: "numero", ariaLabel: "Dictar cantidad por voz"
        })}
        ${campoVozHTML({
          tipo: "number", clase: "vd-monto-directo", placeholder: "Monto S/",
          attrs: 'min="0" step="0.10"', modoVoz: "numero", ariaLabel: "Dictar monto por voz"
        })}
        <div class="precio-item-info">
          <span class="precio-item-unitario">S/ 0.00</span>
          <button type="button" class="btn-editar-precio-item" title="Cambiar precio para esta casera">
            <i class="fa-solid fa-pen"></i>
          </button>
        </div>
      </div>
      <div class="venta-item-row-final">
        <span class="subtotal-item-linea">S/ 0.00</span>
        <button type="button" class="btn-remove-row" data-action="quitar-fila-venta">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>
  `;
}

function actualizarFilaVenta(fila, inputCasera, onTotalesCambiaron) {
  const prod = fila.querySelector(".vd-prod").value;
  const modo = fila.querySelector(".vd-modo").value;

  const campoPeso = fila.querySelector(".vd-peso").closest(".campo-voz");
  const campoCantidad = fila.querySelector(".vd-cantidad").closest(".campo-voz");
  const campoMonto = fila.querySelector(".vd-monto-directo").closest(".campo-voz");
  const infoPrecio = fila.querySelector(".precio-item-info");

  campoPeso.style.display = modo === "kilo" ? "flex" : "none";
  campoCantidad.style.display = modo === "unidad" ? "flex" : "none";
  campoMonto.style.display = modo === "directo" ? "flex" : "none";
  infoPrecio.style.display = modo === "directo" ? "none" : "flex";

  const casera = inputCasera.value.trim();
  let subtotal = 0;
  let precioUnitario = 0;

  if (modo === "directo") {
    subtotal = parseFloat(fila.querySelector(".vd-monto-directo").value) || 0;
  } else {
    precioUnitario = getPrecioProducto(casera, prod);
    const cantidad = modo === "kilo"
      ? (parseFloat(fila.querySelector(".vd-peso").value) || 0)
      : (parseFloat(fila.querySelector(".vd-cantidad").value) || 0);
    subtotal = precioUnitario * cantidad;

    const unidad = modo === "kilo" ? "/kg" : "/u";
    fila.querySelector(".precio-item-unitario").textContent = `${formatearMoneda(precioUnitario)}${unidad}`;
  }

  fila.dataset.precioUnitario = precioUnitario;
  fila.dataset.subtotal = subtotal;
  fila.querySelector(".subtotal-item-linea").textContent = formatearMoneda(subtotal);

  onTotalesCambiaron();
}

function agregarFilaVenta(contenedor, inputCasera, onTotalesCambiaron, datosIniciales) {
  contenedor.insertAdjacentHTML("beforeend", filaVentaHTML());
  const fila = contenedor.lastElementChild;

  if (datosIniciales) {
    fila.querySelector(".vd-prod").value = datosIniciales.prod;
    fila.querySelector(".vd-modo").value = datosIniciales.modo;
    if (datosIniciales.modo === "kilo") fila.querySelector(".vd-peso").value = datosIniciales.peso;
    if (datosIniciales.modo === "unidad") fila.querySelector(".vd-cantidad").value = datosIniciales.cantidad;
    if (datosIniciales.modo === "directo") fila.querySelector(".vd-monto-directo").value = datosIniciales.montoDirecto;
  }

  fila.querySelector(".vd-prod").addEventListener("change", () => actualizarFilaVenta(fila, inputCasera, onTotalesCambiaron));
  actualizarFilaVenta(fila, inputCasera, onTotalesCambiaron);
}

function pedirPrecioEspecialVenta(fila, inputCasera, onTotalesCambiaron) {
  const casera = inputCasera.value.trim();
  if (!casera) {
    alert("Escriba primero el nombre de la casera.");
    return;
  }

  const prod = fila.querySelector(".vd-prod").value;
  const precioActual = fila.dataset.precioUnitario || 0;
  const nuevoPrecio = prompt(`Nuevo precio para "${casera}" en ${prod.toUpperCase()}:`, precioActual);
  if (nuevoPrecio === null) return;

  const valor = parseFloat(nuevoPrecio);
  if (isNaN(valor) || valor <= 0) {
    alert("Ingrese un precio válido mayor a 0.");
    return;
  }

  setPrecioEspecial(casera, prod, valor);
  actualizarFilaVenta(fila, inputCasera, onTotalesCambiaron);
}

function recolectarItemsVenta(contenedor) {
  const items = [];

  contenedor.querySelectorAll(".venta-item-row").forEach((fila) => {
    const prod = fila.querySelector(".vd-prod").value;
    const modo = fila.querySelector(".vd-modo").value;
    const subtotal = parseFloat(fila.dataset.subtotal) || 0;
    const precioUnitario = parseFloat(fila.dataset.precioUnitario) || 0;

    if (subtotal <= 0) return;

    const item = { id: generarId(), prod, modo, subtotal };

    if (modo === "kilo") {
      item.peso = parseFloat(fila.querySelector(".vd-peso").value) || 0;
      item.precioUnitario = precioUnitario;
    } else if (modo === "unidad") {
      item.cantidad = parseFloat(fila.querySelector(".vd-cantidad").value) || 0;
      item.precioUnitario = precioUnitario;
    } else {
      item.montoDirecto = parseFloat(fila.querySelector(".vd-monto-directo").value) || 0;
    }

    items.push(item);
  });

  return items;
}

function actualizarTotales({ contenedor, inputPasaje, inputDeuda, inputPagado, spanTotal, spanSaldo }) {
  let totalItems = 0;
  contenedor.querySelectorAll(".venta-item-row").forEach((fila) => {
    totalItems += parseFloat(fila.dataset.subtotal) || 0;
  });

  const pasaje = parseFloat(inputPasaje.value) || 0;
  const deudaAnterior = parseFloat(inputDeuda.value) || 0;
  const totalCuenta = totalItems + pasaje + deudaAnterior;

  spanTotal.textContent = formatearMoneda(totalCuenta);

  const pagado = Math.min(parseFloat(inputPagado.value) || 0, totalCuenta);
  const saldo = Math.max(0, totalCuenta - pagado);

  spanSaldo.textContent = formatearMoneda(saldo);
  spanSaldo.classList.toggle("saldo-pendiente", saldo > 0);
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

  const items = recolectarItemsVenta(refs.contenedor);
  if (items.length === 0) {
    alert("Ingrese al menos un producto con monto mayor a 0.");
    return;
  }

  actualizarTiqueVenta(tiqueEnEdicionId, {
    casera,
    items,
    pasaje: parseFloat(refs.inputPasaje.value) || 0,
    deudaAnterior: parseFloat(refs.inputDeuda.value) || 0,
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
    inputPagado: document.getElementById("venta-monto-pagado"),
    spanTotal: document.getElementById("venta-total-preview"),
    spanSaldo: document.getElementById("venta-saldo-preview")
  };
  const onTotalesFormNuevo = () => actualizarTotales(refsFormNuevo);

  document.getElementById("btn-add-venta-row").addEventListener("click", () => {
    agregarFilaVenta(contenedorVenta, inputCasera, onTotalesFormNuevo);
  });

  inputCasera.addEventListener("input", () => {
    contenedorVenta.querySelectorAll(".venta-item-row").forEach((fila) => actualizarFilaVenta(fila, inputCasera, onTotalesFormNuevo));
  });

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

  contenedorVenta.addEventListener("click", (evento) => {
    const botonQuitar = evento.target.closest('[data-action="quitar-fila-venta"]');
    if (botonQuitar) {
      if (contenedorVenta.querySelectorAll(".venta-item-row").length > 1) {
        botonQuitar.closest(".venta-item-row").remove();
        onTotalesFormNuevo();
      }
      return;
    }

    const botonPrecio = evento.target.closest(".btn-editar-precio-item");
    if (botonPrecio) pedirPrecioEspecialVenta(botonPrecio.closest(".venta-item-row"), inputCasera, onTotalesFormNuevo);
  });

  contenedorVenta.addEventListener("input", (evento) => {
    const fila = evento.target.closest(".venta-item-row");
    if (fila) actualizarFilaVenta(fila, inputCasera, onTotalesFormNuevo);
  });

  contenedorVenta.addEventListener("change", (evento) => {
    const fila = evento.target.closest(".venta-item-row");
    if (fila) actualizarFilaVenta(fila, inputCasera, onTotalesFormNuevo);
  });

  [refsFormNuevo.inputPasaje, refsFormNuevo.inputDeuda, refsFormNuevo.inputPagado].forEach((input) => {
    input.addEventListener("input", onTotalesFormNuevo);
  });

  formVenta.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const casera = inputCasera.value.trim();
    if (!casera) {
      alert("Ingrese el nombre de la casera.");
      return;
    }

    const items = recolectarItemsVenta(contenedorVenta);
    if (items.length === 0) {
      alert("Ingrese al menos un producto con monto mayor a 0.");
      return;
    }

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

  document.getElementById("btn-add-edit-venta-row").addEventListener("click", () => {
    agregarFilaVenta(refsEdicion.contenedor, refsEdicion.inputCasera, onTotalesEdicion);
  });

  refsEdicion.contenedor.addEventListener("click", (evento) => {
    const botonQuitar = evento.target.closest('[data-action="quitar-fila-venta"]');
    if (botonQuitar) {
      if (refsEdicion.contenedor.querySelectorAll(".venta-item-row").length > 1) {
        botonQuitar.closest(".venta-item-row").remove();
        onTotalesEdicion();
      }
      return;
    }

    const botonPrecio = evento.target.closest(".btn-editar-precio-item");
    if (botonPrecio) pedirPrecioEspecialVenta(botonPrecio.closest(".venta-item-row"), refsEdicion.inputCasera, onTotalesEdicion);
  });

  refsEdicion.contenedor.addEventListener("input", (evento) => {
    const fila = evento.target.closest(".venta-item-row");
    if (fila) actualizarFilaVenta(fila, refsEdicion.inputCasera, onTotalesEdicion);
  });

  refsEdicion.contenedor.addEventListener("change", (evento) => {
    const fila = evento.target.closest(".venta-item-row");
    if (fila) actualizarFilaVenta(fila, refsEdicion.inputCasera, onTotalesEdicion);
  });

  [refsEdicion.inputPasaje, refsEdicion.inputDeuda, refsEdicion.inputPagado].forEach((input) => {
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
