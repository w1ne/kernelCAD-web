#!/usr/bin/env python3
"""Run and illustrate the case-08 shallow ear-hole depth regression."""
from __future__ import annotations

import hashlib
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
FIXTURE = ROOT / "tests/fixtures/manufacturing/sg90-lever-mount.kcad.ts"
TEST = ROOT / "tests/integration/manufacturing/sg90LeverMountBenchmark.test.ts"
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
    draw.text((72, 48), "KERNELCAD  /  MANUFACTURING BENCHMARK 08", font=font(18, True), fill=GREEN)
    draw.text((72, 94), title, font=font(37, True), fill=INK)
    draw.text((72, 154), subtitle, font=font(20), fill=MUTED)
    draw.line((72, 194, 1208, 194), fill="#314551", width=2)
    return image, draw


def point(cx: float, cy: float, x: float, y: float, scale: float) -> tuple[float, float]:
    return cx + x * scale, cy - (y + 5) * scale


def plate_view(draw: ImageDraw.ImageDraw, center: tuple[int, int], capped: bool) -> None:
    cx, cy = center
    scale = 6.0
    bounds = (cx - 12 * scale, cy - 23 * scale, cx + 12 * scale, cy + 23 * scale)
    draw.rounded_rectangle(bounds, radius=12, fill=PLATE, outline="#b8c5cb", width=3)

    centers = [(0, -18.95), (0, 8.25)]
    for x, y in centers:
        nominal = point(cx, cy, x, y, scale)
        radius = 7.2
        fill = RED if capped else BG
        draw.ellipse((nominal[0] - radius, nominal[1] - radius, nominal[0] + radius, nominal[1] + radius), fill=fill, outline=INK, width=2)
        draw.ellipse((nominal[0] - 4, nominal[1] - 4, nominal[0] + 4, nominal[1] + 4), fill=GREEN)

    draw.text((cx - 124, cy + 167), "plate 24 × 46 × 4 mm", font=font(17, True), fill=INK)
    draw.text((cx - 142, cy + 194), "green = authored ear-hole axis", font=font(14), fill=MUTED)
    if capped:
        draw.text((cx - 142, cy + 216), "red = uncut top skin over each bore", font=font(14, True), fill=RED)


def plate_section(draw: ImageDraw.ImageDraw, x: int, y: int, capped: bool) -> None:
    scale = 36
    width = 480
    height = 4 * scale
    bottom = y + height
    draw.rectangle((x, y, x + width, bottom), fill=PLATE, outline="#b8c5cb", width=3)
    for center_x in (x + 120, x + 360):
        hole_width = 2.4 * scale
        left, right = center_x - hole_width / 2, center_x + hole_width / 2
        cap_height = 0.1 * scale if capped else 0
        cavity_top = y + cap_height
        draw.rectangle((left, cavity_top, right, bottom), fill=BG)
        if capped:
            draw.rectangle((left, y, right, cavity_top), fill=RED)
    draw.rectangle((x, y, x + width, bottom), outline="#b8c5cb", width=3)
    draw.text((x, bottom + 16), "section through the two ear holes", font=font(16, True), fill=INK)


def render() -> None:
    fixture = FIXTURE.read_text()
    test = TEST.read_text()
    assert "const m2Clearance = cylinder(20, 1.2);" in fixture
    assert "cylinder(3.9, 1.2).translate(0, 0, 11.9)" in test
    assert "depth ${matchingHole.depthMm.toFixed(2)} mm != 4.00 mm" in test

    result = subprocess.run(
        [
            "npx", "vitest", "run", "tests/integration/manufacturing/sg90LeverMountBenchmark.test.ts",
            "-t", "re-imports from STEP|ear hole moved off|stop 0.1 mm", "--reporter=dot",
        ],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=True,
        timeout=180,
    )
    VERIFICATION.mkdir(parents=True, exist_ok=True)
    (VERIFICATION / "test-output.txt").write_text(result.stdout.rstrip() + "\n")

    frames = HERE / "frames"
    frames.mkdir(exist_ok=True)
    first, draw = slide("Both M2 ear holes pass through the plate", "The STEP round-trip checks the bore length as well as the axis centers.")
    plate_view(draw, (300, 350), capped=False)
    draw.text((645, 253), "Plate cross-section", font=font(22, True), fill=INK)
    plate_section(draw, 645, 300, capped=False)
    draw.text((645, 484), "4.00 mm cylindrical wall", font=font(20, True), fill=GREEN)
    draw.text((645, 526), "Local STEP export + re-import", font=font(17), fill=MUTED)
    first.save(frames / "slide-01.png")

    second, draw = slide("Leave a 0.10 mm cap", "The mutation preserves hole diameter, axis centers, plate volume and outside bounds.")
    plate_view(draw, (300, 350), capped=True)
    draw.text((645, 253), "Mutated cross-section", font=font(22, True), fill=INK)
    plate_section(draw, 645, 300, capped=True)
    draw.text((645, 484), "3.90 mm bore + 0.10 mm top skin", font=font(20, True), fill=RED)
    draw.text((645, 526), "Old volume and bbox gates still pass", font=font(17, True), fill=AMBER)
    second.save(frames / "slide-02.png")

    third, draw = slide("Measured depth catches the short bore", "The cylinder detector labels it through, but reports the 3.90 mm wall length.")
    draw.rounded_rectangle((104, 250, 1176, 546), radius=20, fill=PANEL)
    draw.text((156, 286), "Volume + bounding box", font=font(22, True), fill=INK)
    draw.text((740, 286), "pass", font=font(25, True), fill=AMBER)
    draw.line((156, 334, 1124, 334), fill="#314551", width=2)
    draw.text((156, 356), "Axis + diameter", font=font(22, True), fill=INK)
    draw.text((740, 356), "pass", font=font(25, True), fill=AMBER)
    draw.line((156, 404, 1124, 404), fill="#314551", width=2)
    draw.text((156, 426), "Bore depth: 3.90 mm / required 4.00 mm", font=font(23, True), fill=RED)
    draw.text((786, 492), "STEP regressions: 3 / 3 passed", font=font(18, True), fill=GREEN)
    third.save(frames / "slide-03.png")

    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-framerate", "1/4", "-i", str(frames / "slide-%02d.png"),
        "-vf", "fps=24,format=yuv420p", "-t", "12", "-an", "-movflags", "+faststart", str(OUTPUT),
    ], check=True)

    print(result.stdout.strip().splitlines()[-3:])
    print(f"fixture_sha256={hashlib.sha256(FIXTURE.read_bytes()).hexdigest()}")
    print(f"test_sha256={hashlib.sha256(TEST.read_bytes()).hexdigest()}")
    print(f"video_sha256={hashlib.sha256(OUTPUT.read_bytes()).hexdigest()}")
    print(f"video_bytes={OUTPUT.stat().st_size}")


if __name__ == "__main__":
    render()
