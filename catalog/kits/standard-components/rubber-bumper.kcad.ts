// Stepped vibration isolator with a wide mounting flange, waisted elastomer
// body, and a selectable male-stud or recessed threaded-insert mount.
meta({
  name: 'rubber-bumper',
  license: 'CC0-1.0',
  title: 'Rubber bumper',
  description: 'Stepped rubber vibration isolator with a broad mounting flange, narrowed crown and selectable male stud or recessed threaded insert. Knobs: size, mounting style, rubber, steel and zinc-plated hardware.',
  tags: ['rubber bumper', 'vibration mount', 'foot', 'isolation'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 420,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const mounting = param('mounting', 'male-stud', { choices: ['male-stud', 'threaded-insert'], label: 'Mounting interface' });
const steel = param('steel', '#85929a', { label: 'Stud steel' });
const rubber = param('rubber', '#353a3d', { label: 'Elastomer body' });
const zinc = param('zinc', '#b7c0c5', { label: 'Insert hardware zinc' });
presets({
  dark: { steel: '#3e484e', rubber: '#242729', zinc: '#727c81' },
  brass: { steel: '#646f75', rubber: '#2a2d2f', zinc: '#a28b68' },
  weathered: { steel: '#665b4d', rubber: '#3b3935', zinc: '#756d62' },
  clean: { steel: '#c1c9ce', rubber: '#454b4e', zinc: '#d1d7db' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('rubber-bumper');
const foot = cylinder(2 * s, 18 * s, 16)
  .union(cylinder(7 * s, 15 * s, 16).translate(0, 0, 1.9 * s))
  .union(cylinder(4 * s, 12 * s, 16).translate(0, 0, 8.8 * s))
  .subtract(cylinder(18 * s, 3.4 * s, 12).translate(0, 0, -s));
a.part('stepped-elastomer-foot', foot.color(rubber));

if (mounting.value === 'male-stud') {
  const washer = cylinder(1.2 * s, 7 * s, 12)
    .subtract(cylinder(1.4 * s, 4.5 * s, 12).translate(0, 0, -0.1 * s));
  a.part('stud-seat-washer', washer.translate(0, 0, 12.65 * s).color(zinc));
  a.part('male-mounting-stud', cylinder(14 * s, 4.4 * s, 12).translate(0, 0, 12.7 * s).color(steel));
} else {
  const insert = cylinder(6 * s, 6.8 * s, 12)
    .subtract(cylinder(7 * s, 3.2 * s, 12).translate(0, 0, -0.5 * s));
  a.part('threaded-insert', insert.translate(0, 0, 10.8 * s).color(zinc));
}

return a.model();
