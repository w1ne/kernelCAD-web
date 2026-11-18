// SPDX-License-Identifier: CC0-1.0
// Beekeeper veil shown on a display stand. The round-hat style is a wide-brimmed
// hat with a hat band over a cylinder of dark mesh held off the face by wire
// hoops, drawn in at the neck by an elastic skirt. The fencing style replaces the
// hat with a fabric hood and a round mesh face window. A dark see-through mesh
// hanging from a wide brim is what makes it a bee veil rather than a sun hat.
// Generic visualization geometry, millimetres, Z up, stand base on z = 0, face points -Y.
meta({
  name: "beekeeper-veil-hood",
  license: 'CC0-1.0',
  title: "Beekeeper veil hood",
  description: "Beekeeper veil on a display stand: wide round brim, crown and hat band over a hooped mesh veil with an elastic neck skirt, or a fencing-style fabric hood with a round mesh face window. Material controls: hat and skirt fabric, veil mesh, band and hoop trim, display stand. Style choice; fieldReady and sunWorn presets.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'veil', 'ppe', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const style = param('style', 'round-hat', { choices: ['round-hat', 'fencing'], label: 'Veil style' });
const fabric = param('fabric', "#ece6d4", { label: "Hat, hood and neck skirt fabric" });
const mesh = param('mesh', "#2c332f", { label: "Veil mesh" });
const trim = param('trim', "#8a6a42", { label: "Hat band, hoops and elastic" });
const stand = param('stand', "#4a4f52", { label: "Display stand" });
presets({
  fieldReady: { fabric: '#f6f3ea', mesh: '#1f2522', trim: '#c49a3a', stand: '#5a6064' },
  sunWorn: { fabric: '#c9bc9a', mesh: '#3d433f', trim: '#5f4a32', stand: '#3a3d40' },
});

const p = assembly("beekeeper-veil-hood");
const add = (name, shape) => p.part(name, shape.scale(scale));

// Elliptical ring of N points: rx across, ry front-to-back, centred at (0, cy).
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
  ring(st[0][1], st[0][2], st[0][3] ?? 0).loft(
    st.slice(1).map(([, rx, ry, cy]) => ring(rx, ry, cy ?? 0)),
    { planes: st.map(([z]) => ({ plane: 'XY', origin: [0, 0, z] })), ruled: true },
  );

// Display stand: weighted base and a post up into the neck skirt.
add('stand-base', cylinder(16, 130, 20).color(stand));
add('stand-post', cylinder(270, 22, 12).translate(0, 0, 16).color(stand));

// Neck skirt flares over the shoulders and is drawn in by an elastic band.
add('neck-skirt', stack([[220, 165, 150], [262, 140, 128], [300, 112, 104], [318, 110, 102]]).color(fabric));
add('neck-elastic', stack([[292, 118, 110], [306, 116, 108]]).color(trim));

if (style.value === 'round-hat') {
  // Mesh cylinder widens from the neck to the brim so it stands off the face.
  add('veil-mesh', stack([[316, 110, 104], [380, 150, 145], [460, 182, 178], [532, 198, 196]]).color(mesh));
  add('veil-hoop-lower', torus(150, 3, 24).translate(0, 0, 382).color(trim));
  add('veil-hoop-upper', torus(184, 3, 24).translate(0, 0, 462).color(trim));
  // Wide flat brim, a domed crown and a band where they meet.
  add('hat-brim', stack([[528, 236, 236], [536, 232, 232], [546, 140, 140], [550, 112, 112]]).color(fabric));
  add('hat-crown', stack([[548, 112, 112], [600, 108, 108], [642, 92, 92], [664, 58, 58], [672, 18, 18]]).color(fabric));
  add('hat-band', stack([[548, 115, 115], [572, 114, 114]]).color(trim));
  add('hat-vent', torus(60, 3, 20).translate(0, 0, 664).color(trim));
} else {
  // Fencing hood: a fabric dome over the head with a round mesh face window.
  add('hood-shell', stack([
    [316, 112, 104, 8],
    [380, 140, 136, 10],
    [460, 150, 146, 12],
    [540, 140, 136, 14],
    [600, 108, 106, 14],
    [636, 56, 56, 12],
    [646, 16, 16, 10],
  ]).color(fabric));
  // The window sits proud of the hood front so the mesh reads from the side too.
  const window = stack([[0, 112, 104], [24, 108, 100], [34, 96, 90]]).rotateX(90).translate(0, -128, 470);
  add('face-window-mesh', window.color(mesh));
  add('face-window-hoop', torus(110, 5, 24).rotateX(90).translate(0, -140, 470).color(trim));
  add('crown-seam', box(8, 210, 8, true).translate(0, 18, 640).color(trim));
}

return p.model();
