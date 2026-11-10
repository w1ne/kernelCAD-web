#!/usr/bin/env python3
"""Arrange three already-rendered catalog previews for the retained visual review."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
OUT = BUNDLE / "preview-review/three-previews.png"
ROWS = (
    ("Cable gland", "catalog/kits/standard-components/previews/cable-gland.png"),
    ("Square mounting flange", "catalog/kits/standard-components/previews/square-mounting-flange.png"),
    ("Bulkhead adapter", "catalog/kits/standard-components/previews/bulkhead-adapter.png"),
)


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGB", (1536, 600), "#101923")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 19)
    for index, (label, relative) in enumerate(ROWS):
        x = 12 + index * 512
        draw.text((x + 14, 10), label, font=font, fill="#eef3f5")
        preview = Image.open(ROOT / relative).convert("RGB")
        preview.thumbnail((488, 520), Image.Resampling.LANCZOS)
        sheet.paste(preview, (x + (512 - preview.width) // 2, 48 + (520 - preview.height) // 2))
    sheet.save(OUT, optimize=True)
    print(f"Wrote {OUT.relative_to(ROOT)} from {len(ROWS)} generated previews.")


if __name__ == "__main__":
    main()
