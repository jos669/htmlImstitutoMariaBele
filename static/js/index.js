    
        // Auto dark theme based on system preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.body.classList.add('dark-theme');
        }

        function escapeAttr(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }

        let activeUser = null;
        let allData = null;
        let currentView = 'table';
        let currentAnioFiltro = '';

        const appHeader = document.getElementById('app-header');
        const loginSection = document.getElementById('login-section');
        const dashboardSection = document.getElementById('dashboard-section');
        const loginForm = document.getElementById('login-form');
        const cuiInput = document.getElementById('cui');
        const consentimientoCheckbox = document.getElementById('consentimiento');
        const btnLoginSubmit = document.getElementById('btn-login-submit');
        const userDisplayName = document.getElementById('user-display-name');
        const userDisplayMeta = document.getElementById('user-display-meta');
        const btnLogout = document.getElementById('btn-logout');
        const globalAlert = document.getElementById('global-alert');
        const loadingSpinner = document.getElementById('loading-spinner');
        const emptyState = document.getElementById('empty-state');
        const papeleriaContainer = document.getElementById('papeleria-container');
        const filtrosAnio = document.getElementById('filtros-anio');

        function getCSRFToken() {
            const m = document.querySelector('meta[name="csrf-token"]');
            return m ? m.getAttribute('content') : '';
        }

        window.addEventListener('DOMContentLoaded', () => {
            checkSession();
            loginForm.addEventListener('submit', handleLogin);
            btnLogout.addEventListener('click', handleLogout);
            setInterval(() => {
                fetch('/api/session').catch(() => {});
            }, 600000); // 10 min keep-alive

            consentimientoCheckbox.addEventListener('change', () => {
                consentimientoCheckbox.parentNode.style.border = '';
            });

            cuiInput.addEventListener('input', (e) => {
                const icon = document.getElementById('cui-validation-icon');
                if (e.target.value.length === 0) {
                    icon.style.display = 'none';
                } else {
                    icon.textContent = '✅';
                    icon.className = 'cui-valid';
                    icon.style.display = 'inline';
                }
            });

            const setupThemeToggle = (btnId) => {
                const btn = document.getElementById(btnId);
                if (btn) {
                    const updateIcon = () => {
                        const isDark = document.body.classList.contains('dark-theme');
                        btn.innerHTML = isDark ? '<i class="ph ph-moon"></i>' : '<i class="ph ph-sun-dim"></i>';
                    };
                    btn.addEventListener('click', () => {
                        document.body.classList.toggle('dark-theme');
                        localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
                        updateIcon();
                    });
                    updateIcon();
                }
            };
            setupThemeToggle('theme-toggle-header');
            setupThemeToggle('theme-toggle-login');

                // Set up layout toggles
            const btnViewTable = document.getElementById('btn-view-table');
            const btnViewCards = document.getElementById('btn-view-cards');
            if (btnViewTable && btnViewCards) {
                btnViewTable.addEventListener('click', () => {
                    btnViewTable.classList.add('active');
                    btnViewCards.classList.remove('active');
                    currentView = 'table';
                    actualizarVistaDocumentos();
                });
                btnViewCards.addEventListener('click', () => {
                    btnViewCards.classList.add('active');
                    btnViewTable.classList.remove('active');
                    currentView = 'cards';
                    actualizarVistaDocumentos();
                });
            }
        });

        function showAlert(msg) {
            if (msg) {
                globalAlert.textContent = msg;
                globalAlert.style.display = 'block';
                globalAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                globalAlert.style.display = 'none';
            }
        }

        async function checkSession() {
            try {
                const response = await fetch('/api/session');
                if (response.ok) {
                    const user = await response.json();
                    activeUser = user;
                    if (user.rol === 'admin') {
                        showLogin();
                        return;
                    }
                    showDashboard();
                    await cargarDashboard();
                } else {
                    showLogin();
                }
            } catch (err) {
                showLogin();
            }
        }

        function showLogin() {
            loginSection.classList.remove('hidden');
            dashboardSection.classList.add('hidden');
            appHeader.classList.add('hidden');
        }

function showDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    appHeader.classList.remove('hidden');
    if (activeUser) {
        userDisplayName.textContent = activeUser.nombre_completo;
        userDisplayMeta.textContent = `CUI: ${activeUser.cui} | ${activeUser.grado || ''} ${activeUser.seccion || ''}`;

        const nameHeader = document.getElementById('student-name-header');
        const nameDisplay = document.getElementById('student-name-display');
        const nameDetail = document.getElementById('student-name-detail');
        if (nameHeader && nameDisplay) {
            nameDisplay.textContent = activeUser.nombre_completo;
            nameDetail.textContent = `CUI: ${activeUser.cui} · ${activeUser.grado || ''} ${activeUser.seccion || ''}`;
            nameHeader.style.display = 'block';
        }

        cargarQRVerificacion();

    }
}

async function cargarQRVerificacion() {
    const section = document.getElementById('verificacion-section');
    const display = document.getElementById('qr-display');
    if (!display || activeUser.rol === 'admin') return;
    try {
        const res = await fetch(`/api/verificacion`);
        if (!res.ok) return;
        const data = await res.json();
        section.classList.remove('hidden');
        const qrImg = data.qr_data
            ? `<img src="${data.qr_data}" alt="QR" style="border-radius:4px;width:150px;height:150px;">`
            : `<div style="width:150px;height:150px;display:flex;align-items:center;justify-content:center;background:var(--secondary-bg);border-radius:4px;color:var(--text-muted);font-size:0.8rem;">QR no disponible</div>`;
        display.innerHTML = `
            <div style="display:flex;flex-wrap:wrap;gap:1.5rem;align-items:center;justify-content:center;">
                <div style="background:#fff;border-radius:8px;padding:0.5rem;display:inline-block;">
                    ${qrImg}
                </div>
                <div style="text-align:left;min-width:200px;">
                    <p style="font-weight:600;margin-bottom:0.25rem;">Enlace de verificación</p>
                    <p style="font-size:0.8rem;word-break:break-all;color:var(--text-muted);margin-bottom:0.5rem;">
                        <a href="${escapeAttr(data.url)}" target="_blank">${escapeAttr(data.url)}</a>
                    </p>
                    <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${escapeAttr(data.url)}').then(()=>showToast('Enlace copiado'))" style="font-size:0.8rem;padding:0.4rem 0.8rem;">
                        <i class="ph ph-copy"></i> Copiar enlace
                    </button>
                </div>
            </div>
        `;
    } catch (err) {
        // Silently fail - QR is optional
    }
}

        async function handleLogin(e) {
            e.preventDefault();
            showAlert(null);

            const cui = cuiInput.value.trim();
            const password = document.getElementById('password').value.trim();
            const consentimiento = consentimientoCheckbox.checked;

            if (!cui) {
                showAlert('Ingrese su CUI o nombre completo.');
                return;
            }
            // If it looks like a CUI (13 digits), validate format
            if (/^\d+$/.test(cui) && cui.length !== 13) {
                showAlert('El CUI debe contener exactamente 13 dígitos numéricos.');
                return;
            }

            btnLoginSubmit.classList.add('btn-loading');

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRFToken() },
                    body: JSON.stringify({ cui, password, consentimiento }),
                    cache: 'no-store'
                });

                let data = {};
                try {
                    data = await response.json();
                } catch (jsonErr) {
                    console.error("Error parseando JSON de respuesta:", jsonErr);
                }

                if (!response.ok) {
                    showAlert(data.error || 'Error al iniciar sesión.');
                    btnLoginSubmit.classList.remove('btn-loading');
                    return;
                }

                if (data.consentimiento_requerido) {
                    showAlert(data.mensaje);
                    consentimientoCheckbox.parentNode.style.border = '2px solid var(--warning)';
                    consentimientoCheckbox.focus();
                    btnLoginSubmit.classList.remove('btn-loading');
                    return;
                }

                activeUser = data.user;
                if (activeUser.rol === 'admin') {
                    window.location.href = './admin_login.html';
                    return;
                }

                consentimientoCheckbox.parentNode.style.border = '';
                showDashboard();
                await cargarDashboard();
            } catch (err) {
                showAlert('Error de conexión con el servidor. Verifique su conexión a internet.');
            } finally {
                btnLoginSubmit.classList.remove('btn-loading');
            }
        }

        async function handleLogout() {
            try { await fetch('/api/logout', { method: 'POST', headers: { 'X-CSRF-Token': getCSRFToken() } }); } catch (err) {}
            activeUser = null;
            allData = null;
            showLogin();
            loginForm.reset();
        }

        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            let icon = 'ℹ️';
            if (type === 'success') icon = '✅';
            else if (type === 'danger') icon = '❌';
            else if (type === 'warning') icon = '⚠️';
            
            toast.innerHTML = `<span>${icon}</span> <span>${escapeAttr(message)}</span>`;
            container.appendChild(toast);
            
            setTimeout(() => toast.classList.add('show'), 10);
            
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3500);
        }

        function renderTitulo(tituloData) {
            document.getElementById('titulo-carrera').textContent = tituloData.carrera || '—';
            document.getElementById('titulo-anio').textContent = tituloData.anio_graduacion || '—';
            const estadoSpan = document.getElementById('titulo-estado');
            if (tituloData.estado === 'en_orden') {
                estadoSpan.innerHTML = '<span class="status-cell status-en_orden" style="font-size:0.9rem;">En orden</span>';
            } else if (tituloData.estado === 'no_entregado') {
                estadoSpan.innerHTML = '<span class="status-cell status-no_entregado" style="font-size:0.9rem;">No entregado</span>';
            } else {
                estadoSpan.textContent = tituloData.estado || '—';
            }
        }

        async function cargarDashboard() {
            const skeletonLoading = document.getElementById('skeleton-loading');
            const papeleriaDashboard = document.getElementById('papeleria-dashboard');
            const tituloSection = document.getElementById('titulo-section');
            skeletonLoading.classList.remove('hidden');
            papeleriaContainer.classList.add('hidden');
            emptyState.classList.add('hidden');
            loadingSpinner.classList.remove('hidden');

            try {
                const [papeleriaRes, tituloRes] = await Promise.all([
                    fetch('/api/papeleria'),
                    fetch('/api/mi-titulo')
                ]);

                const tienePapeleria = papeleriaRes.ok;
                const tieneTitulo = tituloRes.ok;

                let papeleriaData = null;
                let tituloData = null;

                if (tienePapeleria) {
                    papeleriaData = await papeleriaRes.json();
                }
                if (tieneTitulo) {
                    tituloData = await tituloRes.json();
                }

                const gridTieneDatos = papeleriaData?.grid?.length > 0;

                const tituloExiste = tituloData?.tiene_titulo === true;

                // Case 1: tiene papeleria → show full dashboard
                if (gridTieneDatos) {
                    papeleriaDashboard.classList.remove('hidden');
                    tituloSection.classList.add('hidden');
                    allData = papeleriaData;
                    renderPapeleria(papeleriaData);
                    let _total = 0, _enOrden = 0;
                    papeleriaData.grid.forEach(f => f.items.forEach(i => { _total++; if (i.estado === 'en_orden') _enOrden++; }));
                    showToast(`Expediente de ${activeUser?.nombre_completo || 'Estudiante'}: ${_enOrden} de ${_total} documentos completos.`, 'success');
                } else {
                    papeleriaDashboard.classList.add('hidden');
                }

                // Case 2: solo tiene titulo (sin papeleria) → show simplified view
                if (tituloExiste && !gridTieneDatos) {
                    tituloSection.classList.remove('hidden');
                    renderTitulo(tituloData);
                }

                // Case 3: tiene ambos → papeleria already shown, also show titulo
                if (tituloExiste && gridTieneDatos) {
                    tituloSection.classList.remove('hidden');
                    renderTitulo(tituloData);
                }

                cargarMensajesAyuda();

            } catch (err) {
                showToast('Error al conectar con el servidor de control académico.', 'danger');
            } finally {
                loadingSpinner.classList.add('hidden');
                skeletonLoading.classList.add('hidden');
            }
        }

        function renderPapeleria(data) {
            const { tipos, anios, grid } = data;

            if (!tipos || tipos.length === 0) {
                emptyState.classList.remove('hidden');
                papeleriaContainer.classList.add('hidden');
                return;
            }

            emptyState.classList.add('hidden');
            papeleriaContainer.classList.remove('hidden');

            filtrosAnio.innerHTML = '<button class="filtro-btn active" data-anio="">Todos los años</button>';
            currentAnioFiltro = '';
            anios.forEach(a => {
                filtrosAnio.innerHTML += `<button class="filtro-btn" data-anio="${a}">${a}</button>`;
            });
            filtrosAnio.querySelectorAll('.filtro-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    filtrosAnio.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentAnioFiltro = btn.dataset.anio;
                    actualizarVistaDocumentos();
                });
            });

            actualizarVistaDocumentos();
        }

        function renderPendientes(grid) {
            const container = document.getElementById('pendientes-section');
            const pendientes = [];
            grid.forEach(fila => {
                fila.items.forEach(item => {
                    if (item.estado !== 'en_orden') {
                        pendientes.push({ anio: fila.anio, tipo: item.tipo, estado: item.estado });
                    }
                });
            });
            pendientes.sort((a, b) => b.anio - a.anio);

            if (pendientes.length === 0) {
                container.innerHTML = `
                    <div class="pendientes-card success">
                        <div class="pendientes-header">🎉 ¡Tu documentación está completa!</div>
                        <div class="pendientes-sub">Todos los documentos han sido registrados y están en orden.</div>
                    </div>
                `;
                return;
            }

            let html = '<div class="pendientes-card warning"><div class="pendientes-header">🔴 Documentos pendientes de entregar</div><div class="pendientes-lista">';
            let currentYear = null;
            pendientes.forEach(p => {
                if (p.anio !== currentYear) {
                    if (currentYear !== null) html += '</div>';
                    html += `<div class="pendientes-year">${p.anio}</div><div class="pendientes-items">`;
                    currentYear = p.anio;
                }
                const label = ESTADO_LABELS[p.estado] || p.estado;
                html += `<div class="pendientes-item"><span class="pendientes-doc">${escapeAttr(p.tipo)}</span><span class="pendientes-estado">${label}</span></div>`;
            });
            html += '</div></div></div>';
            container.innerHTML = html;
        }

        function actualizarVistaDocumentos() {
            if (!allData) return;

            const grid = allData.grid;
            const tipos = allData.tipos;
            const datosFiltrados = currentAnioFiltro ? grid.filter(f => f.anio.toString() === currentAnioFiltro) : grid;

            if (currentView === 'table') {
                papeleriaContainer.className = 'papeleria-grid';
                renderizarTabla(grid, tipos, currentAnioFiltro);
            } else {
                papeleriaContainer.className = '';
                renderizarTarjetas(grid, tipos, currentAnioFiltro);
            }

            let total = 0, enOrden = 0, noEntregado = 0, haceFalta = 0;
            datosFiltrados.forEach(fila => {
                fila.items.forEach(item => {
                    total++;
                    if (item.estado === 'en_orden') enOrden++;
                    else if (item.estado === 'no_entregado') noEntregado++;
                    else if (item.estado === 'hace_falta') haceFalta++;
                });
            });

            const pctCompleto = total > 0 ? Math.round((enOrden / total) * 100) : 0;
            document.getElementById('stats-dashboard').innerHTML = `
                <div class="stat-card" style="gap: 1rem;">
                    <svg width="60" height="60" viewBox="0 0 36 36" style="flex-shrink: 0;">
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--track-bg)" stroke-width="3"></circle>
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="${pctCompleto === 100 ? 'var(--success)' : pctCompleto > 50 ? 'var(--warning)' : 'var(--danger)'}" stroke-width="3" stroke-dasharray="${pctCompleto}, 100" style="transition: stroke-dasharray 0.6s ease-out; transform: rotate(-90deg); transform-origin: 18px 18px;"></circle>
                    </svg>
                    <div class="stat-info">
                        <h3>Completado</h3>
                        <div class="stat-value">${pctCompleto}%</div>
                        <div style="font-size:0.7rem;color:var(--text-muted);font-weight:600;">${enOrden} de ${total} docs.</div>
                    </div>
                </div>
            `;

            renderPendientes(datosFiltrados);
        }

        function renderizarTabla(grid, tipos, filtroAnio) {
            const datosFiltrados = filtroAnio ? grid.filter(f => f.anio.toString() === filtroAnio) : grid;

            let html = '<table><thead><tr><th>Año</th>';
            tipos.forEach(t => { html += `<th>${escapeAttr(t)}</th>`; });
            html += '</tr></thead><tbody>';

            datosFiltrados.forEach(fila => {
                html += `<tr><td>${fila.anio}</td>`;
                fila.items.forEach(item => {
                    const estado = item.estado || 'null';
                    const label = ESTADO_LABELS[estado] || '—';
                    const obs = item.observaciones ? ` title="${escapeAttr(item.observaciones)}"` : '';
                    html += `<td><span class="status-cell status-${estado}"${obs}>${label}</span></td>`;
                });
                html += '</tr>';
            });

            html += '</tbody></table>';
            papeleriaContainer.innerHTML = html;
        }

        function renderizarTarjetas(grid, tipos, filtroAnio) {
            const datosFiltrados = filtroAnio ? grid.filter(f => f.anio.toString() === filtroAnio) : grid;
            
            const cards = [];
            datosFiltrados.forEach(fila => {
                fila.items.forEach(item => {
                    const estado = item.estado || 'null';
                    if (estado !== 'null' || !filtroAnio) {
                        cards.push({
                            anio: fila.anio,
                            tipo: item.tipo,
                            estado: estado,
                            observaciones: item.observaciones
                        });
                    }
                });
            });

            if (cards.length === 0) {
                papeleriaContainer.innerHTML = '<div class="empty-state"><h3>No hay documentos</h3><p>No se encontraron registros de papelería para los filtros aplicados.</p></div>';
                return;
            }

            let html = '<div class="document-grid">';
            cards.forEach(c => {
                const label = ESTADO_LABELS[c.estado] || 'Pendiente';
                
                let stateClass = '';
                if (c.estado === 'en_orden') stateClass = 'success';
                else if (c.estado === 'no_entregado') stateClass = 'danger';
                else if (c.estado === 'hace_falta') stateClass = 'warning';
                else stateClass = 'unknown';
                
                let icon = '📄';
                const lowerTipo = c.tipo.toLowerCase();
                if (lowerTipo.includes('certificado')) icon = '🎓';
                else if (lowerTipo.includes('boleta') || lowerTipo.includes('nota') || lowerTipo.includes('calificacion')) icon = '📊';
                else if (lowerTipo.includes('constancia')) icon = '📜';
                else if (lowerTipo.includes('inscripcion') || lowerTipo.includes('solicitud')) icon = '📝';
                else if (lowerTipo.includes('foto') || lowerTipo.includes('titulo')) icon = '👤';

                let typeClass = 'inscripcion';
                if (lowerTipo.includes('certificado')) typeClass = 'certificado';
                else if (lowerTipo.includes('boleta')) typeClass = 'boleta';
                else if (lowerTipo.includes('constancia')) typeClass = 'constancia';

                html += `
                    <div class="doc-card ${typeClass} ${stateClass}">
                        <div class="doc-header">
                            <div class="doc-icon">${icon}</div>
                            <div class="doc-title-container">
                                <div class="doc-title">${escapeAttr(c.tipo)}</div>
                                <div class="doc-type">Expediente Escolar</div>
                            </div>
                        </div>
                        <div class="doc-body">
                            <div class="doc-info-row">
                                <span class="doc-info-label">Año Escolar:</span>
                                <span class="doc-info-val">${c.anio}</span>
                            </div>
                            <div class="doc-info-row">
                                <span class="doc-info-label">Estado:</span>
                                <span class="badge badge-${stateClass}">${label}</span>
                            </div>
                            ${c.observaciones ? `
                            <div style="margin-top: 1rem; padding: 0.5rem; background: var(--primary-bg); border-radius: var(--radius-sm); font-size: 0.75rem; border: 1px dashed var(--border); color: var(--text-main);">
                                <strong>Observaciones:</strong> ${escapeAttr(c.observaciones)}
                            </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            papeleriaContainer.innerHTML = html;
        }

        const ESTADO_LABELS = {
            'en_orden': '🟢 En orden',
            'no_entregado': '🔴 No entregado',
            'hace_falta': '🟡 Hace falta',
            'null': '—'
        };

        /* ── PDF Viewer ── */
        async function cargarPDFStatus() {
            const detalle = document.getElementById('detalle-pdf');
            const display = document.getElementById('pdf-display');
            if (!detalle || !display || activeUser.rol === 'admin') return;
            try {
                const res = await fetch(`/api/pdf/${activeUser.cui}/status`);
                const data = await res.json();
                if (data.disponible) {
                    display.innerHTML = '<p style="color:var(--success);"><i class="ph ph-check-circle"></i> Tiene un documento PDF disponible.</p><p style="margin-top:0.5rem;"><button class="btn btn-primary" onclick="verPDF()" style="font-size:0.85rem;"><i class="ph ph-eye"></i> Ver Documento</button></p>';
                } else {
                    display.innerHTML = '<p style="color:var(--text-muted);">No hay documentos PDF disponibles en este momento.</p>';
                }
            } catch (e) {
                display.innerHTML = '<p style="color:var(--text-muted);">No hay documentos PDF disponibles.</p>';
            }
        }

        window.verPDF = function() {
            const display = document.getElementById('pdf-display');
            display.innerHTML = `<iframe src="/api/pdf/${activeUser.cui}" style="width:100%;height:500px;border:none;border-radius:8px;"></iframe>`;
        };

        document.getElementById('detalle-pdf')?.addEventListener('toggle', async (e) => {
            if (e.target.open) {
                await cargarPDFStatus();
            }
        });

        // ── Ayuda: Mis mensajes ──
        function renderMensajesAyuda(mensajes) {
            const list = document.getElementById('mis-mensajes-list');
            if (!mensajes || mensajes.length === 0) {
                list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:1rem;">No tenés mensajes de ayuda aún.</p>';
                return;
            }
            list.innerHTML = mensajes.map(m => {
                const estadoClass = 'badge-' + (m.estado === 'pendiente' ? 'pendiente' : m.estado === 'en_proceso' ? 'proceso' : 'resuelto');
                const fecha = new Date(m.creado_en).toLocaleDateString('es-GT');
                return '<div class="ayuda-card" style="padding:0.8rem 1rem;border:1px solid var(--border);border-radius:8px;margin-bottom:0.5rem;">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;flex-wrap:wrap;">' +
                    '<span style="font-size:0.82rem;color:var(--text-muted);">' + escapeAttr(m.codigo) + '</span>' +
                    '<span class="badge ' + estadoClass + '">' + m.estado.replace('_', ' ') + '</span>' +
                    '</div>' +
                    '<p style="margin:0.4rem 0;font-size:0.9rem;">' + escapeAttr(m.mensaje) + '</p>' +
                    '<div style="font-size:0.8rem;color:var(--text-muted);">' + fecha + (m.categoria ? ' · ' + escapeAttr(m.categoria) : '') + '</div>' +
                    (m.respuesta ? '<div style="margin-top:0.5rem;padding:0.5rem;background:var(--bg-card, #f8f9fa);border-radius:6px;border-left:3px solid var(--success, #2f6b3a);"><strong>Respuesta:</strong> ' + escapeAttr(m.respuesta) + '</div>' : '') +
                    '</div>';
            }).join('');
        }

        function cargarMensajesAyuda() {
            const section = document.getElementById('mis-mensajes-section');
            if (!section) return;
            section.classList.remove('hidden');
            const list = document.getElementById('mis-mensajes-list');
            if (!list) return;
            list.innerHTML = '<p style="color:var(--text-muted);">Cargando...</p>';
            fetch('/api/ayuda/mis-mensajes')
                .then(r => { if (!r.ok) throw new Error(); return r.json(); })
                .then(data => renderMensajesAyuda(data.mensajes))
                .catch(() => {
                    list.innerHTML = '<p style="color:var(--danger);">Error al cargar mensajes.</p>';
                });
        }

        // Wire ayuda section
        (function() {
            var btnNuevo = document.getElementById('btn-nuevo-mensaje');
            var formNuevo = document.getElementById('nuevo-mensaje-form');
            var btnCancelar = document.getElementById('btn-cancelar-mensaje');
            var btnEnviar = document.getElementById('btn-enviar-mensaje');
            var msgCategoria = document.getElementById('msg-categoria');
            var msgMensaje = document.getElementById('msg-mensaje');
            var msgFoto = document.getElementById('msg-foto');

            // Load categories for the portal form
            if (msgCategoria) {
                fetch('/api/ayuda/config')
                    .then(r => r.json())
                    .then(d => {
                        d.categorias.forEach(c => {
                            var opt = document.createElement('option');
                            opt.value = c; opt.textContent = c;
                            msgCategoria.appendChild(opt);
                        });
                    });
            }

            if (btnNuevo && formNuevo) {
                btnNuevo.addEventListener('click', function() {
                    formNuevo.classList.remove('hidden');
                    btnNuevo.classList.add('hidden');
                });
            }

            if (btnCancelar && formNuevo) {
                btnCancelar.addEventListener('click', function() {
                    formNuevo.classList.add('hidden');
                    btnNuevo.classList.remove('hidden');
                    msgMensaje.value = '';
                    msgFoto.value = '';
                });
            }

            if (btnEnviar && formNuevo) {
                btnEnviar.addEventListener('click', function() {
                    var categoria = msgCategoria.value;
                    var mensaje = msgMensaje.value.trim();
                    if (!categoria) { showToast('Seleccioná una categoría', 'error'); return; }
                    if (mensaje.length < 10) { showToast('El mensaje debe tener al menos 10 caracteres', 'error'); return; }
                    var formData = new FormData();
                    formData.append('categoria', categoria);
                    formData.append('mensaje', mensaje);
                    if (msgFoto.files[0]) formData.append('foto', msgFoto.files[0]);
                    btnEnviar.disabled = true;
                    fetch('/api/ayuda/mis-mensajes', {
                        method: 'POST',
                        headers: { 'X-CSRF-Token': getCSRFToken() },
                        body: formData
                    })
                    .then(r => {
                        if (r.status === 201) {
                            return r.json().then(function(d) {
                                showToast('Mensaje enviado. Código: ' + d.codigo, 'success');
                                formNuevo.classList.add('hidden');
                                btnNuevo.classList.remove('hidden');
                                msgMensaje.value = '';
                                msgFoto.value = '';
                                cargarMensajesAyuda();
                            });
                        } else {
                            return r.json().then(d => { throw new Error(d.error || 'Error'); });
                        }
                    })
                    .catch(err => showToast(err.message || 'Error al enviar mensaje', 'error'))
                    .finally(function() { btnEnviar.disabled = false; });
                });
            }

            var detalleAyuda = document.getElementById('detalle-mis-mensajes');
            if (detalleAyuda) {
                detalleAyuda.addEventListener('toggle', function() {
                    if (detalleAyuda.open) cargarMensajesAyuda();
                });
            }
        })();
