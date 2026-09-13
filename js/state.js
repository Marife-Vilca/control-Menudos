
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
  diaActivo: "LUNES_MARTES", 
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

  clientes: {},
  
  historial: []
};

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

function calcularStockBase(ciclo) {
  const stockBase = {};
  state.productos.forEach((p) => {
    stockBase[p.nombre] = { vaca: 0, toro: 0 };
  });

  let sumVaca = 0;
  let sumToro = 0;

  (ciclo.lotesHistorico || []).forEach((lote) => {
    sumVaca += lote.cantVaca || 0;
    sumToro += lote.cantToro || 0;

    state.productos.forEach((p) => {
      stockBase[p.nombre].vaca += (lote.cantVaca || 0) * p.rendimiento;
      stockBase[p.nombre].toro += (lote.cantToro || 0) * p.rendimiento;
    });
  });

  (ciclo.calidadHistorico || []).forEach((reg) => {
    if (stockBase[reg.prod] && stockBase[reg.prod][reg.tipo] !== undefined) {
      stockBase[reg.prod][reg.tipo] = Math.max(0, stockBase[reg.prod][reg.tipo] - reg.cant);
    }
  });

  return { stockBase, sumVaca, sumToro };
}

export function getStockBaseCiclo(ciclo) {
  return calcularStockBase(ciclo).stockBase;
}

export function recalcularTodoElStock() {
  Object.keys(state.ciclos).forEach((diaKey) => {
    const ciclo = state.ciclos[diaKey];
    const { stockBase, sumVaca, sumToro } = calcularStockBase(ciclo);

    ciclo.totalMenudosVaca = sumVaca;
    ciclo.totalMenudosToro = sumToro;


    ciclo.stock = JSON.parse(JSON.stringify(stockBase));
    (ciclo.pedidos || []).forEach((p) => {
      p.items.forEach((it) => {
        if (ciclo.stock[it.prod] && ciclo.stock[it.prod][it.tipo] !== undefined) {
          ciclo.stock[it.prod][it.tipo] = Math.max(0, ciclo.stock[it.prod][it.tipo] - it.cant);
        }
      });
    });
  });
}

function getOrCrearCliente(nombreCasera) {
  const clave = normalizarNombre(nombreCasera);
  if (!clave) return null;
  if (!state.clientes[clave]) {
    state.clientes[clave] = { nombre: nombreCasera.trim(), precios: {} };
  }
  return state.clientes[clave];
}

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

function calcularTotalesCiclo(ciclo) {
  let ingresoTotal = 0;
  ciclo.pedidos.forEach((pedido) => {
    if (!pedido.despachado) return;
    pedido.items.forEach((item) => {
      ingresoTotal += Number(item.subtotal) || 0;
    });
  });

  return { ingresoTotal };
}

export function resumenCicloEnVivo() {
  const ciclo = getCicloActual();
  return { ...calcularTotalesCiclo(ciclo), pedidos: ciclo.pedidos };
}

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
