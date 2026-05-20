// examples/cookbook/wayfarer-temple-ray-ban.kcad.ts
//
// W3 face-authoring demo: a stylised Wayfarer temple with a Ray-Ban brand
// emboss on the top face and a CE compliance mark engraved on the bottom.
//
// Note on chaining: each `embossText` runs as a boolean fuse/cut under the
// hood, so canonical face refs (`'top'` / `'bottom'`) only resolve on the
// raw primitive. We do both face authorings off the same un-transformed
// `temple` Shape, then union the engraved-bottom result with the raised-top
// result for the final geometry.

const length = 130;
const width = 4;
const thickness = 2;

const temple = box(length, width, thickness);

const branded = temple.embossText({
  textContent: 'Ray-Ban',
  face: 'top',
  size: 2,
  depth: 0.4,           // positive depth ⇒ emboss out of the top face
  align: 'center',
  anchorU: 0.5,
  anchorV: 0.5,
});

const certified = temple.embossText({
  textContent: 'CE',
  face: 'bottom',
  size: 1.2,
  depth: -0.3,          // negative depth ⇒ engrave into the bottom face
  align: 'center',
  anchorU: 0.85,
  anchorV: 0.5,
});

return branded.union(certified);
