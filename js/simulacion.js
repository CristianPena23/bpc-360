/* ==========================================================
   BPC 360 · Práctica: simulación de chat (Cristian)

   Qué hace:
   1. Carga los mensajes desde data/mensajes-simulacion.json
   2. Muestra un mensaje a la vez dentro de un chat simulado
   3. El usuario decide "Es seguro" o "Es fraude"
   4. Muestra si acertó, por qué, y resalta las pistas dentro del mensaje
   5. Al final: resumen, puntos (una sola vez, BPC.registrarLogro) y
      BPC.revisarInsignias() por si ya se ganó "Detector de fraudes"

   Cómo agregar o cambiar mensajes: edita data/mensajes-simulacion.json.
   Cada mensaje se escribe por "partes" para poder marcar el enlace
   (enlace: true) y las pistas de fraude (pista: true).

   IMPORTANTE: fetch() no funciona si abres el HTML con doble clic
   (file://). Usa Live Server de VS Code o: python -m http.server
   ========================================================== */

(function () {
  'use strict';

  const BPC = window.BPC || null; // sin storage.js la práctica funciona pero no guarda
  const RUTA = 'data/mensajes-simulacion.json';
  const LOGRO = 'sms-simulacion';
  const LOGRO_QUIZ = 'sms-quiz';
  const INSIGNIA = 'detector-fraudes';

  const ICONO_OK =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg>';
  const ICONO_MAL =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>';

  const $ = function (id) { return document.getElementById(id); };

  const el = {
    practica: $('sim-practica'),
    resultado: $('sim-resultado'),
    contador: $('sim-contador'),
    aciertos: $('sim-aciertos'),
    contexto: $('sim-contexto'),
    avatar: $('sim-avatar'),
    remitente: $('sim-remitente'),
    detalle: $('sim-detalle'),
    canal: $('sim-canal'),
    texto: $('sim-texto'),
    hora: $('sim-hora'),
    decision: $('sim-decision'),
    btnSeguro: $('sim-btn-seguro'),
    btnFraude: $('sim-btn-fraude'),
    error: $('sim-error'),
    feedback: $('sim-feedback'),
    fbIcono: $('sim-feedback-icono'),
    fbVeredicto: $('sim-feedback-veredicto'),
    fbEra: $('sim-feedback-era'),
    fbTexto: $('sim-feedback-texto'),
    fbSubtitulo: $('sim-feedback-subtitulo'),
    fbSenales: $('sim-feedback-senales'),
    siguiente: $('sim-siguiente'),
    resTitulo: $('sim-resultado-titulo'),
    resAciertos: $('sim-resultado-aciertos'),
    resPuntos: $('sim-resultado-puntos'),
    resInsignia: $('sim-resultado-insignia'),
    repaso: $('sim-repaso'),
    irQuiz: $('sim-ir-quiz'),
    irProgreso: $('sim-ir-progreso'),
    repetir: $('sim-repetir')
  };

  const sim = {
    mensajes: [],
    puntosPorAcierto: 10,
    minimoAprobar: 3,
    indice: 0,
    respuestas: [] // { elegidoFraude: bool, acerto: bool }
  };

  /* ---------- Carga ---------- */

  async function cargar() {
    const respuesta = await fetch(RUTA);
    if (!respuesta.ok) {
      throw new Error('No se pudo leer ' + RUTA + ' (código ' + respuesta.status + ')');
    }
    const datos = await respuesta.json();
    if (!Array.isArray(datos.mensajes) || datos.mensajes.length === 0) {
      throw new Error('El archivo de mensajes no tiene el formato esperado');
    }
    sim.mensajes = datos.mensajes;
    sim.puntosPorAcierto = Number(datos.puntosPorAcierto) || 10;
    sim.minimoAprobar = Number(datos.minimoAprobar) || 1;
  }

  function mostrarErrorDeCarga(error) {
    console.error('[BPC 360] Simulación:', error);
    el.texto.textContent = 'No pudimos cargar los mensajes de práctica.';
    el.contador.textContent = '';
    el.error.textContent =
      'Si abriste el archivo con doble clic, ábrelo con Live Server (VS Code) o con un servidor local ' +
      '(python -m http.server). Si ya lo haces así, revisa que exista data/mensajes-simulacion.json.';
    el.error.hidden = false;
    el.decision.hidden = true;
  }

  /* ---------- Dibujar el mensaje ---------- */

  function dibujarTexto(mensaje, revelarPistas) {
    el.texto.innerHTML = '';
    mensaje.partes.forEach(function (parte) {
      let nodo = document.createTextNode(parte.t);

      if (parte.enlace) {
        const enlace = document.createElement('span');
        enlace.className = 'sim-enlace';
        enlace.appendChild(nodo);
        nodo = enlace;
      }
      if (parte.pista && revelarPistas) {
        const marca = document.createElement('mark');
        marca.appendChild(nodo);
        nodo = marca;
      }
      el.texto.appendChild(nodo);
    });
  }

  function inicialDe(nombre) {
    const primera = nombre.charAt(0);
    return /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(primera) ? primera.toUpperCase() : '?';
  }

  function mostrarMensaje() {
    const total = sim.mensajes.length;
    const mensaje = sim.mensajes[sim.indice];

    el.contador.textContent = 'Mensaje ' + (sim.indice + 1) + ' de ' + total;
    el.aciertos.textContent = String(contarAciertos());

    if (mensaje.contexto) {
      el.contexto.textContent = mensaje.contexto;
      el.contexto.hidden = false;
    } else {
      el.contexto.hidden = true;
    }

    el.avatar.textContent = inicialDe(mensaje.remitente);
    el.remitente.textContent = mensaje.remitente;
    el.detalle.textContent = mensaje.detalle || '';
    el.canal.textContent = mensaje.canal || 'SMS';
    el.hora.textContent = mensaje.hora || '';
    dibujarTexto(mensaje, false);

    el.decision.hidden = false;
    el.btnSeguro.disabled = false;
    el.btnFraude.disabled = false;
    el.feedback.hidden = true;
    el.siguiente.hidden = true;
    el.error.hidden = true;
    window.scrollTo(0, 0);
  }

  /* ---------- Responder ---------- */

  function responder(elegidoFraude) {
    const mensaje = sim.mensajes[sim.indice];
    if (sim.respuestas[sim.indice]) return; // ya respondido

    const acerto = elegidoFraude === mensaje.esFraude;
    sim.respuestas[sim.indice] = { elegidoFraude: elegidoFraude, acerto: acerto };

    el.aciertos.textContent = String(contarAciertos());
    dibujarTexto(mensaje, true); // resalta las pistas
    el.decision.hidden = true;

    // Retroalimentación
    el.feedback.className = 'sim-feedback ' + (acerto ? 'sim-feedback--ok' : 'sim-feedback--mal');
    el.fbIcono.innerHTML = acerto ? ICONO_OK : ICONO_MAL;
    el.fbVeredicto.textContent = acerto ? '¡Correcto!' : 'No era esa';
    el.fbEra.textContent = mensaje.esFraude ? 'Este mensaje era un fraude.' : 'Este mensaje era seguro.';
    el.fbTexto.textContent = mensaje.explicacion;

    el.fbSenales.innerHTML = '';
    const haySenales = Boolean(mensaje.senales && mensaje.senales.length > 0);
    if (haySenales) {
      mensaje.senales.forEach(function (senal) {
        const item = document.createElement('li');
        item.textContent = senal;
        el.fbSenales.appendChild(item);
      });
    }
    el.fbSenales.hidden = !haySenales;
    el.fbSubtitulo.hidden = !haySenales;
    el.feedback.hidden = false;

    const esUltimo = sim.indice === sim.mensajes.length - 1;
    el.siguiente.textContent = esUltimo ? 'Ver resultado' : 'Siguiente mensaje';
    el.siguiente.hidden = false;
    el.siguiente.focus({ preventScroll: true });
    asegurarVisible(el.siguiente);
  }

  // Baja la página lo justo para que el botón no quede tapado por el menú inferior
  function asegurarVisible(elemento) {
    const menu = document.querySelector('.bpc-nav');
    const altoMenu = menu ? menu.offsetHeight : 0;
    const limite = window.innerHeight - altoMenu - 16;
    const caja = elemento.getBoundingClientRect();
    if (caja.bottom > limite) {
      window.scrollBy(0, caja.bottom - limite);
    }
  }

  function contarAciertos() {
    return sim.respuestas.reduce(function (suma, r) { return suma + (r && r.acerto ? 1 : 0); }, 0);
  }

  /* ---------- Resultado ---------- */

  function mostrarResultado() {
    const total = sim.mensajes.length;
    const aciertos = contarAciertos();
    const aprobado = aciertos >= sim.minimoAprobar;
    const puntos = aciertos * sim.puntosPorAcierto;

    el.resAciertos.textContent = 'Acertaste ' + aciertos + ' de ' + total;
    el.resInsignia.hidden = true;
    el.resInsignia.classList.remove('sim-resultado__insignia--pendiente');
    el.irQuiz.hidden = false;
    el.irProgreso.hidden = true;

    if (!aprobado) {
      el.resPuntos.textContent =
        'Necesitas al menos ' + sim.minimoAprobar + ' aciertos para completar la práctica. ¡Vuelve a intentarlo!';
    } else if (!BPC) {
      el.resPuntos.textContent = '¡Práctica completada!';
    } else {
      const registro = BPC.registrarLogro(LOGRO, puntos);
      el.resPuntos.textContent = registro.nuevo
        ? '+' + registro.puntos + ' puntos'
        : 'Ya sumaste los puntos de esta práctica antes; repetirla no suma más.';

      const nuevas = BPC.revisarInsignias();
      if (nuevas.indexOf(INSIGNIA) !== -1) {
        el.resInsignia.textContent = '¡Ganaste la insignia ' + BPC.INSIGNIAS[INSIGNIA] + '!';
        el.resInsignia.hidden = false;
      } else if (BPC.tieneInsignia(INSIGNIA)) {
        el.resInsignia.textContent = 'Ya tienes la insignia ' + BPC.INSIGNIAS[INSIGNIA] + '.';
        el.resInsignia.hidden = false;
      } else if (!BPC.tieneLogro(LOGRO_QUIZ)) {
        el.resInsignia.textContent =
          'Para ganar la insignia ' + BPC.INSIGNIAS[INSIGNIA] + ' te falta el quiz.';
        el.resInsignia.classList.add('sim-resultado__insignia--pendiente');
        el.resInsignia.hidden = false;
      }

      // Si ya no queda nada pendiente, el botón principal pasa a ser "Ver mi progreso"
      if (BPC.tieneLogro(LOGRO_QUIZ)) {
        el.irQuiz.hidden = true;
        el.irProgreso.hidden = false;
      }
    }

    // Repaso de las respuestas
    el.repaso.innerHTML = '';
    sim.mensajes.forEach(function (mensaje, i) {
      const respuesta = sim.respuestas[i];
      const item = document.createElement('li');

      const icono = document.createElement('span');
      icono.className = 'sim-repaso__icono ' + (respuesta.acerto ? 'sim-repaso__icono--ok' : 'sim-repaso__icono--mal');
      icono.innerHTML = respuesta.acerto ? ICONO_OK : ICONO_MAL;

      const texto = document.createElement('span');
      texto.className = 'sim-repaso__texto';
      const titulo = document.createElement('strong');
      titulo.textContent = mensaje.resumen || mensaje.remitente;
      const detalle = document.createElement('span');
      detalle.textContent =
        (mensaje.esFraude ? 'Era fraude' : 'Era seguro') + ' · ' + (respuesta.acerto ? 'acertaste' : 'fallaste');
      texto.appendChild(titulo);
      texto.appendChild(detalle);

      item.appendChild(icono);
      item.appendChild(texto);
      el.repaso.appendChild(item);
    });

    el.practica.hidden = true;
    el.resultado.hidden = false;
    el.resTitulo.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  /* ---------- Eventos ---------- */

  el.btnSeguro.addEventListener('click', function () { responder(false); });
  el.btnFraude.addEventListener('click', function () { responder(true); });

  el.siguiente.addEventListener('click', function () {
    if (sim.indice < sim.mensajes.length - 1) {
      sim.indice += 1;
      mostrarMensaje();
    } else {
      mostrarResultado();
    }
  });

  el.repetir.addEventListener('click', function () {
    sim.indice = 0;
    sim.respuestas = [];
    el.resultado.hidden = true;
    el.practica.hidden = false;
    mostrarMensaje();
  });

  /* ---------- Inicio ---------- */

  cargar().then(mostrarMensaje).catch(mostrarErrorDeCarga);
})();
