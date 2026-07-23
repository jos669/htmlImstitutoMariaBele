# 📅 Plan Estratégico de Desarrollo (10 Fases) y Gestión de Riesgos

Este documento establece el cronograma de ejecución del proyecto dividido en 10 fases iterativas, recursos estimados y matriz de mitigación de riesgos.

---

## 🗺️ 1. Cronograma de Desarrollo por Fases

```
[Fase 1: Req] ──► [Fase 2: Setup] ──► [Fase 3: DB] ──► [Fase 4: Backend] ──► [Fase 5: Front]
                                                                                  │
[Fase 10: Mant] ◄── [Fase 9: Despliegue] ◄── [Fase 8: QA] ◄── [Fase 7: Seguridad] ◄── [Fase 6: Visor]
```

### Detalle de Fases:
1.  **Fase 1: Investigación y Requisitos (Duración: 5 días)**
    *   *Objetivos:* Recopilar requisitos del instituto y determinar la base jurídica de Habeas Data en Guatemala.
    *   *Entregables:* `FASE_1_REQUISITOS.md`.
2.  **Fase 2: Configuración del Entorno local / Termux (Duración: 3 días)**
    *   *Objetivos:* Instalar el stack base (`python`, `sqlite3`) en computadoras locales o terminales de Android con Termux.
    *   *Entregables:* Servidor de prueba respondiendo "Hello World".
3.  **Fase 3: Diseño de Base de Datos y Formatos (Duración: 4 días)**
    *   *Objetivos:* Construir schemas de base de datos relacional y definir formato JSON de datos iniciales.
    *   *Entregables:* `database.py`, `initial_data.json`.
4.  **Fase 4: Backend Core y Lógica de Autenticación (Duración: 7 días)**
    *   *Objetivos:* Implementar el servidor Flask con decoradores de sesión, algoritmos criptográficos para contraseñas, y APIs básicas.
    *   *Entregables:* `app.py` inicial.
5.  **Fase 5: Frontend e Interfaces Responsivas (Duración: 6 días)**
    *   *Objetivos:* Diseñar layouts adaptativos con Vanilla CSS y Vanilla JS para controlar búsquedas y sesiones sin recarga.
    *   *Entregables:* `index.html` e `index.css`.
6.  **Fase 6: Visor de PDF e Integración QR (Duración: 5 días)**
    *   *Objetivos:* Integrar iframe seguro de visualización de PDFs y lógica de redireccionamiento QR.
    *   *Entregables:* `verificar.html` e integración de QR en el visor modal.
7.  **Fase 7: Reforzamiento de Seguridad y Logs (Duración: 6 días)**
    *   *Objetivos:* Añadir encriptación, ofuscación UUID de archivos, logs inmutables, y manejo estricto de accesos no autorizados.
    *   *Entregables:* Rutas protegidas y visor de logs para la administración.
8.  **Fase 8: Pruebas Generales e Integración (Duración: 5 días)**
    *   *Objetivos:* Testear flujos completos (estudiante de primer ingreso, subida de documentos, logs de IP, y escaneo simulado de QR).
    *   *Entregables:* Reporte de bugs y validación de código limpio.
9.  **Fase 9: Despliegue en Red Local (Duración: 4 días)**
    *   *Objetivos:* Configurar el host local para permitir accesos desde celulares conectados a la red Wi-Fi del establecimiento.
    *   *Entregables:* Scripts de arranque y respaldo automático del archivo `sistema.db`.
10. **Fase 10: Capacitación y Entrega (Duración: 3 días)**
    *   *Objetivos:* Instruir al personal administrativo en la carga de archivos e interpretación de logs de auditoría.
    *   *Entregables:* Documentos de ayuda y manual de administración.

---

## 📊 2. Recursos Estimados
*   **Hardware:** 1 computadora de escritorio de gama media (servirá como host local) o 1 dispositivo móvil Android para ejecución local.
*   **Software:** Licencias Open Source sin coste ($0). Python, SQLite3, Flask, y navegadores Web.
*   **Personal:** 1 Desarrollador Full-Stack para implementación y 1 Administrador para operaciones escolares.

---

## ⚠️ 3. Matriz de Riesgos y Mitigación

| Riesgo Detectado | Probabilidad | Impacto | Estrategia de Mitigación |
| :--- | :---: | :---: | :--- |
| **Exposición de Documentos de Menores:** Fuga de PDFs confidenciales. | Baja | Crítico | **Mitigación:** Ofuscación de nombres físicos mediante UUID, almacenamiento fuera del directorio estático público y middleware de autenticación estricta de propiedad CUI. |
| **Pérdida de Información por Fallo de Servidor:** Corrupción del host local. | Media | Alto | **Mitigación:** Automatización de respaldos diarios del archivo SQLite `sistema.db` en un medio externo (Memoria SD / USB externa). |
| **Inexperiencia del Personal:** Dificultad para operar la interfaz administrativa. | Alta | Medio | **Mitigación:** Interfaz de administración simplificada con alertas visuales claras. Manuales sencillos y sesiones de entrenamiento. |
| **Falta de Validez de Firmas:** Terceros rechazan la validez de los documentos impresos. | Media | Alto | **Mitigación:** Motor de verificación QR pública que demuestra en tiempo real la existencia física del certificado en los servidores del instituto. |
