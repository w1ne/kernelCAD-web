#!/usr/bin/env python3
"""Decode the MP4, sample frames, and create a review contact sheet."""

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
VIDEO = BUNDLE / "recycling-facility-quality-promotion.mp4"
OUT = BUNDLE / "video-review"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    probe = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries",
        "stream=codec_name,width,height,r_frame_rate,pix_fmt:format=duration",
        "-of", "json", str(VIDEO),
    ]))
    stream = probe["streams"][0]
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(VIDEO),
        "-vf", "fps=1/3", "-frames:v", "8", str(OUT / "decoded-%02d.png"),
    ], check=True)
    frames = sorted(OUT.glob("decoded-*.png"))
    if len(frames) != 8:
        raise SystemExit(f"expected 8 decoded review frames, found {len(frames)}")
    tile_w, tile_h, gap, label_h = 480, 270, 12, 26
    sheet = Image.new("RGB", (tile_w * 2 + gap * 3, (tile_h + label_h) * 4 + gap * 5), "#111923")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(FONT, 14)
    for i, frame in enumerate(frames):
        x = gap + (i % 2) * (tile_w + gap)
        y = gap + (i // 2) * (tile_h + label_h + gap)
        im = Image.open(frame).convert("RGB")
        if im.size != (1280, 720):
            raise SystemExit(f"unexpected decoded frame size {im.size}: {frame.name}")
        im.thumbnail((tile_w, tile_h), Image.Resampling.LANCZOS)
        sheet.paste(im, (x, y))
        draw.text((x, y + tile_h + 3), f"decoded {i + 1:02d} · t={i * 3}s", fill="#eef3f5", font=font)
    sheet.save(OUT / "contact-sheet.png", optimize=True)
    result = {
        "video": VIDEO.name,
        "codec": stream["codec_name"],
        "width": stream["width"],
        "height": stream["height"],
        "frameRate": stream["r_frame_rate"],
        "pixelFormat": stream.get("pix_fmt"),
        "durationSeconds": round(float(probe["format"]["duration"]), 3),
        "decodedReviewFrames": len(frames),
        "visualReview": "contact sheet decoded from the final MP4; inspect all eight storyboard frames",
    }
    (OUT / "video-inspection.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
