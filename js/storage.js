// =============================================================
// PERSISTENCIA EN LOCALSTORAGE
// =============================================================
import { state } from './state.js';

const CLAVE_ESTADO = "mifrufely_state_v3";
const CLAVE_ESTADO_LEGACY = "mifrufely_state_v2";
const CLAVE_CONTADOR_LEGACY = "mifrufely_ticketCounter";

export function guardarEnLocalStorage() {
  localStorage.setItem(CLAVE_ESTADO, JSON.stringify(state));
}

export function cargarDeLocalStorage() {
  const dataGuardada = localStorage.getItem(CLAVE_ESTADO) || localStorage.getItem(CLAVE_ESTADO_LEGACY);

  if (dataGuardada) {
    try {
      const parsedState = JSON.parse(dataGuardada);
      Object.assign(state, parsedState);
    } catch (e) {
      console.error("Error al leer datos guardados:", e);
    }
  }

  // Compatibilidad con versiones antiguas que guardaban el contador aparte
  if (state.ticketCounter === undefined) {
    const counterGuardado = localStorage.getItem(CLAVE_CONTADOR_LEGACY);
    state.ticketCounter = counterGuardado ? (parseInt(counterGuardado, 10) || 1) : 1;
  }
}
