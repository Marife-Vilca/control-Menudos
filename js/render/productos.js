// =============================================================
// COMPONENTE: Catálogo de productos
// - Alta / edición de productos (nombre + piezas por menudo)
// - Sincroniza todos los <select> de productos de la app
// =============================================================
import { state } from '../state.js';

let editIndex = null;

function construirOpciones(productoSeleccionado) {
  return state.productos
    .map((p) => {
      const seleccionado = p.nombre === productoSeleccionado ? "selected" : "";
      return `<option value="${p.nombre}" ${seleccionado}>${p.nombre.toUpperCase()}</option>`;
    })
    .join("");
}

/** Actualiza todos los selects que dependen del catálogo (calidad, filas de pedido, modal). */
function sincronizarSelectsDeProductos() {
  const selectCalidad = document.getElementById("calidad-producto");
  if (selectCalidad) {
    const valorActual = selectCalidad.value;
    selectCalidad.innerHTML = construirOpciones(valorActual);
  }

  document.querySelectorAll(".ped-prod").forEach((select) => {
    const valorActual = select.value;
    select.innerHTML = construirOpciones(valorActual);
    if (valorActual && state.productos.some((p) => p.nombre === valorActual)) {
      select.value = valorActual;
    }
  });
}

function renderTags() {
  const contenedor = document.getElementById("lista-productos-tags");
  if (!contenedor) return;

  contenedor.innerHTML = "";
  state.productos.forEach((producto, index) => {
    const tag = document.createElement("span");
    tag.className = "tag-item";
    tag.innerHTML = `
      ${producto.nombre.toUpperCase()} (${producto.rendimiento})
      <i class="fa-solid fa-pen-to-square"></i>
    `;
    tag.addEventListener("click", () => cargarProductoEnFormulario(index));
    contenedor.appendChild(tag);
  });
}

function cargarProductoEnFormulario(index) {
  const producto = state.productos[index];
  if (!producto) return;

  const inputNombre = document.getElementById("nuevo-prod-nombre");
  const inputRendimiento = document.getElementById("nuevo-prod-rendimiento");
  const botonGuardar = document.querySelector("#form-nuevo-producto button[type='submit']");

  inputNombre.value = producto.nombre;
  inputRendimiento.value = producto.rendimiento;
  editIndex = index;

  if (botonGuardar) {
    botonGuardar.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span id="btn-text">Guardar Cambios</span>`;
  }
  inputNombre.focus();
}

export function renderProductos() {
  renderTags();
  sincronizarSelectsDeProductos();
}

export function configurarCatalogo(onChange) {
  const form = document.getElementById("form-nuevo-producto");

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const inputNombre = document.getElementById("nuevo-prod-nombre");
    const inputRendimiento = document.getElementById("nuevo-prod-rendimiento");
    const botonGuardar = form.querySelector("button[type='submit']");

    const nombreProducto = inputNombre.value.trim().toLowerCase();
    const rendimiento = parseInt(inputRendimiento.value, 10) || 1;

    if (!nombreProducto) return;

    if (editIndex !== null) {
      const nombreAnterior = state.productos[editIndex].nombre;
      const yaExiste = state.productos.some((p, idx) => p.nombre === nombreProducto && idx !== editIndex);

      if (yaExiste) {
        alert("Ya existe otro producto con ese nombre.");
        return;
      }

      state.productos[editIndex] = { nombre: nombreProducto, rendimiento };

      Object.keys(state.ciclos).forEach((diaKey) => {
        const ciclo = state.ciclos[diaKey];
        if (ciclo.stock[nombreAnterior]) {
          ciclo.stock[nombreProducto] = ciclo.stock[nombreAnterior];
          if (nombreAnterior !== nombreProducto) delete ciclo.stock[nombreAnterior];
        }
      });

      editIndex = null;
    } else {
      const yaExiste = state.productos.some((p) => p.nombre === nombreProducto);
      if (yaExiste) {
        alert("El producto ya existe en el catálogo.");
        return;
      }

      state.productos.push({ nombre: nombreProducto, rendimiento });

      Object.keys(state.ciclos).forEach((diaKey) => {
        state.ciclos[diaKey].stock[nombreProducto] = { vaca: 0, toro: 0 };
      });
    }

    inputNombre.value = "";
    inputRendimiento.value = "1";
    botonGuardar.innerHTML = `<i class="fa-solid fa-plus"></i> <span id="btn-text">Añadir al Catálogo</span>`;

    onChange();
  });
}
