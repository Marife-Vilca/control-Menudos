
import { getCicloActual } from '../state.js';
import { formatearMoneda } from '../utils.js';

function totalPorCobrar(ciclo) {
  return ciclo.pedidos
    .filter((p) => !p.despachado)
    .reduce((suma, p) => suma + p.items.reduce((s, it) => s + (Number(it.subtotal) || 0), 0), 0);
}

export function renderHeader() {
  const ciclo = getCicloActual();

  document.getElementById("hdr-vaca").textContent = ciclo.totalMenudosVaca;
  document.getElementById("hdr-toro").textContent = ciclo.totalMenudosToro;
  document.getElementById("hdr-total-pedidos").textContent =
    ciclo.pedidos.filter((p) => !p.despachado).length;

  const hdrCobrar = document.getElementById("hdr-por-cobrar");
  if (hdrCobrar) hdrCobrar.textContent = formatearMoneda(totalPorCobrar(ciclo));
}
