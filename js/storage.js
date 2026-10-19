/* ==========================================================
   BPC 360 · Progreso compartido (Andrés)

   Guarda y lee el avance del usuario en localStorage. Todas las
   páginas que necesiten leer o guardar progreso usan ESTE archivo:

     <script src="js/storage.js"></script>

   y después llaman a las funciones de window.BPC. Nadie debe leer
   ni escribir localStorage directamente (así todos usamos las mismas
   claves y el mismo formato).

   Claves que se guardan
     bpc_diagnostico → "bajo" | "medio" | "alto"
     bpc_puntaje     → número entero (puntos totales)
     bpc_insignias   → lista JSON de ids, por ejemplo ["detector-fraudes"]

   Funciones
     BPC.getDiagnostico()        → "bajo" | "medio" | "alto" | null
     BPC.setDiagnostico(nivel)   → guarda el nivel (ignora valores inválidos)
     BPC.getPuntaje()            → número (0 si no hay nada)
     BPC.sumarPuntos(n)          → suma n puntos y devuelve el total nuevo
     BPC.getInsignias()          → lista de ids ganados
     BPC.tieneInsignia(id)       → true / false
     BPC.ganarInsignia(id)       → true si era nueva, false si ya la tenía
     BPC.getProgreso()           → { diagnostico, puntaje, insignias }
     BPC.reiniciar()             → borra todo el progreso

   Insignias que existen (ids)
     detector-fraudes  → se gana al terminar el módulo SMS / WhatsApp
     escaner-seguro    → módulo QR (próximamente)
     red-protegida     → módulo WiFi (próximamente)
     La lista con sus nombres está en BPC.INSIGNIAS.

   Si localStorage no está disponible (modo privado, datos bloqueados)
   la app sigue funcionando: el progreso vive solo mientras la página
   siga abierta.
   ========================================================== */

(function () {
  'use strict';

  const CLAVES = {
    diagnostico: 'bpc_diagnostico',
    puntaje: 'bpc_puntaje',
    insignias: 'bpc_insignias'
  };

  const NIVELES = ['bajo', 'medio', 'alto'];

  const INSIGNIAS = {
    'detector-fraudes': 'Detector de fraudes',
    'escaner-seguro': 'Escáner seguro',
    'red-protegida': 'Red protegida'
  };

  /* ---------- Acceso seguro a localStorage ---------- */

  const memoria = {}; // respaldo si localStorage falla

  function leer(clave) {
    try {
      return window.localStorage.getItem(clave);
    } catch (e) {
      return Object.prototype.hasOwnProperty.call(memoria, clave) ? memoria[clave] : null;
    }
  }

  function escribir(clave, valor) {
    memoria[clave] = valor;
    try {
      window.localStorage.setItem(clave, valor);
    } catch (e) {
      /* se queda en memoria */
    }
  }

  function borrar(clave) {
    delete memoria[clave];
    try {
      window.localStorage.removeItem(clave);
    } catch (e) {
      /* nada que borrar */
    }
  }

  /* ---------- Diagnóstico ---------- */

  function getDiagnostico() {
    const valor = leer(CLAVES.diagnostico);
    return NIVELES.indexOf(valor) !== -1 ? valor : null;
  }

  function setDiagnostico(nivel) {
    if (NIVELES.indexOf(nivel) === -1) return false;
    escribir(CLAVES.diagnostico, nivel);
    return true;
  }

  /* ---------- Puntaje ---------- */

  function getPuntaje() {
    const numero = parseInt(leer(CLAVES.puntaje), 10);
    return Number.isFinite(numero) && numero > 0 ? numero : 0;
  }

  function sumarPuntos(cantidad) {
    const n = Math.trunc(Number(cantidad));
    if (!Number.isFinite(n) || n <= 0) return getPuntaje();
    const total = getPuntaje() + n;
    escribir(CLAVES.puntaje, String(total));
    return total;
  }

  /* ---------- Insignias ---------- */

  function getInsignias() {
    try {
      const lista = JSON.parse(leer(CLAVES.insignias) || '[]');
      return Array.isArray(lista) ? lista.filter(function (id) { return typeof id === 'string'; }) : [];
    } catch (e) {
      return [];
    }
  }

  function tieneInsignia(id) {
    return getInsignias().indexOf(id) !== -1;
  }

  function ganarInsignia(id) {
    if (typeof id !== 'string' || id === '') return false;
    const lista = getInsignias();
    if (lista.indexOf(id) !== -1) return false;
    lista.push(id);
    escribir(CLAVES.insignias, JSON.stringify(lista));
    return true;
  }

  /* ---------- Conjunto ---------- */

  function getProgreso() {
    return {
      diagnostico: getDiagnostico(),
      puntaje: getPuntaje(),
      insignias: getInsignias()
    };
  }

  function reiniciar() {
    borrar(CLAVES.diagnostico);
    borrar(CLAVES.puntaje);
    borrar(CLAVES.insignias);
  }

  /* ---------- API pública ---------- */

  window.BPC = window.BPC || {};
  Object.assign(window.BPC, {
    CLAVES: CLAVES,
    INSIGNIAS: INSIGNIAS,
    getDiagnostico: getDiagnostico,
    setDiagnostico: setDiagnostico,
    getPuntaje: getPuntaje,
    sumarPuntos: sumarPuntos,
    getInsignias: getInsignias,
    tieneInsignia: tieneInsignia,
    ganarInsignia: ganarInsignia,
    getProgreso: getProgreso,
    reiniciar: reiniciar
  });
})();
