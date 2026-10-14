# Tools and licenses

No third-party implementation was copied, no dependency was added, and no
install was run. The nearest-point/BVH extension is original kernelCAD MIT
code. The existing shared node_modules installation was reused.

| Component used or considered | License / role |
|---|---|
| Replicad 0.23.1 | MIT; existing BREP measurement API |
| replicad-opencascadejs 0.25.0 | MIT wrapper; existing WASM kernel |
| Open CASCADE Technology | LGPL-2.1 with OCCT additional exception; already bundled, no bindings/internals modified ([official terms](https://occt3d.com/open-cascade-technology/index.html)) |
| TypeScript / tsc | Apache-2.0; existing transpiler/typecheck |
| Node.js | MIT with bundled third-party notices; existing runtime |
| npm / npx | Artistic-2.0; existing command runner |
| Vitest, Vite, tsx, esbuild, Rollup | MIT; existing test/transformation tooling |
| ESLint, @eslint/js, typescript-eslint | MIT; existing lint tooling |
| @tanstack/router-cli / tsr | MIT; regenerates ignored local route tree prerequisite |
| @vitejs/plugin-react, React | MIT; existing Vitest configuration |
| @modelcontextprotocol/sdk, Zod | MIT; existing MCP dispatch/validation |
| Acorn, acorn-walk, astring, ts-morph, Commander, Three.js | MIT; existing evaluation/MCP import graph |
| Swift compiler/driver/runtime | Apache-2.0 (runtime library exception where applicable); system demo renderer ([official license](https://www.swift.org/LICENSE.txt)) |
| Apple AppKit, AVFoundation, CoreVideo, CoreGraphics, Foundation, system H.264 encoder | Apple macOS/SDK proprietary terms; system-only text rendering/video encode/decode |
| Git | GPL-2.0-only; existing external version-control binary, not incorporated as a dependency |
| ripgrep / rg | MIT OR Unlicense; existing search binary |
| zsh | MIT-style Zsh license; existing shell |
| cat, head, tail, sed, find, mkdir, ls, du, rm | BSD-family Apple system utilities; existing shell tooling |
| FFmpeg 8.1 Homebrew binary | GPL-3.0-or-later configured build; version/configuration probe only, unused for rendering/encoding and not added to the project ([official licensing](https://ffmpeg.org/legal.html)) |

Official Autodesk Fusion and COMSOL documentation was consulted privately as
workflow comparison material; their prose/images remain copyrighted vendor
material and are not copied into implementation or demo artifacts. No external
BVH library or codec dependency was considered necessary. No new GPL/LGPL code
or dependency is part of this change; the pre-existing OCCT dependency remains
unchanged.
