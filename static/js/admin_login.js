    
        // Cargar tema inmediatamente
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.body.classList.add('dark-theme');
        }

        function getCSRFToken() {
            const m = document.querySelector('meta[name="csrf-token"]');
            return m ? m.getAttribute('content') : '';
        }

        // Configurar toggle de tema
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            const updateIcon = () => {
                const isDark = document.body.classList.contains('dark-theme');
                toggleBtn.innerHTML = isDark ? '<i class="ph ph-moon"></i>' : '<i class="ph ph-sun-dim"></i>';
            };
            toggleBtn.addEventListener('click', () => {
                document.body.classList.toggle('dark-theme');
                localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
                updateIcon();
            });
            updateIcon();
        }

        const loginForm = document.getElementById('admin-login-form');
        const usernameInput = document.getElementById('admin-username');
        const passwordInput = document.getElementById('admin-password');
        const submitBtn = document.getElementById('btn-login-submit');
        const errorAlert = document.getElementById('error-alert');
        const togglePassword = document.getElementById('toggle-password');

        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                const type = passwordInput.type === 'password' ? 'text' : 'password';
                passwordInput.type = type;
                togglePassword.innerHTML = type === 'password' ? '<i class="ph ph-eye"></i>' : '<i class="ph ph-eye-slash"></i>';
            });
        }

        let loginSubmitting = false;

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (loginSubmitting) return;
            loginSubmitting = true;
            errorAlert.style.display = 'none';
            submitBtn.classList.add('btn-loading');

            const cui = usernameInput.value.trim();
            const password = passwordInput.value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCSRFToken() },
                    body: JSON.stringify({ cui, password }),
                    cache: 'no-store'
                });

                let data = {};
                try {
                    data = await response.json();
                } catch (jsonErr) {
                    console.error("Error al decodificar JSON de la respuesta:", jsonErr);
                }

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error(data.error || 'Credenciales administrativas incorrectas.');
                    } else if (response.status === 403) {
                        throw new Error(data.error || 'No tiene permisos para acceder a esta sección.');
                    } else {
                        throw new Error(data.error || 'Error en el servidor al intentar iniciar sesión.');
                    }
                }

                if (data.user && data.user.rol === 'admin') {
                    window.location.href = '/admin';
                } else {
                    throw new Error('Esta cuenta no tiene privilegios de administrador.');
                }

            } catch (err) {
                console.error("Error login admin:", err);
                errorAlert.textContent = err.message || 'Error de comunicación con el servidor.';
                errorAlert.style.display = 'block';
            } finally {
                submitBtn.classList.remove('btn-loading');
                loginSubmitting = false;
            }
        });
