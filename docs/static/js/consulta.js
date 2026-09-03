/* ============================================================
   consulta.js — Buscador público de papelería
   Depende de data-loader.js (cargarSnapshot, actualizarBadge).
   ============================================================ */
(function () {
  'use strict';

  var state = {
    data: null,
    desdeRed: false,
    resultados: [],
  };

  /* ── Normalizar texto (quitar acentos, minúsculas) ── */
  function normalizar(s) {
    return (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  /* ── Badge de estado general ── */
  function badgeEstado(estado, pct) {
    if (estado === 'completo') return '<span class="estado-badge completo">\uD83D\uDFE2 Completo</span>';
    if (estado === 'sin_requisitos') return '<span class="estado-badge sin-requisitos">\u26AA Sin requisitos</span>';
    if (pct > 50) return '<span class="estado-badge en-avance">\uD83D\uDFE1 En avance</span>';
    return '<span class="estado-badge incompleto">\uD83D\uDD34 Incompleto</span>';
  }

  /* ── Icono de estado de documento ── */
  function iconoEstado(estado) {
    switch (estado) {
      case 'en_orden': return '\uD83D\uDFE2 En orden';
      case 'no_entregado': return '\uD83D\uDD34 No entregado';
      case 'hace_falta': return '\uD83D\uDFE1 Hace falta';
      default: return '\u26AA Pendiente';
    }
  }

  /* ── Escapar HTML ── */
  function esc(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  /* ── Skeleton markup ── */
  function skeletonHTML(cuantas) {
    var html = '';
    for (var i = 0; i < cuantas; i++) {
      html += '<div class="skeleton-card">' +
        '<div class="skeleton-line w60"></div>' +
        '<div class="skeleton-line w40"></div>' +
        '<div class="skeleton-line w80"></div>' +
        '</div>';
    }
    return html;
  }

  /* ── Mostrar/ocultar secciones con fade ── */
  function mostrarSeccion(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    // Re-trigger fade animation quitando y añadiendo clase
    el.classList.remove('fade-in');
    void el.offsetWidth; // force reflow
    el.classList.add('fade-in');
  }

  function ocultarTodo() {
    var ids = ['section-sin-datos', 'section-busqueda', 'section-lista', 'section-detalle', 'section-skeleton'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  }

  /* ── Mostrar pantalla de "sin datos" ── */
  function mostrarSinDatos() {
    ocultarTodo();
    var badge = document.getElementById('data-version-badge');
    if (badge) {
      badge.textContent = 'sin datos';
      badge.className = 'sin-datos';
    }
    mostrarSeccion('section-sin-datos');
  }

  /* ── Mostrar búsqueda inicial ── */
  function mostrarBusqueda() {
    ocultarTodo();
    mostrarSeccion('section-busqueda');
    var input = document.getElementById('input-buscar');
    if (input) input.focus();
  }

  /* ── Mostrar skeleton ── */
  function mostrarSkeleton() {
    var sk = document.getElementById('section-skeleton');
    if (sk) sk.innerHTML = skeletonHTML(3);
    ocultarTodo();
    mostrarSeccion('section-skeleton');
  }

  /* ── Buscar estudiantes ── */
  function buscar() {
    var input = document.getElementById('input-buscar');
    var query = input.value.trim();
    var hint = document.getElementById('hint');

    if (query.length < 3) {
      hint.textContent = 'Escribí al menos 3 caracteres para buscar.';
      ocultarTodo();
      mostrarSeccion('section-busqueda');
      document.getElementById('section-lista').classList.add('hidden');
      document.getElementById('section-detalle').classList.add('hidden');
      return;
    }

    var q = normalizar(query);
    var estudiantes = (state.data && state.data.datos && state.data.datos.estudiantes) || [];
    state.resultados = estudiantes.filter(function (e) {
      return normalizar(e.nombre_completo).indexOf(q) !== -1;
    });

    hint.textContent = '';
    ocultarTodo();
    mostrarSeccion('section-busqueda');

    if (state.resultados.length === 0) {
      document.getElementById('section-lista').classList.remove('hidden');
      document.getElementById('lista-resultados').innerHTML =
        '<p style="color:var(--text-muted);padding:1rem 0;">No se encontró ningún estudiante con ese nombre. Verificá la ortografía o intentá con otro nombre.</p>';
    } else if (state.resultados.length === 1) {
      mostrarDetalle(state.resultados[0]);
    } else {
      mostrarLista(state.resultados);
    }
  }

  /* ── Mostrar lista de resultados (desambiguación) ── */
  function mostrarLista(resultados) {
    document.getElementById('section-lista').classList.remove('hidden');
    var container = document.getElementById('lista-resultados');
    container.innerHTML = '';

    resultados.forEach(function (e, idx) {
      var total = e.requeridos || 0;
      var ok = e.completados || 0;
      var pct = total > 0 ? Math.round((ok / total) * 100) : 0;
      var div = document.createElement('div');
      div.className = 'resultado-item';
      div.style.animationDelay = (idx * 0.05) + 's';
      div.setAttribute('data-id-publico', e.id_publico);
      div.innerHTML =
        '<div class="nombre">' + esc(e.nombre_completo) + '</div>' +
        '<div class="grado-seccion">' + esc(e.grado) + (e.seccion ? ' \u00B7 ' + esc(e.seccion) : '') + '</div>' +
        '<div class="estado-resumen">' + ok + '/' + total + ' \u2022 ' + (pct < 50 ? '\uD83D\uDD34' : pct < 100 ? '\uD83D\uDFE1' : '\uD83D\uDFE2') + ' ' + pct + '%</div>';
      div.addEventListener('click', function () {
        var est = state.data.datos.estudiantes.find(function (s) { return s.id_publico === e.id_publico; });
        if (est) mostrarDetalle(est);
      });
      container.appendChild(div);
    });
  }

  /* ── Mostrar detalle de estudiante ── */
  function mostrarDetalle(est) {
    ocultarTodo();
    mostrarSeccion('section-detalle');

    var total = est.requeridos || 0;
    var ok = est.completados || 0;
    var pct = total > 0 ? Math.round((ok / total) * 100) : 0;
    var estado = est.estado_general || 'sin_requisitos';
    var cats = est.por_categoria || [];

    var html = '';
    html += '<div class="detalle-header">';
    html += '<h2>' + esc(est.nombre_completo) + '</h2>';
    html += '<div class="grado-seccion">' + esc(est.grado) + (est.seccion ? ' \u00B7 ' + esc(est.seccion) : '') + '</div>';
    html += badgeEstado(estado, pct);
    html += '</div>';

    html += '<div class="contador">' + ok + ' de ' + total + ' documentos completos</div>';

    // Por categoría — con stagger delay en items
    var docIdx = 0;
    cats.forEach(function (cat) {
      html += '<div class="categoria">';
      html += '<div class="categoria-titulo">' + esc(cat.categoria) + '</div>';
      (cat.items || []).forEach(function (item) {
        var delay = docIdx * 0.04;
        html += '<div class="doc-item" style="animation-delay:' + delay + 's;">';
        html += '<span class="doc-anio">' + (item.anio || '') + '</span>';
        html += '<span class="doc-nombre">' + esc(item.tipo || '') + '</span>';
        html += '<span class="doc-estado"><span class="icono">' + iconoEstado(item.estado) + '</span></span>';
        html += '</div>';
        docIdx++;
      });
      html += '</div>';
    });

    document.getElementById('detalle-contenido').innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Init ── */
  async function init() {
    // Mostrar skeleton mientras carga
    mostrarSkeleton();

    var res = await DataLoader.cargarSnapshot();
    if (!res.ok) {
      mostrarSinDatos();
      return;
    }
    state.data = res.payload;
    state.desdeRed = res.desdeRed;

    // Badge de versión
    var badge = document.getElementById('data-version-badge');
    if (badge && window.DataLoader) {
      DataLoader.actualizarBadge(res.payload, res.desdeRed);
    }

    mostrarBusqueda();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('input-buscar');
    var btn = document.getElementById('btn-buscar');

    // Búsqueda con debounce al escribir
    var debounceTimer = null;
    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(buscar, 300);
    });

    // Búsqueda con Enter
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        clearTimeout(debounceTimer);
        buscar();
      }
    });

    // Búsqueda con botón
    btn.addEventListener('click', function () {
      clearTimeout(debounceTimer);
      buscar();
    });

    // Volver
    document.getElementById('btn-volver').addEventListener('click', function () {
      mostrarBusqueda();
    });

    init();
  });
})();