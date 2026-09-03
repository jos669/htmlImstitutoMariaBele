/* ============================================================
   data-loader.js — Carga del snapshot público data.json
   ------------------------------------------------------------
   Uso compartido:
   - docs/ (GitHub Pages): carga data.json, muestra badge de versión
     en el header y mantiene una copia local (localStorage).
   - APK offline (admin_offline.js): reutiliza cargarSnapshot()
     con fallback silencioso a la copia local si no hay red.

   Contrato de data.json (generado por exportar.py):
   {
     "version": <int>,
     "fecha_actualizacion": "<ISO>",
     "datos": { "papeleria": [...], "expedientes": [...] }
   }
   ============================================================ */

(function (global) {
  'use strict';

  var CACHE_KEY = 'mbm_data_v1';
  var DATA_URL = 'data.json';

  /** Lee la copia local (localStorage). Devuelve null si no existe o está corrupta. */
  function leerCopiaLocal() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || typeof obj.version !== 'number' || !obj.datos) return null;
      return obj;
    } catch (e) {
      return null;
    }
  }

  /** Guarda el snapshot completo como copia local. */
  function guardarCopiaLocal(payload) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Carga el snapshot público.
   * 1) fetch(data.json) con cache-busting (?ts=).
   * 2) Si falla la red, usa la copia local (fallback silencioso).
   * 3) Si tampoco hay copia local, devuelve { ok: false }.
   * Devuelve { ok, payload, desdeRed }.
   */
  function cargarSnapshot() {
    return fetch(DATA_URL + '?ts=' + Date.now(), { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (payload) {
        if (!payload || typeof payload.version !== 'number') throw new Error('data.json inválido');
        return { ok: true, payload: payload, desdeRed: true };
      })
      .catch(function () {
        // Fallback silencioso a la copia local (sin errores al usuario).
        var local = leerCopiaLocal();
        if (local) return { ok: true, payload: local, desdeRed: false };
        return { ok: false, payload: null, desdeRed: false };
      });
  }

  /** Compara versiones: 1 = nueva, 0 = igual, -1 = vieja, null = sin local. */
  function compararVersion(local, remota) {
    if (!local) return null;
    if (remota > local.version) return 1;
    if (remota === local.version) return 0;
    return -1;
  }

  /**
   * Carga el snapshot y, si la versión remota es nueva, reemplaza la copia
   * local. Devuelve el payload vigente (remoto o local) o null.
   */
  function cargarYActualizarCopia() {
    return cargarSnapshot().then(function (result) {
      if (!result.ok) return null;
      if (result.desdeRed) {
        var cmp = compararVersion(leerCopiaLocal(), result.payload.version);
        if (cmp === 1 || cmp === null) {
          guardarCopiaLocal(result.payload); // versión nueva → reemplazar
        }
      }
      return result.payload;
    });
  }

  /**
   * Badge de versión en el header (docs y APK).
   * Crea o actualiza un elemento con id="data-version-badge".
   * Usa estilos en línea para no depender de archivos CSS duplicados.
   */
  function actualizarBadge(payload, desdeRed) {
    var badge = document.getElementById('data-version-badge');
    if (!badge) return;
    if (!payload || typeof payload.version !== 'number') {
      badge.textContent = 'datos no disponibles';
      badge.style.backgroundColor = 'rgba(220, 38, 38, 0.15)';
      badge.style.color = '#dc2626';
      return;
    }
    var fecha = (payload.fecha_actualizacion || '').slice(0, 10) || '?';
    var origen = desdeRed ? 'web' : 'local';
    badge.textContent = 'v' + payload.version + ' · ' + fecha + ' · ' + origen;
    badge.style.backgroundColor = 'rgba(16, 185, 129, 0.12)';
    badge.style.color = '#059669';
  }

  global.DataLoader = {
    CACHE_KEY: CACHE_KEY,
    leerCopiaLocal: leerCopiaLocal,
    guardarCopiaLocal: guardarCopiaLocal,
    cargarSnapshot: cargarSnapshot,
    compararVersion: compararVersion,
    cargarYActualizarCopia: cargarYActualizarCopia,
    actualizarBadge: actualizarBadge
  };
})(window);
