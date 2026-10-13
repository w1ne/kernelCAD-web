# MCP self-install — local validation

[Watch the MP4](demo.mp4). [Capture source](capture.mjs) and
[verification evidence / settings](verification.json) are retained beside it.

The video replays actual command outputs from local execution: fetching the new
static llms.txt, writing a Cursor MCP entry into a sandbox, packing npm and
installing its skill documents, then connecting to the tarball's stdio server
and calling `lookup_api`. Every packaged and installed skill version is checked
against package.json, and MCP initialize reports the same version.

Reproduce from the repository root with Node.js >=22.12.0, npm and ffmpeg:

```bash
npm run build:cli
node docs/demos/mcp-self-install/capture.mjs
```

The helper serves one local HTTP request and closes its owned server immediately.
It uses no browser and does not edit the user's host configuration. Scratch
package/config/frame files remain in ignored `.superpowers/mcp-self-install-demo`.
The MP4 uses four five-second slides at 1440×810, 30 fps, H.264, CRF 20.

This is command-output replay of local validation. It is not a deployed website
check, an install into a running user host, CAD geometry verification, simulation
or hardware acceptance. Before deployment, the public llms.txt returned 404.
After an approved marketing deployment, check the actual kernelcad.com/llms.txt
response, content type and homepage discovery link; use docs/DEPLOY.md and do
not treat a successful upload as proof of cache purge or live behavior.

Visual inspection (2026-10-13): decoded one frame from each of the four MP4
slides with ffmpeg and inspected them. All titles, command output, version
results and local-validation captions were readable and inside the frame.
ffprobe confirms H.264, 1440×810, approximately 20 seconds. Evidence shows
HTTP 200 locally, a sandbox config write, 29 matching skill versions and a
successful lookup_api call from the extracted package's 0.17.0 MCP server.
