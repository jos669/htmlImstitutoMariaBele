# 📄 Estrategia y Requisitos Legales - Sistema Escolar (Guatemala)

Este documento detalla la estrategia general, objetivos y la base legal que fundamenta el diseño y desarrollo del **Sistema de Consulta de Documentos Escolares**.

---

## 🎯 1. Objetivos Estratégicos
El objetivo de la plataforma es permitir a estudiantes y padres de familia del instituto consultar, visualizar y descargar papelería académica (boletas de notas, certificados de estudios, constancias de inscripción) de forma remota y segura.

*   **Accesibilidad y Eficiencia:** Reducir un 80% las visitas presenciales y colas administrativas en el centro educativo.
*   **Portabilidad Extrema:** Funcionamiento autónomo en un servidor de bajo costo, incluyendo dispositivos móviles con Android (Termux) o microcomputadoras (Raspberry Pi), para entornos con infraestructura limitada.
*   **Privacidad por Diseño:** Garantizar la confidencialidad absoluta de los datos de menores de edad.

---

## 🇬🇹 2. Cumplimiento Legal (Habeas Data en Guatemala)
A falta de una ley integral de protección de datos personales en Guatemala, el sistema se alinea rigurosamente con los preceptos constitucionales y leyes vigentes:

### A. Constitución Política de la República de Guatemala
*   **Artículo 24 (Inviolabilidad de correspondencia, documentos y libros):** Los documentos académicos se resguardan bajo control del propio estudiante o su tutor legal, impidiendo el acceso a terceros no autorizados.
*   **Artículo 30 (Publicidad de los actos administrativos):** Se garantiza el derecho de los ciudadanos a consultar expedientes que les conciernen directamente.
*   **Artículo 31 (Acceso a archivos y registros estatales):** Habilita la consulta personal y familiar de registros administrativos públicos, con derecho a rectificación.

### B. Ley de Acceso a la Información Pública (Decreto 57-2008)
*   Define la información de menores de edad y las calificaciones académicas como **datos personales sensibles**. Su distribución pública sin consentimiento expreso está prohibida.
*   El portal mitiga esto mediante la implementación obligatoria de un **Consentimiento Informado** que el estudiante (o tutor) debe aceptar formalmente antes de ver los datos en pantalla.

---

## 🔐 3. Especificaciones del Consentimiento Digital
1.  **Bloqueo de Primer Ingreso:** Ningún usuario con rol `estudiante` puede visualizar información o metadatos si no ha marcado explícitamente la casilla *"Acepto los términos de privacidad y procesamiento de datos"*.
2.  **Registro Histórico (Auditoría):** La aceptación del consentimiento se almacena de forma inalterable en la base de datos indicando:
    *   CUI del firmante.
    *   Estado de aceptación (`True`/`1`).
    *   Marca de tiempo precisa (ISO 8601 UTC).
    *   Dirección IP del dispositivo desde donde se otorgó.

---

## 📊 4. Requisitos Clave del Sistema (RF / RNF)

### Requisitos Funcionales (RF)
*   **RF-01 (Autenticación CUI):** Acceso seguro para estudiantes mediante su CUI de 13 dígitos y PIN.
*   **RF-02 (Filtros de Búsqueda):** Filtrado dinámico por año académico (2024, 2025, 2026) e identificadores (boleta, constancia, certificado, inscripción).
*   **RF-03 (Visor Seguro):** Visualización en línea de archivos PDF mediante iFrames securizados que validan la sesión de Flask.
*   **RF-04 (Autenticidad QR):** Código QR dinámico que apunta a una dirección web de verificación de firmas públicas.
*   **RF-05 (Auditoría Admin):** Panel de administración para cargar documentos, registrar logs de IP, y registrar alumnos.

### Requisitos No Funcionales (RNF)
*   **RNF-01 (Mobile-First):** Interfaz fluida y optimizada para celulares.
*   **RNF-02 (Cero Dependencias Pesadas):** Stack portable en Python (Flask), SQLite3, y JSON sin dependencias en la nube.
*   **RNF-03 (Seguridad de PDF):** Acceso denegado a rutas físicas de archivos. Los PDFs se sirven mediante una API que evalúa la cookie de sesión del usuario.
