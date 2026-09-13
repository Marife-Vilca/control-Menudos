
import { getCicloActual } from '../state.js';
import { generarId, fechaActual, formatearCantidad } from '../utils.js';

function renderHistorialCalidad() {
  const contenedor = document.getElementById("tabla-calidad-registrada");
  if (!contenedor) return;

  const ciclo = getCicloActual();
  const historico = ciclo.calidadHistorico || [];

  if (historico.length === 0) {
    contenedor.innerHTML = `<small class="texto-vacio">Sin mermas registradas.</small>`;
    return;
  }

  const filas = historico
    .map(
      (registro) => `
      <tr>
        <td>${registro.prod.toUpperCase()}</td>
        <td>${registro.tipo}</td>
        <td>${registro.estadoAccion}</td>
        <td>${registro.cant}</td>
        <td><i class="fa-solid fa-trash-can icono-accion icono-eliminar" data-action="eliminar-calidad" data-id="${registro.id}"></i></td>
      </tr>`
    )
    .join("");

  contenedor.innerHTML = `
    <table>
      <thead><tr><th>Prod</th><th>Tipo</th><th>Estado</th><th>Cant</th><th></th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
  `;
}

export function renderCalidad() {
  renderHistorialCalidad();
}

export function configurarCalidad(onChange) {
  const form = document.getElementById("form-calidad");

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const ciclo = getCicloActual();
    const producto = document.getElementById("calidad-producto").value;
    const tipo = document.getElementById("calidad-tipo").value;
    const estadoAccion = document.getElementById("calidad-estado").value;
    const cantidad = parseInt(document.getElementById("cantidadAfectada").value, 10) || 0;

    if (cantidad <= 0) {
      alert("Por favor ingrese una cantidad válida mayor a 0.");
      return;
    }

    const disponible = ciclo.stock[producto] ? ciclo.stock[producto][tipo] : 0;
    if (cantidad > disponible) {
      const continuar = confirm(
        `Solo hay ${formatearCantidad(disponible)} unidades disponibles de ${producto.toUpperCase()} (${tipo}), ` +
        `pero se está registrando una merma de ${cantidad}. ¿Desea continuar de todas formas?`
      );
      if (!continuar) return;
    }

    ciclo.calidadHistorico.push({
      id: generarId(),
      fecha: fechaActual(),
      prod: producto,
      tipo,
      estadoAccion,
      cant: cantidad
    });

    form.reset();
    document.getElementById("cantidadAfectada").value = "1";

    onChange();
  });

  document.getElementById("tabla-calidad-registrada").addEventListener("click", (evento) => {
    const boton = evento.target.closest('[data-action="eliminar-calidad"]');
    if (!boton) return;

    if (!confirm("¿Desea eliminar esta entrada de merma/calidad? El stock será restituido.")) return;

    const ciclo = getCicloActual();
    ciclo.calidadHistorico = ciclo.calidadHistorico.filter((c) => c.id !== Number(boton.dataset.id));
    onChange();
  });
}
