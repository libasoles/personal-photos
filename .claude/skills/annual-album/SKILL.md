---
name: annual-album
description: Procesa un export de Google Photos/Takeout (zip) y lo convierte en un álbum nuevo (o actualizado) del año dentro de este sitio de fotos. Usar cuando el usuario pida "procesar el álbum de <año>", suba un zip de Google Photos/Takeout, o pida agregar/actualizar fotos de un año.
---

# Crear o actualizar un álbum anual

Este proyecto es una galería estática (`index.html` + `photos.json` + `js/gallery.js`).
Cada año es un álbum independiente que vive en `images/<año>/` (p.ej. `images/2024/`).
Ver también el README (sección "Meter las fotos de verdad") para el contexto completo.

## Entrada esperada

Un `.zip` en la raíz del repo, típicamente descargado de:

- **Google Photos → Favoritas → Descargar** (zip simple, solo imágenes con EXIF).
- **Google Takeout → Google Fotos** (zip más pesado, con estructura
  `Takeout/Google Photos/<carpeta>/`, incluye `.jpg`, `.MP4` (videos) y
  `.json` de metadata (`*.supplemental-metadata.json`) por cada archivo).

Ambos formatos pueden aparecer. Antes de procesar, correr `unzip -l "<zip>"` y
mirar las extensiones presentes.

## Pasos

1. **Identificar el id del álbum**: normalmente el año como string, p.ej. `2024`.
   Confirmar con el usuario si el nombre del zip es ambiguo.

2. **Extraer solo las fotos** (`.jpg`/`.jpeg`/`.png`/`.webp`) a
   `images/<album>/`, aplanando cualquier subcarpeta del zip (Takeout anida en
   `Takeout/Google Photos/.../`). Ignorar `.MP4`/videos y los `.json` de
   metadata — el pipeline actual (`tools/build_manifest.py`) no los usa.

   Ejemplo con Python (evita depender de que `unzip` maneje bien los nombres):

   ```python
   import zipfile, shutil, os
   z = zipfile.ZipFile('Album 2024.zip')
   for info in z.infolist():
       if info.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
           name = os.path.basename(info.filename)
           with z.open(info) as src, open(f'images/2024/{name}', 'wb') as out:
               shutil.copyfileobj(src, out)
   ```

3. **Regenerar el manifest**:

   ```bash
   pip install Pillow   # si no está instalado, para dimensiones reales + thumbs
   python3 tools/build_manifest.py --album 2024 --label "2024" --thumbs
   ```

   - `--label` solo hace falta la primera vez que se crea el álbum.
   - El script conserva `title`/`meta`/`category` de fotos que ya existían
     (empareja por ruta `full`), y solo toca las fotos de ese álbum.
   - Con `--thumbs` genera miniaturas de 600px en `images/<album>/thumbs/`.

4. **Verificar** que `photos.json` quedó bien: contar fotos por álbum, chequear
   que no se rompieron los otros álbumes.

5. **No borrar el zip original sin preguntar** — puede pesar cientos de MB;
   igual está en `.gitignore` (`*.zip`) así que no se commitea por accidente.
   Ofrecer borrarlo al final si el usuario quiere liberar espacio.

## Notas

- Los álbumes nuevos aparecen automáticamente en los filtros de la UI
  (`js/gallery.js` lee `data.albums` de `photos.json`).
- Si Pillow no está instalado, el script igual corre pero sin miniaturas y
  leyendo dimensiones de la cabecera del archivo (menos preciso con EXIF
  rotado).
