
import { state, getCicloActual, getStockBaseCiclo } from '../state.js';
import { formatearCantidad, formatearMoneda } from '../utils.js';
import { descargarTicketPDF, exportarReporteDiaPDF } from '../pdf.js';
import { leerTexto } from '../tts.js';
import { abrirModalEditarPedido } from './modal.js';

function calcularStockSimulado(ciclo) {
  return getStockBaseCiclo(ciclo);
}

function totalTicket(ticket) {
  return ticket.items.reduce((suma, item) => suma + (Number(item.subtotal) || 0), 0);
}

function construirTextoTicket(ticket) {
  const detalleItems = ticket.items
    .map((it) => `${it.cant} ${it.prod} de ${it.tipo}`)
    .join(", ");
  return `Pedido de ${ticket.casera}. Lleva: ${detalleItems}. Total a cobrar: ${formatearMoneda(totalTicket(ticket))}.`;
}

function renderItemsTicket(ticket, stockSimulado) {
  let html = "";
  let todoAlcanza = true;

  ticket.items.forEach((item) => {
    const disponible = stockSimulado[item.prod] ? stockSimulado[item.prod][item.tipo] : 0;
    let badgeHtml;

    if (ticket.despachado) {
      badgeHtml = `<span class="status-badge status-entregado">ENTREGADO</span>`;
    } else if (disponible >= item.cant) {
      stockSimulado[item.prod][item.tipo] -= item.cant;
      badgeHtml = `<span class="status-badge status-ok">OK</span>`;
    } else {
      todoAlcanza = false;
      badgeHtml = `<span class="status-badge status-bad">Falta (${formatearCantidad(disponible)})</span>`;
      if (stockSimulado[item.prod]) stockSimulado[item.prod][item.tipo] = 0;
    }

    const claseTipo = item.tipo === "vaca" ? "type-vaca" : "type-toro";
    const detalleCantidad = item.peso ? `${item.peso} kg` : formatearCantidad(item.cant);

    html += `
      <div class="ticket-item">
        <div>
          <span class="item-qty">${detalleCantidad}</span>
          <span>${item.prod.toUpperCase()}</span>
          <span class="type-tag ${claseTipo}">${item.tipo}</span>
        </div>
        <div class="ticket-item-derecha">
          <span class="ticket-item-subtotal">${formatearMoneda(item.subtotal)}</span>
          ${badgeHtml}
        </div>
      </div>
    `;
  });

  return { html, todoAlcanza };
}

function renderTicket(ticket, stockSimulado) {
  const { html: itemsHtml, todoAlcanza } = renderItemsTicket(ticket, stockSimulado);

  const botonEditar = !ticket.despachado
    ? `<button class="btn-secondary btn-sm btn-editar-ticket" data-action="editar-pedido" data-id="${ticket.id}">
         <i class="fa-solid fa-pen-to-square"></i>
       </button>`
    : "";

  const botonDespacho = ticket.despachado
    ? `<button class="btn-secondary btn-sm btn-reabrir" data-action="reabrir" data-id="${ticket.id}">
         <i class="fa-solid fa-rotate-left"></i> Reabrir Ticket
       </button>`
    : `<button class="btn-complete-ticket btn-sm" data-action="despachar" data-id="${ticket.id}">Despachar</button>`;

  const etiquetaEstado = ticket.despachado
    ? `<span class="estado-label estado-despachado">✔ DESPACHADO</span>`
    : `<span class="estado-label ${todoAlcanza ? "estado-completable" : "estado-falta"}">
         ${todoAlcanza ? "✔ COMPLETABLE" : "✖ FALTA STOCK"}
       </span>`;

  const claseDespachado = ticket.despachado ? "ticket-despachado" : "";

  return `
    <div class="kfc-ticket ${claseDespachado}">
      <div class="ticket-top">
        <div class="ticket-number">
          <span>TICKET #${ticket.id.toString().padStart(3, "0")}</span>
          <span class="ticket-time">${ticket.hora}</span>
        </div>
        <div class="ticket-customer"><i class="fa-solid fa-user"></i> ${ticket.casera}</div>
      </div>
      <div class="ticket-body">${itemsHtml}</div>
      <div class="ticket-total-linea">
        <span>Total del pedido</span>
        <strong>${formatearMoneda(totalTicket(ticket))}</strong>
      </div>
      <div class="ticket-footer">
        <div class="ticket-footer-top">
          ${etiquetaEstado}
          <div class="ticket-footer-botones">
            ${botonEditar}
            ${botonDespacho}
          </div>
        </div>
        <div class="ticket-footer-secundario">
          <button class="btn-secondary btn-sm" data-action="descargar-ticket" data-id="${ticket.id}">
            <i class="fa-solid fa-file-pdf"></i> PDF
          </button>
          <button class="btn-secondary btn-sm btn-escuchar-ticket" data-action="escuchar-ticket" data-id="${ticket.id}">
            <i class="fa-solid fa-volume-high"></i> Escuchar
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderTickets() {
  const contenedor = document.getElementById("tickets-grid");
  if (!contenedor) return;

  const ciclo = getCicloActual();

  if (ciclo.pedidos.length === 0) {
    contenedor.innerHTML = `
      <div class="estado-vacio-tickets">
        <i class="fa-solid fa-receipt"></i>
        <p>No hay pedidos en el ciclo ${state.diaActivo}.</p>
      </div>`;
    return;
  }

  const stockSimulado = calcularStockSimulado(ciclo);
  contenedor.innerHTML = ciclo.pedidos.map((ticket) => renderTicket(ticket, stockSimulado)).join("");
}

function despacharTicket(ticketId) {
  const ciclo = getCicloActual();
  const ticket = ciclo.pedidos.find((t) => t.id === ticketId);

  if (ticket && !ticket.despachado) {
    ticket.despachado = true;
    ticket.fechaDespacho =
      new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
}

function reabrirTicket(ticketId) {
  const ciclo = getCicloActual();
  const ticket = ciclo.pedidos.find((t) => t.id === ticketId);

  if (ticket && ticket.despachado) {
    ticket.despachado = false;
    delete ticket.fechaDespacho;
  }
}

export function configurarTickets(onChange) {
  document.getElementById("tickets-grid").addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-action]");
    if (!boton) return;

    const ticketId = Number(boton.dataset.id);

    switch (boton.dataset.action) {
      case "despachar":
        despacharTicket(ticketId);
        onChange();
        break;
      case "reabrir":
        reabrirTicket(ticketId);
        onChange();
        break;
      case "editar-pedido":
        abrirModalEditarPedido(ticketId);
        break;
      case "descargar-ticket":
        descargarTicketPDF(ticketId);
        break;
      case "escuchar-ticket": {
        const ciclo = getCicloActual();
        const ticket = ciclo.pedidos.find((t) => t.id === ticketId);
        if (ticket) leerTexto(construirTextoTicket(ticket), boton);
        break;
      }
    }
  });

  document.getElementById("btn-export-pdf-dia").addEventListener("click", () => {
    exportarReporteDiaPDF();
  });
}
