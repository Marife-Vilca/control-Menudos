
import { state, setPrecioEspecial, eliminarPrecioEspecial } from '../state.js';
import { formatearMoneda } from '../utils.js';

function construirOpcionesProducto() {
  return state.productos
    .map((p) => `<option value="${p.nombre}">${p.nombre.toUpperCase()}</option>`)
    .join("");
}

function renderListaPrecios() {
  const contenedor = document.getElementById("lista-precios-especiales");
  if (!contenedor) return;

  const claves = Object.keys(state.clientes).filter(
    (clave) => Object.keys(state.clientes[clave].precios || {}).length > 0
  );

  if (claves.length === 0) {
    contenedor.innerHTML = `<small class="texto-vacio">Sin precios especiales registrados. Todas las caseras pagan el precio base del catálogo.</small>`;
    return;
  }

  const filas = [];
  claves.forEach((clave) => {
    const cliente = state.clientes[clave];
    Object.entries(cliente.precios).forEach(([prod, precio]) => {
      const productoInfo = state.productos.find((p) => p.nombre === prod);
      const unidad = productoInfo && productoInfo.tipoPrecio === "kilo" ? "/kg" : "/u";
      filas.push(`
        <tr>
          <td>${cliente.nombre}</td>
          <td>${prod.toUpperCase()}</td>
          <td>${formatearMoneda(precio)}${unidad}</td>
          <td>
            <i class="fa-solid fa-trash-can icono-accion icono-eliminar"
               data-action="eliminar-precio" data-casera="${cliente.nombre}" data-prod="${prod}"></i>
          </td>
        </tr>
      `);
    });
  });

  contenedor.innerHTML = `
    <table>
      <thead><tr><th>Casera</th><th>Producto</th><th>Precio especial</th><th></th></tr></thead>
      <tbody>${filas.join("")}</tbody>
    </table>
  `;
}

export function renderPrecios() {
  const selectProducto = document.getElementById("precio-especial-producto");
  if (selectProducto) {
    const valorActual = selectProducto.value;
    selectProducto.innerHTML = construirOpcionesProducto();
    if (valorActual) selectProducto.value = valorActual;
  }
  renderListaPrecios();
}

export function configurarPrecios(onChange) {
  const form = document.getElementById("form-precio-especial");
  if (!form) return;

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const casera = document.getElementById("precio-especial-casera").value.trim();
    const producto = document.getElementById("precio-especial-producto").value;
    const precio = parseFloat(document.getElementById("precio-especial-valor").value);

    if (!casera) {
      alert("Ingrese el nombre de la casera.");
      return;
    }
    if (!producto) {
      alert("Seleccione un producto.");
      return;
    }
    if (isNaN(precio) || precio <= 0) {
      alert("Ingrese un precio válido mayor a 0.");
      return;
    }

    setPrecioEspecial(casera, producto, precio);
    form.reset();
    onChange();
  });

  document.getElementById("lista-precios-especiales").addEventListener("click", (evento) => {
    const boton = evento.target.closest('[data-action="eliminar-precio"]');
    if (!boton) return;

    if (!confirm(`¿Eliminar el precio especial de "${boton.dataset.casera}" para ${boton.dataset.prod}? Volverá a pagar el precio base.`)) return;

    eliminarPrecioEspecial(boton.dataset.casera, boton.dataset.prod);
    onChange();
  });
}
