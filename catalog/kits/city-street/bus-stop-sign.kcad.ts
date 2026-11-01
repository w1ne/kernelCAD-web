// Original kernelCAD low-poly bus stop pole: a tall pole with a flag sign
// carrying a ring emblem near the top and a timetable case at eye level.
// No text. Millimetres, Z up, sign faces ±Y.

meta({
  name: 'bus-stop-sign',
  license: 'CC0-1.0',
  title: 'Bus stop sign',
  description: 'Bus stop pole with a flag sign and ring emblem near the top and a timetable case at eye level. Knobs: flag style, sign, emblem, timetable and pole colours.',
  tags: ['bus stop', 'bus', 'sign', 'pole', 'transit', 'transport', 'timetable', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street', 'transit'],
  triangleBudget: 300,
});

const style = param('style', 'flag', { choices: ['flag', 'round'], label: 'Sign style' });
const sign = param('sign', '#f2f2ee', { label: 'Sign' });
const emblem = param('emblem', '#c8261e', { label: 'Emblem ring' });
const table = param('table', '#2a5ea8', { label: 'Timetable case' });
const pole = param('pole', '#3a3f45', { label: 'Pole' });

presets({
  yellow: { sign: '#f2c418', emblem: '#1e1e1e', table: '#1e1e1e' },
  green: { sign: '#2f7d4a', emblem: '#f2f2ee', table: '#2f7d4a' },
});

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Flat disc in the XZ plane (faces ±Y), thickness t, centred on (x, z).
const disc = (r: number, t: number, x: number, z: number) =>
  ngon(r, 12, Math.PI / 12).extrude(t).translate(0, 0, -t / 2).rotateX(90).translate(x, 0, z);

const H = 3000;
const bs = assembly('bus-stop-sign');
bs.part('pole', ngon(40, 8).extrude(H).color(pole));
bs.part('cap', ngon(48, 8).extrude(40).translate(0, 0, H).color(pole));
if (style.value === 'flag') {
  bs.part('flag', box(480, 24, 640, true).translate(270, 0, H - 380).color(sign));
  bs.part('emblem', disc(170, 34, 270, H - 300).color(emblem));
  bs.part('emblem-centre', disc(110, 44, 270, H - 300).color(sign));
  bs.part('flag-strip', box(480, 34, 110, true).translate(270, 0, H - 640).color(emblem));
} else {
  bs.part('flag', disc(300, 24, 0, H - 260).color(sign));
  bs.part('emblem', disc(240, 34, 0, H - 260).color(emblem));
  bs.part('emblem-centre', disc(170, 44, 0, H - 260).color(sign));
}
bs.part('timetable', box(380, 70, 520, true).translate(0, -55, 1500).color(table));
bs.part('timetable-panel', box(320, 10, 440, true).translate(0, -92, 1500).color(sign));

return bs.model();
