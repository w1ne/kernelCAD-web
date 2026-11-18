#!/usr/bin/env python3
"""Render the case-04 pose-drift regression as a short annotated MP4."""
from __future__ import annotations

import hashlib
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
FIXTURE = ROOT / "tests/fixtures/manufacturing/pi-camera-mount.kcad.ts"
TEST = ROOT / "tests/integration/manufacturing/piCameraMountBenchmark.test.ts"
OUTPUT = HERE / "demo.mp4"

BG = "#101820"
PANEL = "#192631"
INK = "#edf3f6"
MUTED = "#9fb0ba"
BLUE = "#527c94"
GREEN = "#67c99a"
AMBER = "#f2ad57"
RED = "#f26d6d"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    return ImageFont.truetype(path, size)


def rounded(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], fill: str, radius: int = 18) -> None:
    draw.rounded_rectangle(xy, radius=radius, fill=fill)


def base_slide(title: str, step: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.text((72, 48), "KERNELCAD  /  MANUFACTURING BENCHMARK 04", font=font(18, True), fill=GREEN)
    draw.text((72, 94), title, font=font(38, True), fill=INK)
    draw.text((72, 154), step, font=font(20), fill=MUTED)
    draw.line((72, 194, 1208, 194), fill="#314551", width=2)
    return image, draw


def project(draw: ImageDraw.ImageDraw, shift_mm: float, ghost: bool = False) -> None:
    # Front X-Z projection for the authored case: bracket is 40 mm wide and
    # the camera board is 25 mm wide, centered at x=20 mm. 8 px/mm makes the
    # injected 1 mm translation visible while retaining true relative scale.
    scale = 8
    x0, z0 = 312, 612

    def rect_for(xmin: float, xmax: float, zmin: float, zmax: float) -> tuple[int, int, int, int]:
        return (int(x0 + xmin * scale), int(z0 - zmax * scale), int(x0 + xmax * scale), int(z0 - zmin * scale))

    shift = 0 if ghost else shift_mm
    mount_color = "#426173" if ghost else (AMBER if shift_mm else BLUE)
    board_color = "#4ca17c" if ghost else ("#dc9745" if shift_mm else GREEN)
    mount = rect_for(shift, shift + 40, 0, 40)
    board = rect_for(shift + 7.5, shift + 32.5, 21.75, 45.61)
    if ghost:
        draw.rectangle(mount, outline=mount_color, width=3)
        draw.rectangle(board, outline=board_color, width=3)
    else:
        draw.rectangle(mount, fill=mount_color)
        draw.rectangle(board, fill=board_color)

    # Four mounting holes and a center datum mark.
    for dx in (-10.5, 10.5):
        for dz in (-6.25, 6.25):
            cx = int(x0 + (20 + shift + dx) * scale)
            cy = int(z0 - (30 + dz) * scale)
            draw.ellipse((cx - 5, cy - 5, cx + 5, cy + 5), fill=BG)
    cx = int(x0 + (20 + shift) * scale)
    cy = int(z0 - 30 * scale)
    draw.line((cx - 10, cy, cx + 10, cy), fill=INK, width=2)
    draw.line((cx, cy - 10, cx, cy + 10), fill=INK, width=2)

    draw.text((x0 - 3, 628), "x = 0", font=font(15), fill=MUTED)
    draw.text((x0 + 40 * scale - 56, 628), "x = 40", font=font(15), fill=MUTED)
    if not ghost:
        draw.text((x0 + (20 + shift) * scale - 48, 365), f"seat x = {20 + shift:g} mm", font=font(16, True), fill=INK)


def render() -> None:
    fixture = FIXTURE.read_text()
    test = TEST.read_text()
    assert "{ at: [20, -2, patternHeight] }" in fixture
    assert '"{ at: [20, -2, patternHeight] }"' in test
    assert '"{ at: [21, -2, patternHeight] }"' in test

    with tempfile.TemporaryDirectory(prefix="pose-drift-", dir=HERE) as tmp:
        frame_dir = Path(tmp)
        first, draw = base_slide("An independent pose check", "Clean fixture: the board and bracket share the authored seat datum.")
        rounded(draw, (72, 224, 270, 294), PANEL)
        draw.text((96, 240), "CLEAN MODEL", font=font(17, True), fill=GREEN)
        draw.text((96, 267), "seat center x = 20 mm", font=font(16), fill=INK)
        project(draw, 0)
        draw.text((730, 324), "Pi camera board", font=font(21, True), fill=GREEN)
        draw.text((730, 360), "25 × 23.86 mm", font=font(18), fill=INK)
        draw.text((730, 416), "Mounting bracket", font=font(21, True), fill="#8fb0c2")
        draw.text((730, 452), "40 mm wide", font=font(18), fill=INK)
        draw.text((72, 672), "Local fixture evidence · no deployed-runtime or hardware claim", font=font(15), fill=MUTED)
        first.save(frame_dir / "slide-01.png")

        second, draw = base_slide("Inject a 1 mm placement drift", "Change only the mount's world X datum: 20 mm → 21 mm.")
        rounded(draw, (72, 224, 302, 294), PANEL)
        draw.text((96, 240), "STRUCTURAL CHECK", font=font(16, True), fill=GREEN)
        draw.text((96, 267), "ok · mechanism real", font=font(16), fill=INK)
        project(draw, 1, ghost=True)
        project(draw, 1)
        draw.text((730, 322), "The parts still mate.", font=font(22, True), fill=INK)
        draw.text((730, 363), "Both now sit 1 mm off", font=font(18), fill=AMBER)
        draw.text((730, 393), "the fixture's world datum.", font=font(18), fill=AMBER)
        draw.rectangle((730, 464, 752, 486), outline="#8ba0ad", width=3)
        draw.text((766, 464), "expected seat · x = 20 mm", font=font(16), fill=MUTED)
        draw.rectangle((730, 500, 752, 522), fill=AMBER)
        draw.text((766, 500), "mutated seat · x = 21 mm", font=font(16), fill=AMBER)
        draw.text((72, 672), "The generic mechanism check has no fixture-specific world datum.", font=font(15), fill=MUTED)
        second.save(frame_dir / "slide-02.png")

        third, draw = base_slide("The benchmark catches both moved parts", "The solver remains structurally valid; the independent pose oracle rejects the mutant.")
        rounded(draw, (72, 230, 620, 562), PANEL)
        draw.text((104, 262), "POSE ORACLE · EXPECTED x = 20 mm", font=font(19, True), fill=INK)
        draw.text((104, 323), "mount  x = 21 mm  →  FAIL", font=font(21, True), fill=RED)
        draw.text((104, 378), "camera x = 21 mm  →  FAIL", font=font(21, True), fill=RED)
        draw.line((104, 429, 580, 429), fill="#314551", width=2)
        draw.text((104, 454), "Vitest case 04: 9 / 9 passed", font=font(19, True), fill=GREEN)
        draw.text((690, 300), "1 mutation", font=font(24, True), fill=AMBER)
        draw.text((690, 344), "2 displaced poses", font=font(21), fill=INK)
        draw.text((690, 398), "No deployed behavior", font=font(17), fill=MUTED)
        draw.text((690, 428), "or hardware acceptance claimed.", font=font(17), fill=MUTED)
        draw.text((72, 672), "kernelCAD local regression demo · case 04 · #1227", font=font(15), fill=MUTED)
        third.save(frame_dir / "slide-03.png")

        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-framerate", "1/4", "-i", str(frame_dir / "slide-%02d.png"),
            "-vf", "fps=24,format=yuv420p", "-t", "12",
            "-an", "-movflags", "+faststart", str(OUTPUT),
        ], check=True)

    print(f"fixture_sha256={hashlib.sha256(FIXTURE.read_bytes()).hexdigest()}")
    print(f"test_sha256={hashlib.sha256(TEST.read_bytes()).hexdigest()}")
    print(f"video_sha256={hashlib.sha256(OUTPUT.read_bytes()).hexdigest()}")
    print(f"video_bytes={OUTPUT.stat().st_size}")


if __name__ == "__main__":
    render()
