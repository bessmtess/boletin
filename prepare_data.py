#!/usr/bin/env python3
"""
BESS 2025 - Data Pipeline
Reads BASEfinalBESS2025.xlsx and tasas sheet, generates optimized JSON files for the dashboard.
"""
import pandas as pd
import json
import os
import sys

# --- CONFIG ---
BASE_FILE = sys.argv[1] if len(sys.argv) > 1 else "BASEfinalBESS2025.xlsx"
TASAS_FILE = sys.argv[2] if len(sys.argv) > 2 else "bess2025_tablas_finales_v15feb2026_1800.xlsx"
OUTPUT_DIR = "datos"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- LOAD DATA ---
print("Loading base data...")
df = pd.read_excel(BASE_FILE, sheet_name="base")
df.columns = ['edad', 'edad_quinquenal', 'ano', 'sexo', 'tipo_beneficio', 'estado', 'caja',
               'suma_aportes', 'suma_salarios', 'cantidad', 'sml']

# Clean
df['ano'] = df['ano'].astype(int)
df['cantidad'] = pd.to_numeric(df['cantidad'], errors='coerce').fillna(0).astype(int)
df['suma_aportes'] = pd.to_numeric(df['suma_aportes'], errors='coerce').fillna(0)
df['suma_salarios'] = pd.to_numeric(df['suma_salarios'], errors='coerce').fillna(0)
df['sml'] = pd.to_numeric(df['sml'], errors='coerce').fillna(0)

print(f"  Loaded {len(df)} rows, years {df['ano'].min()}-{df['ano'].max()}, cajas: {df['caja'].nunique()}")

# --- 1. kpis.json ---
print("Generating kpis.json...")
kpis = {"global": {}, "por_caja": {}}

for ano in sorted(df['ano'].unique()):
    dy = df[df['ano'] == ano]
    act = dy[dy['estado'] == 'Activos']['cantidad'].sum()
    pas = dy[dy['estado'] == 'Pasivos']['cantidad'].sum()
    sal = dy['suma_salarios'].sum()
    apo = dy['suma_aportes'].sum()
    sml_val = dy['sml'].max()
    ratio = round(act / pas, 2) if pas > 0 else 0
    kpis["global"][str(ano)] = {
        "total_activos": int(act),
        "total_pasivos": int(pas),
        "ratio": ratio,
        "masa_salarial": round(float(sal)),
        "masa_aportes": round(float(apo)),
        "sml": int(sml_val)
    }

# Year-over-year changes
years = sorted(df['ano'].unique())
for i in range(1, len(years)):
    curr = kpis["global"][str(years[i])]
    prev = kpis["global"][str(years[i-1])]
    for key in ['total_activos', 'total_pasivos', 'masa_salarial']:
        if prev[key] > 0:
            curr[f'{key}_cambio_pct'] = round((curr[key] - prev[key]) / prev[key] * 100, 1)
        else:
            curr[f'{key}_cambio_pct'] = 0

# Per caja
for caja in df['caja'].unique():
    dc = df[df['caja'] == caja]
    kpis["por_caja"][caja] = {}
    for ano in sorted(dc['ano'].unique()):
        dy = dc[dc['ano'] == ano]
        act = dy[dy['estado'] == 'Activos']['cantidad'].sum()
        pas = dy[dy['estado'] == 'Pasivos']['cantidad'].sum()
        sal = dy['suma_salarios'].sum()
        apo = dy['suma_aportes'].sum()
        sal_prom_act = round(float(sal / act)) if act > 0 else 0
        ratio = round(act / pas, 2) if pas > 0 else 0
        kpis["por_caja"][caja][str(ano)] = {
            "activos": int(act), "pasivos": int(pas), "ratio": ratio,
            "masa_salarial": round(float(sal)), "masa_aportes": round(float(apo)),
            "salario_promedio_activos": sal_prom_act
        }

with open(f"{OUTPUT_DIR}/kpis.json", 'w', encoding='utf-8') as f:
    json.dump(kpis, f, ensure_ascii=False, indent=2)
print(f"  -> kpis.json ({os.path.getsize(f'{OUTPUT_DIR}/kpis.json')} bytes)")

# --- 2. serie_temporal.json ---
print("Generating serie_temporal.json...")
serie = df.groupby(['ano', 'caja', 'estado']).agg(
    cantidad=('cantidad', 'sum'),
    salarios=('suma_salarios', 'sum'),
    aportes=('suma_aportes', 'sum')
).reset_index()
serie['salario_promedio'] = (serie['salarios'] / serie['cantidad']).where(serie['cantidad'] > 0, 0).round(0)
serie_list = serie.to_dict('records')
for r in serie_list:
    r['salarios'] = round(float(r['salarios']))
    r['aportes'] = round(float(r['aportes']))
    r['salario_promedio'] = round(float(r['salario_promedio']))
    r['ano'] = int(r['ano'])
    r['cantidad'] = int(r['cantidad'])

with open(f"{OUTPUT_DIR}/serie_temporal.json", 'w', encoding='utf-8') as f:
    json.dump(serie_list, f, ensure_ascii=False, indent=2)
print(f"  -> serie_temporal.json ({os.path.getsize(f'{OUTPUT_DIR}/serie_temporal.json')} bytes)")

# --- 3. piramide_data.json ---
print("Generating piramide_data.json...")
pir = df.groupby(['ano', 'caja', 'estado', 'edad_quinquenal', 'sexo']).agg(
    cantidad=('cantidad', 'sum'),
    salarios=('suma_salarios', 'sum')
).reset_index()
pir['salario_promedio'] = (pir['salarios'] / pir['cantidad']).where(pir['cantidad'] > 0, 0).round(0)
pir_list = []
for _, r in pir.iterrows():
    pir_list.append({
        'ano': int(r['ano']), 'caja': r['caja'], 'estado': r['estado'],
        'edad_quinquenal': r['edad_quinquenal'], 'sexo': r['sexo'],
        'cantidad': int(r['cantidad']), 'salario_promedio': round(float(r['salario_promedio']))
    })

with open(f"{OUTPUT_DIR}/piramide_data.json", 'w', encoding='utf-8') as f:
    json.dump(pir_list, f, ensure_ascii=False)
print(f"  -> piramide_data.json ({os.path.getsize(f'{OUTPUT_DIR}/piramide_data.json')} bytes)")

# --- 4. beneficios_pasivos.json ---
print("Generating beneficios_pasivos.json...")
pas_df = df[df['estado'] == 'Pasivos']
ben = pas_df.groupby(['ano', 'caja', 'tipo_beneficio']).agg(
    cantidad=('cantidad', 'sum'),
    salarios=('suma_salarios', 'sum'),
    aportes=('suma_aportes', 'sum')
).reset_index()
ben_list = []
for _, r in ben.iterrows():
    ben_list.append({
        'ano': int(r['ano']), 'caja': r['caja'], 'tipo_beneficio': r['tipo_beneficio'],
        'cantidad': int(r['cantidad']),
        'salarios': round(float(r['salarios'])),
        'aportes': round(float(r['aportes']))
    })

with open(f"{OUTPUT_DIR}/beneficios_pasivos.json", 'w', encoding='utf-8') as f:
    json.dump(ben_list, f, ensure_ascii=False, indent=2)
print(f"  -> beneficios_pasivos.json ({os.path.getsize(f'{OUTPUT_DIR}/beneficios_pasivos.json')} bytes)")

# --- 5. tasas_aporte.json ---
print("Generating tasas_aporte.json...")
try:
    tasas_df = pd.read_excel(TASAS_FILE, sheet_name="tasas", header=None)
    print(f"  Tasas sheet shape: {tasas_df.shape}")
    print(f"  Tasas preview:\n{tasas_df.head(10)}")

    tasas_list = []
    nombres_largos = {
        'IPS': 'Instituto de Previsión Social',
        'Fiscal': 'Caja Fiscal (Ministerio de Hacienda)',
        'Ande': 'Caja de Jubilaciones y Pensiones de la ANDE',
        'Bancaria': 'Caja de Jubilaciones y Pensiones del Personal Bancario',
        'Cajubi': 'Caja de Jubilaciones y Pensiones del Personal de ITAIPU',
        'Ferroviaria': 'Caja de Jubilaciones y Pensiones Ferroviaria',
        'Municipal': 'Caja de Jubilaciones y Pensiones Municipal'
    }

    # Try to parse tasas - structure may vary
    for i in range(tasas_df.shape[0]):
        row = tasas_df.iloc[i]
        caja_name = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""
        if caja_name in nombres_largos:
            vals = []
            for j in range(1, min(5, len(row))):
                v = row.iloc[j]
                if pd.notna(v):
                    try:
                        vals.append(float(v))
                    except:
                        vals.append(0)
                else:
                    vals.append(0)
            while len(vals) < 4:
                vals.append(0)
            tasas_list.append({
                'caja': caja_name,
                'caja_largo': nombres_largos[caja_name],
                'tasa_empleado': vals[0],
                'tasa_empleador': vals[1],
                'tasa_estado': vals[2],
                'tasa_total': vals[3]
            })

    if not tasas_list:
        raise ValueError("Could not parse tasas sheet")

except Exception as e:
    print(f"  Warning: Could not read tasas sheet ({e}), using hardcoded values")
    tasas_list = [
        {"caja": "IPS", "caja_largo": "Instituto de Previsión Social", "tasa_empleado": 9.0, "tasa_empleador": 14.0, "tasa_estado": 1.5, "tasa_total": 24.5},
        {"caja": "Fiscal", "caja_largo": "Caja Fiscal (Ministerio de Hacienda)", "tasa_empleado": 14.0, "tasa_empleador": 14.0, "tasa_estado": 2.0, "tasa_total": 30.0},
        {"caja": "Ande", "caja_largo": "Caja de Jubilaciones y Pensiones de la ANDE", "tasa_empleado": 14.0, "tasa_empleador": 17.0, "tasa_estado": 0, "tasa_total": 31.0},
        {"caja": "Bancaria", "caja_largo": "Caja de Jubilaciones y Pensiones del Personal Bancario", "tasa_empleado": 12.0, "tasa_empleador": 14.0, "tasa_estado": 0, "tasa_total": 26.0},
        {"caja": "Cajubi", "caja_largo": "Caja de Jubilaciones y Pensiones del Personal de ITAIPU", "tasa_empleado": 15.0, "tasa_empleador": 15.0, "tasa_estado": 0, "tasa_total": 30.0},
        {"caja": "Ferroviaria", "caja_largo": "Caja de Jubilaciones y Pensiones Ferroviaria", "tasa_empleado": 14.0, "tasa_empleador": 14.0, "tasa_estado": 0, "tasa_total": 28.0},
        {"caja": "Municipal", "caja_largo": "Caja de Jubilaciones y Pensiones Municipal", "tasa_empleado": 14.0, "tasa_empleador": 14.0, "tasa_estado": 2.0, "tasa_total": 30.0}
    ]

with open(f"{OUTPUT_DIR}/tasas_aporte.json", 'w', encoding='utf-8') as f:
    json.dump(tasas_list, f, ensure_ascii=False, indent=2)
print(f"  -> tasas_aporte.json ({os.path.getsize(f'{OUTPUT_DIR}/tasas_aporte.json')} bytes)")

# --- 6. salarios_edad.json ---
print("Generating salarios_edad.json...")
sal = df.groupby(['ano', 'caja', 'estado', 'edad_quinquenal']).agg(
    cantidad=('cantidad', 'sum'),
    salarios=('suma_salarios', 'sum')
).reset_index()
sal['salario_promedio'] = (sal['salarios'] / sal['cantidad']).where(sal['cantidad'] > 0, 0).round(0)
sal_list = []
for _, r in sal.iterrows():
    sal_list.append({
        'ano': int(r['ano']), 'caja': r['caja'], 'estado': r['estado'],
        'edad_quinquenal': r['edad_quinquenal'],
        'cantidad': int(r['cantidad']),
        'salario_promedio': round(float(r['salario_promedio']))
    })

with open(f"{OUTPUT_DIR}/salarios_edad.json", 'w', encoding='utf-8') as f:
    json.dump(sal_list, f, ensure_ascii=False)
print(f"  -> salarios_edad.json ({os.path.getsize(f'{OUTPUT_DIR}/salarios_edad.json')} bytes)")

# --- ALSO export full base as CSV for the data explorer ---
print("Generating base_completa.csv...")
df.to_csv(f"{OUTPUT_DIR}/base_completa.csv", index=False, encoding='utf-8')
print(f"  -> base_completa.csv ({os.path.getsize(f'{OUTPUT_DIR}/base_completa.csv')} bytes)")

print("\nDone! All data files generated in datos/")
