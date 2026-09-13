// =============================================================
// COMPONENTE: Reportes — ganancia y ranking de caseras
// Usa el historial de ciclos cerrados (fecha de cierre confiable,
// generada por el sistema) para agrupar por período, más el ciclo
// activo en curso (aún no cerrado) como resumen aparte.
// =============================================================
import { state, resumenCicloEnVivo } from '../state.js';
import { formatearMoneda } from '../utils.js';

const UN_DIA_MS = 24 * 60 * 60 * 1000;

function pedidosDespachados(pedidos) {
  return (pedidos || []).filter((p) => p.despachado);
}

function rankingCaseras(listaDePedidos, topN = 5) {
  const acumulado = {};

  listaDePedidos.forEach((pedido) => {
    const clave = pedido.casera.trim().toLowerCase();
    if (!acumulado[clave]) {
      acumulado[clave] = { nombre: pedido.casera.trim(), total: 0, pedidos: 0 };
    }
    acumulado[clave].total += pedido.items.reduce((s, it) => s + (Number(it.subtotal) || 0), 0);
    acumulado[clave].pedidos += 1;
  });

  return Object.values(acumulado)
    .sort((a, b) => b.total - a.total)
    .slice(0, topN);
}

function historialDentroDe(dias) {
  const limite = Date.now() - dias * UN_DIA_MS;
  return state.historial.filter((c) => new Date(c.fechaCierre).getTime() >= limite);
}

function resumenDeCiclosCerrados(ciclos) {
  const ingresoTotal = ciclos.reduce((s, c) => s + (c.ingresoTotal || 0), 0);
  const pedidos = ciclos.flatMap((c) => pedidosDespachados(c.pedidos));
  return { ingresoTotal, pedidos };
}

function tarjetaResumen(titulo, resumen, subtitulo = "") {
  const ranking = rankingCaseras(resumen.pedidos, 5);
  const filasRanking = ranking.length
    ? ranking.map(
        (c, i) => `
        <div class="ranking-fila">
          <span class="ranking-pos">#${i + 1}</span>
          <span class="ranking-nombre">${c.nombre}</span>
          <span class="ranking-monto">${formatearMoneda(c.total)}</span>
        </div>`
      ).join("")
    : `<small class="texto-vacio">Sin ventas despachadas en este período.</small>`;

  return `
    <div class="reporte-card">
      <div class="reporte-card-header">
        <h3>${titulo}</h3>
        ${subtitulo ? `<span class="reporte-subtitulo">${subtitulo}</span>` : ""}
      </div>
      <div class="reporte-totales">
        <div class="reporte-total-item">
          <span>Ventas totales</span>
          <strong class="text-ganancia-positiva">${formatearMoneda(resumen.ingresoTotal)}</strong>
        </div>
      </div>
      <div class="reporte-ranking">
        <h4>Top caseras</h4>
        ${filasRanking}
      </div>
    </div>
  `;
}

export function renderReportes() {
  const contenedor = document.getElementById("reportes-grid");
  if (!contenedor) return;

  const cicloActivo = resumenCicloEnVivo();
  const cicloActivoConDespachados = { ...cicloActivo, pedidos: pedidosDespachados(cicloActivo.pedidos) };

  const ultimos7 = resumenDeCiclosCerrados(historialDentroDe(7));
  const ultimos30 = resumenDeCiclosCerrados(historialDentroDe(30));
  const todoElHistorico = resumenDeCiclosCerrados(state.historial);

  contenedor.innerHTML = [
    tarjetaResumen("Ciclo actual (en curso)", cicloActivoConDespachados, "Aún no se cierra"),
    tarjetaResumen("Últimos 7 días", ultimos7, "Ciclos cerrados"),
    tarjetaResumen("Últimos 30 días", ultimos30, "Ciclos cerrados"),
    tarjetaResumen("Histórico completo", todoElHistorico, `${state.historial.length} ciclo(s) archivado(s)`)
  ].join("");
}
