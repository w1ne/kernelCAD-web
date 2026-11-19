#!/usr/bin/env python3
"""Capture real fillet/chamfer refusals on the mounting plate and illustrate them."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
TEST = "tests/integration/examples/filletRefusalNamesEdge1588.test.ts"
# Temporary vitest file: evaluates the seeded plate scripts through the same
# entry point as the regression and writes the refusals it receives.
CAPTURE = ROOT / "tests/integration/examples/zzCaptureFilletRefusal1588.test.ts"
VERIFICATION = HERE / "verification"
REFUSALS = VERIFICATION / "refusals.json"
OUTPUT = HERE / "demo.mp4"

CAPTURE_SOURCE = r"""
import { readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { evaluateAndBuildScript } from '../../../src/composition/scriptEvaluation';
import { refuseFromDiagnostics } from '../../../src/shared/diagnostics/refuse';

const PLATE = 'examples/drafting-review/mounting-plate.kcad.ts';
const CHAMFER = ".chamfer(0.5, q.edge(q.createdBy(stock.id)).and(q.withLabel('top-perimeter')))";
const REFUSALS = ['feature.kernel-failed', 'feature.edge-feature.short-edges-skipped'];

async function run(label: string, code: string) {
  const { evaluation } = await evaluateAndBuildScript({ code });
  const errors = evaluation.diagnostics.filter(d => d.severity === 'error');
  const refusal = errors.find(d => REFUSALS.includes(d.code));
  return {
    label,
    exitCode: evaluation.exitCode,
    errorCodes: errors.map(d => d.code),
    refusal: refusal && { code: refusal.code, featureId: refusal.featureId, message: refusal.message, hint: refusal.hint, details: refusal.details },
    refuse: refuseFromDiagnostics(evaluation.diagnostics),
  };
}

it('captures refusals', async () => {
  const source = readFileSync(PLATE, 'utf8');
  const all = await run('chamfer 20 mm on the four top-perimeter edges', source.replace('.chamfer(0.5,', '.chamfer(20,'));
  const ids = String(all.refusal?.details?.failingEdgeIds).split(',');
  const out = [await run('clean plate', source), all];
  for (const [id, op] of [[ids[0], 'chamfer'], [ids[2], 'fillet']] as const) {
    const ref = `@kc[fillet_1/edge/${id}]`;
    const refused = await run(`${op} 20 mm on ${ref}`, source.replace(CHAMFER, `.${op}(20, '${ref}')`));
    const max = Number(refused.refusal?.details?.maxFeasibleValue);
    out.push(refused, await run(`retry ${op} ${max} mm on ${ref}`, source.replace(CHAMFER, `.${op}(${max}, '${ref}')`)));
  }
  out.push(await run('corner fillet 40 mm on the four vertical edges', source.replace('.fillet(6,', '.fillet(40,')));
  writeFileSync(process.env.KC_REFUSALS_OUT!, JSON.stringify(out, null, 2) + '\n');
}, 120_000);
"""

BG = "#101820"
PANEL = "#192631"
INK = "#edf3f6"
MUTED = "#9fb0ba"
GREEN = "#67c99a"
AMBER = "#f2ad57"
RED = "#f26d6d"


def font(size: int, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSansMono" if mono else "DejaVuSans"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}{'-Bold' if bold else ''}.ttf", size)


def slide(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGB", (1280, 720), BG)
    draw = ImageDraw.Draw(image)
    draw.text((72, 48), "KERNELCAD  /  FILLET AND CHAMFER REFUSALS", font=font(18, True), fill=GREEN)
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
    import os
    result = subprocess.run(cmd, cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            check=True, timeout=300, env={**os.environ, **(env or {})})
    return result.stdout


def render() -> None:
    VERIFICATION.mkdir(parents=True, exist_ok=True)
    CAPTURE.write_text(CAPTURE_SOURCE.lstrip())
    try:
        run(["npx", "vitest", "run", str(CAPTURE.relative_to(ROOT)), "--reporter=dot"], {"KC_REFUSALS_OUT": str(REFUSALS)})
    finally:
        CAPTURE.unlink()
    tests = run(["npx", "vitest", "run", TEST, "src/modeling/backends/occt/lowerers/limitingEdges.test.ts", "--reporter=dot"])
    (VERIFICATION / "test-output.txt").write_text(tests.rstrip() + "\n")

    clean, all_edges, chamfer, chamfer_retry, fillet, fillet_retry, corners = json.loads(REFUSALS.read_text())
    assert clean["exitCode"] == 0 and clean["errorCodes"] == []
    c, f = chamfer["refusal"]["details"], fillet["refusal"]["details"]
    assert c["failingEdgeStatus"] == f["failingEdgeStatus"] == "named"
    assert c["failingEdgeRef"] != f["failingEdgeRef"]
    assert chamfer_retry["exitCode"] == 0 and chamfer_retry["errorCodes"] == []
    assert fillet_retry["exitCode"] == 0 and fillet_retry["errorCodes"] == []
    assert corners["refusal"]["details"]["failingEdgeStatus"] == "interaction"
    passed = next(line for line in tests.splitlines() if "Tests" in line and "passed" in line).split("Tests")[1].strip()

    frames = HERE / "frames"
    frames.mkdir(exist_ok=True)
    first, draw = slide("An oversized chamfer on one named plate edge",
                        "Drafting-review mounting plate, 100 x 70 x 12 mm. Local OCCT evaluation.")
    rows(draw, [
        ("Seeded edit", f".chamfer(20, '{c['failingEdgeRef']}')", AMBER),
        ("Refusal", f"{chamfer['refusal']['code']} on {chamfer['refusal']['featureId']}", RED),
        ("Failing edge, from refuse.location.edge", chamfer["refuse"]["location"]["edge"], GREEN),
        ("Locator", c["failingEdgeLocator"], INK),
        ("Largest distance the same-edge kernel probe built", f"{c['maxFeasibleValue']} mm (requested {c['requestedValue']} mm)", GREEN),
        ("Retry at that distance on that selector", f"exitCode {chamfer_retry['exitCode']}, errors {len(chamfer_retry['errorCodes'])}", GREEN),
    ])
    first.save(frames / "slide-01.png")

    second, draw = slide("A second edge is named distinctly",
                         "Same plate. An oversized fillet on a different top edge.")
    rows(draw, [
        ("Seeded edit", f".fillet(20, '{f['failingEdgeRef']}')", AMBER),
        ("Refusal", f"{fillet['refusal']['code']} on {fillet['refusal']['featureId']}", RED),
        ("Failing edge, from refuse.location.edge", fillet["refuse"]["location"]["edge"], GREEN),
        ("Locator", f["failingEdgeLocator"], INK),
        ("Largest radius the same-edge kernel probe built", f"{f['maxFeasibleValue']} mm (requested {f['requestedValue']} mm)", GREEN),
        ("Retry at that radius on that selector", f"exitCode {fillet_retry['exitCode']}, errors {len(fillet_retry['errorCodes'])}", GREEN),
    ])
    second.save(frames / "slide-02.png")

    a, k = all_edges["refusal"]["details"], corners["refusal"]["details"]
    third, draw = slide("Sets, interaction and the clean baseline",
                        "Each selected edge is tried alone at the smallest size the probe saw fail.")
    rows(draw, [
        ("Chamfer 20 mm on the four top-perimeter edges", f"{a['failingEdgeCount']} of {a['edgeCount']} edges fail alone at {a['failingEdgeProbeValue']:.4g} mm; set limit {a['maxFeasibleValue']} mm", INK),
        ("Corner fillet 40 mm on the four vertical edges", f"failingEdgeStatus '{k['failingEdgeStatus']}': each builds alone at {k['failingEdgeProbeValue']:.4g} mm", AMBER),
        ("  so no edge is named; set limit", f"{k['maxFeasibleValue']} mm", AMBER),
        ("Clean plate", f"exitCode {clean['exitCode']}, errors {len(clean['errorCodes'])}, no failingEdge facts", GREEN),
        ("Focused tests", passed, GREEN),
        ("Scope", "local validation; no deployed runtime is claimed", MUTED),
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
    render()
