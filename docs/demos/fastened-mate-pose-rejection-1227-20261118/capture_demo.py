#!/usr/bin/env python3
"""Render the fastened-mate pose-override regression as a short MP4."""
from __future__ import annotations

import hashlib
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "demo.mp4"
BG = "#101820"
PANEL = "#192631"
INK = "#edf3f6"
MUTED = "#9fb0ba"
BLUE = "#527c94"
GREEN = "#67c99a"
RED = "#f26d6d"
AMBER = "#f2ad57"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)


def slide(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.text((72, 44), "KERNELCAD  /  SOLVE_MATES REGRESSION", font=font(18, True), fill=GREEN)
    draw.text((72, 94), title, font=font(38, True), fill=INK)
    draw.text((72, 154), subtitle, font=font(20), fill=MUTED)
    draw.line((72, 194, 1208, 194), fill="#314551", width=2)
    return image, draw


def assembly(draw: ImageDraw.ImageDraw, rejected: bool) -> None:
    draw.rounded_rectangle((128, 318, 408, 454), radius=16, fill=BLUE)
    draw.rounded_rectangle((808, 318, 1088, 454), radius=16, fill=AMBER)
    draw.text((225, 365), "base", font=font(26, True), fill=INK)
    draw.text((906, 365), "link", font=font(26, True), fill=INK)
    draw.line((408, 386, 808, 386), fill=GREEN if not rejected else RED, width=7)
    draw.rounded_rectangle((510, 330, 706, 377), radius=12, fill=PANEL)
    draw.text((535, 342), "fastened", font=font(20, True), fill=GREEN)
    if rejected:
        draw.arc((795, 266, 1090, 560), start=205, end=300, fill=RED, width=8)
        draw.polygon([(1057, 294), (1085, 315), (1047, 321)], fill=RED)
        draw.text((473, 470), "requested pose: rigid = 90°", font=font(20, True), fill=RED)
    else:
        draw.arc((795, 266, 1090, 560), start=205, end=300, fill=GREEN, width=8)
        draw.polygon([(1057, 294), (1085, 315), (1047, 321)], fill=GREEN)
        draw.text((500, 470), "revolute mate: one rotation", font=font(20, True), fill=GREEN)


def render() -> None:
    with tempfile.TemporaryDirectory(prefix="fastened-pose-", dir=HERE) as tmp:
        frames = Path(tmp)
        first, draw = slide("Articulated mates accept pose overrides", "A revolute joint has a rotation coordinate the solver can apply.")
        assembly(draw, rejected=False)
        draw.text((72, 672), "Schematic; local solver test supplies the numeric result.", font=font(15), fill=MUTED)
        first.save(frames / "slide-01.png")

        second, draw = slide("A fastened mate has no pose coordinate", "Submitting 90° used to return success with the link unchanged.")
        assembly(draw, rejected=True)
        draw.rounded_rectangle((384, 534, 896, 620), radius=14, fill=PANEL)
        draw.text((420, 558), "solve_mates({ poses: { rigid: 90 } })", font=font(20, True), fill=INK)
        draw.text((72, 672), "Reproduction is an abstract two-part assembly.", font=font(15), fill=MUTED)
        second.save(frames / "slide-02.png")

        third, draw = slide("The invalid request now fails clearly", "The solver returns feature.invalid-args and names the zero-DOF mate.")
        draw.rounded_rectangle((112, 242, 1168, 564), radius=20, fill=PANEL)
        draw.text((160, 290), "ok: false", font=font(34, True), fill=RED)
        draw.text((160, 356), "errorCode: feature.invalid-args", font=font(26, True), fill=AMBER)
        draw.text((160, 416), "poses.rigid — no pose for a fastened mate", font=font(23, True), fill=INK)
        draw.text((160, 462), "because it has zero articulation DOFs", font=font(23), fill=INK)
        draw.text((160, 520), "Focused unit tests: 2 passed  ·  MCP test: 1 passed", font=font(20, True), fill=GREEN)
        draw.text((72, 672), "Local source verification only; no deployment or hardware claim.", font=font(15), fill=MUTED)
        third.save(frames / "slide-03.png")

        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-framerate", "1/3", "-i", str(frames / "slide-%02d.png"),
            "-vf", "fps=24,format=yuv420p", "-t", "9", "-an", "-movflags", "+faststart", str(OUTPUT),
        ], check=True)

    print(f"video_sha256={hashlib.sha256(OUTPUT.read_bytes()).hexdigest()}")
    print(f"video_bytes={OUTPUT.stat().st_size}")


if __name__ == "__main__":
    render()
