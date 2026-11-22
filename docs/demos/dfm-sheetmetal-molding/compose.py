# Compose the demo frames (1280x720) from retained render-inspection viewports
# and the freshly generated dfm_review rows in result.json, then encode demo.mp4.
# Usage: python3 -I compose.py <out-dir>
import json
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

out = Path(sys.argv[1]).resolve()
out.mkdir(parents=True, exist_ok=True)
here = Path(__file__).resolve().parent
res = json.loads((here / "result.json").read_text())
VIEW_CROP = {
    "tray-undrafted": {"iso": (30, 80, 460, 510), "front": (110, 470, 320, 680)},
    "tray-drafted": {"iso": (30, 80, 460, 510), "front": (110, 470, 320, 680)},
    "bracket-tight": {"top": (30, 80, 460, 510), "iso": (110, 470, 320, 680)},
    "bracket-fixed": {"top": (30, 80, 460, 510), "iso": (110, 470, 320, 680)},
}
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
title_f = ImageFont.truetype(FONT, 28)
small = ImageFont.truetype(FONT, 18)
mono = ImageFont.truetype(MONO, 17)
COLORS = {"pass": (110, 200, 120), "fail": (235, 95, 85), "warn": (235, 190, 80), "not-checked": (130, 170, 235)}
FOOT = "kernelCAD local validation (report.ts calls dfmReviewTool directly) - renders, not a molded or bent part"


def base(title):
    f = Image.new("RGB", (1280, 720), (24, 26, 30))
    d = ImageDraw.Draw(f)
    d.text((40, 24), title, font=title_f, fill=(240, 240, 240))
    d.text((40, 690), FOOT, font=small, fill=(140, 140, 140))
    return f, d


def paste(f, part, view, box, size):
    source_part = "tray-undrafted" if part in ("tray-not-sheet-metal", "tray-fdm") else part
    crop = VIEW_CROP[source_part][view]
    im = Image.open(here / f"viewport-source-{source_part}.png").convert("RGB").crop(crop)
    im.thumbnail((size, size))
    f.paste(im, box)


def number(value):
    return f"{value:.6g}"


def rows(d, part, x, y, width=54):
    r = res[part]
    d.text((x, y), f"dfm_review({{ file: '{r['call']['file']}',", font=mono, fill=(170, 190, 230))
    y += 22
    d.text((x, y), f"             processes: {r['call']['processes']} }})", font=mono, fill=(170, 190, 230))
    y += 34
    for c in r["checks"]:
        d.text((x, y), c["status"].upper(), font=mono, fill=COLORS[c["status"]])
        d.text((x + 180, y), c["id"], font=mono, fill=(225, 225, 225))
        y += 21
        if c.get("value") is not None:
            metric = f"value {number(c['value'])} {c.get('unit', '')}".strip()
            if c.get("op") is not None and c.get("limit") is not None:
                metric += f" {c['op']} {number(c['limit'])} {c.get('unit', '')}"
            if c.get("tolerance") is not None:
                metric += f" (tol {number(c['tolerance'])} {c.get('unit', '')})"
            for line in textwrap.wrap(f"source {c['source']} · {metric}", width=52):
                d.text((x + 180, y), line, font=small, fill=(145, 180, 215))
                y += 21
        if c.get("refs"):
            refs = ", ".join(c["refs"][:2])
            if len(c["refs"]) > 2:
                refs += f" +{len(c['refs']) - 2}"
            d.text((x + 180, y), f"refs: {refs}", font=small, fill=(145, 180, 215))
            y += 21
        elif c["id"] in {"mold.draft", "mold.undercuts", "mold.sharp-internal-corners"} and c["status"] != "not-checked":
            d.text((x + 180, y), "refs: none emitted (no unique resolvable lineage)", font=small, fill=(145, 180, 215))
            y += 21
        summary_lines = textwrap.wrap(c["summary"], width)
        if len(summary_lines) > 2:
            summary_lines = summary_lines[:2]
            summary_lines[-1] = summary_lines[-1].rstrip(" .") + "…"
        for ln in summary_lines:
            d.text((x + 180, y), ln, font=small, fill=(180, 188, 198))
            y += 22
    v = r["verdict"]
    d.text((x, y + 4), f"ok: {r['ok']}   verdict: {v}", font=title_f, fill=COLORS[v] if v is not None else (235, 190, 80))


frames = []


def save(f):
    p = out / f"frame-{len(frames) + 1:02d}.png"
    f.save(p)
    frames.append(p)


f, d = base("dfm_review: structured outcomes for sheet metal and injection molding")
for i, ln in enumerate([
    "verdict: pass | fail | not-checked",
    "warn: evaluated warning that does not fail a review",
    "ok: invocation and analysis execution, not manufacturability",
    "id: stable DFM rule key; source: KernelCAD process engine",
    "unit/op: comparable quantities only; refs: optional, emitted only when resolvable",
    "tolerance: inclusive, same unit as value/limit; zero when absent",
    "",
    "sheet-metal: inner R >= 1 x t; hole-to-bend >= 2.5 x t + R",
    "hole-to-edge >= 2 x t; flange >= 4 x t",
    "",
    "injection-molding, pull_direction '+z':",
    "draft >= 1 deg; walls 1-4 mm, max/min ratio 2.5",
    "undercuts block either mold half; corners under R0.5 warn",
    "",
    "Defaults stay ['fdm', 'cnc']; every limit is a call option.",
]):
    d.text((60, 100 + i * 32), ln, font=mono if ln.startswith(" ") or ln.startswith("d") else small, fill=(210, 215, 225))
save(f)

for part, title, views in [
    ("tray-undrafted", "Molded tray, first pass: straight walls + side window", ("iso", "front")),
    ("tray-drafted", "Fixed: 2 deg draft inside and out, window removed", ("iso", "front")),
    ("bracket-tight", "2 mm sheet bracket, first pass: R1 bend, hole 2 mm from bend", ("top", "iso")),
    ("bracket-fixed", "Fixed: R2 bend, hole moved 10 mm back", ("top", "iso")),
    ("tray-not-sheet-metal", "Requested sheet-metal check on a regular solid", ("iso", "front")),
    ("tray-fdm", "FDM review reports overhang area in its own unit", ("iso", "front")),
]:
    f, d = base(title)
    render_part = "tray-undrafted" if part in ("tray-not-sheet-metal", "tray-fdm") else part
    paste(f, render_part, views[0], (30, 80), 430)
    paste(f, render_part, views[1], (110, 470), 210)
    d.text((340, 560), f"retained view:\n{views[0]} (large),\n{views[1]} (small)", font=small, fill=(150, 150, 150))
    rows(d, part, 480, 90)
    save(f)

f, d = base("Structured evidence keeps rule, measurement, and topology distinct")
u = res["tray-undrafted"]
b = res["bracket-tight"]
draft = next(c for c in u["checks"] if c["id"] == "mold.draft")
overhang = next(c for c in res["tray-fdm"]["checks"] if c["id"] == "fdm.overhangs")
missing = res["tray-not-sheet-metal"]["checks"][0]
draft_refs = draft.get("refs", [])
lines = ["id stays the DFM rule key; source identifies the running engine.",
         f"mold.draft: source {draft['source']}, {draft['value']} {draft['unit']} {draft['op']} {draft['limit']} {draft['unit']}",
         f"tolerance {draft.get('tolerance', 0)} {draft['unit']}; value + tolerance >= limit"]
if draft_refs:
    lines += ["refs: each emitted @kc face id resolved on this fixture:"] + [f"  {x}" for x in draft_refs[:4]]
else:
    lines.append("refs: none emitted (no unique resolvable lineage)")
lines += ["", f"{missing['id']}: {missing['status']} (this solid has no sheetMetal chain)",
          "ok is true: the call ran; verdict is not-checked.", ""]
lines += ["Area and angular limits are not combined into a comparison.",
          f"fdm.overhangs value: {overhang['value']} {overhang['unit']} (no op or degree limit)"]
undercut_refs = [x["face"] for x in u["undercutFaces"] if x.get("face") is not None]
lines += ["", f"mold.undercuts  locked faces (refs: {'emitted' if undercut_refs else 'none emitted'}):"]
lines += [
    f"  {x['face'] + ' ' if x.get('face') is not None else ''}at ({', '.join(f'{v:.1f}' for v in x['location'])})"
    for x in u["undercutFaces"][:3]
]
h = b["holeToBend"][1] if len(b["holeToBend"]) > 1 else b["holeToBend"][0]
lines += ["", "sheet.hole-to-bend  (flat-pattern coordinates):",
          f"  hole #{h['hole']} edge at ({h['location'][0]:.1f}, {h['location'][1]:.1f}), {h['distanceMm']:.2f} mm from bend #{h['bend']}",
          f"  limit {h['limitMm']:.2f} mm = 2.5 x 2 mm + R1",
          f"sheet.min-bend-radius  {b['bends'][0]['featureId']}: R{b['bends'][0]['radiusMm']} < R{b['bends'][0]['minRadiusMm']}"]
for i, ln in enumerate(lines):
    d.text((60, 90 + i * 24), ln, font=mono, fill=(210, 215, 225))
save(f)

for still, index in [
    ("still-tray-undrafted.png", 1),
    ("still-tray-drafted.png", 2),
    ("still-bracket-tight.png", 3),
    ("still-bracket-fixed.png", 4),
]:
    shutil.copyfile(frames[index], out / still)

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
