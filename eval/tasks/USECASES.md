# Typical use cases

These tasks are the jobs our users do most. They come from what people build on
the hosted app and ask their agents for: brackets and mounts for a 3D printer,
enclosures for a board, organiser bins, replacement parts made from
measurements, gears and mechanisms, flat parts for a CNC, a plan drawing, a
change to a design they already have, and a change to a STEP file someone sent
them. When one of these breaks, a user sees it the same day. The suite makes
sure it breaks in CI first.

Each task has the user's request (`prompt.md`), an expert solution
(`solution-expert.kcad.ts`) and a deterministic harness (`harness.ts`). The
harness builds the script in-process and asks the kernel what it built, then
reads back every export the user needs. The same harness scores agent runs
(`npm run eval -- usecase-<slug>`), and `eval/usecases-*.test.ts` runs every expert
solution through it in `npm test`.

| Task | Case | What the harness checks |
|---|---|---|
| `usecase-sensor-bracket` | U1 sensor wall bracket | plate 50 × 40 × 4, Ø30.2 clamp bore clear of the ears, slot, M4 countersunk holes 30 apart, M3 clamp screw, min wall, STEP / STL / 3MF |
| `usecase-nema17-mount` | U2 NEMA 17 motor mount | 31 mm M3 pattern and Ø22 pilot on the motor face, M5 extrusion slots, bend fillet, plate thickness, min wall, exports |
| `usecase-rpi4-enclosure` | U3 Raspberry Pi 4 enclosure | real hole pattern and connector positions, standoffs, lid screw paths, every port opening, vents, fit, min wall, 3MF plate layout |
| `usecase-gridfinity-bin` | U4 Gridfinity 2 × 1 × 6 bin | outline, the foot profile at three heights, Ø6.5 × 2.4 magnet holes, cavity, divider, min wall, exports |
| `usecase-stove-knob` | U5 knob from measurements | Ø35 × 20 envelope, D-shaft fit (Ø6.2, flat, depth), knurl grooves, pointer mark, min wall, exports |
| `usecase-spur-gear-pair` | U6 spur gear pair | tooth counts, tip circles, 30 mm centre distance, mesh without overlap, keyed bores, STEP of the pair, the cookbook gear recipe |
| `usecase-robot-arm` | U7 3-axis robot arm | link lengths, no rest-pose overlap, servo pocket, mechanism verdict, URDF joints and limits |
| `usecase-floor-plan` | U8 floor plan | room, walls, door and window openings, furniture, PDF plan with feet-and-inches labels, DXF plan section |
| `usecase-plywood-shelf` | U9 plywood shelf for a CNC | board sizes, dados, joint fit, equal compartments, BOM cut list, DXF of every flat part |
| `usecase-twisted-vase` | U10 twisted vase | height, base and top hexagons, real twist, 2 mm wall by section, closed bottom, exports |
| `usecase-bolt-nut` | U11 M8 bolt and nut | hex sizes, 30 mm shank, 1.25 mm pitch measured on the bolt and in the nut, fit, exports (not in CI, see below) |
| `usecase-drill-jig` | U12 drill jig | Ø8 guide centred on the 18 mm board, 20 mm from the end, cheeks and end fence, min wall, exports |
| `usecase-keychain` | U13 name keychain | plate, rounded corners, ring hole, raised text as a second-colour part, 3MF colours |
| `usecase-edit-bracket` | U14 edit an existing design | the asked changes to U1 landed and nothing else moved |
| `usecase-step-modify` | U15 modify an imported STEP | holes added through the imported part's top face, original features kept |

Common rules for every harness (see `eval/usecaseChecks.ts`):

- Key dimensions within ±0.1 mm, measured by the kernel: exact bbox, material
  inside probe boxes (`emptyIn` / `fullIn`), and the kernel's own hole detection
  for diameters, positions, depths and through / blind.
- One closed, valid solid per part: one TopAbs_SOLID, BRepCheck valid, and a
  tessellation with no open edges.
- Printable cases declare `dfmSpec({ minWall: 1.2 })` and the gate must pass.
- Exports are read back, not trusted: STEP re-imports with the right solid
  count and the model's volume, STL is watertight (per part for assemblies),
  3MF has one closed mesh per part; DXF, PDF, BOM and URDF where the case asks.

`usecase-bolt-nut` is an agent-eval task only. Its modeled 24-turn threads
take minutes per build, and the harness builds and exports several times, so it
is too slow for a per-PR shard. After a change to threads, sweeps or exports,
run it by hand: call its harness on its `solution-expert.kcad.ts` from a
scratch vitest file (about ten minutes).

## Open findings

A check that fails today because of a known open bug is listed with a link in
the `open` map of its `eval/usecases-*.test.ts` entry. It runs as `it.fails`, so
the suite stays green, and it turns red the day the fix lands: then delete the
entry, and the check becomes a normal gate.

## Add a use case

1. Create `eval/tasks/usecase-<slug>/` with `prompt.md` (the user's request as
   they would type it, then the pass criteria in plain words and the frame to
   model in), `solution-expert.kcad.ts` (idiomatic public API, SPDX header, no
   workarounds for bugs that are fixed) and `harness.ts`.
2. In the harness, build once with `buildUsecase`, start from `standardGates`
   and `standardExports`, and add one named check per pass criterion. Name
   checks for what they prove. Probe geometry with the kernel, never with
   numbers copied from the solution.
3. Add `{ id: 'usecase-<slug>' }` to the lightest `eval/usecases-*.test.ts`
   (each file is one CI shard's share; keep each under about five minutes).
4. Run `npx vitest run eval/usecases-<x>.test.ts`. Then break the solution
   once (move a hole, drop a part, open a wall) and see the harness fail.
