#!/usr/bin/env python3
"""Create a short, readable local demo from generated previews and presets."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = ROOT / "artifacts/catalog-demos/ev-charging-infrastructure-quality-promotion-20261105"
KIT = ROOT / "catalog/kits/ev-charging-infrastructure"
EVIDENCE = BUNDLE / "evidence"
FRAMES = BUNDLE / "frames"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
WIDTH, HEIGHT = 1280, 720
INK = (23, 38, 46)
MUTED = (78, 101, 111)
TEAL = (42, 125, 141)
PAPER = (242, 246, 247)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)


def canvas(title: str, subtitle: str, index: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 12), fill=TEAL)
    draw.text((58, 42), f"EV CHARGING INFRASTRUCTURE  ·  QUALITY PROMOTION  ·  {index:02d}/06", font=font(17, True), fill=TEAL)
    draw.text((58, 80), title, font=font(34, True), fill=INK)
    draw.text((58, 128), subtitle, font=font(19), fill=MUTED)
    draw.line((58, 665, 1222, 665), fill=(202, 216, 220), width=2)
    draw.text((58, 681), "Local source and preview behavior  ·  not deployed  ·  not hardware acceptance", font=font(15), fill=MUTED)
    return image, draw


def paste_preview(image: Image.Image, path: Path, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    width, height = x1 - x0, y1 - y0
    preview = Image.open(path).convert("RGBA")
    preview.thumbnail((width, height), Image.Resampling.LANCZOS)
    background = Image.new("RGBA", (width, height), (252, 253, 253, 255))
    pos = ((width - preview.width) // 2, (height - preview.height) // 2)
    background.alpha_composite(preview, pos)
    image.paste(background.convert("RGB"), (x0, y0))
    ImageDraw.Draw(image).rectangle((x0, y0, x1, y1), outline=(207, 220, 224), width=2)


def save(image: Image.Image, name: str) -> None:
    image.save(FRAMES / name, optimize=True)


def main() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    frames: list[Path] = []

    image, draw = canvas("One model. Four material controls.", "The charger keeps its existing scale control while its components gain separate finishes.", 1)
    paste_preview(image, EVIDENCE / "before/compact-dc-fast-charger.png", (70, 190, 590, 610))
    paste_preview(image, KIT / "previews/compact-dc-fast-charger.png", (690, 190, 1210, 610))
    draw.text((92, 620), "Original · one flat finish", font=font(19, True), fill=MUTED)
    draw.text((734, 620), "Promoted · shell, glass, cable, connector", font=font(19, True), fill=INK)
    save(image, "slide-01-materials.png")
    frames.append(FRAMES / "slide-01-materials.png")

    image, draw = canvas("Color controls follow named components.", "The source assigns a material control to each component and exposes coordinated presets.", 2)
    draw.rounded_rectangle((88, 202, 1192, 568), radius=18, fill=(29, 43, 52))
    code = [
        "const powderCoat = param('powderCoat', '#397f90', ...);",
        "const displayGlass = param('displayGlass', '#79cfda', ...);",
        "const cableElastomer = param('cableElastomer', '#1b2427', ...);",
        "const engineeringPolymer = param('engineeringPolymer', '#657f84', ...);",
        "presets({ fleetReady: { ... }, nightService: { ... } });",
        "main-enclosure  → powderCoat    display-window → displayGlass",
        "charging-cable  → cableElastomer  connector     → engineeringPolymer",
    ]
    for row, line in enumerate(code):
        draw.text((124, 232 + row * 44), line, font=font(20, row >= 5), fill=(229, 240, 242) if row < 5 else (125, 215, 208))
    save(image, "slide-02-source.png")
    frames.append(FRAMES / "slide-02-source.png")

    image, draw = canvas("The preview reads as its object.", "Charger, connector, and solar canopy previews are generated from the promoted source files.", 3)
    items = [
        ("compact-dc-fast-charger", "Compact DC fast charger"),
        ("nacs-connector", "Generic connector form"),
        ("solar-ev-carport", "Solar charging canopy"),
    ]
    for i, (asset_id, label) in enumerate(items):
        x0 = 74 + i * 402
        paste_preview(image, KIT / "previews" / f"{asset_id}.png", (x0, 198, x0 + 360, 560))
        draw.text((x0 + 5, 575), label, font=font(18, True), fill=INK)
    save(image, "slide-03-silhouettes.png")
    frames.append(FRAMES / "slide-03-silhouettes.png")

    image, draw = canvas("Presets change the actual preview.", "Rendered through the catalog variant source path from the values stored in each preset.", 4)
    items = [
        ("compact-dc-fast-charger-default.png", "Default"),
        ("compact-dc-fast-charger-fleetReady.png", "fleetReady"),
        ("compact-dc-fast-charger-nightService.png", "nightService"),
    ]
    for i, (filename, label) in enumerate(items):
        x0 = 72 + i * 402
        paste_preview(image, EVIDENCE / filename, (x0, 198, x0 + 360, 560))
        draw.text((x0 + 6, 575), label, font=font(18, True), fill=INK)
    save(image, "slide-04-presets.png")
    frames.append(FRAMES / "slide-04-presets.png")

    image, draw = canvas("All 50 existing IDs have refreshed previews.", "The preview-backed catalog index is rebuilt from these source files.", 5)
    ids = sorted(path.name.removesuffix(".png") for path in (KIT / "previews").glob("*.png"))
    cell_w, cell_h = 110, 100
    start_x, start_y = 82, 190
    for i, asset_id in enumerate(ids):
        col, row = i % 10, i // 10
        x0, y0 = start_x + col * 112, start_y + row * 88
        preview = Image.open(KIT / "previews" / f"{asset_id}.png").convert("RGBA")
        preview.thumbnail((cell_w - 4, cell_h - 20), Image.Resampling.LANCZOS)
        background = Image.new("RGBA", (cell_w, cell_h), (252, 253, 253, 255))
        background.alpha_composite(preview, ((cell_w - preview.width) // 2, 0))
        image.paste(background.convert("RGB"), (x0, y0))
        draw.text((x0 + 2, y0 + cell_h - 18), asset_id[:16], font=font(9), fill=MUTED)
    save(image, "slide-05-catalog.png")
    frames.append(FRAMES / "slide-05-catalog.png")

    verification = json.loads((BUNDLE / "verification.json").read_text())
    image, draw = canvas("Local quality gates and previews updated.", "Catalog source checks are reported separately from hosted deployment and physical acceptance.", 6)
    rows = [
        f"{verification['kit']['passed']}/{verification['kit']['total']} EV assets pass checkCatalogQuality.py",
        f"{verification['kit']['materialControls']} material controls · {verification['kit']['namedPresets']} named presets",
        f"{verification['kit']['previewsRendered']} rendered previews present and indexed",
        f"Global catalog: {verification['catalog']['passed']}/{verification['catalog']['total']} pass ({verification['catalog']['passRate']})",
        f"Lint: {'passed' if verification['lint']['passed'] else 'failed'}   ·   Integration: {verification['integration']['filesPassed']} files / {verification['integration']['testsPassed']} tests passed",
    ]
    for row, text in enumerate(rows):
        draw.rounded_rectangle((95, 205 + row * 72, 1185, 258 + row * 72), radius=12, fill=(255, 255, 255), outline=(207, 220, 224), width=2)
        draw.text((125, 220 + row * 72), text, font=font(21, row == 0), fill=INK)
    save(image, "slide-06-local-checks.png")
    frames.append(FRAMES / "slide-06-local-checks.png")

    output = BUNDLE / "ev-charging-infrastructure-quality-promotion.mp4"
    # Use a concat list so the ordered slide filenames remain explicit.
    concat = FRAMES / "slides.txt"
    concat.write_text("".join(f"file '{frame.name}'\nduration 4\n" for frame in frames) + f"file '{frames[-1].name}'\n")
    command = [
        "ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat),
        "-vf", "fps=24,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "25", "-movflags", "+faststart", str(output),
    ]
    subprocess.run(command, cwd=FRAMES, check=True)
    print(f"wrote {output.relative_to(ROOT)} ({len(frames)} slides, 24 seconds)")


if __name__ == "__main__":
    main()
