# MCP structured content validation

The stdio server returns object results in `structuredContent` and keeps the same
serialized JSON text. The restored SDK regression discovers `lookup_api`'s output
schema and calls the real server through linked SDK in-memory transports; the SDK
validates that schema during `callTool`.

[Demo](demo.mp4): 10 seconds, H.264, 1280×720, 24 fps. This is a replay of the
actual **local validation** workflow and recorded test result, not a deployed
stdio process capture or hardware acceptance. The first frame explains the SDK
workflow; the second shows the real passing invocation. Both frames were decoded
from the MP4 and visually inspected for readable, unclipped text.

Reproduce on macOS with Python Pillow, Node dependencies, and ffmpeg:

```sh
python3 docs/demos/mcp-stdio-structured-content/capture.py
```

Retained source/settings: [capture.py](capture.py). Evidence:
[passing invocation](verification.txt), [pre-fix SDK failure](regression-before.txt),
and the two source PNG frames. The pre-fix test rejected missing structured content
with MCP error -32600. Restoring the four server lines made it pass.

Validation: 28 focused MCP tests; typecheck; lint (zero errors, 29 existing
warnings); quality and cycle ratchets (13 tests). No deployment is included;
public documentation verification remains a later deployment step.
