# Mate-axis explode with a standalone first part

`demo.mp4` is a short schematic replay of the passing regression test in
`tests/unit/modeling/explodedPoses.test.ts`. It shows the exact model order and
offsets asserted by the test: an unmated table, then a fastened three-part
stack; the table and base stay at zero offset while `mid` and `top` move 10 mm
and 20 mm along Z. The shapes in this video are a labeled diagram, not a
KernelCAD renderer capture.

Mechanism status is **unverified**. This is not a simulation, deployed Studio
capture, or hardware acceptance result.

## Reproduce

To build the schematic video and evidence from its source:

```sh
node docs/demos/explode-mate-forest-20261113/make-video.mjs
```

`video-evidence.json` records diagram hashes, media probe results, the exact
render command, and the local capture limitation. `frames/` contains the
slides used by the encoder; `poster.png` is the final exploded-state diagram.

The corresponding renderer capture can be attempted with an already-running
Chrome or Chromium CDP session and a local Studio server. The script requires
`PW_CDP_URL`, refuses a fresh-browser fallback, and has a 180-second limit:

```sh
npm run dev -- --host 0.0.0.0 --strictPort
PW_CDP_URL=http://127.0.0.1:9223 bash docs/demos/explode-mate-forest-20261113/capture.sh
```

## Regression evidence

The focused unit test is
`tests/unit/modeling/explodedPoses.test.ts`, case “mate-axis with an unmated
first part”. It asserts that `table` and `base` have zero offset, `mid` moves
10 mm in Z, and `top` moves 20 mm in Z. Local test and static-check results,
including the incomplete renderer capture, are in `verification.md`.
