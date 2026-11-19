#!/usr/bin/env python3
"""Run and illustrate the case-01 Pi tray floor parameter regression."""
from __future__ import annotations

import hashlib
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
FIXTURE = ROOT / "tests/fixtures/manufacturing/pcb-enclosure-m3.kcad.ts"
TEST = ROOT / "tests/integration/manufacturing/pcbEnclosureBenchmark.test.ts"
VERIFICATION = HERE / "verification"
OUTPUT = HERE / "demo.mp4"

BG = "#101820"
PANEL = "#192631"
INK = "#edf3f6"
MUTED = "#9fb0ba"
TRAY = "#687b86"
GREEN = "#67c99a"
RED = "#f26d6d"
AMBER = "#f2ad57"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    return ImageFont.truetype(path, size)


def slide(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.text((72, 48), "KERNELCAD  /  MANUFACTURING BENCHMARK 01", font=font(18, True), fill=GREEN)
    draw.text((72, 94), title, font=font(37, True), fill=INK)
    draw.text((72, 154), subtitle, font=font(20), fill=MUTED)
    draw.line((72, 194, 1208, 194), fill="#314551", width=2)
    return image, draw


def z_pixel(z_mm: float) -> float:
    return 600 - z_mm * 26


def section_view(draw: ImageDraw.ImageDraw, floor_mm: float, hole_bottom_mm: float, stale: bool = False) -> None:
    x0, x1, boss_left, boss_right = 200, 520, 290, 430
    floor_top = z_pixel(floor_mm)
    boss_top = z_pixel(floor_mm + 5)
    hole_top = z_pixel(hole_bottom_mm + 4)
    hole_bottom = z_pixel(hole_bottom_mm)
    base_bottom = z_pixel(0)

    draw.rectangle((x0, floor_top, x1, base_bottom), fill=TRAY, outline="#b8c5cb", width=3)
    draw.rectangle((boss_left, boss_top, boss_right, floor_top), fill=TRAY, outline="#b8c5cb", width=3)
    draw.rectangle((boss_left + 46, hole_top, boss_right - 46, hole_bottom), fill=BG, outline=RED if stale else INK, width=3)
    draw.text((x0, base_bottom + 8), "local cross-section / mm", font=font(16), fill=MUTED)

    if stale:
        expected_top = z_pixel(floor_mm + 5)
        expected_bottom = z_pixel(floor_mm + 1)
        draw.rectangle((boss_left + 39, expected_top, boss_right - 39, expected_bottom), outline=GREEN, width=3)
        draw.line((boss_right + 28, expected_top, boss_right + 28, expected_bottom), fill=GREEN, width=3)
        draw.polygon([(boss_right + 21, expected_top + 9), (boss_right + 35, expected_top + 9), (boss_right + 28, expected_top)], fill=GREEN)
        draw.polygon([(boss_right + 21, expected_bottom - 9), (boss_right + 35, expected_bottom - 9), (boss_right + 28, expected_bottom)], fill=GREEN)
        draw.text((boss_right + 44, expected_top + 12), "expected", font=font(14, True), fill=GREEN)
        draw.line((boss_right + 28, hole_top, boss_right + 28, hole_bottom), fill=RED, width=3)
        draw.polygon([(boss_right + 21, hole_top + 9), (boss_right + 35, hole_top + 9), (boss_right + 28, hole_top)], fill=RED)
        draw.polygon([(boss_right + 21, hole_bottom - 9), (boss_right + 35, hole_bottom - 9), (boss_right + 28, hole_bottom)], fill=RED)
        draw.text((boss_right + 44, hole_bottom - 32), "STEP reads mouth z=3", font=font(14, True), fill=RED)
    else:
        draw.line((boss_right + 28, hole_top, boss_right + 28, hole_bottom), fill=GREEN, width=3)
        draw.polygon([(boss_right + 21, hole_top + 9), (boss_right + 35, hole_top + 9), (boss_right + 28, hole_top)], fill=GREEN)
        draw.polygon([(boss_right + 21, hole_bottom - 9), (boss_right + 35, hole_bottom - 9), (boss_right + 28, hole_bottom)], fill=GREEN)
        draw.text((boss_right + 44, hole_top + 12), f"mouth z={floor_mm + 5:g}", font=font(14, True), fill=GREEN)
    draw.text((x0 + 8, base_bottom - 28), f"floor = {floor_mm:g} mm", font=font(16, True), fill=INK)


def run_tests() -> str:
    fixture = FIXTURE.read_text()
    test = TEST.read_text()
    assert "const cy = depth.divide(2);" in fixture
    assert "floor.multiply(0).add(3)" in test
    assert "pilot mouth z: 3 != 8.5" in test

    result = subprocess.run(
        [
            "npx", "vitest", "run", "tests/integration/manufacturing/pcbEnclosureBenchmark.test.ts",
            "-t", "Floor edit|old height after a Floor edit", "--reporter=dot",
        ],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=True,
        timeout=240,
    )
    VERIFICATION.mkdir(parents=True, exist_ok=True)
    (VERIFICATION / "test-output.txt").write_text(result.stdout.rstrip() + "\n")
    return result.stdout


def render() -> None:
    result = run_tests()
    frames = HERE / "frames"
    frames.mkdir(exist_ok=True)

    first, draw = slide("A 2 mm floor places pilots at the boss tops", "Each blind pilot is 4 mm deep, with 1 mm of boss left below it.")
    section_view(draw, 2, 3)
    draw.rounded_rectangle((720, 254, 1170, 560), radius=16, fill=PANEL)
    draw.text((758, 296), "Floor = 2 mm", font=font(24, True), fill=INK)
    draw.text((758, 362), "pilot mouth z   7 mm", font=font(21), fill=GREEN)
    draw.text((758, 408), "pilot axis       -Z", font=font(21), fill=GREEN)
    draw.text((758, 492), "local STEP re-import", font=font(17, True), fill=MUTED)
    first.save(frames / "slide-01.png")

    second, draw = slide("Raise Floor to 3.5 mm", "The parametric boss and pilot move together; the blind opening stays accessible.")
    section_view(draw, 3.5, 4.5)
    draw.rounded_rectangle((720, 254, 1170, 560), radius=16, fill=PANEL)
    draw.text((758, 296), "Floor = 3.5 mm", font=font(24, True), fill=INK)
    draw.text((758, 362), "pilot mouth z   8.5 mm", font=font(21), fill=GREEN)
    draw.text((758, 408), "pilot axis       -Z", font=font(21), fill=GREEN)
    draw.text((758, 492), "STEP interface check: pass", font=font(17, True), fill=GREEN)
    second.save(frames / "slide-02.png")

    third, draw = slide("A stale cutter leaves a closed cavity", "The outer bounds and volume still pass; STEP measures the wrong mouth and axis.")
    section_view(draw, 3.5, 3, stale=True)
    draw.rounded_rectangle((720, 254, 1170, 560), radius=16, fill=PANEL)
    draw.text((758, 296), "Mutant: cutter stays at z=3", font=font(21, True), fill=RED)
    draw.text((758, 362), "expected mouth   8.5 mm", font=font(20), fill=GREEN)
    draw.text((758, 408), "measured mouth   3 mm", font=font(20), fill=RED)
    draw.text((758, 454), "measured axis     +Z", font=font(20), fill=RED)
    draw.text((758, 510), "STEP interface check: reject", font=font(17, True), fill=RED)
    third.save(frames / "slide-03.png")

    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-framerate", "1/4", "-i", str(frames / "slide-%02d.png"),
        "-vf", "fps=24,format=yuv420p", "-t", "12", "-an", "-movflags", "+faststart", str(OUTPUT),
    ], check=True)
    print(result.strip().splitlines()[-3:])
    print(f"fixture_sha256={hashlib.sha256(FIXTURE.read_bytes()).hexdigest()}")
    print(f"test_sha256={hashlib.sha256(TEST.read_bytes()).hexdigest()}")
    print(f"video_sha256={hashlib.sha256(OUTPUT.read_bytes()).hexdigest()}")
    print(f"video_bytes={OUTPUT.stat().st_size}")


if __name__ == "__main__":
    render()
