#!/usr/bin/env python3
"""Run and illustrate the case-01 tray depth parameter regression."""
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
AMBER = "#f2ad57"
RED = "#f26d6d"


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


def tray_view(draw: ImageDraw.ImageDraw, center: tuple[int, int], depth: int, hole_center_y: float, stale: bool = False) -> None:
    cx, cy = center
    scale = 4.0
    left, top = cx - 95 * scale / 2, cy - depth * scale / 2
    right, bottom = cx + 95 * scale / 2, cy + depth * scale / 2
    draw.rounded_rectangle((left, top, right, bottom), radius=18, fill=TRAY, outline="#b8c5cb", width=3)
    for x in (18.5, 76.5):
        for dy in (-24.5, 24.5):
            y = hole_center_y + dy
            px, py = cx + (x - 47.5) * scale, cy - (y - depth / 2) * scale
            if stale:
                expected = (px, cy - (depth / 2 + dy - depth / 2) * scale)
                draw.ellipse((expected[0] - 12, expected[1] - 12, expected[0] + 12, expected[1] + 12), outline=AMBER, width=3)
                draw.line((px, py, expected[0], expected[1]), fill=AMBER, width=2)
            radius = 8
            draw.ellipse((px - radius, py - radius, px + radius, py + radius), fill=BG, outline=INK, width=3)
            color = RED if stale else GREEN
            draw.ellipse((px - 3, py - 3, px + 3, py + 3), fill=color)
    draw.text((cx - 104, bottom + 20), f"tray 95 × {depth} mm", font=font(17, True), fill=INK)
    draw.text((cx - 119, bottom + 47), "four Ø2.5 mm blind pilot holes", font=font(14), fill=MUTED)


def render() -> None:
    fixture = FIXTURE.read_text()
    test = TEST.read_text()
    assert "const cy = depth.divide(2);" in fixture
    assert "const cy = depth.multiply(0).add(33);" in test
    assert "pattern centre y" in test

    result = subprocess.run(
        [
            "npx", "vitest", "run", "tests/integration/manufacturing/pcbEnclosureBenchmark.test.ts",
            "-t", "Depth edit|Y centre stays", "--reporter=dot",
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

    frames = HERE / "frames"
    frames.mkdir(exist_ok=True)

    first, draw = slide("A fixed board pattern sits in the tray", "The Pi 4 pattern keeps its 49 mm Y pitch as the tray depth changes.")
    tray_view(draw, (350, 382), 66, 33)
    draw.rounded_rectangle((690, 254, 1165, 555), radius=16, fill=PANEL)
    draw.text((728, 294), "Depth = 66 mm", font=font(24, True), fill=INK)
    draw.text((728, 360), "pattern center Y  33 mm", font=font(21), fill=GREEN)
    draw.text((728, 406), "hole pitch Y      49 mm", font=font(21), fill=GREEN)
    draw.text((728, 492), "local STEP re-import", font=font(17, True), fill=MUTED)
    first.save(frames / "slide-01.png")

    second, draw = slide("Edit Depth to 92 mm", "Parametric recompute recenters the unchanged mounting pattern on the tray.")
    tray_view(draw, (350, 382), 92, 46)
    draw.rounded_rectangle((690, 254, 1165, 555), radius=16, fill=PANEL)
    draw.text((728, 294), "Depth = 92 mm", font=font(24, True), fill=INK)
    draw.text((728, 360), "pattern center Y  46 mm", font=font(21), fill=GREEN)
    draw.text((728, 406), "hole pitch Y      49 mm", font=font(21), fill=GREEN)
    draw.text((728, 492), "STEP interface check: pass", font=font(17, True), fill=GREEN)
    second.save(frames / "slide-02.png")

    third, draw = slide("A stale Y datum is caught", "The tray grows, but a fixed 33 mm center shifts the hole pattern off its datum.")
    tray_view(draw, (350, 382), 92, 33, stale=True)
    draw.rounded_rectangle((690, 254, 1165, 555), radius=16, fill=PANEL)
    draw.text((728, 294), "Mutant: center stays at 33 mm", font=font(21, True), fill=RED)
    draw.text((728, 358), "expected center Y  46 mm", font=font(20), fill=GREEN)
    draw.text((728, 404), "measured center Y  33 mm", font=font(20), fill=RED)
    draw.text((728, 440), "amber = intended hole axes", font=font(16, True), fill=AMBER)
    draw.text((728, 480), "bounds, volume, pitch: pass", font=font(17, True), fill=AMBER)
    draw.text((728, 510), "STEP center check: reject", font=font(17, True), fill=RED)
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
