# MCP live viewer demo

[Watch the MP4](demo.mp4). This eight-second video replays actual local stdio MCP results and the mesh returned by the live viewer endpoint. It is a mesh replay, not a Studio screen recording, deployment verification, simulation, or hardware acceptance.

The first `evaluate_script` builds a 20 × 30 × 10 mm box and returns `viewerUrl`. `set_param` changes width to 40 mm, returns the identical URL, and replaces the source and mesh. Captured volumes are 6,000 and 12,000 mm³. These loopback links expire with their MCP process and are not public sharing URLs.

## Reproduce

From the repository root, after installing dependencies:

```sh
npm run build:cli
npm run build:mcp-viewer
node docs/demos/mcp-viewer-link/capture.mjs
# Open the printed link using an existing Chrome session.
# Enter next, inspect the same tab, then enter close.
node docs/demos/mcp-viewer-link/replay.mjs
```

`capture.mjs` invokes the actual MCP SDK stdio client; it does not launch a browser. Its owned MCP process has a 600-second lifetime and 180-second idle timeout. `model.kcad.ts`, `first.json`, and `second.json` retain the source, complete tool arguments/results, endpoint source, and serialized mesh. `replay.mjs` projects those captured triangles; `settings.json` retains the encoding invocation. PNGs retain each video slide.

## Local verification, 2026-10-13

- Existing Chrome profile/tab reused. The first build displayed width 20 and source default 20. After `set_param`, the same tab displayed width 40, source default 40, one body, Ready, and no diagnostics, without navigation or reload between builds.
- Relevant MCP suites and Studio source/review/Code tab tests: 175 files passed; 993 tests passed, 5 skipped. Command: `TMPDIR="$PWD/node_modules/.tmp/mcp-suite-tmp" NODE_OPTIONS=--max-old-space-size=8192 npx vitest run src/agent/mcp tests/unit/mcp tests/integration/mcp src/studio/mcpSourceBridge.test.ts src/studio/context/geometry/mcpReviewReplacement.test.ts src/studio/__tests__/tabs/CodeTab.typingEcho.test.tsx src/studio/__tests__/tabs/CodeTab.test.tsx`. A canonical worktree TMPDIR avoids macOS `/var` versus `/private/var` path aliases in existing linked-script tests. Seed parts generated with `npm run generate:parts`.
- `npm run typecheck`, `npm run lint`, `npm run build:cli`, and `npm run build:mcp-viewer` passed. Lint has existing unused-disable warnings; builds have existing dependency/chunk warnings.
- MP4 inspected via decoded frames from both steps; labels and meshes are readable with no overlap. `ffprobe`: H.264, 1280 × 720, 24 fps, 8.000 seconds.
- No UI layout changes, kernel-registry changes, deployment, or hardware validation. Hosted MCP remains a pass-through to its existing external gateway.
