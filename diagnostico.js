/* ==========================================================
   BPC 360 · Diagnóstico de riesgo (Sofía)

   Qué hace:
   1. Carga las preguntas desde data/preguntas-diagnostico.json
   2. Muestra una pregunta a la vez con barra de avance
   3. Suma los puntos de riesgo de las respuestas
   4. Calcula el nivel (bajo / medio / alto) y lo muestra
   5. Guarda el nivel en localStorage → clave "bpc_diagnostico"

   IMPORTANTE: fetch() no funciona si abres el HTML con doble clic
   (file://). Para probar en tu computador usa la extensión "Live Server"
   de VS Code, o en la carpeta del repo: python -m http.server
   ========================================================== */

(function () {
  'use strict';

  const CLAVE_STORAGE = 'bpc_diagnostico';
  const RUTA_DATOS = 'data/preguntas-diagnostico.json';

  /* ---------- Iconos (SVG de trazo) ---------- */

  const ICONOS = {
    wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"></path><circle cx="12" cy="19.5" r="1"></circle>',
    qr: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2M18 14h2v2M14 18h2v2M18 20h2"></path>',
    mensaje: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"></path>',
    clave: '<rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path>',
    llamada: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"></path>',
    actualizar: '<path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"></path>'
  };

  // Un icono distinto por nivel (no dependemos solo del color)
  const ICONOS_NIVEL = {
    bajo: '<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"></path><path d="M8.5 12l2.5 2.5 4.5-5"></path>',
    medio: '<path d="M12 3l10 18H2z"></path><path d="M12 10v5M12 18v.5"></path>',
    alto: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v6M12 16.5v.5"></path>'
  };

  const MARCA_SELECCION =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"></path></svg>';

  function svg(contenido, tamano) {
    return (
      '<svg width="' + tamano + '" height="' + tamano + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      contenido + '</svg>'
    );
  }

  /* ---------- Referencias al DOM ---------- */

  const $ = (id) => document.getElementById(id);

  const el = {
    formulario: $('dx-vista-pregunta'),
    resultado: $('dx-vista-resultado'),
    progreso: $('dx-progreso'),
    progresoTexto: $('dx-progreso-texto'),
    progresoPorcentaje: $('dx-progreso-porcentaje'),
    barra: $('dx-barra'),
    barraRelleno: $('dx-barra-relleno'),
    pregunta: $('dx-pregunta'),
    preguntaTexto: $('dx-pregunta-texto'),
    icono: $('dx-icono'),
    opciones: $('dx-opciones'),
    error: $('dx-error'),
    anterior: $('dx-anterior'),
    siguiente: $('dx-siguiente'),
    resultadoCaja: $('dx-resultado'),
    resultadoInsignia: $('dx-resultado-insignia'),
    resultadoTitulo: $('dx-resultado-titulo'),
    resultadoTexto: $('dx-resultado-texto'),
    escalaRelleno: $('dx-escala-relleno'),
    resultadoPuntaje: $('dx-resultado-puntaje'),
    repetir: $('dx-repetir')
  };

  /* ---------- Estado ---------- */

  const estado = {
    preguntas: [],
    niveles: [],
    indice: 0,
    respuestas: [] // respuestas[i] = índice de la opción elegida en la pregunta i (o undefined)
  };

  /* ---------- Carga de datos ---------- */

  async function cargarDatos() {
    const respuesta = await fetch(RUTA_DATOS);
    if (!respuesta.ok) {
      throw new Error('No se pudo leer ' + RUTA_DATOS + ' (código ' + respuesta.status + ')');
    }
    const datos = await respuesta.json();
    if (!Array.isArray(datos.preguntas) || datos.preguntas.length === 0 || !Array.isArray(datos.niveles)) {
      throw new Error('El archivo de preguntas no tiene el formato esperado');
    }
    estado.preguntas = datos.preguntas;
    estado.niveles = datos.niveles;
  }

  function mostrarErrorDeCarga(error) {
    console.error('[BPC 360] Diagnóstico:', error);
    el.preguntaTexto.textContent = 'No pudimos cargar el diagnóstico';
    el.icono.innerHTML = '';
    el.opciones.innerHTML = '';
    el.error.textContent =
      'Si abriste el archivo con doble clic, ábrelo con Live Server (VS Code) o con un servidor local ' +
      '(python -m http.server). Si ya lo estás haciendo así, revisa que exista data/preguntas-diagnostico.json.';
    el.error.hidden = false;
    el.siguiente.disabled = true;
    el.progreso.hidden = true;
  }

  /* ---------- Render de una pregunta ---------- */

  function mostrarPregunta() {
    const total = estado.preguntas.length;
    const numero = estado.indice + 1;
    const pregunta = estado.preguntas[estado.indice];
    const elegida = estado.respuestas[estado.indice];
    const porcentaje = Math.round((numero / total) * 100);

    // Progreso
    el.progresoTexto.textContent = 'Pregunta ' + numero + ' de ' + total;
    el.progresoPorcentaje.textContent = porcentaje + '%';
    el.barraRelleno.style.width = porcentaje + '%';
    el.barra.setAttribute('aria-valuenow', String(porcentaje));

    // Pregunta
    el.preguntaTexto.textContent = pregunta.texto;
    el.icono.innerHTML = svg(ICONOS[pregunta.icono] || ICONOS.mensaje, 22);

    // Opciones (radios reales: se pueden usar con teclado y lector de pantalla)
    el.opciones.innerHTML = '';
    pregunta.opciones.forEach(function (opcion, i) {
      const etiqueta = document.createElement('label');
      etiqueta.className = 'dx-opcion';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'respuesta';
      radio.value = String(i);
      radio.checked = elegida === i;
      radio.addEventListener('change', function () {
        estado.respuestas[estado.indice] = i;
        el.siguiente.disabled = false;
      });

      const caja = document.createElement('span');
      caja.className = 'dx-opcion__caja';

      const texto = document.createElement('span');
      texto.textContent = opcion.texto;

      const marca = document.createElement('span');
      marca.className = 'dx-opcion__marca';
      marca.innerHTML = MARCA_SELECCION;

      caja.appendChild(texto);
      caja.appendChild(marca);
      etiqueta.appendChild(radio);
      etiqueta.appendChild(caja);
      el.opciones.appendChild(etiqueta);
    });

    // Botones
    el.anterior.hidden = estado.indice === 0;
    el.siguiente.textContent = numero === total ? 'Ver resultado' : 'Siguiente';
    el.siguiente.disabled = elegida === undefined;
    el.error.hidden = true;

    // Accesibilidad: llevar el foco a la nueva pregunta
    el.pregunta.focus({ preventScroll: true });
  }

  /* ---------- Cálculo del resultado ---------- */

  function calcularPuntaje() {
    return estado.respuestas.reduce(function (suma, indiceOpcion, indicePregunta) {
      return suma + estado.preguntas[indicePregunta].opciones[indiceOpcion].puntos;
    }, 0);
  }

  function puntajeMaximo() {
    return estado.preguntas.reduce(function (suma, pregunta) {
      const maximo = Math.max.apply(null, pregunta.opciones.map(function (o) { return o.puntos; }));
      return suma + maximo;
    }, 0);
  }

  function nivelParaPuntaje(puntaje) {
    for (let i = 0; i < estado.niveles.length; i++) {
      if (puntaje <= estado.niveles[i].max) return estado.niveles[i];
    }
    return estado.niveles[estado.niveles.length - 1];
  }

  function guardarNivel(idNivel) {
    // localStorage puede fallar (modo privado, datos bloqueados): la app debe seguir funcionando
    try {
      localStorage.setItem(CLAVE_STORAGE, idNivel);
    } catch (e) {
      console.warn('[BPC 360] No se pudo guardar el diagnóstico en localStorage', e);
    }
  }

  function mostrarResultado() {
    const puntaje = calcularPuntaje();
    const maximo = puntajeMaximo();
    const nivel = nivelParaPuntaje(puntaje);

    guardarNivel(nivel.id);

    el.resultadoCaja.setAttribute('data-nivel', nivel.id);
    el.resultadoInsignia.innerHTML = svg(ICONOS_NIVEL[nivel.id] || ICONOS_NIVEL.medio, 36);
    el.resultadoTitulo.textContent = nivel.titulo;
    el.resultadoTexto.textContent = nivel.descripcion;
    el.resultadoPuntaje.textContent = 'Puntaje de riesgo: ' + puntaje + ' de ' + maximo;
    el.escalaRelleno.style.width = Math.max(6, Math.round((puntaje / maximo) * 100)) + '%';

    el.formulario.hidden = true;
    el.progreso.hidden = true;
    el.resultado.hidden = false;
    el.resultadoTitulo.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  /* ---------- Eventos ---------- */

  el.formulario.addEventListener('submit', function (evento) {
    evento.preventDefault();
    if (estado.respuestas[estado.indice] === undefined) return;

    if (estado.indice < estado.preguntas.length - 1) {
      estado.indice += 1;
      mostrarPregunta();
    } else {
      mostrarResultado();
    }
  });

  el.anterior.addEventListener('click', function () {
    if (estado.indice > 0) {
      estado.indice -= 1;
      mostrarPregunta();
    }
  });

  el.repetir.addEventListener('click', function () {
    estado.indice = 0;
    estado.respuestas = [];
    el.resultado.hidden = true;
    el.formulario.hidden = false;
    el.progreso.hidden = false;
    mostrarPregunta();
    window.scrollTo(0, 0);
  });

  /* ---------- Inicio ---------- */

  cargarDatos().then(mostrarPregunta).catch(mostrarErrorDeCarga);
})();
