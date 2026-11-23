#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Run the edge-pick regression and render its actual local test result."""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parents[2]
WIDTH, HEIGHT, FPS = 1280, 720, 24
TESTS = [
    "tests/integration/examples/mountingPlateEdgePicks.test.ts",
    "src/kernel/naming/selectionDrift.test.ts",
    "src/kernel/naming/queryEdgeLineage.test.ts",
    "src/kernel/backends/occt/edgeIdentity.test.ts",
]
COMMAND = ["npx", "vitest", "run", *TESTS, "--reporter=verbose"]

BG = (12, 18, 29)
PANEL = (22, 33, 49)
EDGE = (43, 59, 78)
FG = (224, 232, 242)
MUTED = (143, 161, 183)
CYAN = (93, 198, 235)
GREEN = (100, 220, 159)
AMBER = (255, 197, 87)
RED = (255, 101, 122)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fonts() -> tuple[ImageFont.FreeTypeFont, ImageFont.FreeTypeFont]:
    mono = Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf")
    sans = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    bold = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
    if not mono.exists():
        mono = Path("/System/Library/Fonts/Supplemental/Andale Mono.ttf")
    if not sans.exists():
        sans = mono
    if not bold.exists():
        bold = sans
    return ImageFont.truetype(str(mono), 21), ImageFont.truetype(str(bold), 35)


def base_frame(title: str, mono: ImageFont.FreeTypeFont, bold: ImageFont.FreeTypeFont):
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 12, HEIGHT), fill=CYAN)
    draw.text((56, 34), "kernelCAD  /  EDGE PICK REGRESSION", font=mono, fill=CYAN)
    draw.text((56, 75), title, font=bold, fill=FG)
    draw.line((56, 132, WIDTH - 56, 132), fill=EDGE, width=2)
    draw.text(
        (56, HEIGHT - 45),
        "LOCAL OCCT VALIDATION  |  NOT DEPLOYED  |  NO HARDWARE ACCEPTANCE",
        font=mono,
        fill=MUTED,
    )
    return image, draw


def draw_lines(draw: ImageDraw.ImageDraw, lines: list[tuple[str, tuple[int, int, int]]], y: int, mono):
    for line, color in lines:
        for wrapped in wrap(line, width=75, subsequent_indent="  "):
            draw.text((70, y), wrapped, font=mono, fill=color)
            y += 35
        y += 10


def make_scenes(test_count: int, test_files: int, summary: str):
    mono, bold = fonts()
    scenes = []

    image, draw = base_frame("Authored lineage selectors", mono, bold)
    draw.rounded_rectangle((56, 171, WIDTH - 56, 515), radius=18, fill=PANEL, outline=EDGE, width=2)
    draw_lines(draw, [
        ("Fillet: q.edge(q.createdBy(stock.id)).and(q.withLabel('corner'))", GREEN),
        ("Chamfer: q.edge(q.createdBy(stock.id)).and(q.withLabel('top-perimeter'))", GREEN),
        ("These selectors follow existing edge history through an upstream edit.", FG),
        ("The selector follows the authored stock feature and edge label.", MUTED),
    ], 205, mono)
    scenes.append((image, 3))

    image, draw = base_frame("Resize keeps the intended picks", mono, bold)
    draw.rounded_rectangle((56, 171, WIDTH - 56, 515), radius=18, fill=PANEL, outline=EDGE, width=2)
    draw_lines(draw, [
        ("Mounting plate: 100 × 70 × 12 mm  →  140 × 100 × 18 mm", CYAN),
        ("PASS  four vertical R6 corner fillets remain on the corners", GREEN),
        ("PASS  four top-perimeter chamfers remain on the top edges", GREEN),
        ("PASS  bottom perimeter stays sharp; no error diagnostics", GREEN),
    ], 205, mono)
    scenes.append((image, 4))

    image, draw = base_frame("Replaced lineage fails with a typed miss", mono, bold)
    draw.rounded_rectangle((56, 171, WIDTH - 56, 515), radius=18, fill=PANEL, outline=EDGE, width=2)
    draw_lines(draw, [
        ("Move the upstream notch from (2, 2) to (98, 68).", CYAN),
        ("PASS  feature.selection.no-match  ·  severity: error", RED),
        ("Consumer: fillet_1  ·  the diagnostic names the lost edge lineage", AMBER),
        ("The error diagnostic directs the author to re-pick or refine the selector.", FG),
    ], 205, mono)
    scenes.append((image, 4))

    image, draw = base_frame("Focused regression run passed", mono, bold)
    draw.rounded_rectangle((56, 171, WIDTH - 56, 515), radius=18, fill=PANEL, outline=EDGE, width=2)
    draw.text((82, 213), f"{test_files} test files  ·  {test_count} tests passed", font=bold, fill=GREEN)
    draw_lines(draw, [
        (summary, FG),
        ("Command: npx vitest run … --reporter=verbose", CYAN),
        ("The video is generated only when this command exits successfully.", MUTED),
    ], 290, mono)
    scenes.append((image, 3))
    return scenes


def main() -> None:
    started = datetime.now(timezone.utc)
    result = subprocess.run(
        COMMAND,
        cwd=ROOT,
        env={**os.environ, "NO_COLOR": "1"},
        capture_output=True,
        text=True,
        check=False,
    )
    output = result.stdout + result.stderr
    output_path = BUNDLE / "run-output.txt"
    output_path.write_text(output.rstrip() + "\n", encoding="utf-8")
    if result.returncode != 0:
        raise SystemExit(f"Focused regression failed ({result.returncode}); see {output_path}")

    file_match = re.search(r"Test Files\s+(\d+) passed", output)
    test_match = re.search(r"Tests\s+(\d+) passed", output)
    duration = re.search(r"Duration\s+([^\n]+)", output)
    if not file_match or not test_match or not duration:
        raise SystemExit(f"Could not parse Vitest summary; see {output_path}")
    test_files = int(file_match.group(1))
    test_count = int(test_match.group(1))
    summary = f"{test_files} files / {test_count} tests  ·  {duration.group(1).strip()}"

    scenes = make_scenes(test_count, test_files, summary)
    with tempfile.TemporaryDirectory(prefix="edge-pick-demo-") as tmp:
        tmp_path = Path(tmp)
        inputs = []
        for index, (image, seconds) in enumerate(scenes):
            image_path = tmp_path / f"scene-{index:02d}.png"
            image.save(image_path)
            inputs.extend(["-loop", "1", "-framerate", str(FPS), "-t", str(seconds), "-i", str(image_path)])
        filter_parts = "".join(f"[{index}:v]" for index in range(len(scenes)))
        filter_graph = f"{filter_parts}concat=n={len(scenes)}:v=1:a=0,fps={FPS},format=yuv420p[v]"
        video = BUNDLE / "demo.mp4"
        subprocess.run([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *inputs,
            "-filter_complex", filter_graph, "-map", "[v]", "-an", "-c:v", "libx264",
            "-preset", "medium", "-crf", "25", "-movflags", "+faststart", str(video),
        ], cwd=ROOT, check=True)

    probe = subprocess.run([
        "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
        "stream=codec_name,width,height,avg_frame_rate", "-show_entries", "format=duration,size",
        "-of", "json", str(BUNDLE / "demo.mp4"),
    ], check=True, capture_output=True, text=True)
    probe_data = json.loads(probe.stdout)
    decode = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(BUNDLE / "demo.mp4"), "-f", "null", "-"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if decode.returncode != 0:
        raise SystemExit(f"Full video decode failed: {decode.stderr}")

    receipt = {
        "generatedAtUtc": started.isoformat(),
        "scope": "local CAD validation through Vitest and OCCT; no deployment or hardware acceptance",
        "command": COMMAND,
        "exitCode": result.returncode,
        "testFilesPassed": test_files,
        "testsPassed": test_count,
        "vitestDuration": duration.group(1).strip(),
        "testOutputSha256": sha256(output_path),
        "sourceSha256": sha256(Path(__file__).resolve()),
        "integrationTestSha256": sha256(ROOT / TESTS[0]),
        "videoSettings": {
            "width": WIDTH,
            "height": HEIGHT,
            "fps": FPS,
            "codec": "H.264 libx264",
            "crf": 25,
            "audio": "none",
            "sceneSeconds": [seconds for _image, seconds in scenes],
        },
        "videoSha256": sha256(BUNDLE / "demo.mp4"),
        "fullDecodeExitCode": decode.returncode,
        "ffprobe": probe_data,
    }
    (BUNDLE / "verification.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(f"Created {BUNDLE / 'demo.mp4'} ({probe_data['format']['duration']} s)")
    print(f"Recorded {test_files} test files / {test_count} tests; full decode passed.")


if __name__ == "__main__":
    main()
