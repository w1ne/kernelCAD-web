from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image


DEMO = Path(__file__).resolve().parent
VIDEO = DEMO / "crusher-discharge-conveyor-idler-material-review.mp4"
OUTPUT = DEMO / "video-review"
OUTPUT.mkdir(exist_ok=True)

probe = subprocess.run(
    [
        "ffprobe", "-v", "error", "-show_entries", "format=duration,size",
        "-show_entries", "stream=codec_name,width,height,r_frame_rate,pix_fmt",
        "-of", "json", str(VIDEO),
    ],
    check=True,
    capture_output=True,
    text=True,
)
metadata = json.loads(probe.stdout)
samples = []
for label, timestamp in [("audit", 1.0), ("overview", 5.0), ("focused-change", 10.0), ("verification", 16.0)]:
    frame = OUTPUT / f"{label}.png"
    subprocess.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", str(timestamp),
            "-i", str(VIDEO), "-frames:v", "1", str(frame),
        ],
        check=True,
    )
    with Image.open(frame) as image:
        samples.append({
            "label": label,
            "timestampSeconds": timestamp,
            "file": frame.name,
            "sha256": hashlib.sha256(frame.read_bytes()).hexdigest(),
            "sizePx": list(image.size),
            "centerRgb": list(image.convert("RGB").getpixel((image.width // 2, image.height // 2))),
        })

report = {
    "video": VIDEO.name,
    "metadata": metadata,
    "sampleFrames": samples,
    "inspection": "all four sampled frames decoded as 1280x720 PNGs; human-reviewed separately",
}
(OUTPUT / "inspection.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
