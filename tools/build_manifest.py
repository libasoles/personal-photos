#!/usr/bin/env python3
"""
build_manifest.py — regenera photos.json a partir de las imágenes en images/

Uso:
    python3 tools/build_manifest.py                 # regenera photos.json
    python3 tools/build_manifest.py --thumbs        # además genera miniaturas
    python3 tools/build_manifest.py --src ~/Fotos   # importa desde otra carpeta

Qué hace:
  - recorre images/ (o --src) buscando jpg/jpeg/png/webp
  - lee ancho y alto reales de cada archivo (necesario para que el masonry
    no salte al cargar)
  - conserva title, meta y category de las fotos que ya estaban en photos.json,
    emparejando por nombre de archivo, para no perder los textos al regenerar
  - con --thumbs crea images/thumbs/<nombre>.jpg a 600px de ancho

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
    from PIL import Image
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


def load_previous():
    """Textos ya escritos a mano, indexados por nombre de archivo."""
    if not MANIFEST.exists():
        return {}, {}
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    by_file = {}
    for p in data.get("photos", []):
        by_file[Path(p.get("full") or p.get("thumb", "")).name] = p
    return by_file, data


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(ROOT / "images"),
                    help="carpeta con las fotos a tamaño completo")
    ap.add_argument("--thumbs", action="store_true",
                    help="generar miniaturas en images/thumbs/")
    args = ap.parse_args()

    src_dir = Path(args.src).expanduser().resolve()
    if not src_dir.is_dir():
        raise SystemExit(f"No existe la carpeta: {src_dir}")

    previous, data = load_previous()
    if not data:
        data = {"site": {}, "categories": [{"id": "all", "label": "Todas"}], "photos": []}

    files = sorted(
        p for p in src_dir.iterdir()
        if p.suffix.lower() in EXTS
        and p.is_file()
        and not p.name.startswith("thumb-")
    )
    if not files:
        raise SystemExit(f"No se encontraron imágenes en {src_dir}")

    photos = []
    for f in files:
        w, h = image_size(f)
        prev = previous.get(f.name, {})

        if args.thumbs:
            thumb_path = make_thumb(f, ROOT / "images" / "thumbs")
            thumb_rel = thumb_path.relative_to(ROOT).as_posix()
        else:
            thumb_rel = prev.get("thumb") or f"images/{f.name}"

        photos.append({
            "id": f.stem,
            "category": prev.get("category", "all"),
            "thumb": thumb_rel,
            "full": f"images/{f.name}",
            "width": w,
            "height": h,
            "title": prev.get("title") or title_from_name(f.stem),
            "meta": prev.get("meta", ""),
            "alt": prev.get("alt") or title_from_name(f.stem),
        })

    data["photos"] = photos
    MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                        encoding="utf-8")

    print(f"photos.json actualizado: {len(photos)} fotos desde {src_dir}")
    if not HAS_PIL:
        print("Aviso: sin Pillow. Dimensiones leídas de cabecera, sin miniaturas.",
              file=sys.stderr)


if __name__ == "__main__":
    main()
