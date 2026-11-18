#!/usr/bin/env python3
"""Render the retained local primitive-probe JSON as a short MP4."""

from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "demo-output.json"
VIDEO = HERE / "demo.mp4"
WIDTH, HEIGHT = 1280, 720
FPS = 24
FONT = "/System/Library/Fonts/SFNS.ttf"
BACKGROUND = (11, 16, 31)
CARD = (22, 31, 52)
TEXT = (235, 241, 250)
MUTED = (157, 171, 191)
BLUE = (91, 169, 255)
RED = (255, 115, 115)
AMBER = (255, 194, 86)
GREEN = (101, 214, 159)


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT, size)


def text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, size: int, color=TEXT) -> None:
    draw.text(xy, value, font=font(size), fill=color)


def base(title: str, subtitle: str, index: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)
    text(draw, (64, 40), "kernelCAD   /   ISSUE #1267", 20, BLUE)
    text(draw, (64, 92), title, 42)
    text(draw, (64, 154), subtitle, 22, MUTED)
    draw.rounded_rectangle((64, 640, WIDTH - 64, 644), radius=2, fill=(45, 59, 82))
    draw.rounded_rectangle((64, 640, 64 + int((WIDTH - 128) * index / 4), 644), radius=2, fill=BLUE)
    text(draw, (64, 660), "LOCAL PRIMITIVE PROBE  ·  NOT VENDOR SO100 / DEPLOYMENT / SIMULATION / HARDWARE ACCEPTANCE", 14, MUTED)
    return image, draw


def make_cards(results: list[dict]) -> list[Image.Image]:
    images: list[Image.Image] = []

    image, draw = base("Mechanism checks return typed outcomes", "A small forced-budget workflow; the actual SO100 arm is not loaded in this demo.", 1)
    cards = [(64, 270, 424, 530), (456, 270, 816, 530), (848, 270, 1216, 530)]
    labels = [("1", "Build", "Two primitive box assemblies"), ("2", "Rest checks", "Run before skipped sweep"), ("3", "Budget result", "Typed verdict and coverage")]
    for (x0, y0, x1, y1), (number, heading, detail) in zip(cards, labels, strict=True):
        draw.rounded_rectangle((x0, y0, x1, y1), radius=18, fill=CARD, outline=(48, 66, 94), width=2)
        text(draw, (x0 + 24, y0 + 24), number, 28, BLUE)
        text(draw, (x0 + 24, y0 + 82), heading, 25)
        text(draw, (x0 + 24, y0 + 137), detail, 17, MUTED)
    draw.line((424, 400, 456, 400), fill=BLUE, width=3)
    draw.line((816, 400, 848, 400), fill=BLUE, width=3)
    images.append(image)

    sweep = results[0]
    image, draw = base("Sweep budget = 0", "The rest collision check completes before the articulated sweep is skipped.", 2)
    draw.rounded_rectangle((64, 250, 1216, 574), radius=18, fill=CARD, outline=(48, 66, 94), width=2)
    text(draw, (100, 286), "VERDICT", 18, MUTED)
    text(draw, (100, 322), sweep["verdict"].upper(), 42, RED)
    text(draw, (100, 402), f"coverage.sweep = {str(sweep['coverage']['sweep']).lower()}", 24)
    text(draw, (100, 460), "DIAGNOSTICS", 18, MUTED)
    text(draw, (100, 494), "ERROR  mechanism.rest-interpenetration", 22, RED)
    text(draw, (100, 534), "WARN   mechanism.unverified-budget-exceeded", 22, AMBER)
    images.append(image)

    physics = results[1]
    image, draw = base("Physics budget = 0", "The typed skip happens before MJCF conversion and MuJoCo session loading.", 3)
    draw.rounded_rectangle((64, 250, 1216, 574), radius=18, fill=CARD, outline=(48, 66, 94), width=2)
    text(draw, (100, 286), "VERDICT", 18, MUTED)
    text(draw, (100, 322), physics["verdict"].upper(), 42, AMBER)
    text(draw, (100, 402), f"coverage.physics = {str(physics['coverage']['physics']).lower()}", 24)
    text(draw, (100, 460), "WARN   mechanism.physics-budget-exceeded", 22, AMBER)
    text(draw, (100, 512), f"MuJoCo session calls = {physics['physicsSessionCalls']}", 22, GREEN)
    images.append(image)

    image, draw = base("What this evidence shows", "Rest failures remain definitive; budget-limited work stays explicitly unverified.", 4)
    rows = [
        ("LOCAL VALIDATION", "Primitive assembly, direct checkMechanismTruth call", BLUE),
        ("VENDOR SO100", "Build error before probe; no mechanism verdict", AMBER),
        ("DEPLOYMENT", "No production deployment was performed", MUTED),
        ("HARDWARE", "No physical arm or hardware acceptance was involved", MUTED),
    ]
    y = 260
    for label, detail, color in rows:
        draw.rounded_rectangle((64, y, 1216, y + 70), radius=14, fill=CARD, outline=(48, 66, 94), width=1)
        text(draw, (88, y + 20), label, 17, color)
        text(draw, (390, y + 20), detail, 19)
        y += 82
    images.append(image)
    return images


def main() -> None:
    results = json.loads(OUTPUT.read_text())
    with tempfile.TemporaryDirectory(prefix="kc-mechanism-demo-") as temp:
        frames = Path(temp)
        for index, image in enumerate(make_cards(results)):
            image.save(frames / f"frame-{index:02d}.png")
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-framerate", "1/3", "-i", str(frames / "frame-%02d.png"),
            "-c:v", "libx264", "-preset", "medium", "-crf", "22",
            "-pix_fmt", "yuv420p", "-r", str(FPS), "-movflags", "+faststart",
            str(VIDEO),
        ], check=True)
    print(f"Wrote {VIDEO} ({VIDEO.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
