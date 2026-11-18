#!/usr/bin/env python3
"""Create a labeled contact sheet for visual review of all 70 previews."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
index = json.loads((ROOT / "catalog" / "index.json").read_text(encoding="utf-8"))
rows = [row for row in index["assets"] if row["kit"] == "shipyard"]
if len(rows) != 70:
    raise SystemExit(f"expected 70 shipyard rows, found {len(rows)}")
columns, cell_w, cell_h, image_h = 5, 228, 220, 180
sheet = Image.new("RGB", (columns * cell_w, ((len(rows) + columns - 1) // columns) * cell_h), "#eff2ef")
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
for i, row in enumerate(rows):
    x, y = (i % columns) * cell_w, (i // columns) * cell_h
    path = ROOT / "catalog" / "kits" / "shipyard" / "previews" / f"{row['id']}.png"
    if not path.is_file():
        raise SystemExit(f"missing preview for {row['id']}")
    image = Image.open(path).convert("RGB")
    image.thumbnail((image_h, image_h), Image.Resampling.LANCZOS)
    sheet.paste(image, (x + (cell_w - image.width) // 2, y + 2))
    label = row["id"]
    lines = [label[j:j + 29] for j in range(0, len(label), 29)][:2]
    draw.text((x + 7, y + image_h + 7), "\n".join(lines), fill="#25332f", font=font, spacing=2)
target = BUNDLE / "preview-review" / "all-70-contact-sheet.png"
target.parent.mkdir(parents=True, exist_ok=True)
sheet.save(target, optimize=True)
print(json.dumps({"assets": len(rows), "columns": columns, "rows": (len(rows) + columns - 1) // columns,
                  "contactSheet": str(target.relative_to(ROOT))}, indent=2))
