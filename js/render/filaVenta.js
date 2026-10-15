import { state, getPrecioProducto, tienePrecioEspecial, setPrecioEspecial } from '../state.js';
import { formatearMoneda, campoVozHTML, capitalizar, generarId } from '../utils.js';

const SELECTOR_FILA = ".venta-item-row";

function numero(elemento) {
  return parseFloat(elemento.value) || 0;
}

function redondear(valor) {
  return Math.round(valor * 100) / 100;
}

function modoDeProducto(nombreProducto) {
  const producto = state.productos.find((p) => p.nombre === nombreProducto);
  return producto && producto.tipoPrecio === "kilo" ? "kilo" : "directo";
}

function opcionesProducto() {
  const opciones = state.productos
    .map((p) => `<option value="${p.nombre}">${capitalizar(p.nombre)}</option>`)
    .join("");
  return `<option value="" disabled selected>¿Qué es?</option>${opciones}`;
}

function filaHTML() {
  return `
    <div class="venta-item-row" data-modo="directo">
      <p class="vd-nota-kilo"></p>

      <div class="vd-fila-principal">
        <div class="vd-celda-precio">
          ${campoVozHTML({
            tipo: "number", clase: "vd-monto-directo", placeholder: "S/ 0.00",
            attrs: 'min="0" step="0.10" inputmode="decimal" aria-label="Precio en soles"',
            modoVoz: "numero", ariaLabel: "Dictar precio por voz"
          })}
        </div>
        <select class="vd-prod" aria-label="Qué producto es">${opcionesProducto()}</select>
        <button type="button" class="btn-remove-row" data-action="quitar-fila-venta" aria-label="Quitar producto">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>

      <div class="vd-fila-kilo">
        ${campoVozHTML({
          tipo: "number", clase: "vd-peso", placeholder: "Kilos",
          attrs: 'min="0.1" step="0.1" inputmode="decimal" aria-label="Peso en kilos"',
          modoVoz: "numero", ariaLabel: "Dictar peso por voz"
        })}
        <span class="vd-por" aria-hidden="true">×</span>
        ${campoVozHTML({
          tipo: "number", clase: "vd-precio-kilo", placeholder: "S/ por kilo",
          attrs: 'min="0" step="0.10" inputmode="decimal" aria-label="Precio por kilo"',
          modoVoz: "numero", ariaLabel: "Dictar precio por kilo por voz"
        })}
        <strong class="subtotal-item-linea">S/ 0.00</strong>
      </div>
    </div>
  `;
}

function asegurarOpcion(select, nombreProducto) {
  if (!nombreProducto) return;
  const existe = Array.from(select.options).some((o) => o.value === nombreProducto);
  if (!existe) select.insertAdjacentHTML("beforeend", `<option value="${nombreProducto}">${capitalizar(nombreProducto)}</option>`);
}

function notaKilo(casera, producto) {
  if (!casera) return "Por kilo";
  return tienePrecioEspecial(casera, producto)
    ? `Por kilo · precio especial de ${capitalizar(casera)}`
    : "Por kilo · precio de lista";
}

function marcarPrecioEspecial(fila, casera, producto) {
  const especial = !!casera && tienePrecioEspecial(casera, producto);
  fila.querySelector(".vd-precio-kilo").classList.toggle("vd-precio-especial", especial);
  fila.querySelector(".vd-nota-kilo").textContent = notaKilo(casera, producto);
}

/** Carga en la fila el precio por kilo vigente (lista o especial de la casera). */
function sincronizarPrecioKilo(fila, inputCasera) {
  const producto = fila.querySelector(".vd-prod").value;
  const casera = inputCasera.value.trim();
  if (modoDeProducto(producto) !== "kilo") return;

  const precio = getPrecioProducto(casera, producto);
  fila.querySelector(".vd-precio-kilo").value = precio > 0 ? precio : "";
  marcarPrecioEspecial(fila, casera, producto);
}

/** Recalcula modo, subtotal y avisa al formulario. No toca el precio que la usuaria está escribiendo. */
export function actualizarFilaVenta(fila, onTotalesCambiaron) {
  const producto = fila.querySelector(".vd-prod").value;
  const modo = modoDeProducto(producto);
  fila.dataset.modo = modo;

  let subtotal;
  if (modo === "kilo") {
    subtotal = redondear(numero(fila.querySelector(".vd-peso")) * numero(fila.querySelector(".vd-precio-kilo")));
    fila.querySelector(".subtotal-item-linea").textContent = formatearMoneda(subtotal);
  } else {
    subtotal = numero(fila.querySelector(".vd-monto-directo"));
  }

  fila.dataset.subtotal = subtotal;
  onTotalesCambiaron();
}

/** Guarda como precio especial lo que se escribió en "S/ por kilo" para esa casera. */
function guardarPrecioEspecialSiCambio(fila, inputCasera) {
  const casera = inputCasera.value.trim();
  const producto = fila.querySelector(".vd-prod").value;
  const precio = numero(fila.querySelector(".vd-precio-kilo"));

  if (casera && precio > 0 && precio !== getPrecioProducto(casera, producto)) {
    setPrecioEspecial(casera, producto, precio);
  }
  marcarPrecioEspecial(fila, casera, producto);
}

function cargarDatosIniciales(fila, item) {
  const select = fila.querySelector(".vd-prod");
  asegurarOpcion(select, item.prod);
  select.value = item.prod;

  const modo = modoDeProducto(item.prod);
  if (modo === "kilo" && item.modo === "kilo") {
    fila.querySelector(".vd-peso").value = item.peso;
    fila.querySelector(".vd-precio-kilo").value = item.precioUnitario;
  } else {
    // Incluye tiques antiguos "por unidad": se conservan como monto directo.
    fila.querySelector(".vd-monto-directo").value = item.montoDirecto ?? item.subtotal;
  }
}

export function agregarFilaVenta(contenedor, inputCasera, onTotalesCambiaron, datosIniciales) {
  contenedor.insertAdjacentHTML("beforeend", filaHTML());
  const fila = contenedor.lastElementChild;

  if (datosIniciales) {
    cargarDatosIniciales(fila, datosIniciales);
    marcarPrecioEspecial(fila, inputCasera.value.trim(), datosIniciales.prod);
  }

  actualizarFilaVenta(fila, onTotalesCambiaron);
  return fila;
}

/**
 * Conecta los eventos de un contenedor de filas (formulario nuevo o modal de edición).
 * Devuelve la función a llamar cuando cambia el nombre de la casera.
 */
export function conectarFilasVenta(contenedor, inputCasera, onTotalesCambiaron) {
  contenedor.addEventListener("click", (evento) => {
    const botonQuitar = evento.target.closest('[data-action="quitar-fila-venta"]');
    if (!botonQuitar) return;

    if (contenedor.querySelectorAll(SELECTOR_FILA).length > 1) {
      botonQuitar.closest(SELECTOR_FILA).remove();
      onTotalesCambiaron();
    }
  });

  contenedor.addEventListener("input", (evento) => {
    const fila = evento.target.closest(SELECTOR_FILA);
    if (fila) actualizarFilaVenta(fila, onTotalesCambiaron);
  });

  contenedor.addEventListener("change", (evento) => {
    const fila = evento.target.closest(SELECTOR_FILA);
    if (!fila) return;

    if (evento.target.classList.contains("vd-prod")) sincronizarPrecioKilo(fila, inputCasera);
    if (evento.target.classList.contains("vd-precio-kilo")) guardarPrecioEspecialSiCambio(fila, inputCasera);
    actualizarFilaVenta(fila, onTotalesCambiaron);
  });

  return function alCambiarCasera() {
    contenedor.querySelectorAll(SELECTOR_FILA).forEach((fila) => {
      sincronizarPrecioKilo(fila, inputCasera);
      actualizarFilaVenta(fila, onTotalesCambiaron);
    });
  };
}

export function sumarSubtotales(contenedor) {
  let total = 0;
  contenedor.querySelectorAll(SELECTOR_FILA).forEach((fila) => {
    total += parseFloat(fila.dataset.subtotal) || 0;
  });
  return total;
}

/** Devuelve los ítems de la venta. Lanza Error si hay un monto sin producto elegido. */
export function recolectarItemsVenta(contenedor) {
  const items = [];

  contenedor.querySelectorAll(SELECTOR_FILA).forEach((fila) => {
    const subtotal = parseFloat(fila.dataset.subtotal) || 0;
    if (subtotal <= 0) return;

    const prod = fila.querySelector(".vd-prod").value;
    if (!prod) throw new Error(`Elige qué es el monto de ${formatearMoneda(subtotal)}.`);

    const item = { id: generarId(), prod, subtotal };

    if (fila.dataset.modo === "kilo") {
      item.modo = "kilo";
      item.peso = numero(fila.querySelector(".vd-peso"));
      item.precioUnitario = numero(fila.querySelector(".vd-precio-kilo"));
    } else {
      item.modo = "directo";
      item.montoDirecto = subtotal;
    }

    items.push(item);
  });

  return items;
}
