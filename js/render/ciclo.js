
import { state, getCicloActual, cerrarCicloActivo } from '../state.js';

const NOMBRES_CICLO = {
  LUNES_MARTES: "Lunes / Martes",
  MIERCOLES_JUEVES: "Miércoles / Jueves",
  VIERNES_SABADO: "Viernes / Sábado",
  DOMINGO: "Domingo"
};

export function configurarCierreCiclo(onChange) {
  const boton = document.getElementById("btn-cerrar-ciclo");
  if (!boton) return;

  boton.addEventListener("click", () => {
    const ciclo = getCicloActual();
    const pendientes = ciclo.pedidos.filter((p) => !p.despachado).length;
    const nombreCiclo = NOMBRES_CICLO[state.diaActivo] || state.diaActivo;

    let mensaje = `¿Cerrar y archivar el ciclo "${nombreCiclo}"?\n\nEsto reinicia el inventario, los lotes y los tiques para poder ingresar el siguiente lote.`;
    if (pendientes > 0) {
      mensaje += `\n\n⚠ Hay ${pendientes} tique(s) SIN despachar. Si cierras ahora, quedarán guardados en el historial tal como están, pero no podrás seguir editándolos.`;
    }

    if (!confirm(mensaje)) return;

    cerrarCicloActivo();
    onChange();
    alert(`Ciclo "${nombreCiclo}" archivado correctamente. Ya puedes ingresar el nuevo lote.`);
  });
}
