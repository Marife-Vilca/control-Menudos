// =============================================================
// COMPONENTE: Inventario disponible del día/ciclo activo
// =============================================================
import { state, getCicloActual } from '../state.js';
import { formatearCantidad } from '../utils.js';

function generarFilasMercaderia(ciclo, tipo) {
  return state.productos
    .map((p) => {
      const cantidad = ciclo.stock[p.nombre] ? ciclo.stock[p.nombre][tipo] : 0;
      return `
        <div class="stock-fila">
          <span class="nombre-producto">${p.nombre.toUpperCase()}</span>
          <span class="cantidad-producto">${formatearCantidad(cantidad)}</span>
        </div>
      `;
    })
    .join("");
}

function tarjetaStock({ titulo, icono, total, claseTexto, claseBadge, filasHTML }) {
  return `
    <div class="stock-card-item">
      <div class="stock-card-title ${claseTexto}">
        <span><i class="fa-solid ${icono}"></i> ${titulo}</span>
        <span class="badge-total ${claseBadge}">${total} Menudo(s)</span>
      </div>
      <div class="stock-card-body">${filasHTML}</div>
    </div>
  `;
}

export function renderStock() {
  const contenedor = document.getElementById("stock-cards-grid");
  if (!contenedor) return;

  const ciclo = getCicloActual();

  const cardVaca = tarjetaStock({
    titulo: `MERCADERÍA VACA (${state.diaActivo})`,
    icono: "fa-cow",
    total: ciclo.totalMenudosVaca,
    claseTexto: "text-vaca",
    claseBadge: "badge-total-vaca",
    filasHTML: generarFilasMercaderia(ciclo, "vaca")
  });

  const cardToro = tarjetaStock({
    titulo: `MERCADERÍA TORO (${state.diaActivo})`,
    icono: "fa-bullhorn",
    total: ciclo.totalMenudosToro,
    claseTexto: "text-toro",
    claseBadge: "badge-total-toro",
    filasHTML: generarFilasMercaderia(ciclo, "toro")
  });

  contenedor.innerHTML = cardVaca + cardToro;
}
