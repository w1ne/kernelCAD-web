# kernelCAD v0.17.2

## Summary

Adds a local collaboration gate for agents editing different parts of one assembly. The CLI merges a change-set onto the selected head, evaluates the merged candidate, and reports conflicts or shared requirement failures before the change is accepted.

## Highlights

### Local collaboration check

- `kernelcad collab check --file <assembly.kcad.ts> --base <base> --head <head> --yours <branch>` validates a local change-set against the selected head.
- The check reports `PASS`, `REJECT`, or `CONFLICT` with a machine-readable JSON report option.
- The new bracket-and-motor-plate example shows a safe fillet edit, a hole-pattern requirement rejection, and an overlapping hole conflict.
- The cookbook adds the `collab-gate` example and agent setup guidance.

### Mechanical runtime fixes

- Tendon/body clearance now accounts for the body capsule and contact margins consistently.
- Gravity checks use the corrected runtime session state from public PR #1140.

## Install and upgrade

kernelCAD is distributed as a self-contained archive attached to this GitHub Release.

```bash
curl -fsSL https://kernelcad.com/install.sh | sh
```

Pin this release:

```bash
curl -fsSL https://kernelcad.com/install.sh | KERNELCAD_VERSION=v0.17.2 sh
```

## Links

- Web app: https://kernelcad.com
- Source and issues: https://github.com/w1ne/kernelCAD-web
- Local collaboration example: https://github.com/w1ne/kernelCAD-web/tree/v0.17.2/examples/collab/bracket-and-motor-plate.kcad.ts
