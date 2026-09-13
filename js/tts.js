
export function soportaLecturaVoz() {
  return "speechSynthesis" in window;
}

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
