# Handoff: import the RP1 7-DoF robot into kernelCAD, and test the importers

Audience: the next agent (Grok) picking this up. Branch: `ccr-dabe4acd-piatba`.
Push to that branch only. Do not open a PR unless asked.

## Goal

Build a kernelCAD model of the full Roboparty RP1 robot, 7-DoF arm configuration,
from the original CAD geometry. Each part must sit where it sits in the robot, and
the joints must move through kernelCAD's `assembly().mate(..., 'revolute', ...)`.
Also test every importer path (STEP, BREP, FreeCAD `.FCStd`, converter) on real
RP1 data. Visual inspection is required; passing tests is not enough.

Not acceptable: primitive blockouts, display-only meshes, a hand-placed approximation
presented as the robot, or keeping an `.STL` mesh as the source. The user rejected all
of these already.

## What is already in the repo (do not redo)

| Commit | What |
| --- | --- |
| `8eae6ba5d` | `lib.fromCAD` (`src/modeling/parts/fromCad.ts`): STEP and BREP dispatch, native FreeCAD `.FCStd` reader, and `KERNELCAD_CAD_CONVERTER` hook for SolidWorks, Parasolid and IGES. |
| `dd3456f84` | Docs (`docs/usage/cad-import.md`), SolidWorks macro (`docs/usage/solidworks-export-step.bas`), demo bundle `docs/demos/cad-import-freecad/` (two real RP1 bodies, MP4). |
| `1dbb8e761` | WIP primitive humanoid blockout. It is the wrong thing; ignore it or remove it. |

`fromCad.test.ts`: 14 tests pass. Seven unrelated tests in `fetchPart`, `findPart` and
`standardParts` already fail on `1dbb8e761`. Do not count them against this work.

## Source data (outside the repo, do not copy into git unless asked)

| Path | What it is |
| --- | --- |
| `/home/user/roboparty/rp1_hardware/` | Shallow clone of `Roboparty/rp1_hardware`. |
| `.../01_Mechanic/02_Manufacturing/01_CNC/{7DOF,5DOF,Common}/` | 185 STEP AP214 files. Real solids, one per part. Units are mm; each file has its own origin and frame. |
| `/home/user/roboparty/rp1_hardware/04_BOM/RP1_BOM_7DOF_MotionHead.xlsx` | Sheet `总BOM`, 437 part rows. 179 rows match a STEP file on disk. The other 258 are fasteners (`YCL.P*`), motors (`YCL.D*`) and wiring (`E*`), with no geometry. |
| `/home/user/roboparty/rp1_sw_source.zip` (2.09 GB) | SolidWorks source. Contains `RP1.3.4整机.SLDASM` (whole robot, 184 MB), `RP1.3.2躯干装配体.SLDASM`, 67 SLDASM and 106 SLDPRT files. Only one STEP in it, unrelated. |
| `/home/user/roboparty/parasolid/RP1_Parasolid_Model/RP1.3.4整机.x_t` | Whole-robot Parasolid transmit file, 1.2 GB, text. Entity records are numeric with no schema embedded. Not readable without the Siemens schema. Do not spend time decoding it. |
| `/tmp/claude-0/.../scratchpad/RP1_ExportSTEP.bas` (also `docs/usage/solidworks-export-step.bas`) | VBA macro. Opens the `.SLDASM` and saves it as one STEP AP214. Untested: it needs Windows SolidWorks. |

Extract the zip into an empty directory, and never run an interpreter from inside it.
The archives are untrusted data.

## The real gap

The per-part STEP files are in their own frames, so there is no assembly frame.
Whole-robot assembly placement is what is missing. Without it, the 179 parts cannot
be placed correctly relative to each other, and the 7-DoF joints cannot be built.

Options, in the order to try them:

1. **Whole-assembly STEP from SolidWorks.** Run the macro on the `.SLDASM` on a
   Windows machine with SolidWorks, then import the result with
   `lib.fromCAD('.../RP1.3.4_7dof_full.step')`. This is the best option and the one
   the user already offered. Ask the user to run it and upload the STEP if you do not
   have SolidWorks.
2. **Commercial converter.** Set `KERNELCAD_CAD_CONVERTER` to a JSON argv such as
   `["<converter>","{input}","{output}"]` and point it at the `.SLDASM` or the `.x_t`.
   Candidates: CAD Exchanger, HOOPS Exchange, Datakit. Each needs a license. Test
   the converter on one small `.SLDPRT` first.
3. **Assembly from per-part STEP plus BOM and kinematics.** Each STEP file's own frame
   is its local frame. Recover each part's placement from the mate geometry: the
   joint axes, bores and bearing seats in the STEP files, plus the 7-DoF link lengths.
   Record the placement you derive for every part, and mark any part you cannot place
   with a labelled placeholder. Report the unplaced count honestly.
4. **FreeCAD document from the SolidWorks source.** Not possible here: FreeCAD cannot
   read `.SLDASM`. Skip unless a converter outputs FreeCAD.

Do not treat option 3 as the robot until its placements have been checked
against the assembly data from option 1 or 2.

## Importer test plan

Each test must run through the kernelCAD CLI, not only through unit tests.

- `lib.fromSTEP` on one RP1 part: e.g. `YCL.M000312 小臂下本体.STEP`. Expected: `ok: true`.
- `lib.fromCAD` on that STEP: same result.
- `lib.fromCAD` on `docs/demos/cad-import-freecad/rp1-parts.FCStd`: already passes.
  Re-test it on a `.FCStd` written by real FreeCAD if one is available. FreeCAD is not
  installable in this sandbox, so this may need the user's machine.
- `lib.fromCAD` on a `.SLDPRT` or `.SLDASM` with a real converter configured: not yet
  tested. Use a converter that writes STEP.
- The whole-assembly STEP (option 1 or 2): import it, count solids, and compare with
  the BOM count of 179 placed parts.

Commands (from the repo root):

```sh
npx vitest run src/modeling/parts/fromCad.test.ts
npx tsx src/agent/cli/index.ts evaluate <file>.kcad.ts --json
PLAYWRIGHT_BROWSERS_PATH=<dir with chromium-1194 symlinked as chromium-1208> \
  npx tsx src/agent/cli/index.ts render <file>.kcad.ts --preset publish --separate --no-watermark --pose 0,25 --out <dir>/frame.png
```

Read `CLAUDE.md` before authoring a `.kcad.ts`: prefer `lib.fromSTEP` for real components,
use `kernelcad render inspect` for visual evidence, and keep the source file as the
design source of truth.

## Acceptance

The model is done when all of these hold, and each claim is backed by output you have
seen:

1. `evaluate --json` returns `ok: true` with no unexplained diagnostics.
2. Every part that the assembly contains is placed. The unplaced count is zero, or
   each unplaced part is a labelled placeholder that the report names.
3. Each revolute mate moves through its `limitsDeg` without the parts intersecting.
   Show this with a sweep and a render at the limits.
4. Rendered views of the zero pose and one posed pose look like the robot. Inspect
   the PNGs yourself and state what you see.
5. An MP4 demo of the import and one joint sweep is in `docs/demos/<name>/`, with the
   source, the invocation, and the verification evidence. Keep the caption honest:
   say whether the placements came from the assembly, from derivation, or were placeholders.

## Rules for this repo

- Commit with DCO sign-off (`git commit -s`). Do not add a model identifier to commit
  messages, PR text or code comments.
- Push with `git push -u origin ccr-dabe4acd-piatba`. Do not force-push.
- Do not send the user's email address to any external service.
- Do not install or use anything that changes the user's machine beyond this sandbox.
- If a step is blocked (no SolidWorks, no converter license, no FreeCAD), say so in the
  handoff notes and in your report, and finish every step that does not depend on it.

## Open questions for the user

- Can they run the SolidWorks macro on Windows and upload the whole-robot STEP?
- Do they have a converter license (CAD Exchanger, HOOPS, Datakit)? Which one?
- Is the `rp1_hardware` STEP set the right one, or is there a newer revision of the
  7-DoF arm? The BOM revision should be checked against the CAD revision.
