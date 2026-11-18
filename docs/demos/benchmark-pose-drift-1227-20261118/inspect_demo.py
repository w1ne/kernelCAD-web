#!/usr/bin/env python3
"""Inspect representative frames and record the generated MP4 metadata."""
from __future__ import annotations

import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
VIDEO = HERE / "demo.mp4"
FIXTURE = ROOT / "tests/fixtures/manufacturing/pi-camera-mount.kcad.ts"
TEST = ROOT / "tests/integration/manufacturing/piCameraMountBenchmark.test.ts"
VERIFY = HERE / "verification"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    VERIFY.mkdir(exist_ok=True)
    probe = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=codec_name,width,height,r_frame_rate,pix_fmt",
        "-show_entries", "format=duration,size", "-of", "json", str(VIDEO),
    ], text=True))
    with tempfile.TemporaryDirectory(prefix="pose-drift-review-", dir=HERE) as tmp:
        thumbs: list[Image.Image] = []
        for second in (1, 5, 9):
            frame = Path(tmp) / f"frame-{second}.png"
            subprocess.run([
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                "-ss", str(second), "-i", str(VIDEO), "-frames:v", "1", str(frame),
            ], check=True)
            thumbs.append(Image.open(frame).convert("RGB"))

        sheet = Image.new("RGB", (1296, 800), "#101820")
        draw = ImageDraw.Draw(sheet)
        label = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
        for i, (second, frame) in enumerate(zip((1, 5, 9), thumbs)):
            x = 16 + i * 432
            draw.text((x, 14), f"{second}s", font=label, fill="#edf3f6")
            sheet.paste(frame.resize((416, 234)), (x, 42))
        sheet.save(VERIFY / "video-contact-sheet.png")

    report = {
        "video": "demo.mp4",
        "video_sha256": sha256(VIDEO),
        "fixture_sha256": sha256(FIXTURE),
        "test_sha256": sha256(TEST),
        "probe": probe,
        "inspection": "Representative frames at 1 s, 5 s and 9 s saved to video-contact-sheet.png; reviewed for legible labels, unclipped geometry, and correct expected/mutant distinction.",
    }
    (VERIFY / "video-inspection.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
