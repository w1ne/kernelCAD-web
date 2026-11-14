#!/usr/bin/env python3
"""Build and encode a short local-source/material-review walkthrough."""
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
TEAL = (40, 112, 130)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)


def page(title: str, eyebrow: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(im)
    draw.text((64, 38), eyebrow.upper(), font=font(17, True), fill=(101, 190, 204))
    draw.text((64, 72), title, font=font(36, True), fill=WHITE)
    draw.line((64, 128, WIDTH - 64, 128), fill=(62, 80, 100), width=2)
    return im, draw


def fit_preview(path: Path, size: tuple[int, int]) -> Image.Image:
    source = Image.open(path).convert("RGB")
    source.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, (237, 243, 248))
    canvas.paste(source, ((size[0] - source.width) // 2, (size[1] - source.height) // 2))
    return canvas


def save(im: Image.Image, index: int) -> None:
    im.save(VIDEO_INPUTS / f"slide-{index:02d}.png", optimize=True)


sample = HERE / "sample"
before = HERE / "before/wind-farm-pad-mount-transformer.png"
after = HERE / "after/wind-farm-pad-mount-transformer.png"

# The five actual branch renders opened for the semantic sample.
im, draw = page("Five wind-energy previews", "Semantic catalog review · 12 Nov 2026")
cards = [
    ("Blade-root protector", sample / "blade-root-protector.png"),
    ("Cable-entry boot", sample / "cable-entry-boot.png"),
    ("Nacelle transport frame", sample / "nacelle-transport-frame.png"),
    ("Meter pedestal", sample / "wind-farm-meter-pedestal.png"),
    ("Pad-mount transformer · before", before),
]
positions = [(64, 151), (460, 151), (856, 151), (262, 424), (658, 424)]
for (label, path), (x, y) in zip(cards, positions, strict=True):
    draw.rounded_rectangle((x, y, x + 360, y + 246), radius=14, fill=PANEL)
    im.paste(fit_preview(path, (336, 195)), (x + 12, y + 12))
    draw.text((x + 14, y + 213), label, font=font(17, True), fill=WHITE)
save(im, 1)

# Actual pre-change and post-change preview images.
im, draw = page("Steel cooling fins now share the tank finish", "Material assignment correction")
im.paste(fit_preview(before, (500, 440)), (92, 160))
im.paste(fit_preview(after, (500, 440)), (688, 160))
draw.text((108, 618), "BEFORE · fins assigned aluminium", font=font(18, True), fill=WHITE)
draw.text((704, 618), "AFTER · fins use powder-coated steel", font=font(18, True), fill=WHITE)
draw.text((64, 660), "Same 360-triangle geometry and 0.9 × 0.973 × 0.7 m envelope", font=font(17), fill=MUTED)
save(im, 2)

# Material map and named palette/preset controls from the edited source.
im, draw = page("Independent material zones", "Native kernelCAD asset controls")
im.paste(fit_preview(after, (500, 450)), (64, 155))
draw.rounded_rectangle((616, 165, 1198, 602), radius=16, fill=PANEL)
draw.text((650, 198), "PALETTE", font=font(16, True), fill=MUTED)
for y, color, label in [
    (238, "#287082", "powderCoatedSteel · tank and fins"),
    (306, "#8b8c84", "concrete · mounting pad"),
    (374, "#eee2ca", "ceramic · top bushings"),
]:
    draw.rounded_rectangle((650, y, 694, y + 44), radius=8, fill=color)
    draw.text((716, y + 7), label, font=font(19), fill=WHITE)
draw.text((650, 456), "PRESETS", font=font(16, True), fill=MUTED)
draw.text((650, 493), "weathered · highVisibility", font=font(20, True), fill=WHITE)
draw.text((64, 643), "The source description now matches the single modeled cooling bank.", font=font(18), fill=MUTED)
save(im, 3)

# Local validation and deployment provenance.
index = json.loads((HERE / "index-verification.json").read_text(encoding="utf-8"))
assert index["sourceIndexFresh"] and index["previewExists"]
im, draw = page("Local result and verification", "Review handoff")
rows = [
    ("1 / 1", "focused exported-GLB regression passed"),
    ("clean", "wind-energy ESLint"),
    ("fresh", "generated target index row matches source hash"),
    ("HTTP 200", "public baseline routes checked; branch not deployed"),
]
y = 174
for value, label in rows:
    draw.rounded_rectangle((80, y, 1200, y + 88), radius=13, fill=PANEL)
    draw.text((110, y + 22), value, font=font(25, True), fill=(101, 190, 204))
    draw.text((405, y + 26), label, font=font(21), fill=WHITE)
    y += 105
draw.text((80, 620), "Local source, preview and index checks only · no simulation or hardware acceptance", font=font(17), fill=MUTED)
save(im, 4)

settings = {
    "resolution": f"{WIDTH}x{HEIGHT}",
    "frameRate": 24,
    "secondsPerSlide": 4.5,
    "slides": 4,
    "encoding": "H.264, yuv420p, CRF 20, faststart",
    "inputs": [
        "sample/*.png", "before/wind-farm-pad-mount-transformer.png",
        "after/wind-farm-pad-mount-transformer.png", "focused-test-output.txt",
        "eslint-output.txt", "index-verification.json", "public-route-check.json",
    ],
    "captions": "Local branch source/software-render/index checks; not deployed, simulated, or hardware accepted.",
}
(HERE / "demo-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")

output = HERE / "wind-energy-pad-mount-transformer-radiator-material-review.mp4"
command = ["ffmpeg", "-y"]
for index in range(1, 5):
    command += ["-loop", "1", "-framerate", "24", "-t", "4.5", "-i", f"slide-{index:02d}.png"]
command += [
    "-filter_complex", "[0:v][1:v][2:v][3:v]concat=n=4:v=1:a=0,format=yuv420p[outv]",
    "-map", "[outv]", "-c:v", "libx264", "-crf", "20", "-r", "24",
    "-movflags", "+faststart", str(output),
]
capture = (
    "Demo source: python3 " + str(Path(__file__).resolve()) + "\n"
    + "Encoder: " + " ".join(command) + "\n"
)
(HERE / "video-capture-output.txt").write_text(capture, encoding="utf-8")
print(capture, end="")
subprocess.run(command, cwd=VIDEO_INPUTS, check=True)
with (HERE / "video-capture-output.txt").open("a", encoding="utf-8") as stream:
    stream.write(f"Created {output} ({output.stat().st_size} bytes)\n")
print(f"Created {output} ({output.stat().st_size} bytes)")
