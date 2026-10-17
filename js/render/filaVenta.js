import {
  state,
  getPrecioProducto,
  tienePrecioEspecial,
  setPrecioEspecial,
} from "../state.js";
import {
  formatearMoneda,
  campoVozHTML,
  capitalizar,
  generarId,
} from "../utils.js";

const SELECTOR_FILA = ".venta-item-row";

const TEXTOS_MEDIDA = {
  kilo: { cantidad: "Kilos", precio: "S/ por kilo", rotulo: "Por kilo" },
  unidad: {
    cantidad: "Cantidad",
    precio: "S/ por unidad",
    rotulo: "Por unidad",
  },
};

function numero(elemento) {
  return parseFloat(elemento.value) || 0;
}

function redondear(valor) {
  return Math.round(valor * 100) / 100;
}

function esModoMedida(modo) {
  return modo === "kilo" || modo === "unidad";
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
      <div class="vd-fila-modo">
        <select class="vd-modo" aria-label="Cómo se cobra este producto">
          <option value="directo">Precio directo</option>
          <option value="kilo">Por kilo</option>
          <option value="unidad">Por unidad</option>
        </select>
      </div>
      <p class="vd-nota-medida"></p>

      <div class="vd-fila-principal">
        <div class="vd-celda-precio">
          ${campoVozHTML({
            tipo: "number",
            clase: "vd-monto-directo",
            placeholder: "S/ 0.00",
            attrs:
              'min="0" step="any" inputmode="decimal" aria-label="Precio en soles"',
            modoVoz: "numero",
            ariaLabel: "Dictar precio por voz",
          })}
        </div>
        <select class="vd-prod" aria-label="Qué producto es">${opcionesProducto()}</select>
        <button type="button" class="btn-remove-row" data-action="quitar-fila-venta" aria-label="Quitar producto">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>

      <div class="vd-fila-medida">
        ${campoVozHTML({
          tipo: "number",
          clase: "vd-cantidad",
          placeholder: "Kilos",
          attrs: 'min="0" step="any" inputmode="decimal" aria-label="Cantidad"',
          modoVoz: "numero",
          ariaLabel: "Dictar cantidad por voz",
        })}
        <span class="vd-por" aria-hidden="true">×</span>
        ${campoVozHTML({
          tipo: "number",
          clase: "vd-precio-unitario",
          placeholder: "S/ por kilo",
          attrs:
            'min="0" step="any" inputmode="decimal" aria-label="Precio unitario"',
          modoVoz: "numero",
          ariaLabel: "Dictar precio por voz",
        })}
        <strong class="subtotal-item-linea">S/ 0.00</strong>
      </div>
    </div>
  `;
}

function asegurarOpcion(select, nombreProducto) {
  if (!nombreProducto) return;
  const existe = Array.from(select.options).some(
    (o) => o.value === nombreProducto,
  );
  if (!existe)
    select.insertAdjacentHTML(
      "beforeend",
      `<option value="${nombreProducto}">${capitalizar(nombreProducto)}</option>`,
    );
}

function textoNota(modo, casera, producto) {
  const { rotulo } = TEXTOS_MEDIDA[modo];
  if (!casera || !producto) return rotulo;
  return tienePrecioEspecial(casera, producto)
    ? `${rotulo} · precio especial de ${capitalizar(casera)}`
    : `${rotulo} · precio de lista`;
}

function marcarPrecioEspecial(fila, casera) {
  const modo = fila.querySelector(".vd-modo").value;
  if (!esModoMedida(modo)) return;

  const producto = fila.querySelector(".vd-prod").value;
  const especial =
    !!casera && !!producto && tienePrecioEspecial(casera, producto);
  fila
    .querySelector(".vd-precio-unitario")
    .classList.toggle("vd-precio-especial", especial);
  fila.querySelector(".vd-nota-medida").textContent = textoNota(
    modo,
    casera,
    producto,
  );
}

function aplicarTextosDeModo(fila, modo) {
  fila.dataset.modo = modo;
  if (!esModoMedida(modo)) return;

  const textos = TEXTOS_MEDIDA[modo];
  fila.querySelector(".vd-cantidad").placeholder = textos.cantidad;
  fila.querySelector(".vd-precio-unitario").placeholder = textos.precio;
}

/** Carga el precio vigente (lista o especial de la casera) en filas por kilo / por unidad. */
function sincronizarPrecio(fila, inputCasera) {
  const modo = fila.querySelector(".vd-modo").value;
  aplicarTextosDeModo(fila, modo);
  if (!esModoMedida(modo)) return;

  const producto = fila.querySelector(".vd-prod").value;
  const casera = inputCasera.value.trim();
  const precio = producto ? getPrecioProducto(casera, producto) : 0;

  fila.querySelector(".vd-precio-unitario").value = precio > 0 ? precio : "";
  marcarPrecioEspecial(fila, casera);
}

/** Recalcula subtotal y avisa al formulario. No toca lo que se está escribiendo. */
export function actualizarFilaVenta(fila, onTotalesCambiaron) {
  const modo = fila.querySelector(".vd-modo").value;
  aplicarTextosDeModo(fila, modo);

  let subtotal;
  if (esModoMedida(modo)) {
    subtotal = redondear(
      numero(fila.querySelector(".vd-cantidad")) *
        numero(fila.querySelector(".vd-precio-unitario")),
    );
    fila.querySelector(".subtotal-item-linea").textContent =
      formatearMoneda(subtotal);
  } else {
    subtotal = numero(fila.querySelector(".vd-monto-directo"));
  }

  fila.dataset.subtotal = subtotal;
  onTotalesCambiaron();
}

/** Guarda como precio especial lo escrito en el precio unitario para esa casera. */
function guardarPrecioEspecialSiCambio(fila, inputCasera) {
  const casera = inputCasera.value.trim();
  const producto = fila.querySelector(".vd-prod").value;
  const precio = numero(fila.querySelector(".vd-precio-unitario"));

  if (
    casera &&
    producto &&
    precio > 0 &&
    precio !== getPrecioProducto(casera, producto)
  ) {
    setPrecioEspecial(casera, producto, precio);
  }
  marcarPrecioEspecial(fila, casera);
}

function cargarDatosIniciales(fila, item) {
  const select = fila.querySelector(".vd-prod");
  asegurarOpcion(select, item.prod);
  select.value = item.prod;

  const modo = ["directo", "kilo", "unidad"].includes(item.modo)
    ? item.modo
    : "directo";
  fila.querySelector(".vd-modo").value = modo;
  aplicarTextosDeModo(fila, modo);

  if (modo === "kilo") {
    fila.querySelector(".vd-cantidad").value = item.peso;
    fila.querySelector(".vd-precio-unitario").value = item.precioUnitario;
  } else if (modo === "unidad") {
    fila.querySelector(".vd-cantidad").value = item.cantidad;
    fila.querySelector(".vd-precio-unitario").value = item.precioUnitario;
  } else {
    fila.querySelector(".vd-monto-directo").value =
      item.montoDirecto ?? item.subtotal;
  }
}

export function agregarFilaVenta(
  contenedor,
  inputCasera,
  onTotalesCambiaron,
  datosIniciales,
) {
  contenedor.insertAdjacentHTML("beforeend", filaHTML());
  const fila = contenedor.lastElementChild;

  if (datosIniciales) {
    cargarDatosIniciales(fila, datosIniciales);
    marcarPrecioEspecial(fila, inputCasera.value.trim());
  }

  actualizarFilaVenta(fila, onTotalesCambiaron);
  return fila;
}

/**
 * Conecta los eventos de un contenedor de filas (formulario nuevo o modal de edición).
 * Devuelve la función a llamar cuando cambia el nombre de la casera.
 */
export function conectarFilasVenta(
  contenedor,
  inputCasera,
  onTotalesCambiaron,
) {
  contenedor.addEventListener("click", (evento) => {
    const botonQuitar = evento.target.closest(
      '[data-action="quitar-fila-venta"]',
    );
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

    const objetivo = evento.target.classList;

    if (objetivo.contains("vd-prod") || objetivo.contains("vd-modo")) {
      sincronizarPrecio(fila, inputCasera);
    } else if (objetivo.contains("vd-precio-unitario")) {
      guardarPrecioEspecialSiCambio(fila, inputCasera);
    }

    actualizarFilaVenta(fila, onTotalesCambiaron);
  });

  return function alCambiarCasera() {
    contenedor.querySelectorAll(SELECTOR_FILA).forEach((fila) => {
      sincronizarPrecio(fila, inputCasera);
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
    if (!prod)
      throw new Error(`Elige qué es el monto de ${formatearMoneda(subtotal)}.`);

    const modo = fila.querySelector(".vd-modo").value;
    const item = { id: generarId(), prod, modo, subtotal };

    if (modo === "kilo") {
      item.peso = numero(fila.querySelector(".vd-cantidad"));
      item.precioUnitario = numero(fila.querySelector(".vd-precio-unitario"));
    } else if (modo === "unidad") {
      item.cantidad = numero(fila.querySelector(".vd-cantidad"));
      item.precioUnitario = numero(fila.querySelector(".vd-precio-unitario"));
    } else {
      item.montoDirecto = subtotal;
    }

    items.push(item);
  });

  return items;
}
