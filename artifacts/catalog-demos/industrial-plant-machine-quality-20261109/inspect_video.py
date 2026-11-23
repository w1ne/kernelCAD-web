"""Decode representative MP4 samples and write a compact inspection contact sheet."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "industrial-plant-machine-refinement.mp4"
REVIEW = BUNDLE / "video-review"
REVIEW.mkdir(parents=True, exist_ok=True)

probe = subprocess.run(
    [
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration,size:stream=codec_name,width,height,r_frame_rate,nb_frames",
        "-of", "json", str(VIDEO),
    ],
    check=True,
    capture_output=True,
    text=True,
)
metadata = json.loads(probe.stdout)
samples = []
for index, seconds in enumerate([0.5, 3.5, 6.5, 9.5, 12.5, 15.5], start=1):
    out = REVIEW / f"decoded-{index:02}.png"
    subprocess.run(
        ["ffmpeg", "-y", "-ss", str(seconds), "-i", str(VIDEO), "-frames:v", "1", str(out)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    samples.append({"timeSeconds": seconds, "frame": out.name})

thumb_w, thumb_h = 400, 225
sheet = Image.new("RGB", (thumb_w * 3, (thumb_h + 32) * 2), "#e9eff0")
draw = ImageDraw.Draw(sheet)
font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
label_font = ImageFont.truetype(font_path, 15)
for index, row in enumerate(samples):
    with Image.open(REVIEW / row["frame"]) as sample:
        sample = sample.convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    x, y = (index % 3) * thumb_w, (index // 3) * (thumb_h + 32)
    sheet.paste(sample, (x, y))
    draw.text((x + 8, y + thumb_h + 5), f"{row['timeSeconds']:.1f}s", font=label_font, fill="#172d36")
contact = REVIEW / "contact-sheet.png"
sheet.save(contact, optimize=True)

report = {
    "video": str(VIDEO.relative_to(BUNDLE)),
    "format": metadata,
    "sampledFrames": samples,
    "contactSheet": contact.name,
    "inspection": "MP4 decoded at six points from opening through final verification frame; images retained for visual review.",
}
(BUNDLE / "video-inspection.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"video": report["video"], "samples": len(samples), "contactSheet": report["contactSheet"]}, indent=2))
