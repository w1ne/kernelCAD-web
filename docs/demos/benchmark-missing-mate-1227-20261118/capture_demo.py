#!/usr/bin/env python3
"""Render the case-08 missing-mate regression as a short annotated MP4."""
from __future__ import annotations

import hashlib
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
FIXTURE = ROOT / "tests/fixtures/manufacturing/sg90-lever-mount.kcad.ts"
TEST = ROOT / "tests/integration/manufacturing/sg90LeverMountBenchmark.test.ts"
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


def base_slide(title: str, step: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.text((72, 48), "KERNELCAD  /  MANUFACTURING BENCHMARK 08", font=font(18, True), fill=GREEN)
    draw.text((72, 94), title, font=font(38, True), fill=INK)
    draw.text((72, 154), step, font=font(20), fill=MUTED)
    draw.line((72, 194, 1208, 194), fill="#314551", width=2)
    return image, draw


def topology(draw: ImageDraw.ImageDraw, detached: bool) -> None:
    # Diagram communicates the authored part/mate graph, not CAD geometry.
    servo = (142, 330, 382, 454)
    plate = (142, 490, 382, 578)
    arm = (824, 330, 1064, 454)
    draw.rounded_rectangle(servo, radius=16, fill=BLUE)
    draw.rounded_rectangle(plate, radius=16, fill="#697a84")
    draw.rounded_rectangle(arm, radius=16, fill=AMBER if detached else GREEN)
    draw.text((206, 366), "SG90 servo", font=font(22, True), fill=INK)
    draw.text((206, 522), "Printed plate", font=font(21, True), fill=INK)
    draw.text((881, 366), "Lever arm", font=font(22, True), fill=INK)
    draw.text((154, 600), "purchased part", font=font(15), fill=MUTED)
    draw.text((844, 474), "arm / horn subassembly", font=font(15), fill=MUTED)

    # The fixed mate remains between servo and plate in both states.
    draw.line((262, 454, 262, 490), fill=GREEN, width=6)
    draw.rounded_rectangle((288, 458, 444, 486), radius=10, fill=PANEL)
    draw.text((300, 462), "fastened", font=font(16, True), fill=GREEN)

    # The revolute mate is present in the clean source and absent in the seed.
    if detached:
        draw.line((382, 392, 824, 392), fill="#53616a", width=4)
        draw.line((574, 374, 610, 410), fill=RED, width=6)
        draw.line((610, 374, 574, 410), fill=RED, width=6)
        draw.rounded_rectangle((468, 432, 752, 492), radius=12, fill=PANEL)
        draw.text((490, 449), "revolute mate removed", font=font(19, True), fill=RED)
        draw.text((566, 520), "disconnected", font=font(17, True), fill=AMBER)
    else:
        draw.line((382, 392, 824, 392), fill=GREEN, width=6)
        draw.rounded_rectangle((514, 344, 698, 382), radius=12, fill=PANEL)
        draw.text((534, 352), "revolute", font=font(18, True), fill=GREEN)
        draw.text((505, 430), "swing: 0°–180°", font=font(17), fill=MUTED)

    draw.rounded_rectangle((830, 514, 1112, 572), radius=12, fill=PANEL)
    draw.text((852, 529), "ASSEMBLY GRAPH  /  SCHEMATIC", font=font(14, True), fill=INK)


def render() -> None:
    fixture = FIXTURE.read_text()
    test = TEST.read_text()
    mate = "mount.mate('swing', 'servo.shaft', 'arm.hub', 'revolute', { limitsDeg: [0, 180] });"
    assert mate in fixture
    assert mate in test
    assert "mechanism.orphan-part" in test

    with tempfile.TemporaryDirectory(prefix="missing-mate-", dir=HERE) as tmp:
        frame_dir = Path(tmp)

        first, draw = base_slide("The authored assembly has two mates", "Case 08: SG90 servo, printed plate, and a lever driven on the shaft.")
        topology(draw, detached=False)
        draw.text((72, 672), "Local manufacturing fixture · clean source graph", font=font(15), fill=MUTED)
        first.save(frame_dir / "slide-01.png")

        second, draw = base_slide("Remove only the revolute mate", "The purchased servo, plate, and fixed mate remain unchanged.")
        topology(draw, detached=True)
        draw.text((72, 672), "One in-memory source mutation · no saved project is edited", font=font(15), fill=MUTED)
        second.save(frame_dir / "slide-02.png")

        third, draw = base_slide("The mechanism gate rejects the detached arm", "The local regression requires an orphan diagnostic and a broken verdict.")
        draw.rounded_rectangle((112, 244, 1168, 552), radius=20, fill=PANEL)
        draw.text((160, 286), "evaluateScriptTool", font=font(25, True), fill=INK)
        draw.text((160, 354), "ok: false", font=font(30, True), fill=RED)
        draw.text((520, 354), "mechanism: broken", font=font(30, True), fill=RED)
        draw.text((160, 432), "mechanism.orphan-part", font=font(25, True), fill=AMBER)
        draw.text((790, 438), "Vitest regression: 1 / 1 passed", font=font(19, True), fill=GREEN)
        draw.text((72, 672), "Local source verification only · no deployment or hardware claim", font=font(15), fill=MUTED)
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
