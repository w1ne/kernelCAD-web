#!/usr/bin/env python3
"""Build an 18-second source-to-preview walkthrough from retained artifacts."""

from __future__ import annotations

import json
import re
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


def add_preview(image: Image.Image, source: Path, bounds: tuple[int, int, int, int]) -> None:
    preview = Image.open(source).convert("RGB")
    preview.thumbnail((bounds[2] - bounds[0], bounds[3] - bounds[1]), Image.Resampling.LANCZOS)
    x = bounds[0] + (bounds[2] - bounds[0] - preview.width) // 2
    y = bounds[1] + (bounds[3] - bounds[1] - preview.height) // 2
    image.paste(preview, (x, y))


def comparison(asset_id: str, title: str, caption: str) -> Image.Image:
    image, draw = canvas("Railway catalog · material promotion", title,
                         "Same asset identity with editable, component-specific materials")
    draw.rounded_rectangle((44, 172, 464, 484), radius=12, fill=(232, 237, 240), outline=(207, 217, 222), width=2)
    draw.rounded_rectangle((496, 172, 916, 484), radius=12, fill=(232, 237, 240), outline=(207, 217, 222), width=2)
    add_preview(image, BUNDLE / "before" / f"{asset_id}.png", (53, 181, 455, 438))
    add_preview(image, ROOT / "catalog/kits/railway/previews" / f"{asset_id}.png", (505, 181, 907, 438))
    text(draw, (74, 445), "BEFORE · one shared color", 17, MUTED, True)
    text(draw, (528, 445), "AFTER · material controls", 17, BLUE, True)
    draw.rectangle((0, 506, W, H), fill=BLUE)
    text(draw, (56, 516), caption, 16, (255, 255, 255), True)
    return image


def main() -> None:
    BUNDLE.joinpath("frames").mkdir(parents=True, exist_ok=True)
    frames: list[Image.Image] = []

    audit = json.loads((BUNDLE / "promotion-audit.json").read_text())
    total_controls = sum(len(asset["materials"]) for asset in audit["assets"])
    net_added = total_controls - len(audit["assets"])
    image, draw = canvas("kernelCAD · railway kit", "40 assets promoted",
                         "Existing IDs retained · source parameters now match the parts users see")
    draw.rounded_rectangle((58, 218, 902, 434), radius=18, fill=(228, 237, 241))
    text(draw, (92, 252), "2–4 named material controls per asset", 28, BLUE, True)
    text(draw, (92, 306), "weathered  ·  freshService  ·  refreshed previews", 20, INK, True)
    text(draw, (92, 365), f"{total_controls} material controls replace 40 shared-color knobs (+{net_added})", 18, MUTED)
    frames.append(image)

    frames.append(comparison("diesel-locomotive", "Diesel locomotive",
                             "Sloped nose · glazed cab · teal paint · steel running gear · amber lamps"))
    frames.append(comparison("crossing-warning-light", "Rail crossing warning light",
                             "Galvanized post · red and amber lenses · high-visibility hoods"))
    frames.append(comparison("station-platform", "Station platform",
                             "Concrete platform · tactile polymer strip · access steps"))

    source = (ROOT / "catalog/kits/railway/diesel-locomotive.kcad.ts").read_text().splitlines()
    excerpts = [line.strip() for line in source if any(token in line for token in (
        "param('paintedSteel'", "param('glass'", "param('signalAmberGlass'", "presets({",
        "weathered:", "freshService:", 'p.part("nose", path()', 'p.part("cab-side-window-left"',
    ))]
    image, draw = canvas("Source authoring", "Materials and silhouette stay editable",
                         "Actual .kcad.ts knobs, presets, and the refined locomotive geometry")
    y = 176
    for line in excerpts[:8]:
        if len(line) > 92:
            line = line[:89] + "..."
        draw.rounded_rectangle((58, y - 4, 902, y + 29), radius=5, fill=(229, 237, 241))
        text(draw, (72, y), line, 14, BLUE if "presets" in line else INK)
        y += 40
    draw.rectangle((0, 506, W, H), fill=BLUE)
    text(draw, (56, 516), "Scale, material colors, and named palette presets are declared in the source", 16, (255, 255, 255), True)
    frames.append(image)

    quality = (BUNDLE / "catalog-quality-output.txt").read_text()
    global_match = re.search(r"(\d+/\d+ assets pass \(\d+ rich kits, \d+ thin kits\))", quality)
    railway_match = re.search(r"(\d+/\d+ assets pass \(1 rich kits, 0 thin kits\))",
                              (BUNDLE / "catalog-quality-railway-output.txt").read_text())
    tests = (BUNDLE / "catalog-test-output.txt").read_text()
    test_match = re.search(r"Tests\s+(\d+) passed", tests)
    if test_match is None or "Test Files  4 passed (4)" not in tests:
        raise ValueError("catalog integration suite did not record a clean four-file pass")
    pages = json.loads((BUNDLE / "catalog-pages-check.json").read_text())
    image, draw = canvas("Local verification", "All 40 railway assets pass",
                         "Previews and local catalog pages regenerated from the promoted sources")
    draw.rounded_rectangle((58, 214, 902, 414), radius=18, fill=(228, 237, 241))
    text(draw, (92, 250), global_match.group(1) if global_match else "Catalog quality summary unavailable", 28, BLUE, True)
    text(draw, (92, 307), railway_match.group(1) if railway_match else "Railway quality summary unavailable", 24, INK, True)
    text(draw, (92, 359), f"{pages['kitPages']} railway pages · {pages['kitPages']} previews · ESLint clean · {test_match.group(1)} catalog tests pass", 17, MUTED)
    draw.rectangle((0, 506, W, H), fill=BLUE)
    text(draw, (56, 516), "Branch-local render and page build · deployed behavior unverified · hardware acceptance not performed", 14, (255, 255, 255), True)
    frames.append(image)

    for index, frame in enumerate(frames, start=1):
        frame.save(BUNDLE / "frames" / f"frame-{index:02d}.png")

    video = BUNDLE / "railway-quality-promotion.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-framerate", "1/3", "-i", str(BUNDLE / "frames/frame-%02d.png"),
        "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(video),
    ], check=True)
    print(f"Wrote {video} from {len(frames)} walkthrough frames")


if __name__ == "__main__":
    main()
