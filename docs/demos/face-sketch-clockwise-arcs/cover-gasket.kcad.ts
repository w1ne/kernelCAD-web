// A gasket cut to the outline of a rounded cover plate.
//
// The cover is 60 × 40 × 6 mm with R5 corners and four Ø4.5 mm screw holes.
// `faceSketch('top')` reads its top face back as a 2D profile: the rounded
// outline plus the four holes. Extruding that profile 1.5 mm gives the gasket.

const cover = box(60, 40, 6)
  .fillet(5, { parallelTo: 'z' })
  .hole('top', { u: -22, v: -12, diameter: 4.5, depth: 'through' })
  .hole('top', { u: 22, v: -12, diameter: 4.5, depth: 'through' })
  .hole('top', { u: -22, v: 12, diameter: 4.5, depth: 'through' })
  .hole('top', { u: 22, v: 12, diameter: 4.5, depth: 'through' });

const outline = await cover.faceSketch('top');
return outline.extrude(1.5);
