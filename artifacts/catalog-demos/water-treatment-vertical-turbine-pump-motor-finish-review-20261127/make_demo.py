#!/usr/bin/env python3
"""Build the short, local kernelCAD asset-review walkthrough."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
VIDEO_INPUTS = BUNDLE / "video-inputs"
VIDEO_INPUTS.mkdir(parents=True, exist_ok=True)
WIDTH, HEIGHT = 1280, 720
BG = "#f2f6fa"
INK = "#172b3a"
MUTED = "#4e6472"
ACCENT = "#1b7185"
CARD = "#ffffff"
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
font_title = ImageFont.truetype(FONT_BOLD, 36)
font_subtitle = ImageFont.truetype(FONT_REGULAR, 20)
font_card = ImageFont.truetype(FONT_BOLD, 18)
font_body = ImageFont.truetype(FONT_REGULAR, 21)
font_code = ImageFont.truetype(FONT_REGULAR, 17)
font_small = ImageFont.truetype(FONT_REGULAR, 16)


def preview(name: str) -> Image.Image:
    return Image.open(BUNDLE / "samples" / "previews" / f"{name}.png").convert("RGB")


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


def wrapped(draw: ImageDraw.ImageDraw, xy: tuple[int, int], message: str,
            font: ImageFont.FreeTypeFont, fill: str, width: int, gap: int = 7) -> int:
    x, y = xy
    for paragraph in message.split("\n"):
        line = ""
        for word in paragraph.split():
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
ids = [
    "eddy-current-separator",
    "substation-main-power-transformer",
    "vertical-turbine-pump",
    "offshore-wind-turbine",
    "centrifugal-pump",
]
labels = [
    "Recycling · eddy-current separator",
    "Grid · main power transformer",
    "Water · vertical turbine pump head",
    "Wind · offshore turbine",
    "Plant · centrifugal process pump",
]

# 1. The five real baseline previews opened during the semantic audit.
image, draw = base(
    "Five rendered industrial assets",
    "Reviewed for silhouette, visible features, material roles, and misleading labels.",
    "Preview audit",
)
card_w, card_h, gap = 220, 472, 14
start_x, top = 53, 160
for index, (asset_id, label) in enumerate(zip(ids, labels, strict=True)):
    x = start_x + index * (card_w + gap)
    draw.rounded_rectangle((x, top, x + card_w, top + card_h), radius=14, fill=CARD)
    thumb = fit(preview(asset_id), 202, 345)
    image.paste(thumb, (x + (card_w - thumb.width) // 2, top + 12))
    wrapped(draw, (x + 12, top + 366), label, font_card, INK, card_w - 24, gap=5)
slides.append(save(image, "slide-01-five-preview-audit.png"))

# 2. The selected asset before and after the source-only material correction.
before = Image.open(BUNDLE / "before" / "vertical-turbine-pump.png").convert("RGB")
after = Image.open(BUNDLE / "after" / "vertical-turbine-pump.png").convert("RGB")
image, draw = base(
    "Vertical turbine pump: motor finish",
    "The same 2,276-triangle source-rendered model, before and after one material mapping change.",
    "Before / after",
)
for x, label, source in [
    (104, "BEFORE · ribs use structuralSteel", before),
    (673, "AFTER · ribs use motorFinish", after),
]:
    draw.rounded_rectangle((x - 12, 154, x + 503, 688), radius=16, fill=CARD)
    thumb = fit(source, 475, 468)
    image.paste(thumb, (x + (475 - thumb.width) // 2, 163))
    draw.text((x + 8, 650), label, font=font_card, fill=INK)
slides.append(save(image, "slide-02-before-after.png"))

# 3. Show the actual kernelCAD material control and the corrected part mapping.
image, draw = base(
    "Motor housing and six cooling ribs share one control",
    "The existing motorFinish parameter now colors every part of the motor shell.",
    "Material assignment",
)
for x, label, source in [(100, "BEFORE", before), (438, "AFTER", after)]:
    draw.rounded_rectangle((x - 10, 164, x + 300, 475), radius=16, fill=CARD)
    crop = fit(source.crop((185, 38, 367, 218)), 270, 230)
    image.paste(crop, (x + (280 - crop.width) // 2, 174))
    draw.text((x + 8, 420), label, font=font_card, fill=INK)

draw.rounded_rectangle((776, 164, 1183, 475), radius=16, fill=CARD)
draw.text((804, 188), "MOTOR FINISH", font=font_card, fill=MUTED)
draw.rounded_rectangle((804, 221, 1152, 276), radius=10, fill="#477d9b")
draw.text((823, 238), "motorFinish · #477d9b", font=font_card, fill="#ffffff")
draw.text((804, 300), "Six rib parts", font=font_small, fill=MUTED)
draw.rounded_rectangle((804, 325, 1152, 367), radius=8, fill="#477d9b")
draw.text((823, 336), "motor-cooling-rib-1 … 6", font=font_code, fill="#ffffff")
draw.text((804, 390), "Source mapping", font=font_small, fill=MUTED)
draw.text((804, 416), ".color(motorFinish)", font=font_code, fill=INK)
wrapped(
    draw,
    (100, 530),
    "Before: .color(structuralSteel). After: .color(motorFinish). The pedestal and terminal cover stay structural steel.",
    font_body,
    INK,
    1070,
)
slides.append(save(image, "slide-03-material-map.png"))

# 4. Report local verification without implying deployment or physical acceptance.
image, draw = base(
    "Local verification",
    "Source, exported GLB, preview, index, and quality checks were run locally.",
    "Result",
)
draw.rounded_rectangle((70, 164, 1210, 632), radius=16, fill=CARD)
checks = [
    "Exported-GLB regression: baseline fails; corrected source passes 1 / 1.",
    "Water-treatment ESLint: clean; water-treatment quality gate: 50 / 50 (100%).",
    "Global material/preset gate: 2,396 / 2,402 (99.75%); six unrelated legacy outliers recorded.",
    "Preview refreshed; catalog index regenerated with the current source hash.",
    "Catalog integration suite: 229 / 229 files and 384 / 384 tests passed.",
]
y = 188
for message in checks:
    draw.ellipse((106, y + 4, 128, y + 26), fill="#2d8062")
    wrapped(draw, (148, y), message, font_body, INK, 1010, gap=4)
    y += 70
wrapped(
    draw,
    (106, 558),
    "Local software preview and exported-GLB regression only. This clip does not show deployment, equipment performance, process simulation, or hardware acceptance.",
    font_small,
    MUTED,
    1050,
)
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
