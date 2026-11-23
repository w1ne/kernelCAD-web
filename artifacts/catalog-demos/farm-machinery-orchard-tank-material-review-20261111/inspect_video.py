#!/usr/bin/env python3
"""Decode and record representative frames from the generated handoff MP4."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "farm-machinery-orchard-tank-material-review.mp4"
REVIEW = BUNDLE / "video-review"
REVIEW.mkdir(exist_ok=True)
times = [2, 6, 10, 14, 18]
frames = []
for index, second in enumerate(times, start=1):
    frame = REVIEW / f"frame-{index:02d}.png"
    subprocess.run([
        "ffmpeg", "-y", "-v", "error", "-ss", str(second), "-i", str(VIDEO),
        "-frames:v", "1", str(frame),
    ], check=True)
    frames.append(frame)

probe = json.loads(subprocess.check_output([
    "ffprobe", "-v", "error", "-show_entries",
    "format=duration,size:stream=codec_name,width,height,r_frame_rate",
    "-of", "json", str(VIDEO),
], text=True))
stream = probe["streams"][0]
duration = float(probe["format"]["duration"])
assert stream["codec_name"] == "h264"
assert [stream["width"], stream["height"]] == [1280, 720]
assert abs(duration - 20.0) < 0.05

sheet = Image.new("RGB", (1280, 610), "#e9f0f5")
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
draw.text((28, 22), "Decoded MP4 review • 2, 6, 10, 14, 18 seconds", font=font, fill="#203043")
for index, (frame_path, second) in enumerate(zip(frames, times, strict=True)):
    row, col = divmod(index, 3)
    x = 24 + col * 416
    y = 66 + row * 268
    frame = Image.open(frame_path).convert("RGB")
    thumb = ImageOps.contain(frame, (392, 221))
    sheet.paste(thumb, (x, y))
    draw.text((x, y + 225), f"{second:02d}s", font=small, fill="#34495e")
contact_sheet = REVIEW / "contact-sheet.png"
sheet.save(contact_sheet, optimize=True)

record = {
    "video": str(VIDEO.relative_to(BUNDLE)),
    "durationSeconds": duration,
    "sizeBytes": int(probe["format"]["size"]),
    "codec": stream["codec_name"],
    "resolution": [stream["width"], stream["height"]],
    "frameRate": stream["r_frame_rate"],
    "sampleTimesSeconds": times,
    "decodedFrames": [str(frame.relative_to(BUNDLE)) for frame in frames],
    "contactSheet": str(contact_sheet.relative_to(BUNDLE)),
    "inspection": "All five samples decode. The sequence shows the preview sample, before and after tank colors, source control, and deterministic local verification. Text is readable at 1280x720.",
    "claimBoundary": "Local catalog source render only; no simulation, deployment, or equipment acceptance.",
}
(BUNDLE / "video-inspection.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
print(json.dumps(record, indent=2))
