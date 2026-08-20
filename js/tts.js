// =============================================================
// COMPONENTE DE LECTURA EN VOZ ALTA (Text-to-Speech)
// Permite escuchar lo escrito en un campo, o un texto armado
// a partir de datos (ej. el resumen de un tique).
// Pensado para personas con baja visión.
// =============================================================

export function soportaLecturaVoz() {
  return "speechSynthesis" in window;
}

/**
 * Lee un texto en voz alta. Si se pasa un botón, le agrega la
 * clase "leyendo" mientras dura la lectura (para dar feedback visual).
 */
export function leerTexto(texto, boton = null) {
  if (!soportaLecturaVoz() || !texto) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = "es-PE";
  utterance.rate = 0.95;

  if (boton) {
    boton.classList.add("leyendo");
    utterance.onend = () => boton.classList.remove("leyendo");
    utterance.onerror = () => boton.classList.remove("leyendo");
  }

  window.speechSynthesis.speak(utterance);
}

function manejarClicBotonLeer(boton) {
  const campo = boton.closest(".campo-voz");
  const input = campo ? campo.querySelector("input") : null;
  if (!input) return;

  const texto = input.value ? input.value.toString().trim() : "";
  if (!texto) {
    leerTexto("Este campo está vacío.");
    return;
  }

  leerTexto(texto, boton);
}

/**
 * Inicializa la lectura en voz alta para toda la app.
 * Usa delegación de eventos: funciona también con botones .btn-leer
 * que se agreguen dinámicamente después (filas de lote, pedido, modal).
 * Los botones "Escuchar Pedido" de los tiques se manejan aparte
 * (en render/tickets.js) porque leen datos, no un input.
 */
export function inicializarLectura() {
  if (!soportaLecturaVoz()) {
    document.body.classList.add("lectura-no-disponible");
    return;
  }

  document.addEventListener("click", (evento) => {
    const boton = evento.target.closest(".btn-leer");
    if (boton) manejarClicBotonLeer(boton);
  });
}
