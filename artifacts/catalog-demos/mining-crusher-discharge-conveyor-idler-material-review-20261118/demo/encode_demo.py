from __future__ import annotations

import json
import subprocess
from pathlib import Path


DEMO = Path(__file__).resolve().parent
BUNDLE = DEMO.parent
settings = json.loads((DEMO / "demo-settings.json").read_text())
durations = settings["frameDurationSeconds"]
frames = [DEMO / "frames" / f"{index:02d}-review.png" for index in range(1, len(durations) + 1)]
video = DEMO / "crusher-discharge-conveyor-idler-material-review.mp4"
inputs: list[str] = []
for frame, duration in zip(frames, durations, strict=True):
    inputs.extend(["-loop", "1", "-t", str(duration), "-i", str(frame)])
labels = "".join(f"[{index}:v]" for index in range(len(frames)))
filter_graph = f"{labels}concat=n={len(frames)}:v=1:a=0,format={settings['pixelFormat']}[v]"
command = [
    "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *inputs,
    "-filter_complex", filter_graph, "-map", "[v]",
    "-fps_mode", "cfr", "-r", str(settings["fps"]),
    "-c:v", settings["codec"], "-crf", str(settings["crf"]),
    "-preset", settings["preset"], "-movflags", "+faststart", str(video),
]
(DEMO / "ffmpeg-invocation.txt").write_text(" ".join(command) + "\n")
subprocess.run(command, check=True)

probe = subprocess.run(
    [
        "ffprobe", "-v", "error", "-show_entries", "format=duration,size",
        "-show_entries", "stream=codec_name,width,height,r_frame_rate,pix_fmt",
        "-of", "json", str(video),
    ],
    check=True,
    capture_output=True,
    text=True,
)
metadata = json.loads(probe.stdout)
duration = float(metadata["format"]["duration"])
expected = float(sum(durations))
if abs(duration - expected) > 2 / settings["fps"]:
    raise RuntimeError(f"encoded MP4 duration {duration:.3f}s does not match {expected:.3f}s slide timeline")
(BUNDLE / "verification" / "video-metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
print(json.dumps({"video": str(video), "durationSeconds": duration, "sizeBytes": metadata["format"]["size"]}, indent=2))
