    
        // Auto dark theme based on system preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.body.classList.add('dark-theme');
        }

        const ESTADOS = ['en_orden', 'no_entregado', 'hace_falta'];

        function getCSRFToken() {
            const m = document.querySelector('meta[name="csrf-token"]');
            return m ? m.getAttribute('content') : '';
        }

        const ESTADO_LABELS = {
            'en_orden': '🟢 En orden',
            'no_entregado': '🔴 No entregado',
            'hace_falta': '🟡 Hace falta'
        };

        let estudianteActual = null;
        let alertasGradoFilter = null;

        const alertBox = document.getElementById('alert-box');

        const tabLinkPapeleria = document.getElementById('tab-link-papeleria');
        const tabLinkTipos = document.getElementById('tab-link-tipos');
        const tabLinkAlumnos = document.getElementById('tab-link-alumnos');
        const tabLinkLogs = document.getElementById('tab-link-logs');
        const tabLinkAlertas = document.getElementById('tab-link-alertas');
        const tabLinkTitulos = document.getElementById('tab-link-titulos');
        const tabLinkSolicitudes = document.getElementById('tab-link-solicitudes');
        const tabLinkAyuda = document.getElementById('tab-link-ayuda');

        const sectionPapeleria = document.getElementById('section-papeleria');
        const sectionTipos = document.getElementById('section-tipos');
        const sectionAlumnos = document.getElementById('section-alumnos');
        const sectionLogs = document.getElementById('section-logs');
        const sectionAlertas = document.getElementById('section-alertas');
        const sectionTitulos = document.getElementById('section-titulos');
        const sectionSolicitudes = document.getElementById('section-solicitudes');
        const sectionAyuda = document.getElementById('section-ayuda');

        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            if (!container) return;
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            let icon = 'ℹ️';
            if (type === 'success') icon = '✅';
            else if (type === 'danger') icon = '❌';
            else if (type === 'warning') icon = '⚠️';
            
            toast.innerHTML = `<span>${icon}</span> <span>${sanitize(message)}</span>`;
            container.appendChild(toast);
            
            setTimeout(() => toast.classList.add('show'), 10);
            
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3500);
        }

        function copiarAlPortapapeles(texto, etiqueta) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(texto).then(() => {
                    showToast(etiqueta + ' copiado', 'success');
                }).catch(() => {
                    copiaFallback(texto, etiqueta);
                });
            } else {
                copiaFallback(texto, etiqueta);
            }
        }

        function copiaFallback(texto, etiqueta) {
            try {
                const ta = document.createElement('textarea');
                ta.value = texto;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                ta.style.pointerEvents = 'none';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                showToast(etiqueta + ' copiado', 'success');
            } catch {
                showToast('No se pudo copiar', 'danger');
            }
        }

        async function cargarStatsGenerales() {
            try {
                const resStats = await fetch('/api/admin/stats');
                const stats = await resStats.json();
                
                const resLogs = await fetch('/api/admin/logs');
                const logsData = await resLogs.json();
                
                const dashboard = document.getElementById('admin-stats-dashboard');
                
                const totalAlumnos = stats.total_estudiantes || 0;
                const totalTipos = stats.total_tipos || 0;
                const totalLogs = (logsData.logs || logsData).length || 0;
                
                dashboard.innerHTML = `
                    <span class="stats-pill"><i class="ph ph-users"></i> ${totalAlumnos}</span>
                    <span class="stats-pill"><i class="ph ph-tag"></i> ${totalTipos}</span>
                    <span class="stats-pill"><i class="ph ph-scroll"></i> ${totalLogs}</span>
                    <span class="stats-pill" style="background:#d1fae5;border-color:#a7f3d0;color:#065f46;"><i class="ph ph-lightning"></i> Activo</span>
                `;

                document.getElementById('chart-total-alumnos').textContent = `${totalAlumnos} alumnos`;
                if (totalAlumnos > 0) {
                    const pctCompleto = Math.round(((stats.completos || 0) / totalAlumnos) * 100);
                    const pctIncompleto = Math.round(((stats.incompletos || 0) / totalAlumnos) * 100);
                    document.getElementById('chart-pct-completo').textContent = `${pctCompleto}% (${stats.completos || 0})`;
                    document.getElementById('chart-bar-completo').style.width = `${pctCompleto}%`;
                    document.getElementById('chart-pct-incompleto').textContent = `${pctIncompleto}% (${stats.incompletos || 0})`;
                    document.getElementById('chart-bar-incompleto').style.width = `${pctIncompleto}%`;
                }
            } catch (err) {
                console.error("Error loading admin stats:", err);
            }
        }

        async function poblarSelectoresExportacion() {
            try {
                const res = await fetch('/api/admin/grados-secciones');
                if (!res.ok) return;
                const data = await res.json();
                const gradoSel = document.getElementById('export-grado');
                const seccionSel = document.getElementById('export-seccion');
                if (gradoSel) {
                    gradoSel.innerHTML = '<option value="">Seleccionar...</option>';
                    (data.grados || []).forEach(g => {
                        gradoSel.innerHTML += `<option value="${sanitize(g)}">${sanitize(g)}</option>`;
                    });
                }
                if (seccionSel) {
                    seccionSel.innerHTML = '<option value="">Seleccionar...</option>';
                    (data.secciones || []).forEach(s => {
                        seccionSel.innerHTML += `<option value="${sanitize(s)}">${sanitize(s)}</option>`;
                    });
                }
            } catch (e) {}
        }

        window.addEventListener('DOMContentLoaded', () => {
            cargarStatsGenerales();
            poblarSelectoresExportacion();
            initAniosDinamicos();

            tabLinkPapeleria.addEventListener('click', () => switchTab('papeleria'));
            tabLinkTipos.addEventListener('click', () => { switchTab('tipos'); cargarTipos(); });
            tabLinkAlumnos.addEventListener('click', () => { switchTab('alumnos'); cargarEstudiantes(); });
            tabLinkLogs.addEventListener('click', () => { switchTab('logs'); cargarLogs(); });
            tabLinkAlertas.addEventListener('click', () => { switchTab('alertas'); cargarAlertas(); });
            tabLinkTitulos?.addEventListener('click', () => { switchTab('titulos'); cargarTitulos(); });
            tabLinkSolicitudes.addEventListener('click', () => { switchTab('solicitudes'); cargarSolicitudes(); });
            tabLinkAyuda?.addEventListener('click', () => { switchTab('ayuda'); cargarAyuda(); });

            document.getElementById('btn-buscar').addEventListener('click', buscarEstudiante);
            document.getElementById('buscar-estudiante').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') buscarEstudiante();
            });

            // Debounced autocomplete search
            let debounceTimeout;
            const searchInput = document.getElementById('buscar-estudiante');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    clearTimeout(debounceTimeout);
                    const q = e.target.value.trim();
                    if (q.length >= 2) {
                        debounceTimeout = setTimeout(() => {
                            buscarEstudiante();
                        }, 300);
                    } else if (q.length === 0) {
                        document.getElementById('resultados-busqueda').innerHTML = '';
                    }
                });
            }

            document.getElementById('form-tipo').addEventListener('submit', handleCrearTipo);
            document.getElementById('btn-crear-alumno').addEventListener('click', abrirModalCrearAlumno);
            document.getElementById('btn-refrescar-logs').addEventListener('click', cargarLogs);

            // Alumnos: filter, refresh, export
            const filtroAlumnos = document.getElementById('filtro-alumnos');
            if (filtroAlumnos) {
                filtroAlumnos.addEventListener('input', () => cargarEstudiantes(filtroAlumnos.value));
            }
            document.getElementById('btn-refrescar-alumnos')?.addEventListener('click', () => cargarEstudiantes(filtroAlumnos?.value || ''));
            document.getElementById('btn-exportar-alumnos')?.addEventListener('click', () => {
                const params = new URLSearchParams();
                const q = filtroAlumnos?.value.trim();
                if (q) params.set('q', q);
                window.open(`/api/admin/alumnos/exportar?${params.toString()}`, '_blank');
                showToast('Descargando Excel de estudiantes...', 'success');
            });

            // Export dropdown toggle
            const exportDropdown = document.querySelector('.export-dropdown');
            const exportMenu = document.querySelector('.export-dropdown-menu');
            if (exportDropdown && exportMenu) {
                exportDropdown.querySelector('.export-dropdown-trigger').addEventListener('click', (e) => {
                    e.stopPropagation();
                    exportMenu.classList.toggle('visible');
                });
                document.addEventListener('click', (e) => {
                    if (!exportDropdown.contains(e.target)) {
                        exportMenu.classList.remove('visible');
                    }
                });
                exportMenu.querySelectorAll('.export-dropdown-item').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const anio = document.getElementById('csv-anio')?.value || '';
                        exportarCSV(btn.dataset.estado, anio);
                        exportMenu.classList.remove('visible');
                    });
                });
            }

            document.getElementById('btn-exportar-excel').addEventListener('click', () => {
                const grado = document.getElementById('export-grado').value;
                const seccion = document.getElementById('export-seccion').value;
                const caja = document.getElementById('export-caja').value.trim();
                if (!grado || !seccion) {
                    showToast('Seleccione grado y sección.', 'warning');
                    return;
                }
                const params = new URLSearchParams({ grado, seccion });
                if (caja) params.set('caja', caja);
                window.open(`/api/admin/exportar/grado?${params.toString()}`, '_blank');
                showToast('Descargando Excel...', 'success');
            });

            // Quick search at top
            const quickInput = document.getElementById('quick-search-input');
            const quickBtn = document.getElementById('quick-search-btn');
            const quickResults = document.getElementById('quick-search-results');
            let prevLength = 0;

            function doQuickSearch(isDeleting = false) {
                const q = quickInput.value.trim();
                if (q.length < 2) { quickResults.style.display = 'none'; return; }
                fetch(`/api/admin/buscar?q=${encodeURIComponent(q)}`)
                    .then(r => r.json())
                    .then(data => {
                        quickResults.innerHTML = '';
                        if (data.length === 0) {
                            quickResults.innerHTML = '<div style="padding:0.75rem;color:var(--text-muted);text-align:center;">Sin resultados</div>';
                            showToast('Sin resultados.', 'warning');
                        } else if (data.length === 1 && !isDeleting) {
                            const est = data[0];
                            quickResults.style.display = 'none';
                            quickInput.value = est.nombre_completo;
                            irAPapeleria(est.cui);
                            showToast(`Redirigiendo a ${est.nombre_completo}...`, 'success');
                            return;
                        } else {
                            data.forEach(est => {
                                const div = document.createElement('div');
                                div.style.cssText = 'padding:0.65rem 1rem;cursor:pointer;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;';
                                const nameSpan = document.createElement('strong');
                                nameSpan.textContent = est.nombre_completo;
                                const detailSpan = document.createElement('span');
                                detailSpan.style.cssText = 'font-size:0.8rem;color:var(--text-muted);';
                                detailSpan.textContent = `${est.grado} - ${est.seccion}`;
                                div.appendChild(nameSpan);
                                div.appendChild(detailSpan);
                                div.addEventListener('click', () => {
                                    quickResults.style.display = 'none';
                                    quickInput.value = est.nombre_completo;
                                    irAPapeleria(est.cui);
                                });
                                div.addEventListener('mouseenter', () => div.style.background = 'var(--primary-bg)');
                                div.addEventListener('mouseleave', () => div.style.background = '');
                                quickResults.appendChild(div);
                            });
                            showToast(`${data.length} resultados encontrados. Seleccione uno de la lista.`, 'info');
                        }
                        quickResults.style.display = 'block';
                    })
                    .catch(() => {
                        quickResults.innerHTML = '<div style="padding:0.75rem;color:var(--danger);text-align:center;">Error al buscar</div>';
                        quickResults.style.display = 'block';
                    });
            }

            let quickDebounce;
            quickInput.addEventListener('input', () => {
                clearTimeout(quickDebounce);
                const isDeleting = quickInput.value.length < prevLength;
                prevLength = quickInput.value.length;
                if (quickInput.value.trim().length >= 2) {
                    quickDebounce = setTimeout(() => doQuickSearch(isDeleting), 1500);
                } else {
                    quickResults.style.display = 'none';
                }
            });
            quickBtn.addEventListener('click', doQuickSearch);
            quickInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') doQuickSearch();
            });
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#quick-search-input') && !e.target.closest('#quick-search-results') && !e.target.closest('#quick-search-btn')) {
                    quickResults.style.display = 'none';
                }
            });

            ['al-cui'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });
            });

            // Toggle chart panel
            const chartToggle = document.getElementById('btn-toggle-chart');
            const chartPanel = document.getElementById('chart-panel');
            if (chartToggle && chartPanel) {
                chartToggle.addEventListener('click', () => {
                    chartPanel.classList.toggle('hidden');
                    chartToggle.classList.toggle('active');
                });
            }

            const toggleSidebarBtn = document.getElementById('btn-toggle-sidebar');
            if (toggleSidebarBtn) {
                toggleSidebarBtn.addEventListener('click', () => {
                    document.querySelector('.admin-sidebar').classList.toggle('collapsed');
                    document.querySelector('.admin-grid').classList.toggle('sidebar-collapsed');
                });
            }

            const sidebarMQ = window.matchMedia('(max-width: 992px)');
            function handleSidebarBreakpoint(e) {
                if (e.matches) {
                    document.querySelector('.admin-sidebar')?.classList.remove('collapsed');
                    document.querySelector('.admin-grid')?.classList.remove('sidebar-collapsed');
                }
            }
            sidebarMQ.addEventListener('change', handleSidebarBreakpoint);
            handleSidebarBreakpoint(sidebarMQ);

            document.getElementById('btn-cerrar-editar')?.addEventListener('click', () => {
                document.getElementById('modal-editar-alumno').classList.remove('active');
            });
            document.getElementById('modal-editar-alumno')?.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    e.currentTarget.classList.remove('active');
                }
            });

            document.getElementById('form-editar-alumno')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const cui = document.getElementById('edit-cui').value;
                const btn = document.getElementById('btn-guardar-editar');
                btn.disabled = true;
                btn.textContent = 'Guardando...';
                try {
                    const res = await fetch(`/api/admin/alumnos/${cui}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRFToken() },
                        body: JSON.stringify({
                            nombre_completo: document.getElementById('edit-nombre').value.trim(),
                            grado: document.getElementById('edit-grado').value.trim(),
                            seccion: document.getElementById('edit-seccion').value.trim(),
                            anios: document.getElementById('edit-anios').value.trim(),
                            caja: document.getElementById('edit-caja').value.trim(),
                            ubicacion: document.getElementById('edit-ubicacion').value.trim()
                        })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        const _editNombre = document.getElementById('edit-nombre').value.trim();
                        showToast(`✅ Datos de ${_editNombre} actualizados.`, 'success');
                        document.getElementById('modal-editar-alumno').classList.remove('active');
                        const filtro = document.getElementById('filtro-alumnos')?.value || '';
                        cargarEstudiantes(filtro);
                        cargarStatsGenerales();
                    } else {
                        showToast(data.error || 'Error al actualizar.', 'danger');
                    }
                } catch (err) {
                    showToast('Error de conexión.', 'danger');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="ph ph-check"></i> Guardar Cambios';
                }
            });
        });

        function sanitize(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function sanitizeAttr(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }

        function escapeJS(str) {
            if (!str) return '';
            return String(str)
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/</g, '\\x3c')
                .replace(/>/g, '\\x3e');
        }

        function showAlert(msg, isSuccess = false) {
            showToast(msg, isSuccess ? 'success' : 'danger');
        }

        function switchTab(tab) {
            document.querySelectorAll('.admin-menu-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));

            const breadcrumbSection = document.getElementById('breadcrumb-section');
            const statsBar = document.getElementById('admin-stats-bar');
            const chartPanel = document.getElementById('chart-panel');
            const isPapeleria = tab === 'papeleria';
            if (statsBar) statsBar.style.display = isPapeleria ? '' : 'none';
            if (chartPanel) chartPanel.style.display = isPapeleria ? '' : 'none';

            if (tab === 'papeleria') {
                tabLinkPapeleria.classList.add('active');
                sectionPapeleria.classList.add('active');
                breadcrumbSection.textContent = 'Gestión Papelería';
            } else if (tab === 'tipos') {
                tabLinkTipos.classList.add('active');
                sectionTipos.classList.add('active');
                breadcrumbSection.textContent = 'Tipos Papelería';
            } else if (tab === 'alumnos') {
                tabLinkAlumnos.classList.add('active');
                sectionAlumnos.classList.add('active');
                breadcrumbSection.textContent = 'Gestión Alumnos';
            } else if (tab === 'logs') {
                tabLinkLogs.classList.add('active');
                sectionLogs.classList.add('active');
                breadcrumbSection.textContent = 'Logs Auditoría';
            } else if (tab === 'alertas') {
                tabLinkAlertas.classList.add('active');
                sectionAlertas.classList.add('active');
                breadcrumbSection.textContent = 'Alertas y Reportes';
            } else if (tab === 'titulos') {
                tabLinkTitulos.classList.add('active');
                sectionTitulos.classList.add('active');
                breadcrumbSection.textContent = 'Títulos';
            } else if (tab === 'solicitudes') {
                tabLinkSolicitudes.classList.add('active');
                sectionSolicitudes.classList.add('active');
                breadcrumbSection.textContent = 'Solicitudes de Búsqueda';
            } else if (tab === 'ayuda') {
                tabLinkAyuda.classList.add('active');
                sectionAyuda.classList.add('active');
                breadcrumbSection.textContent = 'Mensajes de Ayuda';
            }
        }

        /* ── Menú de opciones ── */
        window.toggleOpciones = function(e) {
            e.stopPropagation();
            const d = document.getElementById('options-dropdown');
            if (!d) return;
            d.style.display = d.style.display === 'none' ? '' : 'none';
        };
        document.addEventListener('click', function() {
            const d = document.getElementById('options-dropdown');
            if (d) d.style.display = 'none';
        });

        window.toggleTema = function(e) {
            e.stopPropagation();
            document.body.classList.toggle('dark-theme');
            localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
            const btn = document.getElementById('opt-theme');
            if (btn) btn.innerHTML = document.body.classList.contains('dark-theme')
                ? '<i class="ph ph-moon"></i> <span>Tema claro</span>'
                : '<i class="ph ph-sun-dim"></i> <span>Tema oscuro</span>';
        };

        async function handleLogout() {
            try { await fetch('/api/logout', { method: 'POST', headers: { 'X-CSRF-Token': getCSRFToken() } }); } catch (err) {}
            window.location.href = './admin_login.html';
        }

        async function buscarEstudiante() {
            const q = document.getElementById('buscar-estudiante').value.trim();
            if (!q) return;

            const container = document.getElementById('resultados-busqueda');
            container.innerHTML = '<p style="color: var(--text-muted);">Buscando...</p>';

            try {
                const response = await fetch(`/api/admin/buscar?q=${encodeURIComponent(q)}`);
                const data = await response.json();
                container.innerHTML = '';

                if (data.length === 0) {
                    container.innerHTML = '<p style="color: var(--text-muted);">No se encontraron estudiantes.</p>';
                    showToast('No se encontraron estudiantes.', 'warning');
                    limpiarEstudianteSeleccionado();
                    return;
                }

                data.forEach(est => {
                    const div = document.createElement('div');
                    div.className = 'search-result-item';
                    if (estudianteActual && est.cui === estudianteActual.cui) {
                        div.classList.add('selected');
                    }
                    const nameSpan = document.createElement('strong');
                    nameSpan.textContent = est.nombre_completo;
                    const detailSpan = document.createElement('span');
                    detailSpan.style.cssText = 'font-size:0.8rem; color: var(--text-muted);';
                    detailSpan.textContent = `CUI: ${est.cui} | ${est.grado || ''} - ${est.seccion || ''}`;
                    const leftDiv = document.createElement('div');
                    leftDiv.appendChild(nameSpan);
                    leftDiv.appendChild(document.createElement('br'));
                    leftDiv.appendChild(detailSpan);
                    const rightSpan = document.createElement('span');
                    rightSpan.style.cssText = 'font-size:0.8rem; color: var(--primary); font-weight:600;';
                    rightSpan.textContent = 'Seleccionar →';
                    div.appendChild(leftDiv);
                    div.appendChild(rightSpan);
                    div.addEventListener('click', () => seleccionarEstudiante(est));
                    container.appendChild(div);
                });
                showToast(`Búsqueda completa. Encontrados: ${data.length}`, 'success');
            } catch (err) {
                container.innerHTML = '<p style="color: var(--danger);">Error al buscar.</p>';
                showToast('Error al procesar la búsqueda.', 'danger');
            }
        }

        function limpiarEstudianteSeleccionado() {
            estudianteActual = null;
            document.getElementById('estudiante-seleccionado').classList.add('hidden');
            document.getElementById('estudiante-seleccionado').innerHTML = '';
            document.getElementById('completion-gauge-card').classList.add('hidden');
            document.getElementById('papeleria-grid-container').classList.add('hidden');
            document.getElementById('papeleria-grid-container').innerHTML = '';
            document.getElementById('selector-anio').classList.add('hidden');
            document.getElementById('resultados-busqueda').innerHTML = '';
            document.getElementById('sin-estudiante-msg').classList.remove('hidden');
        }

        function actualizarGaugeDesdeDOM() {
            const selects = document.querySelectorAll('#papeleria-grid-container .cambiar-estado');
            let total = 0, enOrden = 0;
            selects.forEach(sel => {
                total++;
                if (sel.value === 'en_orden') enOrden++;
            });
            if (total === 0) return;
            const pct = Math.round((enOrden / total) * 100);
            document.getElementById('gauge-progress').setAttribute('stroke-dasharray', `${pct}, 100`);
            document.getElementById('gauge-percentage-text').textContent = `${pct}% de papelería completa (${enOrden} de ${total} documentos en orden)`;
            const badge = document.getElementById('gauge-badge');
            if (pct === 100) {
                badge.className = 'status-cell status-en_orden';
                badge.textContent = '🟢 Completo';
            } else if (pct > 50) {
                badge.className = 'status-cell status-hace_falta';
                badge.textContent = '🟡 En avance';
            } else {
                badge.className = 'status-cell status-no_entregado';
                badge.textContent = '🔴 Incompleto';
            }
        }

        let anioActual = null;

        async function seleccionarEstudiante(est) {
            estudianteActual = est;
            document.getElementById('resultados-busqueda').innerHTML = '';
            document.getElementById('sin-estudiante-msg').classList.add('hidden');

            const header = document.getElementById('estudiante-seleccionado');
            header.classList.remove('hidden');
            const isPendiente = est.cui && est.cui.startsWith('PENDIENTE-');

            header.innerHTML = `
                <div class="estudiante-badge" style="background: var(--secondary); display: inline-flex; align-items: center; gap: 0.5rem;">
                    <i class="ph ph-user"></i> ${sanitize(est.nombre_completo)} — CUI: <span id="cui-copy-label">${sanitize(est.cui)}</span> <button class="btn-copy" onclick="copiarAlPortapapeles('${escapeJS(est.cui)}','CUI')"><i class="ph ph-copy"></i></button> ${isPendiente ? '' : `— ${sanitize(est.grado)} - ${sanitize(est.seccion)}`}
                </div>
            `;

            if (isPendiente) {
                document.getElementById('completion-gauge-card').classList.add('hidden');
                document.getElementById('selector-anio').classList.add('hidden');
                document.getElementById('skeleton-loading-admin').classList.add('hidden');
                document.getElementById('loading-papeleria').classList.add('hidden');
                document.getElementById('papeleria-grid-container').classList.add('hidden');
                document.getElementById('papeleria-grid-container').innerHTML = `
                    <div style="padding:2rem;text-align:center;background:var(--bg-card);border-radius:12px;border:1px solid var(--border);margin-top:1rem;">
                        <div style="font-size:2.5rem;margin-bottom:0.5rem;">🎓</div>
                        <p style="font-weight:600;color:var(--text-primary);margin:0 0 0.25rem;">Este estudiante es un graduado sin papelería activa</p>
                        <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem;">Su información de título está disponible en la sección Títulos</p>
                        <button class="btn btn-primary" onclick="switchTab('titulos')"><i class="ph ph-graduation-cap"></i> Ir a Títulos</button>
                    </div>
                `;
                document.getElementById('papeleria-grid-container').classList.remove('hidden');
                return;
            }

            const spinner = document.getElementById('loading-papeleria');
            const grid = document.getElementById('papeleria-grid-container');
            const skeleton = document.getElementById('skeleton-loading-admin');
            const gaugeCard = document.getElementById('completion-gauge-card');
            
            skeleton.classList.remove('hidden');
            spinner.classList.remove('hidden');
            grid.classList.add('hidden');
            gaugeCard.classList.add('hidden');
            document.getElementById('selector-anio').classList.add('hidden');

            try {
                const response = await fetch(`/api/papeleria?cui=${est.cui}`);
                const data = await response.json();
                
                // Calculate completion stats for gauge
                let total = 0, enOrden = 0;
                const gridData = data.grid || [];
                gridData.forEach(fila => {
                    fila.items.forEach(item => {
                        total++;
                        if (item.estado === 'en_orden') enOrden++;
                    });
                });
                
                if (total > 0) {
                    const pct = Math.round((enOrden / total) * 100);
                    document.getElementById('gauge-progress').setAttribute('stroke-dasharray', `${pct}, 100`);
                    document.getElementById('gauge-percentage-text').textContent = `${pct}% de papelería completa (${enOrden} de ${total} documentos en orden)`;
                    
                    const badge = document.getElementById('gauge-badge');
                    if (pct === 100) {
                        badge.className = 'status-cell status-en_orden';
                        badge.textContent = '🟢 Completo';
                    } else if (pct > 50) {
                        badge.className = 'status-cell status-hace_falta';
                        badge.textContent = '🟡 En avance';
                    } else {
                        badge.className = 'status-cell status-no_entregado';
                        badge.textContent = '🔴 Incompleto';
                    }
                    gaugeCard.classList.remove('hidden');
                }

                const anios = data.anios || [];
                const anioContainer = document.getElementById('anio-botones');
                anioContainer.innerHTML = '';
                anios.forEach(a => {
                    const btn = document.createElement('button');
                    btn.className = 'filtro-btn';
                    btn.textContent = a;
                    btn.dataset.anio = a;
                    btn.addEventListener('click', () => {
                        document.querySelectorAll('#anio-botones .filtro-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        cargarGridPorAnio(est.cui, a);
                    });
                    anioContainer.appendChild(btn);
                });

                if (anios.length > 0) {
                    document.getElementById('selector-anio').classList.remove('hidden');
                    document.getElementById('selector-anio').style.display = 'flex';
                    anioContainer.querySelector('.filtro-btn')?.classList.add('active');
                    cargarGridPorAnio(est.cui, anios[0]);
                } else {
                    document.getElementById('papeleria-grid-container').classList.add('hidden');
                    document.getElementById('papeleria-grid-container').innerHTML = '<p style="text-align:center;padding:2rem;color:var(--text-muted);">El estudiante no tiene años asignados.</p>';
                }
                showToast(`Expediente de ${est.nombre_completo} cargado.`, 'success');
            } catch (err) {
                showToast('Error al cargar la papelería del estudiante.', 'danger');
            } finally {
                spinner.classList.add('hidden');
                skeleton.classList.add('hidden');
            }
        }

        async function cargarGridPorAnio(cui, anio) {
            anioActual = anio;
            const spinner = document.getElementById('loading-papeleria');
            const skeleton = document.getElementById('skeleton-loading-admin');
            const container = document.getElementById('papeleria-grid-container');
            
            skeleton.classList.remove('hidden');
            spinner.classList.remove('hidden');
            container.classList.add('hidden');

            try {
                const response = await fetch(`/api/papeleria?cui=${cui}&anio=${anio}`);
                const data = await response.json();
                renderizarGridAdmin(data, cui, anio);
            } catch (err) {
                showToast('Error al cargar datos por año.', 'danger');
            } finally {
                spinner.classList.add('hidden');
                skeleton.classList.add('hidden');
            }
        }

        let cambiosPendientes = new Set();

        function renderizarGridAdmin(data, cui, anio) {
            const { tipos, grid = [] } = data;
            const container = document.getElementById('papeleria-grid-container');
            container.classList.remove('hidden');

            if (!tipos || tipos.length === 0) {
                container.innerHTML = '<p style="text-align:center; padding:2rem; color: var(--text-muted);">No hay tipos de papelería definidos.</p>';
                return;
            }

            cambiosPendientes = new Set();

            let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">';
            html += `<strong style="font-size:1rem;">Año ${anio}</strong>`;
            html += '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">';
            html += '<button id="btn-batch" class="btn btn-outline" style="padding:0.6rem 1rem;font-size:0.8rem;"><i class="ph ph-package"></i> Aplicar a varios</button>';
            html += '<button id="btn-guardar-papeleria" class="btn btn-primary" disabled style="padding:0.6rem 1.5rem;"><i class="ph ph-floppy-disk"></i> Guardar Cambios</button>';
            html += '</div></div>';

            html += '<div id="batch-panel" class="hidden" style="margin-bottom:1rem;padding:1rem;background:var(--primary-bg);border-radius:var(--radius-sm);border:1px solid var(--border);">';
            html += '<div style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:end;">';
            html += '<div><label style="font-size:0.75rem;font-weight:600;">Estado:</label><select id="batch-estado" class="form-control" style="padding:0.4rem 0.6rem;font-size:0.8rem;">';
            ESTADOS.forEach(e => { html += `<option value="${e}">${ESTADO_LABELS[e]}</option>`; });
            html += '</select></div>';
            html += '<div><label style="font-size:0.75rem;font-weight:600;">Años:</label><div id="batch-anios" style="display:flex;gap:0.25rem;flex-wrap:wrap;font-size:0.75rem;"></div></div>';
            html += '<button id="btn-aplicar-batch" class="btn btn-primary" style="padding:0.4rem 1rem;font-size:0.8rem;"><i class="ph ph-check-circle"></i> Aplicar a todos</button>';
            html += '</div></div>';

            html += '<table><thead><tr><th>Tipo</th><th>Estado</th><th>Observaciones</th></tr></thead><tbody>';

            const fila = grid.find(f => String(f.anio) === String(anio)) || { anio, items: [] };
            const tiposEnGrid = fila.items.length > 0 ? fila.items : tipos.map(t => ({ tipo: t, estado: null, observaciones: '' }));

            tiposEnGrid.forEach(item => {
                const estado = item.estado || 'no_entregado';
                const tipoNombre = sanitize(item.tipo);
                const obsEsc = sanitizeAttr(item.observaciones || '');
                html += `<tr><td style="text-align:left;font-weight:600;">${tipoNombre}</td>
                    <td>
                        <div class="estado-selector">
                            <select class="cambiar-estado" data-cui="${sanitizeAttr(cui)}" data-anio="${sanitizeAttr(String(anio))}" data-tipo="${sanitize(item.tipo)}" data-estado-original="${estado}">
                                ${ESTADOS.map(e => `<option value="${e}" ${e === estado ? 'selected' : ''}>${ESTADO_LABELS[e]}</option>`).join('')}
                            </select>
                        </div>
                    </td>
                    <td>
                        <input type="text" class="form-control observacion-input" value="${obsEsc}" placeholder="Observaciones..." style="width:200px;font-size:0.8rem;padding:0.3rem 0.5rem;" data-original="${obsEsc}" data-cui="${sanitizeAttr(cui)}" data-anio="${sanitizeAttr(String(anio))}" data-tipo="${sanitize(item.tipo)}">
                    </td></tr>`;
            });

            html += '</tbody></table>';
            container.innerHTML = html;

            container.querySelectorAll('.cambiar-estado').forEach(sel => {
                sel.addEventListener('change', (e) => {
                    const key = `${e.target.dataset.anio}_${e.target.dataset.tipo}`;
                    if (e.target.value !== e.target.dataset.estadoOriginal) {
                        cambiosPendientes.add(key);
                    } else {
                        cambiosPendientes.delete(key);
                    }
                    document.getElementById('btn-guardar-papeleria').disabled = cambiosPendientes.size === 0;
                });
            });

            // Batch operation panel
            const btnBatch = document.getElementById('btn-batch');
            const batchPanel = document.getElementById('batch-panel');
            if (btnBatch && batchPanel) {
                btnBatch.addEventListener('click', () => {
                    batchPanel.classList.toggle('hidden');
                    const anioContainer = document.getElementById('batch-anios');
                    if (anioContainer && !anioContainer.hasChildNodes()) {
                        const allAnios = data.anios || [];
                        allAnios.forEach(a => {
                            const label = document.createElement('label');
                            label.style.cssText = 'display:flex;align-items:center;gap:0.2rem;cursor:pointer;';
                            label.innerHTML = `<input type="checkbox" value="${a}" checked> ${a}`;
                            anioContainer.appendChild(label);
                        });
                    }
                });
            }

            document.getElementById('btn-aplicar-batch').addEventListener('click', async () => {
                const btnAplicar = document.getElementById('btn-aplicar-batch');
                btnAplicar.disabled = true;
                btnAplicar.textContent = 'Aplicando...';
                const estado = document.getElementById('batch-estado').value;
                const checks = document.querySelectorAll('#batch-anios input:checked');
                const anios = Array.from(checks).map(c => parseInt(c.value, 10));
                if (anios.length === 0) {
                    showToast('Seleccione al menos un año.', 'warning');
                    btnAplicar.disabled = false;
                    btnAplicar.innerHTML = '<i class="ph ph-check-circle"></i> Aplicar a todos';
                    return;
                }
                const selects = container.querySelectorAll('.cambiar-estado');
                const tiposAplicar = [...new Set(Array.from(selects).map(s => s.dataset.tipo))];
                if (tiposAplicar.length === 0) { btnAplicar.disabled = false; btnAplicar.innerHTML = '<i class="ph ph-check-circle"></i> Aplicar a todos'; return; }

                const cui = estudianteActual?.cui || selects[0]?.dataset.cui;
                let totalActualizados = 0;
                let huboError = false;

                for (const tipo of tiposAplicar) {
                    const payload = { cui, anios, tipo, estado };
                    try {
                        const res = await fetch('/api/admin/papeleria/batch', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRFToken() },
                            body: JSON.stringify(payload)
                        });
                        const data = await res.json();
                        if (res.ok) {
                            totalActualizados += data.actualizados || 0;
                        } else {
                            huboError = true;
                            showToast(`Error en tipo "${tipo}": ${data.error || 'desconocido'}`, 'danger');
                        }
                    } catch (err) {
                        huboError = true;
                        showToast('Error al conectar con el servidor.', 'danger');
                    }
                }

                for (const sel of selects) {
                    sel.value = estado;
                    sel.dataset.estadoOriginal = estado;
                }
                cambiosPendientes = new Set();
                document.getElementById('btn-guardar-papeleria').disabled = true;
                if (!huboError) {
                    showToast(`✅ ${totalActualizados} año(s) actualizado(s) a "${ESTADO_LABELS[estado] || estado}"`, 'success');
                } else {
                    showToast(`⚠️ Parcial: ${totalActualizados} actualizado(s)`, 'warning');
                }
                cargarStatsGenerales();
                actualizarGaugeDesdeDOM();
                btnAplicar.disabled = false;
                btnAplicar.innerHTML = '<i class="ph ph-check-circle"></i> Aplicar a todos';
            });

            document.getElementById('btn-guardar-papeleria').addEventListener('click', async () => {
                const btn = document.getElementById('btn-guardar-papeleria');
                btn.disabled = true;
                btn.textContent = 'Guardando...';

                const selects = container.querySelectorAll('.cambiar-estado');
                const actualizaciones = [];

                selects.forEach(sel => {
                    const key = `${sel.dataset.anio}_${sel.dataset.tipo}`;
                    const obsInput = container.querySelector(`input.observacion-input[data-anio="${sel.dataset.anio}"][data-tipo="${sel.dataset.tipo}"]`);
                    const obsOriginal = obsInput ? obsInput.dataset.original : '';
                    const obsActual = obsInput ? obsInput.value : '';
                    const obsChanged = obsActual !== obsOriginal;
                    if (cambiosPendientes.has(key) || obsChanged) {
                        actualizaciones.push({
                            cui: sel.dataset.cui,
                            anio: parseInt(sel.dataset.anio),
                            tipo: sel.dataset.tipo,
                            estado: sel.value,
                            observaciones: obsActual
                        });
                        if (obsInput) obsInput.dataset.original = obsActual;
                    }
                });

                let errores = 0;
                for (const act of actualizaciones) {
                    try {
                        const response = await fetch('/api/admin/papeleria', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRFToken() },
                            body: JSON.stringify(act)
                        });
                        if (response.ok) {
                            const sel = container.querySelector(`select[data-anio="${act.anio}"][data-tipo="${act.tipo}"]`);
                            if (sel) sel.dataset.estadoOriginal = act.estado;
                            const obsInput = container.querySelector(`input.observacion-input[data-anio="${act.anio}"][data-tipo="${act.tipo}"]`);
                            if (obsInput) obsInput.dataset.original = obsInput.value;
                        } else {
                            errores++;
                        }
                    } catch (err) {
                        errores++;
                    }
                }

                if (errores === 0) {
                    showAlert(`✅ ${actualizaciones.length} cambio(s) guardado(s).`, true);
                    cargarStatsGenerales();
                    actualizarGaugeDesdeDOM();
                } else {
                    showAlert(`⚠️ ${actualizaciones.length - errores} guardados, ${errores} error(es).`);
                }

                cambiosPendientes = new Set();
                btn.disabled = true;
                btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Guardar Cambios';
            });
        }

        async function handleCrearTipo(e) {
            e.preventDefault();
            const input = document.getElementById('input-nuevo-tipo');
            const categoria = document.getElementById('input-categoria-tipo').value;
            const nombre = input.value.trim();
            if (!nombre) return;

            const btn = document.getElementById('btn-crear-tipo');
            btn.disabled = true;

            try {
                const response = await fetch('/api/admin/tipos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRFToken() },
                    body: JSON.stringify({ nombre, categoria })
                });
                const data = await response.json();
                if (response.ok) {
                    showAlert(`✅ Tipo "${nombre}" [${categoria}] creado.`, true);
                    input.value = '';
                    cargarTipos();
                } else {
                    showAlert(data.error || 'Error al crear tipo.');
                }
            } catch (err) {
                showAlert('Error de conexión.');
            } finally {
                btn.disabled = false;
            }
        }

        async function cargarTipos() {
            const container = document.getElementById('tipos-container');

            try {
                const response = await fetch('/api/admin/tipos');
                const tipos = await response.json();

                if (tipos.length === 0) {
                    container.innerHTML = '<p style="color: var(--text-muted);">No hay tipos de papelería definidos. Agregue el primero arriba.</p>';
                    return;
                }

                let html = '<div class="tipo-grid">';
                tipos.forEach(t => {
                    const catIcon = {'Documentos Personales':'<i class="ph ph-file-text"></i>', 'Académicos':'<i class="ph ph-graduation-cap"></i>', 'Administrativos':'<i class="ph ph-clipboard"></i>', 'General':'<i class="ph ph-package"></i>'}[t.categoria] || '<i class="ph ph-package"></i>';
                    const nombreSanitizado = sanitize(t.nombre);
                    const catSanitizada = sanitize(t.categoria || 'General');
                    html += `
                        <div class="tipo-tag">
                            <span>${catIcon} <strong>${nombreSanitizado}</strong> <span style="font-size:0.7rem;color:var(--text-muted);">${catSanitizada}</span></span>
                            <button class="btn-icon edit" data-tipo-id="${t.id}" data-tipo-nombre="${nombreSanitizado}" title="Editar"><i class="ph ph-pencil"></i></button>
                            <button class="btn-icon" data-tipo-id="${t.id}" title="Eliminar"><i class="ph ph-trash"></i></button>
                        </div>
                    `;
                });
                html += '</div>';
                container.innerHTML = html;
                container.querySelectorAll('.btn-icon.edit').forEach(btn => {
                    btn.addEventListener('click', () => editarTipo(parseInt(btn.dataset.tipoId), btn.dataset.tipoNombre));
                });
                container.querySelectorAll('.btn-icon[data-tipo-id]:not(.edit)').forEach(btn => {
                    btn.addEventListener('click', () => eliminarTipo(parseInt(btn.dataset.tipoId)));
                });
            } catch (err) {
                container.innerHTML = '<p style="color: var(--danger);">Error al cargar tipos.</p>';
            }
        }

        window.editarTipo = async function(id, nombreActual) {
            const nuevo = prompt('Editar nombre del tipo:', nombreActual);
            if (!nuevo || nuevo.trim() === nombreActual) return;

            try {
                const response = await fetch(`/api/admin/tipos/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRFToken() },
                    body: JSON.stringify({ nombre: nuevo.trim() })
                });
                if (response.ok) {
                    showAlert('✅ Tipo actualizado.', true);
                    cargarTipos();
                } else {
                    const data = await response.json();
                    showAlert(data.error || 'Error al actualizar.');
                }
            } catch (err) {
                showAlert('Error de conexión.');
            }
        };

        window.eliminarTipo = async function(id) {
            try {
                const preRes = await fetch(`/api/admin/tipos/count/${id}`);
                let affectedCount = 0;
                if (preRes.ok) {
                    const preData = await preRes.json();
                    affectedCount = preData.affected || 0;
                }
                let msg = '¿Eliminar este tipo de papelería?';
                if (affectedCount > 0) {
                    msg += `\n⚠️ Se eliminarán también ${affectedCount} registro(s) de papelería asociados.`;
                }
                if (!confirm(msg)) return;

                const response = await fetch(`/api/admin/tipos/${id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': getCSRFToken() } });
                if (response.ok) {
                    const data = await response.json();
                    let alertMsg = '🗑️ Tipo eliminado.';
                    if (data.affected_records > 0) {
                        alertMsg += ` (${data.affected_records} registros de papelería eliminados)`;
                    }
                    showAlert(alertMsg, true);
                    cargarTipos();
                } else {
                    const data = await response.json();
                    showAlert(data.error || 'Error al eliminar.');
                }
            } catch (err) {
                showAlert('Error de conexión.');
            }
        };

        function removerModalCrearAlumno(backdrop) {
            backdrop.remove();
            document.body.style.overflow = '';
        }

        function abrirModalCrearAlumno() {
            const existing = document.querySelector('.modal-backdrop.crear-alumno');
            if (existing) return;
            const template = document.getElementById('template-crear-alumno');
            if (!template) return;
            const content = template.content.cloneNode(true);
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop crear-alumno';
            backdrop.appendChild(content);
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) removerModalCrearAlumno(backdrop);
            });
            backdrop.querySelectorAll('.cerrar-crear-alumno').forEach(btn => {
                btn.addEventListener('click', () => removerModalCrearAlumno(backdrop));
            });
            document.body.style.overflow = 'hidden';
            document.body.appendChild(backdrop);
            backdrop.querySelector('#form-crear-alumno').addEventListener('submit', handleCrearAlumno);
            initAniosDinamicos();
        }

        async function handleCrearAlumno(e) {
            e.preventDefault();
            const submitBtn = document.getElementById('btn-crear-alumno-submit');
            submitBtn.disabled = true;
            const banner = document.getElementById('banner-error-alumno');
            if (banner) banner.style.display = 'none';

            const cui = document.getElementById('al-cui').value.trim();
            const nombre_completo = document.getElementById('al-nombre').value.trim();
            const grado = document.getElementById('al-grado').value.trim();
            const seccion = document.getElementById('al-seccion').value.trim();

            const checks = document.querySelectorAll('.anio-check:checked');
            const extraRaw = document.getElementById('al-anios-extra').value.trim();
            const extras = extraRaw ? extraRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
            const todos = [...Array.from(checks).map(c => c.value), ...extras];
            const anios = todos.join(',');

            if (!anios) {
                showAlert('Debe seleccionar o escribir al menos un año.');
                submitBtn.disabled = false;
                return;
            }

            const totalAnios = checks.length + extras.length;
            if (totalAnios > 3) {
                showAlert(`Máximo 3 años en total (seleccionados: ${checks.length}, adicionales: ${extras.length}).`);
                submitBtn.disabled = false;
                return;
            }

            if (cui.length !== 13) {
                showAlert('El CUI debe tener 13 dígitos.');
                submitBtn.disabled = false;
                return;
            }

            try {
                const response = await fetch('/api/admin/alumnos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRFToken() },
                    body: JSON.stringify({ cui, nombre_completo, grado, seccion, anios, codigo_expediente: document.getElementById('al-expediente-codigo').value.trim(), caja: document.getElementById('al-caja').value.trim() })
                });
                const data = await response.json();
                if (response.ok) {
                    showAlert(`✅ ${nombre_completo} registrado en ${grado} ${seccion}.`, true);
                    const backdrop = document.querySelector('.modal-backdrop.crear-alumno');
                    if (backdrop) removerModalCrearAlumno(backdrop);
                    cargarEstudiantes();
                    cargarStatsGenerales();
                } else {
                    const msg = data.error || 'Error al crear.';
                    showAlert(msg, 'danger');
                    if (banner) {
                        banner.textContent = msg;
                        banner.style.display = 'block';
                    }
                }
            } catch (err) {
                showAlert('Error de conexión.', 'danger');
                if (banner) {
                    banner.textContent = 'Error de conexión con el servidor.';
                    banner.style.display = 'block';
                }
            } finally {
                submitBtn.disabled = false;
            }
        }

        async function cargarEstudiantes(filtro) {
            const tbody = document.getElementById('tbody-estudiantes');
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);">Consultando...</td></tr>';

            try {
                const response = await fetch('/api/admin/alumnos');
                let estudiantes = await response.json();

                tbody.innerHTML = '';

                if (filtro) {
                    const q = filtro.toLowerCase();
                    estudiantes = estudiantes.filter(e =>
                        (e.nombre_completo || '').toLowerCase().includes(q) ||
                        (e.cui || '').toLowerCase().includes(q)
                    );
                }

                if (estudiantes.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay alumnos.</td></tr>';
                    return;
                }

                estudiantes.forEach(est => {
                    if (est.rol === 'admin') return;
                    const consentPill = est.acepto_consentimiento
                        ? '<span class="status-pill success">Aceptado</span>'
                        : '<span class="status-pill danger">Pendiente</span>';
                    const aniosStr = sanitize(est.anios) || '—';
                    const cuiEsc = sanitize(est.cui);
                    const nomEsc = sanitize(est.nombre_completo);
                    const gradoEsc = sanitize(est.grado);
                    const secEsc = sanitize(est.seccion);
                    tbody.insertAdjacentHTML('beforeend', `
                        <tr>
                            <td style="white-space:nowrap;"><strong>${cuiEsc}</strong> <button class="btn-copy" onclick="copiarAlPortapapeles('${escapeJS(est.cui)}','CUI')"><i class="ph ph-copy"></i></button></td>
                            <td>${nomEsc}</td>
                            <td>${gradoEsc}</td>
                            <td>${secEsc}</td>
                            <td>${aniosStr}</td>
                            <td>${consentPill}</td>
                            <td style="font-size:0.75rem;max-width:200px;">${est.expediente ? `📦 ${est.expediente.codigo_expediente||''}<br>📌 Caja: ${est.expediente.caja||'-'} | ${est.expediente.ubicacion||'-'}<br>${getBadgeEstadoFisico(est.expediente.estado)}<br><div style="display:flex;gap:0.25rem;margin-top:0.25rem;flex-wrap:wrap;"><button class="btn btn-outline" style="font-size:0.65rem;padding:0.2rem 0.4rem;" onclick="verificarExpediente('${escapeJS(est.cui)}')">✅ Verificar</button><button class="btn btn-outline" style="font-size:0.65rem;padding:0.2rem 0.4rem;" onclick="cambiarEstadoExpediente('${escapeJS(est.cui)}')">🔁 Estado</button><button class="btn btn-outline" style="font-size:0.65rem;padding:0.2rem 0.4rem;" onclick="verHistorial('${escapeJS(est.cui)}','${escapeJS(est.nombre_completo)}')">📋 Historial</button></div>` : '—'}</td>
                            <td style="white-space:nowrap;">
                                <button class="btn btn-outline" style="font-size:0.75rem;padding:0.3rem 0.6rem;" onclick="editarEstudiante('${escapeJS(est.cui)}', '${escapeJS(est.nombre_completo)}', '${escapeJS(est.grado)}', '${escapeJS(est.seccion)}', '${escapeJS(aniosStr)}')"><i class="ph ph-pencil"></i></button>
                                <button class="btn btn-outline" style="font-size:0.75rem;padding:0.3rem 0.6rem;color:var(--accent);" onclick="verQR('${escapeJS(est.cui)}', '${escapeJS(est.nombre_completo)}')"><i class="ph ph-qr-code"></i></button>
                                <button class="btn btn-outline" style="font-size:0.75rem;padding:0.3rem 0.6rem;color:var(--danger);" onclick="subirPDF('${escapeJS(est.cui)}', '${escapeJS(est.nombre_completo)}')"><i class="ph ph-file-pdf"></i></button>
                                <button class="btn btn-outline" style="font-size:0.75rem;padding:0.3rem 0.6rem;color:var(--danger);" onclick="eliminarEstudiante('${escapeJS(est.cui)}', '${escapeJS(est.nombre_completo)}')"><i class="ph ph-trash"></i></button>
                            </td>
                        </tr>
                    `);
                });
            } catch (err) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--danger);">Error al cargar.</td></tr>';
            }
        }

        window.eliminarEstudiante = async function(cui, nombre) {
            if (!confirm(`¿Eliminar al estudiante "${nombre}" (CUI: ${cui})?\n\nSe borrará su cuenta y toda su papelería registrada. Esta acción no se puede deshacer.`)) return;

            try {
                const response = await fetch(`/api/admin/alumnos/${cui}`, { method: 'DELETE', headers: { 'X-CSRF-Token': getCSRFToken() } });
                const data = await response.json();
                if (response.ok) {
                    showAlert(`🗑️ Estudiante "${nombre}" eliminado.`, true);
                    cargarEstudiantes();
                    cargarStatsGenerales();
                } else {
                    showAlert(data.error || 'Error al eliminar.');
                }
            } catch (err) {
                showAlert('Error de conexión.');
            }
        }

;

        window.verQR = async function(cui, nombre) {
            try {
                const res = await fetch(`/api/admin/verificacion/${cui}`);
                if (!res.ok) throw new Error('Error al obtener código QR');
                const data = await res.json();
                const url = data.url;
                const qrImg = data.qr_data
                    ? `<img src="${sanitize(data.qr_data)}" alt="QR" style="border-radius:8px;width:200px;height:200px;">`
                    : `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" alt="QR" style="border-radius:8px;width:200px;height:200px;">`;
                const modalHtml = `
                    <div class="modal-backdrop" onclick="this.remove()">
                        <div class="modal-content" style="max-width:400px;text-align:center;" onclick="event.stopPropagation()">
                            <span class="modal-close" onclick="this.closest('.modal-backdrop').remove()">&times;</span>
                            <h3 style="margin-bottom:0.5rem;">Código QR de Verificación</h3>
                            <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1rem;">${sanitize(nombre)}</p>
                            <div style="background:#fff;border-radius:12px;padding:1rem;display:inline-block;margin-bottom:1rem;">
                                ${qrImg}
                            </div>
                            <p style="font-size:0.8rem;word-break:break-all;color:var(--text-muted);">
                                <a href="${url.startsWith('http://') || url.startsWith('https://') ? sanitize(url) : '#'}" target="_blank" rel="noopener">${sanitize(url)}</a>
                            </p>
                            <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${escapeJS(url)}').then(()=>showToast('Enlace copiado'))" style="margin-top:0.5rem;">
                                <i class="ph ph-copy"></i> Copiar enlace
                            </button>
                        </div>
                    </div>`;
                document.body.insertAdjacentHTML('beforeend', modalHtml);
            } catch (err) {
                showAlert('Error al generar código QR.', 'danger');
            }
        };

        let logsPagina = 1;

        async function cargarLogs(pagina) {
            if (pagina !== undefined) logsPagina = pagina;
            const tbody = document.getElementById('tbody-logs');
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">Consultando...</td></tr>';

            try {
                const response = await fetch(`/api/admin/logs?page=${logsPagina}&per_page=50`);
                const data = await response.json();
                tbody.innerHTML = '';

                const logs = data.logs || [];
                if (logs.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Sin registros.</td></tr>';
                    return;
                }

                logs.forEach(log => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><small>${formatDateTime(log.timestamp)}</small></td>
                        <td><code>${sanitize(log.usuario_cui)}</code></td>
                        <td>${sanitize(log.usuario_nombre) || '<span style="color:var(--text-muted);">—</span>'}</td>
                        <td><strong>${sanitize(log.accion)}</strong></td>
                        <td><span style="font-size:0.85rem;color:#475569;">${sanitize(log.detalles || '')}</span></td>
                        <td><code>${sanitize(log.direccion_ip)}</code></td>
                    `;
                    tbody.appendChild(tr);
                });

                const pagination = document.getElementById('logs-pagination');
                if (pagination) {
                    const totalPages = Math.ceil((data.total || 0) / (data.per_page || 50));
                    if (totalPages > 1) {
                        let html = '<div style="display:flex;gap:0.5rem;justify-content:center;margin-top:1rem;flex-wrap:wrap;">';
                        for (let i = 1; i <= totalPages; i++) {
                            html += `<button class="btn ${i === logsPagina ? 'btn-primary' : 'btn-outline'}" style="font-size:0.8rem;padding:0.3rem 0.7rem;" onclick="cargarLogs(${i})">${i}</button>`;
                        }
                        html += '</div>';
                        pagination.innerHTML = html;
                    } else {
                        pagination.innerHTML = '';
                    }
                }
            } catch (err) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--danger);">Error al cargar.</td></tr>';
            }
        }

        function formatDateTime(isoStr) {
            if (!isoStr) return '-';
            try {
                const d = new Date(isoStr);
                if (isNaN(d.getTime())) return isoStr;
                const pad = (n) => n.toString().padStart(2, '0');
                return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
            } catch (e) { return isoStr; }
        }

        async function cargarAlertas() {
            const container = document.getElementById('alertas-container');
            container.innerHTML = '<p style="color: var(--text-muted);">Consultando...</p>';

            try {
                let alertas = [];
                let statsGrados = [];

                try {
                    const resAlertas = await fetch('/api/admin/papeleria/alertas');
                    if (resAlertas.ok) alertas = await resAlertas.json();
                } catch (e) { console.error('Error loading alertas:', e); }

                try {
                    const resStats = await fetch('/api/admin/stats/grados');
                    if (resStats.ok) statsGrados = await resStats.json();
                } catch (e) { console.error('Error loading stats grados:', e); }

                let html = '';

                // Stats por grado cards
                if (statsGrados.length > 0) {
                    html += '<h3 style="font-size:1rem;margin-bottom:0.75rem;"><i class="ph ph-chart-bar"></i> Estado por Grado</h3>';
                    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.75rem;margin-bottom:1.5rem;">';
                    statsGrados.forEach(s => {
                        const pct = s.total_requeridos > 0 ? Math.round((s.en_orden / s.total_requeridos) * 100) : 0;
                        html += `
                            <div class="stat-card grado-card" data-grado="${sanitizeAttr(s.grado)}" data-seccion="${sanitizeAttr(s.seccion)}" style="padding:1rem;cursor:pointer;">
                                <div style="font-weight:700;font-size:0.9rem;">${sanitize(s.grado) || 'Sin grado'} - ${sanitize(s.seccion) || '?'}</div>
                                <div style="display:flex;gap:0.5rem;margin-top:0.5rem;font-size:0.75rem;flex-wrap:wrap;">
                                    <span style="color:var(--success);">🟢 ${s.en_orden}</span>
                                    <span style="color:var(--warning);">🟡 ${s.hace_falta}</span>
                                    <span style="color:var(--danger);">🔴 ${s.no_entregado}</span>
                                    <span style="color:var(--text-muted);"><i class="ph ph-users"></i> ${s.total_alumnos} alumnos</span>
                                </div>
                                <div style="height:6px;background:var(--border);border-radius:3px;margin-top:0.5rem;overflow:hidden;">
                                    <div style="width:${pct}%;height:100%;background:${pct > 80 ? 'var(--success)' : pct > 50 ? 'var(--warning)' : 'var(--danger)'};border-radius:3px;"></div>
                                </div>
                                <div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.25rem;">${pct}% completado</div>
                            </div>
                        `;
                    });
                    html += '</div>';
                }

                // Incomplete students list
                html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">';
                html += '<h3 style="font-size:1rem;margin:0;"><i class="ph ph-warning-circle"></i> Estudiantes con papelería pendiente</h3>';
                html += '<div id="alerta-reset-bar" style="display:none;"><button class="btn btn-outline" id="btn-alerta-reset" style="font-size:0.8rem;padding:0.35rem 0.85rem;"><i class="ph ph-x"></i> Ver todos</button></div>';
                html += '</div>';
                if (alertas.length === 0) {
                    html += '<div class="stat-card" style="text-align:center;color:var(--success);padding:2rem;"><strong><i class="ph ph-check-circle"></i> Todos los estudiantes tienen su papelería completa.</strong></div>';
                } else {
                    html += '<div style="overflow-x:auto;"><table class="table" id="alerta-tabla"><thead><tr><th>CUI</th><th>Nombre</th><th>Grado</th><th>Completados</th><th>Total</th><th>Acción</th></tr></thead><tbody>';
                    alertas.forEach(est => {
                        const faltantes = est.total_docs - est.completados;
                        html += `<tr data-grado="${sanitizeAttr(est.grado)}" data-seccion="${sanitizeAttr(est.seccion)}">
                            <td><code>${sanitize(est.cui)}</code></td>
                            <td><strong>${sanitize(est.nombre_completo)}</strong></td>
                            <td>${sanitize(est.grado) || '-'} - ${sanitize(est.seccion) || '-'}</td>
                            <td><span class="status-cell status-${est.total_docs === 0 || est.completados === 0 ? 'no_entregado' : 'hace_falta'}">${est.completados || 0}</span></td>
                            <td><strong>${est.total_docs}</strong></td>
                            <td><button class="btn btn-outline" style="font-size:0.75rem;padding:0.3rem 0.6rem;" onclick="irAPapeleria('${escapeJS(est.cui)}')"><i class="ph ph-notebook"></i> Gestionar</button></td>
                        </tr>`;
                    });
                    html += '</tbody></table></div>';
                }

                container.innerHTML = html;

                if (alertasGradoFilter) {
                    applyGradoFilter(alertasGradoFilter.grado, alertasGradoFilter.seccion);
                }

                container.querySelectorAll('.grado-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const grado = card.dataset.grado;
                        const seccion = card.dataset.seccion;
                        if (alertasGradoFilter && alertasGradoFilter.grado === grado && alertasGradoFilter.seccion === seccion) {
                            alertasGradoFilter = null;
                        } else {
                            alertasGradoFilter = { grado, seccion };
                        }
                        applyGradoFilter(alertasGradoFilter ? alertasGradoFilter.grado : null, alertasGradoFilter ? alertasGradoFilter.seccion : null);
                    });
                });

                const resetBtn = document.getElementById('btn-alerta-reset');
                if (resetBtn) {
                    resetBtn.addEventListener('click', () => {
                        alertasGradoFilter = null;
                        applyGradoFilter(null, null);
                    });
                }

                try {
                    const resExtra = await fetch('/api/admin/expedientes/extraviados');
                    if (resExtra.ok) {
                        const extra = await resExtra.json();
                        if (extra.length > 0) {
                            let htmlExtra = '<div style="margin-top:1.5rem;"><h3 style="font-size:1rem;margin-bottom:0.5rem;">📦 Expedientes Extraviados</h3><table class="table"><thead><tr><th>CUI</th><th>Nombre</th><th>Grado</th><th>Caja</th><th>Último Mov.</th></tr></thead><tbody>';
                            extra.forEach(e => {
                                htmlExtra += `<tr><td>${sanitize(e.cui)}</td><td>${sanitize(e.nombre_completo||'?')}</td><td>${sanitize(e.grado||'?')}</td><td>${sanitize(e.caja||'-')}</td><td style="font-size:0.8rem;">${sanitize(e.fecha_movimiento||'?')}</td></tr>`;
                            });
                            htmlExtra += '</tbody></table></div>';
                            container.insertAdjacentHTML('beforeend', htmlExtra);
                        }
                    }
                } catch(e) {}
            } catch (err) {
                container.innerHTML = '<p style="color:var(--danger);">Error al cargar alertas.</p>';
            }
        }

        function applyGradoFilter(grado, seccion) {
            const cards = document.querySelectorAll('.grado-card');
            cards.forEach(card => {
                if (grado && card.dataset.grado === grado && card.dataset.seccion === seccion) {
                    card.classList.add('selected');
                } else {
                    card.classList.remove('selected');
                }
            });
            const rows = document.querySelectorAll('#alerta-tabla tbody tr');
            rows.forEach(row => {
                if (!grado) {
                    row.style.display = '';
                } else {
                    row.style.display = (row.dataset.grado === grado && row.dataset.seccion === seccion) ? '' : 'none';
                }
            });
            const resetBar = document.getElementById('alerta-reset-bar');
            if (resetBar) {
                resetBar.style.display = grado ? 'flex' : 'none';
            }
        }

        function exportarCSV(estado, anio) {
            const params = new URLSearchParams();
            if (estado) params.set('estado', estado);
            if (anio) params.set('anio', anio);
            window.open(`/api/admin/papeleria/export?${params.toString()}`, '_blank');
            showToast('Descargando reporte CSV...', 'success');
        }

        window.irAPapeleria = function(cui) {
            switchTab('papeleria');
            document.getElementById('buscar-estudiante').value = cui;
            setTimeout(() => buscarEstudiante(), 300);
        };

        window.editarEstudiante = async function(cui, nombre, grado, seccion, anios) {
            document.getElementById('edit-cui').value = cui;
            document.getElementById('edit-cui-display').textContent = cui;
            document.getElementById('edit-nombre').value = nombre;
            document.getElementById('edit-grado').value = grado;
            document.getElementById('edit-seccion').value = seccion;
            document.getElementById('edit-anios').value = anios;
            document.getElementById('modal-editar-alumno').classList.add('active');
            try {
                const res = await fetch(`/api/admin/expediente/${cui}`);
                if (res.ok) {
                    const exp = await res.json();
                    document.getElementById('edit-caja').value = exp.caja || '';
                    document.getElementById('edit-ubicacion').value = exp.ubicacion || '';
                    document.getElementById('edit-exp-codigo').textContent = `Código: ${exp.codigo_expediente} | Estado: ${exp.estado_fisico} | Última verificación: ${exp.ultima_verificacion || 'N/A'}`;
                } else {
                    document.getElementById('edit-exp-codigo').textContent = 'Sin expediente físico registrado.';
                }
            } catch (err) {
                document.getElementById('edit-exp-codigo').textContent = 'Sin expediente físico registrado.';
            }
            // Check PDF status
            try {
                const pdfRes = await fetch(`/api/pdf/${cui}/status`);
                const pdfData = await pdfRes.json();
                const statusEl = document.getElementById('edit-pdf-status');
                const verBtn = document.getElementById('btn-ver-pdf');
                const delBtn = document.getElementById('btn-eliminar-pdf');
                if (pdfData.disponible) {
                    statusEl.innerHTML = '<span style="color:var(--success);">● PDF disponible</span>';
                    verBtn.style.display = '';
                    delBtn.style.display = '';
                } else {
                    statusEl.innerHTML = '<span style="color:var(--text-muted);">Sin PDF</span>';
                    verBtn.style.display = 'none';
                    delBtn.style.display = 'none';
                }
            } catch (e) {
                document.getElementById('edit-pdf-status').textContent = 'Error al verificar PDF';
            }
        };

        // ── Años Dinámicos ──
        function initAniosDinamicos() {
            const currentYear = new Date().getFullYear();
            const anios = [];
            for (let y = currentYear - 6; y <= currentYear + 1; y++) anios.push(y);
            const minYear = anios[0], maxYear = anios[anios.length - 1];

            const optAnios = document.getElementById('opt-anios');
            if (optAnios) optAnios.textContent = `Años ${minYear}–${maxYear}`;

            const anioContainer = document.getElementById('al-anios');
            if (anioContainer) {
                anioContainer.innerHTML = '';
                anios.forEach(a => {
                    const label = document.createElement('label');
                    label.style.cssText = 'font-size:0.8rem;display:flex;align-items:center;gap:0.25rem;cursor:pointer;';
                    label.innerHTML = `<input type="checkbox" value="${a}" class="anio-check"> ${a}`;
                    anioContainer.appendChild(label);
                });
                anioContainer.querySelectorAll('.anio-check').forEach(cb => {
                    cb.addEventListener('change', () => {
                        const checks = document.querySelectorAll('.anio-check:checked');
                        const error = document.getElementById('al-anios-error');
                        if (checks.length > 3) {
                            cb.checked = false;
                            if (error) error.style.display = 'block';
                        } else {
                            if (error) error.style.display = 'none';
                        }
                    });
                });
            }

            const csvSelect = document.getElementById('csv-anio');
            if (csvSelect) {
                anios.forEach(a => {
                    const opt = document.createElement('option');
                    opt.value = String(a);
                    opt.textContent = String(a);
                    csvSelect.appendChild(opt);
                });
            }
        }

        // ── Importar Alumnos ──

        function mostrarImportar() {
            document.getElementById('modal-importar-alumnos').classList.add('active');
            document.getElementById('import-step-upload').querySelector('#import-preview').classList.add('hidden');
            document.getElementById('import-step-upload').querySelector('#import-result').classList.add('hidden');
            document.getElementById('import-file-input').value = '';
        }

        document.getElementById('btn-importar-alumnos')?.addEventListener('click', mostrarImportar);

        const dropzone = document.getElementById('import-dropzone');
        const fileInput = document.getElementById('import-file-input');
        const clickLink = document.getElementById('import-click-link');

        clickLink?.addEventListener('click', (e) => { e.preventDefault(); fileInput.click(); });
        dropzone?.addEventListener('click', () => fileInput.click());

        dropzone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--accent)';
            dropzone.style.background = 'var(--bg-card)';
        });
        dropzone?.addEventListener('dragleave', () => {
            dropzone.style.borderColor = '';
            dropzone.style.background = '';
        });
        dropzone?.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = '';
            dropzone.style.background = '';
            if (e.dataTransfer.files.length) procesarArchivoImportacion(e.dataTransfer.files[0]);
        });
        fileInput?.addEventListener('change', () => {
            if (fileInput.files.length) procesarArchivoImportacion(fileInput.files[0]);
        });

        async function procesarArchivoImportacion(file) {
            const preview = document.getElementById('import-preview');
            const resultDiv = document.getElementById('import-result');
            preview.classList.add('hidden');
            resultDiv.classList.add('hidden');

            const ext = file.name.split('.').pop().toLowerCase();
            if (!['xlsx', 'csv', 'txt', 'docx'].includes(ext)) {
                showToast('Formato no soportado. Use .xlsx, .csv, .txt o .docx', 'danger');
                return;
            }

            document.getElementById('import-file-name').textContent = file.name;

            const formData = new FormData();
            formData.append('archivo', file);
            formData.append('accion', 'preview');

            try {
                const res = await fetch('/api/admin/alumnos/importar', {
                    method: 'POST',
                    headers: { 'X-CSRF-Token': getCSRFToken() },
                    body: formData
                });
                const data = await res.json();

                if (!res.ok) {
                    showToast(data.error || 'Error al procesar archivo', 'danger');
                    return;
                }

                document.getElementById('import-record-count').textContent = `${data.total} registro(s) detectados`;
                const tHead = document.getElementById('import-preview-head');
                const tBody = document.getElementById('import-preview-body');
                tHead.innerHTML = '';
                tBody.innerHTML = '';

                if (data.columnas_detectadas && data.registros.length > 0) {
                    const cols = ['cui', 'nombre_completo', 'grado', 'seccion', 'anios'];
                    const labels = { 'cui': 'CUI', 'nombre_completo': 'Nombre', 'grado': 'Grado', 'seccion': 'Sección', 'anios': 'Año(s)' };
                    const headers = cols.filter(c => data.registros[0][c] !== undefined);
                    let tr = '<tr>';
                    headers.forEach(h => { tr += `<th>${labels[h] || sanitize(h)}</th>`; });
                    tr += '</tr>';
                    tHead.innerHTML = tr;

                    data.registros.forEach(r => {
                        let tr = '<tr>';
                        headers.forEach(h => {
                            const val = sanitize(r[h] || '');
                            const cls = !r[h] && h === 'cui' ? 'style="color:var(--danger);"' : '';
                            tr += `<td ${cls}>${val || '—'}</td>`;
                        });
                        tr += '</tr>';
                        tBody.innerHTML += tr;
                    });
                }

                document.getElementById('btn-confirmar-importar').dataset.importData = JSON.stringify(data);
                document.getElementById('btn-confirmar-importar').disabled = data.total === 0;
                preview.classList.remove('hidden');
            } catch (err) {
                showToast('Error de conexión al procesar archivo.', 'danger');
            }
        }

        document.getElementById('btn-confirmar-importar')?.addEventListener('click', async () => {
            const btn = document.getElementById('btn-confirmar-importar');
            btn.disabled = true;
            btn.textContent = 'Importando...';

            const file = fileInput.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('archivo', file);
            formData.append('accion', 'importar');

            try {
                const res = await fetch('/api/admin/alumnos/importar', {
                    method: 'POST',
                    headers: { 'X-CSRF-Token': getCSRFToken() },
                    body: formData
                });
                const data = await res.json();

                const resultDiv = document.getElementById('import-result');
                resultDiv.classList.remove('hidden');
                if (res.ok && data.success) {
                    resultDiv.innerHTML = `<p style="font-weight:600;font-size:1.1rem;">${sanitize(data.mensaje)}</p>`;
                    resultDiv.style.background = 'var(--bg-card)';
                    document.getElementById('import-preview').classList.add('hidden');
                    cargarEstudiantes();
                    cargarStatsGenerales();
                } else {
                    resultDiv.innerHTML = `<p style="color:var(--danger);">${sanitize(data.error || 'Error al importar')}</p>`;
                    resultDiv.style.background = '#fef2f2';
                }
            } catch (err) {
                showToast('Error de conexión.', 'danger');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Importar Datos';
            }
        });

        function getBadgeEstadoFisico(estado) {
            const colores = { Localizado: '#16a34a', Extraviado: '#dc2626', 'En revisión': '#d97706' };
            const etiquetas = { Localizado: 'Localizado', Extraviado: 'Extraviado', 'En revisión': 'En revisión' };
            if (!estado || !etiquetas[estado]) {
                return '<span style="background:#6b7280;color:#fff;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;">—</span>';
            }
            return `<span style="background:${colores[estado]};color:#fff;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;">${etiquetas[estado]}</span>`;
        }

        window.verificarExpediente = async function(cui) {
            if (!confirm('¿Confirmar verificación física de este expediente?')) return;
            const res = await fetch(`/api/admin/expediente/${cui}/verificar`, { method: 'POST', headers: { 'X-CSRF-Token': getCSRFToken() } });
            if (res.ok) { showToast('✅ Expediente verificado', 'success'); cargarEstudiantes(); }
            else showToast('❌ Error al verificar', 'danger');
        };

        window.cambiarEstadoExpediente = async function(cui) {
            const estado = prompt('Nuevo estado: en_orden, extraviado, deteriorado, incompleto');
            if (!estado || !['en_orden','extraviado','deteriorado','incompleto'].includes(estado)) return;
            const res = await fetch(`/api/admin/expediente/${cui}/estado`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRFToken() },
                body: JSON.stringify({ estado })
            });
            if (res.ok) { showToast('✅ Estado actualizado', 'success'); cargarEstudiantes(); }
            else { const d = await res.json(); showToast('❌ ' + (d.error||'Error'), 'danger'); }
        };

        window.verHistorial = async function(cui, nombre) {
            document.getElementById('hist-exp-nombre').textContent = nombre;
            document.getElementById('hist-exp-cui').textContent = cui;
            document.getElementById('historial-movimientos').innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);">Cargando...</div>';
            document.getElementById('modal-historial-expediente').classList.add('active');
            const res = await fetch(`/api/admin/expediente/${cui}/movimientos`);
            if (!res.ok) { document.getElementById('historial-movimientos').innerHTML = '<div style="text-align:center;padding:2rem;color:var(--danger);">Error al cargar historial</div>'; return; }
            const movs = await res.json();
            if (!movs.length) {
                document.getElementById('historial-movimientos').innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);">Sin movimientos registrados.</div>';
                return;
            }
            let html = '<table class="table"><thead><tr><th>Fecha</th><th>Acción</th><th>Usuario</th><th>Notas</th></tr></thead><tbody>';
            movs.forEach(m => {
                html += `<tr><td style="font-size:0.8rem;">${sanitize(m.fecha)}</td><td>${sanitize(m.accion)}</td><td style="font-size:0.8rem;">${sanitize(m.usuario_cui)}</td><td style="font-size:0.8rem;color:var(--text-muted);">${sanitize(m.notas||'-')}</td></tr>`;
            });
            html += '</tbody></table>';
            document.getElementById('historial-movimientos').innerHTML = html;
        };

        /* ── Solicitudes de Búsqueda ── */

        window.cambiarEstadoSolicitud = async function(id, estado) {
            try {
                const res = await fetch(`/api/admin/solicitudes/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRFToken() },
                    body: JSON.stringify({ estado })
                });
                if (res.ok) {
                    showToast('Estado actualizado', 'success');
                    cargarSolicitudes();
                } else {
                    const data = await res.json();
                    showToast(data.error || 'Error al actualizar', 'danger');
                }
            } catch (e) {
                showToast('Error de conexión', 'danger');
            }
        };

        window.eliminarSolicitud = async function(id) {
            if (!confirm('¿Eliminar esta solicitud?')) return;
            try {
                const res = await fetch(`/api/admin/solicitudes/${id}`, {
                    method: 'DELETE',
                    headers: { 'X-CSRF-Token': getCSRFToken() }
                });
                if (res.ok) {
                    showToast('Solicitud eliminada', 'success');
                    cargarSolicitudes();
                }
            } catch (e) {
                showToast('Error de conexión', 'danger');
            }
        };

        async function cargarSolicitudes() {
            const tbody = document.getElementById('tbody-solicitudes');
            const countSpan = document.getElementById('solicitudes-count');
            const filtro = document.getElementById('filtro-estado-solicitudes').value;
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);">Cargando...</td></tr>';

            try {
                const url = filtro ? `/api/admin/solicitudes?estado=${filtro}` : '/api/admin/solicitudes';
                const res = await fetch(url);
                if (!res.ok) {
                    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--danger);">Error al cargar solicitudes.</td></tr>';
                    return;
                }
                const data = await res.json();
                if (countSpan) countSpan.textContent = data.pendientes || 0;

                if (!data.solicitudes || data.solicitudes.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);">No hay solicitudes registradas.</td></tr>';
                    return;
                }

                const estadoLabels = { pendiente: 'Pendiente', en_proceso: 'En Proceso', encontrado: 'Encontrado', entregado: 'Entregado', no_localizado: 'No Localizado' };
                const estadoColors = { pendiente: 'var(--warning)', en_proceso: 'var(--accent)', encontrado: 'var(--success)', entregado: 'var(--success)', no_localizado: 'var(--danger)' };
                const proximoEstado = { pendiente: 'en_proceso', en_proceso: 'encontrado', encontrado: 'entregado' };

                let html = '';
                data.solicitudes.forEach(s => {
                    const label = estadoLabels[s.estado] || s.estado;
                    const color = estadoColors[s.estado] || 'var(--text-muted)';
                    const next = proximoEstado[s.estado];

                    html += `<tr>
                        <td style="font-size:0.8rem;white-space:nowrap;">${sanitize(s.fecha_solicitud ? s.fecha_solicitud.slice(0,10) : '')}</td>
                        <td style="white-space:nowrap;"><strong>${sanitize(s.nombre_completo)}</strong> <button class="btn-copy" onclick="copiarAlPortapapeles('${escapeJS(s.nombre_completo)}','Nombre')"><i class="ph ph-copy"></i></button></td>
                        <td>${sanitize(s.telefono)}</td>
                        <td>${sanitize(s.documento_solicitado)}</td>
                        <td>${s.anio || '-'}</td>
                        <td><span style="color:${color};font-weight:600;">● ${label}</span></td>
                        <td style="font-size:0.8rem;color:var(--text-muted);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${sanitizeAttr(s.notas||'')}">${sanitize(s.notas||'-')}</td>
                        <td style="font-size:0.8rem;">${sanitize(s.atendido_por||'-')}</td>
                        <td style="white-space:nowrap;">
                            ${next ? `<button class="btn btn-outline" style="font-size:0.7rem;padding:0.2rem 0.5rem;" onclick="cambiarEstadoSolicitud(${s.id},'${next}')"><i class="ph ph-arrow-right"></i> ${estadoLabels[next]}</button> ` : ''}
                            ${s.estado === 'pendiente' ? `<button class="btn btn-outline" style="font-size:0.7rem;padding:0.2rem 0.5rem;color:var(--danger);" onclick="eliminarSolicitud(${s.id})"><i class="ph ph-trash"></i></button>` : ''}
                        </td>
                    </tr>`;
                });
                tbody.innerHTML = html;
            } catch (err) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--danger);">Error de conexión.</td></tr>';
            }
        }

        // Event handlers for solicitudes
        window.abrirModalSolicitud = function(id = null) {
            const modal = document.getElementById('modal-solicitud');
            const title = document.getElementById('modal-solicitud-title');
            const form = document.getElementById('form-solicitud');
            const inputId = document.getElementById('solicitud-id');

            if (!modal) return;
            if (form) form.reset();
            if (inputId) inputId.value = id || '';
            if (title) title.textContent = id ? 'Editar Solicitud' : 'Nueva Solicitud';
            modal.classList.add('active');
        };

        document.getElementById('btn-nueva-solicitud')?.addEventListener('click', () => {
            window.abrirModalSolicitud();
        });

        document.getElementById('modal-solicitud')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                e.currentTarget.classList.remove('active');
            }
        });

        document.getElementById('form-solicitud')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('solicitud-id').value;
            const data = {
                nombre_completo: document.getElementById('sol-nombre').value,
                telefono: document.getElementById('sol-telefono').value,
                documento_solicitado: document.getElementById('sol-documento').value,
                anio: document.getElementById('sol-anio').value ? parseInt(document.getElementById('sol-anio').value) : null,
                cui: document.getElementById('sol-cui').value || null,
                notas: document.getElementById('sol-notas').value
            };
            try {
                const method = id ? 'PUT' : 'POST';
                const url = id ? `/api/admin/solicitudes/${id}` : '/api/admin/solicitudes';
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRFToken() },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    showToast(id ? 'Solicitud actualizada' : 'Solicitud creada', 'success');
                    document.getElementById('modal-solicitud').classList.remove('active');
                    cargarSolicitudes();
                } else {
                    const err = await res.json();
                    showToast(err.error || 'Error al crear', 'danger');
                }
            } catch (e) {
                showToast('Error de conexión', 'danger');
            }
        });

        document.getElementById('filtro-estado-solicitudes')?.addEventListener('change', cargarSolicitudes);

        // ── Importar Solicitudes ──

        document.getElementById('btn-importar-solicitudes')?.addEventListener('click', () => {
            const modal = document.getElementById('modal-importar-solicitudes');
            modal.classList.add('active');
            document.getElementById('import-solicitudes-preview').classList.add('hidden');
            document.getElementById('import-solicitudes-result').classList.add('hidden');
            document.getElementById('import-solicitudes-errors').classList.add('hidden');
            document.getElementById('import-solicitudes-file-input').value = '';
        });

        const solDropzone = document.getElementById('import-solicitudes-dropzone');
        const solFileInput = document.getElementById('import-solicitudes-file-input');
        const solClickLink = document.getElementById('import-solicitudes-click-link');

        solClickLink?.addEventListener('click', (e) => { e.preventDefault(); solFileInput.click(); });
        solDropzone?.addEventListener('click', () => solFileInput.click());

        solDropzone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            solDropzone.style.borderColor = 'var(--accent)';
            solDropzone.style.background = 'var(--bg-card)';
        });
        solDropzone?.addEventListener('dragleave', () => {
            solDropzone.style.borderColor = '';
            solDropzone.style.background = '';
        });
        solDropzone?.addEventListener('drop', (e) => {
            e.preventDefault();
            solDropzone.style.borderColor = '';
            solDropzone.style.background = '';
            const files = Array.from(e.dataTransfer.files).filter(f => ['xlsx','csv','txt','docx'].includes(f.name.split('.').pop().toLowerCase()));
            if (files.length) procesarArchivosSolicitudes(files);
        });
        solFileInput?.addEventListener('change', () => {
            const files = Array.from(solFileInput.files).filter(f => ['xlsx','csv','txt','docx'].includes(f.name.split('.').pop().toLowerCase()));
            if (files.length) procesarArchivosSolicitudes(files);
        });

        async function procesarArchivosSolicitudes(files) {
            const preview = document.getElementById('import-solicitudes-preview');
            const resultDiv = document.getElementById('import-solicitudes-result');
            document.getElementById('import-solicitudes-errors').classList.add('hidden');
            preview.classList.add('hidden');
            resultDiv.classList.add('hidden');

            document.getElementById('import-solicitudes-file-name').textContent = `${files.length} archivo(s): ${files.map(f => f.name).join(', ')}`;

            const tHead = document.getElementById('import-solicitudes-preview-head');
            const tBody = document.getElementById('import-solicitudes-preview-body');
            tHead.innerHTML = '';
            tBody.innerHTML = '';

            let totalRegistros = 0;
            let allRegistros = [];
            let allErrors = [];
            const cols = ['nombre_completo', 'telefono', 'documento_solicitado'];
            const labels = { 'nombre_completo': 'Nombre', 'telefono': 'Teléfono', 'documento_solicitado': 'Documento' };

            for (const file of files) {
                const formData = new FormData();
                formData.append('archivo', file);
                formData.append('accion', 'preview');

                try {
                    const res = await fetch('/api/admin/solicitudes/importar/archivo', {
                        method: 'POST',
                        headers: { 'X-CSRF-Token': getCSRFToken() },
                        body: formData
                    });
                    const data = await res.json();
                    if (!res.ok) {
                        allErrors.push(`${file.name}: ${data.error}`);
                        continue;
                    }
                    totalRegistros += data.total;
                    allRegistros = allRegistros.concat(data.registros || []);
                } catch (err) {
                    allErrors.push(`${file.name}: Error de conexión`);
                }
            }

            document.getElementById('import-solicitudes-record-count').textContent = `${totalRegistros} registro(s) detectados en ${files.length} archivo(s)`;

            if (allRegistros.length > 0) {
                let tr = '<tr>';
                cols.forEach(h => { tr += `<th>${labels[h] || sanitize(h)}</th>`; });
                tr += '</tr>';
                tHead.innerHTML = tr;

                const maxPreview = 100;
                const toShow = allRegistros.slice(0, maxPreview);
                toShow.forEach(r => {
                    let tr = '<tr>';
                    cols.forEach(h => {
                        const val = sanitize(r[h] || '');
                        tr += `<td>${val || '—'}</td>`;
                    });
                    tr += '</tr>';
                    tBody.innerHTML += tr;
                });
                if (allRegistros.length > maxPreview) {
                    tBody.innerHTML += `<tr><td colspan="${cols.length}" style="text-align:center;color:var(--text-muted);">... y ${allRegistros.length - maxPreview} registro(s) más</td></tr>`;
                }
            }

            if (allErrors.length) {
                const errDiv = document.getElementById('import-solicitudes-errors');
                errDiv.classList.remove('hidden');
                errDiv.innerHTML = allErrors.map(e => `<div>⚠️ ${sanitize(e)}</div>`).join('');
            }

            document.getElementById('btn-confirmar-importar-solicitudes').dataset.importData = JSON.stringify({ registros: allRegistros, total: totalRegistros });
            document.getElementById('btn-confirmar-importar-solicitudes').disabled = totalRegistros === 0;
            preview.classList.remove('hidden');
        }

        document.getElementById('btn-confirmar-importar-solicitudes')?.addEventListener('click', async () => {
            const btn = document.getElementById('btn-confirmar-importar-solicitudes');
            btn.disabled = true;
            btn.textContent = 'Importando...';

            const files = Array.from(solFileInput.files).filter(f => ['xlsx','csv','txt','docx'].includes(f.name.split('.').pop().toLowerCase()));
            if (!files.length) return;

            let totalInsertados = 0;
            let totalErrores = [];
            const resultDiv = document.getElementById('import-solicitudes-result');
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = '<p style="font-weight:600;font-size:1.1rem;">Importando archivos...</p>';
            resultDiv.style.background = 'var(--bg-card)';

            for (const file of files) {
                const formData = new FormData();
                formData.append('archivo', file);
                formData.append('accion', 'importar');

                try {
                    const res = await fetch('/api/admin/solicitudes/importar/archivo', {
                        method: 'POST',
                        headers: { 'X-CSRF-Token': getCSRFToken() },
                        body: formData
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        totalInsertados += data.insertados;
                        if (data.errores && data.errores.length) {
                            totalErrores.push(`<strong>${sanitize(file.name)}</strong>: ${data.errores.join(' / ')}`);
                        }
                    } else {
                        totalErrores.push(`<strong>${sanitize(file.name)}</strong>: ${sanitize(data.error || 'Error al importar')}`);
                    }
                } catch (err) {
                    totalErrores.push(`<strong>${sanitize(file.name)}</strong>: Error de conexión`);
                }
            }

            let msg = `✅ ${totalInsertados} solicitud(es) importada(s)`;
            if (totalErrores.length) {
                msg += ` ⚠️ ${totalErrores.length} archivo(s) con error: ${totalErrores.join(' / ')}`;
            }
            resultDiv.innerHTML = `<p style="font-weight:600;font-size:1.1rem;">${msg}</p>`;
            document.getElementById('import-solicitudes-preview').classList.add('hidden');
            cargarSolicitudes();
            btn.disabled = false;
            btn.textContent = 'Importar Datos';
        });

        // ── Títulos ──

        const ESTADO_TITULO_LABELS = {
            'en_orden': '🟢 En orden',
            'no_entregado': '🔴 No entregado',
            'hace_falta': '🟡 Hace falta'
        };

        async function cargarTitulos() {
            const tbody = document.getElementById('tbody-titulos');
            const countSpan = document.getElementById('titulos-count');
            const pendientesSpan = document.getElementById('titulos-pendientes-count');
            const filtro = document.getElementById('filtro-estado-titulos');
            const estadoFiltro = filtro ? filtro.value : '';
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);">Cargando...</td></tr>';
            try {
                const url = estadoFiltro ? `/api/admin/titulos?estado=${estadoFiltro}` : '/api/admin/titulos';
                const res = await fetch(url);
                if (!res.ok) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--danger);">Error al cargar títulos.</td></tr>'; return; }
                const data = await res.json();
                const titulos = data.titulos || [];
                if (countSpan) countSpan.textContent = titulos.length;
                const sinCUI = titulos.filter(t => t.cui && t.cui.startsWith('PENDIENTE-')).length;
                if (pendientesSpan) pendientesSpan.textContent = sinCUI;
                const summaryEl = document.getElementById('titulos-summary');
                if (summaryEl) {
                    summaryEl.innerHTML = sinCUI === titulos.length
                        ? `${titulos.length} graduados registrados (pendientes de CUI)`
                        : `Graduados registrados — <strong>${titulos.length}</strong> total · <strong style="color:var(--warning);">${sinCUI}</strong> sin CUI`;
                }
                if (titulos.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);">No hay títulos registrados. Importe un archivo para comenzar.</td></tr>';
                    return;
                }
                let html = '';
                titulos.forEach(t => {
                    const isPending = t.cui && t.cui.startsWith('PENDIENTE-');
                    const cuiDisplay = isPending ? `<span style="color:var(--warning);font-weight:600;">${sanitize(t.cui)}</span>` : sanitize(t.cui);
                    const estadoLabel = ESTADO_TITULO_LABELS[t.estado] || t.estado;
                    const copyVal = isPending ? t.nombre_completo : t.cui;
                    const copyLabel = isPending ? 'Nombre' : 'CUI';
                    const acciones = isPending
                        ? `<button class="btn btn-outline" style="font-size:0.7rem;padding:0.2rem 0.5rem;" onclick="editarCUITitulo('${sanitize(t.cui)}','${sanitize(t.nombre_completo)}')"><i class="ph ph-pencil"></i> CUI</button>`
                        : `<button class="btn btn-outline" style="font-size:0.7rem;padding:0.2rem 0.5rem;" onclick="editarTelefonoTitulo('${sanitize(t.cui)}','${sanitize(t.nombre_completo)}','${sanitize(t.telefono||'')}')"><i class="ph ph-phone"></i> Tel</button>`;
                    html += `<tr>
                        <td style="white-space:nowrap;">${cuiDisplay} <button class="btn-copy" onclick="copiarAlPortapapeles('${escapeJS(copyVal)}','${copyLabel}')"><i class="ph ph-copy"></i></button></td>
                        <td>${sanitize(t.nombre_completo)}</td>
                        <td>${sanitize(t.carrera)}</td>
                        <td>${sanitize(String(t.anio_graduacion))}</td>
                        <td>${estadoLabel}</td>
                        <td>${sanitize(t.telefono || '—')}</td>
                        <td>${sanitize(t.codigo_expediente || '—')}</td>
                        <td style="white-space:nowrap;">${acciones}</td>
                    </tr>`;
                });
                tbody.innerHTML = html;
            } catch (e) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--danger);">Error de conexión.</td></tr>';
            }
        }

        document.getElementById('filtro-estado-titulos')?.addEventListener('change', cargarTitulos);

        window.editarCUITitulo = async function(cuiActual, nombre) {
            const nuevoCUI = prompt(`Ingrese el CUI real para:\n${nombre}\n(CUI actual: ${cuiActual})`);
            if (!nuevoCUI || nuevoCUI === cuiActual) return;
            if (!/^\d{13}$/.test(nuevoCUI)) {
                showToast('El CUI debe tener exactamente 13 dígitos.', 'danger');
                return;
            }
            try {
                const res = await fetch('/api/admin/titulos/migrar-cui', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRFToken() },
                    body: JSON.stringify({ old_cui: cuiActual, new_cui: nuevoCUI })
                });
                if (res.ok) {
                    showToast(`CUI migrado para ${nombre}`, 'success');
                    cargarTitulos();
                } else {
                    const data = await res.json();
                    showToast(data.error || 'Error al migrar CUI', 'danger');
                }
            } catch (e) {
                showToast('Error de conexión.', 'danger');
            }
        };

        window.editarTelefonoTitulo = async function(cui, nombre, telefonoActual) {
            const nuevoTel = prompt(`Teléfono para ${nombre}:`, telefonoActual || '');
            if (nuevoTel === null || nuevoTel === telefonoActual) return;
            try {
                const res = await fetch(`/api/admin/titulos/${encodeURIComponent(cui)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRFToken() },
                    body: JSON.stringify({ telefono: nuevoTel })
                });
                if (res.ok) {
                    showToast(`Teléfono actualizado para ${nombre}`, 'success');
                    cargarTitulos();
                } else {
                    showToast('Error al actualizar teléfono', 'danger');
                }
            } catch (e) {
                showToast('Error de conexión.', 'danger');
            }
        };

        // ── Importar Títulos ──

        document.getElementById('btn-importar-titulos')?.addEventListener('click', () => {
            const modal = document.getElementById('modal-importar-titulos');
            modal.classList.add('active');
            document.getElementById('import-titulos-step-upload').querySelector('#import-titulos-preview').classList.add('hidden');
            document.getElementById('import-titulos-step-upload').querySelector('#import-titulos-result').classList.add('hidden');
            document.getElementById('import-titulos-errors').classList.add('hidden');
            document.getElementById('import-titulos-file-input').value = '';
        });

        const titulosDropzone = document.getElementById('import-titulos-dropzone');
        const titulosFileInput = document.getElementById('import-titulos-file-input');
        const titulosClickLink = document.getElementById('import-titulos-click-link');

        titulosClickLink?.addEventListener('click', (e) => { e.preventDefault(); titulosFileInput.click(); });
        titulosDropzone?.addEventListener('click', () => titulosFileInput.click());

        titulosDropzone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            titulosDropzone.style.borderColor = 'var(--accent)';
            titulosDropzone.style.background = 'var(--bg-card)';
        });
        titulosDropzone?.addEventListener('dragleave', () => {
            titulosDropzone.style.borderColor = '';
            titulosDropzone.style.background = '';
        });
        titulosDropzone?.addEventListener('drop', (e) => {
            e.preventDefault();
            titulosDropzone.style.borderColor = '';
            titulosDropzone.style.background = '';
            const files = Array.from(e.dataTransfer.files).filter(f => ['xlsx','csv','txt','docx'].includes(f.name.split('.').pop().toLowerCase()));
            if (files.length) procesarArchivosTitulos(files);
        });
        titulosFileInput?.addEventListener('change', () => {
            const files = Array.from(titulosFileInput.files).filter(f => ['xlsx','csv','txt','docx'].includes(f.name.split('.').pop().toLowerCase()));
            if (files.length) procesarArchivosTitulos(files);
        });

        async function procesarArchivosTitulos(files) {
            const preview = document.getElementById('import-titulos-preview');
            const resultDiv = document.getElementById('import-titulos-result');
            document.getElementById('import-titulos-errors').classList.add('hidden');
            preview.classList.add('hidden');
            resultDiv.classList.add('hidden');

            document.getElementById('import-titulos-file-name').textContent = `${files.length} archivo(s): ${files.map(f => f.name).join(', ')}`;

            const tHead = document.getElementById('import-titulos-preview-head');
            const tBody = document.getElementById('import-titulos-preview-body');
            tHead.innerHTML = '';
            tBody.innerHTML = '';

            let totalRegistros = 0;
            let allRegistros = [];
            let allErrors = [];
            const cols = ['nombre_completo', 'carrera', 'anio_graduacion', 'estado', 'telefono'];
            const labels = { 'nombre_completo': 'Nombre', 'carrera': 'Carrera', 'anio_graduacion': 'Año', 'estado': 'Estado', 'telefono': 'Teléfono' };

            for (const file of files) {
                const formData = new FormData();
                formData.append('archivo', file);
                formData.append('accion', 'preview');

                try {
                    const res = await fetch('/api/admin/titulos/importar/archivo', {
                        method: 'POST',
                        headers: { 'X-CSRF-Token': getCSRFToken() },
                        body: formData
                    });
                    const data = await res.json();

                    if (!res.ok) {
                        allErrors.push(`${file.name}: ${data.error}`);
                        continue;
                    }

                    totalRegistros += data.total;
                    allRegistros = allRegistros.concat(data.registros || []);
                } catch (err) {
                    allErrors.push(`${file.name}: Error de conexión`);
                }
            }

            document.getElementById('import-titulos-record-count').textContent = `${totalRegistros} registro(s) detectados en ${files.length} archivo(s)`;

            if (allRegistros.length > 0) {
                let tr = '<tr>';
                cols.forEach(h => { tr += `<th>${labels[h] || sanitize(h)}</th>`; });
                tr += '</tr>';
                tHead.innerHTML = tr;

                const maxPreview = 100;
                const toShow = allRegistros.slice(0, maxPreview);
                toShow.forEach(r => {
                    let tr = '<tr>';
                    cols.forEach(h => {
                        const val = sanitize(r[h] || '');
                        tr += `<td>${val || '—'}</td>`;
                    });
                    tr += '</tr>';
                    tBody.innerHTML += tr;
                });
                if (allRegistros.length > maxPreview) {
                    tBody.innerHTML += `<tr><td colspan="${cols.length}" style="text-align:center;color:var(--text-muted);">... y ${allRegistros.length - maxPreview} registro(s) más</td></tr>`;
                }
            }

            if (allErrors.length) {
                const errDiv = document.getElementById('import-titulos-errors');
                errDiv.classList.remove('hidden');
                errDiv.innerHTML = allErrors.map(e => `<div>⚠️ ${sanitize(e)}</div>`).join('');
            }

            document.getElementById('btn-confirmar-importar-titulos').dataset.importData = JSON.stringify({ registros: allRegistros, total: totalRegistros });
            document.getElementById('btn-confirmar-importar-titulos').disabled = totalRegistros === 0;
            preview.classList.remove('hidden');
        }

        document.getElementById('btn-confirmar-importar-titulos')?.addEventListener('click', async () => {
            const btn = document.getElementById('btn-confirmar-importar-titulos');
            btn.disabled = true;
            btn.textContent = 'Importando...';

            const files = Array.from(titulosFileInput.files).filter(f => ['xlsx','csv','txt','docx'].includes(f.name.split('.').pop().toLowerCase()));
            if (!files.length) return;

            let totalInsertados = 0;
            let totalErrores = [];
            const resultDiv = document.getElementById('import-titulos-result');
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = '<p style="font-weight:600;font-size:1.1rem;">Importando archivos...</p>';
            resultDiv.style.background = 'var(--bg-card)';

            for (const file of files) {
                const formData = new FormData();
                formData.append('archivo', file);
                formData.append('accion', 'importar');

                try {
                    const res = await fetch('/api/admin/titulos/importar/archivo', {
                        method: 'POST',
                        headers: { 'X-CSRF-Token': getCSRFToken() },
                        body: formData
                    });
                    const data = await res.json();

                    if (res.ok && data.success) {
                        totalInsertados += data.insertados;
                        if (data.errores && data.errores.length) {
                            totalErrores.push(`<strong>${sanitize(file.name)}</strong>: ${data.errores.join(' / ')}`);
                        }
                    } else {
                        totalErrores.push(`<strong>${sanitize(file.name)}</strong>: ${sanitize(data.error || 'Error al importar')}`);
                    }
                } catch (err) {
                    totalErrores.push(`<strong>${sanitize(file.name)}</strong>: Error de conexión`);
                }
            }

            let msg = `✅ ${totalInsertados} título(s) importado(s)`;
            if (totalErrores.length) {
                msg += ` ⚠️ ${totalErrores.length} archivo(s) con error: ${totalErrores.join(' / ')}`;
            }
            resultDiv.innerHTML = `<p style="font-weight:600;font-size:1.1rem;">${msg}</p>`;
            document.getElementById('import-titulos-preview').classList.add('hidden');
            cargarTitulos();
            btn.disabled = false;
            btn.textContent = 'Importar Datos';
        });

        /* ── PDF Admin ── */

        window.subirPDF = async function(cui, nombre) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf';
            input.onchange = async () => {
                const file = input.files[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                    showToast('El archivo excede el límite de 5MB', 'danger');
                    return;
                }
                const formData = new FormData();
                formData.append('pdf', file);
                try {
                    const res = await fetch(`/api/admin/pdf/${cui}`, {
                        method: 'POST',
                        headers: { 'X-CSRF-Token': getCSRFToken() },
                        body: formData
                    });
                    if (res.ok) {
                        showToast(`PDF subido para ${nombre}`, 'success');
                    } else {
                        const data = await res.json();
                        showToast(data.error || 'Error al subir PDF', 'danger');
                    }
                } catch (e) {
                    showToast('Error de conexión', 'danger');
                }
            };
            input.click();
        };

        window.verPDFAdmin = function(cui) {
            window.open(`/api/pdf/${cui}`, '_blank');
        };

        window.eliminarPDF = async function(cui, nombre) {
            if (!confirm(`¿Eliminar PDF de ${nombre}?`)) return;
            try {
                const res = await fetch(`/api/admin/pdf/${cui}`, {
                    method: 'DELETE',
                    headers: { 'X-CSRF-Token': getCSRFToken() }
                });
                if (res.ok) {
                    showToast(`PDF eliminado para ${nombre}`, 'success');
                    cargarEstudiantes();
                }
            } catch (e) {
                showToast('Error de conexión', 'danger');
            }
        };

        // ── Ayuda ──
        const ayudaEstadoLabels = { pendiente: 'Pendiente', en_proceso: 'En proceso', resuelto: 'Resuelto' };
        const ayudaEstadoColors = { pendiente: '#dc2626', en_proceso: '#d97706', resuelto: '#059669' };

        function cargarAyuda() {
            const tbody = document.getElementById('ayuda-table-body');
            if (!tbody) return;
            const estado = document.getElementById('ayuda-filtro-estado').value;
            const categoria = document.getElementById('ayuda-filtro-categoria').value;
            const q = document.getElementById('ayuda-filtro-q').value;
            const params = new URLSearchParams();
            if (estado) params.set('estado', estado);
            if (categoria) params.set('categoria', categoria);
            if (q) params.set('q', q);
            fetch('/api/admin/ayuda?' + params.toString())
                .then(r => r.json())
                .then(data => {
                    const badge = document.getElementById('ayuda-pendientes-count');
                    if (badge && data.pendientes !== undefined) {
                        badge.textContent = data.pendientes;
                        badge.hidden = data.pendientes === 0;
                    }
                    if (!data.mensajes || data.mensajes.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">No hay mensajes de ayuda.</td></tr>';
                        return;
                    }
                    tbody.innerHTML = data.mensajes.map(m => {
                        const fecha = new Date(m.creado_en).toLocaleDateString('es-GT');
                        const color = ayudaEstadoColors[m.estado] || '#6b7280';
                        return '<tr>' +
                            '<td><strong>' + sanitize(m.codigo) + '</strong></td>' +
                            '<td>' + sanitize(m.nombre) + (m.cui ? '<br><small>' + sanitize(m.cui) + '</small>' : '') + '</td>' +
                            '<td><span class="badge badge-secondary">' + sanitize(m.categoria) + '</span></td>' +
                            '<td><span class="badge" style="background:' + color + '20;color:' + color + ';border:1px solid ' + color + '60;">' + (ayudaEstadoLabels[m.estado] || m.estado) + '</span></td>' +
                            '<td>' + fecha + '</td>' +
                            '<td><button class="btn-sm btn-secondary" onclick="abrirDetalleAyuda(' + m.id + ')"><i class="ph ph-eye"></i> Ver</button></td>' +
                            '</tr>';
                    }).join('');
                })
                .catch(() => {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--danger);">Error al cargar mensajes.</td></tr>';
                });
        }

        let currentAyudaId = null;

        window.abrirDetalleAyuda = function(id) {
            currentAyudaId = id;
            fetch('/api/admin/ayuda/' + id)
                .then(r => {
                    if (!r.ok) throw new Error('No se pudo cargar el mensaje');
                    return r.json();
                })
                .then(m => {
                    document.getElementById('ayuda-detail').classList.remove('hidden');
                    document.getElementById('ayuda-detail-codigo').textContent = 'Mensaje ' + m.codigo;
                    var infoHtml = '<p><strong>Nombre:</strong> ' + sanitize(m.nombre) + '</p>' +
                        (m.telefono ? '<p><strong>Teléfono:</strong> ' + sanitize(m.telefono) + '</p>' : '') +
                        (m.cui ? '<p><strong>CUI:</strong> ' + sanitize(m.cui) + '</p>' : '') +
                        '<p><strong>Categoría:</strong> <span class="badge badge-secondary">' + sanitize(m.categoria) + '</span></p>' +
                        '<p><strong>Mensaje:</strong><br>' + sanitize(m.mensaje) + '</p>' +
                        '<p><strong>Fecha:</strong> ' + new Date(m.creado_en).toLocaleDateString('es-GT') + '</p>';
                    document.getElementById('ayuda-detail-info').innerHTML = infoHtml;
                    var photoDiv = document.getElementById('ayuda-detail-photo');
                    if (m.foto) {
                        photoDiv.innerHTML = '<label>Foto:</label><br><img src="/static/' + sanitizeAttr(m.foto) + '" style="max-width:300px;max-height:300px;border-radius:8px;border:1px solid var(--border);cursor:pointer;" onclick="window.open(this.src)" alt="Foto del mensaje">';
                    } else {
                        photoDiv.innerHTML = '';
                    }
                    document.getElementById('ayuda-detail-estado').value = m.estado;
                    document.getElementById('ayuda-detail-respuesta').value = m.respuesta || '';
                })
                .catch(err => showToast(err.message, 'error'));
        };

        // Wire ayuda controls
        (function() {
            var catFilter = document.getElementById('ayuda-filtro-categoria');
            if (catFilter) {
                fetch('/api/ayuda/config')
                    .then(r => r.json())
                    .then(d => {
                        d.categorias.forEach(c => {
                            var opt = document.createElement('option');
                            opt.value = c; opt.textContent = c;
                            catFilter.appendChild(opt);
                        });
                    });
            }
            var filterBtn = document.getElementById('ayuda-filtro-btn');
            if (filterBtn) filterBtn.addEventListener('click', cargarAyuda);
            var guardarBtn = document.getElementById('ayuda-detail-guardar');
            if (guardarBtn) {
                guardarBtn.addEventListener('click', function() {
                    if (!currentAyudaId) return;
                    var estado = document.getElementById('ayuda-detail-estado').value;
                    var respuesta = document.getElementById('ayuda-detail-respuesta').value;
                    fetch('/api/admin/ayuda/' + currentAyudaId, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRFToken() },
                        body: JSON.stringify({ estado: estado || undefined, respuesta: respuesta || undefined })
                    })
                    .then(r => {
                        if (r.ok) {
                            showToast('Mensaje actualizado', 'success');
                            document.getElementById('ayuda-detail').classList.add('hidden');
                            cargarAyuda();
                        } else {
                            return r.json().then(d => { throw new Error(d.error); });
                        }
                    })
                    .catch(err => showToast(err.message, 'error'));
                });
            }
            var eliminarBtn = document.getElementById('ayuda-detail-eliminar');
            if (eliminarBtn) {
                eliminarBtn.addEventListener('click', function() {
                    if (!currentAyudaId || !confirm('¿Eliminar este mensaje permanentemente?')) return;
                    fetch('/api/admin/ayuda/' + currentAyudaId, {
                        method: 'DELETE',
                        headers: { 'X-CSRF-Token': getCSRFToken() }
                    })
                    .then(r => {
                        if (r.ok) {
                            showToast('Mensaje eliminado', 'success');
                            document.getElementById('ayuda-detail').classList.add('hidden');
                            cargarAyuda();
                        } else {
                            return r.json().then(d => { throw new Error(d.error); });
                        }
                    })
                    .catch(err => showToast(err.message, 'error'));
                });
            }
            var cerrarBtn = document.getElementById('ayuda-detail-cerrar');
            if (cerrarBtn) {
                cerrarBtn.addEventListener('click', function() {
                    document.getElementById('ayuda-detail').classList.add('hidden');
                });
            }
        })();

