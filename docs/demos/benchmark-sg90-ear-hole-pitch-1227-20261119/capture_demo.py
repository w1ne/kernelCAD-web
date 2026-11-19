#!/usr/bin/env python3
"""Run and illustrate the case-08 ear-hole position regression."""
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


def plate_view(draw: ImageDraw.ImageDraw, center: tuple[int, int], shifted: bool) -> None:
    cx, cy = center
    scale = 6.0
    bounds = (cx - 12 * scale, cy - 23 * scale, cx + 12 * scale, cy + 23 * scale)
    draw.rounded_rectangle(bounds, radius=12, fill=PLATE, outline="#b8c5cb", width=3)

    centers = [(0, -18.95), (0, 8.25)]
    low_actual_y = -17.95 if shifted else -18.95
    for index, (x, y) in enumerate(centers):
        nominal = point(cx, cy, x, y, scale)
        actual = point(cx, cy, x, low_actual_y if index == 0 else y, scale)
        radius = 7.2
        draw.ellipse((actual[0] - radius, actual[1] - radius, actual[0] + radius, actual[1] + radius), fill=BG, outline=INK, width=2)
        color = RED if shifted and index == 0 else GREEN
        draw.ellipse((nominal[0] - 4, nominal[1] - 4, nominal[0] + 4, nominal[1] + 4), fill=color)
        if shifted and index == 0:
            draw.line((nominal[0], nominal[1], actual[0], actual[1]), fill=RED, width=4)
            draw.ellipse((nominal[0] - 11, nominal[1] - 11, nominal[0] + 11, nominal[1] + 11), outline=RED, width=3)

    draw.text((cx - 124, cy + 167), "plate 24 × 46 × 4 mm", font=font(17, True), fill=INK)
    draw.text((cx - 142, cy + 194), "green = authored interface axis", font=font(14), fill=MUTED)
    if shifted:
        draw.text((cx - 142, cy + 216), "red = expected center; hole +1 mm in Y", font=font(14, True), fill=RED)


def render() -> None:
    fixture = FIXTURE.read_text()
    test = TEST.read_text()
    assert "m2Clearance.translate(0, -18.95, 0)" in fixture
    assert "m2Clearance.translate(0, -17.95, 0)" in test
    assert "earHoleFailures" in test

    result = subprocess.run(
        [
            "npx", "vitest", "run", "tests/integration/manufacturing/sg90LeverMountBenchmark.test.ts",
            "-t", "re-imports from STEP|ear hole moved off", "--reporter=dot",
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
    first, draw = slide("The plate has two datum holes", "Their centers sit on the SG90 ear axes, independent of volume and outside size.")
    plate_view(draw, (360, 372), shifted=False)
    draw.rounded_rectangle((690, 256, 1160, 548), radius=16, fill=PANEL)
    draw.text((728, 294), "M2 clearance · Ø2.4 mm", font=font(22, True), fill=INK)
    draw.text((728, 354), "(0, −18.95) mm", font=font(23), fill=GREEN)
    draw.text((728, 404), "(0,   8.25) mm", font=font(23), fill=GREEN)
    draw.text((728, 476), "Local STEP re-import", font=font(17, True), fill=MUTED)
    first.save(frames / "slide-01.png")

    second, draw = slide("Shift one hole by 1 mm", "The source mutation leaves its diameter, plate volume, and outer bounds unchanged.")
    plate_view(draw, (360, 372), shifted=True)
    draw.rounded_rectangle((690, 256, 1160, 548), radius=16, fill=PANEL)
    draw.text((728, 294), "Expected low ear axis", font=font(20, True), fill=INK)
    draw.text((728, 346), "(0, −18.95) mm", font=font(23), fill=GREEN)
    draw.text((728, 400), "Measured hole: (0, −17.95) mm", font=font(20, True), fill=RED)
    draw.text((728, 476), "volume + bounding box still pass", font=font(17, True), fill=AMBER)
    second.save(frames / "slide-02.png")

    third, draw = slide("The STEP interface check catches it", "The test measures hole axes after export and re-import, not source text alone.")
    draw.rounded_rectangle((104, 250, 1176, 546), radius=20, fill=PANEL)
    draw.text((156, 294), "Existing geometry checks", font=font(22, True), fill=INK)
    draw.text((156, 342), "volume: pass     bbox: pass", font=font(26, True), fill=AMBER)
    draw.line((156, 390, 1124, 390), fill="#314551", width=2)
    draw.text((156, 418), "ear-hole center: 1.00 mm off datum", font=font(27, True), fill=RED)
    draw.text((796, 494), "Vitest regression: 2 / 2 passed", font=font(18, True), fill=GREEN)
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
