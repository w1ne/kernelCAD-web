#!/usr/bin/env python3
"""Create a short source-to-preview walkthrough from retained catalog renders."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
W, H = 960, 540
BG = (244, 247, 249)
INK = (28, 42, 53)
MUTED = (82, 100, 111)
BLUE = (35, 81, 103)
ORANGE = (220, 105, 53)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)


def text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, size: int,
         fill: tuple[int, int, int] = INK, bold: bool = False) -> None:
    draw.text(xy, value, font=font(size, bold), fill=fill)


def canvas(kicker: str, title: str, subtitle: str = "") -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, W, 13), fill=BLUE)
    text(draw, (56, 42), kicker.upper(), 18, BLUE, True)
    text(draw, (56, 78), title, 31, INK, True)
    if subtitle:
        text(draw, (56, 126), subtitle, 18, MUTED)
    return image, draw


def add_preview(image: Image.Image, source: Path, box: tuple[int, int, int, int]) -> None:
    preview = Image.open(source).convert("RGB")
    preview.thumbnail((box[2] - box[0], box[3] - box[1]), Image.Resampling.LANCZOS)
    x = box[0] + (box[2] - box[0] - preview.width) // 2
    y = box[1] + (box[3] - box[1] - preview.height) // 2
    image.paste(preview, (x, y))


def comparison(asset_id: str, name: str, caption: str) -> Image.Image:
    image, draw = canvas("Marine catalog · material promotion", name,
                         "Same source silhouette, with component-specific materials")
    draw.rounded_rectangle((44, 172, 464, 484), radius=12, fill=(232, 237, 240), outline=(207, 217, 222), width=2)
    draw.rounded_rectangle((496, 172, 916, 484), radius=12, fill=(232, 237, 240), outline=(207, 217, 222), width=2)
    add_preview(image, BUNDLE / "before" / f"{asset_id}.png", (53, 181, 455, 438))
    add_preview(image, ROOT / "catalog/kits/marine/previews" / f"{asset_id}.png", (505, 181, 907, 438))
    text(draw, (74, 445), "BEFORE · one shared color", 17, MUTED, True)
    text(draw, (528, 445), "AFTER · materials split by part", 17, BLUE, True)
    draw.rectangle((0, 506, W, H), fill=BLUE)
    text(draw, (56, 516), caption, 17, (255, 255, 255), True)
    return image


def main() -> None:
    BUNDLE.joinpath("frames").mkdir(parents=True, exist_ok=True)
    frame_data: list[Image.Image] = []

    image, draw = canvas("kernelCAD · marine kit", "A 40-asset quality promotion",
                         "Material controls and named finishes added to the existing models")
    draw.rounded_rectangle((58, 220, 902, 430), radius=18, fill=(228, 237, 241))
    text(draw, (92, 260), "40 existing assets", 34, BLUE, True)
    text(draw, (92, 318), "2–4 material controls per asset", 28, INK, True)
    text(draw, (92, 366), "weathered  ·  highVisibility  ·  refreshed previews", 20, MUTED)
    frame_data.append(image)
    frame_data.append(comparison("cargo-ship", "Cargo ship", "Painted hull · nonskid deck · cargo container coating"))
    frame_data.append(comparison("anchor", "Marine anchor", "Galvanized shank and flukes · stainless ring"))
    frame_data.append(comparison("life-jacket", "Life jacket", "Safety fabric · flotation foam · webbing · hardware"))

    image, draw = canvas("Source authoring", "Materials stay editable",
                         "Each named part receives a role-specific color parameter")
    src = (ROOT / "catalog/kits/marine/life-jacket.kcad.ts").read_text().splitlines()
    excerpt = [line.strip() for line in src if "param('" in line or "presets({" in line or "weathered:" in line or "highVisibility:" in line or '.part("' in line][:10]
    y = 178
    for line in excerpt[:8]:
        if len(line) > 93:
            line = line[:90] + "..."
        draw.rounded_rectangle((58, y - 4, 900, y + 30), radius=5, fill=(229, 237, 241))
        text(draw, (72, y), line, 15, BLUE if "presets" in line else INK)
        y += 39
    draw.rectangle((0, 506, W, H), fill=BLUE)
    text(draw, (56, 516), "Parameters change real component colors in the rendered model", 17, (255, 255, 255), True)
    frame_data.append(image)

    image, draw = canvas("Local verification", "All 40 marine assets pass",
                         "Previewed source and generated index are retained with this bundle")
    draw.rounded_rectangle((58, 214, 902, 414), radius=18, fill=(228, 237, 241))
    text(draw, (92, 254), "2,171 / 2,390 assets pass", 34, BLUE, True)
    text(draw, (92, 315), "40 / 40 marine assets pass", 27, INK, True)
    text(draw, (92, 365), "Source, local previews, lint and catalog integration checks", 18, MUTED)
    draw.rectangle((0, 506, W, H), fill=BLUE)
    text(draw, (56, 516), "Local visualization evidence only · not deployed · no hardware acceptance", 16, (255, 255, 255), True)
    frame_data.append(image)

    for index, frame in enumerate(frame_data, start=1):
        frame.save(BUNDLE / "frames" / f"frame-{index:02d}.png")

    video = BUNDLE / "marine-quality-promotion.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-framerate", "1/3", "-i", str(BUNDLE / "frames/frame-%02d.png"),
        "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(video),
    ], check=True)
    print(f"Wrote {video} from {len(frame_data)} rendered walkthrough frames")


if __name__ == "__main__":
    main()
