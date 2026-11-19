#!/usr/bin/env python3
"""Render and verify the NEMA 17 base-hole cutter regression demo."""
from __future__ import annotations

import hashlib
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
VERIFICATION = HERE / "verification"
FRAMES = HERE / "frames"
VIDEO = HERE / "demo.mp4"

BG = "#101820"
PANEL = "#192631"
INK = "#edf3f6"
MUTED = "#9fb0ba"
PLATE = "#687b86"
GREEN = "#67c99a"
RED = "#f26d6d"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)


def slide(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.text((72, 48), "KERNELCAD  /  MANUFACTURING BENCHMARK 02", font=font(18, True), fill=GREEN)
    draw.text((72, 94), title, font=font(37, True), fill=INK)
    draw.text((72, 154), subtitle, font=font(20), fill=MUTED)
    draw.line((72, 194, 1208, 194), fill="#314551", width=2)
    return image, draw


def bracket(draw: ImageDraw.ImageDraw, x: int, y: int, thick: int, color: str) -> None:
    draw.rectangle((x, y, x + thick, y + 260), fill=color, outline="#b8c5cb", width=3)
    draw.rectangle((x, y + 260 - thick, x + 410, y + 260), fill=color, outline="#b8c5cb", width=3)


def base_section(draw: ImageDraw.ImageDraw, stale: bool) -> None:
    left, right, top, bottom = 210, 660, 300, 500
    draw.rectangle((left, top, right, bottom), fill=PLATE, outline="#b8c5cb", width=3)
    center_x = (left + right) // 2
    for hole_x in (center_x - 105, center_x + 105):
        if stale:
            # The cutter starts below the base and leaves a 2 mm roof.
            end = top + 50
            draw.rectangle((hole_x - 19, end, hole_x + 19, bottom), fill=BG)
            draw.rectangle((hole_x - 19, top, hole_x + 19, end), fill=RED)
        else:
            draw.rectangle((hole_x - 19, top, hole_x + 19, bottom), fill=BG)
        draw.ellipse((hole_x - 19, top - 19, hole_x + 19, top + 19), fill=GREEN if not stale else RED)
    draw.text((left, bottom + 28), "8 mm base section  ·  schematic", font=font(17, True), fill=INK)
    if stale:
        draw.text((right + 25, top + 15), "2 mm skin", font=font(18, True), fill=RED)


def run_test() -> str:
    result = subprocess.run(
        [
            "npx", "vitest", "run", "tests/integration/manufacturing/nema17BracketBenchmark.test.ts",
            "-t", "base holes that keep their old cutter length", "--reporter=dot",
        ],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=True,
        timeout=240,
    )
    if "1 passed" not in result.stdout:
        raise RuntimeError("focused Vitest run did not report one passing regression")
    VERIFICATION.mkdir(parents=True, exist_ok=True)
    (VERIFICATION / "test-output.txt").write_text(result.stdout.rstrip() + "\n")
    return result.stdout


def render() -> None:
    result = run_test()
    FRAMES.mkdir(exist_ok=True)

    image, draw = slide("Edit the plate Thickness parameter", "set_param changes 5 mm to 8 mm; the base-hole cutters must grow with it.")
    bracket(draw, 245, 245, 38, "#425461")
    bracket(draw, 435, 245, 62, PLATE)
    draw.text((248, 552), "5 mm", font=font(19, True), fill=MUTED)
    draw.text((440, 552), "8 mm", font=font(19, True), fill=GREEN)
    draw.rounded_rectangle((760, 260, 1170, 532), radius=16, fill=PANEL)
    draw.text((800, 300), "Actual STEP round-trip", font=font(22, True), fill=INK)
    draw.text((800, 370), "2 × 5.5 mm M5 holes", font=font(20), fill=GREEN)
    draw.text((800, 420), "depth follows 8 mm plate", font=font(18), fill=GREEN)
    draw.text((800, 478), "through-kind preserved", font=font(18, True), fill=GREEN)
    image.save(FRAMES / "slide-01.png")

    image, draw = slide("The clean base stays drilled through", "Both M5 holes cross the thicker flange in the exported and re-imported STEP.")
    base_section(draw, stale=False)
    draw.rounded_rectangle((760, 275, 1170, 525), radius=16, fill=PANEL)
    draw.text((800, 316), "STEP interface checks", font=font(22, True), fill=INK)
    draw.text((800, 380), "2 holes at 40 mm pitch", font=font(18), fill=GREEN)
    draw.text((800, 425), "8 mm depth, through", font=font(19, True), fill=GREEN)
    draw.text((800, 480), "focused regression: pass", font=font(18), fill=GREEN)
    image.save(FRAMES / "slide-02.png")

    image, draw = slide("A stale 7 mm cutter leaves a blind floor", "It ends 2 mm short inside the 8 mm plate; the interface and volume gates reject it.")
    base_section(draw, stale=True)
    draw.rounded_rectangle((760, 275, 1170, 525), radius=16, fill=PANEL)
    draw.text((800, 316), "Seeded mutant", font=font(22, True), fill=RED)
    draw.text((800, 380), "M5 depth + kind fail", font=font(19), fill=RED)
    draw.text((800, 425), "volume check fails", font=font(19), fill=RED)
    draw.text((800, 480), "outer bounds still pass", font=font(18, True), fill=INK)
    image.save(FRAMES / "slide-03.png")

    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-framerate", "1/4", "-i", str(FRAMES / "slide-%02d.png"),
        "-vf", "fps=24,format=yuv420p", "-t", "12", "-an", "-movflags", "+faststart", str(VIDEO),
    ], check=True)
    print(result.strip().splitlines()[-3:])
    print(f"video_sha256={hashlib.sha256(VIDEO.read_bytes()).hexdigest()}")
    print(f"video_bytes={VIDEO.stat().st_size}")


if __name__ == "__main__":
    render()
