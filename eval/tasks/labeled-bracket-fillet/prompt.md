# Labeled bracket fillet

Build a 50×30×10 mm rectangular bracket. Label the top face as `rim` using the `faceLabels` option, then fillet the rim with a 3 mm radius referencing the label.

Constraints:
- Use the `faceLabels` option on the creating op to declare the rim label.
- Use `{ face: 'rim' }` in the fillet call.
- The output must be a valid solid (positive volume, watertight).
