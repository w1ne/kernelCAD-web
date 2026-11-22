#!/usr/bin/env python3
"""Build a short, local-only MP4 of the five-preview semantic review."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


BUNDLE = Path(__file__).resolve().parent
OUTPUT = BUNDLE / "recycling-facility-five-preview-semantic-review.mp4"
SLIDES = BUNDLE / "video-inputs"
SLIDES.mkdir(parents=True, exist_ok=True)

ASSETS = [
    (
        "Twin-shaft shredder",
        "Two cutter shafts, a flared feed hopper, opposed drives and a discharge chute are visible. Body paint, cutter steel, drive paint and safety trim read as separate zones.",
        "Public asset source and preview match this branch.",
    ),
    (
        "Optical sorter arch",
        "A portal frame spans the sorting belt. The hooded sensor head, detector slot, angled lamp housings, air knife and split bunkers are visible; the material zones read coherently.",
        "Public site still serves the earlier 208-triangle version; this branch preview is 1,420 triangles.",
    ),
    (
        "Overband magnet separator",
        "The suspended cross-belt magnet sits above the feed conveyor, with a discharge chute and scrap skip. Magnet housing, gantry, belts and ferrous load have distinct plausible finishes.",
        "Public asset source and preview match this branch.",
    ),
    (
        "Glass washer trommel",
        "An inclined screened drum sits on riding tyres and trunnions; spray header, sump, feed and discharge chutes are visible. Stainless, painted steel, water pipework and wet cullet read separately.",
        "Public site still serves the earlier 400-triangle version; this branch preview is 3,122 triangles.",
    ),
    (
        "Granulator",
        "The open feed hopper exposes the rotor and knives. The flywheel drive, rubber belts and regrind bin of plastic flakes are distinct from the painted body.",
        "Public site still serves the earlier 408-triangle version; this branch preview is 1,478 triangles.",
    ),
]

WIDTH, HEIGHT = 1280, 720
BG = "#f2f5f7"
INK = "#182b3a"
MUTED = "#526575"
ACCENT = "#286b57"
WHITE = "#ffffff"
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
FONT = FONT_DIR / "DejaVuSans.ttf"
BOLD = FONT_DIR / "DejaVuSans-Bold.ttf"


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def draw_wrapped(draw: ImageDraw.ImageDraw, text: str, xy: tuple[int, int], use_font: ImageFont.FreeTypeFont, max_width: int, fill: str, line_gap: int = 10) -> int:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=use_font)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    draw.multiline_text(xy, "\n".join(lines), font=use_font, fill=fill, spacing=line_gap)
    return len(lines) * (use_font.size + line_gap)


def top_bar(draw: ImageDraw.ImageDraw, label: str) -> None:
    draw.rectangle((0, 0, WIDTH, 78), fill=INK)
    draw.text((54, 21), label, font=font(BOLD, 30), fill=WHITE)


def make_title_slide() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    top_bar(draw, "KernelCAD catalog · semantic preview review")
    draw.text((70, 172), "Recycling facility machinery", font=font(BOLD, 46), fill=INK)
    draw_wrapped(draw, "Five rendered assets reviewed for readable silhouettes, plausible material zones, dimensions and label identity.", (72, 268), font(FONT, 28), 1080, MUTED, 14)
    draw.rounded_rectangle((72, 430, 608, 492), 18, fill=ACCENT)
    draw.text((104, 446), "No confirmed material mismatch", font=font(BOLD, 23), fill=WHITE)
    draw.text((72, 556), "12 November 2026 · local branch review · no source or index change", font=font(FONT, 21), fill=MUTED)
    return image


def make_asset_slide(index: int, asset: tuple[str, str, str]) -> Image.Image:
    name, observation, public_note = asset
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    top_bar(draw, f"Rendered preview {index} / 5")
    preview_path = BUNDLE / "sample" / f"{name.lower().replace(' ', '-')}.png"
    with Image.open(preview_path) as source:
        preview = ImageOps.contain(source.convert("RGBA"), (530, 530))
    card = Image.new("RGB", (560, 560), WHITE)
    px = (560 - preview.width) // 2
    py = (560 - preview.height) // 2
    card.paste(preview, (px, py), preview)
    image.paste(card, (40, 112))
    draw.text((650, 130), name, font=font(BOLD, 35), fill=INK)
    draw.rounded_rectangle((650, 195, 1042, 246), 16, fill=ACCENT)
    draw.text((676, 207), "No confirmed material mismatch", font=font(BOLD, 18), fill=WHITE)
    draw_wrapped(draw, observation, (650, 286), font(FONT, 24), 570, INK, 12)
    draw_wrapped(draw, public_note, (650, 522), font(FONT, 18), 570, MUTED, 8)
    draw.text((650, 648), "Local catalog render · not a manufacturing acceptance", font=font(FONT, 16), fill=MUTED)
    return image


def make_result_slide() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    top_bar(draw, "Review result")
    draw.text((72, 164), "No valid defect found in this sample.", font=font(BOLD, 39), fill=INK)
    draw.text((74, 260), "Catalog source: unchanged", font=font(BOLD, 26), fill=ACCENT)
    draw.text((74, 312), "Generated index: unchanged", font=font(BOLD, 26), fill=ACCENT)
    draw_wrapped(draw, "PR #1258 was open and mergeable with all 17 reported checks successful. The checked-in branch previews were reviewed locally. The public site still serves older source/render pairs for three assets; this review does not claim deployment.", (74, 402), font(FONT, 24), 1100, MUTED, 12)
    return image


slides = [make_title_slide()]
slides.extend(make_asset_slide(index, asset) for index, asset in enumerate(ASSETS, 1))
slides.append(make_result_slide())
for number, slide in enumerate(slides, 1):
    slide.save(SLIDES / f"slide-{number:02}.png")

concat = BUNDLE / "video-inputs" / "slides.ffconcat"
lines = ["ffconcat version 1.0"]
for number in range(1, len(slides) + 1):
    lines.append(f"file 'slide-{number:02}.png'")
    lines.append("duration 2.4")
lines.append(f"file 'slide-{len(slides):02}.png'")
concat.write_text("\n".join(lines) + "\n")

command = [
    "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", "slides.ffconcat",
    "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "veryfast",
    "-crf", "23", "-movflags", "+faststart", "-an", str(OUTPUT),
]
result = subprocess.run(command, cwd=SLIDES, text=True, capture_output=True, check=True)
(BUNDLE / "video-capture-output.txt").write_text(
    "Command: " + " ".join(command) + "\n\n" + result.stdout + result.stderr
)
print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size} bytes)")
