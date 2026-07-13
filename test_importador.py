import unittest
import csv
import io
from importador import parsear_archivo, normalizar_registros


class TestImportador(unittest.TestCase):

    def test_csv_basico(self):
        content = "CUI,Nombre,Grado,Seccion\n2810452310101,Juan Perez,1ro Basico,A\n"
        datos = parsear_archivo(content.encode(), "test.csv")
        resultado = normalizar_registros(datos)
        self.assertEqual(len(resultado), 1)
        self.assertEqual(resultado[0]['cui'], '2810452310101')
        self.assertEqual(resultado[0]['nombre_completo'], 'Juan Perez')

    def test_csv_con_anios(self):
        content = "CUI,Nombre,Grado,Seccion,Anios\n2810452310101,Juan Perez,1ro Basico,A,2024"
        datos = parsear_archivo(content.encode(), "test.csv")
        resultado = normalizar_registros(datos)
        self.assertEqual(len(resultado), 1)
        self.assertEqual(resultado[0]['cui'], '2810452310101')

    def test_encabezados_variados(self):
        content = "CODIGO,ALUMNO,CURSO,SECCION\n2810452310101,Juan Perez,1ro Basico,A\n"
        datos = parsear_archivo(content.encode(), "test.csv")
        resultado = normalizar_registros(datos)
        self.assertEqual(len(resultado), 1)
        self.assertEqual(resultado[0]['cui'], '2810452310101')

    def test_registros_vacios_ignorados(self):
        content = "CUI,Nombre,Grado,Seccion\n\n2810452310101,Juan Perez,1ro Basico,A\n\n"
        datos = parsear_archivo(content.encode(), "test.csv")
        resultado = normalizar_registros(datos)
        self.assertEqual(len(resultado), 1)

    def test_csv_con_bom(self):
        content = "\ufeffCUI,Nombre,Grado,Seccion\n2810452310101,Juan Perez,1ro Basico,A\n"
        datos = parsear_archivo(content.encode("utf-8-sig"), "test.csv")
        resultado = normalizar_registros(datos)
        self.assertEqual(len(resultado), 1)
        self.assertEqual(resultado[0]['cui'], '2810452310101')

    def test_txt_tab(self):
        content = "CUI\tNombre\tGrado\tSeccion\n2810452310101\tJuan Perez\t1ro Basico\tA\n"
        datos = parsear_archivo(content.encode(), "test.txt")
        resultado = normalizar_registros(datos)
        self.assertEqual(len(resultado), 1)
        self.assertEqual(resultado[0]['cui'], '2810452310101')

    def test_normalizar_grado_basicos(self):
        content = "CUI,Nombre,Grado,Seccion\n2810452310101,Juan Perez,Basicos,A\n"
        datos = parsear_archivo(content.encode(), "test.csv")
        resultado = normalizar_registros(datos)
        self.assertIsNotNone(resultado[0]['grado'])
        self.assertNotEqual(resultado[0]['grado'], '')

    def test_seccion_encontrada(self):
        content = "CUI,Nombre,Grado,Seccion\n2810452310101,Juan Perez,1ro Basico,B\n"
        datos = parsear_archivo(content.encode(), "test.csv")
        resultado = normalizar_registros(datos)
        self.assertEqual(len(resultado), 1)
        self.assertIsNotNone(resultado[0]['seccion'])

    def test_multiples_estudiantes(self):
        content = "CUI,Nombre,Grado,Seccion\n2810452310101,Juan Perez,1ro Basico,A\n4789123450101,Maria Lopez,2do Basico,B\n"
        datos = parsear_archivo(content.encode(), "test.csv")
        resultado = normalizar_registros(datos)
        self.assertEqual(len(resultado), 2)

    def test_carrera_detectada(self):
        content = "CUI,Nombre,Carrera,Seccion\n2810452310101,Juan Perez,Bachillerato,A\n"
        datos = parsear_archivo(content.encode(), "test.csv")
        resultado = normalizar_registros(datos)
        self.assertEqual(len(resultado), 1)
        self.assertEqual(resultado[0]['cui'], '2810452310101')

    def test_grado_con_carrera(self):
        content = "CUI,Nombre,Grado,Seccion\n2810452310101,Juan Perez,4to Bachillerato,A\n"
        datos = parsear_archivo(content.encode(), "test.csv")
        resultado = normalizar_registros(datos)
        self.assertEqual(len(resultado), 1)
        self.assertIn('Bachillerato', resultado[0]['grado'])


if __name__ == '__main__':
    unittest.main()
