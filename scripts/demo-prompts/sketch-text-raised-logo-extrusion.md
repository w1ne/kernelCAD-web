# Raised Logo Extrusion (v0.6.4 — sketch.text)

Build a square base 60 × 60 × 2 mm with the text "KC" extruded 1.5 mm upward as a raised relief, centered on the base, rotated 15° counter-clockwise for visual interest. Glyph cap height 20 mm.

Use `sketch.text("KC", { size: 20, align: 'center', position: [30, 30], rotation: 15 })` and chain `.extrude(1.5)`; then union with the base.
