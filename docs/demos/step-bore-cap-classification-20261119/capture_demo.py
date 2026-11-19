#!/usr/bin/env python3
"""Run and illustrate the thin end-cap bore-classification regression."""
from __future__ import annotations

import hashlib
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SOURCE = ROOT / "src/kernel/backends/occt/holeDetection.ts"
TEST = ROOT / "src/kernel/backends/occt/holeDetection.test.ts"
VERIFICATION = HERE / "verification"
OUTPUT = HERE / "demo.mp4"

BG = "#101820"
PANEL = "#192631"
INK = "#edf3f6"
MUTED = "#9fb0ba"
PLATE = "#687b86"
GREEN = "#67c99a"
AMBER = "#f2ad57"
RED = "#f26d6d"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    return ImageFont.truetype(path, size)


def slide(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.text((72, 48), "KERNELCAD  /  STEP HOLE INSPECTION", font=font(18, True), fill=GREEN)
    draw.text((72, 94), title, font=font(37, True), fill=INK)
    draw.text((72, 154), subtitle, font=font(20), fill=MUTED)
    draw.line((72, 194, 1208, 194), fill="#314551", width=2)
    return image, draw


def section(draw: ImageDraw.ImageDraw, x: int, y: int, capped: bool) -> None:
    scale = 40
    width = 600
    height = 10 * scale
    bottom = y + height
    draw.rectangle((x, y, x + width, bottom), fill=PLATE, outline="#b8c5cb", width=3)
    hole_width = 4 * scale
    left = x + (width - hole_width) / 2
    right = left + hole_width
    cap_height = 0.1 * scale if capped else 0
    cavity_top = y + cap_height
    draw.rectangle((left, cavity_top, right, bottom), fill=BG)
    if capped:
        draw.rectangle((left, y, right, cavity_top), fill=RED)
    draw.rectangle((x, y, x + width, bottom), outline="#b8c5cb", width=3)
    draw.line((left - 26, y + 5, left - 26, bottom - 5), fill=GREEN, width=3)
    draw.line((left - 36, y + 5, left - 16, y + 5), fill=GREEN, width=3)
    draw.line((left - 36, bottom - 5, left - 16, bottom - 5), fill=GREEN, width=3)
    draw.text((x, bottom + 16), "section through the cylindrical bore", font=font(16, True), fill=INK)


def render() -> None:
    source = SOURCE.read_text()
    test = TEST.read_text()
    assert "2 * PROBE_SPHERE_RADIUS_MM" in source
    assert "plateWithHole(9.9)" in test
    assert "report.holes[0].kind).toBe('blind')" in test

    result = subprocess.run(
        [
            "npx", "vitest", "run", "src/kernel/backends/occt/holeDetection.test.ts",
            "-t", "reports a through hole|measurable 0.1 mm end cap", "--reporter=dot",
        ],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=True,
        timeout=120,
    )
    VERIFICATION.mkdir(parents=True, exist_ok=True)
    (VERIFICATION / "test-output.txt").write_text(result.stdout.rstrip() + "\n")

    frames = HERE / "frames"
    frames.mkdir(exist_ok=True)
    first, draw = slide("A 9.90 mm bore leaves a 0.10 mm cap", "The cylindrical wall ends just before the opposite plate face.")
    section(draw, 338, 235, capped=True)
    draw.text((338, 678), "plate thickness: 10.00 mm", font=font(17, True), fill=INK)
    draw.text((806, 313), "0.10 mm", font=font(19, True), fill=RED)
    draw.text((806, 362), "remaining material", font=font(16), fill=MUTED)
    draw.text((806, 465), "9.90 mm", font=font(21, True), fill=GREEN)
    draw.text((806, 510), "cylindrical wall", font=font(16), fill=MUTED)
    first.save(frames / "slide-01.png")

    second, draw = slide("Probe near the bore end", "The old 0.20 mm offset stepped past this thin cap.")
    draw.rounded_rectangle((110, 248, 1170, 550), radius=20, fill=PANEL)
    draw.text((160, 288), "Bore end", font=font(20, True), fill=INK)
    draw.line((220, 400, 1050, 400), fill="#b8c5cb", width=5)
    draw.rectangle((700, 356, 748, 444), fill=RED)
    draw.text((660, 458), "0.10 mm cap", font=font(16, True), fill=RED)
    draw.ellipse((845 - 12, 400 - 12, 845 + 12, 400 + 12), fill=AMBER)
    draw.line((220, 350, 845, 350), fill=AMBER, width=3)
    draw.line((220, 340, 220, 360), fill=AMBER, width=3)
    draw.line((845, 340, 845, 360), fill=AMBER, width=3)
    draw.text((400, 310), "old near probe: 0.20 mm", font=font(19, True), fill=AMBER)
    draw.ellipse((590 - 12, 400 - 12, 590 + 12, 400 + 12), fill=GREEN)
    draw.text((330, 488), "corrected probe: 0.10 mm", font=font(19, True), fill=GREEN)
    draw.text((160, 585), "The corrected probe lands within the remaining material.", font=font(19), fill=MUTED)
    second.save(frames / "slide-02.png")

    third, draw = slide("Blind and through controls stay distinct", "The classifier now detects the measured cap without changing depth reporting.")
    draw.rounded_rectangle((110, 250, 1170, 550), radius=20, fill=PANEL)
    draw.text((160, 286), "10.00 mm bore / no cap", font=font(22, True), fill=INK)
    draw.text((885, 286), "through", font=font(24, True), fill=GREEN)
    draw.line((160, 340, 1120, 340), fill="#314551", width=2)
    draw.text((160, 370), "9.90 mm bore / 0.10 mm cap", font=font(22, True), fill=INK)
    draw.text((885, 370), "blind", font=font(24, True), fill=GREEN)
    draw.line((160, 425, 1120, 425), fill="#314551", width=2)
    draw.text((160, 458), "Focused OCCT tests: 2 passed", font=font(20, True), fill=GREEN)
    draw.text((160, 501), "depthMm remains the cylindrical wall length", font=font(17), fill=MUTED)
    third.save(frames / "slide-03.png")

    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-framerate", "1/4", "-i", str(frames / "slide-%02d.png"),
        "-vf", "fps=24,format=yuv420p", "-t", "12", "-an", "-movflags", "+faststart", str(OUTPUT),
    ], check=True)

    print(result.stdout.strip().splitlines()[-3:])
    print(f"source_sha256={hashlib.sha256(SOURCE.read_bytes()).hexdigest()}")
    print(f"test_sha256={hashlib.sha256(TEST.read_bytes()).hexdigest()}")
    print(f"video_sha256={hashlib.sha256(OUTPUT.read_bytes()).hexdigest()}")
    print(f"video_bytes={OUTPUT.stat().st_size}")


if __name__ == "__main__":
    render()
