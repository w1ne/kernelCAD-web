#!/usr/bin/env python3
"""Run the Pi 4 USB-C STEP regression and render its short evidence demo."""
from __future__ import annotations

import hashlib
import os
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
BLUE = "#82b7eb"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)


def slide(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.text((72, 48), "KERNELCAD  /  MANUFACTURING BENCHMARK 01", font=font(18, True), fill=GREEN)
    draw.text((72, 94), title, font=font(36, True), fill=INK)
    draw.text((72, 154), subtitle, font=font(20), fill=MUTED)
    draw.line((72, 194, 1208, 194), fill="#314551", width=2)
    return image, draw


def draw_tray(draw: ImageDraw.ImageDraw, left: int, top: int, width: int, *, stale: bool = False) -> None:
    right, bottom = left + width, top + 210
    draw.rounded_rectangle((left, top, right, bottom), radius=18, fill=PLATE, outline="#b8c5cb", width=3)
    cx = (left + right) // 2
    hole_x = left + int(width * (47.5 / 120)) if stale else cx
    draw.rectangle((hole_x - 24, bottom - 8, hole_x + 24, bottom + 5), fill=BG)
    for dx in (-155, 155):
        draw.ellipse((cx + dx - 10, top + 104 - 10, cx + dx + 10, top + 104 + 10), fill=BLUE)
    draw.text((left + 10, bottom + 18), "USB-C opening" if not stale else "stale port", font=font(16, True), fill=RED if stale else GREEN)


def run_test() -> str:
    result = subprocess.run(
        [
            "npx", "vitest", "run", "tests/integration/manufacturing/pcbEnclosureBenchmark.test.ts",
            "-t", "re-imports from STEP|Width edit|USB-C opening left", "--reporter=dot",
        ],
        cwd=ROOT,
        env={**os.environ, "NO_COLOR": "1", "CI": "1"},
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=True,
        timeout=240,
    )
    if "3 passed" not in result.stdout:
        raise RuntimeError("focused Vitest run did not report three passing regressions")
    VERIFICATION.mkdir(parents=True, exist_ok=True)
    (VERIFICATION / "test-output.txt").write_text(result.stdout.rstrip() + "\n")
    return result.stdout


def render() -> None:
    result = run_test()
    FRAMES.mkdir(exist_ok=True)

    image, draw = slide("Resize the Pi 4 tray", "Width changes from 95 mm to 120 mm; the board interface and front port stay centred.")
    draw_tray(draw, 100, 245, 475)
    draw_tray(draw, 620, 245, 600)
    draw.text((100, 520), "95 mm", font=font(20, True), fill=MUTED)
    draw.text((620, 520), "120 mm", font=font(20, True), fill=GREEN)
    draw.rounded_rectangle((620, 565, 1180, 634), radius=12, fill=PANEL)
    draw.text((652, 586), "USB-C centre X = Width / 2", font=font(18, True), fill=INK)
    image.save(FRAMES / "slide-01.png")

    image, draw = slide("Probe the real STEP opening", "The check re-imports STEP and samples small volumes through the front wall.")
    draw.rectangle((210, 300, 1070, 390), fill=PLATE, outline="#b8c5cb", width=3)
    left, right, center = 606, 674, 640
    draw.rectangle((left, 294, right, 396), fill=BG)
    draw.line((center, 260, center, 430), fill=GREEN, width=4)
    draw.ellipse((center - 8, 328, center + 8, 344), fill=GREEN)
    draw.ellipse((566, 328, 582, 344), fill=BLUE)
    draw.ellipse((686, 328, 702, 344), fill=BLUE)
    draw.text((210, 452), "Opening: 9.4 × 3.6 mm at X = 60 mm", font=font(21, True), fill=INK)
    draw.rounded_rectangle((210, 518, 1070, 604), radius=12, fill=PANEL)
    draw.text((245, 548), "centre clear", font=font(21, True), fill=GREEN)
    draw.text((650, 548), "wall present outside both edges", font=font(20), fill=BLUE)
    image.save(FRAMES / "slide-02.png")

    image, draw = slide("A stale X datum shifts the port", "The opening keeps the same size and volume, so the existing global checks miss it.")
    draw.rectangle((210, 300, 1070, 390), fill=PLATE, outline="#b8c5cb", width=3)
    stale_center, expected_center = 550, 640
    draw.rectangle((stale_center - 34, 294, stale_center + 34, 396), fill=BG)
    draw.line((expected_center, 265, expected_center, 428), fill=RED, width=4)
    draw.ellipse((expected_center - 8, 328, expected_center + 8, 344), fill=RED)
    draw.text((210, 452), "mutant opening centre X = 47.5 mm", font=font(20, True), fill=RED)
    draw.rounded_rectangle((210, 518, 1070, 616), radius=12, fill=PANEL)
    draw.text((245, 540), "volume / bounds / bosses: pass", font=font(18, True), fill=INK)
    draw.text((245, 578), "expected USB-C centre: blocked in STEP", font=font(20, True), fill=RED)
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
