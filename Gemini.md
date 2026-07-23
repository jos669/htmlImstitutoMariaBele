# 📄 Sistema de Consulta de Documentos Escolares - Índice General

Este archivo es el centro de documentación y estrategia del sistema. Aquí se detalla la reestructuración estratégica del proyecto para unificar el Backend (Python/Flask), la Base de Datos (SQLite3), los Modelos de Configuración (JSON), y el Frontend Dinámico (HTML5/CSS3/JS).

---

## 🗺️ Índice de Archivos de Estrategia (Géminis)

Para lograr una estructura sólida, la documentación y planes del sistema se han dividido en los siguientes módulos especializados:

1.  **[Estrategia y Requisitos Legales (gemini_estrategia.md)](file:///data/data/com.termux/files/home/MariaBelenMedranoGarcia/gemini_estrategia.md):**
    *   Objetivos generales del portal.
    *   Marco legal guatemalteco (Habeas Data, Constitución Art. 24, 30 y 31, Decreto 57-2008).
    *   Estructura obligatoria del Consentimiento Informado digital.
2.  **[Arquitectura Técnica y Seguridad (gemini_arquitectura.md)](file:///data/data/com.termux/files/home/MariaBelenMedranoGarcia/gemini_arquitectura.md):**
    *   Topología física y lógica de red (Servidor local Termux/Android/PC).
    *   Políticas de almacenamiento seguro de PDFs privados (Ofuscación UUID).
    *   Criptografía y hashes seguros de contraseñas (PBKDF2-HMAC-SHA256).
    *   Motor de verificación pública mediante códigos QR.
3.  **[Diseño de Base de Datos y Modelos JSON (gemini_base_datos.md)](file:///data/data/com.termux/files/home/MariaBelenMedranoGarcia/gemini_base_datos.md):**
    *   Esquema entidad-relación de las tablas `usuarios`, `documentos` y `logs` en SQLite.
    *   Estructura sintáctica del archivo de configuración inicial `initial_data.json`.
    *   Procedimiento de población relacional automático en `populate_db.py`.
4.  **[Diseño Frontend y UX de Interfaces (gemini_frontend.md)](file:///data/data/com.termux/files/home/MariaBelenMedranoGarcia/gemini_frontend.md):**
    *   Especificación del sistema de diseño Vanilla CSS (Variables, colores y layouts responsivos).
    *   Manual de funcionamiento de la SPA (Single Page Application) estudiantil.
    *   Manejo de eventos Javascript en modales, filtros de búsqueda e inicio de sesión.
5.  **[Arquitectura del Backend y APIs (gemini_backend.md)](file:///data/data/com.termux/files/home/MariaBelenMedranoGarcia/gemini_backend.md):**
    *   Enrutador y endpoints expuestos en el servidor Flask.
    *   Decoradores y middlewares de sesión (`login_required`, `admin_required`).
    *   Manejo de entrega segura de archivos confidenciales y registro de logs de IP.
6.  **[Plan de Fases de Desarrollo y Riesgos (gemini_plan_fases.md)](file:///data/data/com.termux/files/home/MariaBelenMedranoGarcia/gemini_plan_fases.md):**
    *   Cronograma de desarrollo iterativo en 10 fases.
    *   Estimación de costes de hardware y recursos humanos.
    *   Matriz de riesgos (fugas, pérdidas, usabilidad) y sus correspondientes planes de mitigación.

---

## 🏗️ Relación e Integración de Código en la Práctica

El sistema funciona de forma integrada conectando cada uno de sus lenguajes y formatos:

```
                  ┌──────────────────────────────┐
                  │      initial_data.json       │  ◄── [Modelos JSON]
                  └──────────────┬───────────────┘
                                 │ (Carga inicial)
                                 ▼
                  ┌──────────────────────────────┐
                  │       populate_db.py         │  ◄── [Poblador Python]
                  └──────────────┬───────────────┘
                                 │ (Inicializa)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       sistema.db (SQLite)                       │  ◄── [Base de Datos SQL]
│  - Usuarios (CUI, PIN, Consentimiento)                          │
│  - Documentos (Metadata, Archivo UUID, Token QR)                │
│  - Logs (Auditoría de IP, Horas y Acciones)                     │
└────────────────────────────────┬────────────────────────────────┘
                                 ▲
                                 │ (Consultas y Modificaciones)
                                 ▼
                  ┌──────────────────────────────┐
                  │            app.py            │  ◄── [Servidor Flask Python]
                  └──────────────┬───────────────┘
                                 │ (Rutas JSON / HTML)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Interfaz del Portal                       │  ◄── [Frontend Completo]
│  - templates/index.html (Dashboard y Consulta Estudiante)       │
│  - templates/admin.html (Subida de PDFs, Gestión de Alumnos)   │
│  - templates/verificar.html (Verificador QR Público)            │
│  - static/css/style.css (Hojas de estilo premium responsivas)   │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Instrucciones de Puesta en Marcha

Para iniciar el sistema de forma local:

1.  **Poblar la base de datos:**
    Ejecute el poblador de base de datos para cargar usuarios y documentos de prueba desde el archivo JSON:
    ```bash
    python populate_db.py
    ```
2.  **Arrancar el servidor de Flask:**
    Inicie la aplicación web de Flask:
    ```bash
    python app.py
    ```
    El portal estará disponible en su navegador en `http://localhost:5000`.
3.  **Credenciales de Prueba:**
    *   **Estudiante:** CUI: `2810452310101` | PIN: `1234`
    *   **Estudiante:** CUI: `4789123450101` | PIN: `5678`
    *   **Administrador:** CUI: `admin` | PIN: `admin123`