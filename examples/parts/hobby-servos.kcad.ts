// MG995 / MG996R and MG90S as datasheet-modelled envelopes (Tower Pro table A-F).
// Not manufacturer models: ear holes, spline and horns are NOT modelled (no
// dimensioned source). Use the connectors to mate a bracket plane to the ear
// faces and a horn/arm to the output axis; check hole positions on the real servo.
const big = await lib.standard.mg995();
const small = await lib.standard.mg90s();
const scene = assembly('Hobby servo envelopes');
scene.part('mg995', big.color('#2459c4'));
scene.part('mg90s', small.color('#c42459'), { at: [40, 0, 0] });
return scene.model();
