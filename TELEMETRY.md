# kernelCAD Telemetry

kernelCAD collects **anonymous** usage statistics to understand how the tool
is used and where it fails, so we can improve it. Participation is optional.

## What is collected

Each event contains only:

- the tool name invoked (e.g. `extrude`, `fillet`)
- outcome (`ok` / `error`) and a canonical diagnostic code on failure
- duration in milliseconds
- derived structural counts: feature count, interference count, eval-ok flag,
  number of tool calls in the session, and which operation kinds were used
- kernelCAD CLI + kernel version, OS, Node.js version
- whether you ran locally or via the hosted gateway
- a random, anonymous install id and a per-run session id

## What is NEVER collected

We do not collect — and the client physically refuses to send (enforced by a
field allowlist) — any of the following: your prompts, your `.kcad.ts` code,
geometry or coordinates, file paths or names, environment variables, logs,
serialized errors, or any account identity on the local path.

## How to disable

Any one of these turns telemetry off:

- `kernelcad telemetry disable`
- `KERNELCAD_TELEMETRY=0` or `KERNELCAD_TELEMETRY_DISABLED=1`
- `DO_NOT_TRACK=1`
- running in CI (`CI=true`) — off by default

Check the current state with `kernelcad telemetry status`. Inspect exactly what
would be sent without sending anything with `KERNELCAD_TELEMETRY_DEBUG=1`
(payloads print to stderr). `kernelcad telemetry reset` forgets your install id.
