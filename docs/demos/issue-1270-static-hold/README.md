# Static-hold coverage demo — issue #1270

[Watch the MP4 demo](./demo.mp4).

Visual QA frames: [moving mates](./preview-mates.png) · [no-coverage result](./preview-result.png).

This handoff exercises the actual `verify({ check: 'static-hold' })` MCP
dispatch against the `multi-dof-robot-arm-4axis` cookbook. The result is
`ok: false` with
`assembly.joint.static-hold.no-actuator`, and it names the four moving mates
that were skipped. The check does not compare mate `mechanicalJoint` metadata
with motor torque ratings.

## Reproduce

From the repository root:

```sh
node --import tsx docs/demos/issue-1270-static-hold/capture-demo.mjs
bash docs/demos/issue-1270-static-hold/render-demo.sh
```

The first command evaluates the cookbook and writes [`verification.json`](./verification.json)
plus the result slide from the actual tool response. The second renders the MP4
from the three retained slide sources. Settings and expectations are recorded
in [`settings.json`](./settings.json).

## Evidence scope

This is a local replay of the verification tool and its diagnostic. It does not
claim deployed behavior, actuator torque acceptance, physics-engine validation,
or hardware acceptance. `evaluate_script` still evaluates the cookbook's
mechanism independently of this check.
