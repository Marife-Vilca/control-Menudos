
export function formatearCantidad(num) {
  return Math.floor(num).toString();
}

export function formatearDecimal(num, decimales = 2) {
  const n = Number(num) || 0;
  return n.toFixed(decimales);
}

export function formatearMoneda(num) {
  const n = Number(num) || 0;
  return `S/ ${n.toFixed(2)}`;
}

export function generarId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export function hoyISO() {
  return new Date().toISOString().split("T")[0];
}

export function horaActual() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fechaActual() {
  return new Date().toLocaleDateString();
}

export function normalizarNombre(nombre) {
  return (nombre || "").trim().toLowerCase().replace(/\s+/g, " ");
}

const PALABRAS_A_NUMERO = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15, dieciseis: 16, dieciséis: 16,
  diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
  veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22, veintidós: 22,
  veintitres: 23, veintitrés: 23, veinticuatro: 24, veinticinco: 25,
  veintiseis: 26, veintiséis: 26, veintisiete: 27, veintiocho: 28,
  veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50,
  sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100
};

export function textoANumero(texto) {
  if (!texto) return null;
  const limpio = texto.toLowerCase().trim();

  const soloDigitos = limpio.match(/\d+([.,]\d+)?/);
  if (soloDigitos) return parseFloat(soloDigitos[0].replace(",", "."));

  const palabras = limpio
    .normalize("NFC")
    .replace(/[^a-záéíóúñ\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  if (palabras.length === 0) return null;

  let total = 0;
  let decenaPendiente = 0;
  let encontrado = false;

  for (const palabra of palabras) {
    if (palabra === "y") continue;

    const valor = PALABRAS_A_NUMERO[palabra];
    if (valor === undefined) continue;

    encontrado = true;
    if (valor >= 20 && valor % 10 === 0 && valor < 100) {
      decenaPendiente = valor;
    } else if (decenaPendiente > 0 && valor < 10) {
      total += decenaPendiente + valor;
      decenaPendiente = 0;
    } else {
      total += valor;
    }
  }

  total += decenaPendiente;
  return encontrado ? total : null;
}

export function campoVozHTML({
  tipo = "text",
  id = "",
  clase = "",
  placeholder = "",
  modoVoz = "texto",
  ariaLabel = "Dictar por voz",
  attrs = "",
  valor = ""
} = {}) {
  const idAttr = id ? `id="${id}"` : "";
  const claseAttr = clase ? `class="${clase}"` : "";
  const placeholderAttr = placeholder ? `placeholder="${placeholder}"` : "";
  const valorAttr = valor !== "" && valor !== null && valor !== undefined ? `value="${valor}"` : "";

  return `
    <div class="campo-voz">
      <input type="${tipo}" ${idAttr} ${claseAttr} ${placeholderAttr} ${valorAttr} ${attrs}>
      <div class="acciones-voz">
        <button type="button" class="btn-voz" data-modo="${modoVoz}" aria-label="${ariaLabel}">
          <i class="fa-solid fa-microphone"></i>
        </button>
        <button type="button" class="btn-leer" aria-label="Escuchar lo escrito">
          <i class="fa-solid fa-volume-high"></i>
        </button>
      </div>
    </div>
  `;
}
