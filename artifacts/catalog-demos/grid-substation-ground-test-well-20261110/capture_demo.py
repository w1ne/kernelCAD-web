#!/usr/bin/env python3
"""Build a short MP4 from the actual before, source-variant, and catalog previews."""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
FRAMES = BUNDLE / "frames"
W, H = 1280, 720
BG = (235, 241, 246)
INK = (31, 47, 59)
MUTED = (90, 107, 119)
ACCENT = (38, 119, 135)
WHITE = (255, 255, 255)
ASSET = "substation-ground-grid-test-well"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    path = Path("/usr/share/fonts/truetype/dejavu") / name
    return ImageFont.truetype(str(path), size)


def base(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, W, 94), fill=INK)
    draw.text((38, 18), title, font=font(34, True), fill=WHITE)
    draw.text((40, 112), subtitle, font=font(21), fill=MUTED)
    return image, draw


def draw_card(image: Image.Image, draw: ImageDraw.ImageDraw, path: Path, x: int, y: int, label: str, subtitle: str = "") -> None:
    width, height = 370, 500
    draw.rounded_rectangle((x, y, x + width, y + height), radius=14, fill=WHITE, outline=(206, 217, 225), width=2)
    draw.text((x + 18, y + 12), label, font=font(21, True), fill=ACCENT)
    if subtitle:
        draw.text((x + 18, y + 40), subtitle, font=font(15), fill=MUTED)
    source = Image.open(path).convert("RGB")
    thumb = ImageOps.contain(source, (width - 18, height - 84), method=Image.Resampling.LANCZOS)
    image.paste(thumb, (x + (width - thumb.width) // 2, y + 72 + (height - 84 - thumb.height) // 2))


def slide_before_after() -> Image.Image:
    image, draw = base("Ground-grid test well", "A targeted silhouette repair to an existing grid-substation catalog asset")
    draw_card(image, draw, BUNDLE / "before" / (ASSET + ".png"), 250, 170, "BEFORE", "Block with a small copper cap")
    draw_card(image, draw, ROOT / "catalog/kits/grid-substation/previews" / (ASSET + ".png"), 660, 170, "AFTER", "Collar, bolted lid, conduits, test terminal")
    return image


def slide_depths() -> Image.Image:
    image, draw = base("Chamber depth is a real geometry choice", "The well changes height when the user selects 360, 480, or 620 mm")
    ids = [("depth-360", "360 mm"), ("depth-480", "480 mm"), ("depth-620", "620 mm")]
    for index, (variant, label) in enumerate(ids):
        draw_card(image, draw, BUNDLE / "variants" / (variant + ".png"), 42 + index * 410, 172, label)
    return image


def slide_materials() -> Image.Image:
    image, draw = base("Material controls and named finish", "Concrete, stainless steel, and copper stay independently editable")
    draw_card(image, draw, BUNDLE / "variants" / "depth-480.png", 250, 170, "DEFAULT MATERIALS", "Concrete · stainless steel · copper")
    draw_card(image, draw, BUNDLE / "variants" / "depth-480-maintenance.png", 660, 170, "MAINTENANCE", "Named palette updates all three materials")
    return image


def slide_checks() -> Image.Image:
    evidence = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    image, draw = base("Local source and catalog checks", "No asset IDs or catalog count were added")
    lines = [
        str(evidence["kitPreviewCount"]) + " grid-substation previews rendered; catalog index rebuilt",
        "Quality gate: " + str(evidence["qualityPass"]) + "/" + str(evidence["qualityTotal"]) + " (" + evidence["qualityPassRate"] + ")",
        "Ground test well: " + str(evidence["triangles"]) + " triangles under a " + str(evidence["triangleBudget"]) + " budget",
        "ESLint: " + ("PASS" if evidence["eslint"] else "FAIL") + "    Integration suite: " + ("PASS" if evidence["integration"] else "FAIL"),
        "Depth variants and maintenance palette: source-driven render checks pass",
    ]
    y = 215
    for line in lines:
        draw.ellipse((92, y + 8, 112, y + 28), fill=ACCENT)
        draw.text((140, y), line, font=font(21, True), fill=INK)
        y += 62
    draw.rounded_rectangle((74, 566, 1206, 640), radius=12, fill=INK)
    draw.text((99, 585), "Local preview evidence only. This branch is not deployed; no electrical acceptance is claimed.", font=font(18, True), fill=WHITE)
    return image


def main() -> None:
    verification = json.loads((BUNDLE / "verification.json").read_text(encoding="utf-8"))
    required = ("render", "index", "quality", "eslint", "integration", "localPage")
    if not all(verification.get(key) for key in required):
        raise SystemExit("verification.json is incomplete; refusing to create the demo")
    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg is required to create the MP4")
    FRAMES.mkdir(parents=True, exist_ok=True)
    slides = [slide_before_after(), slide_depths(), slide_materials(), slide_checks()]
    entries: list[str] = []
    for index, slide in enumerate(slides, start=1):
        path = FRAMES / ("slide-" + str(index).zfill(2) + ".png")
        slide.save(path, optimize=True)
        entries.extend(("file '" + path.as_posix() + "'", "duration 3.0"))
    entries.append("file '" + (FRAMES / "slide-04.png").as_posix() + "'")
    concat = BUNDLE / "slides.ffconcat"
    concat.write_text("\n".join(entries) + "\n", encoding="utf-8")
    output = BUNDLE / "grid-substation-ground-test-well.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0",
        "-i", str(concat), "-vf", "fps=24,format=yuv420p", "-c:v", "libx264", "-crf", "22",
        "-movflags", "+faststart", str(output),
    ], check=True)
    print("created " + str(output.relative_to(ROOT)) + " (" + str(output.stat().st_size) + " bytes)")


if __name__ == "__main__":
    main()
