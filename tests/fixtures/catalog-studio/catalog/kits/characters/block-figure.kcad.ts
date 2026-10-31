// Test fixture for the `?catalog=<kit>/<id>` Studio loader: a blocky figure
// with knobs of every kind the Params tab shows (choice, number, colour).
// Millimetres, Z up, feet on z = 0.

meta({
  name: 'block-figure',
  license: 'CC0-1.0',
  title: 'Block figure',
  description: 'Blocky stand-in character. Knobs: height, shoulder width, body and head colours.',
  tags: ['figure', 'character', 'placeholder'],
  kit: 'characters',
  category: 'character',
  origin: 'base',
  compat: ['character'],
  triangleBudget: 200,
});

const height = param('height', '1.75', { choices: ['1.55', '1.75', '1.95'], label: 'Height (m)' });
const shoulders = param('shoulders', 440, { min: 360, max: 520, step: 20, unit: 'mm', label: 'Shoulder width' });
const body = param('body', '#3f6fb5', { label: 'Body' });
const head = param('head', '#e2b48c', { label: 'Head' });

const h = Number(height.value) * 1000;
// Numeric knobs stay live as ParamRef expressions (no JS arithmetic on them).
const w = shoulders;
const figure = assembly('block-figure');
figure.part('legs', box(w.multiply(0.6), w.multiply(0.3), h * 0.45).color(body));
figure.part('torso', box(w, w.multiply(0.4), h * 0.4).translate(0, 0, h * 0.45).color(body));
figure.part('head', box(w.multiply(0.45), w.multiply(0.45), h * 0.15).translate(0, 0, h * 0.85).color(head));

return figure.model();
