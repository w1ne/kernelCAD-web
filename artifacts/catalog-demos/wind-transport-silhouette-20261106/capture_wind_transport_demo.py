#!/usr/bin/env python3
"""Build a short before/after and variant demonstration for the refined wind-energy transport and access assets."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
FRAMES = BUNDLE / "frames"
SIZE = (1280, 720)
BG = "#101827"
TEXT = "#edf2f7"
MUTED = "#a7b4c6"
ACCENT = "#6bd3aa"
ASSETS = [
    ("blade-transport-saddle", "Wind blade transport saddle", "root-empty"),
    ("nacelle-transport-frame", "Nacelle transport frame", "empty-trestle"),
    ("service-lift-cage", "Turbine service lift cage", "ladder-door-open"),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    path = Path("/usr/share/fonts/truetype/dejavu") / name
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def frame(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", SIZE, BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, SIZE[0], 104), fill="#0b1220")
    draw.text((54, 24), title, font=font(31, True), fill=TEXT)
    draw.text((56, 68), subtitle, font=font(16), fill=MUTED)
    return image, draw


def paste(canvas: Image.Image, draw: ImageDraw.ImageDraw, path: Path, xy: tuple[int, int], side: int, label: str) -> None:
    with Image.open(path) as im:
        canvas.paste(im.convert("RGB").resize((side, side), Image.Resampling.LANCZOS), xy)
    draw.text((xy[0], xy[1] + side + 10), label, font=font(18, True), fill=ACCENT)


def main() -> None:
    FRAMES.mkdir(exist_ok=True)
    frames: list[Path] = []
    for asset_id, title, shape in ASSETS:
        image, draw = frame(title, f"wind-energy/{asset_id} · before: box stack · after: profile, loft and revolve geometry")
        paste(image, draw, BUNDLE / "before" / f"{asset_id}.png", (90, 140), 500, "Before (previous source)")
        paste(image, draw, ROOT / "catalog/kits/wind-energy/previews" / f"{asset_id}.png", (690, 140), 500, "After (catalog preview)")
        frames.append(FRAMES / f"frame-{len(frames) + 1:02d}.png")
        image.save(frames[-1])
        image, draw = frame(title, "Source-driven variants: shape choice and presets rendered from the same .kcad.ts")
        for i, variant in enumerate(["default", shape, "weathered", "highVisibility"]):
            paste(image, draw, BUNDLE / "variants" / f"{asset_id}-{variant}.png", (40 + i * 305, 170), 290, variant)
        frames.append(FRAMES / f"frame-{len(frames) + 1:02d}.png")
        image.save(frames[-1])
    Image.open(frames[0]).save(BUNDLE / "poster.png")
    concat = BUNDLE / ".frames.txt"
    concat.write_text("".join(f"file '{f}'\nduration 3.5\n" for f in frames) + f"file '{frames[-1]}'\n")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat),
         "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", str(BUNDLE / "wind-transport-silhouette-refinement.mp4")],
        check=True,
    )
    concat.unlink()


if __name__ == "__main__":
    main()
