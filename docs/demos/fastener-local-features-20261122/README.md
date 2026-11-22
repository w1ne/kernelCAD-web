# Local bore and bearing measurement

The existing `verify` fastener-installation check evaluates one explicit catalog
screw station against the actual lowered BREP. This demo runs the local MCP
handler, renders each exact source in four canonical views, and encodes a
16-second video from those renders and measured reports.

| Source case | Result | Measured head gap |
| --- | --- | --- |
| Intact bore with a remote edge notch | pass | 0 mm |
| Split coplanar bearing land | pass | 0 mm |
| Same land with a lifted screw | fail | 1.5 mm |
| Narrow side pocket through half the bore depth | partial | 0 mm; bore unknown |

The lifted case also retains unknown bore evidence where the shank enters the
partial head-clearance relief. The measured bearing-gap failure is independent
of that unsupported geometry.

## Reproduce

Use Node 24 and the repository's locked dependencies.

```sh
npx tsx scripts/generateFastenerInstallationCatalog.ts assets/parts
npm run build:cli
npm run build:player
npx tsx docs/demos/fastener-local-features-20261122/capture-demo.mts
```

The current authoring example is
`examples/fastener-installation/local-feature-mount.kcad.ts`. Its station is
`{ part: 'screw', against: ['plate'] }`. Change `fixtureCase` and
`liftedHeadMm` in source, then repeat the same verification call.

The bundle retains source variants, canonical inspection manifests and images,
full measured reports, implementation/source hashes, encoding settings, and
decoded video frames. The video presents local validation. It is not a hosted
deployment receipt or hardware acceptance.

## Measurement limits

A local full bore must have complete trimmed cylindrical wall coverage and pass
strict open-end probes. Remote notches cannot substitute for the selected bore.
Coplanar trimmed faces can jointly supply the four radial bearing-support
samples. Faces at different heights cannot be combined. A closer unsupported
face blocks a farther bearing candidate.

These checks establish geometric gaps and overlap. Four radial samples do not
establish full contact area or contact pressure. Simplified catalog threads do
not establish torque, preload, thread strength, fatigue, or physical installation.
