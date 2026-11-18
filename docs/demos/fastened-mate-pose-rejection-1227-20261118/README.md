# Fastened-mate pose rejection

This bundle demonstrates a `solve_mates` input that used to return `status: solved` while ignoring the requested motion. The fixture now returns `feature.invalid-args` and names the fixed mate.

Watch [demo.mp4](demo.mp4). The frames use a topology schematic; the pass/fail evidence comes from the local solver and MCP tests below.

## Reproduction

```bash
PATH="/home/andrii/.nvm/versions/node/v24.22.2/bin:$PATH" node_modules/.bin/vitest run src/modeling/mates/solver.test.ts --reporter=dot -t 'caller pose overrides on (fastened|planar) mates'
PATH="/home/andrii/.nvm/versions/node/v24.22.2/bin:$PATH" node_modules/.bin/vitest run tests/integration/mcp/solveMates.test.ts --reporter=dot -t 'rejects a pose override for a fastened mate'
```

The unit regression was first run before the repair: it failed because the promise resolved with `{ status: 'solved' }`. After the repair, both focused tests pass. Full command output and artifact hashes are in `verification/verification.txt`.

## Scope

This is local solver and MCP input validation. It does not demonstrate a deployed web build, physical simulation, rendered CAD motion, or hardware acceptance.
