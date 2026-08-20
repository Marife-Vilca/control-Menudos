// =============================================================
// COMPONENTE: Modal de edición de pedidos
// =============================================================
import { state, getCicloActual } from '../state.js';

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

function filaEdicionHTML(prod = "", tipo = "vaca", cantidad = 1) {
  return `
    <div class="modal-item-fila">
      <div class="campo-flex-2">
        <label>Producto</label>
        <select class="ped-prod" required>${construirOpcionesProducto(prod)}</select>
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
        <div class="campo-voz">
          <input type="number" class="ped-cant-entera" min="1" step="1" value="${cantidad}" required>
          <div class="acciones-voz">
                            <button type="button" class="btn-voz" data-modo="numero" aria-label="Dictar cantidad por voz">
            <i class="fa-solid fa-microphone"></i>
          </button>
                            <button type="button" class="btn-leer" aria-label="Escuchar lo escrito">
                                <i class="fa-solid fa-volume-high"></i>
                            </button>
                        </div>
        </div>
      </div>
      <button type="button" class="btn-eliminar-item-modal" data-action="quitar-fila-edicion" title="Eliminar producto">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `;
}

function agregarFilaEdicion(prod = "", tipo = "vaca", cantidad = 1) {
  const contenedor = document.getElementById("edit-pedido-items-container");
  if (contenedor) contenedor.insertAdjacentHTML("beforeend", filaEdicionHTML(prod, tipo, cantidad));
}

export function abrirModalEditarPedido(pedidoId) {
  const ciclo = getCicloActual();
  const pedido = ciclo.pedidos.find((p) => p.id === pedidoId);
  if (!pedido) return;

  pedidoEditandoId = pedidoId;

  document.getElementById("edit-casera-nombre").value = pedido.casera;

  const contenedor = document.getElementById("edit-pedido-items-container");
  contenedor.innerHTML = "";
  pedido.items.forEach((item) => agregarFilaEdicion(item.prod, item.tipo, item.cant));

  document.getElementById("modal-editar-pedido").classList.add("abierto");
}

function cerrarModal() {
  document.getElementById("modal-editar-pedido").classList.remove("abierto");
  pedidoEditandoId = null;
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
    if (cant > 0) nuevosItems.push({ prod, tipo, cant });
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

  document.getElementById("edit-pedido-items-container").addEventListener("click", (evento) => {
    const boton = evento.target.closest('[data-action="quitar-fila-edicion"]');
    if (!boton) return;

    const filas = document.querySelectorAll("#edit-pedido-items-container .modal-item-fila");
    if (filas.length > 1) {
      boton.closest(".modal-item-fila").remove();
    } else {
      alert("El pedido debe contener al menos un producto.");
    }
  });

  document.getElementById("btn-cancelar-modal").addEventListener("click", cerrarModal);
  document.getElementById("btn-guardar-modal").addEventListener("click", guardarEdicion);
}
