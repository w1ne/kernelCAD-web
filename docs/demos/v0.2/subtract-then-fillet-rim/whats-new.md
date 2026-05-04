# v0.2 — synchronized live-build demo

## Hero artifact

A square plate with a centered through-hole, then a fillet that rounds only the top-face perimeter and the hole rim — the canonical face ref `'top'` survives the subtract operation and resolves correctly downstream.

## Why memorable

- Recognizable in one second: the plate-with-hole silhouette is the universal "first CAD part" — every agent that sees this knows what's happening at a glance.
- New tool central: `{ face: 'top' }` is doing visible work — the fillet wraps the top face perimeter and the hole rim, exactly the edges that belong to the named face after a boolean subtract.
- Reads at 360°: the rotate phase shows the rounded top edges all the way around, including the hole's interior chamfer-edge — readable from any angle.

## What's new

v0.2 ships tracked face/edge refs through transforms and unambiguous booleans. The agent can target a canonical face (e.g. `{ face: 'top' }`) when applying edge features, and the kernel walks each face's lineage back to its originating primitive — so a fillet applied after a `subtract` correctly follows only the top-face perimeter and hole rim, not every edge on the shape. This is the foundation for the `faceLabels` API also added in this iteration: user-named refs build on the same lineage walker.

![Demo](./demo.mp4)
![Panel](./panel.png)
