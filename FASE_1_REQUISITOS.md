# 📄 Fase 1: Documento de Requisitos y Diseño - Sistema de Consulta de Documentos

Este documento contiene la especificación completa de requisitos, diseño de interfaces (wireframes ASCII) y arquitectura de datos para el **Sistema de Consulta de Documentos Escolares**. Servirá como guía de desarrollo para las fases subsiguientes (Fases 2 a 10).

---

## 🎯 1. Objetivos del Sistema
El sistema tiene como objetivo permitir a los estudiantes y padres de familia del instituto consultar, visualizar y descargar documentos académicos (certificados, boletas de notas, constancias) de forma remota y segura, reduciendo las visitas presenciales innecesarias y agilizando la gestión administrativa del instituto.

---

## 🔐 2. Requisitos Funcionales (RF)

### RF-01: Registro y Autenticación de Usuarios
*   **Identificación por CUI:** Los alumnos/padres ingresan utilizando su **Código Único de Identificación (CUI)** de 13 dígitos de Guatemala como usuario.
*   **Acceso con PIN/Contraseña:** Acceso protegido mediante una contraseña o PIN definido por la administración.
*   **Consentimiento Obligatorio:** Al iniciar sesión por primera vez, el usuario debe leer y aceptar un "Consentimiento Informado" sobre el tratamiento de datos personales de menores de edad (conforme al marco legal de Guatemala). Si no lo acepta, no podrá ver su información.

### RF-02: Consulta y Búsqueda de Documentos (Estudiante)
*   **Panel Personal:** Una vez autenticado, el estudiante solo tiene acceso a sus propios documentos.
*   **Búsqueda Rápida:** Filtrar documentos por título, descripción o palabra clave.
*   **Filtros Avanzados:**
    *   **Por Tipo:** Certificados, Constancias, Boletas de Notas, Inscripciones.
    *   **Por Año Académico:** (ej. 2024, 2025, 2026).
    *   **Por Estado:** Completado, En Trámite, Pendiente de Firma.

### RF-03: Visualizador Integrado de PDFs
*   **Visor en Pantalla:** Los documentos se previsualizan directamente en la página web usando un componente integrado (iframe / PDF.js) sin obligar a la descarga inmediata.
*   **Protección de Archivos:** Los PDFs reales están almacenados en una carpeta privada del servidor Python y no se puede acceder a ellos mediante URLs directas (se requiere sesión activa y validación de propiedad).

### RF-04: Descarga y Código QR de Autenticidad
*   **Descarga de PDF:** Botón para guardar el documento localmente.
*   **Código QR Integrado (Simulado/Real):** Los documentos presentarán un código QR que enlaza a una ruta pública de verificación, permitiendo a terceros escanear el QR para validar que el documento es legítimo y no ha sido alterado.

### RF-05: Panel de Administración (Gestión Escolar)
*   **Carga de Documentos:** Formulario para que el personal administrativo suba un archivo PDF, asocie su metadatos (título, tipo, año, grado, sección) y lo asigne al CUI de un estudiante.
*   **Gestión de Alumnos:** Crear, buscar, actualizar y desactivar cuentas de alumnos (CUI, Nombre Completo, Grado, Sección, Contraseña/PIN).
*   **Visualización de Auditoría:** Pantalla donde los administradores pueden ver quién ha accedido a los documentos.

### RF-06: Historial y Logs de Auditoría (Seguridad)
*   **Registro Automático de Actividad:** Cada vez que un usuario inicia sesión, busca un documento, o visualiza/descarga un archivo, se guarda un registro (Log) inalterable con:
    *   Fecha y hora del evento.
    *   CUI del usuario.
    *   Acción realizada (ej. "Visualizó Boleta de Notas 2025").
    *   Dirección IP del cliente.

---

## ⚙️ 3. Requisitos No Funcionales (RNF)

### RNF-01: Interfaz Responsiva (Mobile-First)
*   La aplicación debe ser 100% amigable para celulares, ya que la mayoría de los usuarios accederán desde sus dispositivos móviles con conexiones móviles de datos o WiFi local.

### RNF-02: Stack Tecnológico Ligero y Portable
*   **Frontend:** HTML5, CSS3 clásico (Vanilla CSS con diseño moderno y limpio) y Vanilla JavaScript. No se usarán frameworks pesados.
*   **Backend:** Python 3 usando Flask o FastAPI por su portabilidad, bajo consumo de recursos y facilidad de ejecución en entornos restringidos como Termux en Android.
*   **Base de Datos:** SQLite. Una sola base de datos (`sistema.db`) que gestiona las tablas relacionales de forma local, rápida y sin necesidad de servicios externos.
*   **Estructura de Datos de Configuración:** Uso de archivos JSON para cargar datos predeterminados, configuraciones del sistema o simulaciones rápidas.

### RNF-03: Seguridad y Privacidad de Datos de Menores
*   **No Exposición Pública:** Queda estrictamente prohibida la indexación en motores de búsqueda de las carpetas de documentos.
*   **Encriptación de Contraseñas:** Las contraseñas en la base de datos SQLite se guardarán encriptadas usando algoritmos seguros (como `bcrypt` o hashes con sal en Python).
*   **Expiración de Sesión:** Las sesiones de usuario expiran automáticamente tras 15 minutos de inactividad.

---

## 🇬🇹 4. Consideraciones Legales en Guatemala

A falta de una ley integral de protección de datos personales en el país (y con iniciativas legislativas en curso), el diseño implementa las mejores prácticas basadas en la **Constitución de la República de Guatemala** (Artículos 24, 30 y 31 sobre derecho a la intimidad y acceso a archivos públicos), la **Ley de Acceso a la Información Pública** (Decreto 57-2008) y el **Código de la Niñez y la Juventud**:

1.  **Consentimiento Explícito:** El usuario (o padre/tutor en caso de menores) debe dar click en "Acepto que mis datos escolares y documentos sean procesados digitalmente para mi consulta privada" antes de visualizar información sensible.
2.  **Minimización de Datos:** No se mostrarán en pantalla datos innecesarios como dirección residencial exacta del alumno, números telefónicos de familiares, o datos médicos si no son requeridos para el trámite escolar.
3.  **Auditoría Estricta:** El módulo de logs garantiza que si ocurre un acceso no autorizado, la dirección del instituto podrá identificar desde qué dirección IP y a qué hora ocurrió el incidente.

---

## 🗃️ 5. Diseño de Base de Datos y Formato JSON

El backend usará **SQLite** para persistencia de datos reales, pero expondrá respuestas estructuradas en formato **JSON**.

### A. Tabla / Estructura: `Usuarios`
Representa a los estudiantes y administradores en el sistema.
```json
{
  "cui": "2810452310101",          // String (13 dígitos) - Llave Primaria
  "nombre_completo": "Juan Pérez",  // String
  "rol": "estudiante",              // String ("estudiante" o "admin")
  "grado": "3ro Básico",            // String
  "seccion": "A",                   // String
  "password_hash": "$2b$12$...",    // String (Bcrypt Hash)
  "acepto_consentimiento": true,    // Boolean (Registro de aceptación legal)
  "fecha_consentimiento": "2026-06-25T14:32:00Z"
}
```

### B. Tabla / Estructura: `Documentos`
Almacena la metadata de cada archivo académico. El PDF real se guarda en disco con un nombre seguro (ej. `doc_78fd23a.pdf`).
```json
{
  "id": 104,                        // Integer - Llave Primaria Auto-incremental
  "estudiante_cui": "2810452310101",// String (Llave foránea -> Usuarios.cui)
  "titulo": "Certificado de Estudios 2025", // String
  "tipo": "certificado",            // String ("certificado", "constancia", "boleta", "inscripcion")
  "anio_academico": 2025,           // Integer
  "fecha_emision": "2025-11-20",    // String (YYYY-MM-DD)
  "nombre_archivo": "cert_2025_2810452310101.pdf", // String (Nombre físico en disco)
  "estado": "completado",           // String ("pendiente", "en_tramite", "completado")
  "token_verificacion": "abc123xyz789" // String para verificación pública vía QR
}
```

### C. Tabla / Estructura: `Logs`
Auditoría de actividad del sistema.
```json
{
  "id": 4501,                       // Integer - Llave Primaria
  "timestamp": "2026-06-25T15:10:02Z", // String (ISO 8601)
  "usuario_cui": "2810452310101",   // String (CUI del autor de la acción)
  "accion": "visualizar_documento", // String ("login", "logout", "buscar", "visualizar_documento", "descargar_documento")
  "detalles": "Visualizó documento ID: 104", // String
  "direccion_ip": "192.168.1.15"    // String (IP del cliente)
}
```

---

## 🎨 6. Wireframes de la Interfaz (Estructura de Pantallas)

### Pantalla A: Autenticación y Consentimiento de Datos (Móvil)
```
+-------------------------------------------------+
|                                                 |
|          🏫 INSTITUTO DE EDUCACIÓN              |
|            Portal de Documentos                 |
|                                                 |
|  [📄 Logo del Instituto]                        |
|                                                 |
|  CUI (13 dígitos):                              |
|  [ 2810452310101                             ]  |
|                                                 |
|  PIN / Contraseña:                              |
|  [ **********                                ]  |
|                                                 |
|  Términos de Privacidad y Consentimiento:       |
|  +-------------------------------------------+  |
|  | Conforme a la legislación de Guatemala y  |  |
|  | garantizando la protección de datos de    |  |
|  | menores de edad, acepto que el instituto  |  |
|  | almacene y me muestre mis documentos...   |  |
|  +-------------------------------------------+  |
|  [X] Acepto expresamente los términos de uso.   |
|                                                 |
|  [         🔑 INGRESAR AL PORTAL             ]  |
|                                                 |
|  📞 Soporte: soporte@instituto.edu.gt           |
+-------------------------------------------------+
```

### Pantalla B: Portal del Estudiante - Mis Documentos (Móvil)
```
+-------------------------------------------------+
| 🏫 Portal Documentos         [👤 Juan Pérez] [x]|
+-------------------------------------------------+
| Buscar documento:                               |
| [ Buscar por título...                      🔍 ] |
|                                                 |
| Filtros:                                        |
| +-----------------++-----------------+          |
| | Tipo: Todos   v || Año: 2025      v |          |
| +-----------------++-----------------+          |
|                                                 |
| --- RESULTADOS (3 documentos) ----------------- |
|                                                 |
| 📂 [PDF] Certificado de Estudios 2025            |
|    Año: 2025 | Estado: Completado               |
|    [👁️ Ver Online]      [📥 Descargar]           |
|    -------------------------------------------  |
| 📂 [PDF] Boleta de Notas - 3er Bimestre         |
|    Año: 2025 | Estado: Completado               |
|    [👁️ Ver Online]      [📥 Descargar]           |
|    -------------------------------------------  |
| 📂 [PDF] Constancia de Buena Conducta           |
|    Año: 2025 | Estado: En Trámite               |
|    [👁️ Ver (Solo admin)] [🚫 Descarga inactiva]  |
+-------------------------------------------------+
```

### Pantalla C: Visor de Documento Integrado (Móvil)
```
+-------------------------------------------------+
| ⬅️ Volver a la Lista       [📄 Certificado 2025] |
+-------------------------------------------------+
|                                                 |
|  +-------------------------------------------+  |
|  |                                           |  |
|  |        MINISTERIO DE EDUCACIÓN            |  |
|  |               GUATEMALA                   |  |
|  |                                           |  |
|  |  Por este medio se CERTIFICA que...       |  |
|  |  Alumno: Juan Pérez                       |  |
|  |  CUI: 2810452310101                       |  |
|  |  Notas: Matemáticas (95), Idioma (90)...  |  |
|  |                                           |  |
|  |               [ Sello ]                   |  |
|  |                                           |  |
|  |             [ QR Verificador ]            |  |
|  |                                           |  |
|  +-------------------------------------------+  |
|                                                 |
|    [📥 Descargar PDF]      [🖨️ Imprimir]        |
+-------------------------------------------------+
```

### Pantalla D: Panel de Administración (Desktop / Tablet)
```
+-----------------------------------------------------------------------------------------+
| 🏫 PANEL DE ADMINISTRACIÓN - Portal Escolar                            [⚙️ Admin] [🔒 Salir] |
+-----------------------------------------------------------------------------------------+
|  Módulos: [📁 Subir Documento]  [👥 Alumnos]  [📜 Logs de Auditoría]  [📊 Configuración] |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|  📥 SUBIR NUEVO DOCUMENTO AL SISTEMA                                                    |
|                                                                                         |
|  1. CUI del Estudiante:               2. Título del Documento:                          |
|     [ 2810452310101              ]       [ Certificado de Estudios 2025              ]  |
|                                                                                         |
|  3. Tipo de Documento:                4. Año Académico:                                 |
|     (o) Certificado  ( ) Boleta          [ 2025 ]                                       |
|     ( ) Constancia   ( ) Inscripción                                                    |
|                                                                                         |
|  5. Archivo PDF:                                                                        |
|     [ Seleccionar PDF...           📂 ] (Máximo 5MB)                                     |
|                                                                                         |
|  6. Estado de Firma:                                                                    |
|     [ Completado / Firmado         v ]                                                  |
|                                                                                         |
|  [                        💾 SUBIR Y REGISTRAR DOCUMENTO                             ]  |
|                                                                                         |
|  -------------------------------------------------------------------------------------  |
|  Últimas cargas realizadas:                                                             |
|  - cert_2025_2810452310101.pdf asignado a Juan Pérez (Hace 10 min)                      |
|  - boleta_notas_47891234.pdf asignado a María López (Hace 1 hora)                        |
+-----------------------------------------------------------------------------------------+
```

---

## 📅 7. Planificación y Verificación de la Fase 1
*   **Verificación con Director Escolar:** Presentar este documento de requisitos y wireframes para asegurar que responde a las necesidades reales del instituto.
*   **Aprobación Legal Básica:** Validar que el flujo de consentimientos y minimización de datos cumple con los lineamientos básicos de privacidad en entornos educativos.
*   **Transición a Fase 2:** Con los requisitos aprobados, se procederá a configurar el entorno de desarrollo local en Python y la estructura de directorios del proyecto.
