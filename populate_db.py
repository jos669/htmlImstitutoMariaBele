import os
import json
from database import init_db, crear_usuario, crear_tipo, actualizar_papeleria, registrar_log, DB_PATH

JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "initial_data.json")

def main():
    print("Iniciando inicialización de la base de datos...")

    if not os.path.exists(JSON_PATH):
        print(f"Error: No se encontró el archivo JSON en {JSON_PATH}")
        return

    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
            print("Base de datos anterior eliminada.")
        except Exception as e:
            print(f"No se pudo eliminar la base de datos existente: {e}")

    init_db()
    print("Tablas de la base de datos inicializadas.")

    for user_data in data.get('default_users', []):
        exito = crear_usuario(
            cui=user_data['cui'],
            nombre=user_data['nombre_completo'],
            rol=user_data['rol'],
            grado=user_data.get('grado'),
            seccion=user_data.get('seccion'),
            anios=user_data.get('anios', ''),
            password=user_data['password'],
            acepto_consentimiento=user_data.get('acepto_consentimiento', False)
        )
        print(f"Usuario {user_data['nombre_completo']} ({user_data['rol']}): {'✅' if exito else '❌'}")

    for tipo_nombre in data.get('default_tipos', []):
        tipo_id = crear_tipo(tipo_nombre)
        print(f"Tipo '{tipo_nombre}': {'✅' if tipo_id else '❌'}")

    for pap in data.get('default_papeleria', []):
        exito = actualizar_papeleria(
            cui=pap['estudiante_cui'],
            anio=pap['anio'],
            tipo=pap['tipo'],
            estado=pap['estado']
        )
        if exito:
            print(f"Papelería: {pap['estudiante_cui']} - {pap['anio']} - {pap['tipo']} = {pap['estado']} ✅")

    registrar_log("admin", "init_db", "Se inicializó y pobló la base de datos.", "127.0.0.1")
    print("\nBase de datos poblada exitosamente.")
    print("\nCredenciales de prueba:")
    print("  Estudiante: CUI 2810452310101 / PIN 1234")
    print("  Estudiante: CUI 4789123450101 / PIN 5678")
    print("  Admin: CUI admin / PIN admin123")

if __name__ == "__main__":
    main()
