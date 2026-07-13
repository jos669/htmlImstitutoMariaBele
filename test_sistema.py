import unittest
import json
from app import app
from database import (
    get_connection,
    crear_usuario,
    validar_usuario,
    hash_password,
    verify_password,
    crear_tipo,
    actualizar_papeleria,
    actualizar_papeleria_batch,
    obtener_papeleria_estudiante,
    obtener_tipos,
    buscar_estudiantes,
    obtener_grados_secciones,
    init_db,
    ANIOS
)

class TestSistemaPapeleria(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = app.test_client()
        cls.client.testing = True
        init_db()

    def _get_csrf(self):
        with self.client.session_transaction() as sess:
            return sess.get('csrf_token', '')

    def _login(self, cui, password=None, consentimiento=None):
        # Establish session first
        self.client.get('/')
        data = {'cui': cui}
        if password:
            data['password'] = password
        if consentimiento is not None:
            data['consentimiento'] = consentimiento
        return self.client.post('/api/login',
            data=json.dumps(data),
            content_type='application/json',
            headers={'X-CSRF-Token': self._get_csrf()}
        )

    def test_01_database_connection(self):
        conn = get_connection()
        self.assertIsNotNone(conn)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row['name'] for row in cursor.fetchall()]
        self.assertIn('usuarios', tables)
        self.assertIn('papeleria', tables)
        self.assertIn('tipos_papeleria', tables)
        self.assertIn('logs', tables)
        conn.close()

    def test_02_password_hashing(self):
        password = "test_password_2026"
        h = hash_password(password)
        self.assertTrue(h.startswith("pbkdf2_sha256$"))
        self.assertTrue(verify_password(password, h))
        self.assertFalse(verify_password("wrong_password", h))

    def test_03_create_and_validate_user(self):
        cui_test = "9999999999101"
        nombre = "Estudiante Prueba"

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM usuarios WHERE cui = ?", (cui_test,))
        conn.commit()
        conn.close()

        res = crear_usuario(cui_test, nombre, "estudiante", "5to Primaria", "A", "pin123", False)
        self.assertTrue(res)

        user = validar_usuario(cui_test, "pin123")
        self.assertIsNotNone(user)
        self.assertEqual(user['nombre_completo'], nombre)

        user_fail = validar_usuario(cui_test, "pin_incorrecto")
        self.assertIsNone(user_fail)

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM usuarios WHERE cui = ?", (cui_test,))
        conn.commit()
        conn.close()

    def test_04_tipos_papeleria(self):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM tipos_papeleria WHERE nombre = 'Test Certificado'")
        conn.commit()
        conn.close()

        tipo_id = crear_tipo("Test Certificado")
        self.assertIsNotNone(tipo_id)
        self.assertIsNone(crear_tipo("Test Certificado"))

        tipos = obtener_tipos()
        nombres = [t['nombre'] for t in tipos]
        self.assertIn("Test Certificado", nombres)

    def test_05_papeleria_crud(self):
        cui_test = "9999999999102"
        crear_usuario(cui_test, "Test Papeleria", "estudiante", "Grado", "A", "pass", False)
        crear_tipo("Test Tipo 1")
        crear_tipo("Test Tipo 2")

        res = actualizar_papeleria(cui_test, 2020, "Test Tipo 1", "en_orden")
        self.assertTrue(res)

        res = actualizar_papeleria(cui_test, 2020, "Test Tipo 2", "no_entregado")
        self.assertTrue(res)

        res = actualizar_papeleria(cui_test, 2021, "Test Tipo 1", "hace_falta")
        self.assertTrue(res)

        registros = obtener_papeleria_estudiante(cui_test)
        self.assertEqual(len(registros), 3)

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM papeleria WHERE estudiante_cui = ?", (cui_test,))
        cursor.execute("DELETE FROM tipos_papeleria WHERE nombre LIKE 'Test Tipo%'")
        cursor.execute("DELETE FROM usuarios WHERE cui = ?", (cui_test,))
        conn.commit()
        conn.close()

    def test_06_api_public_routes(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Instituto', response.data)

        response = self.client.get('/consulta')
        self.assertEqual(response.status_code, 404)

        response = self.client.get('/verificar/test')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Verificaci', response.data)

    def test_07_api_login(self):
        self.client.get('/')
        response = self.client.post('/api/login',
            data=json.dumps({'cui': 'cui_inexistente'}),
            content_type='application/json',
            headers={'X-CSRF-Token': self._get_csrf()}
        )
        self.assertEqual(response.status_code, 401)

        response = self._login('2810452310101', consentimiento=True)
        self.assertEqual(response.status_code, 200)

        response = self.client.get('/api/papeleria')
        self.assertEqual(response.status_code, 200)

    def test_08_api_admin_access(self):
        self.client.get('/')
        self.client.post('/api/logout', headers={'X-CSRF-Token': self._get_csrf()})
        response = self.client.get('/api/admin/tipos')
        self.assertEqual(response.status_code, 403)

        response = self.client.post('/api/admin/papeleria',
            data=json.dumps({'cui': '2810452310101', 'anio': 2020, 'tipo': 'Test', 'estado': 'en_orden'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 403)

    def test_09_anios_range(self):
        from datetime import datetime
        anio_actual = datetime.now().year
        self.assertIn(2020, ANIOS)
        self.assertIn(anio_actual, ANIOS)
        self.assertEqual(ANIOS[0], 2020)
        self.assertEqual(ANIOS[-1], anio_actual + 1)

    def test_10_batch_update(self):
        cui = "9999999999103"
        crear_usuario(cui, "Batch Test", "estudiante", "Grado", "A", "pass", False)
        crear_tipo("Batch Tipo")
        ok = actualizar_papeleria_batch(cui, [2023, 2024, 2025], "Batch Tipo", "en_orden")
        self.assertEqual(ok, 3)
        registros = obtener_papeleria_estudiante(cui)
        self.assertEqual(len(registros), 3)
        for r in registros:
            self.assertEqual(r['estado'], 'en_orden')
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM papeleria WHERE estudiante_cui = ?", (cui,))
        cursor.execute("DELETE FROM tipos_papeleria WHERE nombre = 'Batch Tipo'")
        cursor.execute("DELETE FROM usuarios WHERE cui = ?", (cui,))
        conn.commit()
        conn.close()

    def test_11_buscar_estudiantes(self):
        cui = "9999999999104"
        crear_usuario(cui, "Buscar Test", "estudiante", "Grado", "B", "pass", False)
        resultados = buscar_estudiantes("Buscar")
        self.assertTrue(len(resultados) >= 1)
        resultados = buscar_estudiantes(cui)
        self.assertTrue(len(resultados) >= 1)
        resultados = buscar_estudiantes("NOEXISTE12345")
        self.assertEqual(len(resultados), 0)
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM usuarios WHERE cui = ?", (cui,))
        conn.commit()
        conn.close()

    def test_12_grados_secciones(self):
        cui = "9999999999105"
        crear_usuario(cui, "Grados Test", "estudiante", "5to Primaria", "C", "pass", False)
        grados, secciones = obtener_grados_secciones()
        self.assertIn("5to Primaria", grados)
        self.assertIn("C", secciones)
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM usuarios WHERE cui = ?", (cui,))
        conn.commit()
        conn.close()

    def test_13_api_grados_secciones(self):
        res = self._login("admin", password="admin123")
        self.assertEqual(res.status_code, 200)
        res = self.client.get('/api/admin/grados-secciones')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn('grados', data)
        self.assertIn('secciones', data)

    def test_14_api_csv_export(self):
        res = self._login("admin", password="admin123")
        self.assertEqual(res.status_code, 200)
        res = self.client.get('/api/admin/papeleria/export')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b'CUI,Nombre,Grado', res.data)

    def test_15_api_invalid_year_filter(self):
        res = self._login("admin", password="admin123")
        self.assertEqual(res.status_code, 200)
        res = self.client.get('/api/admin/papeleria/export?anio=INVALIDO')
        self.assertEqual(res.status_code, 200)

if __name__ == '__main__':
    unittest.main()
