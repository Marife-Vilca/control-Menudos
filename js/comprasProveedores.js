
import { state } from './state.js';
import { generarId, normalizarNombre, hoyISO, horaActual, fechaActual } from './utils.js';

function asegurarCompras() {
  if (!state.comprasProveedores) state.comprasProveedores = { fecha: hoyISO(), compras: [] };
  if (!state.historialCompras) state.historialCompras = [];
  if (state.ticketCounterCompra === undefined) state.ticketCounterCompra = 1;
  return state.comprasProveedores;
}

export function getComprasProveedores() {
  return asegurarCompras();
}

function todasLasCompras() {
  asegurarCompras();
  return [...state.comprasProveedores.compras, ...state.historialCompras.flatMap((dia) => dia.compras)];
}

export function buscarCompraPorId(id) {
  return todasLasCompras().find((c) => c.id === id) || null;
}

export function crearCompraProveedor({ proveedor, items, adelanto }) {
  const compras = asegurarCompras();

  const total = items.reduce((suma, item) => suma + (Number(item.subtotal) || 0), 0);
  const adelantoNum = Math.min(Number(adelanto) || 0, total);
  const saldoPorPagar = Math.max(0, total - adelantoNum);

  const compra = {
    id: state.ticketCounterCompra++,
    fecha: fechaActual(),
    fechaISO: hoyISO(),
    hora: horaActual(),
    proveedor: proveedor.trim(),
    items,
    total,
    adelanto: adelantoNum,
    pagosAdicionales: 0,
    saldoPorPagar,
    pagado: saldoPorPagar === 0
  };

  compras.compras.push(compra);
  return compra;
}

export function registrarPagoProveedor(compraId, monto) {
  const compra = buscarCompraPorId(compraId);
  if (!compra) return;

  const abono = Number(monto) || 0;
  compra.pagosAdicionales += abono;
  compra.saldoPorPagar = Math.max(0, compra.total - compra.adelanto - compra.pagosAdicionales);
  compra.pagado = compra.saldoPorPagar === 0;
}

export function eliminarCompraProveedor(compraId) {
  const compras = asegurarCompras();
  compras.compras = compras.compras.filter((c) => c.id !== compraId);
}

export function cerrarComprasDelDia() {
  const compras = asegurarCompras();
  if (compras.compras.length === 0) return false;

  state.historialCompras.push({
    id: generarId(),
    fecha: compras.fecha,
    fechaCierre: new Date().toISOString(),
    compras: compras.compras
  });

  state.comprasProveedores = { fecha: hoyISO(), compras: [] };
  return true;
}

export function getProveedoresConSaldo() {
  const mapa = {};

  todasLasCompras().forEach((c) => {
    if (c.saldoPorPagar <= 0) return;
    const clave = normalizarNombre(c.proveedor);
    if (!mapa[clave]) mapa[clave] = { nombre: c.proveedor, saldoTotal: 0, compras: [] };
    mapa[clave].saldoTotal += c.saldoPorPagar;
    mapa[clave].compras.push(c);
  });

  return Object.values(mapa).sort((a, b) => b.saldoTotal - a.saldoTotal);
}
