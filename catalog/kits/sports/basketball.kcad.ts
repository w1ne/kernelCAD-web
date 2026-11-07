// Basketball: Faceted orange basketball with two dark curved channel seams wrapping around the pebbled cover. Low-poly sports prop in millimetres, Z up; materials: pebbled ball cover, channel rubber.
meta({
  name: 'basketball',
  license: 'CC0-1.0',
  title: 'Basketball',
  description: "Faceted orange basketball with two dark curved channel seams wrapping around the pebbled cover. Material controls: pebbled ball cover, channel rubber.",
  tags: ['basketball', 'ball', 'court', 'indoor sport', 'low poly', 'CC0'],
  kit: 'sports',
  category: 'prop',
  origin: 'base',
  compat: ['sports', 'recreation', 'indoor', 'outdoor'],
  triangleBudget: 800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const pebbledCover = param('pebbledCover', '#d47a32', { label: 'Pebbled ball cover' });
const channelRubber = param('channelRubber', '#302c29', { label: 'Channel rubber' });
presets({ clubColors: { pebbledCover: '#3979a3', channelRubber: '#272d32' } });
const p = assembly('basketball');
p.part('ball', sphere(62).translate(0, 0, 62).scale(scale).color(pebbledCover));


// Two continuous, shallow torus channels divide the orange ball into familiar panels.
p.part("equator-channel", torus(61.8, 0.65, 12).translate(0, 0, 62).color(channelRubber));
p.part("meridian-channel", torus(61.8, 0.4, 12).rotateX(90).translate(0, 0, 62.25).color(channelRubber));

return p.model();
