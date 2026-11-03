#!/usr/bin/env python3
"""Decode the MP4 and retain objective inspection metadata and a contact sheet."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
video = BUNDLE / "hydroponics-kit.mp4"
probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,width,height,r_frame_rate,pix_fmt:format=duration", "-of", "json", str(video)], check=True, capture_output=True, text=True)
metadata = json.loads(probe.stdout)
frames_dir = BUNDLE / "video-review"
frames_dir.mkdir(parents=True, exist_ok=True)
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(video), "-vf", "fps=1/3", str(frames_dir / "decoded-%02d.png")], check=True)
images = sorted(frames_dir.glob("decoded-*.png"))
thumbs = []
for i, path in enumerate(images, 1):
    image = Image.open(path).convert("RGB")
    image.thumbnail((384, 216), Image.Resampling.LANCZOS)
    tile = Image.new("RGB", (400, 244), "#111923")
    tile.paste(image, ((400 - image.width) // 2, 4))
    ImageDraw.Draw(tile).text((10, 222), f"Decoded frame {i:02d}", fill="#eef3f5", font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12))
    thumbs.append(tile)
sheet = Image.new("RGB", (800, 1220), "#111923")
for i, image in enumerate(thumbs):
    sheet.paste(image, ((i % 2) * 400, (i // 2) * 244))
sheet.save(frames_dir / "contact-sheet.png", optimize=True)
stream = metadata["streams"][0]
result = {"video": video.name, "codec": stream["codec_name"], "width": stream["width"], "height": stream["height"], "frameRate": stream["r_frame_rate"], "pixelFormat": stream["pix_fmt"], "durationSeconds": float(metadata["format"]["duration"]), "sampledFrameCount": len(images), "contactSheet": "video-review/contact-sheet.png", "manualVisualInspection": "pending"}
(frames_dir / "video-inspection.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if result["codec"] != "h264" or result["width"] != 1280 or result["height"] != 720 or len(images) != 10:
    raise SystemExit("MP4 inspection did not match expected dimensions, codec or frame count")
