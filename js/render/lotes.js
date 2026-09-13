// =============================================================
// COMPONENTE: Ingreso de lotes (recepción) e historial del ciclo
// =============================================================
import { state, getCicloActual } from '../state.js';
import { generarId, formatearMoneda, campoVozHTML } from '../utils.js';

function filaLoteHTML() {
  return `
    <div class="lote-row">
      ${campoVozHTML({
        tipo: "number", clase: "lote-cantidad", placeholder: "Cant.",
        attrs: 'min="1" required', valor: 2, modoVoz: "numero",
        ariaLabel: "Dictar cantidad por voz"
      })}
      ${campoVozHTML({
        tipo: "text", clase: "lote-persona", placeholder: "Nombre de la persona",
        attrs: "required", modoVoz: "texto", ariaLabel: "Dictar nombre por voz"
      })}
      <button type="button" class="btn-remove-row" data-action="quitar-fila-lote">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `;
}

function establecerFechaActual() {
  const inputFecha = document.getElementById("fechaIngreso");
  if (inputFecha) inputFecha.value = new Date().toISOString().split("T")[0];
}

function renderHistorialLotes() {
  const contenedor = document.getElementById("tabla-lotes-registrados");
  if (!contenedor) return;

  const ciclo = getCicloActual();

  if (ciclo.lotesHistorico.length === 0) {
    contenedor.innerHTML = `<small class="texto-vacio">Sin lotes ingresados.</small>`;
    return;
  }

  const filas = ciclo.lotesHistorico
    .map(
      (lote) => `
      <tr>
        <td>${lote.fechaIngreso}</td>
        <td>${lote.proveedor}</td>
        <td>${lote.cantVaca}</td>
        <td>${lote.cantToro}</td>
        <td>${formatearMoneda(lote.costoTotal || 0)}</td>
        <td>
          <i class="fa-solid fa-pen-to-square icono-accion icono-editar" data-action="editar-lote" data-id="${lote.id}"></i>
          <i class="fa-solid fa-trash-can icono-accion icono-eliminar" data-action="eliminar-lote" data-id="${lote.id}"></i>
        </td>
      </tr>`
    )
    .join("");

  const costoAcumulado = ciclo.lotesHistorico.reduce((s, l) => s + (l.costoTotal || 0), 0);

  contenedor.innerHTML = `
    <table>
      <thead><tr><th>Fecha</th><th>Proveedor</th><th>Vaca</th><th>Toro</th><th>Costo</th><th>Acción</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <p class="totales-linea">Costo total de lotes en este ciclo: <strong>${formatearMoneda(costoAcumulado)}</strong></p>
  `;
}

export function renderLotes() {
  renderHistorialLotes();
}

export function configurarLotes(onChange) {
  const contenedorFilas = document.getElementById("lote-detalles-container");
  const form = document.getElementById("form-lote");

  document.getElementById("btn-add-lote-row").addEventListener("click", () => {
    contenedorFilas.insertAdjacentHTML("beforeend", filaLoteHTML());
  });

  contenedorFilas.addEventListener("click", (evento) => {
    const boton = evento.target.closest('[data-action="quitar-fila-lote"]');
    if (!boton) return;
    if (document.querySelectorAll(".lote-row").length > 1) {
      boton.closest(".lote-row").remove();
    }
  });

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();

    if (state.diaActivo === "DOMINGO") {
      alert("Los domingos no se procesan lotes de menudos.");
      return;
    }

    const ciclo = getCicloActual();
    const fechaIngreso = document.getElementById("fechaIngreso").value;
    const proveedor = document.getElementById("proveedor-nombre").value;
    const cantVaca = parseFloat(document.getElementById("lote-cant-vaca").value) || 0;
    const cantToro = parseFloat(document.getElementById("lote-cant-toro").value) || 0;
    const costoTotal = parseFloat(document.getElementById("lote-costo-total").value) || 0;

    const personas = [];
    document.querySelectorAll(".lote-row").forEach((fila) => {
      const cantidad = parseFloat(fila.querySelector(".lote-cantidad").value) || 0;
      const nombre = fila.querySelector(".lote-persona").value.trim();
      if (nombre && cantidad > 0) personas.push({ nombre, cantidad });
    });

    ciclo.lotesHistorico.push({
      id: generarId(),
      fechaIngreso,
      proveedor,
      cantVaca,
      cantToro,
      costoTotal,
      personas
    });

    alert(`Lote Ingresado para el ciclo [${state.diaActivo}]:\n+ ${cantVaca} Vacas\n+ ${cantToro} Toros\nCosto: ${formatearMoneda(costoTotal)}`);

    form.reset();
    establecerFechaActual();
    onChange();
  });

  document.getElementById("tabla-lotes-registrados").addEventListener("click", (evento) => {
    const ciclo = getCicloActual();

    const botonEditar = evento.target.closest('[data-action="editar-lote"]');
    if (botonEditar) {
      const lote = ciclo.lotesHistorico.find((l) => l.id === Number(botonEditar.dataset.id));
      if (!lote) return;

      const nVaca = prompt("Cantidad de Menudos de Vaca:", lote.cantVaca);
      if (nVaca === null) return;
      const nToro = prompt("Cantidad de Menudos de Toro:", lote.cantToro);
      if (nToro === null) return;
      const nCosto = prompt("Costo total pagado por el lote (S/):", lote.costoTotal || 0);
      if (nCosto === null) return;

      lote.cantVaca = parseFloat(nVaca) || 0;
      lote.cantToro = parseFloat(nToro) || 0;
      lote.costoTotal = parseFloat(nCosto) || 0;
      onChange();
      return;
    }

    const botonEliminar = evento.target.closest('[data-action="eliminar-lote"]');
    if (botonEliminar) {
      if (!confirm("¿Está seguro de eliminar este lote del historial?")) return;
      ciclo.lotesHistorico = ciclo.lotesHistorico.filter((l) => l.id !== Number(botonEliminar.dataset.id));
      onChange();
    }
  });

  establecerFechaActual();
}
