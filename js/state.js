// =============================================================
// ESTADO GLOBAL DE LA APLICACIÓN Y ESTRUCTURA POR DÍAS/CICLOS
// =============================================================
import { generarId, normalizarNombre } from './utils.js';

function crearCicloVacio() {
  return {
    totalMenudosVaca: 0,
    totalMenudosToro: 0,
    stock: {},
    pedidos: [],
    lotesHistorico: [],
    calidadHistorico: []
  };
}

export const state = {
  diaActivo: "LUNES_MARTES", // LUNES_MARTES | MIERCOLES_JUEVES | VIERNES_SABADO | DOMINGO
  ticketCounter: 1,
  productos: [
    { nombre: "higado", rendimiento: 1, tipoPrecio: "unidad", precio: 0 },
    { nombre: "bofe", rendimiento: 1, tipoPrecio: "unidad", precio: 0 },
    { nombre: "mondongo", rendimiento: 1, tipoPrecio: "kilo", precio: 0 },
    { nombre: "pata", rendimiento: 4, tipoPrecio: "unidad", precio: 0 },
    { nombre: "corazon", rendimiento: 1, tipoPrecio: "unidad", precio: 0 }
  ],
  ciclos: {
    LUNES_MARTES: crearCicloVacio(),
    MIERCOLES_JUEVES: crearCicloVacio(),
    VIERNES_SABADO: crearCicloVacio(),
    DOMINGO: crearCicloVacio()
  },
  // Catálogo de clientes (caseras) con precios especiales por producto.
  // Persiste siempre, no se borra al cerrar/reiniciar un ciclo.
  // clave = nombre normalizado (minúsculas, sin espacios extra)
  clientes: {},
  // Ciclos ya cerrados/archivados (ver cerrarCicloActivo). No se pierden al reiniciar.
  historial: []
};

// ---------------------------------------------------------------
// Ciclo activo
// ---------------------------------------------------------------

export function getCicloActual() {
  if (!state.ciclos[state.diaActivo]) {
    state.ciclos[state.diaActivo] = crearCicloVacio();
  }
  const ciclo = state.ciclos[state.diaActivo];
  if (!ciclo.calidadHistorico) ciclo.calidadHistorico = [];
  if (!ciclo.lotesHistorico) ciclo.lotesHistorico = [];
  if (!ciclo.pedidos) ciclo.pedidos = [];
  return ciclo;
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

// ---------------------------------------------------------------
// Precios: base por producto + precios especiales por casera
// ---------------------------------------------------------------

function getOrCrearCliente(nombreCasera) {
  const clave = normalizarNombre(nombreCasera);
  if (!clave) return null;
  if (!state.clientes[clave]) {
    state.clientes[clave] = { nombre: nombreCasera.trim(), precios: {} };
  }
  return state.clientes[clave];
}

/** Devuelve el precio a cobrar: el especial de la casera si existe, si no el precio base del producto. */
export function getPrecioProducto(nombreCasera, nombreProducto) {
  const producto = state.productos.find((p) => p.nombre === nombreProducto);
  const base = producto ? Number(producto.precio) || 0 : 0;

  const clave = normalizarNombre(nombreCasera);
  const cliente = clave ? state.clientes[clave] : null;
  if (cliente && cliente.precios && cliente.precios[nombreProducto] !== undefined) {
    return Number(cliente.precios[nombreProducto]) || 0;
  }
  return base;
}

export function tienePrecioEspecial(nombreCasera, nombreProducto) {
  const clave = normalizarNombre(nombreCasera);
  const cliente = clave ? state.clientes[clave] : null;
  return !!(cliente && cliente.precios && cliente.precios[nombreProducto] !== undefined);
}

export function setPrecioEspecial(nombreCasera, nombreProducto, precio) {
  const cliente = getOrCrearCliente(nombreCasera);
  if (!cliente) return;
  cliente.precios[nombreProducto] = Number(precio) || 0;
}

export function eliminarPrecioEspecial(nombreCasera, nombreProducto) {
  const clave = normalizarNombre(nombreCasera);
  const cliente = state.clientes[clave];
  if (cliente && cliente.precios) delete cliente.precios[nombreProducto];
}

// ---------------------------------------------------------------
// Cierre / archivado de ciclo
// ---------------------------------------------------------------

function calcularTotalesCiclo(ciclo) {
  let ingresoTotal = 0;
  ciclo.pedidos.forEach((pedido) => {
    if (!pedido.despachado) return;
    pedido.items.forEach((item) => {
      ingresoTotal += Number(item.subtotal) || 0;
    });
  });

  const costoTotal = (ciclo.lotesHistorico || []).reduce(
    (suma, lote) => suma + (Number(lote.costoTotal) || 0),
    0
  );

  return { ingresoTotal, costoTotal, ganancia: ingresoTotal - costoTotal };
}

export function resumenCicloEnVivo() {
  const ciclo = getCicloActual();
  return { ...calcularTotalesCiclo(ciclo), pedidos: ciclo.pedidos };
}

/**
 * Archiva el ciclo activo en el historial (para reportes) y lo reinicia
 * en blanco para poder recibir el lote del siguiente día de matanza.
 * Los precios especiales por casera NO se ven afectados: viven en
 * state.clientes, fuera del ciclo.
 */
export function cerrarCicloActivo() {
  const ciclo = getCicloActual();
  const totales = calcularTotalesCiclo(ciclo);

  state.historial.push({
    id: generarId(),
    diaTipo: state.diaActivo,
    fechaCierre: new Date().toISOString(),
    totalMenudosVaca: ciclo.totalMenudosVaca,
    totalMenudosToro: ciclo.totalMenudosToro,
    lotesHistorico: ciclo.lotesHistorico,
    calidadHistorico: ciclo.calidadHistorico,
    pedidos: ciclo.pedidos,
    ...totales
  });

  const cicloNuevo = crearCicloVacio();
  state.productos.forEach((p) => {
    cicloNuevo.stock[p.nombre] = { vaca: 0, toro: 0 };
  });
  state.ciclos[state.diaActivo] = cicloNuevo;
}
