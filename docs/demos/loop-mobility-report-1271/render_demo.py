#!/usr/bin/env python3
"""Render the captured loop solver evidence as a short, readable MP4."""

import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).parent
EVIDENCE = json.loads((ROOT / "verification.json").read_text())
WIDTH, HEIGHT, FPS = 1280, 720, 24
BG = (14, 20, 32)
PANEL = (25, 35, 52)
WHITE = (237, 242, 248)
MUTED = (161, 176, 194)
CYAN = (73, 205, 220)
AMBER = (255, 185, 82)
RED = (255, 112, 122)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)


def canvas(title: str, kicker: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.text((72, 48), kicker.upper(), font=font(17, True), fill=CYAN)
    draw.text((72, 85), title, font=font(38, True), fill=WHITE)
    draw.line((72, 146, WIDTH - 72, 146), fill=(59, 76, 98), width=2)
    return image, draw


def draw_linkage(draw: ImageDraw.ImageDraw) -> None:
    # Schematic dimensions and labels match the captured source; this is not
    # a mesh render or a claim that this impossible start pose is assembled.
    x0, x1, y = 790, 1135, 430
    draw.line((x0, y, x1, y), fill=CYAN, width=12)
    draw.ellipse((x0 - 17, y - 17, x0 + 17, y + 17), fill=WHITE)
    draw.ellipse((x1 - 17, y - 17, x1 + 17, y + 17), fill=WHITE)
    crank_end = (890, 318)
    coupler_end = (1010, 305)
    draw.line((x0, y, *crank_end), fill=AMBER, width=10)
    draw.line((*crank_end, *coupler_end), fill=(143, 175, 255), width=10)
    draw.line((*coupler_end, x1, y), fill=RED, width=10)
    for px, py in ((x0, y), crank_end, coupler_end, (x1, y)):
        draw.ellipse((px - 11, py - 11, px + 11, py + 11), fill=BG, outline=WHITE, width=3)
    draw.text((760, 482), "ground 100 mm", font=font(20, True), fill=CYAN)
    draw.text((795, 365), "crank 40 mm", font=font(17), fill=AMBER)
    draw.text((890, 262), "coupler 120 mm", font=font(17), fill=(179, 200, 255))
    draw.text((1020, 365), "rocker 80 mm", font=font(17), fill=RED)
    draw.text((760, 540), "Intentional non-closing start pose", font=font(19, True), fill=WHITE)
    draw.text((760, 571), "schematic from the regression fixture", font=font(15), fill=MUTED)


def report_slide() -> Image.Image:
    image, draw = canvas("The mechanism result keeps solver evidence", "Local kernelCAD check")
    diag = next((d for d in EVIDENCE["mechanismTruth"]["failures"] if d["code"] == "kinematic.loop.lockup"), None)
    mobility = EVIDENCE["mechanismTruth"]["loopMobility"]
    draw.rounded_rectangle((72, 184, 1208, 315), radius=18, fill=PANEL)
    draw.text((104, 207), diag["code"] if diag else "No loop lockup diagnostic", font=font(26, True), fill=RED)
    draw.text((104, 255), f"severity: {diag['severity']}    loop: {diag['details'].get('loop', '—')}    pose: {diag['details'].get('sample', '—')}" if diag else "", font=font(18), fill=WHITE)

    draw.rounded_rectangle((72, 342, 1208, 524), radius=18, fill=PANEL)
    draw.text((104, 363), "Closure Jacobian evidence", font=font(22, True), fill=CYAN)
    if mobility:
        item = mobility[0]
        draw.text((104, 408), f"loops {', '.join(item['loops'])}    coordinates {item['coordinates']}    rank {item['rank']}", font=font(19), fill=WHITE)
        draw.text((104, 452), f"mobility {item['mobility']}    Grübler {item['gruebler']}    driven DOF {item['drivenDof']}", font=font(19), fill=WHITE)
    else:
        draw.text((104, 410), "No loop mobility report returned", font=font(19), fill=RED)

    draw.text((76, 564), "BREP sweep skipped (forced budget 0)  ·  physics off  ·  local validation only", font=font(18, True), fill=AMBER)
    draw.text((76, 604), "No deployed behavior or hardware acceptance is shown.", font=font(17), fill=MUTED)
    return image


def main() -> None:
    title, draw = canvas("Closed-loop findings reach the verdict", "KernelCAD · focused regression")
    draw.text((78, 200), "Existing solver outputs", font=font(25, True), fill=CYAN)
    draw.text((78, 250), "loop lockup diagnostic", font=font(19), fill=WHITE)
    draw.text((78, 289), "closure-Jacobian rank + mobility", font=font(19), fill=WHITE)
    draw.text((78, 328), "sampled pose + loop + joint context", font=font(19), fill=WHITE)
    draw_linkage(draw)
    slide2 = report_slide()
    frames = [title] * (2 * FPS) + [slide2] * (6 * FPS)
    with tempfile.TemporaryDirectory(prefix="loop-mobility-frames-") as temp:
        frame_dir = Path(temp)
        for index, frame in enumerate(frames):
            frame.save(frame_dir / f"frame-{index:04d}.png")
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS),
            "-i", str(frame_dir / "frame-%04d.png"), "-c:v", "libx264",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(ROOT / "demo.mp4"),
        ], check=True)


if __name__ == "__main__":
    main()
