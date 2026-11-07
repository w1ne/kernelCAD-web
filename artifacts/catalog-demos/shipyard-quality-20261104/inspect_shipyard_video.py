#!/usr/bin/env python3
"""Check MP4 metadata and extract a contact sheet for visual inspection."""
import json
import subprocess
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
video = BUNDLE / "shipyard-quality.mp4"
probe = subprocess.run([
    "ffprobe", "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=codec_name,width,height,pix_fmt,avg_frame_rate,nb_frames",
    "-show_entries", "format=duration", "-of", "json", str(video),
], capture_output=True, text=True, check=True)
metadata = json.loads(probe.stdout)
stream = metadata["streams"][0]
contact = BUNDLE / "video-contact-sheet.png"
subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(video),
    "-vf", "fps=1/3,scale=320:180,tile=3x4", "-frames:v", "1", str(contact),
], check=True)
result = {
    "video": video.name,
    "durationSeconds": float(metadata["format"]["duration"]),
    "codec": stream["codec_name"],
    "width": stream["width"],
    "height": stream["height"],
    "pixelFormat": stream["pix_fmt"],
    "frameRate": stream["avg_frame_rate"],
    "frameCount": stream.get("nb_frames"),
    "contactSheet": contact.name,
    "contactSheetGrid": "3 columns x 4 rows, one frame every 3 seconds",
}
(BUNDLE / "video-inspection.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
if stream["codec_name"] != "h264" or stream["width"] != 1280 or stream["height"] != 720 or float(metadata["format"]["duration"]) < 30:
    raise SystemExit("MP4 does not match the expected readable demo settings")
