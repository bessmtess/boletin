# Encuesta MTESS — Google Apps Script (web app)

Esta carpeta contiene un ejemplo de implementación de la encuesta como **Web App** en **Google Apps Script**, con:

- Login con usuario `nombreapellido` (minúsculas, sin espacios)
- Contraseña inicial `nombreapellido123` (primer ingreso)
- Cambio obligatorio de contraseña en “Mi perfil”
- Guardado de respuestas en un **Google Sheet** (hojas `Users` y `Responses`)

## 1) Crear el proyecto (recomendado: ligado a un Google Sheet)

1. Crear un Google Sheet nuevo (será la “base de datos”).
2. En el Sheet: **Extensiones → Apps Script**.
3. Copiar los archivos de esta carpeta en el editor:
   - `Code.gs`
   - `Index.html`
   - `appsscript.json`

## 2) Inicializar hojas

En Apps Script, ejecutar la función `setup()` una vez.

Esto crea (si no existen):

- `Users`: usuarios y hashes de contraseña
- `Responses`: filas de la encuesta por usuario

## 3) Publicar como Web App

1. **Implementar → Nueva implementación**
2. Tipo: **Aplicación web**
3. Ejecutar como: **Yo**
4. Quién tiene acceso:
   - Ideal: “Cualquiera” o “Cualquiera con cuenta de Google” según tu caso.
5. Copiar la URL final.

## Notas de seguridad

- Esto NO es un sistema de autenticación robusto: es un login simple para uso interno.
- Las contraseñas se guardan como hash SHA-256 en la hoja `Users` (no en texto plano).
- Si querés restringir mejor el acceso, usá Google Workspace (dominio) y configurá el acceso del Web App.

