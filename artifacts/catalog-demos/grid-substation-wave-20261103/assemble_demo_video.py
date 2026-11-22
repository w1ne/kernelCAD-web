#!/usr/bin/env python3
"""Encode the three inspected local catalog walkthrough states as MP4."""

from pathlib import Path
import subprocess

BUNDLE = Path(__file__).resolve().parent
CAPTURES = BUNDLE / "preview-review/demo-captures"
TARGET = BUNDLE / "grid-substation-demo.mp4"
frames = [
    CAPTURES / "01-catalog-search.png",
    CAPTURES / "02-asset-detail.png",
    CAPTURES / "03-scale-variant.png",
]
captions = [
    "Local catalog hub search - 80 scene assets",
    "Generated asset detail - scale and color knobs",
    "Scale 1.00 to 1.20 - same source, rendered meshes",
]
durations = [4.5, 5.5, 5.0]
if any(not image.is_file() for image in frames):
    raise SystemExit("capture all three browser states before video encoding")
font = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
inputs = []
filters = []
for index, (frame, duration, caption) in enumerate(zip(frames, durations, captions)):
    inputs += ["-loop", "1", "-framerate", "30", "-t", str(duration), "-i", str(frame)]
    escaped = caption.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
    filters.append(
        f"[{index}:v]fps=30,scale=1280:720,setsar=1,"
        f"drawbox=x=0:y=662:w=iw:h=58:color=0x193330@0.96:t=fill,"
        f"drawtext=fontfile={font}:text='{escaped}':fontcolor=white:fontsize=22:x=24:y=681,"
        f"drawtext=fontfile={font}:text='LOCAL SOFTWARE PREVIEW - NOT DEPLOYED - NO ELECTRICAL ACCEPTANCE':fontcolor=0xD1DAD6:fontsize=12:x=24:y=706[v{index}]"
    )
filters.append("[v0][v1][v2]concat=n=3:v=1:a=0,format=yuv420p[outv]")
command = [
    "ffmpeg", "-y", *inputs, "-filter_complex", ";".join(filters), "-map", "[outv]",
    "-r", "30", "-c:v", "libx264", "-crf", "22", "-preset", "medium",
    "-movflags", "+faststart", str(TARGET),
]
result = subprocess.run(command, cwd=BUNDLE, capture_output=True, text=True, check=False)
(BUNDLE / "demo-video-encode-output.txt").write_text(result.stdout + result.stderr, encoding="utf-8")
if result.returncode:
    raise SystemExit(f"ffmpeg encoding failed; see {BUNDLE / 'demo-video-encode-output.txt'}")
print(f"wrote {TARGET} ({TARGET.stat().st_size} bytes)")
