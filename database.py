import sqlite3
import hashlib
import os
import hmac
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sistema.db")

CURRENT_YEAR = datetime.now().year
ANIOS_START = 2020
ANIOS = list(range(ANIOS_START, CURRENT_YEAR + 2))

ESTADOS = ['en_orden', 'no_entregado', 'hace_falta']

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    iterations = 100000
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${dk.hex()}"

def verify_password(password: str, stored_hash: str) -> bool:
    try:
        parts = stored_hash.split('$')
        if len(parts) != 4 or parts[0] != 'pbkdf2_sha256':
            return False
        iterations = int(parts[1])
        salt = bytes.fromhex(parts[2])
        original_hash = bytes.fromhex(parts[3])
        dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iterations)
        return hmac.compare_digest(dk, original_hash)
    except Exception:
        return False

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS usuarios (
        cui TEXT PRIMARY KEY,
        nombre_completo TEXT NOT NULL,
        rol TEXT NOT NULL,
        grado TEXT,
        seccion TEXT,
        password_hash TEXT NOT NULL,
        acepto_consentimiento INTEGER DEFAULT 0,
        fecha_consentimiento TEXT
    )
    """)

    try:
        cursor.execute("ALTER TABLE usuarios ADD COLUMN anios TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tipos_papeleria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        categoria TEXT DEFAULT 'General',
        activo INTEGER DEFAULT 1
    )
    """)

    try:
        cursor.execute("ALTER TABLE tipos_papeleria ADD COLUMN categoria TEXT DEFAULT 'General'")
    except sqlite3.OperationalError:
        pass

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS papeleria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estudiante_cui TEXT NOT NULL,
        anio INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'no_entregado',
        observaciones TEXT DEFAULT '',
        updated_at TEXT,
        updated_by TEXT,
        FOREIGN KEY (estudiante_cui) REFERENCES usuarios (cui),
        UNIQUE(estudiante_cui, anio, tipo)
    )
    """)

    try:
        cursor.execute("ALTER TABLE papeleria ADD COLUMN updated_at TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE papeleria ADD COLUMN updated_by TEXT")
    except sqlite3.OperationalError:
        pass

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        usuario_cui TEXT NOT NULL,
        accion TEXT NOT NULL,
        detalles TEXT,
        direccion_ip TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tokens_verificacion (
        cui TEXT PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        creado TEXT NOT NULL,
        FOREIGN KEY (cui) REFERENCES usuarios (cui)
    )
    """)

    conn.commit()

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_papeleria_cui ON papeleria(estudiante_cui)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_papeleria_anio ON papeleria(anio)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_papeleria_estado ON papeleria(estado)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol)
    """)
    conn.close()

def crear_usuario(cui, nombre, rol, grado, seccion, password, acepto_consentimiento, anios=''):
    p_hash = hash_password(password)
    fecha_cons = datetime.now(timezone.utc).isoformat() if acepto_consentimiento else None
    consentimiento_val = 1 if acepto_consentimiento else 0

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        INSERT INTO usuarios (cui, nombre_completo, rol, grado, seccion, anios, password_hash, acepto_consentimiento, fecha_consentimiento)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (cui, nombre, rol, grado, seccion, anios, p_hash, consentimiento_val, fecha_cons))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def obtener_usuario_por_cui(cui):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM usuarios WHERE cui = ?", (cui,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def validar_usuario(cui, password):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM usuarios WHERE cui = ?", (cui,))
    row = cursor.fetchone()
    conn.close()

    if row and verify_password(password, row['password_hash']):
        return dict(row)
    return None

def registrar_consentimiento(cui):
    fecha_cons = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE usuarios
    SET acepto_consentimiento = 1, fecha_consentimiento = ?
    WHERE cui = ?
    """, (fecha_cons, cui))
    conn.commit()
    conn.close()

def obtener_todos_usuarios():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT cui, nombre_completo, rol, grado, seccion, anios, acepto_consentimiento, fecha_consentimiento FROM usuarios ORDER BY nombre_completo ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def buscar_estudiantes(query):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT cui, nombre_completo, grado, seccion
        FROM usuarios
        WHERE rol = 'estudiante' AND (cui = ? OR nombre_completo LIKE ?)
        LIMIT 20
    """, (query, f'%{query}%'))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def obtener_tipos():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tipos_papeleria WHERE activo = 1 ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

CATEGORIAS = ['Documentos Personales', 'Académicos', 'Administrativos', 'General']

def crear_tipo(nombre, categoria='General'):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO tipos_papeleria (nombre, categoria) VALUES (?, ?)", (nombre, categoria))
        conn.commit()
        return cursor.lastrowid
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def actualizar_tipo(id, nombre, categoria=None):
    conn = get_connection()
    cursor = conn.cursor()
    if categoria is not None:
        cursor.execute("UPDATE tipos_papeleria SET nombre = ?, categoria = ? WHERE id = ?", (nombre, categoria, id))
    else:
        cursor.execute("UPDATE tipos_papeleria SET nombre = ? WHERE id = ?", (nombre, id))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0

def eliminar_tipo(tipo_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT nombre FROM tipos_papeleria WHERE id = ?", (tipo_id,))
    tipo = cursor.fetchone()
    if not tipo:
        conn.close()
        return False
    cursor.execute("SELECT COUNT(*) as count FROM papeleria WHERE tipo = ?", (tipo['nombre'],))
    affected = cursor.fetchone()['count']
    cursor.execute("DELETE FROM papeleria WHERE tipo = ?", (tipo['nombre'],))
    cursor.execute("DELETE FROM tipos_papeleria WHERE id = ?", (tipo_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return {'deleted': deleted, 'affected_records': affected}

def obtener_papeleria_estudiante(cui):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM papeleria WHERE estudiante_cui = ?", (cui,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def actualizar_papeleria(cui, anio, tipo, estado, observaciones='', updated_by=None):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    try:
        cursor.execute("""
            INSERT INTO papeleria (estudiante_cui, anio, tipo, estado, observaciones, updated_at, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(estudiante_cui, anio, tipo)
            DO UPDATE SET estado = excluded.estado, observaciones = excluded.observaciones,
                          updated_at = excluded.updated_at, updated_by = excluded.updated_by
        """, (cui, anio, tipo, estado, observaciones, now, updated_by))
        conn.commit()
        return True
    except sqlite3.Error as e:
        print(f"[DB] Error actualizando papelería ({cui}, {anio}, {tipo}): {e}")
        return False
    finally:
        conn.close()

def actualizar_papeleria_batch(cui, anios, tipo, estado, observaciones='', updated_by=None):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    ok = 0
    for anio in anios:
        try:
            cursor.execute("""
                INSERT INTO papeleria (estudiante_cui, anio, tipo, estado, observaciones, updated_at, updated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(estudiante_cui, anio, tipo)
                DO UPDATE SET estado = excluded.estado, observaciones = excluded.observaciones,
                              updated_at = excluded.updated_at, updated_by = excluded.updated_by
            """, (cui, anio, tipo, estado, observaciones, now, updated_by))
            ok += 1
        except sqlite3.Error as e:
            print(f"[DB] Error batch ({cui}, {anio}, {tipo}): {e}")
    conn.commit()
    conn.close()
    return ok

def buscar_papeleria_por_estado(estado, grado=None, seccion=None, limit=50):
    conn = get_connection()
    cursor = conn.cursor()
    params = [estado]
    sql = """
        SELECT p.*, u.nombre_completo, u.grado, u.seccion, u.anios as estudiante_anios
        FROM papeleria p
        JOIN usuarios u ON p.estudiante_cui = u.cui
        WHERE p.estado = ?
    """
    if grado:
        sql += " AND u.grado = ?"
        params.append(grado)
    if seccion:
        sql += " AND u.seccion = ?"
        params.append(seccion)
    sql += " ORDER BY u.nombre_completo ASC LIMIT ?"
    params.append(limit)
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def obtener_stats_por_grado():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as cnt FROM tipos_papeleria WHERE activo = 1")
    total_tipos = cursor.fetchone()['cnt']
    cursor.execute("""
        SELECT s.grado, s.seccion,
               COUNT(DISTINCT s.cui) as total_alumnos,
               SUM(s.en_orden) as en_orden,
               SUM(s.no_entregado) as no_entregado,
               SUM(s.hace_falta) as hace_falta,
               SUM(s.total_registros) as total_registros,
               SUM(s.requeridos) as total_requeridos
        FROM (
            SELECT u.grado, u.seccion, u.cui,
                   SUM(CASE WHEN p.estado = 'en_orden' THEN 1 ELSE 0 END) as en_orden,
                   SUM(CASE WHEN p.estado = 'no_entregado' THEN 1 ELSE 0 END) as no_entregado,
                   SUM(CASE WHEN p.estado = 'hace_falta' THEN 1 ELSE 0 END) as hace_falta,
                   COUNT(p.id) as total_registros,
                   CASE WHEN u.anios IS NULL OR u.anios = '' THEN 0
                        ELSE (LENGTH(u.anios) - LENGTH(REPLACE(u.anios, ',', '')) + 1)
                   END * ? as requeridos
            FROM usuarios u
            LEFT JOIN papeleria p ON u.cui = p.estudiante_cui
            WHERE u.rol = 'estudiante'
            GROUP BY u.cui
        ) s
        GROUP BY s.grado, s.seccion
        ORDER BY s.grado, s.seccion
    """, (total_tipos,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def obtener_estudiantes_incompletos(limit=20):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.cui, u.nombre_completo, u.grado, u.seccion, u.anios,
               COUNT(p.id) as total_docs,
               SUM(CASE WHEN p.estado = 'en_orden' THEN 1 ELSE 0 END) as completados
        FROM usuarios u
        LEFT JOIN papeleria p ON u.cui = p.estudiante_cui
        WHERE u.rol = 'estudiante'
        GROUP BY u.cui
        HAVING completados < total_docs OR total_docs = 0
        ORDER BY completados ASC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def actualizar_usuario(cui, nombre_completo=None, grado=None, seccion=None, anios=None):
    conn = get_connection()
    cursor = conn.cursor()
    campos = []
    valores = []
    if nombre_completo is not None:
        campos.append("nombre_completo = ?")
        valores.append(nombre_completo)
    if grado is not None:
        campos.append("grado = ?")
        valores.append(grado)
    if seccion is not None:
        campos.append("seccion = ?")
        valores.append(seccion)
    if anios is not None:
        campos.append("anios = ?")
        valores.append(anios)
    if not campos:
        conn.close()
        return False
    valores.append(cui)
    cursor.execute(f"UPDATE usuarios SET {', '.join(campos)} WHERE cui = ?", valores)
    conn.commit()
    ok = cursor.rowcount > 0
    conn.close()
    return ok

def eliminar_usuario(cui):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM tokens_verificacion WHERE cui = ?", (cui,))
        cursor.execute("DELETE FROM papeleria WHERE estudiante_cui = ?", (cui,))
        cursor.execute("DELETE FROM usuarios WHERE cui = ?", (cui,))
        conn.commit()
        return cursor.rowcount > 0
    except sqlite3.Error as e:
        print(f"[DB] Error eliminando usuario ({cui}): {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def registrar_log(usuario_cui, accion, detalles, ip):
    timestamp = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO logs (timestamp, usuario_cui, accion, detalles, direccion_ip)
    VALUES (?, ?, ?, ?, ?)
    """, (timestamp, usuario_cui, accion, detalles, ip))
    conn.commit()
    conn.close()

def obtener_grados_secciones():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT grado FROM usuarios
        WHERE rol = 'estudiante' AND grado IS NOT NULL AND grado != ''
        ORDER BY grado
    """)
    grados = [r['grado'] for r in cursor.fetchall()]
    cursor.execute("""
        SELECT DISTINCT seccion FROM usuarios
        WHERE rol = 'estudiante' AND seccion IS NOT NULL AND seccion != ''
        ORDER BY seccion
    """)
    secciones = [r['seccion'] for r in cursor.fetchall()]
    conn.close()
    return grados, secciones

import secrets

def obtener_token_verificacion(cui):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT token FROM tokens_verificacion WHERE cui = ?", (cui,))
    row = cursor.fetchone()
    if row:
        conn.close()
        return row['token']
    token = secrets.token_urlsafe(32)
    ahora = datetime.now(timezone.utc).isoformat()
    try:
        cursor.execute("INSERT INTO tokens_verificacion (cui, token, creado) VALUES (?, ?, ?)", (cui, token, ahora))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.rollback()
        conn.close()
        return None
    conn.close()
    return token

def verificar_por_token(token):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""SELECT u.cui, u.nombre_completo, u.grado, u.seccion, u.anios, v.creado
        FROM tokens_verificacion v JOIN usuarios u ON v.cui = u.cui
        WHERE v.token = ?""", (token,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    data = dict(row)
    cursor.execute("""
        SELECT p.tipo, p.anio, p.estado, p.observaciones, p.updated_at,
               tp.categoria
        FROM papeleria p
        LEFT JOIN tipos_papeleria tp ON p.tipo = tp.nombre
        WHERE p.estudiante_cui = ?
        ORDER BY p.anio DESC, tp.categoria ASC, p.tipo ASC
    """, (data['cui'],))
    data['documentos'] = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return data
