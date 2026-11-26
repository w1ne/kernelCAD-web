# Standard elements Wave 1 demo

`demo.mp4` is a 16-second annotated still sequence based on a local render and
local `evaluate_script` / `review_cad` results for the committed linear-slide
example. It shows five library elements and an 80 mm prismatic carriage mate.

[Watch the demo](demo.mp4).

## Reproduce

From the repository root:

```sh
npx tsx src/agent/cli/index.ts render examples/parts/standard-elements-wave1.kcad.ts --preset studio --background dark --width 1800 --height 1200 --no-watermark -o docs/demos/standard-elements-wave1/assembly.hero.png
npx tsx src/agent/cli/index.ts render inspect examples/parts/standard-elements-wave1.kcad.ts docs/demos/standard-elements-wave1/inspect --channels rgb --views iso,right,top --width 1200 --height 900 --no-watermark
npx tsx docs/demos/standard-elements-wave1/verify.mts
python3 docs/demos/standard-elements-wave1/capture-demo.py
```

`verification.json` records source hash, evaluated part names, diagnostics,
pose samples, carriage travel, and interference pairs. `video-evidence.json`
records the render and encoding settings, source and input hashes, and MP4 hash.
`capture-demo.py` and `verify.mts` are the retained demo source and invocation.
The RGB inspection views and manifest are under `inspect/`.

The local review reports six informational `assembly.mounting-hole.unverified`
notes: these example mates use point connectors, so hole-record diameters are
not compared. Geometric mate alignment is still checked. The run has zero
error-level diagnostics and zero pose-envelope interference pairs.

## Scope

The rendered model is local geometry from `examples/parts/standard-elements-wave1.kcad.ts`.
The results verify local evaluation and assembly review only. The video does not
show deployed behavior, hardware operation, manufacturing, or hardware
acceptance.
