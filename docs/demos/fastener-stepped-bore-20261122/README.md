# Continuous stepped clearance paths

The existing `verify` fastener-installation check measures explicit catalog screw
stations against the actual lowered BREP. This demo calls the local MCP handler,
renders each exact source in four canonical views, and records the measured
reports with a 16-second MP4.

| Source case | Result | Bore evidence |
| --- | --- | --- |
| Straight through-bore | pass | 3.5 mm diameter, 6.4 mm axial overlap |
| Full coaxial rear step | pass | 3.5 mm minimum diameter, 6.4 mm axial overlap |
| Two blind holes with a 0.2 mm web | partial | unsupported bore path |
| Rear step with a 0.4 mm side pocket | partial | incomplete wall coverage |

The web control visibly retains the native interpenetration warning: its screw
intersects the intentionally uncut web. That warning is expected negative evidence.

## Reproduce

Use Node 24 and the repository's locked dependencies. Existing Chrome sessions
were inspected first. Both lacked a usable WebGL context, so this recorded run
uses the native CLI's owned headless capture process with a 180-second bound.
The interactive browsers remain open. Capture limits do not change MCP budgets.

```sh
npx tsx scripts/generateFastenerInstallationCatalog.ts assets/parts
npm run build:cli
npm run build:player
npx tsx docs/demos/fastener-stepped-bore-20261122/capture-demo.mts
```

The authoring example is
`examples/fastener-installation/stepped-through-bore.kcad.ts`. It uses the existing
native hole/counterbore feature. Audit `{ part: 'screw', against: ['plate'] }`,
change `fixtureCase`, and repeat the same call.

`browser-capture-preflight.json` records the observed connection and WebGL
limitations. Canonical images come from the existing `kernelcad render inspect`
workflow and its native meshing, player, camera and tile capture.

The bundle retains exact source variants, canonical inspection manifests and
images, full measured reports, implementation/source hashes, encoding settings,
and decoded frames. It demonstrates local validation, not deployed behavior or
hardware acceptance.

## Measurement limits

Every joined wall must have full trimmed circular coverage. Its axis must match
at kernel precision, consecutive intervals must meet without overlap, both outer
ends must be open, and the common minimum-radius core must contain no material.
The minimum diameter bounds the entire path conservatively, including the
shaft-clipped endpoint envelope used for tilt. Installation allowances cannot
merge different axes or bridge a material web. Blind, breached, competing-axis,
and partial-continuation cases remain unknown.

The regression baseline at public source `8f77e907` had five expected behavioral
failures and eight passing adversarial controls. The new implementation passes
those cases, a separate internal-material obstruction control, and all 34 prior
fastener tests. The wider hole, DFM, MCP, and ratchet tests remain independent.

Engagement remains modeled axial overlap. Simplified catalog threads do not
certify thread contact, strength, torque, preload, or physical installation.
Four radial bearing samples do not establish full contact area or pressure.
