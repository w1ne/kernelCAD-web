# Engraved Nameplate (v0.6.4 hero — sketch.text)

Build a flat mounting plate, 80 × 30 × 3 mm, with the text "KERNEL" engraved 1 mm into its top face, centered. Glyph cap height 12 mm. The result is one solid; the engraving must be visible from above at typical orbit angles.

Use `sketch.text("KERNEL", { size: 12, align: 'center', position: [40, 15] })` for the glyph outlines; extrude that sketch and subtract from the base plate to cut the engraving. Treat the bundled font as the default.
