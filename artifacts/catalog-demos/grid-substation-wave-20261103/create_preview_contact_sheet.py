#!/usr/bin/env python3
"""Create a labeled contact sheet of the new kit's generated previews."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "catalog/kits/grid-substation"
OUTPUT = Path(__file__).resolve().parent / "preview-review/all-80-contact-sheet.png"
files = sorted((KIT / "previews").glob("*.png"))
if len(files) != 80:
    raise SystemExit(f"expected 80 previews, found {len(files)}")

columns = 8
cell_width = 210
image_size = 190
label_height = 50
rows = (len(files) + columns - 1) // columns
sheet = Image.new("RGB", (columns * cell_width, rows * (image_size + label_height)), "#e7ebe8")
draw = ImageDraw.Draw(sheet)
font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
font = ImageFont.truetype(font_path, 10)
for index, path in enumerate(files):
    source = Image.open(path).convert("RGB")
    source.thumbnail((image_size, image_size), Image.Resampling.LANCZOS)
    x = (index % columns) * cell_width + (cell_width - source.width) // 2
    y = (index // columns) * (image_size + label_height)
    sheet.paste(source, (x, y))
    label = path.stem.removeprefix("substation-").replace("-", " ")
    draw.text(((index % columns) * cell_width + 5, y + image_size + 3), label[:32], fill="#24302d", font=font)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
sheet.save(OUTPUT)
print(f"wrote {OUTPUT} with {len(files)} previews")
