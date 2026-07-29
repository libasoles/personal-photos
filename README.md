# Photos Portfolio

Galería de fotos basada en la plantilla [Exhibit Studio](https://www.tooplate.com/view/2160-exhibit-studio) (Tooplate, uso libre comercial).

Estado: **prototipo**. Las 12 fotos actuales son las de la plantilla, marcadas con `"placeholder": true` en el manifest.

## Arrancar

```bash
python3 -m http.server 8000
# http://localhost:8000
```

Hay que servirlo por HTTP. Abrir `index.html` con doble clic no funciona: `fetch('photos.json')` está bloqueado en `file://` y la galería sale vacía con un mensaje de error.

## Cómo funciona

`photos.json` es la única fuente de verdad. `js/gallery.js` lo lee, pinta los filtros y el grid, y solo entonces carga `tooplate-exhibit-script.js` (lightbox, filtros, menú móvil), que espera el DOM ya montado.

```
photos.json                  manifest: fotos + categorías + textos del hero
js/gallery.js                render dinámico
tooplate-exhibit-script.js   lightbox / filtros / nav (sin tocar)
tooplate-exhibit-style.css   estilos (sin tocar)
tools/build_manifest.py      regenera photos.json desde images/
images/                      fotos
```

### Campos de una foto

| Campo | Para qué |
|---|---|
| `thumb` | imagen del grid (~600px de ancho) |
| `full` | resolución alta, la que abre el lightbox |
| `width` / `height` | dimensiones **reales** del thumb |
| `category` | debe coincidir con un `id` de `categories` |
| `title`, `meta` | pie de foto |
| `alt` | accesibilidad |

`width`/`height` no son opcionales: el masonry usa columnas CSS y sin ellos el grid salta al cargar cada imagen.

## Meter las fotos de verdad

No existe conector de Google Photos, y la Library API dejó de permitir listar la biblioteca completa a apps de terceros. La ruta que funciona es exportar a mano:

1. En Google Photos, filtro **Favoritas** (`photos.google.com/favorites`).
2. Seleccionar todas → **Shift+D** (o menú → Descargar). Llega un ZIP.
3. Descomprimir dentro de `images/`.
4. Regenerar el manifest:

```bash
pip install Pillow                              # opcional pero recomendable
python3 tools/build_manifest.py --thumbs
```

El script lee las dimensiones reales, genera miniaturas de 600px en `images/thumbs/`, y **conserva los `title`, `meta` y `category` que ya hubieras escrito**, emparejando por nombre de archivo. Se puede ejecutar tantas veces como haga falta.

Alternativa para exportes grandes: [Google Takeout](https://takeout.google.com) → Google Fotos. Incluye los metadatos EXIF en JSON, útil si más adelante quieres fecha y ubicación automáticas en el pie.

## Pendiente

- Sustituir las 12 placeholder por las favoritas reales
- Asignar categorías (ahora `build_manifest.py` mete todo en `all`)
- `about.html` y `contact.html` siguen con el texto original de la plantilla
- El formulario de contacto necesita un script PHP en servidor
