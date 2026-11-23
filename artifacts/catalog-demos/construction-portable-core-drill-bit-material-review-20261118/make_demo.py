#!/usr/bin/env python3
"""Create a short local preview and verification walkthrough for this review."""
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "video-inputs"
OUT.mkdir(exist_ok=True)
W, H = 1280, 720
BG = (246, 249, 251)
INK = (35, 49, 61)
MUTED = (83, 101, 115)
ACCENT = (31, 95, 174)
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def font(size, bold=False):
    path = BOLD_PATH if bold else FONT_PATH
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()

def card(title, subtitle):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((40, 34, W-40, H-34), radius=24, fill="white", outline=(217, 225, 231), width=2)
    d.text((82, 70), title, font=font(32, True), fill=INK)
    d.text((82, 118), subtitle, font=font(18), fill=MUTED)
    return im, d

def fit(path, size):
    im = Image.open(path).convert("RGB")
    im.thumbnail(size, Image.Resampling.LANCZOS)
    return im

# Slide 1: the five real checked-in preview PNGs.
im, d = card("Five construction-equipment previews", "Local rendered catalog assets · reviewed for object identity, material zones and scale")
ids = ["asphalt-paver-screed", "rebar-bending-machine", "masonry-mixer", "jobsite-tile-saw", "portable-core-drill-stand"]
thumb_w, thumb_h = 200, 200
positions = [(100, 175), (540, 175), (980, 175), (320, 420), (760, 420)]
for asset, (x, y) in zip(ids, positions, strict=True):
    d.rounded_rectangle((x-18, y-10, x+thumb_w+18, y+thumb_h+44), radius=14, fill=(249, 251, 252), outline=(223, 230, 235), width=2)
    im.paste(fit(ROOT / "samples" / "previews" / f"{asset}.png", (thumb_w, thumb_h)), (x, y))
    d.text((x, y+thumb_h+8), asset.replace("-", " "), font=font(14, True), fill=INK)
im.save(OUT / "slide-01-five-preview-audit.png")

# Slide 2: same source-driven render before and after the one material assignment.
im, d = card("Core barrel material correction", "Same geometry and dimensions · only the existing material control changes")
for x, label, filename, color in [
    (110, "Before · enamel paint", "before/portable-core-drill-stand.png", (225, 163, 27)),
    (680, "After · structural steel", "after/portable-core-drill-stand.png", (137, 150, 154)),
]:
    d.rounded_rectangle((x-16, 174, x+500, 648), radius=16, fill=(249, 251, 252), outline=(223, 230, 235), width=2)
    d.text((x+8, 190), label, font=font(22, True), fill=INK)
    preview = fit(ROOT / filename, (360, 360))
    im.paste(preview, (x+70, 226))
    d.rounded_rectangle((x+28, 608, x+58, 630), radius=6, fill=color)
    d.text((x+68, 606), "core-bit → structuralSteelColor" if x > 500 else "core-bit → equipmentPaintColor", font=font(15), fill=MUTED)
im.save(OUT / "slide-02-before-after.png")

# Slide 3: source and software verification, with scope limits stated plainly.
im, d = card("Source mapping and checks", "Native kernelCAD preview and exported-GLB material regression")
lines = [
    ("92 triangles", "under the unchanged 2,200-triangle budget"),
    ("Base and guide column", "remain equipment enamel"),
    ("Carriage, feed handle and core barrel", "use the exposed structural-steel control"),
    ("Regression", "baseline fails; corrected exported GLB passes"),
    ("Catalog", "preview re-rendered and generated index rebuilt"),
]
y = 194
for lead, detail in lines:
    d.ellipse((92, y+4, 110, y+22), fill=ACCENT)
    d.text((132, y-4), lead, font=font(23, True), fill=INK)
    d.text((132, y+31), detail, font=font(18), fill=MUTED)
    y += 86
d.line((92, 636, 1188, 636), fill=(220, 228, 234), width=2)
d.text((92, 650), "Local software preview and GLB check · branch change is not deployed · no simulation or hardware acceptance claimed", font=font(14), fill=MUTED)
im.save(OUT / "slide-03-verification-and-scope.png")

concat = OUT / "ffmpeg-concat.txt"
slide_names = ["slide-01-five-preview-audit.png", "slide-02-before-after.png", "slide-03-verification-and-scope.png"]
with concat.open("w", encoding="utf-8") as f:
    for name in slide_names:
        f.write(f"file '{(OUT / name).as_posix()}'\n")
        f.write("duration 5\n")
    f.write(f"file '{(OUT / slide_names[-1]).as_posix()}'\n")

video = ROOT / "construction-portable-core-drill-bit-material-review.mp4"
subprocess.run([
    "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
    "-vf", "fps=24,format=yuv420p", "-c:v", "libx264", "-profile:v", "high",
    "-crf", "20", "-movflags", "+faststart", str(video),
], check=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
print(video)
