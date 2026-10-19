/* ==========================================================
   BPC 360 · Menú inferior compartido (Andrés)

   Cómo usarlo en cualquier página:

     1) Pon esto al final del <main> (dentro de .bpc-app):
          <nav class="bpc-nav" data-bpc-nav aria-label="Navegación principal"></nav>

     2) Carga el script antes del cierre del <body>:
          <script src="js/nav.js"></script>

   Dibuja los 4 enlaces del menú y marca solo el de la página actual
   (aria-current="page"). Si agregas una página nueva, añádela en la
   lista ITEMS de abajo y listo: aparece en todas las pantallas.
   ========================================================== */

(function () {
  'use strict';

  const ITEMS = [
    {
      href: 'index.html',
      texto: 'Inicio',
      paginas: ['index.html'],
      icono: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"></path>'
    },
    {
      href: 'diagnostico.html',
      texto: 'Diagnóstico',
      paginas: ['diagnostico.html'],
      icono: '<path d="M9 5h10M9 12h10M9 19h10M4 5h1M4 12h1M4 19h1"></path>'
    },
    {
      href: 'modulo-sms.html',
      texto: 'Módulos',
      // la simulación es parte del módulo SMS
      paginas: ['modulo-sms.html', 'simulacion.html'],
      icono: '<path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z"></path><path d="M8 7h6"></path>'
    },
    {
      href: 'progreso.html',
      texto: 'Progreso',
      paginas: ['progreso.html'],
      icono: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"></path>'
    }
  ];

  function paginaActual() {
    const partes = window.location.pathname.split('/');
    const ultima = partes[partes.length - 1];
    // "/" o "/bpc-360/" sirven index.html
    return (ultima === '' ? 'index.html' : ultima).toLowerCase();
  }

  function dibujar(contenedor) {
    const actual = paginaActual();

    ITEMS.forEach(function (item) {
      const enlace = document.createElement('a');
      enlace.href = item.href;
      enlace.innerHTML =
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        item.icono + '</svg>';

      const etiqueta = document.createElement('span');
      etiqueta.textContent = item.texto;
      enlace.appendChild(etiqueta);

      if (item.paginas.indexOf(actual) !== -1) {
        enlace.setAttribute('aria-current', 'page');
      }
      contenedor.appendChild(enlace);
    });
  }

  function iniciar() {
    const contenedores = document.querySelectorAll('[data-bpc-nav]');
    contenedores.forEach(function (contenedor) {
      contenedor.innerHTML = '';
      dibujar(contenedor);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
