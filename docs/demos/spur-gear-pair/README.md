# Spur gear pair rest pose

Local CAD stills of `examples/cookbook-parity/involute-spur-gear-pair.kcad.ts`.
Module 1, 20 and 40 teeth, centre distance 30 mm, circular backlash 0.05 mm.
The gold gear is the driver. The blue gear is the driven gear. A plate and
two shafts hold the axes.

These frames are the rest pose of the model. They are not a motion simulation
and not a hardware acceptance. `--no-mechanism-check` skipped the mate travel
sweep. Tooth clearance is the evaluate report below.

## Render

```
npx tsx src/agent/cli/index.ts render examples/cookbook-parity/involute-spur-gear-pair.kcad.ts \
  --separate --no-mechanism-check --no-watermark --width 768 --height 768 \
  -o docs/demos/spur-gear-pair/pair.png
```

`spur-gear-pair.mp4` holds `pair.front.png` for 2.5 s, then `pair.iso.png` for
2.5 s (768×768, 12 fps). It is those two stills concatenated. There is no
camera move and no mesh cycle in the video.

## Evaluate

```
npx tsx src/agent/cli/index.ts evaluate examples/cookbook-parity/involute-spur-gear-pair.kcad.ts
```

```
gear-pair-report {"sampleLimited":true,"clearanceScope":"sampled-poses","anyInterference":false,"interferenceVolumeFloorMm3":0.001,"aggregatedPoseCount":8,"unresolvedStepDeg":1.125,"refinementSteps":2,"backlashMm":0.04908738521234052,"backlashStepMm":0.0015339807878856412,"backlashReached":true,"minClearanceMm":0.023376654152066634,"minClearanceDriverDeg":9,"centerDistanceMm":30,"ratio":-0.5}
Features: 18
OK
```

The report samples one driver tooth with exact BREP distance and common
volume, then refines beside the lowest-clearance pose. `interferenceVolumeFloorMm3`
is 0.001 mm³, a fixed absolute volume for every module and face width. Overlap
volume is the transverse overlap area times the face width, and similar teeth
grow that area with the square of the module, so this floor is a larger share
of a tooth on a fine module and a smaller share on a coarse module or a wide
face. This pair is module 1 mm with a 6 mm face. A common volume strictly above
that floor sets `anyInterference` and sets `minClearanceMm` to 0. A smaller
positive volume does not. Zero-volume contact (common volume 0 and distance 0)
sets `minClearanceMm` to 0 while `anyInterference` stays false.
`anyInterference` and `minClearanceMm` aggregate those sampled poses. They do
not prove the gaps between samples. Backlash is the driven pitch-circle arc. Geometry only.
Not tooth strength or load capacity. The physics check is
`validate --include-interference` on this file: mates, travel and gravity.
That check uses the ideal gear ratio. It does not simulate tooth contact.

Front: both faces share a height and meet above the plate. Iso: a 20-tooth
driver and a 40-tooth driven gear, each with a bore, and a driver tooth sitting
in a driven tooth space. The opt-in generating cut is not in these stills.
Default teeth stay the involute profile.
