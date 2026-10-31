// Original kernelCAD low-poly street litter bin: faceted tapered body on a
// plinth with a rim band and a hooded or flat lid. Millimetres, Z up.

meta({
  name: 'trash-bin',
  title: 'Street litter bin',
  description: 'Faceted public litter bin on a plinth with a rim band and a hooded or flat lid. Knobs: lid style, facets, body, band and lid colours.',
  tags: ['trash', 'bin', 'litter', 'garbage', 'waste', 'rubbish', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street'],
  triangleBudget: 220,
});

const lid = param('lid', 'hood', { choices: ['hood', 'flat'], label: 'Lid style' });
const sides = param('sides', '8', { choices: ['6', '8', '10'], label: 'Facets' });
const body = param('body', '#2f5d3a', { label: 'Body' });
const band = param('band', '#c9a64a', { label: 'Band' });
const top = param('top', '#26292c', { label: 'Lid' });

presets({
  black: { body: '#232528', band: '#c9a64a', top: '#232528' },
  red: { body: '#a8262b', band: '#e6e6e0', top: '#2a2a2a' },
});

const s = Number(sides.value);
const ngon = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < s; k++) {
    p = p.lineTo(r * Math.cos((2 * Math.PI * k) / s), r * Math.sin((2 * Math.PI * k) / s));
  }
  return p.close();
};
const frustum = (r0: number, r1: number, z0: number, z1: number) =>
  ngon(r0).loft(ngon(r1), { spacing: z1 - z0, ruled: true }).translate(0, 0, z0);

const bin = assembly('trash-bin');
bin.part('plinth', frustum(250, 235, 0, 60).color(top));
bin.part('body', frustum(250, 285, 60, 760).color(body));
bin.part('band', frustum(298, 298, 760, 830).color(band));
if (lid.value === 'hood') {
  bin.part('lid-skirt', frustum(310, 310, 830, 860).color(top));
  bin.part('lid', frustum(310, 140, 860, 970).color(top));
  bin.part('knob', frustum(60, 40, 970, 1000).color(band));
} else {
  bin.part('lid', frustum(305, 290, 830, 870).color(top));
}

return bin.model();
