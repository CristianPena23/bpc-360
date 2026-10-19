/* ==========================================================
   BPC 360 · Mi progreso y logros (Samuel)

   Lee el progreso guardado con js/storage.js y lo muestra:
   - Puntaje total y módulos completados
   - Nivel de riesgo del diagnóstico
   - Insignias (las no ganadas aparecen bloqueadas)
   - Estado de cada módulo
   - Botón para reiniciar el progreso (con confirmación)

   Esta página solo LEE el progreso, salvo el botón de reiniciar.
   ========================================================== */

(function () {
  'use strict';

  const BPC = window.BPC;
  const $ = function (id) { return document.getElementById(id); };

  const el = {
    titulo: $('pg-titulo'),
    puntos: $('pg-puntos'),
    modulosTexto: $('pg-modulos-texto'),
    barra: $('pg-barra'),
    barraRelleno: $('pg-barra-relleno'),
    nivel: $('pg-nivel'),
    nivelValor: $('pg-nivel-valor'),
    nivelIcono: $('pg-nivel-icono'),
    nivelEnlace: $('pg-nivel-enlace'),
    insignias: $('pg-insignias'),
    modulos: $('pg-modulos'),
    aviso: $('pg-aviso'),
    reiniciar: $('pg-reiniciar'),
    dialogo: $('pg-dialogo')
  };

  if (!BPC) {
    el.modulosTexto.textContent = 'No se pudo cargar tu progreso';
    el.reiniciar.hidden = true;
    return;
  }

  /* ---------- Iconos ---------- */

  function svg(contenido, tamano) {
    return (
      '<svg width="' + tamano + '" height="' + tamano + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      contenido + '</svg>'
    );
  }

  const ICONO_INSIGNIA = {
    'detector-fraudes': '<circle cx="11" cy="11" r="6"></circle><path d="M20 20l-4.5-4.5"></path>',
    'escaner-seguro': '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2M18 14h2v2M14 18h2v2M18 20h2"></path>',
    'red-protegida': '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"></path><circle cx="12" cy="19.5" r="1"></circle>'
  };

  const ICONO_CANDADO = '<rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path>';

  const NIVELES = {
    bajo: {
      titulo: 'Riesgo bajo',
      icono: '<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"></path><path d="M8.5 12l2.5 2.5 4.5-5"></path>'
    },
    medio: {
      titulo: 'Riesgo medio',
      icono: '<path d="M12 3l10 18H2z"></path><path d="M12 10v5M12 18v.5"></path>'
    },
    alto: {
      titulo: 'Riesgo alto',
      icono: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v6M12 16.5v.5"></path>'
    }
  };

  /* ---------- Módulos de la app ---------- */

  // Un módulo por insignia. Cuando se agreguen QR y WiFi, basta con
  // activar "disponible: true" y poner sus logros aquí.
  const MODULOS = [
    {
      nombre: 'Mensajes fraudulentos',
      insignia: 'detector-fraudes',
      href: 'modulo-sms.html',
      disponible: true,
      pasos: [
        { logro: 'sms-simulacion', nombre: 'Práctica' },
        { logro: 'sms-quiz', nombre: 'Quiz' }
      ]
    },
    { nombre: 'Códigos QR falsos', insignia: 'escaner-seguro', disponible: false },
    { nombre: 'WiFi público', insignia: 'red-protegida', disponible: false }
  ];

  /* ---------- Dibujar ---------- */

  function dibujarResumen(progreso) {
    const completados = MODULOS.filter(function (m) {
      return progreso.insignias.indexOf(m.insignia) !== -1;
    }).length;

    el.puntos.textContent = String(progreso.puntaje);
    el.modulosTexto.textContent = completados + ' de ' + MODULOS.length + ' módulos completados';
    el.barra.setAttribute('aria-valuemax', String(MODULOS.length));
    el.barra.setAttribute('aria-valuenow', String(completados));
    el.barraRelleno.style.width = Math.round((completados / MODULOS.length) * 100) + '%';
  }

  function dibujarNivel(progreso) {
    const nivel = progreso.diagnostico;
    if (nivel && NIVELES[nivel]) {
      el.nivel.setAttribute('data-nivel', nivel);
      el.nivelValor.textContent = NIVELES[nivel].titulo;
      el.nivelIcono.innerHTML = svg(NIVELES[nivel].icono, 22);
      el.nivelEnlace.textContent = 'Repetir diagnóstico';
    } else {
      el.nivel.removeAttribute('data-nivel');
      el.nivelValor.textContent = 'Aún no hiciste el diagnóstico';
      el.nivelIcono.innerHTML = '';
      el.nivelEnlace.textContent = 'Hacer diagnóstico';
    }
  }

  function dibujarInsignias(progreso) {
    el.insignias.innerHTML = '';
    Object.keys(BPC.INSIGNIAS).forEach(function (id) {
      const ganada = progreso.insignias.indexOf(id) !== -1;

      const item = document.createElement('li');
      item.className = 'pg-insignia' + (ganada ? ' pg-insignia--ganada' : '');

      const icono = document.createElement('span');
      icono.className = 'pg-insignia__icono';
      icono.innerHTML = svg(ganada ? (ICONO_INSIGNIA[id] || ICONO_INSIGNIA['detector-fraudes']) : ICONO_CANDADO, 26);

      const nombre = document.createElement('span');
      nombre.className = 'pg-insignia__nombre';
      nombre.textContent = BPC.INSIGNIAS[id];

      const estado = document.createElement('span');
      estado.className = 'bpc-sr-only';
      estado.textContent = ganada ? ' (ganada)' : ' (bloqueada)';
      nombre.appendChild(estado);

      item.appendChild(icono);
      item.appendChild(nombre);
      el.insignias.appendChild(item);
    });
  }

  function dibujarModulos(progreso) {
    el.modulos.innerHTML = '';

    MODULOS.forEach(function (modulo) {
      const li = document.createElement('li');
      const contenedor = document.createElement(modulo.disponible ? 'a' : 'div');
      contenedor.className = 'pg-modulo';
      if (modulo.disponible) contenedor.href = modulo.href;

      const texto = document.createElement('span');
      texto.className = 'pg-modulo__texto';
      const nombre = document.createElement('strong');
      nombre.textContent = modulo.nombre;
      texto.appendChild(nombre);

      const estado = document.createElement('span');
      estado.className = 'pg-modulo__estado';

      if (!modulo.disponible) {
        estado.textContent = 'Próximamente';
      } else {
        const hechos = modulo.pasos.filter(function (paso) { return progreso.logros.indexOf(paso.logro) !== -1; });
        const completo = progreso.insignias.indexOf(modulo.insignia) !== -1;

        const detalle = document.createElement('span');
        detalle.className = 'pg-modulo__detalle';
        detalle.textContent = modulo.pasos.map(function (paso) {
          return paso.nombre + ': ' + (progreso.logros.indexOf(paso.logro) !== -1 ? 'hecho' : 'pendiente');
        }).join(' · ');
        texto.appendChild(detalle);

        if (completo) {
          estado.textContent = 'Completado';
          estado.classList.add('pg-modulo__estado--completado');
        } else if (hechos.length > 0) {
          estado.textContent = 'En progreso';
          estado.classList.add('pg-modulo__estado--progreso');
        } else {
          estado.textContent = 'Sin empezar';
        }
      }

      contenedor.appendChild(texto);
      contenedor.appendChild(estado);
      li.appendChild(contenedor);
      el.modulos.appendChild(li);
    });
  }

  function dibujar() {
    const progreso = BPC.getProgreso();
    dibujarResumen(progreso);
    dibujarNivel(progreso);
    dibujarInsignias(progreso);
    dibujarModulos(progreso);
  }

  /* ---------- Reiniciar ---------- */

  function reiniciar() {
    BPC.reiniciar();
    dibujar();
    el.aviso.hidden = false;
    el.titulo.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  el.reiniciar.addEventListener('click', function () {
    el.aviso.hidden = true;
    if (typeof el.dialogo.showModal === 'function') {
      el.dialogo.showModal();
    } else if (window.confirm('¿Reiniciar tu progreso? Se borrarán tus puntos, insignias y diagnóstico.')) {
      reiniciar();
    }
  });

  el.dialogo.addEventListener('close', function () {
    if (el.dialogo.returnValue === 'confirmar') reiniciar();
    el.dialogo.returnValue = '';
  });

  /* ---------- Inicio ---------- */

  dibujar();
})();
