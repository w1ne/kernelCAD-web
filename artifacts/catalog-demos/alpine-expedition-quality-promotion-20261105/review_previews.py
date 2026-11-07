#!/usr/bin/env python3
"""Save original comparison previews and a contact sheet of the final 50."""

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
KIT = ROOT / "catalog/kits/alpine-expedition"
BEFORE = BUNDLE / "before"
REVIEW = BUNDLE / "preview-review"
IDS = [path.name.removesuffix(".kcad.ts") for path in sorted(KIT.glob("*.kcad.ts"))]
CELL_W, CELL_H, LABEL_H = 240, 250, 28


def main() -> None:
    BEFORE.mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(parents=True, exist_ok=True)
    for asset_id in ("alpine-helmet", "basecamp-dome-tent", "ice-axe"):
        data = subprocess.check_output(
            ["git", "show", f"HEAD:catalog/kits/alpine-expedition/previews/{asset_id}.png"], cwd=ROOT
        )
        (BEFORE / (asset_id + ".png")).write_bytes(data)

    columns = 5
    rows = (len(IDS) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * CELL_W, rows * (CELL_H + LABEL_H)), "#eaf0f5")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
    for index, asset_id in enumerate(IDS):
        x = (index % columns) * CELL_W
        y = (index // columns) * (CELL_H + LABEL_H)
        preview = Image.open(KIT / "previews" / (asset_id + ".png")).convert("RGB")
        preview.thumbnail((CELL_W - 8, CELL_H - 8), Image.Resampling.LANCZOS)
        sheet.paste(preview, (x + (CELL_W - preview.width) // 2, y + (CELL_H - preview.height) // 2))
        draw.text((x + 7, y + CELL_H), asset_id, fill="#283b4b", font=font)
    sheet.save(REVIEW / "contact-sheet.png", optimize=True)
    print(f"saved {len(IDS)} reviewed previews to {REVIEW / 'contact-sheet.png'}")


if __name__ == "__main__":
    main()
