#!/usr/bin/env python3
"""Run and record the reference-parts scorecard gate as a short terminal demo."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
REPOSITORY = BUNDLE.parents[2]
WIDTH = 1920
HEIGHT = 1080
FPS = 24
COMMAND = ["npm", "run", "test:reference-parts"]
OUTPUT_ROW = re.compile(
    r"^.*?ΔV [^ ]+\s+ΔA [^ ]+\s+Δbbox [^ ]+ mm\s+(PASS|KNOWN FAIL|FAIL)\s+([\d.]+) ms$"
)
SUMMARY = re.compile(r"^Score: (.*)$", re.MULTILINE)

BACKGROUND = "#0b1220"
PANEL = "#111c2d"
BORDER = "#273449"
FOREGROUND = "#d8e1ee"
MUTED = "#8ca1ba"
GREEN = "#55d6a0"
AMBER = "#ffc857"
RED = "#ff657a"
CYAN = "#5bc0eb"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_fonts() -> tuple[ImageFont.FreeTypeFont, ImageFont.FreeTypeFont]:
    mono = Path("/System/Library/Fonts/Supplemental/Andale Mono.ttf")
    sans_bold = Path("/System/Library/Fonts/Supplemental/Verdana Bold.ttf")
    if not mono.exists():
        mono = Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf")
    if not sans_bold.exists():
        sans_bold = mono
    return ImageFont.truetype(str(mono), 20), ImageFont.truetype(str(sans_bold), 38)


def base_frame(title: str, mono: ImageFont.FreeTypeFont, bold: ImageFont.FreeTypeFont) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 13, HEIGHT), fill=CYAN)
    draw.text((60, 45), "kernelCAD  /  REFERENCE PARTS", font=mono, fill=CYAN)
    draw.text((60, 88), title, font=bold, fill=FOREGROUND)
    draw.line((60, 150, WIDTH - 60, 150), fill=BORDER, width=2)
    draw.text((60, HEIGHT - 52), "LOCAL OCCT VALIDATION  |  NOT DEPLOYED  |  NO HARDWARE ACCEPTANCE", font=mono, fill=MUTED)
    return image, draw


def render_cover(path: Path, mono: ImageFont.FreeTypeFont, bold: ImageFont.FreeTypeFont, count: int, summary: str) -> None:
    image, draw = base_frame("Reference-parts accuracy gate", mono, bold)
    draw.text((80, 218), "Native source models checked against geometric ground truth", font=bold, fill=FOREGROUND)
    draw.text((80, 286), "Volume  ·  surface area  ·  exact axis-aligned bounds", font=mono, fill=MUTED)
    draw.rounded_rectangle((80, 385, WIDTH - 80, 590), radius=20, fill=PANEL, outline=BORDER, width=2)
    draw.text((116, 423), "$ npm run test:reference-parts", font=mono, fill=GREEN)
    draw.text((116, 477), f"{count} models   ·   ≤5 s per part   ·   ≤60 s total", font=mono, fill=FOREGROUND)
    draw.text((116, 531), summary, font=mono, fill=CYAN)
    draw.text((80, 696), "CI also verifies that the committed Markdown scorecard is current.", font=mono, fill=MUTED)
    image.save(path)


def render_results(path: Path, mono: ImageFont.FreeTypeFont, bold: ImageFont.FreeTypeFont, rows: list[tuple[str, str]], summary: str) -> None:
    image, draw = base_frame("Measured results · one row per reference part", mono, bold)
    draw.text((60, 169), "ΔV / ΔA are relative; Δbbox is max absolute axis error. Times are from this run.", font=mono, fill=MUTED)
    row_top = 213
    row_height = 27
    for index, (line, status) in enumerate(rows):
        color = GREEN if status == "PASS" else AMBER if status == "KNOWN FAIL" else RED
        y = row_top + index * row_height
        draw.text((64, y), line, font=mono, fill=color)
    bottom = row_top + len(rows) * row_height + 12
    draw.line((60, bottom, WIDTH - 60, bottom), fill=BORDER, width=2)
    draw.text((64, bottom + 18), f"PASS  {summary}", font=mono, fill=GREEN)
    image.save(path)


def render_summary(
    path: Path,
    mono: ImageFont.FreeTypeFont,
    bold: ImageFont.FreeTypeFont,
    headline: str,
    gate_summary: str,
    known_failures: list[tuple[str, str, str]],
) -> None:
    image, draw = base_frame("Scorecard current", mono, bold)
    draw.rounded_rectangle((80, 210, WIDTH - 80, 390), radius=22, fill=PANEL, outline=BORDER, width=2)
    draw.text((122, 244), headline, font=bold, fill=GREEN)
    draw.text((122, 316), gate_summary, font=mono, fill=FOREGROUND)
    if known_failures:
        draw.text((90, 450), "Declared known failures and promotion status:", font=mono, fill=AMBER)
        y = 500
        for part_id, status, reason in known_failures:
            state = "CLEARED; PROMOTE" if status == "PASS" else "KNOWN FAIL"
            wrapped = wrap(f"• {part_id} — {state}: {reason}", width=124)
            for line in wrapped:
                draw.text((120, y), line, font=mono, fill=FOREGROUND)
                y += 32
            y += 12
    else:
        draw.text((90, 480), "All declared parts meet their expected metric targets.", font=mono, fill=GREEN)
    draw.rounded_rectangle((80, 700, WIDTH - 80, 826), radius=18, fill=PANEL, outline=BORDER, width=2)
    draw.text((118, 733), "Report: docs/reference-parts-scorecard.md", font=mono, fill=CYAN)
    draw.text((118, 780), "Regenerate: npm run reference-parts:regenerate", font=mono, fill=MUTED)
    image.save(path)


def main() -> None:
    result = subprocess.run(COMMAND, cwd=REPOSITORY, capture_output=True, text=True, check=False)
    output = result.stdout + result.stderr
    output_path = BUNDLE / "run-output.txt"
    output_path.write_text(output, encoding="utf-8")
    if result.returncode != 0:
        raise SystemExit(f"Scorecard gate failed ({result.returncode}); see {output_path}")

    rows: list[tuple[str, str]] = []
    times_ms: list[float] = []
    for line in output.splitlines():
        match = OUTPUT_ROW.match(line.strip())
        if match:
            status, elapsed = match.groups()
            rows.append((line.strip(), status))
            times_ms.append(float(elapsed))
    score = SUMMARY.search(output)
    if not rows or score is None:
        raise SystemExit("Could not find the per-part rows and score summary in the gate output")
    score_summary = score.group(1)
    manifest_path = REPOSITORY / "assets/reference-parts/scorecard.json"
    corpus = json.loads(manifest_path.read_text(encoding="utf-8"))
    expected_count = len(corpus["parts"])
    if len(rows) != expected_count or max(times_ms) > 5000:
        raise SystemExit(f"Unexpected demo evidence: {len(rows)} parts, max {max(times_ms):.1f} ms")
    result_statuses = {line.split()[0]: status for line, status in rows}
    passing_count = sum(status == "PASS" for status in result_statuses.values())
    expected_pass_ids = {part["id"] for part in corpus["parts"] if part["status"] == "pass"}
    expected_pass_count = len(expected_pass_ids)
    expected_pass_matches = sum(result_statuses.get(part_id) == "PASS" for part_id in expected_pass_ids)
    headline = f"{passing_count}/{len(rows)} reference parts match"
    gate_summary = (
        f"GATE {'PASS' if result.returncode == 0 else 'FAIL'}  ·  "
        f"{expected_pass_matches}/{expected_pass_count} expected-pass parts match"
    )
    known_failures = [
        (part["id"], result_statuses.get(part["id"], "FAIL"), part["knownFailureReason"])
        for part in corpus["parts"]
        if part["status"] == "known-failure"
    ]

    mono, bold = load_fonts()
    with tempfile.TemporaryDirectory(prefix="reference-parts-demo-") as temporary:
        temporary_path = Path(temporary)
        cover = temporary_path / "cover.png"
        results = temporary_path / "results.png"
        summary = temporary_path / "summary.png"
        render_cover(cover, mono, bold, len(rows), f"{headline}  ·  gate {'PASS' if result.returncode == 0 else 'FAIL'}")
        render_results(results, mono, bold, rows, headline)
        render_summary(summary, mono, bold, headline, gate_summary, known_failures)

        video_path = BUNDLE / "demo.mp4"
        command = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"]
        for frame, duration in ((cover, "2"), (results, "6"), (summary, "3")):
            command.extend(["-loop", "1", "-framerate", str(FPS), "-t", duration, "-i", str(frame)])
        command.extend([
            "-filter_complex", "[0:v][1:v][2:v]concat=n=3:v=1:a=0,fps=24,format=yuv420p[v]",
            "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "26",
            "-movflags", "+faststart", str(video_path),
        ])
        subprocess.run(command, check=True, cwd=REPOSITORY)

    probe = subprocess.run([
        "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
        "stream=codec_name,width,height,avg_frame_rate", "-show_entries", "format=duration,size",
        "-of", "json", str(BUNDLE / "demo.mp4"),
    ], check=True, capture_output=True, text=True)
    probe_data = json.loads(probe.stdout)
    decode = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(BUNDLE / "demo.mp4"), "-f", "null", "-"],
        cwd=REPOSITORY,
        capture_output=True,
        text=True,
        check=False,
    )
    if decode.returncode != 0:
        raise SystemExit(f"Full video decode failed: {decode.stderr}")
    receipt = {
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "scope": "local OCCT validation; no deployment or hardware acceptance",
        "command": COMMAND,
        "exitCode": result.returncode,
        "partCount": len(rows),
        "expectedPartCount": expected_count,
        "knownFailureIds": [part_id for part_id, _status, _reason in known_failures],
        "knownFailureStatuses": {part_id: status for part_id, status, _reason in known_failures},
        "maxPartMs": max(times_ms),
        "scoreSummary": score_summary,
        "renderSettings": {
            "width": WIDTH,
            "height": HEIGHT,
            "fps": FPS,
            "codec": "H.264 libx264",
            "crf": 26,
            "audio": "none",
            "font": "/System/Library/Fonts/Supplemental/Andale Mono.ttf (or DejaVu Sans Mono fallback)",
            "sceneDurationsSeconds": [2, 6, 3],
        },
        "transcriptSha256": sha256(output_path),
        "manifestSha256": sha256(manifest_path),
        "demoSourceSha256": sha256(Path(__file__).resolve()),
        "videoSha256": sha256(BUNDLE / "demo.mp4"),
        "fullDecodeExitCode": decode.returncode,
        "ffprobe": probe_data,
    }
    (BUNDLE / "verification.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(f"Created {BUNDLE / 'demo.mp4'} ({probe_data['format']['duration']} s)")
    print(f"Captured {len(rows)} OCCT parts; max part time {max(times_ms):.1f} ms; gate exit {result.returncode}.")


if __name__ == "__main__":
    main()
