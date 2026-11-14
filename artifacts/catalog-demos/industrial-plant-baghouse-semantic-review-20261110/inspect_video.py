#!/usr/bin/env python3
"""Decode and inspect the short MP4 demo and retain a contact sheet."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "industrial-plant-baghouse-semantic-review.mp4"
REVIEW = BUNDLE / "video-review"
REVIEW.mkdir(parents=True, exist_ok=True)
probe = json.loads(subprocess.run([
    "ffprobe", "-v", "error", "-show_entries",
    "format=duration,size:stream=codec_name,width,height,pix_fmt,r_frame_rate",
    "-of", "json", str(VIDEO),
], check=True, capture_output=True, text=True).stdout)
stream = probe["streams"][0]
duration = float(probe["format"]["duration"])
if stream["codec_name"] != "h264" or stream["width"] != 1280 or stream["height"] != 720 or not 14.9 <= duration <= 15.1:
    raise SystemExit(f"unexpected demo encoding/duration: {probe}")
times = [1.5, 4.5, 7.5, 10.5, 13.5]
frames = []
for index, timestamp in enumerate(times, 1):
    path = REVIEW / f"decoded-{index:02d}.png"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(timestamp),
        "-i", str(VIDEO), "-frames:v", "1", str(path),
    ], check=True)
    frames.append(path)
thumb_w, thumb_h = 384, 216
contact = Image.new("RGB", (5 * thumb_w, thumb_h + 34), "#101923")
draw = ImageDraw.Draw(contact)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
for index, path in enumerate(frames):
    image = Image.open(path).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    contact.paste(image, (index * thumb_w, 0))
    draw.text((index * thumb_w + 8, thumb_h + 8), f"decoded frame {index + 1} · {times[index]:.1f}s", fill="#eef3f5", font=font)
contact_path = REVIEW / "contact-sheet.png"
contact.save(contact_path, optimize=True)
record = {
    "invocation": "python3 artifacts/catalog-demos/industrial-plant-baghouse-semantic-review-20261110/inspect_video.py",
    "video": str(VIDEO.relative_to(BUNDLE.parents[1])),
    "probe": probe,
    "durationSeconds": duration,
    "decodedTimestampsSeconds": times,
    "decodedFrames": [str(path.relative_to(BUNDLE)) for path in frames],
    "contactSheet": str(contact_path.relative_to(BUNDLE)),
    "pass": True,
}
(REVIEW / "inspection.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(f"Inspected H.264 {stream['width']}x{stream['height']} video, {duration:.2f}s; decoded 5 frames.")
