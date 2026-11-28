#!/usr/bin/env python3
"""Build the short, local terminal-gland review walkthrough (3 slides, 1280x720)."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
VIDEO_INPUTS = BUNDLE / "video-inputs"
VIDEO_INPUTS.mkdir(parents=True, exist_ok=True)
WIDTH, HEIGHT = 1280, 720
BG, INK, MUTED, ACCENT, CARD = "#f2f6fa", "#172b3a", "#4e6472", "#1b7185", "#ffffff"
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
font_title = ImageFont.truetype(FONT_BOLD, 36)
font_subtitle = ImageFont.truetype(FONT_REGULAR, 20)
font_card = ImageFont.truetype(FONT_BOLD, 18)
font_body = ImageFont.truetype(FONT_REGULAR, 21)
font_small = ImageFont.truetype(FONT_REGULAR, 16)
checks = json.loads((BUNDLE / "verification" / "checks.json").read_text())


def base(title: str, subtitle: str, section: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((42, 30, 1238, 136), radius=18, fill=CARD)
    draw.text((66, 42), section.upper(), font=font_small, fill=ACCENT)
    draw.text((66, 64), title, font=font_title, fill=INK)
    draw.text((68, 111), subtitle, font=font_subtitle, fill=MUTED)
    return image, draw


def fit(image: Image.Image, width: int, height: int) -> Image.Image:
    image = image.copy()
    image.thumbnail((width, height), Image.Resampling.LANCZOS)
    return image


def pair(title: str, subtitle: str, section: str, name: str, crop: tuple[int, int, int, int] | None,
         labels: tuple[str, str]) -> Image.Image:
    image, draw = base(title, subtitle, section)
    for x, state, label in [(104, "before", labels[0]), (673, "after", labels[1])]:
        source = Image.open(BUNDLE / state / name).convert("RGB")
        if crop:
            source = source.crop(crop)
        draw.rounded_rectangle((x - 12, 154, x + 503, 688), radius=16, fill=CARD)
        thumb = fit(source, 475, 468)
        image.paste(thumb, (x + (475 - thumb.width) // 2, 163))
        draw.text((x + 8, 650), label, font=font_card, fill=INK)
    return image


slides: list[Path] = []

# 1. Catalog preview: the gland cube floats beside the terminal box before the fix.
image = pair(
    "Vertical turbine pump: terminal gland",
    "Catalog preview, before and after one source-line change.",
    "Before / after",
    "vertical-turbine-pump.png",
    None,
    ("BEFORE · gland floats 66 mm off the box", "AFTER · gland under the terminal box"),
)
slides.append(VIDEO_INPUTS / "slide-01-preview.png")
image.save(slides[-1], optimize=True)

# 2. render inspect front view, cropped to the motor head.
image = pair(
    "Cable entry from below",
    "kernelcad render inspect, front view, cropped to the motor and terminal box.",
    "Inspection view",
    "inspect-front.png",
    (300, 60, 760, 520),
    ("BEFORE · detached gland", "AFTER · gland seated on box underside"),
)
slides.append(VIDEO_INPUTS / "slide-02-inspect.png")
image.save(slides[-1], optimize=True)

# 3. Local verification, read from verification/checks.json.
image, draw = base("Local verification", "Source, exported GLB, preview, index and catalog suite run locally.", "Result")
draw.rounded_rectangle((70, 164, 1210, 632), radius=16, fill=CARD)
y = 196
for message in checks["lines"]:
    draw.ellipse((106, y + 4, 128, y + 26), fill="#2d8062")
    draw.text((148, y), message, font=font_body, fill=INK)
    y += 66
draw.text((106, 574), "Local software render and GLB bounds checks only. No deployment or hardware acceptance is shown.",
          font=font_small, fill=MUTED)
slides.append(VIDEO_INPUTS / "slide-03-verification.png")
image.save(slides[-1], optimize=True)

concat = []
for slide in slides:
    concat.extend([f"file '{slide.name}'", "duration 4"])
concat.append(f"file '{slides[-1].name}'")
(VIDEO_INPUTS / "ffmpeg-concat.txt").write_text("\n".join(concat) + "\n")
subprocess.run(
    ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", "ffmpeg-concat.txt",
     "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "23",
     "-movflags", "+faststart", "../review-demo.mp4"],
    cwd=VIDEO_INPUTS,
    check=True,
)
print(f"Wrote {BUNDLE / 'review-demo.mp4'} ({len(slides)} slides, 1280x720, 30 fps).")
