# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
from __future__ import annotations

import json
import math
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BUNDLE_DIR = Path(__file__).resolve().parent
WIDTH = 1280
HEIGHT = 720
FPS = 24
DURATION_SECONDS = 10
BACKGROUND = (15, 25, 40)
PANEL = (23, 37, 56)
GRID = (48, 67, 88)
PRIMARY = (242, 247, 252)
SECONDARY = (166, 184, 203)
ACCENT = (66, 208, 177)
ROCKER = (107, 169, 255)
BLOCK_CLEAR = (244, 178, 68)
BLOCK_HIT = (248, 95, 95)
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
MONO_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def fonts() -> dict[str, ImageFont.FreeTypeFont]:
    return {
        "title": ImageFont.truetype(FONT_PATH, 35),
        "heading": ImageFont.truetype(FONT_PATH, 22),
        "body": ImageFont.truetype(FONT_PATH, 19),
        "small": ImageFont.truetype(FONT_PATH, 15),
        "mono": ImageFont.truetype(MONO_PATH, 17),
        "value": ImageFont.truetype(MONO_PATH, 23),
    }


def rocker_angle(degrees: float) -> float:
    a, b, c, d = 40.0, 120.0, 80.0, 100.0
    t = math.radians(degrees)
    bx, bz = a * math.cos(t), a * math.sin(t)
    p = 2 * c * (d - bx)
    q = -2 * c * bz
    r = b * b - c * c - (d - bx) ** 2 - bz * bz
    return math.atan2(q, p) + math.acos(r / math.hypot(p, q))


def coupler_angle(degrees: float) -> float:
    t = math.radians(degrees)
    t4 = rocker_angle(degrees)
    return math.atan2(80 * math.sin(t4) - 40 * math.sin(t), 100 + 80 * math.cos(t4) - 40 * math.cos(t))


def point(degrees: float, x: float, z: float) -> tuple[float, float]:
    return (105 + x * 4.0, 580 - z * 4.0)


def write_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, font: ImageFont.FreeTypeFont, fill: tuple[int, int, int]) -> None:
    draw.text(xy, text, font=font, fill=fill)


def draw_frame(frame: int, evidence: dict, fonts_by_name: dict[str, ImageFont.FreeTypeFont]) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)
    result = evidence["result"]
    walk = result["walks"][0]
    pair = next(p for p in walk["overlaps"] if {p["partA"], p["partB"]} == {"rocker", "stop"})
    stretch = pair["stretches"][0]
    start, end = stretch["start"], stretch["end"]
    title = fonts_by_name["title"]
    heading = fonts_by_name["heading"]
    body = fonts_by_name["body"]
    small = fonts_by_name["small"]
    mono = fonts_by_name["mono"]
    value = fonts_by_name["value"]

    write_text(draw, (58, 30), "kernelCAD / closed-loop swept collision", title, PRIMARY)
    write_text(draw, (60, 80), "LOCAL ENGINE REPLAY   ·   four-bar crank-rocker   ·   BREP cutoff report", small, SECONDARY)
    write_text(draw, (60, 100), "swept-collision result · joint=crank · range=[120,200,2]", small, ACCENT)

    draw.rounded_rectangle((52, 120, 816, 605), radius=16, fill=PANEL, outline=GRID, width=2)
    draw.rounded_rectangle((838, 120, 1228, 605), radius=16, fill=PANEL, outline=GRID, width=2)

    # A 2D closed-form pose illustration; the overlap interval on the right is
    # read from the actual local BREP result in verification.json.
    t = min(200.0, max(120.0, 120.0 + max(0, frame - 48) / (FPS * 5) * 80.0))
    inside_report = start <= t <= end
    a, b, c, d = 40.0, 120.0, 80.0, 100.0
    t2 = math.radians(t)
    t4 = rocker_angle(t)
    t3 = coupler_angle(t)
    o2 = point(t, 0, 0)
    o4 = point(t, d, 0)
    bpoint = point(t, a * math.cos(t2), a * math.sin(t2))
    cpoint = point(t, d + c * math.cos(t4), c * math.sin(t4))

    # Ground and axes.
    ground = [point(t, -8, -12), point(t, 108, -12), point(t, 108, 4), point(t, -8, 4)]
    draw.polygon(ground, fill=(61, 77, 96), outline=(133, 153, 173))
    draw.line((point(t, 0, -18), point(t, 0, 104)), fill=GRID, width=1)
    draw.line((point(t, -12, 0), point(t, 132, 0)), fill=GRID, width=1)

    stop_x = (68.0, 76.0)
    stop_z = (71.0, 80.0)
    block = [point(t, stop_x[0], stop_z[0]), point(t, stop_x[1], stop_z[0]), point(t, stop_x[1], stop_z[1]), point(t, stop_x[0], stop_z[1])]
    block_color = BLOCK_HIT if inside_report else BLOCK_CLEAR
    draw.polygon(block, fill=block_color, outline=PRIMARY)

    draw.line((o2, bpoint), fill=ACCENT, width=14)
    draw.line((bpoint, cpoint), fill=(191, 146, 255), width=14)
    draw.line((o4, cpoint), fill=ROCKER, width=17)
    for center in (o2, o4, bpoint, cpoint):
        radius = 10
        draw.ellipse((center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius), fill=PRIMARY, outline=BACKGROUND, width=3)
    write_text(draw, (o2[0] - 15, o2[1] + 15), "O2", small, SECONDARY)
    write_text(draw, (o4[0] - 4, o4[1] + 15), "O4", small, SECONDARY)
    write_text(draw, (bpoint[0] - 26, bpoint[1] - 28), "crank", small, ACCENT)
    write_text(draw, (cpoint[0] + 10, cpoint[1] - 16), "rocker", small, ROCKER)
    write_text(draw, (point(t, 73, 83)[0] - 54, point(t, 73, 83)[1] - 24), "test block", small, BLOCK_HIT if inside_report else BLOCK_CLEAR)

    write_text(draw, (72, 135), "2D pose illustration · solved-link reference", heading, PRIMARY)
    write_text(draw, (72, 570), "Support bracket omitted for clarity; interval and volumes come from the local BREP check.", small, SECONDARY)

    # The result panel uses values captured from checkSweptCollisionTool.
    write_text(draw, (862, 148), "Sweep report", heading, PRIMARY)
    write_text(draw, (862, 186), "joint / range / step", small, SECONDARY)
    write_text(draw, (862, 209), "crank  120° → 200° / 2°", mono, PRIMARY)
    write_text(draw, (862, 254), "reported overlap stretch", small, SECONDARY)
    write_text(draw, (862, 277), f"{start:.5f}° – {end:.5f}°", value, BLOCK_HIT)
    write_text(draw, (862, 315), f"{stretch['startResolution']:.5f}° bracket at each end", small, PRIMARY)
    write_text(draw, (862, 355), f"volume cutoff   {walk['collisionToleranceMm3']:.2f} mm³", small, PRIMARY)
    write_text(draw, (862, 391), f"worst volume     {pair['worstVolumeMm3']:.2f} mm³", small, PRIMARY)
    write_text(draw, (862, 427), f"worst crank      {pair['worstPose']['crank']:.0f}°", small, PRIMARY)
    write_text(draw, (862, 463), f"unknown poses    {len(walk['unknown'])}", small, PRIMARY)
    write_text(draw, (862, 510), "State from local BREP result:", small, SECONDARY)
    write_text(draw, (862, 537), "inside interval" if inside_report else "outside interval", heading, BLOCK_HIT if inside_report else ACCENT)

    # Timeline: the red span is taken from the measured report.
    line_left, line_right, line_y = 88, 776, 638
    draw.line((line_left, line_y, line_right, line_y), fill=GRID, width=8)
    x_for = lambda degree: line_left + (degree - 120) / 80 * (line_right - line_left)
    draw.line((x_for(start), line_y, x_for(end), line_y), fill=BLOCK_HIT, width=12)
    draw.line((x_for(t), line_y - 15, x_for(t), line_y + 15), fill=PRIMARY, width=3)
    write_text(draw, (line_left, line_y + 14), "120°", small, SECONDARY)
    write_text(draw, (line_right - 35, line_y + 14), "200°", small, SECONDARY)
    write_text(draw, (510, 626), f"driven crank {t:06.2f}°", mono, PRIMARY)

    draw.line((58, 683, 1222, 683), fill=GRID, width=1)
    write_text(draw, (60, 690), "Local source validation only · no deployed behavior or hardware acceptance claimed", small, SECONDARY)
    return image


def main() -> None:
    evidence = json.loads((BUNDLE_DIR / "verification.json").read_text(encoding="utf-8"))
    font_set = fonts()
    frame_count = FPS * DURATION_SECONDS
    with tempfile.TemporaryDirectory(prefix="kernelcad-swept-demo-") as temp_dir:
        temp = Path(temp_dir)
        for index in range(frame_count):
            frame = draw_frame(index, evidence, font_set)
            frame.save(temp / f"frame-{index:04d}.png", optimize=True)
        output = BUNDLE_DIR / "demo.mp4"
        subprocess.run(
            [
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                "-framerate", str(FPS), "-i", str(temp / "frame-%04d.png"),
                "-t", str(DURATION_SECONDS), "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "23",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output),
            ],
            check=True,
        )
        subprocess.run(
            [
                "ffprobe", "-v", "error", "-select_streams", "v:0",
                "-show_entries", "stream=codec_name,width,height,pix_fmt,r_frame_rate,duration",
                "-of", "json", str(output),
            ],
            check=True,
        )

        inspection = Image.new("RGB", (1920, 400), BACKGROUND)
        inspection_draw = ImageDraw.Draw(inspection)
        labels = ["0.8 s · entry clear", "4.5 s · inside reported interval", "8.7 s · exit clear"]
        for index, timestamp in enumerate((0.8, 4.5, 8.7)):
            frame_path = temp / f"inspection-{index}.png"
            subprocess.run(
                [
                    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                    "-ss", str(timestamp), "-i", str(output), "-frames:v", "1", str(frame_path),
                ],
                check=True,
            )
            thumb = Image.open(frame_path).convert("RGB").resize((640, 360), Image.Resampling.LANCZOS)
            x, y = index * 640, 28
            inspection.paste(thumb, (x, y))
            inspection_draw.text((x + 12, 4), labels[index], font=font_set["small"], fill=PRIMARY)
        inspection.save(BUNDLE_DIR / "visual-inspection.png", optimize=True)


if __name__ == "__main__":
    main()
