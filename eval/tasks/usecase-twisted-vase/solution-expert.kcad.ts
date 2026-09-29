// U10 - Twisted hexagonal vase, 180mm tall, 90mm across at the base widening
// to 110mm at the rim, 60deg twist, 2mm wall, closed bottom, vase-mode print.
//
// IMPORTANT CAVEAT (see design-notes.md): a regular hexagon has 60-degree
// rotational symmetry, so rotating the TOP profile by exactly 60deg before
// lofting produces a solid that is geometrically IDENTICAL to a 0deg-twist
// loft (same vertex positions, just relabelled) -- this loft carries
// twistDeg:60 as requested, but the delivered shape does NOT visually read
// as "twisted". Getting a visibly twisted hex vase requires an intermediate
// (non-multiple-of-60) rotation sampled at several heights; every multi-
// station construction we tried hit a live kernelCAD bug or limitation
// (see design-notes.md) before this deadline, so this single-loft version
// is what is being delivered.
const acrossBottom = 90, acrossTop = 110, height = 180, twist = 60, wall = 2;
function hexagon(across) {
  const r = across / 2;
  let p = path();
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60) * Math.PI / 180;
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    if (i === 0) p = p.moveTo(x, y);
    else p = p.lineTo(x, y);
  }
  return p.close();
}
const bottom = hexagon(acrossBottom);
const top = hexagon(acrossTop);
const solidVase = bottom.loft(top, { spacing: height, twistDeg: twist });
const vase = solidVase.shell(wall, { face: { byNormal: 'Z' } });
return vase;
