#!/usr/bin/env python3
"""Build the review contact sheet and short, captioned preview-audit video."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
PREVIEWS = ROOT / "previews"
FRAMES = ROOT / "verification" / "frames"
VIDEO = ROOT / "review-demo.mp4"
ASSETS = [
    (
        "green-waste-shredder",
        "Tracked mobile shredder",
        "12.727 × 4.440 × 3.100",
        "Crawler tracks, feed hopper, engine module, and long discharge conveyor.",
        "Painted body, dark chassis, metal wear parts, and brush/mulch read separately.",
    ),
    (
        "plastic-film-compactor",
        "Plastic-film screw compactor",
        "5.270 × 2.444 × 1.740",
        "Open hopper, ribbed barrel, gearmotor, and roll cage at the outlet.",
        "Steel hopper/barrel, painted frame/drive, and polymer film are distinct.",
    ),
    (
        "plastic-flake-silo",
        "Plastic-flake silo",
        "5.800 × 15.400 × 4.100",
        "Tall shell, pneumatic fill line, roof cyclone, rotary outlet, and ladder.",
        "Metal shell, darker skirt/pipework, and contrasting safety rails are visible.",
    ),
    (
        "recovered-plastic-bagger",
        "Recovered-plastic big-bag filler",
        "3.770 × 3.620 × 2.032",
        "Four-post frame, inclined screw feed, suspended bag, and weigh platform.",
        "Painted frame, woven bag, timber pallet, and plastic flake are distinct.",
    ),
    (
        "product-pelletizer",
        "Plastic strand pelletizer",
        "5.870 × 1.840 × 1.338",
        "Extruder barrel, feed hopper, water bath, cutter, and pellet bin.",
        "Metal barrel, painted frame/drive, water, and polymer strands are visible.",
    ),
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.ImageFont, width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=fnt)[2] <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_paragraph(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fnt: ImageFont.ImageFont, width: int, fill: str, leading: int = 9) -> int:
    x, y = xy
    for line in wrap(draw, text, fnt, width):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += fnt.size + leading
    return y


def base_slide(title: str, tag: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (1280, 720), "#edf2f5")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 1280, 104), fill="#15364f")
    draw.text((48, 20), title, font=font(36, True), fill="white")
    draw.text((48, 67), tag, font=font(17), fill="#bcd1df")
    return image, draw


def asset_slide(index: int, item: tuple[str, str, str, str, str]) -> Image.Image:
    slug, title, envelope, identity, materials = item
    image, draw = base_slide(title, f"Review {index}/5  ·  {slug}  ·  index sizeM {envelope} m (exported GLB axes)")
    draw.rounded_rectangle((42, 132, 606, 686), radius=18, fill="white", outline="#d5dee4", width=2)
    preview = Image.open(PREVIEWS / f"{slug}.png").convert("RGB")
    preview.thumbnail((520, 520), Image.Resampling.LANCZOS)
    image.paste(preview, (64 + (520 - preview.width) // 2, 148 + (520 - preview.height) // 2))
    draw = ImageDraw.Draw(image)
    draw.text((656, 158), "VISIBLE IDENTITY", font=font(17, True), fill="#31546d")
    y = draw_paragraph(draw, (656, 190), identity, font(23), 560, "#1f2d36", 10)
    draw.text((656, y + 25), "MATERIAL CHECK", font=font(17, True), fill="#31546d")
    y = draw_paragraph(draw, (656, y + 58), materials, font(23), 560, "#1f2d36", 10)
    draw.rounded_rectangle((656, min(y + 34, 594), 1208, min(y + 92, 652)), radius=12, fill="#e1f0e7")
    draw.text((680, min(y + 48, 608)), "No mismatch established", font=font(22, True), fill="#24563b")
    draw.text((48, 692), "Local software preview audit  ·  no simulation or hardware acceptance claim", font=font(15), fill="#536975")
    return image


def summary_slide() -> Image.Image:
    image, draw = base_slide("Five previews checked", "Recycling facility  ·  semantic material review  ·  18 November 2026")
    draw.rounded_rectangle((62, 140, 1218, 590), radius=20, fill="white", outline="#d5dee4", width=2)
    draw.text((100, 180), "Result", font=font(28, True), fill="#15364f")
    draw_paragraph(draw, (100, 232), "All five silhouettes read as their named machinery and their visible material zones were coherent.", font(25), 1060, "#1f2d36", 11)
    draw.text((100, 340), "No material mismatch was established.", font=font(28, True), fill="#24563b")
    draw.text((100, 410), "No asset source, preview, test, or catalog index row changed.", font=font(23), fill="#1f2d36")
    draw_paragraph(draw, (100, 492), "Local software preview review only. This does not establish simulation, deployment, or hardware acceptance.", font(18), 1060, "#536975", 8)
    draw.text((48, 692), "Scope: five existing assets  ·  zero confirmed material mismatches", font=font(15), fill="#536975")
    return image


def main() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)
    slides = [asset_slide(i + 1, item) for i, item in enumerate(ASSETS)] + [summary_slide()]

    # Readable 3-column contact sheet for the five reviewed previews.
    contact = Image.new("RGB", (1800, 1120), "#dfe6eb")
    for i, slide in enumerate(slides[:5]):
        tile = slide.resize((880, 495), Image.Resampling.LANCZOS)
        x = 14 + (i % 2) * 900
        y = 14 + (i // 2) * 365
        # Contact sheet uses the preview crop and a clear label, not the slide text.
        slug = ASSETS[i][0]
        source = Image.open(PREVIEWS / f"{slug}.png").convert("RGB")
        source.thumbnail((840, 300), Image.Resampling.LANCZOS)
        contact.paste(source, (x + (840 - source.width) // 2, y + 8))
        ImageDraw.Draw(contact).text((x + 10, y + 315), f"{i + 1}. {slug}", font=font(24, True), fill="#15364f")
    contact.save(ROOT / "contact-sheet.png", optimize=True)

    for i, slide in enumerate(slides, 1):
        slide.save(FRAMES / f"slide-{i:02d}.png", optimize=True)
    frame_pattern = FRAMES / "slide-%02d.png"
    subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-framerate", "1/3", "-i", str(frame_pattern),
            "-c:v", "libx264", "-r", "12", "-pix_fmt", "yuv420p",
            "-crf", "23", "-movflags", "+faststart", str(VIDEO),
        ],
        check=True,
    )


if __name__ == "__main__":
    main()
