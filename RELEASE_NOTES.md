# kernelCAD v0.4.0

v0.4.0 is focused on constrained sketching for agent-authored CAD. The release adds the missing sketch constraint operations needed to build and verify a recognizable object from a 2D reference, then turn that solved sketch into deterministic 3D geometry.

## Highlights

- Added sketch constraint commands for agent workflows, including symmetry, concentric, angle, tangent, distance, radius, diameter, horizontal, vertical, coincident, parallel, and perpendicular constraints.
- Exposed the complete solver toolbar actions in the web UI so the visual debugger can exercise the same constraint system as scripts and MCP tools.
- Centralized MCP tool registration and added a constrained-sketch round-trip test so new tools are covered through the public agent interface.
- Added a v0.4 rocket keychain demo: a CC0 Wikimedia rocket reference converted into a solved constrained sketch, then extruded into a printable keychain with raised porthole rings and through holes.
- Hardened the release demo pipeline so non-catalog, explicitly approved hero demos can pass release preflight without weakening catalog validation.
- Fixed command palette dialog accessibility by using Radix dialog title and description primitives.
- Cleaned up test quality by removing dead skips and strengthening codegen assertions.

## Demo

- Watch the release capture: [v0.4 rocket keychain demo](https://github.com/w1ne/kernelCAD-web/releases/download/v0.4.0/demo.mp4)
- View the static panel: [v0.4 rocket keychain panel](https://github.com/w1ne/kernelCAD-web/releases/download/v0.4.0/panel.png)
- Source reference: [Wikimedia Commons rocket with boosters icon](https://commons.wikimedia.org/wiki/File:Rocket_with_boosters_icon.svg), CC0.

## Quality Gates

- Local release QC passed through `npm run release -- 0.4.0`.
- Vitest during release: 1297 passed, 16 skipped, 1 todo.
- PR checks passed before merge: lint, build-and-checks, and test.
- Release deploys passed for Cloudflare Pages. GitHub Pages deploy passed; e2e was still running when the release notes were first published.

## Install And Upgrade

```bash
npm install -g kernelcad@0.4.0
```

For repo development:

```bash
git clone https://github.com/w1ne/kernelCAD-web.git
cd kernelCAD-web
git checkout v0.4.0
npm install
npm run dev
```

## Links

- Release PR: https://github.com/w1ne/kernelCAD-web/pull/89
- Tag: https://github.com/w1ne/kernelCAD-web/releases/tag/v0.4.0
