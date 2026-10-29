import { formatearMoneda } from '../utils.js';
import {
  getSemana,
  fechaLocalISO,
  etiquetaDiaFecha,
  agregarEntrega,
  eliminarEntrega,
  getCuentasAbiertas,
  buscarCuentaAbierta,
  buscarTiqueSemanaPorId,
  sugerirDeudaAnteriorSemana,
  sacarCuentaSemana,
  reabrirCuentaSemana,
  registrarPagoSemana,
  cerrarSemana,
  getDeudoresSemana,
  calcularCuenta
} from '../semana.js';
import { descargarTiqueSemanaPDF, compartirTiqueSemanaPDF } from '../pdfSemana.js';
import { leerTexto } from '../tts.js';

const MODALES = ["modal-sacar-cuenta", "modal-deudores-semana"];

function abrirModal(idModal) {
  document.getElementById(idModal).classList.add("abierto");
}

function cerrarModal(idModal) {
  document.getElementById(idModal).classList.remove("abierto");
}

function escaparHTML(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function montoHTML(valor) {
  return `<span class="tv-monto"><span>S/</span><span>${Number(valor).toFixed(2)}</span></span>`;
}

function tvFila(etiqueta, valor, extraClase = "", accionHTML = "") {
  return `<div class="tv-fila ${extraClase}"><span class="tv-etiqueta">${etiqueta}</span>${montoHTML(valor)}${accionHTML}</div>`;
}

/* ---------- Tablero ---------- */

function renderCuentaAbiertaCard(cuenta) {
  const filas = cuenta.entregas
    .map((e) => {
      const quitar = `<button type="button" class="btn-quitar-entrega" data-action="quitar-entrega" data-id="${e.id}" aria-label="Quitar entrega"><i class="fa-solid fa-xmark"></i></button>`;
      return tvFila(etiquetaDiaFecha(e.fechaISO), e.monto, "tv-producto tv-entrega", quitar);
    })
    .join("");

  return `
    <div class="kfc-ticket ticket-venta ticket-semana-abierta">
      <div class="ticket-top">
        <div class="ticket-number"><span>CUENTA ABIERTA</span></div>
        <div class="ticket-customer"><i class="fa-solid fa-user"></i> ${escaparHTML(cuenta.nombre)}</div>
      </div>
      <div class="ticket-body">
        ${filas}
        <div class="tv-separador"></div>
        <div class="tv-totales">${tvFila("Total", cuenta.total, "tv-negrita")}</div>
      </div>
      <div class="ticket-footer">
        <div class="ticket-footer-secundario">
          <button type="button" class="btn-primary btn-sm" data-action="sacar-cuenta" data-clave="${escaparHTML(cuenta.clave)}">
            <i class="fa-solid fa-file-invoice-dollar"></i> Sacar cuenta
          </button>
        </div>
      </div>
    </div>`;
}

function renderTiqueSemanaCard(tique) {
  const filas = tique.entregas
    .map((e) => tvFila(etiquetaDiaFecha(e.fechaISO), e.monto, "tv-producto"))
    .join("");

  const badge = tique.saldoACuenta > 0
    ? `<span class="status-badge status-bad">DEBE ${formatearMoneda(tique.saldoACuenta)}</span>`
    : `<span class="status-badge status-ok">PAGADO</span>`;

  const subtotal = tique.totalCuenta - tique.deudaAnterior;

  return `
    <div class="kfc-ticket ticket-venta ${tique.saldoACuenta === 0 ? "ticket-despachado" : ""}">
      <div class="ticket-top">
        <div class="ticket-number">
          <span>CUENTA #${tique.id.toString().padStart(3, "0")}</span>
          <span class="ticket-time">${tique.fecha} · ${tique.hora}</span>
        </div>
        <div class="ticket-customer"><i class="fa-solid fa-user"></i> ${escaparHTML(tique.casera)}</div>
      </div>
      <div class="ticket-body">
        ${filas}
        <div class="tv-separador"></div>
        <div class="tv-totales">
          ${tique.deudaAnterior > 0 ? tvFila("Subtotal", subtotal) + tvFila("+ Deuda anterior", tique.deudaAnterior) : ""}
          ${tique.deudaAnterior > 0 ? '<div class="tv-separador"></div>' : ""}
          ${tvFila("Total", tique.totalCuenta, "tv-negrita")}
          ${tvFila("Pagado", tique.montoPagado)}
        </div>
      </div>
      <div class="ticket-footer">
        <div class="ticket-footer-top">${badge}</div>
        <div class="ticket-footer-secundario">
          ${tique.saldoACuenta > 0 ? `<button class="btn-secondary btn-sm" data-action="pagar-cuenta" data-id="${tique.id}"><i class="fa-solid fa-hand-holding-dollar"></i> Pago</button>` : ""}
          <button class="btn-secondary btn-sm" data-action="reabrir-cuenta" data-id="${tique.id}" title="Reabrir (corregir entregas)"><i class="fa-solid fa-rotate-left"></i></button>
          <button class="btn-secondary btn-sm" data-action="pdf-cuenta" data-id="${tique.id}" title="Descargar PDF"><i class="fa-solid fa-file-pdf"></i></button>
          <button class="btn-secondary btn-sm" data-action="whatsapp-cuenta" data-id="${tique.id}" title="Enviar PDF por WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
          <button class="btn-secondary btn-sm btn-escuchar-ticket" data-action="escuchar-cuenta" data-id="${tique.id}" title="Escuchar"><i class="fa-solid fa-volume-high"></i></button>
        </div>
      </div>
    </div>`;
}

export function renderSemana() {
  const contenedor = document.getElementById("semana-tickets-grid");
  if (!contenedor) return;

  const abiertas = getCuentasAbiertas();
  const tiques = getSemana().tiques;

  if (abiertas.length === 0 && tiques.length === 0) {
    contenedor.innerHTML = `
      <div class="estado-vacio-tickets">
        <i class="fa-solid fa-calendar-week"></i>
        <p>Aún no hay entregas esta semana.</p>
      </div>`;
    return;
  }

  contenedor.innerHTML =
    abiertas.map(renderCuentaAbiertaCard).join("") +
    tiques.slice().reverse().map(renderTiqueSemanaCard).join("");
}

export function renderDeudoresSemanaModal() {
  const contenedor = document.getElementById("deudores-semana-lista");
  if (!contenedor) return;

  const deudores = getDeudoresSemana();

  if (deudores.length === 0) {
    contenedor.innerHTML = `<p class="texto-vacio">No hay caseras con saldo pendiente. 🎉</p>`;
    return;
  }

  contenedor.innerHTML = deudores
    .map(
      (d) => `
      <div class="deudor-card">
        <div class="deudor-header">
          <span class="deudor-nombre"><i class="fa-solid fa-user"></i> ${escaparHTML(d.nombre)}</span>
          <span class="deudor-saldo">${formatearMoneda(d.saldoTotal)}</span>
        </div>
        <div class="deudor-tiques">
          ${d.tiques
            .map(
              (t) => `
              <div class="deudor-tique-fila">
                <span>#${t.id.toString().padStart(3, "0")} · ${t.fecha}</span>
                <span>${formatearMoneda(t.saldoACuenta)}</span>
                <div class="deudor-tique-acciones">
                  <button class="btn-secondary btn-sm" data-action="pagar-cuenta" data-id="${t.id}" title="Registrar pago">
                    <i class="fa-solid fa-hand-holding-dollar"></i>
                  </button>
                  <button class="btn-secondary btn-sm" data-action="pdf-cuenta" data-id="${t.id}" title="Descargar PDF de esta cuenta">
                    <i class="fa-solid fa-file-pdf"></i>
                  </button>
                </div>
              </div>`
            )
            .join("")}
        </div>
      </div>`
    )
    .join("");
}

/* ---------- Acciones ---------- */

function construirTextoCuenta(tique) {
  const detalle = tique.entregas.map((e) => `${etiquetaDiaFecha(e.fechaISO)}, ${formatearMoneda(e.monto)}`).join("; ");
  let texto = `Cuenta de ${tique.casera}. Entregas: ${detalle}.`;
  if (tique.deudaAnterior > 0) texto += ` Deuda anterior: ${formatearMoneda(tique.deudaAnterior)}.`;
  texto += ` Total: ${formatearMoneda(tique.totalCuenta)}.`;
  texto += tique.saldoACuenta > 0 ? ` Falta: ${formatearMoneda(tique.saldoACuenta)}.` : " Pagado completo.";
  return texto;
}

function pedirPago(tique, onChange) {
  const monto = prompt(
    `Registrar pago de ${tique.casera} (falta: ${formatearMoneda(tique.saldoACuenta)}):`,
    tique.saldoACuenta.toFixed(2)
  );
  if (monto === null) return;

  const valor = parseFloat(monto);
  if (isNaN(valor) || valor <= 0) {
    alert("Ingrese un monto válido mayor a 0.");
    return;
  }
  registrarPagoSemana(tique.id, valor);
  onChange();
}

function manejarAccionSemana(evento, onChange, abrirSacarCuenta) {
  const boton = evento.target.closest("[data-action]");
  if (!boton) return;

  const accion = boton.dataset.action;

  if (accion === "sacar-cuenta") {
    abrirSacarCuenta(boton.dataset.clave);
    return;
  }

  const id = Number(boton.dataset.id);

  if (accion === "quitar-entrega") {
    if (confirm("¿Quitar esta entrega?")) {
      eliminarEntrega(id);
      onChange();
    }
    return;
  }

  const tique = buscarTiqueSemanaPorId(id);
  if (!tique) return;

  switch (accion) {
    case "pagar-cuenta":
      pedirPago(tique, onChange);
      break;
    case "reabrir-cuenta":
      if (confirm("¿Reabrir esta cuenta? Las entregas vuelven a la cuenta abierta para corregirlas.\n\nSi ya registraste pagos en este tique, se pierden.")) {
        reabrirCuentaSemana(id);
        onChange();
      }
      break;
    case "pdf-cuenta":
      descargarTiqueSemanaPDF(id);
      break;
    case "whatsapp-cuenta":
      compartirTiqueSemanaPDF(id);
      break;
    case "escuchar-cuenta":
      leerTexto(construirTextoCuenta(tique), boton);
      break;
  }
}

/* ---------- Modal "Sacar cuenta" ---------- */

function configurarModalSacarCuenta(onChange) {
  const refs = {
    titulo: document.getElementById("sc-titulo"),
    resumen: document.getElementById("sc-resumen"),
    deuda: document.getElementById("sc-deuda"),
    ayuda: document.getElementById("sc-deuda-ayuda"),
    pagado: document.getElementById("sc-pagado"),
    total: document.getElementById("sc-total"),
    saldo: document.getElementById("sc-saldo")
  };

  let cuentaActual = null;
  let origenes = [];

  function actualizarTotales() {
    const { totalCuenta, saldoACuenta } = calcularCuenta({
      totalEntregas: cuentaActual ? cuentaActual.total : 0,
      deudaAnterior: parseFloat(refs.deuda.value),
      montoPagado: parseFloat(refs.pagado.value)
    });
    refs.total.textContent = formatearMoneda(totalCuenta);
    refs.saldo.textContent = formatearMoneda(saldoACuenta);
    refs.saldo.classList.toggle("saldo-pendiente", saldoACuenta > 0);
  }

  function abrir(clave) {
    cuentaActual = buscarCuentaAbierta(clave);
    if (!cuentaActual) return;

    const sugerida = sugerirDeudaAnteriorSemana(cuentaActual.nombre);
    origenes = sugerida.origenes;

    refs.titulo.textContent = cuentaActual.nombre;
    refs.resumen.innerHTML = cuentaActual.entregas
      .map((e) => tvFila(etiquetaDiaFecha(e.fechaISO), e.monto, "tv-producto"))
      .join("");
    refs.deuda.value = sugerida.monto > 0 ? sugerida.monto.toFixed(2) : 0;
    refs.ayuda.textContent = sugerida.monto > 0
      ? `${cuentaActual.nombre} debe ${formatearMoneda(sugerida.monto)} de cuentas anteriores (editable).`
      : "";
    refs.pagado.value = 0;

    actualizarTotales();
    abrirModal("modal-sacar-cuenta");
  }

  [refs.deuda, refs.pagado].forEach((input) => input.addEventListener("input", actualizarTotales));

  document.getElementById("form-sacar-cuenta").addEventListener("submit", (evento) => {
    evento.preventDefault();
    if (!cuentaActual) return;

    sacarCuentaSemana({
      clave: cuentaActual.clave,
      deudaAnterior: parseFloat(refs.deuda.value) || 0,
      origenes,
      montoPagado: parseFloat(refs.pagado.value) || 0
    });

    cuentaActual = null;
    cerrarModal("modal-sacar-cuenta");
    onChange();
  });

  document.getElementById("btn-cancelar-sacar-cuenta").addEventListener("click", () => cerrarModal("modal-sacar-cuenta"));

  return abrir;
}

/* ---------- Configuración ---------- */

export function configurarSemana(onChange) {
  const form = document.getElementById("form-entrega-semana");
  const inputCasera = document.getElementById("semana-casera");
  const inputFecha = document.getElementById("semana-fecha");
  const inputMonto = document.getElementById("semana-monto");

  inputFecha.value = fechaLocalISO();

  form.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const casera = inputCasera.value.trim();
    const monto = parseFloat(inputMonto.value);

    if (!casera) {
      alert("Ingrese el nombre de la casera.");
      return;
    }
    if (!monto || monto <= 0) {
      alert("Ingrese el monto de la entrega.");
      return;
    }
    if (!inputFecha.value) {
      alert("Elija la fecha de la entrega.");
      return;
    }

    agregarEntrega({ casera, fechaISO: inputFecha.value, monto });

    inputCasera.value = "";
    inputMonto.value = "";
    inputCasera.focus();
    onChange();
  });

  const abrirSacarCuenta = configurarModalSacarCuenta(onChange);

  document.getElementById("semana-tickets-grid").addEventListener("click", (evento) => manejarAccionSemana(evento, onChange, abrirSacarCuenta));
  document.getElementById("deudores-semana-lista").addEventListener("click", (evento) => manejarAccionSemana(evento, onChange, abrirSacarCuenta));

  document.getElementById("btn-abrir-deudores-semana").addEventListener("click", () => {
    renderDeudoresSemanaModal();
    abrirModal("modal-deudores-semana");
  });
  document.getElementById("btn-cerrar-modal-deudores-semana").addEventListener("click", () => cerrarModal("modal-deudores-semana"));

  MODALES.forEach((idModal) => {
    document.getElementById(idModal).addEventListener("click", (evento) => {
      if (evento.target.id === idModal) cerrarModal(idModal);
    });
  });

  document.getElementById("btn-cerrar-semana").addEventListener("click", () => {
    const { tiques } = getSemana();
    const pendientes = tiques.filter((t) => t.saldoACuenta > 0).length;
    const abiertas = getCuentasAbiertas().length;

    let mensaje = "¿Cerrar el Día? Se archivarán las cuentas del tablero para empezar uno nuevo.";
    if (pendientes > 0) mensaje += `\n\n⚠ Hay ${pendientes} cuenta(s) con saldo pendiente. Seguirán apareciendo en "Deudores" hasta que se cobren.`;
    if (abiertas > 0) mensaje += `\n\nLas ${abiertas} cuenta(s) abiertas (sin sacar cuenta) se conservan.`;
    if (!confirm(mensaje)) return;

    if (!cerrarSemana()) {
      alert("No hay cuentas sacadas para cerrar.");
      return;
    }
    onChange();
    alert("Día cerrado y archivado correctamente.");
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") MODALES.forEach(cerrarModal);
  });
}
