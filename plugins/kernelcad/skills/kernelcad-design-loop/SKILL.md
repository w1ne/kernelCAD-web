---
name: kernelcad-design-loop
description: Build or revise a CAD model with the hosted kernelCAD MCP — write .kcad.ts source, evaluate, review with design_loop until green. Use for any "design / model / make a part" request when the kernelcad MCP server is connected.
---

# kernelCAD design loop (hosted MCP)

The `kernelcad` MCP server (https://mcp.kernelcad.com/mcp) runs the OpenCASCADE
kernel for you. Nothing needs to be installed locally. Discover the live tool
list from the server; tool availability depends on whether the user is signed in.

## Loop

1. Check for a canonical pattern first: `lookup_cookbook({ query })`
   (see the `kernelcad-cookbooks` skill). Start from a hit when one exists.
2. Write `.kcad.ts` source. Use `lookup_api({})` for the API surface instead of guessing.
3. Iterate fast with `evaluate_script({ code, dryRun: true })`, then finish with a
   full `evaluate_script({ code })`. A dry run is not evidence that the solid builds.
4. For housings, mechanisms, gearboxes, robot arms and other production builds,
   call `design_loop({ goal, attempts: [{ code }] })`. Apply its
   `nextActionPrompt` / `revisionAssist` patches and repeat until `ok: true`
   or `convergence.escalate` says to stop and ask the user.
5. On failure, `why_did_this_fail({ code })` then `repair_script({ code })`.
   `lookup_diagnostics({})` explains any diagnostic code.
6. For assemblies that must be built, run
   `verify({ check: 'assembly-path', sequence: true })`. Declare helical
   fastener motion and press/snap fits on the fastened mate
   (`{ fastener: { part?, axis, pitchMm?, tool? }, fit?: { kind, part? } }`);
   the planner reports `helical`, `requires-force` and `tool-blocked` steps
   instead of guessing. Add `stability: true` (with `gravity`/`fixtures` when
   needed) to flag steps whose part cannot be proven to rest on an
   already-stable part: read `sequence.needsHold` and `Step.heldBy`. That is an
   approximate support projection, not physics. Tool reach is a swept
   envelope, not a hardware check.
7. Show the result once with `open_in_studio` (see `kernelcad-studio-paint`),
   then export (see `kernelcad-export`).

## Rules

- Report the numbers the tools return (volumes, bbox, diagnostics); do not
  describe geometry you have not evaluated.
- Keep the source as the deliverable: give the user the final `.kcad.ts`.
- If a tool says sign-in is required, tell the user to complete the OAuth
  prompt their client shows for the `kernelcad` server.
