# Compose the demo frames (1280x720) from the render PNGs and encode demo.mp4.
# Usage: python3 -I compose.py <render-dir> <out-dir>
# <render-dir> holds iso.png (render inspect, canonical RGB) and the cut-*.png
# cut-away stills from cutaway.py; the captions quote result.json.
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

src, out = Path(sys.argv[1]), Path(sys.argv[2])
here = Path(__file__).resolve().parent
res = json.loads((here / "result.json").read_text())
g, u, c = res["bracketGraded"], res["bracketUniform"], res["cube60"]
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 26)
small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
mono = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 18)


def frame(img_name, title, lines, idx):
    f = Image.new("RGB", (1280, 720), (24, 26, 30))
    if img_name:
        im = Image.open(src / img_name).convert("RGB")
        im.thumbnail((640, 640))
        f.paste(im, (40, 50))
    d = ImageDraw.Draw(f)
    d.text((720, 60), title, font=font, fill=(240, 240, 240))
    y = 120
    for ln in lines:
        d.text((720, y), ln, font=mono if ln.startswith(" ") else small, fill=(200, 210, 220))
        y += 30
    d.text((40, 690), "kernelCAD local run (CLI on this machine) - render, not a printed part", font=small, fill=(140, 140, 140))
    f.save(out / f"frame-{idx}.png")


frame(None, "body.lattice() - graded gyroid bracket", [
    "PETG shelf bracket, two M5 bores",
    "",
    " return bracket.lattice({",
    "   type: 'gyroid', cell: 6,",
    "   wall: 0.9, skin: 1.2,",
    "   grade: { from: 'holes',",
    "            near: 2.0, over: 8 },",
    " });",
    "",
    "examples/lattice/graded-gyroid-bracket.kcad.ts",
], 1)
frame("iso.png", "Outside: solid 1.2 mm skin", [
    "render inspect, canonical iso view",
    f"skin p5 measured {g['measuredSkinMm']['p5Mm']:.2f} mm",
    f"{g['triangles']:,} triangles, watertight: {g['watertight']}",
    f"consistently oriented: {g['consistentOrientation']}",
], 2)
for i, name in enumerate(sorted(p.name for p in src.glob("cut-*.png"))):
    frame(name, "Cut-away: gyroid core", [
        "exported STL, triangles at y > 20 dropped",
        "(cutaway.py; orange = wall backs seen in the cut)",
        f"design wall {g['designWallMm']['min']:.2f}-{g['designWallMm']['max']:.2f} mm",
        f"(2 mm walls next to the bores)",
        f"measured wall p5 {g['measuredWallMm']['p5Mm']:.2f} mm",
        f"volume {g['volumeMm3']:.0f} mm3 = {g['solidFraction']*100:.1f} % of solid",
        f"ungraded: {u['solidFraction']*100:.1f} %",
    ], 3 + i)
n = 3 + len(list(src.glob("cut-*.png")))
frame(None, "Report + export", [
    "feature.lattice.report (info) - measured on the mesh",
    "dfm.lattice.enclosed-cavities (info): skin seals voids",
    "export stl / 3mf / obj: mesh solid; step refused",
    "",
    "60 mm cube, gyroid 6 mm / 0.8 mm / skin 1.2:",
    f" field+mesh {c['timingsMs']['tpmsFieldMs']+c['timingsMs']['bodyDistanceMs']+c['timingsMs']['meshMs']} ms",
    f" decimate   {c['timingsMs']['decimateMs']} ms",
    f" total      {c['timingsMs']['totalMs']} ms",
    f" {c['triangles']:,} triangles, solid {c['solidFraction']*100:.1f} %",
], n)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "1/3", "-i", str(out / "frame-%d.png"),
                "-vf", "fps=24,format=yuv420p", "-c:v", "libx264", "-crf", "28", str(out / "demo.mp4")], check=True)
print("wrote", out / "demo.mp4")
