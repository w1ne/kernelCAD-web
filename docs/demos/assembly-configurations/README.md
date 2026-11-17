# Named configurations of one bearing block

`demo.mp4` is a camera orbit of the solved assembly in
`examples/assemblies/configured-bearing-blocks.kcad.ts`. The part source is
`examples/manufacturing-showcase/bearing-block.kcad.ts`. Compact (80 × 50 × 18)
is instanced twice and wide (110 × 70 × 22) once. Each instance names the file
and the configuration. This is local script validation and a local render. It
is not a motion study, a deployed-service capture, or a printed part.

What the frames show:

- two matching smaller blocks at the ends and one larger block in the middle;
- each block sits on the base plate, with a centre bore and four mount holes;
- the orbit moves the camera; the parts stay seated.

Reproduce from the repository root. No browser with remote debugging was
listening, so the render tool launched its own headless Chromium and closed it.

```sh
npx tsx src/agent/cli/index.ts render inspect \
  examples/assemblies/configured-bearing-blocks.kcad.ts \
  docs/demos/assembly-configurations/inspect \
  --views iso --channels rgb --width 1280 --height 720 \
  --environment softbox --no-watermark --screenshot-timeout 60000

npx tsx src/agent/cli/index.ts render \
  examples/assemblies/configured-bearing-blocks.kcad.ts \
  --preset publish -o docs/demos/assembly-configurations/assembled.png \
  --width 1280 --height 720 --no-watermark

npx tsx src/agent/cli/index.ts animate \
  examples/assemblies/configured-bearing-blocks.kcad.ts \
  docs/demos/assembly-configurations/demo.mp4 \
  --turntable --preset publish --width 960 --height 540 \
  --duration-ms 6000 --elevation 20 --background white
```

The turntable encoder reported `verify skipped`. Mate seating, volume, mass,
and interference at 0.01 mm³ are checked by
`tests/integration/assemblies/configuredPartInstances.test.ts`, not by the video.

Inspection of the iso still and of frames 0, 45, 90, and 135 of the MP4:
the middle block is larger than the two end blocks, all three rest on the
plate, and the blocks do not overlap.
