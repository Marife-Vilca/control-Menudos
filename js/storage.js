
import { state } from './state.js';

const CLAVE_ESTADO = "mifrufely_state_v4";
const CLAVES_LEGACY = ["mifrufely_state_v3", "mifrufely_state_v2"];
const CLAVE_CONTADOR_LEGACY = "mifrufely_ticketCounter";

export function guardarEnLocalStorage() {
  localStorage.setItem(CLAVE_ESTADO, JSON.stringify(state));
}

function migrarEstado(parsedState) {
  if (!parsedState.productos) parsedState.productos = [];
  parsedState.productos.forEach((p) => {
    if (p.tipoPrecio === undefined) p.tipoPrecio = "unidad";
    if (p.precio === undefined) p.precio = 0;
  });

  if (!parsedState.clientes) parsedState.clientes = {};
  if (!parsedState.historial) parsedState.historial = [];

  Object.values(parsedState.ciclos || {}).forEach((ciclo) => {
    if (!ciclo.lotesHistorico) ciclo.lotesHistorico = [];

    if (!ciclo.pedidos) ciclo.pedidos = [];
    ciclo.pedidos.forEach((pedido) => {
      (pedido.items || []).forEach((item) => {
        if (item.precioUnitario === undefined) item.precioUnitario = 0;
        if (item.peso === undefined) item.peso = null;
        if (item.subtotal === undefined) {
          item.subtotal = item.peso !== null ? item.precioUnitario * item.peso : item.precioUnitario * item.cant;
        }
      });
    });

    delete ciclo.entregados;
  });

  return parsedState;
}

export function cargarDeLocalStorage() {
  let dataGuardada = localStorage.getItem(CLAVE_ESTADO);
  if (!dataGuardada) {
    for (const claveVieja of CLAVES_LEGACY) {
      dataGuardada = localStorage.getItem(claveVieja);
      if (dataGuardada) break;
    }
  }

  if (dataGuardada) {
    try {
      const parsedState = migrarEstado(JSON.parse(dataGuardada));
      Object.assign(state, parsedState);
    } catch (e) {
      console.error("Error al leer datos guardados:", e);
    }
  }

  if (state.ticketCounter === undefined) {
    const counterGuardado = localStorage.getItem(CLAVE_CONTADOR_LEGACY);
    state.ticketCounter = counterGuardado ? (parseInt(counterGuardado, 10) || 1) : 1;
  }
}
