# Guía de mantenimiento — GitHub Pages (boletín)

Repositorio: `bessmtess/boletin`  
Sitio: `https://bessmtess.github.io/boletin/`

## 1) Actualizar datos / dashboard

El sitio se publica desde `index.html` (estático). Para actualizar los datos, se regenera ese archivo desde el Excel del Anexo.

```bash
cd GITHUB
python3 generate_dashboard.py --excel-path ../Anexo_Estadístico_Boletin_Seguridad_Social_2025.xlsx
```

Alternativa: definir `BESS_EXCEL_PATH` y ejecutar sin `--excel-path`.

## 2) Publicar cambios

```bash
git add index.html
git commit -m "Actualizar dashboard"
git push
```

GitHub Pages suele actualizar en 1–2 minutos.

## 3) Configuración (si alguna vez se desactiva)

En GitHub: **Settings → Pages**
- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/ (root)**

## Problemas comunes

- **No se ve el sitio**: esperar unos minutos y revisar Settings → Pages.
- **Gráficos no cargan**: abrir consola del navegador (F12) y verificar bloqueos de red/CDN.
