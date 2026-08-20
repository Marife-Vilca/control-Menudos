// =============================================================
// COMPONENTE: Encabezado (stats de vaca/toro/pedidos pendientes)
// =============================================================
import { getCicloActual } from '../state.js';

export function renderHeader() {
  const ciclo = getCicloActual();

  document.getElementById("hdr-vaca").textContent = ciclo.totalMenudosVaca;
  document.getElementById("hdr-toro").textContent = ciclo.totalMenudosToro;
  document.getElementById("hdr-total-pedidos").textContent =
    ciclo.pedidos.filter((p) => !p.despachado).length;
}
