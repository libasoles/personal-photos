# Photos Portfolio

Galería de fotos basada en la plantilla [Exhibit Studio](https://www.tooplate.com/view/2160-exhibit-studio) (Tooplate, uso libre comercial).

**Demo:** [libasoles.github.io/personal-photos](https://libasoles.github.io/personal-photos/index.html)

![Screenshot de la galería](images/screenshot.png)

Estado: en uso. `photos.json` tiene 151 fotos reales agrupadas en dos álbumes (`2025`, `2026`); ya no quedan placeholders de la plantilla.

Al compartir el link en WhatsApp o redes sociales, el preview usa `images/social.jpg` (configurado vía Open Graph / Twitter Card en `index.html`).

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
tools/build_manifest.py      regenera photos.json desde images/<album>/
images/<album>/               fotos de un álbum (p.ej. images/album-i/)
```

### Álbumes

Las fotos se agrupan en álbumes: cada uno vive en su propia carpeta `images/<album-id>/` (con sus miniaturas en `images/<album-id>/thumbs/`), y `photos.json` lleva un array `albums` (`{id, label}`) más un campo `album` en cada foto que apunta a ese `id`. La UI filtra por álbum (los botones de `js-filter` en `js/gallery.js`); hoy existen `2025` y `2026`.

### Campos de una foto

| Campo              | Para qué                                   |
| ------------------ | ------------------------------------------ |
| `thumb`            | imagen del grid (~600px de ancho)          |
| `full`             | resolución alta, la que abre el lightbox   |
| `width` / `height` | dimensiones **reales** del thumb           |
| `category`         | debe coincidir con un `id` de `categories` |
| `album`            | debe coincidir con un `id` de `albums`     |
| `title`, `meta`    | pie de foto                                |
| `alt`              | accesibilidad                              |

`width`/`height` no son opcionales: el masonry usa columnas CSS y sin ellos el grid salta al cargar cada imagen.

## Meter las fotos de verdad

No existe conector de Google Photos, y la Library API dejó de permitir listar la biblioteca completa a apps de terceros. La ruta que funciona es exportar a mano:

1. En Google Photos, filtro **Favoritas** (`photos.google.com/favorites`).
2. Seleccionar todas → **Shift+D** (o menú → Descargar). Llega un ZIP.
3. Descomprimir dentro de `images/<album-id>/` (p.ej. `images/album-ii/` para un álbum nuevo).
4. Regenerar el manifest:

```bash
pip install Pillow                                        # opcional pero recomendable
python3 tools/build_manifest.py --album album-ii --label "Album II" --thumbs
```

El `--label` solo hace falta la primera vez que se crea el álbum (o para renombrarlo); en corridas siguientes basta con `--album`. El script lee las dimensiones reales, genera miniaturas de 600px en `images/<album-id>/thumbs/`, y **conserva los `title`, `meta` y `category` que ya hubieras escrito**, emparejando por ruta de archivo. Solo toca las fotos de ese álbum — las de los demás quedan intactas. Se puede ejecutar tantas veces como haga falta.

Alternativa para exportes grandes: [Google Takeout](https://takeout.google.com) → Google Fotos. Incluye los metadatos EXIF en JSON, útil si más adelante quieres fecha y ubicación automáticas en el pie.

## Pendiente

- `about.html` y `contact.html` siguen con el texto original de la plantilla
