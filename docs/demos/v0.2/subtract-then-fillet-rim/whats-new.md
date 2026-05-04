# v0.2 — synchronized live-build demo

v0.2 adds face-aware fillet selection: the agent can now target a specific face (e.g. `{ face: 'top' }`) when rounding edges, so a fillet applied after a boolean subtract correctly follows only the top-face perimeter and hole rim rather than every edge. The live-build demo shows a square plate with a centered through-hole being constructed step-by-step — box, cylinder, subtract, then a single fillet call that rounds exactly the edges belonging to the top face.

![Demo](./demo.mp4)
![Panel](./panel.png)
