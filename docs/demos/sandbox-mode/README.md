# Sandbox mode: keep file access in the workspace, refuse outbound network

This demo runs one real job in a fresh workspace, `/tmp/cad-ws`: exporting a
NEMA 17 motor mounting plate (`nema17-plate.kcad.ts`) to STEP. The plate is
60 × 60 × 5 mm, with a 22.5 mm pilot bore and four 3.4 mm M3 clearance holes
on the 31 mm bolt square. The run uses `kernelcad --sandbox`, then tries to
escape the workspace and reach the network.

View the [36-second demonstration](demo.mp4). It has six steps, taken
verbatim from [`transcript.txt`](transcript.txt):

| Step | Command | Result |
| --- | --- | --- |
| 1 | `kernelcad --sandbox sandbox status` | Sandbox on. Workspace `/tmp/cad-ws`; scratch dirs moved into it; outbound and loopback refused; telemetry forced off. |
| 2 | `export step … -o out/nema17-plate.step` | Exit 0. 33 740-byte STEP written inside the workspace. |
| 3 | `inspect step out/nema17-plate.step` | One solid, bounding box [0..60]×[0..60]×[0..5] mm, volume 15 830 mm³. Holes: Ø22.5 through at (30, 30) and four Ø3.4 through at (14.5 \| 45.5, 14.5 \| 45.5). |
| 4 | `export step … -o ../leak.step` | Exit 2, `cli.sandbox-path-denied`: "it resolves to /tmp/leak.step". No file is written. |
| 5 | `ln -s /etc escape && export stl … -o escape/plate.stl` | Exit 2, `cli.sandbox-path-denied`: the symlink is followed and "it resolves to /etc/plate.stl". |
| 6 | `kernelcad mcp --sandbox`, then `import_step {url}` and `fetch_part {partsBaseUrl}` | `initialize` returns the title "kernelCAD (sandbox mode)" and sandbox instructions. Both calls return `isError` with `cli.sandbox-network-denied` before any connection is made. |

Hand check of the step 3 volume: 60·60·5 − π·11.25²·5 − 4·π·1.7²·5 =
18 000 − 1 988 − 182 = 15 830 mm³, which matches the STEP reader. After the
run, neither `/tmp/leak.step` nor `/etc/plate.stl` exists.

## Files

- `nema17-plate.kcad.ts` — the part (source of truth).
- `demo.sh` — the session. It runs `dist/cli/index.js` from this branch as
  `kernelcad` in a fresh `/tmp/cad-ws` and writes `transcript.txt`.
- `mcp-call.mjs` — starts `kernelcad mcp --sandbox` over stdio, sends
  `initialize` and the tool calls, and prints a one-line summary of each
  JSON-RPC result.
- `render_terminal.py` — draws `transcript.txt` as terminal frames at
  1600 × 900 and encodes `demo.mp4` (24 fps, H.264, about 4.6 s per step).
- `transcript.txt`, `demo.mp4` — the generated evidence.

## Reproduce

```sh
npm run build:cli
docs/demos/sandbox-mode/demo.sh
python3 -I docs/demos/sandbox-mode/render_terminal.py
```

## Provenance and limits

Recorded as a local run on Linux (Node 22) on 2026-10-31, from branch
`wt-sandbox`.

The transcript is real command output with three filters. `demo.sh` drops:

- OCCT's STEP-writer banner lines (`*******…`);
- blank lines;
- the one-line notice that mesh-heavy commands print when they re-execute
  with a larger heap.

In step 6 the transcript also shortens the long `node …/mcp-call.mjs <cli>`
invocation to `mcp-call.mjs # drives: kernelcad mcp --sandbox`.

The video is a rendering of that transcript, not a screen recording. The
network refusals in step 6 come from the MCP argument guard, before any socket
is opened. The lower-level socket, `fetch`, DNS and `node:fs` chokepoints are
covered by `tests/unit/shared/sandbox/guards.test.ts`; this video does not
show them.

The demo does not show the hosted MCP service, rendering (headless Chromium
was not installed on the recording machine), or a fabricated part.
