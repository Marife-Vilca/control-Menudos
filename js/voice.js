// =============================================================
// COMPONENTE DE VOZ: permite dictar números y texto por micrófono
// Pensado para personas con baja visión que se confunden al
// escribir manualmente números o letras.
//
// Marcado esperado en el HTML:
//   <div class="campo-voz">
//     <input type="text" ...>
//     <button type="button" class="btn-voz" data-modo="texto" aria-label="Dictar por voz">
//       <i class="fa-solid fa-microphone"></i>
//     </button>
//   </div>
//
// data-modo="numero"  -> interpreta lo dictado como una cantidad
// data-modo="texto"   -> coloca el texto dictado tal cual
// =============================================================
import { textoANumero } from './utils.js';

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

export function soportaReconocimientoVoz() {
  return !!SpeechRecognitionAPI;
}

function dispararEventosDeCambio(input) {
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function crearReconocedor() {
  const reconocedor = new SpeechRecognitionAPI();
  reconocedor.lang = "es-PE";
  reconocedor.continuous = false;
  reconocedor.interimResults = false;
  reconocedor.maxAlternatives = 1;
  return reconocedor;
}

function iniciarReconocimiento(input, modo, boton) {
  const reconocedor = crearReconocedor();

  boton.classList.add("escuchando");
  boton.setAttribute("aria-label", "Escuchando, hable ahora");

  reconocedor.onresult = (evento) => {
    const transcripcion = evento.results[0][0].transcript;

    if (modo === "numero") {
      const numero = textoANumero(transcripcion);
      if (numero !== null) {
        input.value = numero;
      } else {
        alert(`No se entendió un número. Escuché: "${transcripcion}"`);
      }
    } else {
      input.value = transcripcion.trim();
    }

    dispararEventosDeCambio(input);
    input.focus();
  };

  reconocedor.onerror = (evento) => {
    if (evento.error === "no-speech") return;
    if (evento.error === "not-allowed" || evento.error === "service-not-allowed") {
      alert("El navegador no tiene permiso para usar el micrófono.");
    }
  };

  reconocedor.onend = () => {
    boton.classList.remove("escuchando");
    boton.setAttribute("aria-label", "Dictar por voz");
  };

  try {
    reconocedor.start();
  } catch (e) {
    boton.classList.remove("escuchando");
  }
}

function manejarClicBotonVoz(boton) {
  const campo = boton.closest(".campo-voz");
  const input = campo ? campo.querySelector("input") : null;
  if (!input) return;

  const modo = boton.dataset.modo === "numero" ? "numero" : "texto";
  iniciarReconocimiento(input, modo, boton);
}

/**
 * Inicializa el dictado por voz para toda la aplicación.
 * Usa delegación de eventos: funciona también con botones .btn-voz
 * que se agreguen dinámicamente después (filas de lote, pedido, modal, etc).
 */
export function inicializarVoz() {
  if (!soportaReconocimientoVoz()) {
    document.body.classList.add("voz-no-disponible");
    return;
  }

  document.addEventListener("click", (evento) => {
    const boton = evento.target.closest(".btn-voz");
    if (boton) manejarClicBotonVoz(boton);
  });
}
