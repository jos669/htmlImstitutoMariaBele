# Control de Papelería Escolar

Sistema web para la gestión y control de papelería y expedientes académicos del **Instituto María Belén Medrano García**. Permite a estudiantes consultar el estado de sus documentos y a administradores gestionar el inventario de forma eficiente.

## Funcionalidades

- **Portal del Estudiante** — Consulta de documentos personales por año académico y tipo de papelería, con filtros y estados visuales.
- **Panel de Administración** — Gestión de alumnos, tipos de papelería, asignación de documentos, alertas de estudiantes incompletos y exportación de datos.
- **Control de Expedientes Físicos** — Registro de expedientes, códigos de caja, ubicación y movimientos (retiro, devolución, verificación).
- **Importación Masiva** — Carga de estudiantes desde archivos XLSX, CSV, TXT o DOCX.
- **Exportación a Excel** — Descarga del inventario completo con formato profesional.
- **Autenticación Segura** — Inicio de sesión con CUI (13 dígitos) y PIN, hashing PBKDF2-HMAC-SHA256, sesión con expiración y rate limiting.
- **Modo Oscuro** — Interfaz adaptable con persistencia de preferencia.
- **Auditoría** — Registro de todas las operaciones sensibles con IP y fecha.

## Tecnologías

- **Backend:** Python 3 + Flask
- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (Vanilla)
- **Base de Datos:** SQLite3
- **Autenticación:** Sesiones Flask, PBKDF2-HMAC-SHA256, CSRF
- **Dependencias opcionales:** openpyxl (Excel), qrcode (códigos QR), localtunnel (exposición web)

## Requisitos

- Python 3.10+
- pip

## Instalación

```bash
pip install -r requirements.txt
python populate_db.py
python app.py
```

El servidor se iniciará en `http://0.0.0.0:5000`.

## Credenciales de Prueba

| Rol | CUI | PIN |
|-----|-----|-----|
| Estudiante | `2810452310101` | `1234` |
| Estudiante | `4789123450101` | `5678` |
| Administrador | `admin` | `admin123` |

## Configuración

| Variable | Descripción |
|----------|-------------|
| `FLASK_SECRET_KEY` | Clave secreta para sesiones (auto-generada si no se define) |
| `FLASK_DEBUG=1` | Activa modo debug |

## Pruebas

```bash
python populate_db.py
python test_sistema.py
```

## Licencia

Uso educativo — Instituto María Belén Medrano García.
