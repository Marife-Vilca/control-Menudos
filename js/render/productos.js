
import { state } from '../state.js';
import { formatearMoneda } from '../utils.js';

let editIndex = null;

function construirOpciones(productoSeleccionado) {
  return state.productos
    .map((p) => {
      const seleccionado = p.nombre === productoSeleccionado ? "selected" : "";
      return `<option value="${p.nombre}" ${seleccionado}>${p.nombre.toUpperCase()}</option>`;
    })
    .join("");
}

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

function etiquetaPrecio(producto) {
  if (!producto.precio) return "sin precio";
  return producto.tipoPrecio === "kilo"
    ? `${formatearMoneda(producto.precio)}/kg`
    : `${formatearMoneda(producto.precio)}/u`;
}

function renderTags() {
  const contenedor = document.getElementById("lista-productos-tags");
  if (!contenedor) return;

  contenedor.innerHTML = "";
  state.productos.forEach((producto, index) => {
    const tag = document.createElement("span");
    tag.className = "tag-item";
    tag.innerHTML = `
      ${producto.nombre.toUpperCase()} (${producto.rendimiento}) · ${etiquetaPrecio(producto)}
      <i class="fa-solid fa-pen-to-square"></i>
    `;
    tag.addEventListener("click", () => cargarProductoEnFormulario(index));
    contenedor.appendChild(tag);
  });
}

function cargarProductoEnFormulario(index) {
  const producto = state.productos[index];
  if (!producto) return;

  document.getElementById("nuevo-prod-nombre").value = producto.nombre;
  document.getElementById("nuevo-prod-rendimiento").value = producto.rendimiento;
  document.getElementById("nuevo-prod-tipo-precio").value = producto.tipoPrecio || "unidad";
  document.getElementById("nuevo-prod-precio").value = producto.precio || 0;

  editIndex = index;

  const botonGuardar = document.querySelector("#form-nuevo-producto button[type='submit']");
  if (botonGuardar) {
    botonGuardar.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> <span id="btn-text">Guardar Cambios</span>`;
  }
  document.getElementById("nuevo-prod-nombre").focus();
}

function restaurarFormulario(form) {
  form.reset();
  document.getElementById("nuevo-prod-rendimiento").value = "1";
  document.getElementById("nuevo-prod-precio").value = "0";
  const botonGuardar = form.querySelector("button[type='submit']");
  botonGuardar.innerHTML = `<i class="fa-solid fa-plus"></i> <span id="btn-text">Añadir al Catálogo</span>`;
  editIndex = null;
}

export function renderProductos() {
  renderTags();
  sincronizarSelectsDeProductos();
}

export function configurarCatalogo(onChange) {
  const form = document.getElementById("form-nuevo-producto");

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const nombreProducto = document.getElementById("nuevo-prod-nombre").value.trim().toLowerCase();
    const rendimiento = parseInt(document.getElementById("nuevo-prod-rendimiento").value, 10) || 1;
    const tipoPrecio = document.getElementById("nuevo-prod-tipo-precio").value === "kilo" ? "kilo" : "unidad";
    const precio = parseFloat(document.getElementById("nuevo-prod-precio").value) || 0;

    if (!nombreProducto) return;

    if (editIndex !== null) {
      const yaExiste = state.productos.some((p, idx) => p.nombre === nombreProducto && idx !== editIndex);
      if (yaExiste) {
        alert("Ya existe otro producto con ese nombre.");
        return;
      }
      state.productos[editIndex] = { nombre: nombreProducto, rendimiento, tipoPrecio, precio };
    } else {
      const yaExiste = state.productos.some((p) => p.nombre === nombreProducto);
      if (yaExiste) {
        alert("El producto ya existe en el catálogo.");
        return;
      }
      state.productos.push({ nombre: nombreProducto, rendimiento, tipoPrecio, precio });
    }

    restaurarFormulario(form);
    onChange();
  });

  document.getElementById("btn-cancelar-edicion-prod")?.addEventListener("click", () => {
    restaurarFormulario(form);
  });
}
