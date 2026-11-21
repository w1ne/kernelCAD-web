#!/usr/bin/env python3
"""Build a short local preview walkthrough for the compressor material fix."""

from __future__ import annotations

import subprocess
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
VIDEO_INPUTS = BUNDLE / "video-inputs"
VIDEO_INPUTS.mkdir(parents=True, exist_ok=True)
WIDTH, HEIGHT = 1280, 720
BG = "#f2f6fa"
INK = "#172b3a"
MUTED = "#4e6472"
ACCENT = "#d48a20"
CARD = "#ffffff"
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
font_title = ImageFont.truetype(FONT_BOLD, 36)
font_subtitle = ImageFont.truetype(FONT_REGULAR, 21)
font_card = ImageFont.truetype(FONT_BOLD, 18)
font_body = ImageFont.truetype(FONT_REGULAR, 22)
font_small = ImageFont.truetype(FONT_REGULAR, 17)


def preview(name: str) -> Image.Image:
    return Image.open(BUNDLE / "samples" / "previews" / f"{name}.png").convert("RGB")


def base(title: str, subtitle: str, section: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((50, 36, 1230, 142), radius=20, fill=CARD)
    draw.text((76, 48), section.upper(), font=font_small, fill=ACCENT)
    draw.text((76, 73), title, font=font_title, fill=INK)
    draw.text((78, 119), subtitle, font=font_subtitle, fill=MUTED)
    return image, draw


def fit(image: Image.Image, width: int, height: int) -> Image.Image:
    image = image.copy()
    image.thumbnail((width, height), Image.Resampling.LANCZOS)
    return image


def wrapped(draw: ImageDraw.ImageDraw, xy: tuple[int, int], message: str,
            font: ImageFont.FreeTypeFont, fill: str, width: int, gap: int = 8) -> int:
    x, y = xy
    for paragraph in message.split("\n"):
        words = paragraph.split()
        line = ""
        for word in words:
            candidate = word if not line else f"{line} {word}"
            if draw.textbbox((0, 0), candidate, font=font)[2] > width and line:
                draw.text((x, y), line, font=font, fill=fill)
                y += font.size + gap
                line = word
            else:
                line = candidate
        if line:
            draw.text((x, y), line, font=font, fill=fill)
            y += font.size + gap
    return y


def save(image: Image.Image, name: str) -> Path:
    path = VIDEO_INPUTS / name
    image.save(path, optimize=True)
    return path


slides: list[Path] = []

# 1. Review sample: these are the real rendered catalog previews.
image, draw = base(
    "Five rendered industrial assets",
    "The sample was checked for recognizable form, exposed features and material zones.",
    "Preview review",
)
ids = [
    "air-compressor",
    "baghouse-dust-collector",
    "bucket-elevator",
    "forklift-truck",
    "weigh-hopper",
]
card_w, card_h, gap = 216, 438, 15
start_x, top = 55, 174
for index, asset_id in enumerate(ids):
    x = start_x + index * (card_w + gap)
    draw.rounded_rectangle((x, top, x + card_w, top + card_h), radius=16, fill=CARD)
    thumb = fit(preview(asset_id), 194, 300)
    image.paste(thumb, (x + (card_w - thumb.width) // 2, top + 18))
    label = textwrap.fill(asset_id.replace("-", " "), width=21)
    wrapped(draw, (x + 13, top + 328), label, font_card, INK, card_w - 26, gap=5)
slides.append(save(image, "slide-01-five-preview-audit.png"))

# 2. Before and after: same source-driven renderer, changed material mapping.
before = Image.open(BUNDLE / "before" / "air-compressor.png").convert("RGB")
after = Image.open(BUNDLE / "after" / "air-compressor.png").convert("RGB")
image, draw = base(
    "Air compressor: pump-fin material",
    "The same 4,594-triangle model before and after a material-only correction.",
    "Before / after",
)
for x, label, source in [(105, "BASELINE · receiver steel fins", before),
                         (675, "UPDATED · pump cast-iron fins", after)]:
    draw.rounded_rectangle((x - 12, 166, x + 492, 672), radius=18, fill=CARD)
    thumb = fit(source, 464, 450)
    image.paste(thumb, (x + (464 - thumb.width) // 2, 178))
    draw.text((x + 4, 636), label, font=font_card, fill=INK)
slides.append(save(image, "slide-02-before-after.png"))

# 3. Magnified view and named parameter map.
image, draw = base(
    "One material control for the pump casting",
    "All twelve cooling fins now share the existing pumpIron color control.",
    "Material map",
)
crop_box = (224, 45, 365, 215)
for x, label, source in [(82, "BEFORE", before), (410, "AFTER", after)]:
    draw.rounded_rectangle((x - 12, 174, x + 304, 495), radius=16, fill=CARD)
    crop = source.crop(crop_box).resize((237, 286), Image.Resampling.LANCZOS)
    image.paste(crop, (x + 24, 186))
    draw.text((x + 8, 475), label, font=font_card, fill=INK)

draw.rounded_rectangle((770, 175, 1196, 495), radius=16, fill=CARD)
draw.text((800, 203), "CAST IRON", font=font_card, fill=MUTED)
draw.rounded_rectangle((800, 236, 1162, 302), radius=12, fill="#444b50")
draw.text((826, 253), "pumpIron", font=font_card, fill="#ffffff")
draw.text((800, 330), "Receiver shell", font=font_small, fill=MUTED)
draw.rounded_rectangle((800, 359, 1162, 425), radius=12, fill="#657c87")
draw.text((826, 376), "receiverSteel", font=font_card, fill="#ffffff")
wrapped(draw, (84, 548), "Local source maps pump barrel, head and fin parts into one cast-iron zone. Geometry and presets stay unchanged.", font_body, INK, 1090)
slides.append(save(image, "slide-03-material-map.png"))

# 4. Verification and truthful scope.
image, draw = base(
    "Local verification",
    "Source, exported GLB, previews and generated catalog index were checked.",
    "Result",
)
draw.rounded_rectangle((72, 183, 1208, 637), radius=18, fill=CARD)
checks = [
    "Exported-GLB regression: 1 / 1 passed; it fails on the original source.",
    "Catalog integration: 158 files / 228 tests passed.",
    "Industrial-plant ESLint: clean.",
    "All 60 kit previews regenerated; 19 preview PNGs changed.",
    "Catalog index: 2,402 assets / 50 kits; only the target row changed.",
]
y = 203
for message in checks:
    draw.ellipse((112, y + 5, 137, y + 30), fill="#2d8062")
    draw.text((155, y), message, font=font_body, fill=INK)
    y += 64
wrapped(draw, (112, 552), "Local catalog preview evidence only. This clip does not show deployment, pump performance, process simulation or hardware acceptance.", font_small, MUTED, 1035)
slides.append(save(image, "slide-04-verification.png"))

concat_lines = []
for slide in slides:
    concat_lines.extend([f"file '{slide.name}'", "duration 3.75"])
concat_lines.append(f"file '{slides[-1].name}'")
(VIDEO_INPUTS / "ffmpeg-concat.txt").write_text("\n".join(concat_lines) + "\n")

subprocess.run(
    [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "concat", "-safe", "0", "-i", "ffmpeg-concat.txt",
        "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "medium",
        "-crf", "23", "-movflags", "+faststart", "../review-demo.mp4",
    ],
    cwd=VIDEO_INPUTS,
    check=True,
)
print(f"Wrote {BUNDLE / 'review-demo.mp4'} ({len(slides)} slides, 1280x720, 30 fps).")
