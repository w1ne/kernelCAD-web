#!/usr/bin/env python3
"""Compose and encode the retained semantic-review walkthrough."""
from pathlib import Path
import json
import subprocess

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
VIDEO_INPUTS = HERE / "video-inputs"
VIDEO_INPUTS.mkdir(exist_ok=True)
WIDTH, HEIGHT = 1280, 720
BG = (20, 30, 43)
PANEL = (31, 45, 62)
WHITE = (238, 243, 248)
MUTED = (174, 190, 207)
COPPER = (189, 119, 72)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)


def page(title: str, eyebrow: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new("RGB", (WIDTH, HEIGHT), BG)
    d = ImageDraw.Draw(im)
    d.text((64, 38), eyebrow.upper(), font=font(17, True), fill=COPPER)
    d.text((64, 72), title, font=font(36, True), fill=WHITE)
    d.line((64, 128, WIDTH - 64, 128), fill=(62, 80, 100), width=2)
    return im, d


def fit_preview(path: Path, size: tuple[int, int]) -> Image.Image:
    src = Image.open(path).convert("RGB")
    src.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, (237, 243, 248))
    canvas.paste(src, ((size[0] - src.width) // 2, (size[1] - src.height) // 2))
    return canvas


def save(im: Image.Image, index: int) -> None:
    im.save(VIDEO_INPUTS / f"slide-{index:02d}.png", optimize=True)


sample = HERE / "sample"
target_before = HERE / "before/rear-door-heat-exchanger.png"
target_after = HERE / "after/rear-door-heat-exchanger.png"

# Five rendered previews used to choose one concrete material mismatch.
im, d = page("Five industrial previews", "Semantic catalog review · 12 Nov 2026")
cards = [
    ("Rotary blasthole drill", sample / "rotary-blasthole-drill.png"),
    ("Mine shaft headframe", sample / "shaft-headframe.png"),
    ("Concrete batch plant", sample / "concrete-batch-plant.png"),
    ("Towable light tower", sample / "towable-light-tower.png"),
    ("Rear-door heat exchanger · before", target_before),
]
positions = [(64, 151), (460, 151), (856, 151), (262, 424), (658, 424)]
for (label, path), (x, y) in zip(cards, positions, strict=True):
    d.rounded_rectangle((x, y, x + 360, y + 246), radius=14, fill=PANEL)
    im.paste(fit_preview(path, (336, 195)), (x + 12, y + 12))
    d.text((x + 14, y + 213), label, font=font(17, True), fill=WHITE)
save(im, 1)

# Actual before and after catalog preview renders, preserving geometry.
im, d = page("Copper coil runs now have their own finish", "Material mismatch · rear-door heat exchanger")
im.paste(fit_preview(target_before, (500, 440)), (92, 160))
im.paste(fit_preview(target_after, (500, 440)), (688, 160))
d.text((108, 618), "BEFORE · coils blended into painted steel", font=font(18, True), fill=WHITE)
d.text((704, 618), "AFTER · nine copper tube runs are visible", font=font(18, True), fill=WHITE)
d.text((64, 660), "Same 532-triangle geometry and 0.885 × 2.1 × 0.61 m envelope", font=font(17), fill=MUTED)
save(im, 2)

# Named palette/preset controls and rendered result, extracted from the source.
im, d = page("Material controls stay independent", "Native kernelCAD parameters")
im.paste(fit_preview(target_after, (500, 450)), (64, 155))
d.rounded_rectangle((616, 165, 1198, 602), radius=16, fill=PANEL)
d.text((650, 198), "PALETTE", font=font(16, True), fill=MUTED)
d.rounded_rectangle((650, 238, 694, 282), radius=8, fill="#45606f")
d.text((716, 240), "steel · enclosure and frame", font=font(21), fill=WHITE)
d.rounded_rectangle((650, 306, 694, 350), radius=8, fill="#bd7748")
d.text((716, 308), "copper · nine coil runs", font=font(21), fill=WHITE)
d.rounded_rectangle((650, 374, 694, 418), radius=8, fill="#414b53")
d.text((716, 376), "polymer · outlet fittings", font=font(21), fill=WHITE)
d.text((650, 456), "PRESETS", font=font(16, True), fill=MUTED)
d.text((650, 493), "facilityStandard · highVisibility", font=font(20, True), fill=WHITE)
d.text((64, 643), "Both presets expose the copper control; no geometry changes.", font=font(18), fill=MUTED)
save(im, 3)

# Evidence/status slide reflects checked-in work and completed command output.
im, d = page("Local result and verification", "Review handoff")
rows = [
    ("5/5", "industrial previews opened and reviewed"),
    ("42 / 67", "catalog integration files / tests passed"),
    ("2,402 / 50", "assets / kits · index rebuilt; target row is fresh"),
    ("HTTP 200", "public baseline routes checked; branch not deployed"),
]
y = 174
for value, label in rows:
    d.rounded_rectangle((80, y, 1200, y + 88), radius=13, fill=PANEL)
    d.text((110, y + 22), value, font=font(25, True), fill=COPPER)
    d.text((405, y + 26), label, font=font(21), fill=WHITE)
    y += 105
d.text((80, 620), "Local source, index and preview verification only · no simulation or hardware acceptance", font=font(17), fill=MUTED)
save(im, 4)

settings = {
    "resolution": f"{WIDTH}x{HEIGHT}",
    "frameRate": 24,
    "secondsPerSlide": 4.5,
    "slides": 4,
    "encoding": "H.264, yuv420p, CRF 20, faststart",
    "inputs": [
        "sample/*.png", "before/rear-door-heat-exchanger.png",
        "after/rear-door-heat-exchanger.png", "catalog-integration-output.txt",
        "eslint-output.txt", "index-verification.json", "public-route-check.json",
    ],
    "captions": "Local preview/source/index verification; not deployed, simulated, or hardware accepted.",
}
(HERE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n")

output = HERE / "data-center-rear-door-heat-exchanger-copper-material-review.mp4"
command = ["ffmpeg", "-y"]
for i in range(1, 5):
    command += ["-loop", "1", "-framerate", "24", "-t", "4.5", "-i", f"slide-{i:02d}.png"]
command += [
    "-filter_complex", "[0:v][1:v][2:v][3:v]concat=n=4:v=1:a=0,format=yuv420p[outv]",
    "-map", "[outv]", "-c:v", "libx264", "-crf", "20", "-r", "24",
    "-movflags", "+faststart", str(output),
]
print("Invocation: python3 " + str(Path(__file__).resolve()))
print("Encoder: " + " ".join(command))
subprocess.run(command, cwd=VIDEO_INPUTS, check=True)
print(f"Created {output} ({output.stat().st_size} bytes)")
