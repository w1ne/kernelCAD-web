#!/usr/bin/env python3
"""Make a review sheet from the five rendered previews in the audit ledger."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUT = BUNDLE / "preview-review/five-rendered-previews.png"
ASSETS = [
    ("industrial-plant", "centrifugal-chiller"),
    ("industrial-plant", "forklift-truck"),
    ("industrial-plant", "shell-and-tube-exchanger"),
    ("industrial-plant", "industrial-transformer"),
    ("water-treatment", "pressure-sand-filter-vessel"),
]
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
CELL_W, CELL_H, IMAGE_SIZE, GAP = 520, 570, 500, 18
cols = 2
rows = (len(ASSETS) + cols - 1) // cols
sheet = Image.new("RGB", (cols * CELL_W + GAP, rows * CELL_H + GAP), "#e8edf2")
draw = ImageDraw.Draw(sheet)
for index, (kit, asset_id) in enumerate(ASSETS):
    x = GAP + (index % cols) * CELL_W
    y = GAP + (index // cols) * CELL_H
    draw.rounded_rectangle((x, y, x + CELL_W - 12, y + CELL_H - 12), radius=12, fill="#f5f7f9", outline="#bcc6cf", width=2)
    draw.text((x + 16, y + 10), f"{kit} / {asset_id}", fill="#263746", font=ImageFont.truetype(BOLD, 16))
    path = ROOT / "catalog" / "kits" / kit / "previews" / f"{asset_id}.png"
    image = Image.open(path).convert("RGB")
    image.thumbnail((IMAGE_SIZE, IMAGE_SIZE), Image.Resampling.LANCZOS)
    sheet.paste(image, (x + 6, y + 42))
OUT.parent.mkdir(parents=True, exist_ok=True)
sheet.save(OUT, optimize=True)
print(f"wrote {OUT}")
