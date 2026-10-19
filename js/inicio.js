/* ==========================================================
   BPC 360 · Lógica de la pantalla de inicio (Andrés)

   Lee el progreso guardado (js/storage.js) y ajusta la pantalla:
   - Muestra el puntaje en el encabezado
   - Si ya hizo el diagnóstico: cambia el botón y muestra su nivel
   - Si ya completó el módulo SMS: marca la tarjeta como "Completado"
   ========================================================== */

(function () {
  'use strict';

  const BPC = window.BPC;
  if (!BPC) return; // sin storage.js la pantalla queda en su estado inicial

  const $ = function (id) { return document.getElementById(id); };

  const ETIQUETA_NIVEL = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto' };

  // Puntaje
  const puntaje = BPC.getPuntaje();
  $('ini-puntos').textContent = String(puntaje);
  $('ini-puntos-enlace').setAttribute('aria-label', 'Ver mi progreso: ' + puntaje + ' puntos');

  // Diagnóstico
  const nivel = BPC.getDiagnostico();
  if (nivel) {
    $('ini-cta').textContent = 'Repetir diagnóstico';
    $('ini-nivel').textContent = 'Tu nivel de riesgo: ' + ETIQUETA_NIVEL[nivel];
    $('ini-nivel').hidden = false;
  }

  // Módulo SMS completado
  if (BPC.tieneInsignia('detector-fraudes')) {
    $('ini-modulo-sms').classList.add('ini-modulo--completado');
    $('ini-modulo-sms-estado').textContent = 'Completado';
  }
})();