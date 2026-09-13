
import { state, getCicloActual, getPrecioProducto, setPrecioEspecial } from '../state.js';
import { horaActual, fechaActual, hoyISO, formatearMoneda, campoVozHTML } from '../utils.js';

function construirOpcionesProducto() {
  return state.productos
    .map((p) => `<option value="${p.nombre}" data-tipo-precio="${p.tipoPrecio}">${p.nombre.toUpperCase()}</option>`)
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
      ${campoVozHTML({
        tipo: "number", clase: "ped-cant-entera", placeholder: "Cant.",
        attrs: 'min="1" step="1" required', valor: 1, modoVoz: "numero",
        ariaLabel: "Dictar cantidad por voz"
      })}
      <input type="number" class="ped-peso" min="0.1" step="0.1" placeholder="Peso (kg) - se pesa después" style="display:none">
      <div class="precio-item-info">
        <span class="precio-item-unitario">S/ 0.00</span>
        <button type="button" class="btn-editar-precio-item" title="Cambiar precio para esta casera">
          <i class="fa-solid fa-pen"></i>
        </button>
      </div>
      <span class="subtotal-item-linea">S/ 0.00</span>
      <button type="button" class="btn-remove-row" data-action="quitar-fila-pedido">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `;
}

function getCaseraActual() {
  return document.getElementById("casera-nombre").value.trim();
}

function totalReservadoEnFormulario(prod, tipo, filaExcluir) {
  let total = 0;
  document.querySelectorAll(".pedido-item-row").forEach((fila) => {
    if (fila === filaExcluir) return;
    if (fila.querySelector(".ped-prod").value === prod && fila.querySelector(".ped-tipo").value === tipo) {
      total += parseInt(fila.querySelector(".ped-cant-entera").value, 10) || 0;
    }
  });
  return total;
}

function validarStockDisponible(items) {
  const ciclo = getCicloActual();
  const requerido = {};

  items.forEach(({ prod, tipo, cant }) => {
    const clave = `${prod}|${tipo}`;
    requerido[clave] = (requerido[clave] || 0) + cant;
  });

  for (const clave of Object.keys(requerido)) {
    const [prod, tipo] = clave.split("|");
    const disponible = ciclo.stock[prod] ? ciclo.stock[prod][tipo] : 0;
    if (requerido[clave] > disponible) {
      return {
        ok: false,
        mensaje: `No se puede crear el pedido: no hay stock suficiente de ${prod.toUpperCase()} (${tipo}).\nDisponible: ${disponible} · Solicitado: ${requerido[clave]}.`
      };
    }
  }

  return { ok: true };
}

function actualizarFila(fila) {
  const prod = fila.querySelector(".ped-prod").value;
  const productoInfo = state.productos.find((p) => p.nombre === prod);
  const esKilo = productoInfo && productoInfo.tipoPrecio === "kilo";

  const inputCantidad = fila.querySelector(".ped-cant-entera");
  const inputPeso = fila.querySelector(".ped-peso");
  inputPeso.style.display = esKilo ? "block" : "none";

  const casera = getCaseraActual();
  const precioUnitario = getPrecioProducto(casera, prod);
  const cant = parseFloat(inputCantidad.value) || 0;
  const peso = esKilo ? (parseFloat(inputPeso.value) || 0) : null;
  const subtotal = esKilo ? precioUnitario * peso : precioUnitario * cant;

  fila.dataset.precioUnitario = precioUnitario;
  fila.dataset.subtotal = subtotal;

  const tipo = fila.querySelector(".ped-tipo").value;
  const ciclo = getCicloActual();
  const disponibleStock = ciclo.stock[prod] ? ciclo.stock[prod][tipo] : 0;
  const disponibleReal = disponibleStock - totalReservadoEnFormulario(prod, tipo, fila);
  fila.classList.toggle("fila-sin-stock", cant > disponibleReal);

  const unidad = esKilo ? "/kg" : "/u";
  fila.querySelector(".precio-item-unitario").textContent = `${formatearMoneda(precioUnitario)}${unidad}`;
  fila.querySelector(".subtotal-item-linea").textContent = formatearMoneda(subtotal);

  actualizarTotalPedido();
}

function actualizarTodasLasFilas() {
  document.querySelectorAll(".pedido-item-row").forEach(actualizarFila);
}

function actualizarTotalPedido() {
  const totalSpan = document.getElementById("pedido-total-preview");
  if (!totalSpan) return;
  let total = 0;
  document.querySelectorAll(".pedido-item-row").forEach((fila) => {
    total += parseFloat(fila.dataset.subtotal) || 0;
  });
  totalSpan.textContent = formatearMoneda(total);
}

export function agregarFilaPedido() {
  const contenedor = document.getElementById("pedido-items-container");
  if (!contenedor) return;
  contenedor.insertAdjacentHTML("beforeend", filaPedidoHTML());
  actualizarFila(contenedor.lastElementChild);
}

function pedirPrecioEspecial(fila) {
  const casera = getCaseraActual();
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

export function configurarPedidos(onChange) {
  const contenedorFilas = document.getElementById("pedido-items-container");
  const form = document.getElementById("form-pedido");
  const inputCasera = document.getElementById("casera-nombre");

  document.getElementById("btn-add-pedido-row").addEventListener("click", () => {
    agregarFilaPedido();
  });

  inputCasera.addEventListener("input", actualizarTodasLasFilas);

  contenedorFilas.addEventListener("click", (evento) => {
    const botonQuitar = evento.target.closest('[data-action="quitar-fila-pedido"]');
    if (botonQuitar) {
      if (document.querySelectorAll(".pedido-item-row").length > 1) {
        botonQuitar.closest(".pedido-item-row").remove();
        actualizarTotalPedido();
      }
      return;
    }

    const botonPrecio = evento.target.closest(".btn-editar-precio-item");
    if (botonPrecio) {
      pedirPrecioEspecial(botonPrecio.closest(".pedido-item-row"));
    }
  });

  contenedorFilas.addEventListener("input", (evento) => {
    const fila = evento.target.closest(".pedido-item-row");
    if (fila) actualizarFila(fila);
  });

  contenedorFilas.addEventListener("change", (evento) => {
    const fila = evento.target.closest(".pedido-item-row");
    if (fila) actualizarFila(fila);
  });

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();

    if (state.diaActivo === "DOMINGO") {
      alert("Los domingos no se realizan entregas a caseras.");
      return;
    }

    const ciclo = getCicloActual();
    const casera = inputCasera.value.trim();
    if (!casera) {
      alert("Ingrese el nombre de la casera.");
      return;
    }

    const items = [];
    document.querySelectorAll(".pedido-item-row").forEach((fila) => {
      const prod = fila.querySelector(".ped-prod").value;
      const tipo = fila.querySelector(".ped-tipo").value;
      const cant = parseInt(fila.querySelector(".ped-cant-entera").value, 10) || 0;
      const productoInfo = state.productos.find((p) => p.nombre === prod);
      const esKilo = productoInfo && productoInfo.tipoPrecio === "kilo";
      const peso = esKilo ? (parseFloat(fila.querySelector(".ped-peso").value) || 0) : null;
      const precioUnitario = parseFloat(fila.dataset.precioUnitario) || 0;
      const subtotal = parseFloat(fila.dataset.subtotal) || 0;

      if (cant > 0) items.push({ prod, tipo, cant, peso, precioUnitario, subtotal });
    });

    if (items.length === 0) {
      alert("Por favor ingrese al menos un producto con cantidad mayor a 0.");
      return;
    }

    const validacionStock = validarStockDisponible(items);
    if (!validacionStock.ok) {
      alert(validacionStock.mensaje);
      return;
    }

    ciclo.pedidos.push({
      id: state.ticketCounter++,
      casera,
      hora: horaActual(),
      fecha: fechaActual(),
      fechaISO: hoyISO(),
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
