#!/usr/bin/env python3
"""Create a compact before/after MP4 from the three catalog preview corrections."""
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
ASSETS = [
    ("substation-dead-tank-breaker", "Dead tank circuit breaker", "Tank barrels and seated porcelain bushings"),
    ("substation-oil-containment-bund", "Oil containment bund", "Internal grating and corner drain sump"),
    ("substation-grading-ring-stand", "Grading ring stand", "Open octagonal ring on an insulator support"),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    path = Path("/usr/share/fonts/truetype/dejavu") / name
    return ImageFont.truetype(str(path), size)


def base(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, W, 96), fill=INK)
    draw.text((38, 20), title, font=font(34, True), fill=WHITE)
    draw.text((40, 112), subtitle, font=font(21), fill=MUTED)
    return image, draw


def fit_card(draw: ImageDraw.ImageDraw, path: Path, x: int, y: int, label: str) -> None:
    width, height = 552, 520
    draw.rounded_rectangle((x, y, x + width, y + height), radius=12, fill=WHITE, outline=(206, 217, 225), width=2)
    draw.text((x + 18, y + 12), label, font=font(22, True), fill=ACCENT if label == "AFTER" else MUTED)
    source = Image.open(path).convert("RGB")
    thumb = ImageOps.contain(source, (width - 20, height - 58), method=Image.Resampling.LANCZOS)
    image_x = x + (width - thumb.width) // 2
    image_y = y + 48 + (height - 58 - thumb.height) // 2
    # Paste via the destination image in the caller after saving on the draw object.
    draw._image_to_paste = (thumb, image_x, image_y)


def paste_pending(image: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    pending = getattr(draw, "_image_to_paste", None)
    if pending:
        image.paste(pending[0], (pending[1], pending[2]))
        delattr(draw, "_image_to_paste")


def render_flow() -> Image.Image:
    image, draw = base("Grid-substation asset refinement", "Three native .kcad.ts edits, followed by local previews and an index rebuild")
    steps = [
        ("1", "Correct source geometry", "Seat breaker bushings, contain the bund grates, open the grading ring."),
        ("2", "Render the existing assets", "The three asset IDs and their material presets stay in place."),
        ("3", "Regenerate catalog index", "The index records the current source hashes and preview paths."),
    ]
    y = 190
    for number, heading, body in steps:
        draw.rounded_rectangle((80, y, 1200, y + 115), radius=12, fill=WHITE, outline=(206, 217, 225), width=2)
        draw.ellipse((102, y + 23, 170, y + 91), fill=ACCENT)
        draw.text((126, y + 35), number, font=font(28, True), fill=WHITE, anchor="mm")
        draw.text((198, y + 20), heading, font=font(25, True), fill=INK)
        draw.text((198, y + 61), body, font=font(18), fill=MUTED)
        y += 135
    draw.text((80, 630), "Local preview workflow; the feature branch is not deployed.", font=font(18, True), fill=ACCENT)
    return image


def render_compare(asset_id: str, title: str, detail: str) -> Image.Image:
    image, draw = base(title, detail)
    before = BUNDLE / "before" / f"{asset_id}.png"
    after = ROOT / "catalog" / "kits" / "grid-substation" / "previews" / f"{asset_id}.png"
    fit_card(draw, before, 48, 166, "BEFORE")
    paste_pending(image, draw)
    fit_card(draw, after, 680, 166, "AFTER")
    paste_pending(image, draw)
    draw.rounded_rectangle((48, 620, 1232, 678), radius=10, fill=INK)
    draw.text((70, 636), "Same catalog asset ID and color controls  |  Shape and placement corrected in source", font=font(18, True), fill=WHITE)
    return image


def render_close(verification: dict) -> Image.Image:
    image, draw = base("Verified catalog correction", "Local source and catalog evidence")
    eslint_status = "PASS" if verification["eslint"] else "FAIL"
    integration_status = "PASS" if verification["integration"] else "FAIL"
    lines = [
        f"{verification['previewCount']} grid-substation previews rendered; catalog index rebuilt",
        f"Quality gate: {verification['qualityPass']} / {verification['qualityTotal']} assets pass ({verification['qualityPassRate']})",
        f"Three changed meshes: {verification['triangleCounts']} triangles; budgets remain 1,800 each",
        f"ESLint: {eslint_status}    Integration suite: {integration_status}",
    ]
    y = 202
    for line in lines:
        draw.ellipse((90, y + 7, 112, y + 29), fill=ACCENT)
        draw.text((140, y), line, font=font(22, True), fill=INK)
        y += 70
    draw.rounded_rectangle((80, 508, 1200, 625), radius=12, fill=INK)
    draw.text((112, 530), "Local render only. No deployment, electrical rating, safety approval,", font=font(20, True), fill=WHITE)
    draw.text((112, 566), "field performance, or hardware acceptance is claimed.", font=font(20, True), fill=WHITE)
    draw.text((80, 650), "No new assets or catalog IDs.", font=font(18, True), fill=ACCENT)
    return image


def main() -> None:
    verification_path = BUNDLE / "verification.json"
    verification = json.loads(verification_path.read_text(encoding="utf-8"))
    if not all(verification.get(key) for key in ("render", "index", "quality", "eslint", "integration", "localPages")):
        raise SystemExit("verification.json is incomplete; refusing to record an unverified demo")
    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg is required to create the MP4")
    FRAMES.mkdir(parents=True, exist_ok=True)
    slides = [render_flow()]
    slides.extend(render_compare(*asset) for asset in ASSETS)
    slides.append(render_close(verification))
    entries = []
    for index, slide in enumerate(slides, start=1):
        path = FRAMES / f"slide-{index:02d}.png"
        slide.save(path, optimize=True)
        entries.extend((f"file '{path.as_posix()}'", "duration 3.0"))
    entries.append(f"file '{(FRAMES / f'slide-{len(slides):02d}.png').as_posix()}'")
    concat = BUNDLE / "slides.ffconcat"
    concat.write_text("\n".join(entries) + "\n", encoding="utf-8")
    output = BUNDLE / "grid-substation-silhouette-refinement.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0",
        "-i", str(concat), "-vf", "fps=24,format=yuv420p", "-c:v", "libx264", "-crf", "27",
        "-movflags", "+faststart", str(output),
    ], check=True)
    print(f"created {output.relative_to(ROOT)} ({output.stat().st_size} bytes, {len(slides)} slides)")


if __name__ == "__main__":
    main()
