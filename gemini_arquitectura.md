# 🏗️ Arquitectura Técnica y Seguridad - Sistema Escolar

Este documento describe la arquitectura de software, la topología de red, el flujo de datos y las políticas de seguridad implementadas en el sistema.

---

## 🛠️ 1. Stack Tecnológico e Infraestructura
El diseño está pensado para operar en entornos locales de bajo coste o servidores portables en Termux (Android).

```
[Usuario (Móvil/PC)] 
       │
       ▼ (HTTP/HTTPS via red local o Internet)
[Servidor Flask (Puerto 5000)]
       │
       ├─► [Seguridad y Auth] ──► Control de Sesión (Garantiza acceso por CUI)
       │
       ├─► [Base de Datos] ──► sistema.db (SQLite3)
       │
       ├─► [Almacenamiento] ──► Carpeta Privada /app_docs (Archivos PDF UUID)
       │
       └─► [Configuración] ──► initial_data.json (Cargas iniciales/JSON config)
```

### Componentes de Software:
*   **Backend:** Python 3 + Flask (Microframework de alta portabilidad).
*   **Base de Datos Relacional:** SQLite3 (`sistema.db`), que no requiere procesos demonio independientes y se autogestiona en un archivo único de disco.
*   **Base de Datos de Configuración:** JSON (`initial_data.json`), para el desacoplamiento de metadatos y configuraciones de inicialización.
*   **Frontend:** HTML5, Vanilla JavaScript (sin frameworks pesados), y CSS3 Clásico (`style.css` con variables CSS adaptadas).

---

## 🔐 2. Estrategias de Seguridad de la Información

### A. Almacenamiento Seguro de PDFs
Los certificados y notas son documentos altamente confidenciales de menores.
1.  **Nombre Físico Ofuscado (UUID):** Al subir un documento (ej. "Certificado 2025" de Juan Pérez), el backend renombra el archivo físico a un identificador aleatorio de 128 bits (ej. `d186c2e39ad8415bb619965a3f2b604e.pdf`). Esto previene ataques de enumeración de recursos y adivinación de nombres.
2.  **Ubicación Privada:** Los archivos se guardan fuera del directorio público `/static/` del servidor. Se localizan en `/app_docs/`.
3.  **Entrega Controlada:** El navegador no puede acceder directamente a los archivos por URL estática. El acceso se realiza a través de la ruta `/api/documento/<id>`, la cual comprueba que:
    *   Exista una sesión activa en Flask.
    *   El rol sea `admin` o el CUI del estudiante asociado coincida estrictamente con el CUI almacenado en la cookie de sesión cifrada del usuario.

### B. Criptografía de Contraseñas
*   Las contraseñas de los usuarios no se guardan en texto plano.
*   Se utiliza un algoritmo de derivación de claves basado en contraseña: **PBKDF2-HMAC-SHA256** con sal aleatoria única de 16 bytes generada por el sistema operativo (`os.urandom`) y 100,000 iteraciones de hash.
*   Se implementa el principio de comparación a tiempo constante (`hmac.compare_digest`) para prevenir ataques de canal lateral basados en tiempos de respuesta.

### C. Caducidad y Manejo de Sesiones
*   Las cookies de sesión de Flask se firman criptográficamente usando `app.secret_key`.
*   Se define un ciclo de vida corto de sesión de **15 minutos de inactividad** (`PERMANENT_SESSION_LIFETIME = timedelta(minutes=15)`).

---

## 🛡️ 3. Motor de Verificación Pública QR
El sistema implementa un mecanismo seguro para comprobar la legitimidad de documentos impresos por parte de terceros (universidades, empleadores, etc.).

```
[Certificado Impreso con QR] ──► Escaneo ──► Acceso a /verificar/<token>
                                                      │
                                                      ▼
[Front Verificar] ◄── [JSON con Metadatos del Doc] ◄── [API verificar_api]
```

1.  **Token Criptográfico:** Cada documento tiene asociado un campo `token_verificacion` único generado por UUID4 al momento de su creación.
2.  **Ruta Pública Restringida:** El endpoint `/api/verificar_api/<token>` es de acceso público (no requiere sesión). Sin embargo, **solo expone los metadatos públicos** del documento (Título, Tipo, Año, Nombre del Alumno y Grado) para constatar su veracidad. **No da acceso a la descarga del archivo PDF** original para salvaguardar la privacidad.
3.  **Auditoría de Escaneos:** Cada consulta pública al QR queda grabada en la tabla de logs bajo el usuario ficticio `publico_qr` y la IP del verificador.
