// =============================================================
// COMPONENTE: Ingreso de lotes (recepción) e historial del ciclo
// =============================================================
import { state, getCicloActual } from '../state.js';
import { generarId } from '../utils.js';

function filaLoteHTML() {
  return `
    <div class="lote-row">
      <div class="campo-voz">
        <input type="number" class="lote-cantidad" placeholder="Cant." min="1" value="2" required>
        <div class="acciones-voz">
                            <button type="button" class="btn-voz" data-modo="numero" aria-label="Dictar cantidad por voz">
          <i class="fa-solid fa-microphone"></i>
        </button>
                            <button type="button" class="btn-leer" aria-label="Escuchar lo escrito">
                                <i class="fa-solid fa-volume-high"></i>
                            </button>
                        </div>
      </div>
      <div class="campo-voz">
        <input type="text" class="lote-persona" placeholder="Nombre de la persona" required>
        <div class="acciones-voz">
                            <button type="button" class="btn-voz" data-modo="texto" aria-label="Dictar nombre por voz">
          <i class="fa-solid fa-microphone"></i>
        </button>
                            <button type="button" class="btn-leer" aria-label="Escuchar lo escrito">
                                <i class="fa-solid fa-volume-high"></i>
                            </button>
                        </div>
      </div>
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
        <td>
          <i class="fa-solid fa-pen-to-square icono-accion icono-editar" data-action="editar-lote" data-id="${lote.id}"></i>
          <i class="fa-solid fa-trash-can icono-accion icono-eliminar" data-action="eliminar-lote" data-id="${lote.id}"></i>
        </td>
      </tr>`
    )
    .join("");

  contenedor.innerHTML = `
    <table>
      <thead><tr><th>Fecha</th><th>Proveedor</th><th>Vaca</th><th>Toro</th><th>Acción</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
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
      personas
    });

    alert(`Lote Ingresado para el ciclo [${state.diaActivo}]:\n+ ${cantVaca} Vacas\n+ ${cantToro} Toros`);

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

      lote.cantVaca = parseFloat(nVaca) || 0;
      lote.cantToro = parseFloat(nToro) || 0;
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
