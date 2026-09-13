
const VISTA_POR_DEFECTO = "inicio";

function activarVista(nombreVista) {
  document.querySelectorAll(".vista").forEach((seccion) => {
    seccion.classList.toggle("vista-activa", seccion.dataset.vista === nombreVista);
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("nav-link-activo", link.dataset.vista === nombreVista);
  });

  document.getElementById("app-contenido").scrollTo({ top: 0, behavior: "instant" });
}

function cerrarMenu() {
  document.getElementById("nav-drawer").classList.remove("abierto");
  document.getElementById("nav-overlay").classList.remove("visible");
}

function abrirMenu() {
  document.getElementById("nav-drawer").classList.add("abierto");
  document.getElementById("nav-overlay").classList.add("visible");
}

export function inicializarNavegacion() {
  document.getElementById("btn-abrir-menu").addEventListener("click", abrirMenu);
  document.getElementById("btn-cerrar-menu").addEventListener("click", cerrarMenu);
  document.getElementById("nav-overlay").addEventListener("click", cerrarMenu);

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      activarVista(link.dataset.vista);
      cerrarMenu();
    });
  });

  activarVista(VISTA_POR_DEFECTO);
}
