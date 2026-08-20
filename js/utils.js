// =============================================================
// UTILS: helpers puros reutilizados por el resto de módulos
// =============================================================

export function formatearCantidad(num) {
  return Math.floor(num).toString();
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

/**
 * Convierte un texto hablado en español a un número entero.
 * Soporta dígitos directos ("20") y números en palabras ("veinte", "treinta y cinco").
 * Retorna null si no logra interpretar ningún número.
 */
export function textoANumero(texto) {
  if (!texto) return null;
  const limpio = texto.toLowerCase().trim();

  const soloDigitos = limpio.match(/\d+/);
  if (soloDigitos) return parseInt(soloDigitos[0], 10);

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
