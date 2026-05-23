# kernelCAD v0.11.0

v0.11.0 is the release-prep line for agent-authored physical CAD. It closes the 2D path-NURBS authoring gap, hardens visual/inspection review, and refreshes the gallery with physically connected watch and ratchet-stool examples.

## Highlights

- Added 2D NURBS path authoring with `path().spline(...)`, `path().nurbsSegment(...)`, and `path().hermiteG2(...)`.
- Added MCP edit tools for those path operations: `add_path_spline`, `add_path_nurbs_segment`, and `add_path_hermite_g2`.
- Added deterministic render-inspection channels for RGB, mask, depth, and normals so visual review can carry machine-readable evidence instead of relying only on screenshots.
- Hardened the design loop so `assembly.visual.review-incomplete` and `assembly.visual.review-evidence-weak` cannot be bypassed with review-warning allow-lists.
- Added/updated gallery examples for the Royal Pop pocket watch and the exposed ratchet height-adjust stool.
- Kept Ray-Ban Meta / Wayfarer as a future benchmark artifact rather than a featured release item until the surface and loop quality are strong enough.

## Agent And CAD Authoring

- `review_cad` now exposes the current visual checklist and `gripperAperture` schema through the MCP tool registry.
- Skill docs now advertise the current MCP/tool surface and render-inspection bundle channels.
- The gallery feature policy is enforced in code: only one entry per calendar quarter can set `featured: true`.

## Quality Gates

Run these before tagging/publishing:

```bash
npm run lint
npx tsc --noEmit -p tsconfig.cli.json
npx tsc --noEmit -p tsconfig.json
npm run test:package
npm run site:test
npm test
git diff --check
```

The package version is intentionally staged at `0.11.0`; the stable `v0.11.0` tag and npm publication should be created only after the release branch is merged and the final full-suite gates pass.

## Install And Upgrade

After publish:

```bash
npm install -g kernelcad@0.11.0
```

For repo development:

```bash
git clone https://github.com/w1ne/kernelCAD-web.git
cd kernelCAD-web
git checkout v0.11.0
npm install
npm run dev
```
