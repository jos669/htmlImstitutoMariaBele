    
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

        window.addEventListener('DOMContentLoaded', () => {
            checkSession();
            loginForm.addEventListener('submit', handleLogin);
            btnLogout.addEventListener('click', handleLogout);
            setInterval(() => {
                fetch('/api/session').catch(() => {});
            }, 600000); // 10 min keep-alive

            const passwordForm = document.getElementById('password-form');
            if (passwordForm) {
                passwordForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const current = document.getElementById('password-actual').value;
                    const nuevo = document.getElementById('password-nuevo').value;
                    if (!current || !nuevo) return;
                    if (nuevo.length < 4) {
                        showToast('La nueva contraseña debe tener al menos 4 caracteres.', 'warning');
                        return;
                    }
                    try {
                        const res = await fetch('/api/cambiar-password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRFToken() },
                            body: JSON.stringify({ password_actual: current, password_nuevo: nuevo })
                        });
                        const data = await res.json();
                        if (res.ok) {
                            showToast(data.mensaje, 'success');
                            passwordForm.reset();
                        } else {
                            showToast(data.error || 'Error al cambiar contraseña.', 'danger');
                        }
                    } catch (err) {
                        showToast('Error de conexión.', 'danger');
                    }
                });
            }
            consentimientoCheckbox.addEventListener('change', () => {
                consentimientoCheckbox.parentNode.style.border = '';
            });

            cuiInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
                const icon = document.getElementById('cui-validation-icon');
                if (e.target.value.length === 0) {
                    icon.style.display = 'none';
                } else if (e.target.value.length === 13) {
                    icon.textContent = '✅';
                    icon.className = 'cui-valid';
                    icon.style.display = 'inline';
                } else {
                    icon.textContent = '❌';
                    icon.className = 'cui-invalid';
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

            function getCSRFToken() {
                const m = document.querySelector('meta[name="csrf-token"]');
                return m ? m.getAttribute('content') : '';
            }

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
                        window.location.href = '/admin';
                        return;
                    }
                    showDashboard();
                    await cargarPapeleria();
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
        cargarQRVerificacion();
        document.getElementById('password-section')?.classList.remove('hidden');
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
            const consentimiento = consentimientoCheckbox.checked;

            if (cui.length !== 13) {
                showAlert('El CUI debe contener exactamente 13 dígitos numéricos.');
                return;
            }

            btnLoginSubmit.classList.add('btn-loading');

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRFToken() },
                    body: JSON.stringify({ cui, consentimiento }),
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
                    window.location.href = '/admin';
                    return;
                }

                consentimientoCheckbox.parentNode.style.border = '';
                showDashboard();
                await cargarPapeleria();
            } catch (err) {
                showAlert('No se pudo conectar con el servidor.');
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

        async function cargarPapeleria() {
            const skeletonLoading = document.getElementById('skeleton-loading');
            skeletonLoading.classList.remove('hidden');
            papeleriaContainer.classList.add('hidden');
            emptyState.classList.add('hidden');
            loadingSpinner.classList.remove('hidden');

            try {
                const response = await fetch('/api/papeleria');
                if (!response.ok) throw new Error('Error al cargar datos');
                allData = await response.json();
                renderPapeleria(allData);
                showToast('Expediente escolar cargado exitosamente.', 'success');
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
                    showToast(`Filtrado por año: ${currentAnioFiltro || 'Todos'}`, 'success');
                });
            });

            let total = 0, enOrden = 0, noEntregado = 0, haceFalta = 0;
            grid.forEach(fila => {
                fila.items.forEach(item => {
                    total++;
                    if (item.estado === 'en_orden') enOrden++;
                    else if (item.estado === 'no_entregado') noEntregado++;
                    else if (item.estado === 'hace_falta') haceFalta++;
                });
            });

            // Resumen de estado en hermosas tarjetas de Dashboard
            const pctCompleto = total > 0 ? Math.round((enOrden / total) * 100) : 0;
            const statsDashboard = document.getElementById('stats-dashboard');
            statsDashboard.innerHTML = `
                <div class="stat-card" style="gap: 1rem;">
                    <svg width="60" height="60" viewBox="0 0 36 36" style="flex-shrink: 0;">
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border)" stroke-width="3"></circle>
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="${pctCompleto === 100 ? 'var(--success)' : pctCompleto > 50 ? 'var(--warning)' : 'var(--danger)'}" stroke-width="3" stroke-dasharray="${pctCompleto}, 100" style="transition: stroke-dasharray 0.6s ease-out; transform: rotate(-90deg); transform-origin: 18px 18px;"></circle>
                    </svg>
                    <div class="stat-info">
                        <h3>Completado</h3>
                        <div class="stat-value">${pctCompleto}%</div>
                        <div style="font-size:0.7rem;color:var(--text-muted);font-weight:600;">${enOrden} de ${total} docs.</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--success);">🟢</div>
                    <div class="stat-info">
                        <h3>En orden</h3>
                        <div class="stat-value">${enOrden}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: var(--warning);">🟡</div>
                    <div class="stat-info">
                        <h3>Hace falta</h3>
                        <div class="stat-value">${haceFalta}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: rgba(239, 68, 68, 0.1); color: var(--danger);">🔴</div>
                    <div class="stat-info">
                        <h3>No entregado</h3>
                        <div class="stat-value">${noEntregado}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--secondary-bg); color: var(--secondary);">📋</div>
                    <div class="stat-info">
                        <h3>Total Requerido</h3>
                        <div class="stat-value">${total}</div>
                    </div>
                </div>
            `;

            actualizarVistaDocumentos();
        }

        function actualizarVistaDocumentos() {
            if (!allData) return;
            
            // Remove styles that conflict between grid and table
            if (currentView === 'table') {
                papeleriaContainer.className = 'papeleria-grid';
                renderizarTabla(allData.grid, allData.tipos, currentAnioFiltro);
            } else {
                papeleriaContainer.className = '';
                renderizarTarjetas(allData.grid, allData.tipos, currentAnioFiltro);
            }
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
