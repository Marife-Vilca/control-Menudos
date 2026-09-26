
import { state, inicializarStockProductos, recalcularTodoElStock } from './state.js';
import { guardarEnLocalStorage, cargarDeLocalStorage } from './storage.js';
import { inicializarVoz } from './voice.js';
import { inicializarLectura } from './tts.js';
import { inicializarNavegacion } from './views.js';

import { renderHeader } from './render/header.js';
import { renderProductos, configurarCatalogo } from './render/productos.js';
import { renderPrecios, configurarPrecios } from './render/precios.js';
import { renderLotes, configurarLotes } from './render/lotes.js';
import { renderCalidad, configurarCalidad } from './render/calidad.js';
import { configurarPedidos } from './render/pedidos.js';
import { renderStock } from './render/stock.js';
import { renderTickets, configurarTickets } from './render/tickets.js';
import { configurarModal } from './render/modal.js';
import { configurarCierreCiclo } from './render/ciclo.js';
import { renderReportes } from './render/reportes.js';
import { renderVentaDelDia, renderDeudoresModal, configurarVentaDia } from './render/ventaDia.js';
import { renderCompras, renderProveedoresModal, configurarCompras } from './render/comprasProveedores.js';

function actualizarInterfaz() {
  recalcularTodoElStock();
  guardarEnLocalStorage();

  renderHeader();
  renderProductos();
  renderPrecios();
  renderLotes();
  renderCalidad();
  renderStock();
  renderTickets();
  renderReportes();

  renderVentaDelDia();
  renderDeudoresModal();
  renderCompras();
  renderProveedoresModal();
}

function configurarSelectorDia() {
  const selectDia = document.getElementById("select-dia-operativo");
  selectDia.value = state.diaActivo;
  selectDia.addEventListener("change", (evento) => {
    state.diaActivo = evento.target.value;
    inicializarStockProductos();
    actualizarInterfaz();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  cargarDeLocalStorage();
  inicializarStockProductos();
  recalcularTodoElStock();

  inicializarVoz();
  inicializarLectura();
  inicializarNavegacion();
  configurarSelectorDia();

  configurarCatalogo(actualizarInterfaz);
  configurarPrecios(actualizarInterfaz);
  configurarLotes(actualizarInterfaz);
  configurarCalidad(actualizarInterfaz);
  configurarPedidos(actualizarInterfaz);
  configurarTickets(actualizarInterfaz);
  configurarModal(actualizarInterfaz);
  configurarCierreCiclo(actualizarInterfaz);
  configurarVentaDia(actualizarInterfaz);
  configurarCompras(actualizarInterfaz);

  actualizarInterfaz();
});
