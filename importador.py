import re
import io
import csv
import zipfile
import xml.etree.ElementTree as ET
try:
    import openpyxl
except ImportError:
    openpyxl = None
try:
    from docx import Document
except ImportError:
    Document = None


COLUMNAS_ESPERADAS = {
    'cui': ['cui', 'código', 'codigo', 'identificador', 'id', 'dpi', 'número', 'numero', 'cedula', 'cédula'],
    'nombre': ['nombre', 'nombre_completo', 'nombre completo', 'nombres', 'apellidos', 'nombre y apellido', 'alumno', 'estudiante', 'name', 'fullname'],
    'grado': ['grado', 'curso', 'nivel', 'grado academico', 'grado académico', 'grade'],
    'seccion': ['sección', 'seccion', 'seccion', 'secc', 'letra', 'salón', 'salon', 'section'],
    'anios': ['años', 'años', 'año', 'ano', 'años cursados', 'años ingresados', 'periodo', 'periodo', 'years'],
    'carrera': ['carrera', 'bachillerato', 'perito', 'especialidad', 'orientacion', 'orientación', 'programa', 'major'],
    'basicos': ['básicos', 'basicos', 'ciclo básico', 'ciclo basico', 'nivel básico', 'nivel basico'],
}


def _normalizar(s):
    if not s:
        return ''
    return re.sub(r'[^a-záéíóúñ0-9]', '', s.strip().lower())


def _detectar_columna(col, columnas):
    nc = _normalizar(col)
    for key, aliases in COLUMNAS_ESPERADAS.items():
        for a in aliases:
            if _normalizar(a) == nc or nc in _normalizar(a) or _normalizar(a) in nc:
                return key
    return None


def _parsear_grado(val):
    if not val:
        return '', ''
    v = str(val).strip()

    # Pattern: "1ro Básicos", "3ro Básicos", "4to Bachillerato", "5to Primaria"
    # Or just "Básicos", "Bachillerato", "Primaria"
    known_grados = [
        'preprimaria', 'primaria', 'básicos', 'basicos', 'bachillerato',
        'perito contador', 'perito en administración', 'perito',
        'magisterio', 'educación básica', 'educacion basica',
        'diversificado'
    ]

    nivel = ''
    carrera = ''

    # Check for "Xro", "Xto", "Xdo" patterns
    nivel_match = re.match(r'(\d+)(ro|to|do|°|\.)?\s*(.*)', v, re.I)
    if nivel_match:
        grado_num = nivel_match.group(1)
        resto = nivel_match.group(3).strip()
        for known in known_grados:
            if known in resto.lower():
                nivel = f'{grado_num}° {known.title()}'
                if known in ('bachillerato', 'perito contador', 'perito en administración', 'perito', 'magisterio', 'diversificado'):
                    carrera = resto
                break
        if not nivel:
            nivel = f'{grado_num}° {resto}' if resto else f'{grado_num}°'
    else:
        # Maybe it's just the career name
        for known in known_grados:
            if known in v.lower():
                if known in ('básicos', 'basicos'):
                    nivel = f'1ro a 3ro {known.title()}'
                elif known in ('bachillerato', 'perito contador', 'perito', 'magisterio', 'diversificado'):
                    nivel = f'4to a 6to {known.title()}'
                    carrera = v
                else:
                    nivel = v.title()
                break
        if not nivel:
            nivel = v.title()

    return nivel, carrera


def _extraer_cui(texto):
    cui_match = re.search(r'\b(\d{13})\b', texto)
    return cui_match.group(1) if cui_match else None


def parsear_excel(archivo):
    wb = openpyxl.load_workbook(archivo, read_only=True, data_only=True)
    ws = wb.active
    filas = list(ws.iter_rows(values_only=True))
    wb.close()

    if not filas:
        return []

    encabezados = [str(c or '') for c in filas[0]]
    col_map = {}
    for i, h in enumerate(encabezados):
        col_map[i] = _detectar_columna(h, encabezados)

    registros = []
    for fila in filas[1:]:
        if not any(fila):
            continue
        reg = {}
        for i, val in enumerate(fila):
            col = col_map.get(i)
            if col:
                reg[col] = str(val or '').strip()
        if reg.get('cui') or reg.get('nombre'):
            registros.append(reg)

    return registros


def parsear_csv(texto, delimitador=None):
    if delimitador is None:
        # Auto-detect: try comma, then tab, then semicolon
        muestra = texto[:2000]
        if '\t' in muestra:
            delimitador = '\t'
        elif ';' in muestra:
            delimitador = ';'
        else:
            delimitador = ','

    reader = csv.DictReader(io.StringIO(texto), delimiter=delimitador)
    col_map = {}
    for col in reader.fieldnames or []:
        mapped = _detectar_columna(col, reader.fieldnames or [])
        if mapped:
            col_map[col] = mapped

    registros = []
    for row in reader:
        reg = {}
        for orig_col, mapped_col in col_map.items():
            val = row.get(orig_col, '').strip()
            if val:
                reg[mapped_col] = val
        if reg.get('cui') or reg.get('nombre'):
            registros.append(reg)
    return registros


def parsear_word(archivo):
    doc = Document(archivo)
    registros = []

    # Try parsing tables first
    for table in doc.tables:
        filas = [[cell.text.strip() for cell in row.cells] for row in table.rows]
        if len(filas) < 2:
            continue
        encabezados = filas[0]
        col_map = {}
        for i, h in enumerate(encabezados):
            col_map[i] = _detectar_columna(h, encabezados)

        for fila in filas[1:]:
            if not any(fila):
                continue
            reg = {}
            for i, val in enumerate(fila):
                col = col_map.get(i)
                if col:
                    reg[col] = val.strip()
            if reg.get('cui') or reg.get('nombre'):
                registros.append(reg)

    return registros


def parsear_txt(archivo):
    contenido = archivo.read()
    if isinstance(contenido, bytes):
        contenido = contenido.decode('utf-8', errors='replace')
    return parsear_csv(contenido)


def parsear_archivo(ruta_o_bytes, nombre_archivo, es_bytes=True):
    ext = nombre_archivo.rsplit('.', 1)[-1].lower() if '.' in nombre_archivo else ''

    if ext == 'xlsx':
        return parsear_excel(ruta_o_bytes)
    elif ext == 'csv':
        if es_bytes:
            texto = ruta_o_bytes.decode('utf-8', errors='replace')
        else:
            with open(ruta_o_bytes, 'r', encoding='utf-8') as f:
                texto = f.read()
        return parsear_csv(texto)
    elif ext == 'docx':
        return parsear_word(ruta_o_bytes)
    elif ext == 'txt':
        if es_bytes:
            texto = ruta_o_bytes.decode('utf-8', errors='replace')
        else:
            with open(ruta_o_bytes, 'r', encoding='utf-8') as f:
                texto = f.read()
        return parsear_csv(texto)
    else:
        return []


def normalizar_registros(registros):
    """Convierte registros parseados a formato estándar para crear usuarios."""
    resultados = []
    for reg in registros:
        cui = reg.get('cui', '').strip()
        nombre = reg.get('nombre', '').strip()
        grado_raw = reg.get('grado', '').strip()
        seccion = reg.get('seccion', '').strip().upper()
        anios_raw = reg.get('anios', reg.get('años', '')).strip()
        carrera = reg.get('carrera', '').strip()

        if not cui and not nombre:
            continue

        # Try to extract CUI from nombre if not in its own field
        if not cui or not re.match(r'^\d{13}$', cui):
            cui_num = _extraer_cui(nombre)
            if cui_num:
                cui = cui_num

        # Parse grado + carrera
        grado, carrera_detectada = _parsear_grado(grado_raw)
        if not carrera and carrera_detectada:
            carrera = carrera_detectada

        # Normalize anios
        if anios_raw:
            anios_nums = re.findall(r'\d{4}', anios_raw)
            anios = ','.join(anios_nums)
        else:
            anios = ''

        if not grado:
            grado = grado_raw.title() if grado_raw else ''

        resultados.append({
            'cui': cui,
            'nombre_completo': nombre,
            'grado': grado,
            'seccion': seccion,
            'carrera': carrera,
            'anios': anios
        })

    return resultados
