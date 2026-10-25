# kernelCAD v0.17.1

## Summary

v0.17.1 makes cable-driven mechanisms physically honest and gives MCP agents a
full physics check. Tendons can declare a hard length limit, fasteners use real
ISO geometry, and `verify({ check: 'physics' })` runs the physics engine's
static-equilibrium and drop-on-release checks on an assembly.

## Highlights

### Tendon length limits

- `arm.tendon(...)` accepts `maxLengthMm`. The physics export writes it as a
  hard `limited` range, so a braided strap can go slack but cannot stretch past
  its braided length.
- Spring fields are optional for a limit-only strap.
- On the hand, capping each ligament at its undeformed length plus 0.5 mm cut
  the little-finger DIP axial slide from 5.40 mm to 0.25 mm at the same 0.2 ms
  step. The 10 N pull case still holds at 0.51 mm.

### ISO fasteners

- `lib.part`, `lib.stack`, `lib.insert` and the `lib.standard` shortcuts take
  `detail: 'full' | 'envelope'` (default `full`).
- Bolt stacks count the washer under the head and require thread past the nut
  face. A grip no stocked length reaches fails instead of silently choosing a
  short bolt.
- Nut heights follow ISO 4032. Threads use ISO 68-1 at ISO 261 coarse pitch.

### Physics in MCP

- New `verify({ check: 'physics' })` runs the full mechanism-truth probe with
  the physics engine: disconnect, interference, DOF, orphan checks, static
  equilibrium at sampled poses, and drop-on-release under gravity.
- Returns `{ ok, mechanism: 'real' | 'broken' | 'unverified', failures, coverage }`.
- The hosted server generation gate runs the same physics check, so a generated
  mechanism cannot pass by looking correct while collapsing under gravity.

### Install

- The CLI is a self-contained GitHub Release archive. There is no npm package.
- One line: `curl -fsSL https://kernelcad.com/install.sh | sh`.
- The same installer prints MCP setup for Claude Code, Codex, Gemini and the
  hosted ChatGPT / Claude connector.

## Quality Gates

- Release QC: `npm run qc` passed under Node 22.22.0.
- 8,521 tests passed, 130 skipped, 28 skipped files.
- `tsc -b --noEmit` and eslint passed on the changed packages.
- Platform: linux.

## Install And Upgrade

kernelCAD is distributed as a self-contained archive attached to this GitHub
Release. There is no npm package.

```bash
curl -fsSL https://kernelcad.com/install.sh | sh
```

Pin this release:

```bash
curl -fsSL https://kernelcad.com/install.sh | KERNELCAD_VERSION=v0.17.1 sh
```

Connect an agent:

```bash
# Claude Code, hosted MCP
claude mcp add --transport http kernelcad https://mcp.kernelcad.com/mcp
# Claude Code, local CLI
claude mcp add kernelcad -- kernelcad mcp
# Codex, local CLI
codex mcp add kernelcad -- kernelcad mcp
```

For repo development:

```bash
git clone https://github.com/w1ne/kernelCAD-web.git
cd kernelCAD-web
git checkout v0.17.1
npm install
npm run dev
```

## Links

- Web app: https://kernelcad.com
- Issues: https://github.com/w1ne/kernelCAD-web/issues
