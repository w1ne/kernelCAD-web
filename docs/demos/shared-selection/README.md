# Local shared-selection demonstration

[11-second MP4](selection.mp4) — a captioned replay of screenshots captured
from the actual local Studio and MCP workflow on 2026-10-13. This is local
validation, not a production deployment or a continuous screen recording.
No CAD edit or hardware acceptance is claimed.

Source model: [bracket-with-hole.kcad.ts](../../../examples/bracket-with-hole.kcad.ts).
Studio: `npm run dev -- --host 127.0.0.1 --port 5192 --strictPort`, then
`http://127.0.0.1:5192/?script=examples/bracket-with-hole.kcad.ts`.
The already-running Chrome profile was reused; no new browser was launched.

1. Click a face: original frame `02-user-face.png` shows the existing face highlight.
2. Hover and click the front edge: original frame `03-user-edge.png`.
3. `npx tsx docs/demos/shared-selection/invoke.ts get` returns edge 6 on body 0;
   the actual output is in [user-edge-result.json](user-edge-result.json).
4. `npx tsx docs/demos/shared-selection/invoke.ts set` restores edge 6. The
   actual output is in [agent-edge-result.json](agent-edge-result.json), and
   `04-agent-edge.png` shows the front edge line with the face tint cleared.

[Invocation source](invoke.ts), [caption source](caption-frames.py), and
[encoding settings](build-video.sh) are retained. Regenerate with
`sh docs/demos/shared-selection/build-video.sh` (Python Pillow and ffmpeg).
The encoder produces H.264, 1280×720, 24 fps, CRF 20.
[Video probe](video-verification.json) and the decoded frame
`video-inspection.png` verify the artifact. The decoded frame was visually
inspected: model, front-edge highlight, and readable local-workflow caption.

Automated verification: 65 test files / 391 tests passed across MCP, server
middleware/pool, selection-code and viewer face/shape tests (canonical
worktree-local TMPDIR and generated bundled catalog). `npm run typecheck`
and `npm run lint` passed; lint reported 29 existing warnings. An independent
review verified the callback-lifetime and generation-guard fixes.

Hosted session route wiring belongs to the separate server repository. No
public deployment was performed, so public-page verification is deferred to
deployment. See [usage and limits](../../guide/shared-selection.md).
