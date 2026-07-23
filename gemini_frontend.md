# 🎨 Diseño Frontend y Experiencia de Usuario (UX)

Este documento detalla la estructura visual, la lógica del cliente y la hoja de estilos CSS que componen la interfaz responsiva del sistema.

---

## 🎨 1. Sistema de Diseño (Variables CSS)
La interfaz del sistema utiliza un sistema de diseño limpio, moderno, con gradientes suaves y variables semánticas declaradas en `:root` de `style.css`:

```css
:root {
    --primary-dark: #1e3a8a;       /* Azul marino corporativo */
    --primary: #2563eb;            /* Azul principal */
    --primary-light: #3b82f6;      /* Azul claro */
    --primary-bg: #f8fafc;         /* Gris pizarra claro */
    --text-main: #1e293b;          /* Gris oscuro para textos principales */
    --text-muted: #64748b;         /* Gris medio para descripciones */
    --success: #10b981;            /* Verde esmeralda (Completado) */
    --warning: #f59e0b;            /* Naranja (En Trámite) */
    --danger: #ef4444;             /* Rojo (Pendiente de Firma) */
    --border: #e2e8f0;             /* Gris de separación */
    --white: #ffffff;
    --radius: 12px;                /* Redondeo de tarjetas y modales */
    --radius-sm: 6px;              /* Redondeo de botones y controles */
}
```

---

## 🗺️ 2. Mapa de Interfaces del Frontend

### A. Vista del Estudiante (`index.html`)
Es una SPA (Single Page Application) dinámica de Vanilla JS que alterna estados:
1.  **Formulario de Login:**
    *   Filtra entradas de CUI para que solo acepte números.
    *   Exige un CUI de 13 dígitos del estándar guatemalteco.
    *   Posee un recuadro de consentimiento legal. Si no se marca, al enviar devuelve un mensaje explicativo previniendo el ingreso.
2.  **Dashboard del Estudiante:**
    *   Un buscador textual que filtra tarjetas en tiempo real sin recarga de página.
    *   Filtros tipo `select` por Tipo de documento y Año.
    *   Un contenedor dinámico (`.document-grid`) que renderiza tarjetas de documentos.
3.  **Visualizador Modal Seguro:**
    *   Un `iframe` de visualización de PDF apuntando a `/api/documento/<id>`.
    *   Un generador dinámico de código QR que llama a la URL pública de validación (`https://api.qrserver.com/...&data=<url_verificacion>`).
    *   Opción de impresión de iframe e hipervínculos de descarga.

### B. Vista del Administrador (`admin.html`)
Contiene pestañas que se alternan mediante Javascript manipulando la clase CSS `.active`:
1.  **Pestaña Subir Documento:** Formulario `multipart/form-data` para subir archivos PDF y enviarlos al endpoint `/api/admin/documentos`.
2.  **Pestaña Gestión Alumnos:** Registra nuevos estudiantes enviando peticiones JSON a `/api/admin/alumnos` y renderiza la lista de estudiantes matriculados.
3.  **Pestaña Logs de Auditoría:** Muestra una tabla con los últimos 200 logs de auditoría consultados desde `/api/admin/logs`.

### C. Vista de Verificación QR Pública (`verificar.html`)
Pantalla receptora del escaneo de QR. Realiza una petición asíncrona de consulta y dibuja en pantalla una tarjeta verde con un escudo (`🛡️`) si el token es verídico, o una tarjeta roja con un símbolo de advertencia (`⚠️`) si es apócrifo.

---

## ⚡ 3. Lógica Clave en Javascript (Cliente)

### Comprobación de Sesión al Cargar la Página
```javascript
async function checkSession() {
    try {
        const response = await fetch('/api/documentos');
        if (response.ok) {
            const docs = await response.json();
            allDocuments = docs;
            // Deducir CUI y Nombre de los metadatos recibidos
            activeUser = { cui: docs[0]?.estudiante_cui || 'Estudiante', rol: 'estudiante' };
            showDashboard();
            renderDocuments(allDocuments);
        } else {
            showLogin();
        }
    } catch (err) {
        showLogin();
    }
}
```

### Control del Visor Modal (iFrame + QR)
```javascript
function openDocument(docId, title, token) {
    modalTitle.textContent = title;
    modalIframe.src = `/api/documento/${docId}`;
    btnModalDownload.href = `/api/documento/${docId}`;
    
    const host = window.location.host;
    const verificationUrl = `${window.location.protocol}//${host}/verificar/${token}`;
    
    // Generar código QR dinámico
    qrImgViewer.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationUrl)}`;
    verificationTokenTxt.textContent = `Token: ${token}`;

    docModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
```
