# Demo: import a whole-machine Parasolid transmit with `lib.fromCAD`

**Local validation, not deployed behaviour.** The clip was rendered from the
checked-in source in this repository. It has not been checked on the deployed site.

## Known issue: the clip's excerpt is contaminated

The excerpt generator (`cargo run --release --example excerpt`) over-includes:
its closure follows the type-exemplar nodes into whole-file sibling chains, so
the "one-body" excerpt really contains three bodies / 109 faces. The clip and
the shape notes below therefore show a **fused artifact of several real parts,
not a real component** — treat the excerpt as display tooling only. The
whole-robot import is not affected: `result.json` comes from the real transmit
and is the evidence to trust. Fixing this needs a proper closure boundary in
the example tool plus a 1.2 GB regeneration (~5.4 GB peak RSS; two attempts on
this machine were killed by the OOM killer), so it is a separate task.

## What it shows

`RP1-assembly.x_t` is the whole-robot Parasolid transmit exported from the
Roboparty RP1.3.4 SolidWorks assembly (schema `SCH_3201255_32001_13006`,
metres, 1.2 GB). `lib.fromCAD` reads it inside the kernelCAD process — no
converter, no SolidWorks — streams it, builds one solid per body, and places
every body by the transmit's own instance transforms.

The full import is verified by `result.json` (evaluate output: `ok: true`, no
diagnostics, span 555.9 × 444.0 × 1314.2 mm — the standing robot, feet through
the motion head). The headless browser renderer cannot hold the whole-machine
scene (hundreds of solids; the page crashes during mesh load), so the clip is a
turntable of the contaminated excerpt described above: one body read and
lowered through the same code path supplies most of the frame, with pieces of
its neighbours fused into the silhouette.

## Caption (what to say)

- Imported: bodies from the native Parasolid transmit of the RP1 robot, read
  and lowered in-process.
- The clip's object is an excerpt artifact (see the known issue): a full 360°
  turntable walks the camera down its rim at 90° and 270° where it flashes to
  a sliver, so the clip sweeps the readable 135°–225° arc at 50° elevation on
  a dark background. Do not present the shape as a real part.
- Not shown in the clip: the full machine. Its evidence is the evaluate result
  (`result.json`), including the bounding-box span across the whole robot.
- Skipped by design: spline-heavy bodies are counted as skipped
  (`skippedBodies`, `firstSkip` in the reader result); NURBS surfaces are
  reported, never replaced with a mesh.

## Files

| File | Role |
| --- | --- |
| `import-parasolid.kcad.ts` | The source: `lib.fromCAD` on the 1.2 GB transmit, plus the span gate. |
| `render-excerpt.kcad.ts` | The source the clip was rendered from (one-body excerpt, same code path). |
| `result.json` | `kernelcad evaluate --json` output for the full transmit: `ok: true`, 1 feature, no diagnostics. |
| `demo.mp4` | 4-second loop: 135° → 180° → 225° sweep at 50° elevation, dark background, 30 fps, 1024×768. |

The transmit and its excerpts live on the lab drive (`/Volumes/LabWired/rp1-cad/`)
and are not in git. Excerpts are written by `cargo run --release --example
excerpt` in `crates/parasolid-import`.

## How it was made

```sh
# Evaluate the full transmit (imports, sews solids, applies instances; ~17 min).
NODE_OPTIONS='--max-old-space-size=14336' \
  npx tsx src/agent/cli/index.ts evaluate \
  docs/demos/cad-import-parasolid/import-parasolid.kcad.ts --json > result.json

# Render the excerpt sweep (one import, reused for all poses).
npx tsx src/agent/cli/index.ts render \
  docs/demos/cad-import-parasolid/render-excerpt.kcad.ts \
  --preset publish --background dark --separate --no-watermark \
  --pose 135,50 --pose 180,50 --pose 225,50 \
  --out docs/demos/cad-import-parasolid/frame.png

# Encode the loop (explicit ffmpeg concat list, 0.5 s each pose, twice —
# the glob order sorts alphabetically and would scramble the sweep).
ffmpeg -f concat -safe 0 -i list.txt -vf "fps=30,scale=1024:-2" \
  -pix_fmt yuv420p -movflags +faststart demo.mp4
```

## Verification

- `src/modeling/parts/fromCad.test.ts`: 18 tests pass, including excerpts of
  this exact transmit: a one-body excerpt becomes a solid with its cylinder
  surface, and two instances of one body differ by exactly the transmit
  translation (0, 54.300, 0) mm.
- Two fresh consumer launches of the one-body excerpt exit 0 with identical
  volume.
- The evaluate above returns no diagnostics; the clip frames were inspected.
- The wider `src/modeling/parts/` run has the same 7 failures in `fetchPart`,
  `findPart` and `standardParts` as on the previous commit (network-bound);
  they are not from this work.

## Limits

- 522 of 1095 bodies become solids on this file; the rest are spline-heavy,
  oversized, or invalid in the source. The bounding box spans the full robot,
  but a full-fidelity per-part solid still needs NURBS lowering.
- Exact wires cover line, circle and ellipse edges; other edges fall back to
  chord wires.
- The headless browser renderer crashes on the full-machine scene; only
  excerpt-scale scenes render today.
- The import is ~7 minutes for this file and is not cached between runs.
