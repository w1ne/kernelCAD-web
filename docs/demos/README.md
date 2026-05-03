# Demos

Per-iteration visual artifact set for the v0.2-to-v1.0 gap-closure sprint. Per the gap-closure roadmap §H11/H12.

## Layout

```
docs/demos/
├── README.md                    (this file)
├── v0.X/                        (per-module ship demos — one folder per shipped v0.X.0 module)
│   ├── demo.gif                 (≤30s GIF or MP4 — terminal-on-left + 3D render-on-right)
│   ├── panel.png                (single PNG: prompt | code | render | score)
│   └── whats-new.md             (one-paragraph blurb explaining the capability gain)
└── gates/
    └── G<N>/                    (per coverage-gate aggregate reels — G1 / G2 / G3 / G4)
        └── reel.mp4             (≤2-minute video stitching that gate's per-module demos)
```

## Rules (enforced policy)

- **Per-module ship gate adds a 6th criterion**: visual artifact set committed under `docs/demos/v0.X/`. No artifact, no `v0.X.0` tag.
- **Per coverage-gate transition** also adds an aggregate reel under `docs/demos/gates/G<N>/`.
- **Captured during a real harness run, not staged.** The agent loop must be visible in the terminal capture.
- **Embedded in:** GitHub release notes (mandatory), CHANGELOG entries (markdown image embed), public-benchmark submission notes, the public examples gallery.

## Authoring

The demo capture pipeline lives at `scripts/captureDemo.ts` (workstream #21 fills it in as part of the visual verifier loop). The canonical layout template lives at `scripts/demo-template/`.

## Reevaluation hook

Reevaluation cadence (Axis #6) verifies that every workstream that shipped since the last gate has its `docs/demos/v0.X/` folder populated. Missing demos are 🔥 blockers.
