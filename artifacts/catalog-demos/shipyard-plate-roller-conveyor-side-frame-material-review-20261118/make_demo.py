#!/usr/bin/env python3
"""Build a short audit/demo clip from the retained previews and verification."""

from __future__ import annotations

from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parent
VIDEO = ROOT / "shipyard-plate-roller-conveyor-side-frame-material-review.mp4"
INPUTS = ROOT / "video-inputs"
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
IDS = [
    ("coating-mix-cabinet", "Coating mix cabinet · 224 tris"),
    ("optical-measurement-station", "Optical measurement station · 276 tris"),
    ("pipe-spool-saddle-stand", "Pipe spool saddle stand · 224 tris"),
    ("plate-roller-conveyor", "Plate roller conveyor · 440 tris"),
    ("temporary-work-light-mast", "Temporary work light mast · 364 tris"),
]
BG = "#eef3f6"
INK = "#183044"
MUTED = "#4b6578"
GREEN = "#78847e"
STEEL = "#b6c1c4"


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_PATH, size)


def text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, size: int, color: str = INK) -> None:
    draw.text(xy, value, font=font(size), fill=color)


def new_slide(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    text(draw, (54, 34), title, 34)
    text(draw, (56, 82), subtitle, 18, MUTED)
    draw.line((54, 116, 1226, 116), fill="#c6d2dc", width=2)
    draw.line((54, 680, 1226, 680), fill="#c6d2dc", width=2)
    text(draw, (56, 690), "Local software preview and GLB material check · no simulation, deployment or hardware acceptance", 14, MUTED)
    return image, draw


def place_contain(canvas: Image.Image, path: Path, box: tuple[int, int, int, int]) -> None:
    x, y, width, height = box
    image = Image.open(path).convert("RGB")
    image = ImageOps.contain(image, (width, height), Image.Resampling.LANCZOS)
    canvas.paste(image, (x + (width - image.width) // 2, y + (height - image.height) // 2))


def draw_contact_sheet() -> Path:
    image = Image.new("RGB", (1600, 1050), BG)
    draw = ImageDraw.Draw(image)
    text(draw, (48, 30), "Five unreviewed shipyard equipment previews", 34)
    text(draw, (50, 76), "All five public pages and their default preview PNGs matched the local pre-edit baseline", 20, MUTED)
    card_w, card_h = 470, 420
    positions = [(45, 130), (565, 130), (1085, 130), (305, 580), (825, 580)]
    for (ident, label), (x, y) in zip(IDS, positions, strict=True):
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=14, fill="#ffffff", outline="#c6d2dc", width=2)
        place_contain(image, ROOT / "samples/previews" / f"{ident}.png", (x + 12, y + 12, card_w - 24, 320))
        text(draw, (x + 18, y + 342), label, 19)
        stats = {
            "coating-mix-cabinet": "2.03 × 2.36 × 0.96 m",
            "optical-measurement-station": "0.82 × 1.85 × 0.99 m",
            "pipe-spool-saddle-stand": "1.60 × 1.45 × 0.715 m",
            "plate-roller-conveyor": "2.55 × 1.54 × 0.575 m",
            "temporary-work-light-mast": "1.74 × 3.32 × 1.16 m",
        }[ident]
        text(draw, (x + 18, y + 378), f"Indexed envelope: {stats}", 16, MUTED)
    path = ROOT / "preview-review-five-assets.png"
    image.save(path)
    return path


def build_slides() -> list[Path]:
    INPUTS.mkdir(parents=True, exist_ok=True)
    contact = draw_contact_sheet()
    slides: list[Path] = []

    image, draw = new_slide("Shipyard manufacturing preview audit", "PR #1258 was merged with 17/17 checks successful before this five-asset review")
    audit_positions = [(44, 132), (455, 132), (866, 132), (250, 400), (661, 400)]
    for (ident, label), (x, y) in zip(IDS, audit_positions, strict=True):
        draw.rounded_rectangle((x, y, x + 370, y + 244), radius=12, fill="#ffffff", outline="#c6d2dc", width=2)
        place_contain(image, ROOT / "samples/previews" / f"{ident}.png", (x + 8, y + 6, 354, 190))
        text(draw, (x + 14, y + 201), label, 16)
    slides.append(image)

    image, draw = new_slide("Plate roller conveyor · before / after", "Matched side frames now use the same yard-painted finish")
    text(draw, (180, 138), "BEFORE", 22, MUTED)
    text(draw, (760, 138), "AFTER", 22, MUTED)
    place_contain(image, ROOT / "before/plate-roller-conveyor.png", (90, 170, 500, 450))
    place_contain(image, ROOT / "after/plate-roller-conveyor.png", (690, 170, 500, 450))
    text(draw, (155, 628), "440 triangles · 2.55 × 1.50 × 0.575 m source extents", 19)
    slides.append(image)

    image, draw = new_slide("Material roles in the exported model", "One color assignment changed; the frame geometry and other finishes remain the same")
    place_contain(image, ROOT / "after/plate-roller-conveyor.png", (70, 140, 570, 480))
    text(draw, (710, 178), "side-frame-0", 24)
    draw.rounded_rectangle((710, 220, 785, 270), radius=6, fill=GREEN)
    text(draw, (805, 225), "yardPaint  #78847e", 20)
    text(draw, (710, 302), "side-frame-1", 24)
    draw.rounded_rectangle((710, 344, 785, 394), radius=6, fill=GREEN)
    text(draw, (805, 349), "yardPaint  #78847e", 20)
    text(draw, (710, 430), "rollers · guide rails · feet", 20)
    draw.rounded_rectangle((710, 472, 785, 522), radius=6, fill=STEEL)
    text(draw, (805, 477), "structuralSteel  #b6c1c4", 20)
    slides.append(image)

    image, draw = new_slide("Regression against the actual exported GLB", "The check asserts the parts visible in the model, not only source text or preview pixels")
    text(draw, (120, 178), "BASELINE", 22, MUTED)
    text(draw, (120, 222), "FAIL", 42, "#b23b36")
    text(draw, (260, 232), "side-frame-1 used structuralSteel", 24)
    text(draw, (120, 330), "CORRECTED", 22, MUTED)
    text(draw, (120, 374), "PASS", 42, "#28794f")
    text(draw, (260, 384), "both mirrored side frames use yardPaint", 24)
    text(draw, (120, 474), "440 / 1,800 triangles · presets and geometry unchanged", 21)
    text(draw, (120, 526), "Representative rollers, guides and feet remain structural steel", 21)
    slides.append(image)

    image, draw = new_slide("Verification scope", "The generated index records the changed source hash and existing preview")
    checks = [
        "Focused exported-GLB regression: 1/1 passed; baseline failed",
        "Shipyard ESLint: passed",
        "Shipyard quality gate: 70/70 assets pass",
        "Catalog index hash and preview path: verified",
        "Public previews still match the retained pre-edit baseline",
    ]
    for index, value in enumerate(checks):
        text(draw, (115, 175 + index * 60), f"•  {value}", 23)
    text(draw, (115, 532), "Local preview and model-material verification only.", 21, MUTED)
    slides.append(image)

    paths = []
    for index, slide in enumerate(slides, 1):
        path = INPUTS / f"slide-{index:02d}.png"
        slide.save(path)
        paths.append(path)
    return paths


def main() -> None:
    slides = build_slides()
    manifest = INPUTS / "ffmpeg-concat.txt"
    lines = []
    for path in slides:
        lines.extend([f"file '{path.as_posix()}'", "duration 3.0"])
    lines.append(f"file '{slides[-1].as_posix()}'")
    manifest.write_text("\n".join(lines) + "\n", encoding="utf-8")
    subprocess.run(
        [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(manifest),
            "-fps_mode", "cfr", "-r", "30", "-c:v", "libx264", "-preset", "medium",
            "-crf", "22", "-pix_fmt", "yuv420p", "-t", "15", str(VIDEO),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
    )
    print(VIDEO)


if __name__ == "__main__":
    main()
