import { state } from './state.js';
import { generarId, normalizarNombre, fechaActual, horaActual } from './utils.js';

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function redondear(valor) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

function asegurarSemana() {
  if (!state.semana) {
    state.semana = { entregas: [], tiques: [], historial: [], contadorTique: 1 };
  }
  return state.semana;
}

export function getSemana() {
  return asegurarSemana();
}

/** Fecha local en formato AAAA-MM-DD (sin desfase por zona horaria). */
export function fechaLocalISO(fecha = new Date()) {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** "2026-10-05" -> "lunes 05/10" */
export function etiquetaDiaFecha(fechaISO) {
  const [anio, mes, dia] = String(fechaISO).split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return `${DIAS_SEMANA[fecha.getDay()]} ${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
}

export function sumarEntregas(entregas) {
  return redondear(entregas.reduce((suma, e) => suma + (Number(e.monto) || 0), 0));
}

function ordenarEntregas(entregas) {
  return entregas.slice().sort((a, b) => a.fechaISO.localeCompare(b.fechaISO) || a.id - b.id);
}

/** Total, pagado y saldo de una cuenta: una sola fórmula para formulario, tique y pagos. */
export function calcularCuenta({ totalEntregas = 0, deudaAnterior = 0, montoPagado = 0 }) {
  const totalCuenta = redondear((Number(totalEntregas) || 0) + (Number(deudaAnterior) || 0));
  const pagado = redondear(Math.min(Number(montoPagado) || 0, totalCuenta));
  return { totalCuenta, pagado, saldoACuenta: redondear(totalCuenta - pagado) };
}

/* ---------- Entregas (cuenta abierta de cada casera) ---------- */

export function agregarEntrega({ casera, fechaISO, monto }) {
  const semana = asegurarSemana();
  const entrega = { id: generarId(), casera: casera.trim(), fechaISO, monto: redondear(monto) };
  semana.entregas.push(entrega);
  return entrega;
}

export function eliminarEntrega(entregaId) {
  const semana = asegurarSemana();
  semana.entregas = semana.entregas.filter((e) => e.id !== entregaId);
}

export function getCuentasAbiertas() {
  const mapa = {};

  asegurarSemana().entregas.forEach((entrega) => {
    const clave = normalizarNombre(entrega.casera);
    if (!mapa[clave]) mapa[clave] = { clave, nombre: entrega.casera, entregas: [] };
    mapa[clave].entregas.push(entrega);
  });

  return Object.values(mapa)
    .map((cuenta) => {
      const entregas = ordenarEntregas(cuenta.entregas);
      return { ...cuenta, entregas, total: sumarEntregas(entregas) };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export function buscarCuentaAbierta(clave) {
  return getCuentasAbiertas().find((c) => c.clave === clave) || null;
}

/* ---------- Tiques de la semana ---------- */

function todosLosTiques() {
  const semana = asegurarSemana();
  return [...semana.tiques, ...semana.historial.flatMap((periodo) => periodo.tiques)];
}

export function buscarTiqueSemanaPorId(id) {
  return todosLosTiques().find((t) => t.id === id) || null;
}

export function sugerirDeudaAnteriorSemana(nombreCasera) {
  const clave = normalizarNombre(nombreCasera);
  if (!clave) return { monto: 0, origenes: [] };

  const pendientes = todosLosTiques().filter(
    (t) => !t.resuelto && t.saldoACuenta > 0 && normalizarNombre(t.casera) === clave
  );

  return {
    monto: redondear(pendientes.reduce((suma, t) => suma + t.saldoACuenta, 0)),
    origenes: pendientes.map((t) => ({ id: t.id, saldo: t.saldoACuenta }))
  };
}

/** Convierte las entregas abiertas de una casera en su tique (la "cuenta" de la semana). */
export function sacarCuentaSemana({ clave, deudaAnterior, origenes, montoPagado }) {
  const semana = asegurarSemana();
  const cuenta = buscarCuentaAbierta(clave);
  if (!cuenta) return null;

  const { totalCuenta, pagado, saldoACuenta } = calcularCuenta({
    totalEntregas: cuenta.total,
    deudaAnterior,
    montoPagado
  });

  const tique = {
    id: semana.contadorTique++,
    fecha: fechaActual(),
    hora: horaActual(),
    casera: cuenta.nombre,
    entregas: cuenta.entregas.map(({ id, fechaISO, monto }) => ({ id, fechaISO, monto })),
    deudaAnterior: redondear(deudaAnterior),
    origenes: origenes || [],
    totalCuenta,
    montoPagado: pagado,
    saldoACuenta,
    resuelto: saldoACuenta === 0
  };

  semana.tiques.push(tique);
  semana.entregas = semana.entregas.filter((e) => normalizarNombre(e.casera) !== clave);

  // La deuda anterior incluida en este tique reemplaza a los tiques viejos que la originaron.
  tique.origenes.forEach((origen) => {
    const anterior = buscarTiqueSemanaPorId(origen.id);
    if (anterior) {
      anterior.saldoACuenta = 0;
      anterior.resuelto = true;
    }
  });

  return tique;
}

/** Deshace "sacar cuenta": las entregas vuelven a la cuenta abierta y la deuda anterior se restaura. */
export function reabrirCuentaSemana(tiqueId) {
  const semana = asegurarSemana();
  const tique = semana.tiques.find((t) => t.id === tiqueId);
  if (!tique) return false;

  tique.entregas.forEach((e) => semana.entregas.push({ ...e, casera: tique.casera }));

  tique.origenes.forEach((origen) => {
    const anterior = buscarTiqueSemanaPorId(origen.id);
    if (anterior) {
      anterior.saldoACuenta = origen.saldo;
      anterior.resuelto = origen.saldo === 0;
    }
  });

  semana.tiques = semana.tiques.filter((t) => t.id !== tiqueId);
  return true;
}

export function registrarPagoSemana(tiqueId, monto) {
  const tique = buscarTiqueSemanaPorId(tiqueId);
  if (!tique) return;

  tique.montoPagado = redondear(Math.min(tique.totalCuenta, tique.montoPagado + (Number(monto) || 0)));
  tique.saldoACuenta = redondear(tique.totalCuenta - tique.montoPagado);
  tique.resuelto = tique.saldoACuenta === 0;
}

export function cerrarSemana() {
  const semana = asegurarSemana();
  if (semana.tiques.length === 0) return false;

  semana.historial.push({
    id: generarId(),
    fechaCierre: new Date().toISOString(),
    tiques: semana.tiques
  });
  semana.tiques = [];
  return true;
}

export function getDeudoresSemana() {
  const mapa = {};

  todosLosTiques().forEach((t) => {
    if (t.saldoACuenta <= 0) return;
    const clave = normalizarNombre(t.casera);
    if (!mapa[clave]) mapa[clave] = { nombre: t.casera, saldoTotal: 0, tiques: [] };
    mapa[clave].saldoTotal = redondear(mapa[clave].saldoTotal + t.saldoACuenta);
    mapa[clave].tiques.push(t);
  });

  return Object.values(mapa).sort((a, b) => b.saldoTotal - a.saldoTotal);
}
