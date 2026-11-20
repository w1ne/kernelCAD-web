#!/usr/bin/env python3
"""Measure evaluator peak RSS for real STL exports and illustrate before/after.

  capture_demo.py --measure before   # run on the base source, writes measurements.before.json
  capture_demo.py                    # measures the current source, runs the tests, renders demo.mp4
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
TESTS = [
    "tests/integration/export/stlExportPeakMemory1585.test.ts",
    "tests/unit/kernel/backends/occt/meshHeal.test.ts",
    "tests/unit/kernel/backends/occt/assertWatertight.test.ts",
]
# Temporary vitest file: one export per worker process, so the peak RSS it
# reads is that export's own.
CAPTURE = ROOT / "tests/integration/export/zzCaptureStlPeakMemory1585.test.ts"
VERIFICATION = HERE / "verification"
OUTPUT = HERE / "demo.mp4"

# A plate carrying 36 spheres: one solid whose default export mesh has more
# than 600 000 triangles. It stands in for a dense production part.
SPHERE_PLATE = """
let body = box(260, 260, 4).translate(0, 0, -2);
for (let i = 0; i < 6; i++) {
  for (let j = 0; j < 6; j++) {
    body = body.union(sphere(36).translate(-105 + i * 42, -105 + j * 42, 12));
  }
}
return body;
"""

PARTS = [
    ("Supported arm assembly", "examples/robot-arm/compact-supported-arm.kcad.ts"),
    ("Planetary gear stage", "examples/gallery/gearfinity-planetary-stage.kcad.ts"),
    ("Bracket with hole", "examples/bracket-with-hole.kcad.ts"),
    ("Dense plate, 36 spheres", "inline:sphere-plate"),
]

CAPTURE_SOURCE = r"""
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { beforeAll, it } from 'vitest';
import { initOcct, occtHeapBytes } from '../../../src/kernel/backends/occt/occtBackend';
import { runAndExport } from '../../../src/agent/script-runtime/export';

const mb = (bytes: number): number => Math.round(bytes / 1048576);
const peakMb = (): number => Math.round(process.resourceUsage().maxRSS / 1024);

beforeAll(async () => { await initOcct(); }, 120_000);

it('captures one STL export', async () => {
  const inline = process.env.KC_CODE;
  const file = inline === undefined ? resolve(process.env.KC_FILE!) : 'sphere-plate.kcad.ts';
  const code = inline ?? readFileSync(file, 'utf8');
  const startPeakMb = peakMb();
  const t0 = performance.now();
  const result = await runAndExport({
    code, fileName: file, format: 'stl',
    ...(inline === undefined ? { scriptDir: dirname(file) } : {}),
  });
  const bytes = result.bytes!;
  const triangles = (bytes.byteLength - 84) / 50;
  writeFileSync(process.env.KC_OUT!, JSON.stringify({
    startPeakRssMb: startPeakMb,
    peakRssMb: peakMb(),
    wasmHeapMb: mb(occtHeapBytes()),
    seconds: Number(((performance.now() - t0) / 1000).toFixed(1)),
    stlBytes: bytes.byteLength,
    triangles,
    headerTriangles: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(80, true),
    // Bytes 0..79 are a dated free-form header; the solid is everything after.
    triangleDataSha256: createHash('sha256').update(bytes.subarray(80)).digest('hex'),
    errorCodes: result.diagnostics.filter(d => d.severity === 'error').map(d => d.code),
    warningCodes: result.diagnostics.filter(d => d.severity === 'warn').map(d => d.code),
  }) + '\n');
}, 300_000);
"""

BG = "#101820"
PANEL = "#192631"
INK = "#edf3f6"
MUTED = "#9fb0ba"
GREEN = "#67c99a"
AMBER = "#f2ad57"
RED = "#f26d6d"
CAP_MB = 1024


def font(size: int, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSansMono" if mono else "DejaVuSans"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}{'-Bold' if bold else ''}.ttf", size)


def slide(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.text((72, 48), "KERNELCAD  /  STL EXPORT PEAK MEMORY", font=font(18, True), fill=GREEN)
    draw.text((72, 94), title, font=font(35, True), fill=INK)
    draw.text((72, 154), subtitle, font=font(20), fill=MUTED)
    draw.line((72, 194, 1208, 194), fill="#314551", width=2)
    draw.rounded_rectangle((72, 226, 1208, 668), radius=20, fill=PANEL)
    return image, draw


def rows(draw: ImageDraw.ImageDraw, items: list[tuple[str, str, str]], y: int = 256, step: int = 62) -> None:
    for label, value, colour in items:
        draw.text((112, y), label, font=font(17), fill=MUTED)
        draw.text((112, y + 24), value, font=font(20, True, mono=True), fill=colour)
        y += step


def run(cmd: list[str], env: dict[str, str] | None = None) -> str:
    result = subprocess.run(cmd, cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            check=True, timeout=900, env={**os.environ, **(env or {})})
    return result.stdout


def measure(tag: str) -> list[dict]:
    VERIFICATION.mkdir(parents=True, exist_ok=True)
    out: list[dict] = []
    CAPTURE.write_text(CAPTURE_SOURCE.lstrip())
    try:
        for label, source in PARTS:
            single = VERIFICATION / "single.json"
            env = {"KC_OUT": str(single)}
            if source.startswith("inline:"):
                env["KC_CODE"] = SPHERE_PLATE
            else:
                env["KC_FILE"] = source
            run(["npx", "vitest", "run", str(CAPTURE.relative_to(ROOT)), "--reporter=dot"], env)
            out.append({"part": label, "source": source, **json.loads(single.read_text())})
            single.unlink()
    finally:
        CAPTURE.unlink()
    commit = run(["git", "rev-parse", "HEAD"]).strip()
    record = {"tag": tag, "headCommit": commit, "parts": out}
    (VERIFICATION / f"measurements.{tag}.json").write_text(json.dumps(record, indent=2) + "\n")
    return out


def bar(draw: ImageDraw.ImageDraw, x: int, y: int, mb: int, colour: str, scale: float) -> None:
    draw.rectangle((x, y, x + int(mb * scale), y + 16), fill=colour)
    draw.text((x + int(mb * scale) + 10, y - 3), f"{mb} MB", font=font(17, True, mono=True), fill=colour)


def render() -> None:
    after = measure("after")
    before = json.loads((VERIFICATION / "measurements.before.json").read_text())["parts"]
    tests = run(["npx", "vitest", "run", *TESTS, "--reporter=dot"])
    (VERIFICATION / "test-output.txt").write_text(tests.rstrip() + "\n")
    passed = next(line for line in tests.splitlines() if "Tests" in line and "passed" in line).split("Tests")[1].strip()

    for b, a in zip(before, after, strict=True):
        assert b["source"] == a["source"]
        assert a["errorCodes"] == [] and a["triangles"] == a["headerTriangles"]
        assert a["triangleDataSha256"] == b["triangleDataSha256"], a["part"]
        assert a["peakRssMb"] < CAP_MB, a["part"]
    dense_b, dense_a = before[-1], after[-1]
    assert dense_b["peakRssMb"] > CAP_MB > dense_a["peakRssMb"]

    frames = HERE / "frames"
    frames.mkdir(exist_ok=True)
    first, draw = slide("A dense STL export passed the 1024 MB cap",
                        "Peak RSS of the process that runs one export. Local measurement, vitest worker.")
    rows(draw, [
        ("Part", f"{dense_b['part']}: {dense_b['triangles']:,} triangles, {dense_b['stlBytes'] / 1e6:.1f} MB STL", INK),
        ("Peak RSS before the fix", f"{dense_b['peakRssMb']} MB (cap {CAP_MB} MB)", RED),
        ("OCCT wasm heap at the end of that export", f"{dense_b['wasmHeapMb']} MB", INK),
        ("Where the rest went", "JS objects: one handle set per node and triangle,", AMBER),
        ("", "a string key per welded vertex and per mesh edge", AMBER),
        ("Peak RSS after the fix", f"{dense_a['peakRssMb']} MB", GREEN),
    ])
    first.save(frames / "slide-01.png")

    second, draw = slide("Peak RSS per export, before and after",
                         f"Process start is about {after[0]['startPeakRssMb']} MB in this harness. Cap line at {CAP_MB} MB.")
    scale = 560 / 1400
    y = 262
    for b, a in zip(before, after, strict=True):
        draw.text((112, y), f"{b['part']}  ({b['triangles']:,} triangles)", font=font(18), fill=INK)
        bar(draw, 112, y + 30, b["peakRssMb"], RED if b["peakRssMb"] > CAP_MB else AMBER, scale)
        bar(draw, 112, y + 52, a["peakRssMb"], GREEN, scale)
        y += 96
    cap_x = 112 + int(CAP_MB * scale)
    draw.line((cap_x, 250, cap_x, 650), fill=MUTED, width=1)
    draw.text((cap_x + 8, 636), f"{CAP_MB} MB cap", font=font(15), fill=MUTED)
    draw.text((860, 262), "before", font=font(17, True), fill=AMBER)
    draw.text((960, 262), "after", font=font(17, True), fill=GREEN)
    second.save(frames / "slide-02.png")

    third, draw = slide("Same solids, smaller process",
                        "The triangle data of each STL is compared by SHA-256 before and after.")
    rows(draw, [
        ("Triangle data, all four parts", "identical SHA-256 before and after", GREEN),
        ("Small part still exports", f"{after[2]['part']}: {after[2]['triangles']:,} triangles, errors {len(after[2]['errorCodes'])}", GREEN),
        ("Assembly still exports", f"{after[0]['part']}: {after[0]['triangles']:,} triangles, errors {len(after[0]['errorCodes'])}", GREEN),
        ("Evaluator memory cap and time caps", "not changed", INK),
        ("Focused tests", passed, GREEN),
        ("Scope", "local validation; the production evaluator was not measured", MUTED),
    ])
    third.save(frames / "slide-03.png")

    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-framerate", "1/5", "-i", str(frames / "slide-%02d.png"),
        "-vf", "fps=24,format=yuv420p", "-t", "15", "-an", "-movflags", "+faststart", str(OUTPUT),
    ], check=True)
    print(passed)
    print(f"video_sha256={hashlib.sha256(OUTPUT.read_bytes()).hexdigest()}")
    print(f"video_bytes={OUTPUT.stat().st_size}")


if __name__ == "__main__":
    if sys.argv[1:] == ["--measure", "before"]:
        measure("before")
    else:
        render()
