#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Compose demo.mp4 from the sheet render and verification/{before,after}.json. Numbers are read, not typed."""
import json
import pathlib
import subprocess
import tempfile
from collections import Counter

from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
W, H = 1280, 720
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
SHOW = ["rectangular-block", "plate-through-hole", "plate-blind-hole", "cone-frustum-revolve",
        "annular-cylinder", "stepped-shaft-revolve", "rounded-box", "sphere"]


def base(title: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    d.text((40, 28), title, font=ImageFont.truetype(BOLD, 32), fill="#1b2a3a")
    d.text((40, H - 38), "kernelCAD drawing_to_cad — local scorecard run on sheets kernelCAD drew itself; not third-party or scanned drawings",
           font=ImageFont.truetype(FONT, 15), fill="#7a8794")
    return img, d


def load(name: str) -> dict:
    return {r["id"]: r for r in json.loads((HERE / "verification" / name).read_text())}


def main() -> None:
    before, after = load("before.json"), load("after.json")
    total = len(after)
    cb, ca = Counter(r["status"] for r in before.values()), Counter(r["status"] for r in after.values())
    slides = []

    img, d = base("Input: a kernelCAD PDF drawing, nothing else")
    sheet = Image.open(HERE / "verification" / "stepped-shaft-sheet.png").convert("RGB")
    sheet.thumbnail((1180, 560))
    img.paste(sheet, ((W - sheet.width) // 2, 85))
    slides.append(img)

    img, d = base("27 reference parts: drawing → drawing_to_cad → measure")
    body, mono = ImageFont.truetype(FONT, 24), ImageFont.truetype(MONO, 19)
    d.text((40, 100), f"before the fix: {cb['PASS']}/{total} pass   ({cb['WRONG']} wrong, {cb['ERROR']} error)", font=body, fill="#a61b1b")
    d.text((40, 140), f"after the fix:  {ca['PASS']}/{total} pass   ({ca['WRONG']} wrong, {ca['REFUSED']} refused, {ca['ERROR']} error)", font=body, fill="#1b6e2a")
    d.text((40, 190), "pass = volume within ±0.1 % (mass check) and every extent within 0.05 mm", font=ImageFont.truetype(FONT, 18), fill="#26323d")
    y = 240
    d.text((40, y), f"{'part':<26}{'before':>16}{'after':>16}", font=mono, fill="#26323d")
    for pid in SHOW:
        def cell(r):
            v = r.get("volumeError")
            return r["status"] if v is None else f"{r['status']} {v*100:+.2f}%"
        y += 30
        d.text((40, y), f"{pid:<26}{cell(before[pid]):>16}{cell(after[pid]):>16}", font=mono, fill="#0b5394")
    slides.append(img)

    img, d = base("What was wrong, what is still out of scope")
    lines = [
        "Fixed in the reader:",
        "• datum boxes and tolerance frames were merged into views → views never lined up",
        "• circles written as line segments looked like a pictorial view",
        "• a captioned cone FRONT view was dropped for its slanted sides",
        "• blind holes read from hidden lines were cut 1 mm too deep",
        "",
        "Still failing (reported, not guessed):",
        "• fillets, chamfers, slots, shells, lofts, tori, multi-body pin patterns",
        "• ▾ depth and ⌴ counterbore symbols are drawn as shapes, so callouts split",
        "• scanned / raster drawings are refused",
    ]
    y = 100
    for line in lines:
        d.text((40, y), line, font=ImageFont.truetype(FONT, 22), fill="#26323d")
        y += 38
    slides.append(img)

    with tempfile.TemporaryDirectory() as tmp:
        for i, s in enumerate(slides):
            s.save(f"{tmp}/slide{i}.png")
            s.save(HERE / "verification" / f"frame-{i}.png")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "1/5", "-i", f"{tmp}/slide%d.png",
                        "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-movflags", "+faststart", str(HERE / "demo.mp4")], check=True)
    print(f"wrote {HERE / 'demo.mp4'}")


if __name__ == "__main__":
    main()
