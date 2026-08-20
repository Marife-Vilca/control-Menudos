// =============================================================
// ESTADO GLOBAL DE LA APLICACIÓN Y ESTRUCTURA POR DÍAS/CICLOS
// =============================================================

function crearCicloVacio() {
  return {
    totalMenudosVaca: 0,
    totalMenudosToro: 0,
    stock: {},
    pedidos: [],
    entregados: [],
    lotesHistorico: [],
    calidadHistorico: []
  };
}

export const state = {
  diaActivo: "LUNES_MARTES", // LUNES_MARTES | MIERCOLES_JUEVES | VIERNES_SABADO | DOMINGO
  ticketCounter: 1,
  productos: [
    { nombre: "higado", rendimiento: 1 },
    { nombre: "bofe", rendimiento: 1 },
    { nombre: "mondongo", rendimiento: 1 },
    { nombre: "pata", rendimiento: 4 },
    { nombre: "corazon", rendimiento: 1 }
  ],
  ciclos: {
    LUNES_MARTES: crearCicloVacio(),
    MIERCOLES_JUEVES: crearCicloVacio(),
    VIERNES_SABADO: crearCicloVacio(),
    DOMINGO: crearCicloVacio()
  }
};

// Helper para obtener la referencia directa del ciclo activo
export function getCicloActual() {
  if (!state.ciclos[state.diaActivo]) {
    state.ciclos[state.diaActivo] = crearCicloVacio();
  }
  if (!state.ciclos[state.diaActivo].calidadHistorico) {
    state.ciclos[state.diaActivo].calidadHistorico = [];
  }
  return state.ciclos[state.diaActivo];
}

export function inicializarStockProductos() {
  Object.keys(state.ciclos).forEach((diaKey) => {
    const ciclo = state.ciclos[diaKey];
    if (!ciclo.stock) ciclo.stock = {};
    if (!ciclo.calidadHistorico) ciclo.calidadHistorico = [];
    state.productos.forEach((p) => {
      if (!ciclo.stock[p.nombre]) {
        ciclo.stock[p.nombre] = { vaca: 0, toro: 0 };
      }
    });
  });
}

export function recalcularTodoElStock() {
  Object.keys(state.ciclos).forEach((diaKey) => {
    const ciclo = state.ciclos[diaKey];

    let sumVaca = 0;
    let sumToro = 0;

    ciclo.stock = {};
    state.productos.forEach((p) => {
      ciclo.stock[p.nombre] = { vaca: 0, toro: 0 };
    });

    // 1. Sumar ingresos por lotes
    (ciclo.lotesHistorico || []).forEach((lote) => {
      sumVaca += lote.cantVaca || 0;
      sumToro += lote.cantToro || 0;

      state.productos.forEach((p) => {
        ciclo.stock[p.nombre].vaca += (lote.cantVaca || 0) * p.rendimiento;
        ciclo.stock[p.nombre].toro += (lote.cantToro || 0) * p.rendimiento;
      });
    });

    ciclo.totalMenudosVaca = sumVaca;
    ciclo.totalMenudosToro = sumToro;

    // 2. Descontar mermas de calidad
    (ciclo.calidadHistorico || []).forEach((reg) => {
      if (ciclo.stock[reg.prod] && ciclo.stock[reg.prod][reg.tipo] !== undefined) {
        ciclo.stock[reg.prod][reg.tipo] = Math.max(0, ciclo.stock[reg.prod][reg.tipo] - reg.cant);
      }
    });

    // 3. Descontar todos los pedidos (creados y despachados)
    (ciclo.pedidos || []).forEach((p) => {
      p.items.forEach((it) => {
        if (ciclo.stock[it.prod] && ciclo.stock[it.prod][it.tipo] !== undefined) {
          ciclo.stock[it.prod][it.tipo] = Math.max(0, ciclo.stock[it.prod][it.tipo] - it.cant);
        }
      });
    });
  });
}
