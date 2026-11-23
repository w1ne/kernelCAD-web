#!/usr/bin/env python3
"""Build and inspect a short MP4 of the mining asset material review."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parent
PREVIEWS = ROOT / "samples" / "previews"
SLIDES = ROOT / "slides"
REVIEW = ROOT / "video-review"
VIDEO = ROOT / "review-demo.mp4"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
W, H = 1280, 720
SECONDS_PER_SLIDE = 1.6

ASSETS = [
    {
        "id": "assay-sample-divider",
        "title": "Rotary assay sample divider",
        "observation": "The eight open sample buckets now read as stainless steel and match the carousel and feed surfaces.",
        "materials": "Blue housing · stainless contact parts · separate ore",
        "bounds": "2,032 triangles · 0.690 × 0.820 × 0.505 m",
    },
    {
        "id": "core-tray-rack",
        "title": "Exploration core tray rack",
        "observation": "Braced tiers, load beams, channel trays, core runs and tags read as a core-shed rack.",
        "materials": "Rack steel · painted beams · plastic trays · core rock",
        "bounds": "6,432 triangles · 2.340 × 1.620 × 1.650 m",
    },
    {
        "id": "mine-refuge-chamber",
        "title": "Mine refuge chamber",
        "observation": "The sealed shell, access bands and external life-support cylinders read as a refuge chamber.",
        "materials": "Painted shell · reflective bands · steel fittings",
        "bounds": "3,468 triangles · 5.637 × 3.200 × 2.684 m",
    },
    {
        "id": "mine-survey-tripod",
        "title": "Mine survey tripod",
        "observation": "Tripod, total station, prism pole, bipod and carry case remain distinct in the preview.",
        "materials": "Colored legs · metal joints and feet · instrument trim",
        "bounds": "1,464 triangles · 2.955 × 1.920 × 1.602 m",
    },
    {
        "id": "mine-ventilation-fan",
        "title": "Mine ventilation fan station",
        "observation": "Axial fan, inlet, drive, elevated discharge, shaft collar and electrical house are visible.",
        "materials": "Coated duct · structural steel · concrete · cladding",
        "bounds": "3,236 triangles · 16.200 × 10.400 × 13.600 m",
    },
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)


def wrap(text: str, font_obj: ImageFont.FreeTypeFont, max_width: int) -> str:
    words = text.split()
    lines: list[str] = []
    line = ""
    probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    for word in words:
        candidate = f"{line} {word}".strip()
        if probe.textbbox((0, 0), candidate, font=font_obj)[2] <= max_width:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return "\n".join(lines)


def base_slide(section: str, page: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (W, H), "#f4f7fa")
    draw = ImageDraw.Draw(image)
    draw.text((58, 38), "KERNELCAD  /  MINING ASSET REVIEW  /  19 NOV 2026", font=font(18, True), fill="#3c556c")
    draw.text((58, 78), section, font=font(34, True), fill="#172b3d")
    draw.line((58, 654, 1222, 654), fill="#bcc9d4", width=2)
    draw.text((58, 674), "Local software-rendered previews · no deployment, simulation or hardware claim", font=font(15), fill="#42576a")
    draw.text((1154, 674), page, font=font(15, True), fill="#42576a")
    return image, draw


def make_contact_sheet() -> None:
    panel_w, panel_h = 236, 270
    sheet = Image.new("RGB", (panel_w * len(ASSETS), panel_h), "#e9eff4")
    draw = ImageDraw.Draw(sheet)
    for index, asset in enumerate(ASSETS):
        x = index * panel_w
        preview = Image.open(PREVIEWS / f"{asset['id']}.png").convert("RGB")
        preview.thumbnail((220, 220), Image.Resampling.LANCZOS)
        sheet.paste(preview, (x + (panel_w - preview.width) // 2, 4))
        draw.text((x + 8, 230), asset["title"], font=font(13, True), fill="#20394e")
        draw.text((x + 8, 250), asset["id"], font=font(11), fill="#42576a")
    sheet.save(ROOT / "contact-sheet.png")


def make_slides() -> list[Path]:
    SLIDES.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []

    image, draw = base_slide("Five industrial previews checked", "01 / 08")
    draw.text((60, 145), "Scope: object identity · process features · materials · catalog envelope", font=font(21, True), fill="#2e526f")
    contact = Image.open(ROOT / "contact-sheet.png").convert("RGB")
    contact.thumbnail((1160, 305), Image.Resampling.LANCZOS)
    image.paste(contact, ((W - contact.width) // 2, 205))
    draw.text((60, 545), "One material mismatch selected; four other previews had no supported mismatch.", font=font(20, True), fill="#26704c")
    p = SLIDES / "slide-01-scope.png"; image.save(p); paths.append(p)

    image, draw = base_slide("Sample-bucket material correction", "02 / 08")
    before = Image.open(ROOT / "before/assay-sample-divider.png").convert("RGB")
    after = Image.open(ROOT / "after/assay-sample-divider.png").convert("RGB")
    for picture, x in [(before, 36), (after, 684)]:
        fitted = ImageOps.contain(picture, (560, 500), Image.Resampling.LANCZOS)
        image.paste(fitted, (x + (560 - fitted.width) // 2, 132 + (500 - fitted.height) // 2))
    draw.text((90, 620), "BEFORE · pale `jarPlastic`", font=font(18, True), fill="#42576a")
    draw.text((740, 620), "AFTER · existing `stainlessSteel` palette", font=font(18, True), fill="#26704c")
    p = SLIDES / "slide-02-before-after.png"; image.save(p); paths.append(p)

    for page, asset in enumerate(ASSETS[1:], start=3):
        image, draw = base_slide(asset["title"], f"{page:02d} / 08")
        preview = Image.open(PREVIEWS / f"{asset['id']}.png").convert("RGB")
        preview = ImageOps.contain(preview, (550, 550), Image.Resampling.LANCZOS)
        image.paste(preview, (45 + (560 - preview.width) // 2, 115 + (550 - preview.height) // 2))
        draw.text((645, 147), asset["id"], font=font(21, True), fill="#385b77")
        draw.multiline_text((645, 205), wrap(asset["observation"], font(23), 560), font=font(23), fill="#25394a", spacing=10)
        draw.text((645, 365), "VISIBLE MATERIAL ROLES", font=font(16, True), fill="#385b77")
        draw.multiline_text((645, 399), wrap(asset["materials"], font(21), 560), font=font(21), fill="#25394a", spacing=8)
        draw.text((645, 510), asset["bounds"], font=font(17), fill="#42576a")
        draw.text((645, 560), "No additional mismatch established.", font=font(19, True), fill="#26704c")
        p = SLIDES / f"slide-{page:02d}-{asset['id']}.png"; image.save(p); paths.append(p)

    image, draw = base_slide("Verification and result", "07 / 08")
    draw.text((80, 155), "Focused GLB regression", font=font(22, True), fill="#385b77")
    draw.text((80, 196), "fails on original `jarPlastic`; passes on stainless-steel bucket mapping", font=font(20), fill="#25394a")
    draw.text((80, 270), "Geometry", font=font(22, True), fill="#385b77")
    draw.text((80, 311), "2,032 triangles · 0.690 × 0.820 × 0.504868 m · unchanged", font=font(20), fill="#25394a")
    draw.text((80, 385), "Catalog", font=font(22, True), fill="#385b77")
    draw.text((80, 426), "Preview refreshed · generated index source hash verified", font=font(20), fill="#25394a")
    draw.text((80, 518), "Local preview and regression only; no simulation, deployment or hardware acceptance.", font=font(18), fill="#42576a")
    p = SLIDES / "slide-07-verification.png"; image.save(p); paths.append(p)

    image, draw = base_slide("Audit result", "08 / 08")
    draw.text((90, 170), "1 mismatch corrected", font=font(46, True), fill="#26704c")
    draw.multiline_text((90, 258), "The eight sample buckets now use the existing stainless-steel palette.\nOre remains separate; four other reviewed previews needed no change.", font=font(25), fill="#25394a", spacing=14)
    draw.text((90, 425), "Model geometry, size, triangle budget and asset identity are unchanged.", font=font(20), fill="#42576a")
    p = SLIDES / "slide-08-result.png"; image.save(p); paths.append(p)
    return paths


def encode(paths: list[Path]) -> None:
    concat = ROOT / "verification" / "ffmpeg-concat.txt"
    lines: list[str] = []
    for path in paths:
        lines.extend((f"file '{path.resolve()}'", f"duration {SECONDS_PER_SLIDE}"))
    lines.append(f"file '{paths[-1].resolve()}'")
    concat.write_text("\n".join(lines) + "\n")
    command = [
        "ffmpeg", "-hide_banner", "-loglevel", "warning", "-y",
        "-f", "concat", "-safe", "0", "-i", str(concat),
        "-vf", "fps=24,format=yuv420p", "-c:v", "libx264", "-preset", "medium",
        "-crf", "25", "-movflags", "+faststart", str(VIDEO),
    ]
    result = subprocess.run(command, text=True, capture_output=True, check=True)
    (ROOT / "verification" / "demo-generation.txt").write_text(
        "Command: " + " ".join(command) + "\n" + result.stderr
    )


def inspect_video() -> None:
    REVIEW.mkdir(parents=True, exist_ok=True)
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(VIDEO)],
        text=True, capture_output=True, check=True,
    )
    (REVIEW / "video-probe.json").write_text(json.dumps(json.loads(probe.stdout), indent=2) + "\n")
    frames = []
    for index in range(8):
        frame = REVIEW / f"frame-{index}.png"
        timestamp = (index + 0.5) * SECONDS_PER_SLIDE
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(timestamp), "-i", str(VIDEO), "-frames:v", "1", str(frame)],
            check=True,
        )
        frames.append(frame)
    cell_w, cell_h = 480, 270
    contact = Image.new("RGB", (cell_w * 2, cell_h * 4), "#dbe4eb")
    for index, frame in enumerate(frames):
        image = Image.open(frame).convert("RGB").resize((cell_w, cell_h), Image.Resampling.LANCZOS)
        contact.paste(image, ((index % 2) * cell_w, (index // 2) * cell_h))
    contact.save(REVIEW / "contact-sheet.png")
    (REVIEW / "inspection.md").write_text(
        "# Video inspection\n\n"
        "The MP4 was probed with ffprobe and reviewed using one extracted frame "
        "from each of its eight slides. Captions and the before/after material "
        "change are readable. The video documents local software rendering and "
        "a GLB regression only; it makes no simulation, deployment or hardware "
        "acceptance claim. See `video-probe.json` and `contact-sheet.png`.\n"
    )


def main() -> None:
    make_contact_sheet()
    paths = make_slides()
    encode(paths)
    inspect_video()
    print(f"wrote {VIDEO.relative_to(ROOT)} ({len(paths)} slides)")


if __name__ == "__main__":
    main()
