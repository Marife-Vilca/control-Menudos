
import { state } from './state.js';
import { generarId, normalizarNombre, hoyISO, horaActual, fechaActual } from './utils.js';

function asegurarVentaDelDia() {
  if (!state.ventaDelDia) state.ventaDelDia = { fecha: hoyISO(), tiques: [] };
  if (!state.historialVentaDia) state.historialVentaDia = [];
  if (state.ticketCounterVenta === undefined) state.ticketCounterVenta = 1;
  return state.ventaDelDia;
}

export function getVentaDelDia() {
  return asegurarVentaDelDia();
}

function todosLosTiquesVenta() {
  asegurarVentaDelDia();
  return [...state.ventaDelDia.tiques, ...state.historialVentaDia.flatMap((dia) => dia.tiques)];
}

export function buscarTiqueVentaPorId(id) {
  return todosLosTiquesVenta().find((t) => t.id === id) || null;
}

export function sugerirDeudaAnterior(nombreCasera) {
  const clave = normalizarNombre(nombreCasera);
  if (!clave) return { monto: 0, origenIds: [] };

  const pendientes = todosLosTiquesVenta().filter(
    (t) => !t.resuelto && t.saldoACuenta > 0 && normalizarNombre(t.casera) === clave
  );

  return {
    monto: pendientes.reduce((suma, t) => suma + t.saldoACuenta, 0),
    origenIds: pendientes.map((t) => t.id)
  };
}

export function crearTiqueVenta({ casera, items, pasaje, deudaAnterior, deudaAnteriorOrigenIds, montoPagado }) {
  const ventaDelDia = asegurarVentaDelDia();

  const totalItems = items.reduce((suma, item) => suma + (Number(item.subtotal) || 0), 0);
  const totalCuenta = totalItems + (Number(pasaje) || 0) + (Number(deudaAnterior) || 0);
  const pagado = Math.min(Number(montoPagado) || 0, totalCuenta);
  const saldoACuenta = Math.max(0, totalCuenta - pagado);

  const tique = {
    id: state.ticketCounterVenta++,
    fecha: fechaActual(),
    fechaISO: hoyISO(),
    hora: horaActual(),
    casera: casera.trim(),
    items,
    pasaje: Number(pasaje) || 0,
    deudaAnterior: Number(deudaAnterior) || 0,
    totalCuenta,
    montoPagado: pagado,
    saldoACuenta,
    resuelto: saldoACuenta === 0
  };

  ventaDelDia.tiques.push(tique);

 (deudaAnteriorOrigenIds || []).forEach((idOrigen) => {
    const origen = buscarTiqueVentaPorId(idOrigen);
    if (origen) {
      origen.resuelto = true;
      origen.saldoACuenta = 0;
    }
  });

  return tique;
}

export function registrarPagoVenta(tiqueId, monto) {
  const tique = buscarTiqueVentaPorId(tiqueId);
  if (!tique) return;

  const abono = Number(monto) || 0;
  tique.montoPagado = Math.min(tique.totalCuenta, tique.montoPagado + abono);
  tique.saldoACuenta = Math.max(0, tique.totalCuenta - tique.montoPagado);
  tique.resuelto = tique.saldoACuenta === 0;
}

export function eliminarTiqueVenta(tiqueId) {
  const ventaDelDia = asegurarVentaDelDia();
  ventaDelDia.tiques = ventaDelDia.tiques.filter((t) => t.id !== tiqueId);
}

export function cerrarVentaDelDia() {
  const ventaDelDia = asegurarVentaDelDia();
  if (ventaDelDia.tiques.length === 0) return false;

  state.historialVentaDia.push({
    id: generarId(),
    fecha: ventaDelDia.fecha,
    fechaCierre: new Date().toISOString(),
    tiques: ventaDelDia.tiques
  });

  state.ventaDelDia = { fecha: hoyISO(), tiques: [] };
  return true;
}

export function getDeudores() {
  const mapa = {};

  todosLosTiquesVenta().forEach((t) => {
    if (t.saldoACuenta <= 0) return;
    const clave = normalizarNombre(t.casera);
    if (!mapa[clave]) mapa[clave] = { nombre: t.casera, saldoTotal: 0, tiques: [] };
    mapa[clave].saldoTotal += t.saldoACuenta;
    mapa[clave].tiques.push(t);
  });

  return Object.values(mapa).sort((a, b) => b.saldoTotal - a.saldoTotal);
}
