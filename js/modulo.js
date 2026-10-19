/* ==========================================================
   BPC 360 · Módulo SMS / WhatsApp: Aprende y Demuestra (Camilo)

   Qué hace:
   1. Cambia entre las vistas "Aprende" y "Demuestra" (quiz).
      Se puede abrir el quiz directo con modulo-sms.html#demuestra
   2. Carga las preguntas desde data/quiz-sms.json
   3. Por pregunta: elegir → "Comprobar" → ver la explicación → "Siguiente"
   4. Al terminar: aciertos y puntos. Los puntos se suman UNA sola vez
      (BPC.registrarLogro) y solo si se aprueba el quiz.
   5. Pide a BPC.revisarInsignias() que otorgue la insignia
      "Detector de fraudes" si ya se completó también la práctica.

   IMPORTANTE: fetch() no funciona si abres el HTML con doble clic
   (file://). Usa Live Server de VS Code o: python -m http.server
   ========================================================== */

(function () {
  'use strict';

  const BPC = window.BPC || null; // si falta storage.js, el quiz funciona pero no guarda
  const RUTA_QUIZ = 'data/quiz-sms.json';
  const LOGRO_QUIZ = 'sms-quiz';
  const LOGRO_PRACTICA = 'sms-simulacion';
  const INSIGNIA = 'detector-fraudes';

  const ICONO_OK =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg>';
  const ICONO_MAL =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>';

  const $ = function (id) { return document.getElementById(id); };

  const el = {
    aprende: $('mod-aprende'),
    demuestra: $('mod-demuestra'),
    tabAprende: $('mod-tab-aprende'),
    tabDemuestra: $('mod-tab-demuestra'),
    form: $('mod-quiz-form'),
    contador: $('mod-quiz-contador'),
    pregunta: $('mod-quiz-pregunta'),
    opciones: $('mod-quiz-opciones'),
    feedback: $('mod-quiz-feedback'),
    error: $('mod-quiz-error'),
    boton: $('mod-quiz-boton'),
    resultado: $('mod-quiz-resultado'),
    resTitulo: $('mod-resultado-titulo'),
    resAciertos: $('mod-resultado-aciertos'),
    resPuntos: $('mod-resultado-puntos'),
    resInsignia: $('mod-resultado-insignia'),
    resPractica: $('mod-resultado-practica'),
    repetir: $('mod-quiz-repetir')
  };

  const quiz = {
    cargado: false,
    preguntas: [],
    puntosPorAcierto: 10,
    minimoAprobar: 2,
    indice: 0,
    elegidas: [],
    comprobada: false
  };

  /* ---------- Pestañas Aprende / Demuestra ---------- */

  function mostrarVista(nombre, opciones) {
    const esQuiz = nombre === 'demuestra';
    el.aprende.hidden = esQuiz;
    el.demuestra.hidden = !esQuiz;

    if (esQuiz) {
      el.tabDemuestra.setAttribute('aria-current', 'step');
      el.tabAprende.removeAttribute('aria-current');
    } else {
      el.tabAprende.setAttribute('aria-current', 'step');
      el.tabDemuestra.removeAttribute('aria-current');
    }

    if (!opciones || !opciones.sinHistorial) {
      try {
        const ruta = esQuiz ? '#demuestra' : window.location.pathname + window.location.search;
        window.history.replaceState(null, '', ruta);
      } catch (e) { /* no pasa nada si el navegador no lo permite */ }
    }

    window.scrollTo(0, 0);
    if (esQuiz && quiz.cargado && el.resultado.hidden) {
      el.pregunta.focus({ preventScroll: true });
    }
  }

  el.tabAprende.addEventListener('click', function () { mostrarVista('aprende'); });
  el.tabDemuestra.addEventListener('click', function () { mostrarVista('demuestra'); });

  window.addEventListener('hashchange', function () {
    mostrarVista(window.location.hash === '#demuestra' ? 'demuestra' : 'aprende', { sinHistorial: true });
  });

  /* ---------- Carga del quiz ---------- */

  async function cargarQuiz() {
    const respuesta = await fetch(RUTA_QUIZ);
    if (!respuesta.ok) {
      throw new Error('No se pudo leer ' + RUTA_QUIZ + ' (código ' + respuesta.status + ')');
    }
    const datos = await respuesta.json();
    if (!Array.isArray(datos.preguntas) || datos.preguntas.length === 0) {
      throw new Error('El archivo del quiz no tiene el formato esperado');
    }
    quiz.preguntas = datos.preguntas;
    quiz.puntosPorAcierto = Number(datos.puntosPorAcierto) || 10;
    quiz.minimoAprobar = Number(datos.minimoAprobar) || 1;
    quiz.cargado = true;
  }

  function mostrarErrorDeCarga(error) {
    console.error('[BPC 360] Quiz:', error);
    el.pregunta.textContent = 'No pudimos cargar el quiz';
    el.opciones.innerHTML = '';
    el.contador.textContent = '';
    el.error.textContent =
      'Si abriste el archivo con doble clic, ábrelo con Live Server (VS Code) o con un servidor local ' +
      '(python -m http.server). Si ya lo haces así, revisa que exista data/quiz-sms.json.';
    el.error.hidden = false;
    el.boton.hidden = true;
  }

  /* ---------- Una pregunta ---------- */

  function crearMarca() {
    const marca = document.createElement('span');
    marca.className = 'mod-opcion__marca';
    marca.innerHTML = ICONO_OK;
    return marca;
  }

  function mostrarPregunta() {
    const total = quiz.preguntas.length;
    const pregunta = quiz.preguntas[quiz.indice];
    const elegida = quiz.elegidas[quiz.indice];

    quiz.comprobada = false;
    el.contador.textContent = 'Pregunta ' + (quiz.indice + 1) + ' de ' + total;
    el.pregunta.textContent = pregunta.texto;
    el.feedback.hidden = true;
    el.feedback.innerHTML = '';
    el.error.hidden = true;

    el.opciones.innerHTML = '';
    pregunta.opciones.forEach(function (texto, i) {
      const etiqueta = document.createElement('label');
      etiqueta.className = 'mod-opcion';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'respuesta';
      radio.value = String(i);
      radio.checked = elegida === i;
      radio.addEventListener('change', function () {
        quiz.elegidas[quiz.indice] = i;
        el.boton.disabled = false;
      });

      const caja = document.createElement('span');
      caja.className = 'mod-opcion__caja';

      const contenido = document.createElement('span');
      contenido.textContent = texto;

      caja.appendChild(contenido);
      caja.appendChild(crearMarca());
      etiqueta.appendChild(radio);
      etiqueta.appendChild(caja);
      el.opciones.appendChild(etiqueta);
    });

    el.boton.textContent = 'Comprobar';
    el.boton.disabled = elegida === undefined;
    el.pregunta.focus({ preventScroll: true });
  }

  function comprobar() {
    const pregunta = quiz.preguntas[quiz.indice];
    const elegida = quiz.elegidas[quiz.indice];
    const acerto = elegida === pregunta.correcta;
    const etiquetas = el.opciones.querySelectorAll('.mod-opcion');

    etiquetas.forEach(function (etiqueta, i) {
      etiqueta.querySelector('input').disabled = true;
      const marca = etiqueta.querySelector('.mod-opcion__marca');
      if (i === pregunta.correcta) {
        etiqueta.classList.add('mod-opcion--correcta');
        marca.innerHTML = ICONO_OK;
      } else if (i === elegida) {
        etiqueta.classList.add('mod-opcion--incorrecta');
        marca.innerHTML = ICONO_MAL;
      }
    });

    el.feedback.className = 'mod-feedback ' + (acerto ? 'mod-feedback--ok' : 'mod-feedback--mal');
    el.feedback.innerHTML = '';

    const titulo = document.createElement('div');
    titulo.className = 'mod-feedback__titulo';
    titulo.innerHTML = acerto ? ICONO_OK : ICONO_MAL;
    const textoTitulo = document.createElement('span');
    textoTitulo.textContent = acerto ? '¡Correcto!' : 'No es esa';
    titulo.appendChild(textoTitulo);

    const explicacion = document.createElement('p');
    explicacion.textContent = pregunta.explicacion;

    el.feedback.appendChild(titulo);
    el.feedback.appendChild(explicacion);
    el.feedback.hidden = false;

    quiz.comprobada = true;
    el.boton.textContent = quiz.indice === quiz.preguntas.length - 1 ? 'Ver resultado' : 'Siguiente';
    asegurarVisible(el.feedback);
  }

  // Baja la página lo justo para que la explicación no quede tapada por el menú inferior
  function asegurarVisible(elemento) {
    const menu = document.querySelector('.bpc-nav');
    const altoMenu = menu ? menu.offsetHeight : 0;
    const limite = window.innerHeight - altoMenu - 16;
    const caja = elemento.getBoundingClientRect();
    if (caja.bottom > limite) {
      window.scrollBy(0, caja.bottom - limite);
    }
  }

  /* ---------- Resultado ---------- */

  function contarAciertos() {
    return quiz.preguntas.reduce(function (suma, pregunta, i) {
      return suma + (quiz.elegidas[i] === pregunta.correcta ? 1 : 0);
    }, 0);
  }

  function mostrarResultado() {
    const total = quiz.preguntas.length;
    const aciertos = contarAciertos();
    const aprobado = aciertos >= quiz.minimoAprobar;
    const puntos = aciertos * quiz.puntosPorAcierto;

    el.resAciertos.textContent = 'Acertaste ' + aciertos + ' de ' + total;
    el.resInsignia.hidden = true;
    el.resInsignia.classList.remove('mod-resultado__insignia--pendiente');
    el.resPractica.hidden = true;

    if (!aprobado) {
      el.resPuntos.textContent =
        'Necesitas al menos ' + quiz.minimoAprobar + ' aciertos para completar el quiz. ¡Repásalo en "Aprende" e inténtalo de nuevo!';
    } else if (!BPC) {
      el.resPuntos.textContent = '¡Quiz aprobado!';
    } else {
      const registro = BPC.registrarLogro(LOGRO_QUIZ, puntos);
      el.resPuntos.textContent = registro.nuevo
        ? '+' + registro.puntos + ' puntos'
        : 'Ya sumaste los puntos de este quiz antes; repetirlo no suma más.';

      const nuevas = BPC.revisarInsignias();
      if (nuevas.indexOf(INSIGNIA) !== -1) {
        el.resInsignia.textContent = '¡Ganaste la insignia ' + BPC.INSIGNIAS[INSIGNIA] + '!';
        el.resInsignia.hidden = false;
      } else if (BPC.tieneInsignia(INSIGNIA)) {
        el.resInsignia.textContent = 'Ya tienes la insignia ' + BPC.INSIGNIAS[INSIGNIA] + '.';
        el.resInsignia.hidden = false;
      } else if (!BPC.tieneLogro(LOGRO_PRACTICA)) {
        el.resInsignia.textContent =
          'Para ganar la insignia ' + BPC.INSIGNIAS[INSIGNIA] + ' te falta completar la práctica.';
        el.resInsignia.classList.add('mod-resultado__insignia--pendiente');
        el.resInsignia.hidden = false;
        el.resPractica.hidden = false;
      }
    }

    el.form.hidden = true;
    el.resultado.hidden = false;
    el.resTitulo.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  /* ---------- Eventos del quiz ---------- */

  el.form.addEventListener('submit', function (evento) {
    evento.preventDefault();
    if (!quiz.cargado || quiz.elegidas[quiz.indice] === undefined) return;

    if (!quiz.comprobada) {
      comprobar();
    } else if (quiz.indice < quiz.preguntas.length - 1) {
      quiz.indice += 1;
      mostrarPregunta();
    } else {
      mostrarResultado();
    }
  });

  el.repetir.addEventListener('click', function () {
    quiz.indice = 0;
    quiz.elegidas = [];
    el.resultado.hidden = true;
    el.form.hidden = false;
    mostrarPregunta();
    window.scrollTo(0, 0);
  });

  /* ---------- Inicio ---------- */

  mostrarVista(window.location.hash === '#demuestra' ? 'demuestra' : 'aprende', { sinHistorial: true });
  cargarQuiz().then(mostrarPregunta).catch(mostrarErrorDeCarga);
})();
