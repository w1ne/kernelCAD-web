#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Compose demo.mp4 from verification/render-{30,45,60}.png and bench-output.jsonl (numbers are read, not typed)."""
import json, pathlib, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFont
HERE = pathlib.Path(__file__).resolve().parent
W, H = 1280, 720
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"; B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; M = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
rows = [json.loads(l) for l in (HERE / "bench-output.jsonl").read_text().splitlines() if l.strip()]
by = {r["step"]: r for r in rows}
CODE = ["const tabAngle = param('tabAngle', 30, { min: 0, max: 80 });",
        "// plain JS math on a param — threw before this change",
        "const rise = Math.tan(tabAngle * Math.PI / 180) * 20;",
        "const tab = box(20, 10, 4 + rise).translate(150, 55, 0);"]
def slide(title, render, lines, code=False):
    img = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(img)
    d.text((40, 28), title, font=ImageFont.truetype(B, 32), fill="#1b2a3a")
    if render:
        shot = Image.open(HERE / "verification" / render).convert("RGB"); shot.thumbnail((700, 520)); img.paste(shot, (W - shot.width - 10, 120))
    y = 110
    for line in lines:
        d.text((40, y), line, font=ImageFont.truetype(M if code else F, 17 if code else 22), fill="#0b5394" if code else "#26323d"); y += 32
    d.text((40, H - 38), "kernelCAD core, local run (bench.ts); timings are this machine, not production", font=ImageFont.truetype(F, 15), fill="#7a8794")
    return img
b, e45, e60, full = by["build"], by["tabAngle=45"], by["tabAngle=60"], by["full rebuild at tabAngle=60"]
slides = [
    slide("Plain math on a param", "render-30.png", CODE[:1] + [""] + CODE[1:], code=True),
    slide("tabAngle 30 → 45", "render-45.png", [f"edit: {e45['ms']} ms", f"re-lowered {e45['relowered']} of {b['records']} features", f"reused {e45['reused']}", f"tab height {e45['heightMm']} mm (tan 45°·20 + 4)"]),
    slide("tabAngle 45 → 60", "render-60.png", [f"edit: {e60['ms']} ms", f"re-lowered {e60['relowered']} of {b['records']} features", f"tab height {e60['heightMm']} mm (tan 60°·20 + 4)"]),
    slide("Fast and universal", None, [f"full rebuild of the same model: {full['ms']} ms", f"param edit: {e60['ms']} ms  (~{round(full['ms'] / max(e60['ms'], 1))}x faster)", "",
        "Any script: w + 4, Math.sin(a), loops, point lists.", "An edit rewrites the param default in the source,", "re-runs the script (JS, milliseconds) and rebuilds only",
        "features whose inputs changed. .add()/.multiply() still work."]),
]
with tempfile.TemporaryDirectory() as tmp:
    for i, s in enumerate(slides):
        s.save(f"{tmp}/s{i}.png"); s.save(HERE / "verification" / f"frame-{i}.png")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "1/4", "-i", f"{tmp}/s%d.png", "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-movflags", "+faststart", str(HERE / "demo.mp4")], check=True)
print("wrote", HERE / "demo.mp4")
