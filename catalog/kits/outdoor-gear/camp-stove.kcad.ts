// Original low-poly backpacking stove with an integrated or remote fuel can.
// Millimetres, Z up, feet at z = 0.

meta({
  name: 'camp-stove',
  license: 'CC0-1.0',
  title: 'Camp stove',
  description: 'Compact backpacking burner with pot supports and an integrated or remote fuel canister. Knobs: stove style, body, burner and fuel colours.',
  tags: ['camp stove', 'camping stove', 'burner', 'backpacking', 'cooking', 'outdoor'],
  kit: 'outdoor-gear',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'camping', 'hiking', 'trail'],
  triangleBudget: 280,
});

const style = param('style', 'integrated', { choices: ['integrated', 'remote'], label: 'Fuel setup' });
const body = param('body', '#4c5154', { label: 'Stove body' });
const burner = param('burner', '#c7c9c6', { label: 'Burner and supports' });
const fuel = param('fuel', '#c98336', { label: 'Fuel canister' });

const stove = assembly('camp-stove');
if (style.value === 'remote') {
  stove.part('burner-body', box(280, 230, 76, true).translate(0, 0, 38).color(body));
  stove.part('burner-ring', cylinder(24, 72, 8).translate(0, 0, 82).color(burner));
  stove.part('left-pot-arm', box(220, 22, 18, true).translate(0, 0, 104).color(burner));
  stove.part('front-pot-arm', box(22, 220, 18, true).translate(0, 0, 104).color(burner));
  stove.part('control-knob', cylinder(30, 22, 8).rotateX(90).translate(0, -118, 50).color(fuel));
  stove.part('remote-canister', cylinder(220, 88, 10).translate(350, 0, 0).color(fuel));
  stove.part('fuel-hose', box(300, 18, 18, true).rotateZ(-10).translate(176, 12, 42).color(body));
} else {
  stove.part('integrated-canister', cylinder(210, 84, 10).translate(0, 0, 0).color(fuel));
  stove.part('burner-mount', cylinder(34, 50, 8).translate(0, 0, 202).color(body));
  stove.part('burner-ring', cylinder(22, 42, 8).translate(0, 0, 230).color(burner));
  stove.part('left-pot-arm', box(230, 22, 18, true).translate(0, 0, 250).color(burner));
  stove.part('front-pot-arm', box(22, 230, 18, true).translate(0, 0, 250).color(burner));
  stove.part('control-knob', cylinder(28, 20, 8).rotateX(90).translate(0, -58, 212).color(body));
}

return stove.model();
