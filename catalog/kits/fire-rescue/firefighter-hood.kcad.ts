// SPDX-License-Identifier: CC0-1.0
// Firefighter particulate hood shown on a display headform: a knit balaclava that
// rounds over the crown, a face opening framed by an elastic band, a long bib that
// flares over the shoulders with a stitched hem, and a care label at the nape.
// The rounded crown with a framed face opening over a flared bib is what reads as a hood.
// Generic visualization geometry, millimetres, Z up, stand base on z = 0, face points -Y.
meta({
  name: "firefighter-hood",
  license: 'CC0-1.0',
  title: "Firefighter protective hood",
  description: "Knit particulate hood on a display headform with a rounded crown, elastic face-opening band, flared shoulder bib, stitched hem and nape label. Material controls: protective fabric, safety trim, headform and display stand; bib length choice; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'hood', 'balaclava', 'ppe', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const bibLength = param('bibLength', 'long', { choices: ['short', 'long'], label: 'Bib length' });
const fabricColor = param('fabricColor', '#c34b35', { label: 'Protective fabric' });
const safetyTrimColor = param('safetyTrimColor', '#e4cc55', { label: 'Safety trim' });
const headformColor = param('headformColor', '#d9c7b0', { label: 'Display headform' });
const standColor = param('standColor', '#3b4045', { label: 'Display stand' });
presets({
  weathered: { fabricColor: '#8c5545', safetyTrimColor: '#b2a04e', headformColor: '#bfb3a2', standColor: '#4e4c48' },
  highVisibility: { fabricColor: '#d67e2d', safetyTrimColor: '#f0df67', headformColor: '#ece2d4', standColor: '#2b2f33' },
  carbonKnit: { fabricColor: '#2f3236', safetyTrimColor: '#c34b35' },
});

const longBib = bibLength.value === 'long';
const p = assembly("firefighter-hood");
const add = (name, shape, finish = fabricColor) => p.part(name, shape.scale(scale).color(finish));

// Elliptical ring of n points centred at (0, cy): rx across, ry front-to-back.
const N = 16;
const ring = (rx, ry, cy = 0) => {
  let pb = path().moveTo(rx, cy);
  for (let i = 1; i < N; i += 1) {
    const t = (i / N) * Math.PI * 2;
    pb = pb.lineTo(rx * Math.cos(t), cy + ry * Math.sin(t));
  }
  return pb.close();
};
// Stack rings at heights z: stations are [z, rx, ry, cy].
const stack = (st) =>
  ring(st[0][1], st[0][2], st[0][3]).loft(
    st.slice(1).map(([, rx, ry, cy]) => ring(rx, ry, cy)),
    { planes: st.map(([z]) => ({ plane: 'XY', origin: [0, 0, z] })), ruled: true },
  );
// Flat elliptical disc facing -Y, rx across and rz tall, front face at y.
const facePlate = (rx, rz, y, depth, z, dome = 1) =>
  stack([[0, rx, rz, 0], [depth * 0.6, rx * (0.5 + dome * 0.5), rz * (0.5 + dome * 0.5), 0], [depth, rx * dome * 0.7, rz * dome * 0.75, 0]])
    .rotateX(90).translate(0, y + depth, z);

// Display stand: weighted base and post up into the bib.
add('stand-base', cylinder(18, 150, 20), standColor);
add('stand-post', cylinder(90, 26, 12).translate(0, 0, 18), standColor);

// Bib drape: flares from the neck over the shoulders, with a stitched hem band.
const bibZ = longBib ? 100 : 160;
add('bib-drape', stack([
  [bibZ, longBib ? 215 : 170, longBib ? 150 : 125, 6],
  [bibZ + 50, longBib ? 190 : 150, longBib ? 135 : 112, 6],
  [250, 96, 92, 8],
  [300, 80, 82, 10],
]), fabricColor);
add('bib-hem', stack([[bibZ - 6, (longBib ? 218 : 173), (longBib ? 153 : 128), 6], [bibZ + 12, (longBib ? 218 : 173), (longBib ? 153 : 128), 6]]), safetyTrimColor);

// Head: neck up over a rounded crown, slightly fuller at the back of the skull.
add('hood-head', stack([
  [298, 80, 82, 10],
  [340, 90, 98, 12],
  [400, 98, 108, 14],
  [455, 94, 104, 16],
  [500, 76, 86, 16],
  [530, 46, 54, 14],
  [542, 14, 16, 12],
]), fabricColor);

// Face opening: elastic band frames the headform face, which sits proud of the knit.
add('face-band', facePlate(60, 86, -99, 10, 410), safetyTrimColor);
add('headform-face', facePlate(48, 74, -110, 22, 410, 0.85), headformColor);
add('headform-nose', box(16, 16, 30, true).translate(0, -114, 404), headformColor);
add('headform-brow', box(64, 8, 8, true).translate(0, -108, 436), headformColor);

// Nape care label and a crown seam ridge.
add('nape-label', box(56, 6, 34, true).translate(0, 98, 340), safetyTrimColor);
add('crown-seam-back', box(8, 70, 10, true).rotateX(-34).translate(0, 66, 506), safetyTrimColor);
add('crown-seam-top', box(8, 80, 10, true).translate(0, 18, 538), safetyTrimColor);

return p.model();
