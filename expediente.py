import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sistema.db")

ESTADOS_FISICOS = ['Localizado', 'Extraviado', 'En revisión']
TIPOS_MOVIMIENTO = ['creacion', 'retiro', 'devolucion', 'verificacion', 'extraviado', 'localizado', 'actualizacion']


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_tablas_expediente():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS expedientes_fisicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            estudiante_cui TEXT NOT NULL UNIQUE,
            codigo_expediente TEXT NOT NULL UNIQUE,
            caja TEXT DEFAULT '',
            ubicacion TEXT DEFAULT '',
            posicion_caja TEXT DEFAULT '',
            estado TEXT DEFAULT 'Localizado',
            ultima_verificacion TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (estudiante_cui) REFERENCES usuarios(cui) ON DELETE CASCADE
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS movimientos_expediente (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expediente_id INTEGER NOT NULL,
            usuario_cui TEXT NOT NULL,
            tipo TEXT NOT NULL,
            fecha TEXT NOT NULL,
            notas TEXT DEFAULT '',
            FOREIGN KEY (expediente_id) REFERENCES expedientes_fisicos(id) ON DELETE CASCADE,
            FOREIGN KEY (usuario_cui) REFERENCES usuarios(cui)
        )
    """)
    conn.commit()
    conn.close()


def obtener_proximo_codigo():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT COALESCE(MAX(CAST(SUBSTR(codigo_expediente, 5) AS INTEGER)), 0) + 1 as prox
        FROM expedientes_fisicos
    """)
    prox = cursor.fetchone()['prox']
    conn.close()
    return f"EXP-{prox:04d}"


def crear_expediente(cui, caja='', ubicacion='', posicion_caja='', usuario_cui=None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM expedientes_fisicos WHERE estudiante_cui = ?", (cui,))
    if cursor.fetchone():
        conn.close()
        return None
    codigo = obtener_proximo_codigo()
    now = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO expedientes_fisicos
            (estudiante_cui, codigo_expediente, caja, ubicacion, posicion_caja,
             estado, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'Localizado', ?, ?)
    """, (cui, codigo, caja, ubicacion, posicion_caja, now, now))
    exp_id = cursor.lastrowid
    conn.commit()
    if usuario_cui:
        registrar_movimiento(cursor, exp_id, 'creacion', usuario_cui,
                             f'Expediente creado: {codigo}, Caja: {caja or "—"}')
        conn.commit()
    conn.close()
    return {'id': exp_id, 'codigo_expediente': codigo}


def obtener_expediente(cui):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM expedientes_fisicos WHERE estudiante_cui = ?", (cui,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def actualizar_expediente(cui, caja=None, ubicacion=None, posicion_caja=None, estado=None, usuario_cui=None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, * FROM expedientes_fisicos WHERE estudiante_cui = ?", (cui,))
    exp = cursor.fetchone()
    if not exp:
        conn.close()
        return None
    updates = []
    params = []
    for campo, valor in [('caja', caja), ('ubicacion', ubicacion),
                         ('posicion_caja', posicion_caja), ('estado', estado)]:
        if valor is not None:
            updates.append(f"{campo} = ?")
            params.append(valor)
    if not updates:
        conn.close()
        return dict(exp)
    now = datetime.now().isoformat()
    updates.append("updated_at = ?")
    params.append(now)
    params.append(cui)
    cursor.execute(f"UPDATE expedientes_fisicos SET {', '.join(updates)} WHERE estudiante_cui = ?", params)
    conn.commit()
    if usuario_cui:
        notas = f"Actualizado: {', '.join(u.split(' =')[0] for u in updates if u != 'updated_at = ?')}"
        registrar_movimiento(cursor, exp['id'], 'actualizacion', usuario_cui, notas)
        conn.commit()
    cursor.execute("SELECT * FROM expedientes_fisicos WHERE estudiante_cui = ?", (cui,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)


def cambiar_estado_expediente(cui, estado, usuario_cui, notas=''):
    if estado not in ESTADOS_FISICOS:
        return None
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, estado FROM expedientes_fisicos WHERE estudiante_cui = ?", (cui,))
    exp = cursor.fetchone()
    if not exp:
        conn.close()
        return None
    now = datetime.now().isoformat()
    cursor.execute("UPDATE expedientes_fisicos SET estado = ?, updated_at = ? WHERE estudiante_cui = ?",
                   (estado, now, cui))
    conn.commit()
    tipo_mov = estado.lower().replace(' ', '_') if estado in ('Extraviado',) else 'retiro'
    if estado == 'Localizado':
        tipo_mov = 'localizado'
    registrar_movimiento(cursor, exp['id'], tipo_mov, usuario_cui, notas or f'Estado cambiado a: {estado}')
    conn.commit()
    cursor.execute("SELECT * FROM expedientes_fisicos WHERE estudiante_cui = ?", (cui,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)


def registrar_verificacion(cui, usuario_cui):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, codigo_expediente FROM expedientes_fisicos WHERE estudiante_cui = ?", (cui,))
    exp = cursor.fetchone()
    if not exp:
        conn.close()
        return None
    now = datetime.now().isoformat()
    cursor.execute("UPDATE expedientes_fisicos SET ultima_verificacion = ?, updated_at = ? WHERE estudiante_cui = ?",
                   (now, now, cui))
    conn.commit()
    registrar_movimiento(cursor, exp['id'], 'verificacion', usuario_cui, 'Verificación física realizada')
    conn.commit()
    cursor.execute("SELECT * FROM expedientes_fisicos WHERE estudiante_cui = ?", (cui,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)


def registrar_movimiento(cursor, expediente_id, tipo, usuario_cui, notas=''):
    if tipo not in TIPOS_MOVIMIENTO:
        tipo = 'actualizacion'
    now = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO movimientos_expediente (expediente_id, usuario_cui, tipo, fecha, notas)
        VALUES (?, ?, ?, ?, ?)
    """, (expediente_id, usuario_cui, tipo, now, notas))


def obtener_movimientos(cui):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT m.*, u.nombre_completo as usuario_nombre
        FROM movimientos_expediente m
        JOIN expedientes_fisicos e ON m.expediente_id = e.id
        LEFT JOIN usuarios u ON m.usuario_cui = u.cui
        WHERE e.estudiante_cui = ?
        ORDER BY m.fecha DESC
        LIMIT 100
    """, (cui,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def obtener_extraviados():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.*, u.nombre_completo, u.grado, u.seccion
        FROM expedientes_fisicos e
        JOIN usuarios u ON e.estudiante_cui = u.cui
        WHERE e.estado IN ('Extraviado', 'En revisión')
        ORDER BY e.updated_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def obtener_expedientes_por_grado():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.grado, u.seccion,
               COUNT(e.id) as total_expedientes,
               SUM(CASE WHEN e.estado = 'Localizado' THEN 1 ELSE 0 END) as localizados,
               SUM(CASE WHEN e.estado = 'Extraviado' THEN 1 ELSE 0 END) as extraviados,
               SUM(CASE WHEN e.estado = 'En revisión' THEN 1 ELSE 0 END) as en_revision
        FROM usuarios u
        LEFT JOIN expedientes_fisicos e ON u.cui = e.estudiante_cui
        WHERE u.rol = 'estudiante'
        GROUP BY u.grado, u.seccion
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
