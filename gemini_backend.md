# 🐍 Arquitectura del Backend y APIs - Python & Flask

Este documento detalla la estructura lógica del servidor Python, los controladores de ruta, el control de acceso y el subsistema de auditoría de logs.

---

## 🚦 1. Tabla de Enrutamiento de la API

El backend expone rutas de vistas e interfaces de datos REST en formato JSON.

| Ruta | Método | Nivel de Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `/` | `GET` | Público | Renderiza la SPA `index.html` (Login / Estudiante). |
| `/admin` | `GET` | Admin | Renderiza el panel administrativo `admin.html`. |
| `/verificar/<token>` | `GET` | Público | Renderiza la plantilla de verificación de códigos QR `verificar.html`. |
| `/api/login` | `POST` | Público | Autentica usuarios por CUI y PIN. Maneja la aceptación del consentimiento legal. |
| `/api/logout` | `POST` | Autenticado | Destruye la sesión del usuario actual y borra cookies. |
| `/api/documentos` | `GET` | Autenticado | Retorna el listado de documentos asociados al CUI del estudiante, o todos si es Admin. |
| `/api/documento/<id>` | `GET` | Autenticado (Dueño/Admin)| Sirve de forma segura el PDF correspondiente si el usuario es el dueño o admin. |
| `/api/admin/alumnos` | `GET` | Admin | Retorna una lista con todos los alumnos registrados y su consentimiento legal. |
| `/api/admin/alumnos` | `POST` | Admin | Registra un nuevo alumno (CUI, Nombre, Grado, PIN) en la base de datos. |
| `/api/admin/documentos`| `POST` | Admin | Sube un archivo PDF físico a `/app_docs`, genera UUID/Token, e inserta metadatos. |
| `/api/admin/logs` | `GET` | Admin | Devuelve los últimos 200 logs de auditoría general. |
| `/api/verificar_api/<tok>`| `GET` | Público | Retorna metadatos públicos de verificación asociados al token de QR. |

---

## 🛡️ 2. Middlewares y Seguridad de Acceso

El servidor utiliza decoradores de Python para restringir rutas críticas y evitar accesos no autorizados.

### Decorador: Requiere Login (`login_required`)
Garantiza que la cookie de sesión cifrada contenga el identificador `cui`. De lo contrario, retorna un error HTTP 401 en JSON.
```python
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'cui' not in session:
            return jsonify({'error': 'No autenticado. Por favor inicie sesión.'}), 401
        return f(*args, **kwargs)
    return decorated_function
```

### Decorador: Requiere Admin (`admin_required`)
Garantiza que la sesión activa tenga rol de administrador. Si falla, retorna error HTTP 403.
```python
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'cui' not in session or session.get('rol') != 'admin':
            return jsonify({'error': 'Acceso no autorizado.'}), 403
        return f(*args, **kwargs)
    return decorated_function
```

---

## 📂 3. Servicio Seguro de Archivos PDF

Para impedir descargas directas de PDFs por usuarios no autorizados, el archivo físico se sirve evaluando los permisos en caliente y utilizando la función segura de Flask `send_from_directory`.

```python
@app.route('/api/documento/<int:doc_id>', methods=['GET'])
@login_required
def api_descargar_documento(doc_id):
    doc = obtener_documento_por_id(doc_id)
    if not doc:
        return jsonify({'error': 'El documento no existe.'}), 404

    rol = session.get('rol')
    cui = session.get('cui')

    # Validar que el estudiante solo vea sus propios documentos
    if rol != 'admin' and doc['estudiante_cui'] != cui:
        registrar_log(cui, 'acceso_no_autorizado', f"Intento acceder ilegalmente al documento ID {doc_id}", request.remote_addr)
        return jsonify({'error': 'No tiene autorización para ver este documento.'}), 403

    registrar_log(cui, 'visualizar_documento', f"Visualizo el documento ID: {doc_id} ('{doc['titulo']}')", request.remote_addr)

    # Servir el PDF de manera aislada y segura
    return send_from_directory(
        DOCS_DIR,
        doc['nombre_archivo'],
        mimetype='application/pdf',
        as_attachment=False # Permite previsualizar en iframe sin forzar descarga inmediata
    )
```

---

## 📜 4. Registro y Auditoría de Logs
Cada evento sensible escribe una tupla inmutable de datos en la tabla `logs` mediante la función `registrar_log()`.

*   **Estructura de Log:** `(timestamp, usuario_cui, accion, detalles, direccion_ip)`.
*   **Acciones registradas obligatoriamente:**
    *   `login`: Autenticaciones exitosas.
    *   `login_fallido`: Intentos fallidos de autenticación (registra el CUI intentado).
    *   `logout`: Cierre de sesión voluntario.
    *   `consentimiento_aceptado`: Registro explícito de aceptación del consentimiento de datos.
    *   `visualizar_documento`: Apertura online de un documento en PDF.
    *   `subir_documento`: Inserciones de nuevos archivos por el administrador.
    *   `crear_estudiante`: Nuevos registros de alumnos por el administrador.
    *   `acceso_no_autorizado`: Intentos ilegítimos de saltarse la seguridad del CUI.
    *   `verificar_qr`: Consultas hechas al validador de QR público.
