# AGENTS.md — Control de Papelería Escolar

## Quick Start
```bash
pip install -r requirements.txt   # flask, openpyxl, pytest (unused — tests use unittest)
python populate_db.py              # resets sistema.db from initial_data.json — must run before tests
python test_sistema.py             # 15 tests, unittest runner
python app.py                      # server on 0.0.0.0:5000
```

## Environment
- `FLASK_SECRET_KEY` — if unset, auto-generated per start (invalidates sessions)
- `FLASK_DEBUG=1` — enables debug mode

## Database
`database.py` → `sistema.db` (project-relative, auto-created on first import with `init_db()`)

6 tables: `usuarios`, `tipos_papeleria`, `papeleria`, `logs`, `tokens_verificacion`, `expedientes_fisicos`, `expediente_movimientos`

Status values: `en_orden`, `no_entregado`, `hace_falta`. Years: `2020..2026`. Categories: `Documentos Personales`, `Académicos`, `Administrativos`, `General`.

Expediente físico estados: `en_orden`, `extraviado`, `deteriorado`, `incompleto`. Tablas creadas por `init_tablas_expediente()` en `expediente.py`.

Status values: `en_orden`, `no_entregado`, `hace_falta`. Years: `2020..2026`. Categories: `Documentos Personales`, `Académicos`, `Administrativos`, `General`.

Password hash: PBKDF2-HMAC-SHA256, 16B salt, 100k iterations, stored as `pbkdf2_sha256$iter$salt_hex$hash_hex`.

## Test Credentials (after populate_db.py)
- Student: CUI `2810452310101` / PIN `1234`
- Student: CUI `4789123450101` / PIN `5678`
- Admin: CUI `admin` / PIN `admin123`

## Architecture Notes
- Flask SPA: backend serves JSON via `/api/*`, frontend is vanilla JS in `templates/index.html` and `templates/admin.html`
- Admin panel: `templates/admin.html` (tabs: gestión, tipos, alumnos, alertas, logs)
- No auth libs — custom `login_required` / `admin_required` decorators + CSRF on all mutation endpoints
- Rate limiting (login): 5 attempts per 15 min per IP (in-memory dict, resets on restart)
- Session timeout: 15 min (Flask `PERMANENT_SESSION_LIFETIME`)
- Audit logging: all sensitive operations logged to `logs` table
- `openpyxl` is optional — checked via `try/except` at import time, fallback returns error
- `importador.py` parses xlsx/csv/txt/docx for bulk student import (no dedicated tests)
- `verificar/<token>` is public (no auth) — renders `templates/verificar.html`

## Frontend Conventions
- All UI text in Spanish (Guatemala)
- Google Fonts Outfit, emojis for iconography
- Dark mode via `prefers-color-scheme` + CSS variables + localStorage override
- Mobile-first responsive, no CSS frameworks
- CUI = 13 digit Guatemala standard ID

## Testing Gotchas
- **`populate_db.py` must be run first** — tests reference seeded data (admin user, student CUI `2810452310101`)
- Tests clean up after themselves (DELETE test users/papeleria/tipos)
- `importador.py` has zero test coverage
- Only `test_sistema.py` — no pytest config, despite `pytest` in requirements.txt
