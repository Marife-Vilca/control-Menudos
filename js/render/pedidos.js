// =============================================================
// COMPONENTE: Pedido de casera (creación de tiques)
// =============================================================
import { state, getCicloActual } from '../state.js';
import { horaActual, fechaActual } from '../utils.js';

function construirOpcionesProducto() {
  return state.productos
    .map((p) => `<option value="${p.nombre}">${p.nombre.toUpperCase()}</option>`)
    .join("");
}

function filaPedidoHTML() {
  return `
    <div class="pedido-item-row">
      <select class="ped-prod" required>${construirOpcionesProducto()}</select>
      <select class="ped-tipo" required>
        <option value="vaca">Vaca</option>
        <option value="toro">Toro</option>
      </select>
      <div class="campo-voz">
        <input type="number" class="ped-cant-entera" min="1" step="1" value="1" placeholder="Cant." required>
        <div class="acciones-voz">
                            <button type="button" class="btn-voz" data-modo="numero" aria-label="Dictar cantidad por voz">
          <i class="fa-solid fa-microphone"></i>
        </button>
                            <button type="button" class="btn-leer" aria-label="Escuchar lo escrito">
                                <i class="fa-solid fa-volume-high"></i>
                            </button>
                        </div>
      </div>
      <button type="button" class="btn-remove-row" data-action="quitar-fila-pedido">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `;
}

export function agregarFilaPedido() {
  const contenedor = document.getElementById("pedido-items-container");
  if (contenedor) contenedor.insertAdjacentHTML("beforeend", filaPedidoHTML());
}

export function configurarPedidos(onChange) {
  const contenedorFilas = document.getElementById("pedido-items-container");
  const form = document.getElementById("form-pedido");

  document.getElementById("btn-add-pedido-row").addEventListener("click", () => {
    agregarFilaPedido();
  });

  contenedorFilas.addEventListener("click", (evento) => {
    const boton = evento.target.closest('[data-action="quitar-fila-pedido"]');
    if (!boton) return;
    if (document.querySelectorAll(".pedido-item-row").length > 1) {
      boton.closest(".pedido-item-row").remove();
    }
  });

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();

    if (state.diaActivo === "DOMINGO") {
      alert("Los domingos no se realizan entregas a caseras.");
      return;
    }

    const ciclo = getCicloActual();
    const casera = document.getElementById("casera-nombre").value;
    const items = [];

    document.querySelectorAll(".pedido-item-row").forEach((fila) => {
      const prod = fila.querySelector(".ped-prod").value;
      const tipo = fila.querySelector(".ped-tipo").value;
      const cant = parseInt(fila.querySelector(".ped-cant-entera").value, 10) || 0;
      if (cant > 0) items.push({ prod, tipo, cant });
    });

    if (items.length === 0) {
      alert("Por favor ingrese al menos un producto con cantidad mayor a 0.");
      return;
    }

    ciclo.pedidos.push({
      id: state.ticketCounter++,
      casera,
      hora: horaActual(),
      fecha: fechaActual(),
      items,
      despachado: false
    });

    form.reset();
    contenedorFilas.innerHTML = "";
    agregarFilaPedido();

    onChange();
  });

  agregarFilaPedido();
}
