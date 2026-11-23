"""Build the short local-source workflow demo from recorded render outputs."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

BUNDLE = Path(__file__).resolve().parent
FRAMES = BUNDLE / "frames"
VARIANTS = BUNDLE / "variants"
BEFORE = BUNDLE / "before"
VIDEO = BUNDLE / "industrial-plant-machine-refinement.mp4"
W, H = 1280, 720
BG = "#f3f6f7"
INK = "#172d36"
MUTED = "#60727a"
ACCENT = "#d28638"
GREEN = "#44776a"
WHITE = "#ffffff"

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_BOLD if bold else FONT
    return ImageFont.truetype(path, size)


def base(kicker: str, title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(im)
    draw.rounded_rectangle((0, 0, W, 100), radius=0, fill=INK)
    draw.text((48, 20), kicker.upper(), fill="#a9c4c6", font=font(15, True))
    draw.text((48, 43), title, fill=WHITE, font=font(29, True))
    draw.text((48, 119), subtitle, fill=MUTED, font=font(17))
    draw.rounded_rectangle((48, 682, 1232, 686), radius=2, fill="#d4dfe2")
    return im, draw


def contain(path: Path, size: tuple[int, int]) -> Image.Image:
    with Image.open(path) as source:
        source = source.convert("RGB")
        return ImageOps.contain(source, size, Image.Resampling.LANCZOS)


def card(draw: ImageDraw.ImageDraw, bounds: tuple[int, int, int, int], title: str, subtitle: str) -> None:
    x0, y0, x1, y1 = bounds
    draw.rounded_rectangle(bounds, radius=14, fill=WHITE, outline="#dbe3e5", width=2)
    draw.text((x0 + 18, y0 + 16), title, fill=INK, font=font(17, True))
    draw.text((x0 + 18, y1 - 38), subtitle, fill=MUTED, font=font(13))


def put_centered(im: Image.Image, path: Path, bounds: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = bounds
    thumb = contain(path, (x1 - x0, y1 - y0))
    x = x0 + ((x1 - x0) - thumb.width) // 2
    y = y0 + ((y1 - y0) - thumb.height) // 2
    im.paste(thumb, (x, y))


def save(im: Image.Image, number: int) -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    im.save(FRAMES / f"frame-{number:02}.png", optimize=True)


def make_frames() -> None:
    ids = ["diesel-generator-set", "belt-conveyor", "industrial-transformer"]
    titles = ["Diesel generator", "Belt conveyor", "Distribution transformer"]
    descriptions = [
        "paint · steel · radiator · rubber",
        "steel · belt rubber · rollers · safety paint",
        "tank paint · steel · porcelain · copper",
    ]

    im, draw = base("Catalog quality · 2026-11-09", "Three existing machines, refined in place", "Same asset IDs · component-specific colors · source-controlled geometry")
    put_centered(im, VARIANTS / "generator-default.png", (665, 145, 1205, 645))
    draw.text((58, 207), "No catalog count growth", fill=INK, font=font(24, True))
    draw.text((58, 256), "60 assets remain in the kit", fill=GREEN, font=font(20, True))
    draw.text((58, 304), "Each image comes from its", fill=MUTED, font=font(17))
    draw.text((58, 330), "native .kcad.ts source.", fill=MUTED, font=font(17))
    draw.text((58, 400), "Defaults now show the", fill=MUTED, font=font(17))
    draw.text((58, 426), "parts that make each", fill=MUTED, font=font(17))
    draw.text((58, 452), "machine recognizable.", fill=MUTED, font=font(17))
    save(im, 1)

    im, draw = base("Preview review · before", "The earlier palette hid the material roles", "Two shared controls colored most surfaces alike; small accents carried the contrast.")
    for i, (asset, title) in enumerate(zip(ids, titles)):
        x0 = 48 + i * 397
        bounds = (x0, 170, x0 + 374, 622)
        card(draw, bounds, title, "earlier indexed preview")
        put_centered(im, BEFORE / f"{asset}.png", (x0 + 10, 217, x0 + 364, 574))
    save(im, 2)

    im, draw = base("Preview review · after", "Color follows the modelled component", "Distinct finishes separate the enclosure, belt, rollers, insulation and terminals.")
    for i, (asset, title, desc) in enumerate(zip(ids, titles, descriptions)):
        x0 = 48 + i * 397
        bounds = (x0, 170, x0 + 374, 622)
        card(draw, bounds, title, desc)
        put_centered(im, VARIANTS / f"{asset.replace('diesel-generator-set','generator').replace('belt-conveyor','conveyor').replace('industrial-transformer','transformer')}-default.png", (x0 + 10, 217, x0 + 364, 574))
    save(im, 3)

    im, draw = base("Geometry controls", "Selecting a value changes real geometry", "Each option changes tessellation and the visible assembly, while the asset ID stays fixed.")
    shape_ids = ["generator-ten-louvers", "conveyor-four-stations", "transformer-ten-fins"]
    control_labels = ["8 → 10 radiator louvers", "3 → 4 support stations", "8 → 10 radiator fins"]
    for i, (asset, title, variant, label) in enumerate(zip(ids, titles, shape_ids, control_labels)):
        x0 = 48 + i * 397
        bounds = (x0, 170, x0 + 374, 622)
        card(draw, bounds, title, label)
        put_centered(im, VARIANTS / f"{variant}.png", (x0 + 10, 217, x0 + 364, 574))
    save(im, 4)

    im, draw = base("Named presets", "Switch the palette without changing the machine", "highVisibility / utilityGreen source presets recolor the assigned material parts.")
    preset_ids = ["generator-high-visibility", "conveyor-high-visibility", "transformer-utility-green"]
    preset_labels = ["highVisibility", "highVisibility", "utilityGreen"]
    for i, (asset, title, variant, label) in enumerate(zip(ids, titles, preset_ids, preset_labels)):
        x0 = 48 + i * 397
        bounds = (x0, 170, x0 + 374, 622)
        card(draw, bounds, title, f"preset: {label}")
        put_centered(im, VARIANTS / f"{variant}.png", (x0 + 10, 217, x0 + 364, 574))
    save(im, 5)

    im, draw = base("Local verification", "The catalog is richer at the same count", "Source, preview, generated index and local catalog pages checked on this branch.")
    metrics = [
        ("60 / 60", "industrial-plant assets pass the catalog quality gate"),
        ("2,402 / 2,402", "catalog assets pass · 100.00% · 50 rich kits"),
        ("60 previews", "re-rendered before rebuilding catalog/index.json"),
        ("3 geometry choices", "change triangles; named presets change preview pixels"),
    ]
    for i, (value, label) in enumerate(metrics):
        y = 186 + i * 82
        draw.rounded_rectangle((80, y, 710, y + 62), radius=12, fill=WHITE, outline="#dbe3e5", width=2)
        draw.text((102, y + 15), value, fill=GREEN if i < 2 else ACCENT, font=font(22, True))
        draw.text((322, y + 20), label, fill=INK, font=font(14))
    draw.rounded_rectangle((755, 183, 1197, 492), radius=16, fill="#e8eff0")
    put_centered(im, VARIANTS / "transformer-default.png", (770, 196, 1182, 477))
    draw.text((82, 555), "Local source and software previews only — not deployed behavior or physical equipment acceptance.", fill=MUTED, font=font(15))
    save(im, 6)

    concat = BUNDLE / "frames.txt"
    with concat.open("w", encoding="utf-8") as f:
        for i in range(1, 7):
            f.write(f"file '{(FRAMES / f'frame-{i:02}.png').as_posix()}'\n")
            f.write("duration 3\n")
        f.write(f"file '{(FRAMES / 'frame-06.png').as_posix()}'\n")
    subprocess.run(
        [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
            "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "medium",
            "-crf", "25", "-movflags", "+faststart", "-an", str(VIDEO),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    (BUNDLE / "poster.png").write_bytes((FRAMES / "frame-03.png").read_bytes())
    (BUNDLE / "demo-capture.json").write_text(json.dumps({
        "source": "capture_demo.py",
        "resolution": f"{W}x{H}",
        "fps": 30,
        "frames": 6,
        "durationSeconds": 18,
        "codec": "libx264, yuv420p, CRF 25",
        "audio": False,
        "renderInputs": "before/ and variants/ PNGs produced from catalog .kcad.ts sources",
    }, indent=2) + "\n", encoding="utf-8")
    concat.unlink()


if __name__ == "__main__":
    make_frames()
