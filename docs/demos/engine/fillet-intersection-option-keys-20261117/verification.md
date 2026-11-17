# Verification evidence

Captured locally on 2026-11-17.

- `npx vitest run src/modeling/filletIntersectionOptions.test.ts tests/unit/backends/occt/filletIntersection.test.ts tests/integration/mcp/listApi.test.ts` — **3 files, 20 tests passed**.
- `npm run typecheck` — **passed**.
- `npx eslint src/modeling/capture/filletIntersectionCapture.ts src/modeling/capture/proxy.ts src/modeling/filletIntersectionOptions.test.ts src/agent/mcp/tools/listApi.ts` — **passed**.
- `git diff --check` — **passed**.
- `node dist/cli/index.js export stl ... --no-verify` — **wrote 3,226,484 bytes**; one body was checked and the geometry quality report was `ok`.
- Blender 4.0.2 Cycles CPU rendered the exported 64,528-triangle STL at **720 × 720**, **15 fps**, **60 frames**, **12 samples**. Denoising was disabled because this build has no OpenImageDenoiser.
- `ffprobe` on the final MP4 — **H.264, 720 × 720, 15 fps, 4.0 seconds, 216,760 bytes**.
- The full-size frame and three-angle contact sheet were opened and visually inspected.

The first browser-render attempt on CDP 9222, the attempt on CDP 9223, and the
attempt after rebuilding the static player all returned the same exact failure:
`page.waitForFunction: Timeout 30000ms exceeded.` Each render process closed its
temporary tab. Both existing Chrome processes and CDP listeners remained
running. The final demo uses the offline render of the exported KernelCAD STL.
