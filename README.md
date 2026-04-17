# Boletín de Seguridad Social 2025 — Dashboard Interactivo (MTESS)

Dashboard interactivo del **Anexo Estadístico** del Boletín de Seguridad Social 2025 (serie 2020–2024), con visualizaciones por caja previsional (IPS, Caja Fiscal, ANDE, Bancaria, CAJUBI, Ferroviaria, Municipal y Parlamentaria).

## Sitio en vivo

`https://bessmtess.github.io/boletin/`

## Cómo actualizar el dashboard

**Requisitos**: Python 3.9+ y `openpyxl`.

1) Actualizar el Excel del anexo (xlsx).
2) Regenerar `index.html`:

```bash
cd GITHUB
python3 generate_dashboard.py --excel-path ../Anexo_Estadístico_Boletin_Seguridad_Social_2025.xlsx
```

Alternativa: definir `BESS_EXCEL_PATH` con la ruta al Excel y ejecutar sin `--excel-path`.

3) Publicar:

```bash
git add index.html
git commit -m "Actualizar dashboard"
git push
```

## Estructura

- `index.html`: sitio publicado (GitHub Pages).
- `generate_dashboard.py`: generador a partir del Excel.

## Nota técnica

El dashboard es **estático**: los datos quedan embebidos dentro de `index.html` (no hay backend).
