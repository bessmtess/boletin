# 🚀 GUÍA COMPLETA: Subir Dashboard a GitHub Pages

## Paso 1: Crear Repositorio en GitHub

1. Ve a [GitHub](https://github.com) e inicia sesión
2. Haz clic en el botón **"New"** (verde) para crear un nuevo repositorio
3. Configura tu repositorio:
   - **Repository name**: `dashboard-previsional` (o el nombre que prefieras)
   - **Description**: "Dashboard interactivo del sistema previsional de Paraguay"
   - Marca como **Public**
   - ✅ Marca "Add a README file"
   - Haz clic en **"Create repository"**

## Paso 2: Subir Archivos al Repositorio

### Opción A: Usando la Interfaz Web de GitHub (Más Fácil)

1. En tu repositorio recién creado, haz clic en **"Add file"** → **"Upload files"**
2. Arrastra y suelta estos archivos:
   - `index.html`
   - `dashboard_interactivo.html`
   - `_config.yml`
   - `README.md`
3. Crea una carpeta llamada `datos/` y sube:
   - `activos_resumen.csv`
   - `pasivos_resumen.csv`
   - `datos_bess2025.csv`
4. Escribe un mensaje de commit: "Subir dashboard inicial"
5. Haz clic en **"Commit changes"**

### Opción B: Usando Git (Línea de Comandos)

```bash
# 1. Clonar tu repositorio
git clone https://github.com/TU-USUARIO/dashboard-previsional.git
cd dashboard-previsional

# 2. Copiar todos los archivos del dashboard a esta carpeta

# 3. Agregar archivos
git add .

# 4. Hacer commit
git commit -m "Subir dashboard inicial"

# 5. Subir a GitHub
git push origin main
```

## Paso 3: Activar GitHub Pages

1. En tu repositorio, ve a **Settings** (Configuración)
2. En el menú lateral izquierdo, busca **"Pages"**
3. En **"Source"**, selecciona:
   - Branch: **main**
   - Folder: **/ (root)**
4. Haz clic en **"Save"**
5. ¡Espera 1-2 minutos!

## Paso 4: Acceder a tu Dashboard

Tu dashboard estará disponible en:
```
https://TU-USUARIO.github.io/dashboard-previsional/
```

Reemplaza `TU-USUARIO` con tu nombre de usuario de GitHub.

## 📁 Estructura Final del Repositorio

```
dashboard-previsional/
├── index.html                    # Dashboard principal
├── dashboard_interactivo.html    # Copia del dashboard
├── _config.yml                   # Configuración de GitHub Pages
├── README.md                     # Documentación
└── datos/                        # Carpeta de datos
    ├── activos_resumen.csv
    ├── pasivos_resumen.csv
    └── datos_bess2025.csv
```

## 🎨 Personalización

### Cambiar Colores

Edita el archivo `index.html` y busca la sección `<style>`. Puedes cambiar:
- Color principal: `#2563EB` (azul)
- Color de fondo: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`

### Actualizar Datos

1. Edita los archivos CSV en la carpeta `datos/`
2. Sube los cambios a GitHub
3. El dashboard se actualizará automáticamente

## 🔧 Solución de Problemas

### El dashboard no se muestra
- Espera 2-3 minutos después de activar GitHub Pages
- Verifica que `index.html` esté en la raíz del repositorio
- Revisa la configuración en Settings → Pages

### Los gráficos no cargan
- Verifica que Plotly.js se esté cargando desde el CDN
- Abre la consola del navegador (F12) para ver errores

### Errores 404
- Asegúrate de que todos los archivos estén en la ubicación correcta
- Verifica que los nombres de archivo coincidan exactamente

## 📱 Compartir tu Dashboard

Una vez publicado, puedes compartir el enlace:
```
https://TU-USUARIO.github.io/dashboard-previsional/
```

## 🔄 Actualizar el Dashboard

Para hacer cambios:
1. Edita los archivos localmente
2. Sube los cambios a GitHub (usando la web o git)
3. GitHub Pages se actualizará automáticamente en 1-2 minutos

---

## 📞 Recursos Adicionales

- [Documentación de GitHub Pages](https://docs.github.com/es/pages)
- [Plotly.js Documentation](https://plotly.com/javascript/)
- [Markdown Guide](https://www.markdownguide.org/)

---

**¡Listo!** Tu dashboard interactivo estará en línea y accesible para cualquier persona con el enlace.
