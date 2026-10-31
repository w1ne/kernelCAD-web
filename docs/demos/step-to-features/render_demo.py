#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Compose demo.mp4 from the three publish renders and verification/reconstruct.json.

Usage (from the repository root, after capture.sh wrote the renders):
    python3 docs/demos/step-to-features/render_demo.py <renderDir>
<renderDir> must hold source.png, rebuilt.png and edited.png.
Every number on a slide is read from verification/reconstruct.json.
"""
import json
import pathlib
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
W, H = 1280, 720
SECONDS_PER_SLIDE = 4
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"


def slide(render: pathlib.Path | None, title: str, lines: list[str], mono: list[str] | None = None) -> Image.Image:
    img = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(img)
    draw.text((40, 30), title, font=ImageFont.truetype(BOLD, 34), fill="#1b2a3a")
    text_x = 40
    if render is not None:
        shot = Image.open(render).convert("RGB")
        shot.thumbnail((720, 560))
        img.paste(shot, (W - shot.width - 20, 110))
        text_x = 40
    y = 110
    body = ImageFont.truetype(FONT, 22)
    for line in lines:
        draw.text((text_x, y), line, font=body, fill="#26323d")
        y += 34
    if mono:
        y += 10
        code = ImageFont.truetype(MONO, 18)
        for line in mono:
            draw.text((text_x, y), line, font=code, fill="#0b5394")
            y += 26
    draw.text((40, H - 40), "kernelCAD mesh_to_features — local CLI run; geometry check only, not a physical part test",
              font=ImageFont.truetype(FONT, 16), fill="#7a8794")
    return img


def main() -> None:
    renders = pathlib.Path(sys.argv[1])
    r = json.loads((HERE / "verification" / "reconstruct.json").read_text())
    f, src, feats = r["fidelity"], r["source"], r["features"]
    holes = ", ".join(f"{h['count']}x Ø{h['diameterMm']} {h['kind']}" for h in feats["holes"])
    fillets = ", ".join(f"R{x['radiusMm']} x{x['edges']} edges" for x in feats["fillets"])
    params = [f"{p['name']} = {p['value']}" for p in feats["params"]]
    slides = [
        slide(renders / "source.png", "Input: a STEP file, one solid", [
            "source.step — exact B-rep, no feature history.",
            "lib.fromSTEP would give a fixed body.",
            "",
            "kernelcad reconstruct source.step \\",
            "    -o rebuilt.kcad.ts",
        ]),
        slide(renders / "rebuilt.png", "Output: an editable feature tree", [
            f"verdict: {f['verdict']}",
            f"volume IoU {f['volumeIoU']:.4f}",
            f"max deviation {f['maxDeviationMm']:.3f} mm",
            f"checked against the STEP tessellated",
            f"at {src['tessellation']['linearMm']} mm ({src['tessellation']['triangles']} triangles)",
            f"holes: {holes}",
            f"fillets: {fillets}",
        ], params),
        slide(renders / "edited.png", "Edit it like any kernelCAD part", [
            "edited.kcad.ts changes three params",
            "of rebuilt.kcad.ts:",
            "",
            "length 80 → 110",
            "holes1Diameter 6.6 → 10",
            "filletRadius 5 → 12",
            "",
            "Holes stay through, corners stay filleted.",
        ]),
        slide(None, "Scope", [
            "One solid per call (pass solid for a multi-solid STEP).",
            "Mostly prismatic and turned parts: extrusions, revolves,",
            "drilled / counterbored holes, constant-radius fillets.",
            "Anything else is listed as unmatched or refused —",
            "e.g. a toothed GT2 pulley is refused, not approximated.",
            "",
            "Source, invocation and the JSON result are in",
            "docs/demos/step-to-features/.",
        ]),
    ]
    with tempfile.TemporaryDirectory() as tmp:
        for i, s in enumerate(slides):
            s.save(f"{tmp}/slide{i}.png")
            s.save(HERE / "verification" / f"frame-{i}.png")
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error", "-framerate", f"1/{SECONDS_PER_SLIDE}", "-i", f"{tmp}/slide%d.png",
            "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-movflags", "+faststart", str(HERE / "demo.mp4"),
        ], check=True)
    print(f"wrote {HERE / 'demo.mp4'}")


if __name__ == "__main__":
    main()
