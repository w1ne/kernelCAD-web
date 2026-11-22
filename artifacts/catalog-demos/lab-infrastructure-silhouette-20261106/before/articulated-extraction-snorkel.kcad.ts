// SPDX-License-Identifier: CC0-1.0
// Bench-mounted local extraction arm with a pivot stack, horizontal reach and flared intake hood.
meta({
  name: 'articulated-extraction-snorkel',
  license: 'CC0-1.0',
  title: 'Articulated extraction snorkel',
  description: 'Bench-mounted local extraction arm with a pivot stack, horizontal reach and flared intake hood. Editable material controls: enamel coating, stainless steel, structural steel; presets: cleanroom and high visibility.',
  tags: ['laboratory', 'lab infrastructure', 'research facility', 'low poly', 'CC0'],
  kit: 'lab-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['laboratory', 'research-lab', 'cleanroom', 'science-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const enamel = param('enamel', '#c9dedc', { label: 'Enamel coating' });
const stainless = param('stainless', '#b8c7ca', { label: 'Stainless steel' });
const steel = param('steel', '#53666e', { label: 'Structural steel' });
presets({
  cleanroom: { enamel: '#e7f0ed', stainless: '#d0d9d8', steel: '#75888d' },
  highVisibility: { enamel: '#f0f2e8', stainless: '#6f8488', steel: '#33464d' },
});
const p = assembly('articulated-extraction-snorkel');
p.part('mounting-base', box(378, 172.8, 55, true).translate(0, 0, 27.5).scale(scale).color(steel));
p.part('pedestal', cylinder(459, 30, 8).translate(0, 0, 55).scale(scale).color(steel));
p.part('pivot', cylinder(70, 48, 8).translate(378, 0, 442).scale(scale).color(enamel));
p.part('intake-flare', box(300, 240, 30, true).translate(756, 0, 567.5).scale(scale).color(enamel));

p.part('lower-arm', cylinder(378, 18, 10).rotateY(90).translate(0, 0, 485.5).scale(scale).color(stainless));
p.part('upper-arm', cylinder(360, 15, 10).rotateY(90).translate(420, 0, 611).scale(scale).color(stainless));
const intakeMouth = path().moveTo(-150, -120).lineTo(150, -120).lineTo(150, 120).lineTo(-150, 120).close();
const intakeNeck = path().moveTo(-102.5, -72.5).lineTo(102.5, -72.5).lineTo(102.5, 72.5).lineTo(-102.5, 72.5).close();
const intakeBell = intakeMouth.loft([intakeNeck], {
  planes: [
    { plane: 'XY' as const, origin: [0, 0, 0] as [number, number, number] },
    { plane: 'XY' as const, origin: [0, 0, 66] as [number, number, number] },
  ],
  ruled: true,
});
p.part('intake-hood', intakeBell.translate(756, 0, 582.5).scale(scale).color(steel));
return p.model();
