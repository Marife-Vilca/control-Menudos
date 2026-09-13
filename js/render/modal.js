// =============================================================
// COMPONENTE: Modal de edición de pedidos
// =============================================================
import { state, getCicloActual, getPrecioProducto, setPrecioEspecial } from '../state.js';
import { formatearMoneda, campoVozHTML } from '../utils.js';

let pedidoEditandoId = null;
let alGuardarCambios = () => {};

function construirOpcionesProducto(productoSeleccionado) {
  return state.productos
    .map((p) => {
      const seleccionado = p.nombre === productoSeleccionado ? "selected" : "";
      return `<option value="${p.nombre}" ${seleccionado}>${p.nombre.toUpperCase()}</option>`;
    })
    .join("");
}

function getCaseraEnEdicion() {
  return document.getElementById("edit-casera-nombre").value.trim();
}

function filaEdicionHTML(prod = "", tipo = "vaca", cantidad = 1, peso = null) {
  const productoInfo = state.productos.find((p) => p.nombre === prod) || state.productos[0];
  const esKilo = productoInfo && productoInfo.tipoPrecio === "kilo";

  return `
    <div class="modal-item-fila">
      <div class="campo-flex-2">
        <label>Producto</label>
        <select class="ped-prod" required>${construirOpcionesProducto(prod || (productoInfo && productoInfo.nombre))}</select>
      </div>
      <div class="campo-flex-1">
        <label>Origen</label>
        <select class="ped-tipo" required>
          <option value="vaca" ${tipo === "vaca" ? "selected" : ""}>Vaca</option>
          <option value="toro" ${tipo === "toro" ? "selected" : ""}>Toro</option>
        </select>
      </div>
      <div class="campo-cantidad">
        <label>Cantidad</label>
        ${campoVozHTML({
          tipo: "number", clase: "ped-cant-entera", attrs: 'min="1" step="1" required',
          valor: cantidad, modoVoz: "numero", ariaLabel: "Dictar cantidad por voz"
        })}
      </div>
      <div class="campo-cantidad campo-peso-modal" style="display:${esKilo ? "flex" : "none"}">
        <label>Peso (kg)</label>
        <input type="number" class="ped-peso" min="0.1" step="0.1" value="${peso || ""}">
      </div>
      <div class="campo-cantidad">
        <label>Precio</label>
        <div class="precio-item-info">
          <span class="precio-item-unitario">S/ 0.00</span>
          <button type="button" class="btn-editar-precio-item" title="Cambiar precio para esta casera">
            <i class="fa-solid fa-pen"></i>
          </button>
        </div>
      </div>
      <span class="subtotal-item-linea">S/ 0.00</span>
      <button type="button" class="btn-eliminar-item-modal" data-action="quitar-fila-edicion" title="Eliminar producto">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `;
}

function actualizarFila(fila) {
  const prod = fila.querySelector(".ped-prod").value;
  const productoInfo = state.productos.find((p) => p.nombre === prod);
  const esKilo = productoInfo && productoInfo.tipoPrecio === "kilo";

  const inputCantidad = fila.querySelector(".ped-cant-entera");
  const inputPeso = fila.querySelector(".ped-peso");
  fila.querySelector(".campo-peso-modal").style.display = esKilo ? "flex" : "none";

  const casera = getCaseraEnEdicion();
  const precioUnitario = getPrecioProducto(casera, prod);
  const cant = parseFloat(inputCantidad.value) || 0;
  const peso = esKilo ? (parseFloat(inputPeso.value) || 0) : null;
  const subtotal = esKilo ? precioUnitario * peso : precioUnitario * cant;

  fila.dataset.precioUnitario = precioUnitario;
  fila.dataset.subtotal = subtotal;

  const unidad = esKilo ? "/kg" : "/u";
  fila.querySelector(".precio-item-unitario").textContent = `${formatearMoneda(precioUnitario)}${unidad}`;
  fila.querySelector(".subtotal-item-linea").textContent = formatearMoneda(subtotal);

  actualizarTotalModal();
}

function actualizarTodasLasFilas() {
  document.querySelectorAll("#edit-pedido-items-container .modal-item-fila").forEach(actualizarFila);
}

function actualizarTotalModal() {
  const totalSpan = document.getElementById("modal-total-preview");
  if (!totalSpan) return;
  let total = 0;
  document.querySelectorAll("#edit-pedido-items-container .modal-item-fila").forEach((fila) => {
    total += parseFloat(fila.dataset.subtotal) || 0;
  });
  totalSpan.textContent = formatearMoneda(total);
}

function agregarFilaEdicion(prod = "", tipo = "vaca", cantidad = 1, peso = null) {
  const contenedor = document.getElementById("edit-pedido-items-container");
  if (!contenedor) return;
  contenedor.insertAdjacentHTML("beforeend", filaEdicionHTML(prod, tipo, cantidad, peso));
  actualizarFila(contenedor.lastElementChild);
}

export function abrirModalEditarPedido(pedidoId) {
  const ciclo = getCicloActual();
  const pedido = ciclo.pedidos.find((p) => p.id === pedidoId);
  if (!pedido) return;

  pedidoEditandoId = pedidoId;

  document.getElementById("edit-casera-nombre").value = pedido.casera;

  const contenedor = document.getElementById("edit-pedido-items-container");
  contenedor.innerHTML = "";
  pedido.items.forEach((item) => agregarFilaEdicion(item.prod, item.tipo, item.cant, item.peso));

  document.getElementById("modal-editar-pedido").classList.add("abierto");
}

function cerrarModal() {
  document.getElementById("modal-editar-pedido").classList.remove("abierto");
  pedidoEditandoId = null;
}

function pedirPrecioEspecial(fila) {
  const casera = getCaseraEnEdicion();
  if (!casera) {
    alert("Escriba primero el nombre de la casera.");
    return;
  }

  const prod = fila.querySelector(".ped-prod").value;
  const precioActual = fila.dataset.precioUnitario || 0;
  const nuevoPrecio = prompt(`Nuevo precio para "${casera}" en ${prod.toUpperCase()}:`, precioActual);
  if (nuevoPrecio === null) return;

  const valor = parseFloat(nuevoPrecio);
  if (isNaN(valor) || valor <= 0) {
    alert("Ingrese un precio válido mayor a 0.");
    return;
  }

  setPrecioEspecial(casera, prod, valor);
  actualizarFila(fila);
}

function guardarEdicion() {
  if (pedidoEditandoId === null) return;

  const ciclo = getCicloActual();
  const pedido = ciclo.pedidos.find((p) => p.id === pedidoEditandoId);
  if (!pedido) return;

  const nuevaCasera = document.getElementById("edit-casera-nombre").value.trim();
  if (!nuevaCasera) {
    alert("El nombre de la casera no puede estar vacío.");
    return;
  }

  const nuevosItems = [];
  document.querySelectorAll("#edit-pedido-items-container .modal-item-fila").forEach((fila) => {
    const prod = fila.querySelector(".ped-prod").value;
    const tipo = fila.querySelector(".ped-tipo").value;
    const cant = parseInt(fila.querySelector(".ped-cant-entera").value, 10) || 0;
    const productoInfo = state.productos.find((p) => p.nombre === prod);
    const esKilo = productoInfo && productoInfo.tipoPrecio === "kilo";
    const peso = esKilo ? (parseFloat(fila.querySelector(".ped-peso").value) || 0) : null;
    const precioUnitario = parseFloat(fila.dataset.precioUnitario) || 0;
    const subtotal = parseFloat(fila.dataset.subtotal) || 0;

    if (cant > 0) nuevosItems.push({ prod, tipo, cant, peso, precioUnitario, subtotal });
  });

  if (nuevosItems.length === 0) {
    alert("Debe ingresar al menos un producto con cantidad mayor a 0.");
    return;
  }

  pedido.casera = nuevaCasera;
  pedido.items = nuevosItems;

  cerrarModal();
  alGuardarCambios();
}

export function configurarModal(onChange) {
  alGuardarCambios = onChange;

  document.getElementById("btn-agregar-item-modal").addEventListener("click", () => {
    agregarFilaEdicion();
  });

  document.getElementById("edit-casera-nombre").addEventListener("input", actualizarTodasLasFilas);

  const contenedor = document.getElementById("edit-pedido-items-container");

  contenedor.addEventListener("click", (evento) => {
    const botonQuitar = evento.target.closest('[data-action="quitar-fila-edicion"]');
    if (botonQuitar) {
      const filas = document.querySelectorAll("#edit-pedido-items-container .modal-item-fila");
      if (filas.length > 1) {
        botonQuitar.closest(".modal-item-fila").remove();
        actualizarTotalModal();
      } else {
        alert("El pedido debe contener al menos un producto.");
      }
      return;
    }

    const botonPrecio = evento.target.closest(".btn-editar-precio-item");
    if (botonPrecio) {
      pedirPrecioEspecial(botonPrecio.closest(".modal-item-fila"));
    }
  });

  contenedor.addEventListener("input", (evento) => {
    const fila = evento.target.closest(".modal-item-fila");
    if (fila) actualizarFila(fila);
  });

  contenedor.addEventListener("change", (evento) => {
    const fila = evento.target.closest(".modal-item-fila");
    if (fila) actualizarFila(fila);
  });

  document.getElementById("btn-cancelar-modal").addEventListener("click", cerrarModal);
  document.getElementById("btn-guardar-modal").addEventListener("click", guardarEdicion);

  document.getElementById("modal-editar-pedido").addEventListener("click", (evento) => {
    if (evento.target.id === "modal-editar-pedido") cerrarModal();
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && document.getElementById("modal-editar-pedido").classList.contains("abierto")) {
      cerrarModal();
    }
  });
}
