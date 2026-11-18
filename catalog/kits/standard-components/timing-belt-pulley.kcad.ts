// Timing pulley with a radial tooth crown, two retaining flanges, bolt heads, and a keyed shaft bore.
meta({
  name: 'timing-belt-pulley',
  license: 'CC0-1.0',
  title: 'Timing belt pulley',
  description: 'Timing pulley with a faceted tooth crown, paired retaining flanges, and a centered keyed shaft bore. Knobs: model size, aluminum, steel and flange hardware.',
  tags: ['timing pulley', 'belt pulley', 'drive component', 'shaft'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 1380,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const aluminum = param('aluminum', '#6fabc3', { label: 'Aluminum' });
const steel = param('steel', '#c8cfd2', { label: 'Steel' });
const hardware = param('hardware', '#29363e', { label: 'Flange hardware' });
presets({
  dark: { aluminum: '#365461', steel: '#3e484e', hardware: '#20272b' },
  brass: { aluminum: '#4a8a99', steel: '#646f75', hardware: '#c0944d' },
  weathered: { aluminum: '#677d75', steel: '#665b4d', hardware: '#51473b' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('timing-belt-pulley');
const toothCount = 20;
const pitch = (2 * Math.PI) / toothCount;
const toothProfile: [number, number][] = [];
for (let i = 0; i < toothCount; i++) {
  const center = i * pitch;
  if (i === 0) {
    const rootAngle = center - pitch * 0.5;
    toothProfile.push([18.2 * s * Math.cos(rootAngle), 18.2 * s * Math.sin(rootAngle)]);
  }
  for (const [radius, angle] of [
    [20.6 * s, center - pitch * 0.22],
    [20.6 * s, center + pitch * 0.22],
  ]) toothProfile.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  if (i < toothCount - 1) {
    const rootAngle = center + pitch * 0.5;
    toothProfile.push([18.2 * s * Math.cos(rootAngle), 18.2 * s * Math.sin(rootAngle)]);
  }
}
const crown = extrudePolygon(toothProfile, 18 * s)
  .subtract(cylinder(20 * s, 8 * s, 16).translate(0, 0, -s))
  .subtract(box(3.2 * s, 4.2 * s, 18 * s).translate(7 * s, -2.1 * s, 0))
  .translate(0, 0, 4 * s);
a.part('toothed-aluminum-crown', crown.color(aluminum));

const flange = (z: number) => {
  let shape = cylinder(4 * s, 24 * s, 16)
    .subtract(cylinder(6 * s, 8 * s, 12).translate(0, 0, -s));
  for (const [x, y] of [[-16, 0], [16, 0], [0, -16], [0, 16]]) {
    shape = shape.subtract(cylinder(1.8 * s, 2 * s, 8).translate(x * s, y * s, 2.4 * s));
  }
  return shape.translate(0, 0, z * s).color(steel);
};
a.part('lower-retaining-flange', flange(0));
a.part('upper-retaining-flange', flange(22));
for (const [face, z] of [['lower', 3], ['upper', 25]] as const) {
  for (const [i, [x, y]] of [[-16, 0], [16, 0], [0, -16], [0, 16]].entries()) {
    a.part(`${face}-flange-bolt-${i + 1}`, cylinder(1.15 * s, 1.5 * s, 10)
      .translate(x * s, y * s, z * s).color(hardware));
  }
}
a.part('shaft-key', box(2.6 * s, 3.6 * s, 17 * s)
  .translate(7.4 * s, -1.8 * s, 4.5 * s).color(steel));
return a.model();
