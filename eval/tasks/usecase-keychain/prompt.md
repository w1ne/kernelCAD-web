# Typical use case U13: name keychain

> Keychain 60×25×4 mm with rounded corners, the text 'ANNA' raised 1 mm, and
> a 5 mm hole for a ring.

The text prints in a second colour, so it is its own part. Pass criteria (the
harness checks each one, ±0.1 mm):

- An assembly with two parts: `body` (one closed, valid solid) and `text`
  (the four closed glyphs A, N, N, A), with different colours.
- Body: 60 × 25 × 4 mm, centred on the origin, bottom at z = 0, rounded
  corners.
- Ring hole Ø5 through the body at x = −22, y = 0.
- Text raised 1 mm: it sits on the top face (z = 4…5), inside the outline,
  clear of the ring hole.
- `dfmSpec({ minWall: 1.2 })` passes for the body; STEP re-imports as five
  solids (body + four glyphs); STL is watertight; the 3MF has both parts
  with their own colours.

End with `return <assembly>.model();`.
