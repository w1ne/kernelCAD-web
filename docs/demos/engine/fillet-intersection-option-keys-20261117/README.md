# Boolean seam option validation

This bundle shows the existing KernelCAD boolean-seam fillet on a through-hole
and records the local API regression: a misspelt `tolerenceMm` key now raises
`feature.invalid-args` before a fillet record is captured.

## Demo bundle

- [MP4](fillet-intersection.mp4)
- [.kcad.ts source](demo.kcad.ts)
- [Offline Blender renderer](render_demo.py)
- [Caption source](caption.txt)
- [Render manifest](render-manifest.json)
- [Inspected video frame](inspection-frame.png)
- [Three-frame orbit inspection](inspection-contact-sheet.png)
- [Verification evidence](verification.md)

The model was exported to a 3.2 MB binary STL (64,528 triangles), then rendered
with Blender 4.0.2 / Cycles CPU at 720 × 720, 15 fps, 60 frames, 12 samples,
with denoising disabled because this Blender build has no OpenImageDenoiser.
The final MP4 is H.264, 4 seconds, 720 × 720 at 15 fps. Its lower-third says
`LOCAL RENDER`; the API behavior was verified locally and is not presented as a
deployed result or hardware acceptance.

## Reproduction

```sh
npm run build:cli

node dist/cli/index.js export stl \
  docs/demos/engine/fillet-intersection-option-keys-20261117/demo.kcad.ts \
  -o docs/demos/engine/fillet-intersection-option-keys-20261117/demo.stl \
  --no-verify

blender -b -t 4 \
  --python docs/demos/engine/fillet-intersection-option-keys-20261117/render_demo.py -- \
  docs/demos/engine/fillet-intersection-option-keys-20261117/demo.stl \
  docs/demos/engine/fillet-intersection-option-keys-20261117/fillet-intersection.raw.mp4 \
  docs/demos/engine/fillet-intersection-option-keys-20261117/render-manifest.json

ffmpeg -y \
  -i docs/demos/engine/fillet-intersection-option-keys-20261117/fillet-intersection.raw.mp4 \
  -vf "hqdn3d=6:5:8:6,drawbox=x=0:y=ih-76:w=iw:h=76:color=0x101927@0.90:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:textfile=docs/demos/engine/fillet-intersection-option-keys-20261117/caption.txt:fontcolor=white:fontsize=17:line_spacing=5:x=24:y=h-68" \
  -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -movflags +faststart \
  docs/demos/engine/fillet-intersection-option-keys-20261117/fillet-intersection.mp4

npx vitest run src/modeling/filletIntersectionOptions.test.ts \
  tests/unit/backends/occt/filletIntersection.test.ts \
  tests/integration/mcp/listApi.test.ts
npm run typecheck
```

## Browser capture note

The CLI's static-player render timed out waiting for `window.__demoPlayer` on
both existing CDP sessions. The exact failure and cleanup details are in the
verification evidence. The MP4 therefore uses an offline render of the actual
STL exported from the `.kcad.ts` source.
