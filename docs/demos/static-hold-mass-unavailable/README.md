# Static-hold unavailable-mass regression

[Watch the MP4 demo](./demo.mp4).

This local replay builds an actuated beam assembly, injects a deterministic
lowering result with no assembly scene, and calls the real `checkStaticHold`
implementation. The result is `ok: false` with
`assembly.joint.static-hold.mass-unavailable`; no capacity estimate is made.

## Reproduce

From the repository root:

```sh
node --import tsx docs/demos/static-hold-mass-unavailable/capture-demo.mjs
bash docs/demos/static-hold-mass-unavailable/render-demo.sh
```

The first command runs the check and writes [`verification.json`](./verification.json)
from the actual result. The second renders the retained slide sources into the
MP4. Invocation and output settings are recorded in [`settings.json`](./settings.json).

## Evidence scope

This is local fail-closed validation with a deterministic lowerer fault
injection. It does not claim a physics simulation, deployed behavior, or
hardware acceptance.
