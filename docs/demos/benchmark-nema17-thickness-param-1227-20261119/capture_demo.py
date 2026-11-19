#!/usr/bin/env python3
"""Run and illustrate the case-02 NEMA bracket thickness regression."""
from __future__ import annotations

import hashlib
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
FIXTURE = ROOT / "tests/fixtures/manufacturing/nema17-l-bracket.kcad.ts"
TEST = ROOT / "tests/integration/manufacturing/nema17BracketBenchmark.test.ts"
VERIFICATION = HERE / "verification"
OUTPUT = HERE / "demo.mp4"

BG = "#101820"
PANEL = "#192631"
INK = "#edf3f6"
MUTED = "#9fb0ba"
PLATE = "#687b86"
GREEN = "#67c99a"
RED = "#f26d6d"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    return ImageFont.truetype(path, size)


def slide(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.text((72, 48), "KERNELCAD  /  MANUFACTURING BENCHMARK 02", font=font(18, True), fill=GREEN)
    draw.text((72, 94), title, font=font(37, True), fill=INK)
    draw.text((72, 154), subtitle, font=font(20), fill=MUTED)
    draw.line((72, 194, 1208, 194), fill="#314551", width=2)
    return image, draw


def l_bracket(draw: ImageDraw.ImageDraw, x: int, y: int, thickness: int, color: str) -> None:
    draw.rectangle((x, y, x + thickness, y + 280), fill=color, outline="#b8c5cb", width=3)
    draw.rectangle((x, y + 280 - thickness, x + 480, y + 280), fill=color, outline="#b8c5cb", width=3)


def plate_section(draw: ImageDraw.ImageDraw, stale: bool = False) -> None:
    left, right, top, bottom = 220, 620, 292, 500
    draw.rectangle((left, top, right, bottom), fill=PLATE, outline="#b8c5cb", width=3)
    cut_end = right - 90 if stale else right
    draw.rounded_rectangle((left, 365, cut_end, 428), radius=28, fill=BG, outline=RED if stale else GREEN, width=3)
    if stale:
        draw.rectangle((cut_end, 367, right, 426), fill=RED, outline=RED)
        draw.text((right + 22, 374), "2 mm wall remains", font=font(17, True), fill=RED)
    draw.line((left, bottom + 22, right, bottom + 22), fill=INK, width=2)
    draw.polygon([(left, bottom + 22), (left + 10, bottom + 16), (left + 10, bottom + 28)], fill=INK)
    draw.polygon([(right, bottom + 22), (right - 10, bottom + 16), (right - 10, bottom + 28)], fill=INK)
    draw.text((left + 145, bottom + 36), "8 mm upright thickness", font=font(17, True), fill=INK)


def run_tests() -> str:
    result = subprocess.run(
        [
            "npx", "vitest", "run", "tests/integration/manufacturing/nema17BracketBenchmark.test.ts",
            "-t", "Thickness edit|old cutter length", "--reporter=dot",
        ],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=True,
        timeout=240,
    )
    if "2 passed" not in result.stdout:
        raise RuntimeError("focused Vitest run did not report two passing regressions")
    VERIFICATION.mkdir(parents=True, exist_ok=True)
    (VERIFICATION / "test-output.txt").write_text(result.stdout.rstrip() + "\n")
    return result.stdout


def render() -> None:
    result = run_tests()
    frames = HERE / "frames"
    frames.mkdir(exist_ok=True)

    first, draw = slide("Change the plate Thickness parameter", "set_param edits 5 mm to 8 mm; both legs and their hole cutters must recompute.")
    l_bracket(draw, 235, 246, 42, "#425461")
    l_bracket(draw, 390, 246, 64, PLATE)
    draw.text((230, 590), "5 mm", font=font(19, True), fill=MUTED)
    draw.text((400, 590), "8 mm", font=font(19, True), fill=GREEN)
    draw.rounded_rectangle((780, 258, 1170, 550), radius=16, fill=PANEL)
    draw.text((818, 300), "Actual STEP round-trip", font=font(22, True), fill=INK)
    draw.text((818, 372), "motor bore + 4 M3", font=font(20), fill=GREEN)
    draw.text((818, 418), "2 M5 base holes", font=font(20), fill=GREEN)
    draw.text((818, 490), "all 7 holes through", font=font(20, True), fill=GREEN)
    first.save(frames / "slide-01.png")

    second, draw = slide("The clean 8 mm plate stays drilled through", "The upright cutter grows with Thickness and leaves no wall behind the motor holes.")
    plate_section(draw)
    draw.rounded_rectangle((760, 270, 1170, 538), radius=16, fill=PANEL)
    draw.text((800, 314), "STEP interface checks", font=font(22, True), fill=INK)
    draw.text((800, 382), "22.5 mm bore: through", font=font(19), fill=GREEN)
    draw.text((800, 428), "4 × 3.4 mm M3: through", font=font(19), fill=GREEN)
    draw.text((800, 492), "focused regression: pass", font=font(18, True), fill=GREEN)
    second.save(frames / "slide-02.png")

    third, draw = slide("A stale 7 mm cutter leaves blind holes", "The STEP bounds still pass; its hole depth and through-kind checks reject the mutant.")
    plate_section(draw, stale=True)
    draw.rounded_rectangle((760, 270, 1170, 538), radius=16, fill=PANEL)
    draw.text((800, 310), "Seeded mutant", font=font(22, True), fill=RED)
    draw.text((800, 376), "5 upright holes affected", font=font(19), fill=RED)
    draw.text((800, 422), "10 interface mismatches", font=font(19), fill=RED)
    draw.text((800, 486), "stale cutter: rejected", font=font(18, True), fill=RED)
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
