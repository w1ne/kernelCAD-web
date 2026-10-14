# Assembly path check — local demo bundle

[Watch the 12-second MP4](demo.mp4). This shows actual local MCP `verify` output, presented as three readable report cards. It is a synthetic validation workflow, not a simulated motion playback, deployed feature check or hardware acceptance test.

- [Model source](source.kcad.ts): blind pocket, captured housing and separate-lid variants, in millimeters. The captured variant joins its cap to the housing; the separate-lid variant keeps clearance.
- [Generator](generate.ts): runs each variant through `verify({check:'assembly-path'})`, asserts the expected paths/order, renders its measured results and encodes the video.
- [Validation record](validation.md) and [Vitest output](tests.txt).
- [Actual reports](results.json) and [invocation/settings/video probe](verification.json).
- Retained SVG/PNG cards and decoded MP4 inspection frames are in this directory.

Reproduce from the repository root:

```sh
npx tsx docs/demos/assembly-path/generate.ts
ffmpeg -y -loglevel error -ss 5 -i docs/demos/assembly-path/demo.mp4 -frames:v 1 docs/demos/assembly-path/inspection-captured.png
ffmpeg -y -loglevel error -ss 9 -i docs/demos/assembly-path/demo.mp4 -frames:v 1 docs/demos/assembly-path/inspection-order.png
```

Visual inspection on 2026-10-14: invocation, every cardinal direction, blocking names and travel distances are legible; the blind peg has only +Z; the captured card shows peg/housing stuck; the separate-lid card shows lid → peg → housing, no stuck parts. All cards visibly label local mesh validation and distinguish it from deployment/hardware acceptance.

No dependency was added. Existing tools/libraries used: Node.js (MIT), npm/npx (Artistic-2.0), TypeScript (Apache-2.0), tsx (MIT), Vitest (MIT), ESLint (MIT), TanStack Router CLI (MIT), replicad and replicad-opencascadejs package wrappers (MIT), existing Open CASCADE runtime (LGPL-2.1 with OCCT exception), Sharp (Apache-2.0; existing libvips LGPL-2.1-or-later), Python (PSF-2.0), Git (GPL-2.0), FFmpeg/ffprobe installed GPL-enabled 8.1 build (GPL-3.0-or-later). FFmpeg is invoked externally for demo media only; no GPL/LGPL source or dependency was added to the repository.

Public guide: [assembly-path](../../guide/assembly-path.md). This branch is not deployed; verify the guide's public page after a separately authorized deployment.
