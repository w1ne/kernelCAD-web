# kernelCAD v0.16.0

## Summary

Steal-list train on `develop`: drawings and GD&T, print loop, FEA gate, mesh-to-features, exploded views, cookbook hardware recipes, and Studio routing so Param arithmetic and TypeScript models run on the full kernel. Hero: drawing PDF → motor-mount (`napkin-sketch-to-3d`).

## Highlights

### Drawings and reconstruct
- Auto-dimension / GD&T on `svg-drawing`, feature callouts, section views.
- `drawing_to_cad`: vector PDF → editable `.kcad.ts` + assumption ledger.
- `mesh_to_features` / `kernelcad reconstruct`: mesh → param-driven feature tree.

### Print and FEA
- FDM `dfmSpec`, G-code export, `send_to_printer`.
- `feaStudy` / `run_fea` safety-factor gate (CalculiX + gmsh when installed).

### Mechanism, repair, sim
- Static-hold and `sweep_tolerance`.
- `repair_script` + `why_did_this_fail` (more candidate kinds in this cut).
- USD-Isaac export, `diff_geometry`.

### Cookbook and Studio
- Hardware recipes evaluate (ISO fastener, GT2, gears, T-slot, joinery, pipe, materials).
- Studio: Param `.add`/`.divide` hits the node kernel; TypeScript generics parse; `iso-4762-m2x4` ships in a committed seed catalog.

## Demo

`docs/demos/v0.16/napkin-sketch-to-3d/` — motor-mount rebuilt from its third-angle drawing.

## Quality Gates

- Required CI on `develop` (lint, build-and-checks, 8 test shards, test) green through #701–#704.
- `npm run qc:lint` and `qc:build` (including cookbook:evaluate) passed locally.
- Local unsharded `npm test` is not the release gate: drawing_to_cad needs `@napi-rs/canvas`; a few long examples timed out on this machine. GitHub Actions is the gate.
- Non-required `external-tools` job still fails to find gmsh in the CI venv (follow-up).

## Install And Upgrade

```bash
npm install -g kernelcad@0.16.0
```

```bash
git clone https://github.com/w1ne/kernelCAD-web.git
cd kernelCAD-web
git checkout v0.16.0
```

Studio auto-deploys from `develop` to app.kernelcad.com. Marketing site is a separate `kernelCAD-server` dispatch.

## Links

- Web app: https://app.kernelcad.com
- Issues: https://github.com/w1ne/kernelCAD-web/issues
