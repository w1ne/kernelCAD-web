kernelCAD rocket-engine routing example — 12 October 2026

Illustrative, hand-authored rigid-tube geometry. Units: millimetres.
engine-routed.kcad.ts: passing full assembly, 23 hollow tubes and 19 hardware parts.
engine-routed-twin.kcad.ts: changes only IgniterRunRise 268 to 308; one tube.clearance.overlap error plus the existing informational hole-authoring diagnostic.
engine-bare.kcad.ts: preserved port-bearing hardware example before routing; distinct source, not the routed STEP input.
engine-routed.report.json and engine-routed-twin.report.json: exact native evaluate --json outputs.
cartridge-180.report.json: native evaluation after changing CartridgeStation 190 to 180 in the good source.
engine-routed.step: real exported B-rep with 42 distinct connected solids (not a single fused engine).
bend-tables/: 23 CSVs using the existing formatBendTableCsv formatter on the exact verified native report. These bytes were not produced by a new CLI export invocation. manifest.json in this folder records original source, report and CSV hashes.
native-verification.json: final source/STEP/interference evidence summary.

Use a kernelCAD source checkout on develop with Node 22. The fabrication guard is source-checkout behavior, not a claim about npm 0.17.0.
  git clone --branch develop https://github.com/w1ne/kernelCAD-web.git
  cd kernelCAD-web
  npm ci --ignore-scripts
  npm run build:cli
Extract this ZIP into site/blog/rocket-engine-routing/ in that checkout, then:
  node dist/cli/index.js evaluate site/blog/rocket-engine-routing/engine-routed.kcad.ts --json
  node dist/cli/index.js evaluate site/blog/rocket-engine-routing/engine-routed-twin.kcad.ts --json
  node dist/cli/index.js export bend-table site/blog/rocket-engine-routing/engine-routed.kcad.ts -o out/rocket-bends
  node dist/cli/index.js export step site/blog/rocket-engine-routing/engine-routed.kcad.ts -o out/rocket.step
The broken evaluation exits unsuccessfully by design. The source guard refuses broken fabrication exports before writing new output; GLB/render remain inspectable.

Default rules: 6 mm clearance, 12 mm LOX/fuel separation, 25 mm hot-gas/other-fluid separation. Hot-gas/housing separation is still the default; no blanket 25 mm housing claim.
Cold bend radius >=3 OD; straight between bends >=2 OD and ends >=2.5 OD. Hot-gas radius >=1.5 OD and ends >=1 OD. Unbent direct straight links do not incur bend tangent/straight-length requirements.
Mass is nominal mild-steel geometry and pressureDropKPa is null. No pressure, combustion, thrust, thermal, flow, fit, loads, tolerance or manufacturing acceptance is established. Parts use authored at placement with no mates; structural review retains 42 floating-part warnings. Long control lines are unclamped. Hardware is generic authored display geometry, not catalog components.

The silent 45-second native video is a separate download, not in this ZIP.
Article: https://kernelcad.com/blog/rocket-engine-routing/
Studio: https://app.kernelcad.com/studio?gallery=rocket-engine-routing
