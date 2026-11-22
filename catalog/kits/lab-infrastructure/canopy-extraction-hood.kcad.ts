// SPDX-License-Identifier: CC0-1.0
// Suspended canopy hood with a broad capture canopy, paired posts and raised exhaust outlet.
meta({
  name: 'canopy-extraction-hood',
  license: 'CC0-1.0',
  title: 'Canopy extraction hood',
  description: 'Suspended canopy hood with a broad capture canopy, paired posts and raised exhaust outlet. Editable material controls: stainless steel, structural steel; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'structure',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const stainless = param('stainless', '#b8c7ca', { label: 'Stainless steel' });
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { stainless: '#d0d9d8', steel: '#75888d' },
  highVisibility: { stainless: '#6f8488', steel: '#33464d' },
});
const p = assembly('canopy-extraction-hood');
p.part('canopy-post--1', box(55, 55, 1600, true).translate(-450, 0, 800).scale(scale).color(steel));
p.part('canopy-post-1', box(55, 55, 1600, true).translate(450, 0, 800).scale(scale).color(steel));
p.part('canopy-lip', box(1150, 24, 45, true).translate(0, -322, 1522.5).scale(scale).color(steel));
p.part('exhaust-riser', box(350, 224, 300, true).translate(0, 0, 1830).scale(scale).color(stainless));

const canopySkirt = path().moveTo(-625, -350).lineTo(625, -350).lineTo(625, 350).lineTo(-625, 350).close();
const canopyCrown = path().moveTo(-360, -215).lineTo(360, -215).lineTo(360, 215).lineTo(-360, 215).close();
const taperedCanopy = canopySkirt.loft([canopyCrown], {
  planes: [
    { plane: 'XY' as const, origin: [0, 0, 0] as [number, number, number] },
    { plane: 'XY' as const, origin: [0, 0, 110] as [number, number, number] },
  ],
  ruled: true,
});
p.part('capture-canopy', taperedCanopy.translate(0, 0, 1570).scale(scale).color(stainless));
return p.model();
