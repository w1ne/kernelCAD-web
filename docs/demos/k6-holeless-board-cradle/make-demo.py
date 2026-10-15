#!/usr/bin/env python3
"""Build a captioned still-sequence demo for the holeless-board cradle recipe."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import os
import subprocess

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "frames"
OUT.mkdir(exist_ok=True)
W, H = 1280, 720
BG = (13, 22, 32)
PANEL = (23, 38, 53)
WHITE = (239, 245, 250)
MUTED = (166, 183, 198)
ACCENT = (77, 190, 220)
FONT_CANDIDATES = [
    os.environ.get("KERNELCAD_DEMO_FONT"),
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    "C:/Windows/Fonts/arial.ttf",
]
FONT = next((path for path in FONT_CANDIDATES if path and Path(path).is_file()), None)


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    if FONT:
        return ImageFont.truetype(FONT, size)
    return ImageFont.load_default()

font_title = load_font(42)
font_label = load_font(24)
font_body = load_font(30)
font_small = load_font(22)
preview = Image.open(ROOT / "cradle-preview.png").convert("RGB")


def base(step: str, title: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((52, 44, 1228, 676), radius=24, fill=PANEL)
    draw.text((88, 76), step.upper(), font=font_label, fill=ACCENT)
    draw.text((88, 116), title, font=font_title, fill=WHITE)
    return image, draw


def add_preview(image: Image.Image, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    thumb = preview.copy()
    thumb.thumbnail((x1 - x0, y1 - y0), Image.Resampling.LANCZOS)
    image.paste(thumb, (x0 + (x1 - x0 - thumb.width) // 2, y0 + (y1 - y0 - thumb.height) // 2))

# 1. Discovery: exact cookbook id and representative lookup query.
image, draw = base("Step 1 / Lookup", "Find a recipe for a board with no holes")
draw.rounded_rectangle((90, 245, 1190, 390), radius=16, fill=BG)
draw.text((126, 275), "lookup_cookbook({ query:", font=font_body, fill=WHITE)
draw.text((126, 323), "  'hole-less dev board cradle with USB access' })", font=font_body, fill=ACCENT)
draw.text((92, 450), "Recipe returned: holeless-board-cradle", font=font_body, fill=WHITE)
draw.text((92, 508), "Parametric rail, edge catches, pin clearance and connector opening", font=font_small, fill=MUTED)
image.save(OUT / "01-lookup.png")

# 2. Execution: actual full local execute_cookbook test, with rendered result.
image, draw = base("Step 2 / Execute", "Evaluate the selected cookbook recipe")
add_preview(image, (74, 206, 785, 610))
draw.text((820, 238), "execute_cookbook({", font=font_body, fill=WHITE)
draw.text((820, 284), "  id: 'holeless-board-cradle'", font=font_small, fill=ACCENT)
draw.text((820, 324), "})", font=font_body, fill=WHITE)
draw.line((820, 385, 1168, 385), fill=(60, 83, 104), width=2)
draw.text((820, 420), "Local full evaluation", font=font_label, fill=MUTED)
draw.text((820, 458), "Cookbook evaluation", font=font_body, fill=WHITE)
draw.text((820, 508), "Geometry returned", font=font_body, fill=ACCENT)
draw.text((820, 574), "Geometry preview", font=font_small, fill=MUTED)
image.save(OUT / "02-execute.png")

# 3. Result and limits: stay explicit about what simulation proves.
image, draw = base("Step 3 / Fit reference", "ESP32 DevKitC fit reference")
add_preview(image, (74, 206, 785, 610))
draw.text((820, 236), "54.4 × 27.9 mm board", font=font_body, fill=WHITE)
draw.text((820, 281), "No holes · USB on -X", font=font_label, fill=ACCENT)
draw.text((820, 328), "1.6 mm PCB default", font=font_label, fill=WHITE)
draw.text((820, 371), "10 mm height estimate", font=font_label, fill=WHITE)
draw.text((820, 414), "3 mm pin gap", font=font_label, fill=WHITE)
draw.text((820, 457), "Rails + edge catches", font=font_label, fill=WHITE)
draw.line((820, 482, 1168, 482), fill=(60, 83, 104), width=2)
draw.text((820, 512), "Local geometry check only.", font=font_small, fill=MUTED)
draw.text((820, 546), "Board fit, clip flex and printing", font=font_small, fill=MUTED)
draw.text((820, 580), "still need hardware validation.", font=font_small, fill=MUTED)
image.save(OUT / "03-fit-reference.png")

# Encode each caption card for four seconds; no audio or synthetic camera movement.
inputs = []
for frame in ("01-lookup.png", "02-execute.png", "03-fit-reference.png"):
    inputs.extend(["-loop", "1", "-t", "4", "-i", str(OUT / frame)])
filter_complex = (
    "[0:v]setsar=1,format=yuv420p[v0];"
    "[1:v]setsar=1,format=yuv420p[v1];"
    "[2:v]setsar=1,format=yuv420p[v2];"
    "[v0][v1][v2]concat=n=3:v=1:a=0[out]"
)
subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "error", *inputs,
    "-filter_complex", filter_complex, "-map", "[out]", "-r", "24",
    "-c:v", "libx264", "-crf", "22", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", "-y", str(ROOT / "demo.mp4"),
], check=True)
