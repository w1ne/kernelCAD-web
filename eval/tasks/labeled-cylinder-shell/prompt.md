# Labeled cylinder shell

Build a hollow cylinder of radius 10 mm and height 20 mm. The wall thickness is 2 mm and the cylinder is open on top. Reference the open end via a label called `cap` declared on the cylinder's `faceLabels` option, then shell from that face.

Constraints:
- Use `faceLabels: { cap: 'top' }` on the cylinder creation op (canonical-alias label).
- Use `{ face: 'cap' }` in the shell call (label-driven consumption).
- Apply `.translate(5, 0, 0)` AFTER shelling — the label resolved before the transform; the transform must not break the result.
