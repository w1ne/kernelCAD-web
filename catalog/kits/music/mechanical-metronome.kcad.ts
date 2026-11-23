// SPDX-License-Identifier: CC0-1.0
// Maelzel-style mechanical metronome.
// What makes it a metronome rather than a pyramid: a tapered wooden case on
// a moulded plinth with a recessed front channel, an ivory tempo scale with
// tick marks down that channel, and a steel pendulum pivoting low on the face
// with a brass sliding weight that sets the tempo. A brass winding key on the
// side and a turned finial on the apex finish it. The pendulum can be shown
// at rest or at either end of its swing.
// Generic visualization geometry at real size (about 0.23 m tall),
// millimetres, Z up, scale facing -Y, standing on z = 0.
meta({
  name: 'mechanical-metronome',
  license: 'CC0-1.0',
  title: 'Mechanical metronome',
  description: 'Maelzel-style mechanical metronome at real size: tapered wooden case on a moulded plinth with a recessed front channel, ivory tempo scale with tick marks, steel pendulum with a brass sliding weight, brass winding key and turned apex finial. Material controls: walnut case, brass weight and key, steel pendulum, ivory scale; pendulum swing choice. Concert, vintage and ebonised presets.',
  tags: ['metronome', 'mechanical metronome', 'pendulum', 'tempo', 'music', 'instrument', 'practice', 'low poly', 'CC0'],
  kit: 'music',
  category: 'prop',
  origin: 'base',
  compat: ['music', 'orchestra', 'stage', 'indoor'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const swing = param('swing', 'left', { choices: ['rest', 'left', 'right'], label: 'Pendulum position' });
const walnut = param('walnut', '#71462f', { label: 'Walnut case' });
const brass = param('brass', '#c19137', { label: 'Brass weight, key and finial' });
const steel = param('steel', '#aeb9be', { label: 'Steel pendulum' });
const ivory = param('ivory', '#efe6cf', { label: 'Ivory tempo scale' });

presets({
  concert: { walnut: '#8b5736' },
  vintage: { walnut: '#50362d', brass: '#9c7a3a', ivory: '#e2d3ae' },
  ebonised: { walnut: '#1f1b1c', brass: '#d1a543', ivory: '#f3efe6' },
});

const p = assembly('mechanical-metronome');
const add = (name, shape) => p.part(name, shape.scale(scale));

const rect = (w, d, c) => path()
  .moveTo(-w / 2 + c, -d / 2).lineTo(w / 2 - c, -d / 2).lineTo(w / 2, -d / 2 + c).lineTo(w / 2, d / 2 - c)
  .lineTo(w / 2 - c, d / 2).lineTo(-w / 2 + c, d / 2).lineTo(-w / 2, d / 2 - c).lineTo(-w / 2, -d / 2 + c).close();
const xy = (z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] });
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

// Moulded plinth and tapered pyramid case.
add('plinth', rect(132, 118, 10).loft([rect(132, 118, 10), rect(120, 106, 8), rect(112, 98, 6)], { planes: [xy(0), xy(10), xy(16), xy(24)], ruled: true }).color(walnut));
const Z0 = 24;
const Z1 = 205;
const W0 = 108;
const D0 = 94;
const W1 = 44;
const D1 = 40;
add('case', rect(W0, D0, 6).loft([rect(W1, D1, 4), rect(14, 14, 2)], { planes: [xy(Z0), xy(Z1), xy(Z1 + 14)], ruled: true }).color(walnut));
add('finial', turned([[0, 0], [8, 0], [10, 6], [5, 12], [7, 18], [0, 24]]).translate(0, 0, Z1 + 12).color(brass));

// Front face plane: y(z) runs from -D0/2 at Z0 to -D1/2 at Z1.
const lean = Math.atan((D0 - D1) / 2 / (Z1 - Z0));
const leanDeg = (lean * 180) / Math.PI;
const faceY = (z) => -D0 / 2 + ((D0 - D1) / 2) * ((z - Z0) / (Z1 - Z0));
// Recessed channel: a dark inset frame with the ivory scale inside.
const onFace = (shape, z, out) => shape.rotateX(-leanDeg).translate(0, faceY(z) - out, z);
add('channel-frame', onFace(box(34, 3, 150, true), 115, 1).color(walnut));
add('tempo-scale', onFace(box(18, 2, 132, true), 118, 2.5).color(ivory));
for (let i = 0; i < 12; i += 1) {
  const z = 60 + i * 10.5;
  add(`tick-${i}`, onFace(box(i % 3 === 0 ? 12 : 7, 1, 1.4, true), z, 3.6).translate(-3, 0, 0).color(walnut));
}

// Pendulum: steel rod pivoting low on the face, with a brass sliding weight.
const angle = swing.value === 'rest' ? 0 : swing.value === 'left' ? -18 : 18;
const PZ = 50;
const pendulum = (shape) => shape.rotateY(angle).rotateX(-leanDeg).translate(0, faceY(PZ) - 9, PZ);
add('pivot-boss', onFace(extrudePolygon(Array.from({ length: 8 }, (_, i) => [6 * Math.cos((Math.PI * i) / 4), 6 * Math.sin((Math.PI * i) / 4)]), 6).rotateX(90), PZ, 3).color(brass));
add('pendulum-rod', pendulum(box(3, 3, 170, true).translate(0, 0, 75)).color(steel));
add('pendulum-tip', pendulum(box(5, 5, 6, true).translate(0, 0, 162)).color(steel));
add('sliding-weight', pendulum(
  path().moveTo(-11, 0).lineTo(11, 0).lineTo(8, 22).lineTo(-8, 22).close().extrude(10).rotate([1, 0, 0], 90).translate(0, 5, 112),
).color(brass));

// Winding key on the right flank.
const flankX = W0 / 2 - ((W0 - W1) / 2) * ((60 - Z0) / (Z1 - Z0));
add('key-shaft', box(12, 6, 6, true).translate(flankX + 5, 0, 60).color(brass));
add('key-butterfly', path().moveTo(0, -14).lineTo(8, -16).lineTo(8, 16).lineTo(0, 14).close().extrude(4).rotate([0, 1, 0], 90).translate(flankX + 10, 0, 64).color(brass));

return p.model();
