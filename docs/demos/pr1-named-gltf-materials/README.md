# Named glTF materials — PR1 demo bundle

This short local demo exports two original box parts to GLB, parses the emitted
`materials[].name` values, and renders those verified values into the preview.
It demonstrates local export/replay only; it is not a deployed-behavior or
hardware-acceptance claim.

## Reproduce

From the repository root, with dependencies installed:

```sh
npx vitest run tests/unit/kernel/export/materialNamingDemo.test.ts
ffmpeg -y -loop 1 -i docs/demos/pr1-named-gltf-materials/preview.png \
  -t 5 -r 24 -vf 'scale=1280:720:flags=lanczos,format=yuv420p' \
  -c:v libx264 -crf 22 -preset veryfast -movflags +faststart \
  docs/demos/pr1-named-gltf-materials/demo.mp4
```

The TypeScript source writes `named-materials.glb` and `preview.png`. It asserts
the names read from the GLB are `brass` and `hull`, non-empty and unique. Video
settings: 1280×720, 24 fps, 5 seconds, H.264, CRF 22, no audio.

## Evidence boundary

The GLB is produced by the local exporter from original primitive geometry.
This is not a Blender/manual import check, deployment, or hardware acceptance.
