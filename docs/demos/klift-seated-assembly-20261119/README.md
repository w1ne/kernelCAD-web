# K-Spray K-Lift gallery example as a seated assembly

`evaluate_script` failed `examples/gallery/kspray-klift.kcad.ts` with 32
errors. The window frame, glass, mask film, tape strips and foam bands were
fastened to the ground at the wall foot, 2.4 to 5.2 m from the parts. The
grown parts moved through a param in their transform. The hinge hubs ran 5 mm
clear of their bores.

Each scene part is now fastened to the part that carries it, at a seat on the
face the two parts share. A grown part changes size from a fixed corner.

| Measurement | Before | After |
| --- | --- | --- |
| `evaluate_script` | `ok: false`, `broken`, 32 errors | `ok: true`, `real`, 0 diagnostics |
| `kernelcad animate` pose verification | not measured | 93 poses, 0 collisions |
| Interfering pairs at 5 working poses | not measured | 0 |
| `typecheckExamples` errors in the file | 37 | 0 |

[demo.mp4](demo.mp4) shows 7 key poses of the service cycle, 2 s each. Each
still is a `kernelcad render --pose 225,25` of the example with the param
defaults set to the animation values at that time
([poses.json](verification/poses.json)). The contact sheet is
[video-contact-sheet.png](verification/video-contact-sheet.png).

Visible in the stills: no mechanism badge; the frame is on the wall face; the
film grows up from the sill; the foam bands stop at the tape lines.

## Repeat

```sh
npx vitest run tests/integration/examples/ksprayKliftSeatedAssembly.test.ts
node scripts/build-cli.mjs && npm run build:player
python3 docs/demos/klift-seated-assembly-20261119/make_keyposes.py examples/gallery/kspray-klift.kcad.ts /tmp/klift-poses
for i in 0 1 2 3 4 5 6; do node dist/cli/index.js render /tmp/klift-poses/pose-$i/kspray-klift.kcad.ts --pose 225,25 -o /tmp/klift-poses/pose-$i/view.png --width 1280; done
python3 docs/demos/klift-seated-assembly-20261119/make_demo.py /tmp/klift-poses docs/demos/klift-seated-assembly-20261119
```

## Limits

- The demo is a sequence of stills, not a continuous capture. The 534-frame
  `kernelcad animate` capture stopped 2 times with `Target crashed` in the
  browser page (frame 104 at 30 fps, frame 38 at 5 fps) on a loaded machine.
- `examples/gallery/kspray-klift/renders/` is not refreshed and shows the
  scene before this change.
