
import { state } from '../state.js';
import { formatearMoneda, campoVozHTML, generarId } from '../utils.js';
import {
  getComprasProveedores,
  crearCompraProveedor,
  registrarPagoProveedor,
  eliminarCompraProveedor,
  cerrarComprasDelDia,
  getProveedoresConSaldo,
  buscarCompraPorId
} from '../comprasProveedores.js';
import { descargarCompraPDF } from '../pdfVentaDia.js';

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

function filaCompraHTML() {
  return `
    <div class="compra-item-row">
      <select class="cp-prod" required>${construirOpcionesProducto()}</select>
      ${campoVozHTML({
        tipo: "number", clase: "cp-cantidad", placeholder: "Cant./Kilos",
        attrs: 'min="0.1" step="0.1" required', modoVoz: "numero", ariaLabel: "Dictar cantidad por voz"
      })}
      ${campoVozHTML({
        tipo: "number", clase: "cp-precio", placeholder: "Precio x kg/u",
        attrs: 'min="0" step="0.10" required', modoVoz: "numero", ariaLabel: "Dictar precio por voz"
      })}
      <span class="subtotal-item-linea">S/ 0.00</span>
      <button type="button" class="btn-remove-row" data-action="quitar-fila-compra">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `;
}

function actualizarFilaCompra(fila) {
  const cantidad = parseFloat(fila.querySelector(".cp-cantidad").value) || 0;
  const precio = parseFloat(fila.querySelector(".cp-precio").value) || 0;
  const subtotal = cantidad * precio;

  fila.dataset.subtotal = subtotal;
  fila.querySelector(".subtotal-item-linea").textContent = formatearMoneda(subtotal);

  actualizarTotalesCompra();
}

function agregarFilaCompra() {
  const contenedor = document.getElementById("compra-items-container");
  if (!contenedor) return;
  contenedor.insertAdjacentHTML("beforeend", filaCompraHTML());
  actualizarFilaCompra(contenedor.lastElementChild);
}

function actualizarTotalesCompra() {
  let total = 0;
  document.querySelectorAll(".compra-item-row").forEach((fila) => {
    total += parseFloat(fila.dataset.subtotal) || 0;
  });

  document.getElementById("compra-total-preview").textContent = formatearMoneda(total);

  const adelanto = Math.min(parseFloat(document.getElementById("compra-adelanto").value) || 0, total);
  const saldo = Math.max(0, total - adelanto);

  const spanSaldo = document.getElementById("compra-saldo-preview");
  spanSaldo.textContent = formatearMoneda(saldo);
  spanSaldo.classList.toggle("saldo-pendiente", saldo > 0);
}

function recolectarItemsCompra() {
  const items = [];

  document.querySelectorAll(".compra-item-row").forEach((fila) => {
    const prod = fila.querySelector(".cp-prod").value;
    const productoInfo = state.productos.find((p) => p.nombre === prod);
    const modo = productoInfo ? productoInfo.tipoPrecio : "unidad";
    const cantidad = parseFloat(fila.querySelector(".cp-cantidad").value) || 0;
    const precioUnitario = parseFloat(fila.querySelector(".cp-precio").value) || 0;
    const subtotal = parseFloat(fila.dataset.subtotal) || 0;

    if (cantidad > 0 && precioUnitario > 0) {
      items.push({ id: generarId(), prod, modo, cantidad, precioUnitario, subtotal });
    }
  });

  return items;
}

function renderCompraCard(compra) {
  const itemsHtml = compra.items
    .map(
      (it) => `
      <div class="ticket-item">
        <div>
          <span class="item-qty">${it.cantidad} ${it.modo === "kilo" ? "kg" : "u"}</span>
          <span>${it.prod.toUpperCase()}</span>
        </div>
        <span class="ticket-item-subtotal">${formatearMoneda(it.subtotal)}</span>
      </div>`
    )
    .join("");

  const badge = compra.saldoPorPagar > 0
    ? `<span class="status-badge status-bad">DEBE ${formatearMoneda(compra.saldoPorPagar)}</span>`
    : `<span class="status-badge status-ok">PAGADO</span>`;

  return `
    <div class="kfc-ticket ${compra.saldoPorPagar === 0 ? "ticket-despachado" : ""}">
      <div class="ticket-top">
        <div class="ticket-number">
          <span>COMPRA #${compra.id.toString().padStart(3, "0")}</span>
          <span class="ticket-time">${compra.hora}</span>
        </div>
        <div class="ticket-customer"><i class="fa-solid fa-truck"></i> ${compra.proveedor}</div>
      </div>
      <div class="ticket-body">${itemsHtml}</div>
      <div class="ticket-total-linea">
        <span>Total</span>
        <strong>${formatearMoneda(compra.total)}</strong>
      </div>
      <div class="ticket-total-linea">
        <span>Adelanto</span>
        <strong>${formatearMoneda(compra.adelanto)}</strong>
      </div>
      <div class="ticket-footer">
        <div class="ticket-footer-top">${badge}</div>
        <div class="ticket-footer-secundario">
          ${compra.saldoPorPagar > 0 ? `<button class="btn-secondary btn-sm" data-action="pagar-compra" data-id="${compra.id}"><i class="fa-solid fa-hand-holding-dollar"></i> Pago</button>` : ""}
          <button class="btn-secondary btn-sm" data-action="pdf-compra" data-id="${compra.id}"><i class="fa-solid fa-file-pdf"></i> PDF</button>
          <button class="btn-secondary btn-sm" data-action="eliminar-compra" data-id="${compra.id}"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>
    </div>
  `;
}

export function renderCompras() {
  const contenedor = document.getElementById("compra-tickets-grid");
  if (!contenedor) return;

  const comprasProveedores = getComprasProveedores();

  if (comprasProveedores.compras.length === 0) {
    contenedor.innerHTML = `
      <div class="estado-vacio-tickets">
        <i class="fa-solid fa-truck-fast"></i>
        <p>No hay compras registradas hoy.</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = comprasProveedores.compras.slice().reverse().map(renderCompraCard).join("");
}

export function renderProveedoresModal() {
  const contenedor = document.getElementById("proveedores-lista");
  if (!contenedor) return;

  const proveedores = getProveedoresConSaldo();

  if (proveedores.length === 0) {
    contenedor.innerHTML = `<p class="texto-vacio">No hay saldos pendientes con proveedores. 🎉</p>`;
    return;
  }

  contenedor.innerHTML = proveedores
    .map(
      (p) => `
      <div class="deudor-card">
        <div class="deudor-header">
          <span class="deudor-nombre"><i class="fa-solid fa-truck"></i> ${p.nombre}</span>
          <span class="deudor-saldo">${formatearMoneda(p.saldoTotal)}</span>
        </div>
        <div class="deudor-tiques">
          ${p.compras
            .map(
              (c) => `
              <div class="deudor-tique-fila">
                <span>#${c.id.toString().padStart(3, "0")} · ${c.fecha}</span>
                <span>${formatearMoneda(c.saldoPorPagar)}</span>
                <div class="deudor-tique-acciones">
                  <button class="btn-secondary btn-sm" data-action="pagar-compra" data-id="${c.id}" title="Registrar pago">
                    <i class="fa-solid fa-hand-holding-dollar"></i>
                  </button>
                  <button class="btn-secondary btn-sm" data-action="pdf-compra" data-id="${c.id}" title="Descargar PDF">
                    <i class="fa-solid fa-file-pdf"></i>
                  </button>
                </div>
              </div>`
            )
            .join("")}
        </div>
      </div>`
    )
    .join("");
}

function manejarAccionCompra(evento, onChange) {
  const boton = evento.target.closest("[data-action]");
  if (!boton) return;
  const id = Number(boton.dataset.id);

  switch (boton.dataset.action) {
    case "pagar-compra": {
      const compra = buscarCompraPorId(id);
      if (!compra) return;
      const monto = prompt(
        `Registrar pago a ${compra.proveedor} (queda: ${formatearMoneda(compra.saldoPorPagar)}):`,
        compra.saldoPorPagar.toFixed(2)
      );
      if (monto === null) return;
      const valor = parseFloat(monto);
      if (isNaN(valor) || valor <= 0) {
        alert("Ingrese un monto válido mayor a 0.");
        return;
      }
      registrarPagoProveedor(id, valor);
      onChange();
      break;
    }
    case "pdf-compra":
      descargarCompraPDF(id);
      break;
    case "eliminar-compra":
      if (confirm("¿Eliminar esta compra? Esta acción no se puede deshacer.")) {
        eliminarCompraProveedor(id);
        onChange();
      }
      break;
  }
}

export function configurarCompras(onChange) {
  const contenedorCompra = document.getElementById("compra-items-container");
  const formCompra = document.getElementById("form-compra-proveedor");

  document.getElementById("btn-add-compra-row").addEventListener("click", agregarFilaCompra);

  contenedorCompra.addEventListener("click", (evento) => {
    const botonQuitar = evento.target.closest('[data-action="quitar-fila-compra"]');
    if (!botonQuitar) return;
    if (document.querySelectorAll(".compra-item-row").length > 1) {
      botonQuitar.closest(".compra-item-row").remove();
      actualizarTotalesCompra();
    }
  });

  contenedorCompra.addEventListener("input", (evento) => {
    const fila = evento.target.closest(".compra-item-row");
    if (fila) actualizarFilaCompra(fila);
  });

  contenedorCompra.addEventListener("change", (evento) => {
    const fila = evento.target.closest(".compra-item-row");
    if (fila) actualizarFilaCompra(fila);
  });

  document.getElementById("compra-adelanto").addEventListener("input", actualizarTotalesCompra);

  formCompra.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const proveedor = document.getElementById("compra-proveedor-nombre").value.trim();
    if (!proveedor) {
      alert("Ingrese el nombre del proveedor.");
      return;
    }

    const items = recolectarItemsCompra();
    if (items.length === 0) {
      alert("Ingrese al menos un producto con cantidad y precio mayor a 0.");
      return;
    }

    const adelanto = parseFloat(document.getElementById("compra-adelanto").value) || 0;

    crearCompraProveedor({ proveedor, items, adelanto });

    formCompra.reset();
    contenedorCompra.innerHTML = "";
    agregarFilaCompra();
    document.getElementById("compra-saldo-preview").textContent = formatearMoneda(0);

    onChange();
  });

  agregarFilaCompra();

  document.getElementById("compra-tickets-grid").addEventListener("click", (evento) => manejarAccionCompra(evento, onChange));
  document.getElementById("proveedores-lista").addEventListener("click", (evento) => manejarAccionCompra(evento, onChange));

  document.getElementById("btn-abrir-proveedores").addEventListener("click", () => {
    renderProveedoresModal();
    abrirModal("modal-proveedores");
  });
  document.getElementById("btn-cerrar-modal-proveedores").addEventListener("click", () => cerrarModal("modal-proveedores"));
  document.getElementById("modal-proveedores").addEventListener("click", (evento) => {
    if (evento.target.id === "modal-proveedores") cerrarModal("modal-proveedores");
  });

  document.getElementById("btn-cerrar-compras-dia").addEventListener("click", () => {
    const comprasProveedores = getComprasProveedores();
    const pendientes = comprasProveedores.compras.filter((c) => c.saldoPorPagar > 0).length;

    let mensaje = "¿Cerrar las Compras del Día? Se archivará la lista para empezar una nueva.";
    if (pendientes > 0) {
      mensaje += `\n\n⚠ Hay ${pendientes} compra(s) con saldo pendiente. Seguirán apareciendo en "Cuentas Proveedores" hasta que se paguen.`;
    }
    if (!confirm(mensaje)) return;

    if (!cerrarComprasDelDia()) {
      alert("No hay compras registradas para cerrar.");
      return;
    }
    onChange();
    alert("Compras del Día cerradas y archivadas correctamente.");
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && document.getElementById("modal-proveedores").classList.contains("abierto")) {
      cerrarModal("modal-proveedores");
    }
  });
}
