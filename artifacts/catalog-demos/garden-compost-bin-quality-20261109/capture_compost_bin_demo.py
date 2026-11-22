#!/usr/bin/env python3
"""Build a short local before/after and front-access demo from rendered PNGs."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
W, H = 1280, 720
BG = (238, 243, 248)
INK = (25, 39, 58)
MUTED = (83, 99, 119)
ACCENT = (39, 101, 126)
WHITE = (255, 255, 255)
FOOTER = "Local kernelCAD source preview · not deployed · not physically accepted"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)


def contain(path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    panel = Image.new("RGB", size, WHITE)
    panel.paste(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return panel


def base_frame(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    frame = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(frame)
    draw.rectangle((0, 0, W, 94), fill=INK)
    draw.text((55, 20), "kernelCAD · garden catalog", font=font(21, True), fill=(176, 202, 219))
    draw.text((55, 116), title, font=font(34, True), fill=INK)
    draw.text((56, 162), subtitle, font=font(20), fill=MUTED)
    draw.rectangle((0, H - 54, W, H), fill=INK)
    draw.text((55, H - 39), FOOTER, font=font(15), fill=(224, 233, 241))
    return frame, draw


def single_slide(title: str, subtitle: str, image_path: Path, label: str, filename: str) -> None:
    frame, draw = base_frame(title, subtitle)
    panel = contain(image_path, (560, 455))
    frame.paste(panel, (55, 190))
    draw.text((670, 235), label, font=font(27, True), fill=ACCENT)
    draw.text((670, 294), "Editable source controls", font=font(20, True), fill=INK)
    draw.text((670, 332), "• treated timber color", font=font(19), fill=MUTED)
    draw.text((670, 366), "• compost color", font=font(19), fill=MUTED)
    draw.text((670, 400), "• front access choice", font=font(19), fill=MUTED)
    frame.save(OUT / "frames" / filename)


def access_slide() -> None:
    frame, draw = base_frame("Choose the front access", "The same bin source builds three useful front-board configurations.")
    for x, variant, label in [
        (55, "lower-access", "Lower access"),
        (660, "closed", "Closed front"),
    ]:
        frame.paste(contain(OUT / "variants" / f"{variant}.png", (555, 410)), (x, 216))
        draw.text((x + 18, 632), label, font=font(21, True), fill=ACCENT)
    frame.save(OUT / "frames" / "03-access-choices.png")


def main() -> None:
    before = OUT / "before-preview.png"
    current = ROOT / "catalog/kits/garden/previews/compost-bin.png"
    if not before.is_file() or not current.is_file():
        raise SystemExit("baseline or current preview is missing")
    single_slide(
        "Existing asset, clearer materials and access",
        "Refine the current garden/compost-bin ID; no catalog entries are added.",
        before,
        "Before · boards cover each side",
        "01-before.png",
    )
    single_slide(
        "Default view exposes the compost",
        "Open front, slatted sides and rear, rounded compost-colored pile.",
        current,
        "Default · open front",
        "02-open-default.png",
    )
    access_slide()
    single_slide(
        "Named preset changes the timber finish",
        "The painted preset recolors timber while retaining the compost material.",
        OUT / "variants" / "painted.png",
        "Preset · painted",
        "04-painted-preset.png",
    )

    inputs = []
    for name in ["01-before.png", "02-open-default.png", "03-access-choices.png", "04-painted-preset.png"]:
        inputs.extend(["-loop", "1", "-framerate", "30", "-t", "3", "-i", str(OUT / "frames" / name)])
    concat = "".join(f"[{index}:v]" for index in range(4)) + "concat=n=4:v=1:a=0,format=yuv420p[v]"
    command = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *inputs,
        "-filter_complex", concat, "-map", "[v]", "-r", "30", "-c:v", "libx264",
        "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        str(OUT / "compost-bin-quality.mp4"),
    ]
    subprocess.run(command, check=True)
    print("wrote compost-bin-quality.mp4: four 3-second local preview slides")


if __name__ == "__main__":
    main()
