# Compose the demo frames (1280x720) from `render inspect` PNGs and the
# dfm_review rows in result.json, then encode demo.mp4.
# Usage: python3 -I compose.py <render-dir> <out-dir>
# <render-dir>/<part>/channels/rgb/{iso,front,top}.png from
#   kernelcad render inspect docs/demos/dfm-sheetmetal-molding/<part>.kcad.ts <render-dir>/<part>
import json
import subprocess
import sys
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
here = Path(__file__).resolve().parent
res = json.loads((here / "result.json").read_text())
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
title_f = ImageFont.truetype(FONT, 28)
small = ImageFont.truetype(FONT, 18)
mono = ImageFont.truetype(MONO, 17)
COLORS = {"pass": (110, 200, 120), "fail": (235, 95, 85), "warn": (235, 190, 80)}
FOOT = "kernelCAD local validation (dfm_review run by the CLI on this machine) - renders, not a molded or bent part"


def base(title):
    f = Image.new("RGB", (1280, 720), (24, 26, 30))
    d = ImageDraw.Draw(f)
    d.text((40, 24), title, font=title_f, fill=(240, 240, 240))
    d.text((40, 690), FOOT, font=small, fill=(140, 140, 140))
    return f, d


def paste(f, part, view, box, size):
    im = Image.open(src / part / "channels" / "rgb" / f"{view}.png").convert("RGB")
    im.thumbnail((size, size))
    f.paste(im, box)


def rows(d, part, x, y, width=60):
    r = res[part]
    d.text((x, y), f"dfm_review({{ file: '{r['call']['file']}',", font=mono, fill=(170, 190, 230))
    y += 22
    d.text((x, y), f"             processes: {r['call']['processes']} }})", font=mono, fill=(170, 190, 230))
    y += 34
    for c in r["checks"]:
        d.text((x, y), f"{c['status'].upper():4}", font=mono, fill=COLORS[c["status"]])
        d.text((x + 60, y), c["id"], font=mono, fill=(225, 225, 225))
        y += 24
        for ln in textwrap.wrap(c["summary"], width)[:3]:
            d.text((x + 60, y), ln, font=small, fill=(180, 188, 198))
            y += 22
        y += 6
    v = r["verdict"]
    d.text((x, y + 4), f"verdict: {v}", font=title_f, fill=COLORS[v])


frames = []


def save(f):
    p = out / f"frame-{len(frames) + 1:02d}.png"
    f.save(p)
    frames.append(p)


f, d = base("dfm_review: new processes 'sheet-metal' and 'injection-molding'")
for i, ln in enumerate([
    "dfm_review({ file, processes: ['sheet-metal'] })",
    "  sheet.min-bend-radius  inner R >= 1 x t",
    "  sheet.hole-to-bend     hole edge to bend line >= 2.5 x t + R",
    "  sheet.hole-to-edge     hole edge to blank edge >= 2 x t",
    "  sheet.min-flange       outside of bend to edge >= 4 x t",
    "",
    "dfm_review({ file, processes: ['injection-molding'], pull_direction: '+z' })",
    "  mold.draft             faces under min_draft_deg (1), by @kc face ref",
    "  mold.wall-thickness    1-4 mm, max/min ratio 2.5 (warn)",
    "  mold.undercuts         faces neither mold half releases",
    "  mold.sharp-internal-corners  (warn)",
    "",
    "Defaults stay ['fdm', 'cnc']; every limit is a call option.",
]):
    d.text((60, 100 + i * 34), ln, font=mono if ln.startswith(" ") or ln.startswith("d") else small, fill=(210, 215, 225))
save(f)

for part, title, views in [
    ("tray-undrafted", "Molded tray, first pass: straight walls + side window", ("iso", "front")),
    ("tray-drafted", "Fixed: 2 deg draft inside and out, window removed", ("iso", "front")),
    ("bracket-tight", "2 mm sheet bracket, first pass: R1 bend, hole 2 mm from bend", ("top", "iso")),
    ("bracket-fixed", "Fixed: R2 bend, hole moved 10 mm back", ("top", "iso")),
]:
    f, d = base(title)
    paste(f, part, views[0], (30, 80), 430)
    paste(f, part, views[1], (110, 470), 210)
    d.text((340, 560), f"render inspect:\n{views[0]} (large),\n{views[1]} (small)", font=small, fill=(150, 150, 150))
    rows(d, part, 480, 90)
    save(f)

f, d = base("Where the findings point")
u = res["tray-undrafted"]
b = res["bracket-tight"]
lines = ["mold.draft  undrafted faces (@kc refs):"] + [f"  {x}" for x in u["undraftedFaces"][:6]]
lines += ["", "mold.undercuts  locked faces:"] + [f"  {x['face']} at ({', '.join(f'{v:.1f}' for v in x['location'])})" for x in u["undercutFaces"][:3]]
h = b["holeToBend"][1] if len(b["holeToBend"]) > 1 else b["holeToBend"][0]
lines += ["", "sheet.hole-to-bend  (flat-pattern coordinates):",
          f"  hole #{h['hole']} edge at ({h['location'][0]:.1f}, {h['location'][1]:.1f}), {h['distanceMm']:.2f} mm from bend #{h['bend']}",
          f"  limit {h['limitMm']:.2f} mm = 2.5 x 2 mm + R1",
          f"sheet.min-bend-radius  {b['bends'][0]['featureId']}: R{b['bends'][0]['radiusMm']} < R{b['bends'][0]['minRadiusMm']}"]
for i, ln in enumerate(lines):
    d.text((60, 90 + i * 28), ln, font=mono, fill=(210, 215, 225))
save(f)

list_file = out / "frames.txt"
with list_file.open("w") as fh:
    for p in frames:
        fh.write(f"file '{p.name}'\nduration 4\n")
    fh.write(f"file '{frames[-1].name}'\n")
subprocess.run([
    "ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(list_file),
    "-vf", "fps=25,format=yuv420p", "-c:v", "libx264", "-crf", "23", "-movflags", "+faststart",
    str(out / "demo.mp4"),
], check=True, cwd=out)
print("wrote", out / "demo.mp4", len(frames), "frames")
