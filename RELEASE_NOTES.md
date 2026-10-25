# kernelCAD v0.17.1

## Summary

v0.17.1 makes cable-driven mechanisms physically honest and gives MCP agents a
full physics check. Tendons can now have a hard length limit, fasteners use
real ISO geometry, and `verify({ check: 'physics' })` runs MuJoCo static
equilibrium and drop-on-release on a robotics assembly. The Allonic-style hand
also has a browser MuJoCo WebAssembly demo.

## Highlights

### Tendon length limits

- `arm.tendon(...)` accepts `maxLengthMm`. The MJCF exporter writes it as a
  MuJoCo `limited="true" range="0 L"` tendon limit, so a braided strap can go
  slack but cannot stretch past its braided length.
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
  MuJoCo: disconnect, interference, DOF, orphan checks, static equilibrium at
  sampled poses, and drop-on-release under gravity.
- Returns `{ ok, mechanism: 'real' | 'broken' | 'unverified', failures, coverage }`.
- The hosted server generation gate runs the same physics check, so a generated
  mechanism cannot pass by looking correct while collapsing under gravity.

### Browser hand demo

- A static MuJoCo WebAssembly viewer drives the Allonic-style hand with 20 N
  flexors and 25 N thumb opposition at a 0.2 ms step.
- Three.js draws the exported MJCF meshes and the 15 driven tendon paths.
- The page simulates once, keeps the frames, and replays them locally. No
  server job and no plug-in.

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
- Hand demo: https://kernelcad.com/demos/hand-wasm/
- Release post: https://kernelcad.com/blog/hand-physics-in-browser/
- Issues: https://github.com/w1ne/kernelCAD-web/issues
