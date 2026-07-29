#!/usr/bin/env python3
"""
build_manifest.py — regenera photos.json a partir de las imágenes de un álbum

Las fotos viven en images/<album>/ (p.ej. images/album-i/) y cada álbum se
procesa por separado; el resto de photos.json queda intacto.

Uso:
    python3 tools/build_manifest.py --album album-i
    python3 tools/build_manifest.py --album album-ii --label "Album II" --thumbs
    python3 tools/build_manifest.py --album album-ii --src ~/Fotos/viaje

Qué hace:
  - recorre images/<album>/ (o --src) buscando jpg/jpeg/png/webp
  - lee ancho y alto reales de cada archivo (necesario para que el masonry
    no salte al cargar)
  - conserva title, meta y category de las fotos que ya estaban en photos.json,
    emparejando por ruta completa, para no perder los textos al regenerar
  - con --thumbs crea images/<album>/thumbs/<nombre>.jpg a 600px de ancho
  - de-en la lista data["albums"] con {id, label}: si --album es nuevo se
    agrega (con --label, o el id formateado si no se indica); si ya existía
    y se pasa --label, actualiza la etiqueta
  - reemplaza en photos.json solo las fotos de ese álbum; las de otros
    álbumes no se tocan

Pillow es opcional: sin él se usa un lector de cabeceras mínimo para JPEG/PNG
y no se pueden generar miniaturas.
"""

import argparse
import json
import re
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "photos.json"
EXTS = {".jpg", ".jpeg", ".png", ".webp"}
THUMB_WIDTH = 600

try:
    from PIL import Image, ImageOps
    HAS_PIL = True
except ImportError:
    HAS_PIL = False


def size_from_header(path: Path):
    """Ancho/alto leyendo solo la cabecera. Fallback si no hay Pillow."""
    with open(path, "rb") as f:
        head = f.read(26)
        # PNG
        if head[:8] == b"\x89PNG\r\n\x1a\n":
            w, h = struct.unpack(">II", head[16:24])
            return w, h
        # JPEG: recorrer los marcadores SOFn
        if head[:2] == b"\xff\xd8":
            f.seek(2)
            while True:
                b = f.read(1)
                if not b:
                    break
                if b != b"\xff":
                    continue
                marker = f.read(1)
                while marker == b"\xff":
                    marker = f.read(1)
                if marker in (b"\xc0", b"\xc1", b"\xc2", b"\xc3",
                              b"\xc5", b"\xc6", b"\xc7", b"\xc9",
                              b"\xca", b"\xcb", b"\xcd", b"\xce", b"\xcf"):
                    f.read(3)
                    h, w = struct.unpack(">HH", f.read(4))
                    return w, h
                seg = f.read(2)
                if len(seg) < 2:
                    break
                f.seek(struct.unpack(">H", seg)[0] - 2, 1)
    return None, None


def image_size(path: Path):
    if HAS_PIL:
        try:
            with Image.open(path) as im:
                im = ImageOps.exif_transpose(im)
                return im.size
        except Exception:
            pass
    w, h = size_from_header(path)
    return (w or 600, h or 400)


def make_thumb(src: Path, dest_dir: Path) -> Path:
    """Genera una miniatura de THUMB_WIDTH px de ancho. Devuelve su ruta."""
    if not HAS_PIL:
        raise SystemExit("--thumbs necesita Pillow: pip install Pillow")
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / (src.stem + ".jpg")
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        im = im.convert("RGB")
        if im.width > THUMB_WIDTH:
            ratio = THUMB_WIDTH / im.width
            im = im.resize((THUMB_WIDTH, round(im.height * ratio)), Image.LANCZOS)
        im.save(dest, "JPEG", quality=82, optimize=True)
    return dest


def title_from_name(name: str) -> str:
    """IMG_20240712_playa.jpg -> Playa"""
    stem = re.sub(r"^(IMG|DSC|PXL|VID)[-_]?\d*[-_]?", "", name, flags=re.I)
    stem = re.sub(r"\d{6,}", "", stem)
    stem = re.sub(r"[-_]+", " ", stem).strip()
    return stem.title() or name


def label_from_album_id(album_id: str) -> str:
    """album-ii -> Album Ii (fallback si no se pasa --label)"""
    return album_id.replace("-", " ").replace("_", " ").title()


def load_previous():
    """Datos existentes de photos.json, si los hay."""
    if not MANIFEST.exists():
        return {"site": {}, "categories": [{"id": "all", "label": "Todas"}],
                "albums": [], "photos": []}
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    data.setdefault("albums", [])
    data.setdefault("photos", [])
    return data


def upsert_album(data, album_id, label):
    for a in data["albums"]:
        if a["id"] == album_id:
            if label:
                a["label"] = label
            return
    data["albums"].append({"id": album_id, "label": label or label_from_album_id(album_id)})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--album", required=True,
                    help="id del álbum (p.ej. album-i); las fotos se leen de "
                         "images/<album>/ salvo que se indique --src")
    ap.add_argument("--label", default=None,
                    help='nombre visible del álbum (p.ej. "Album I"); solo hace '
                         "falta la primera vez o para renombrarlo")
    ap.add_argument("--src", default=None,
                    help="carpeta con las fotos a tamaño completo "
                         "(por defecto images/<album>/)")
    ap.add_argument("--thumbs", action="store_true",
                    help="generar miniaturas en images/<album>/thumbs/")
    args = ap.parse_args()

    src_dir = Path(args.src).expanduser().resolve() if args.src \
        else ROOT / "images" / args.album
    if not src_dir.is_dir():
        raise SystemExit(f"No existe la carpeta: {src_dir}")

    data = load_previous()
    previous_by_full = {p.get("full"): p for p in data["photos"]}

    files = sorted(
        p for p in src_dir.iterdir()
        if p.suffix.lower() in EXTS
        and p.is_file()
        and not p.name.startswith("thumb-")
    )
    if not files:
        raise SystemExit(f"No se encontraron imágenes en {src_dir}")

    album_dir = ROOT / "images" / args.album
    photos = []
    for f in files:
        w, h = image_size(f)
        full_rel = f"images/{args.album}/{f.name}"
        prev = previous_by_full.get(full_rel, {})

        if args.thumbs:
            thumb_path = make_thumb(f, album_dir / "thumbs")
            thumb_rel = thumb_path.relative_to(ROOT).as_posix()
        else:
            thumb_rel = prev.get("thumb") or full_rel

        photos.append({
            "id": f.stem,
            "category": prev.get("category", "all"),
            "album": args.album,
            "thumb": thumb_rel,
            "full": full_rel,
            "width": w,
            "height": h,
            "title": prev.get("title") or title_from_name(f.stem),
            "meta": prev.get("meta", ""),
            "alt": prev.get("alt") or title_from_name(f.stem),
        })

    upsert_album(data, args.album, args.label)
    other_photos = [p for p in data["photos"] if p.get("album") != args.album]
    data["photos"] = other_photos + photos

    MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                        encoding="utf-8")

    print(f"photos.json actualizado: {len(photos)} fotos del álbum "
          f"'{args.album}' desde {src_dir}")
    if not HAS_PIL:
        print("Aviso: sin Pillow. Dimensiones leídas de cabecera, sin miniaturas.",
              file=sys.stderr)


if __name__ == "__main__":
    main()
