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
     bpc_logros      → lista JSON de actividades ya completadas
                       (por ejemplo ["sms-simulacion", "sms-quiz"])

   Funciones
     BPC.getDiagnostico()        → "bajo" | "medio" | "alto" | null
     BPC.setDiagnostico(nivel)   → guarda el nivel (ignora valores inválidos)
     BPC.getPuntaje()            → número (0 si no hay nada)
     BPC.sumarPuntos(n)          → suma n puntos y devuelve el total nuevo
     BPC.getInsignias()          → lista de ids de insignias ganadas
     BPC.tieneInsignia(id)       → true / false
     BPC.ganarInsignia(id)       → true si era nueva, false si ya la tenía

     BPC.registrarLogro(id, puntos)
         Marca una actividad como completada y suma sus puntos, pero SOLO
         la primera vez (repetir la actividad no vuelve a sumar).
         Devuelve { nuevo: true|false, puntos: n }.
     BPC.tieneLogro(id)          → true / false
     BPC.getLogros()             → lista de ids de actividades completadas
     BPC.revisarInsignias()      → otorga las insignias cuyos logros ya están
                                    todos completos y devuelve la lista de
                                    las que se ganaron justo ahora.

     BPC.getProgreso()           → { diagnostico, puntaje, insignias, logros }
     BPC.reiniciar()             → borra todo el progreso

   Actividades (logros) y insignias que existen
     sms-simulacion + sms-quiz  →  insignia "detector-fraudes"
     La lista de requisitos está en REQUISITOS (abajo) y los nombres de
     las insignias en BPC.INSIGNIAS.

   Ejemplo de uso al terminar una actividad
     const r = BPC.registrarLogro('sms-quiz', 30);   // suma 30 solo la 1.ª vez
     const nuevas = BPC.revisarInsignias();          // ['detector-fraudes'] si ya está todo

   Si localStorage no está disponible (modo privado, datos bloqueados)
   la app sigue funcionando: el progreso vive solo mientras la página
   siga abierta.
   ========================================================== */

(function () {
  'use strict';

  const CLAVES = {
    diagnostico: 'bpc_diagnostico',
    puntaje: 'bpc_puntaje',
    insignias: 'bpc_insignias',
    logros: 'bpc_logros'
  };

  const NIVELES = ['bajo', 'medio', 'alto'];

  const INSIGNIAS = {
    'detector-fraudes': 'Detector de fraudes',
    'escaner-seguro': 'Escáner seguro',
    'red-protegida': 'Red protegida'
  };

  // Qué actividades hay que completar para ganar cada insignia
  const REQUISITOS = {
    'detector-fraudes': ['sms-simulacion', 'sms-quiz']
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

  // Lista de textos guardada como JSON (insignias, logros)
  function leerLista(clave) {
    try {
      const lista = JSON.parse(leer(clave) || '[]');
      return Array.isArray(lista) ? lista.filter(function (id) { return typeof id === 'string'; }) : [];
    } catch (e) {
      return [];
    }
  }

  // Agrega un id a una lista guardada. Devuelve true si era nuevo.
  function agregarALista(clave, id) {
    if (typeof id !== 'string' || id === '') return false;
    const lista = leerLista(clave);
    if (lista.indexOf(id) !== -1) return false;
    lista.push(id);
    escribir(clave, JSON.stringify(lista));
    return true;
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
    return leerLista(CLAVES.insignias);
  }

  function tieneInsignia(id) {
    return getInsignias().indexOf(id) !== -1;
  }

  function ganarInsignia(id) {
    return agregarALista(CLAVES.insignias, id);
  }

  /* ---------- Logros (cada actividad puntúa una sola vez) ---------- */

  function getLogros() {
    return leerLista(CLAVES.logros);
  }

  function tieneLogro(id) {
    return getLogros().indexOf(id) !== -1;
  }

  function registrarLogro(id, puntos) {
    if (!agregarALista(CLAVES.logros, id)) {
      return { nuevo: false, puntos: 0 };
    }
    const n = Math.trunc(Number(puntos));
    const sumados = Number.isFinite(n) && n > 0 ? n : 0;
    if (sumados > 0) sumarPuntos(sumados);
    return { nuevo: true, puntos: sumados };
  }

  function revisarInsignias() {
    const nuevas = [];
    Object.keys(REQUISITOS).forEach(function (insignia) {
      const completo = REQUISITOS[insignia].every(function (logro) { return tieneLogro(logro); });
      if (completo && ganarInsignia(insignia)) nuevas.push(insignia);
    });
    return nuevas;
  }

  /* ---------- Conjunto ---------- */

  function getProgreso() {
    return {
      diagnostico: getDiagnostico(),
      puntaje: getPuntaje(),
      insignias: getInsignias(),
      logros: getLogros()
    };
  }

  function reiniciar() {
    borrar(CLAVES.diagnostico);
    borrar(CLAVES.puntaje);
    borrar(CLAVES.insignias);
    borrar(CLAVES.logros);
  }

  /* ---------- API pública ---------- */

  window.BPC = window.BPC || {};
  Object.assign(window.BPC, {
    CLAVES: CLAVES,
    INSIGNIAS: INSIGNIAS,
    REQUISITOS: REQUISITOS,
    getDiagnostico: getDiagnostico,
    setDiagnostico: setDiagnostico,
    getPuntaje: getPuntaje,
    sumarPuntos: sumarPuntos,
    getInsignias: getInsignias,
    tieneInsignia: tieneInsignia,
    ganarInsignia: ganarInsignia,
    getLogros: getLogros,
    tieneLogro: tieneLogro,
    registrarLogro: registrarLogro,
    revisarInsignias: revisarInsignias,
    getProgreso: getProgreso,
    reiniciar: reiniciar
  });
})();
