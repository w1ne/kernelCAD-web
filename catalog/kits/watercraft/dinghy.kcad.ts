// Original kernelCAD inflatable tender with selectable size and outboard motor.

meta({
  name: 'dinghy', license: 'CC0-1.0', title: 'Inflatable dinghy',
  description: 'Inflatable tender with rounded side tubes, a transom, floor and thwart seat, with an optional compact outboard. Knobs: length, engine, tube, floor and accent colours.',
  tags: ['dinghy', 'inflatable boat', 'tender', 'outboard', 'watercraft', 'harbor'], kit: 'watercraft', category: 'vehicle', origin: 'base',
  compat: ['water', 'harbor', 'coastal', 'boat'], triangleBudget: 420,
});

const length = param('length', '2400', { choices: ['2000', '2400', '2800'], label: 'Length (mm)' });
const engine = param('engine', 'yes', { choices: ['yes', 'no'], label: 'Outboard motor' });
const tube = param('tube', '#b4b3a2', { label: 'Inflatable tube' });
const floor = param('floor', '#4c5c58', { label: 'Floor and seat' });
const accent = param('accent', '#d65a3a', { label: 'Transom and motor' });
presets({ rescue: { tube: '#e0d9c8', accent: '#df5b3f' }, tender: { tube: '#aab8ac', accent: '#334451' } });

const L = Number(length.value);
const W = L * 0.42;
const boat = assembly('dinghy');
const plan = extrudePolygon([
  [0, L * 0.48], [W * 0.32, L * 0.33], [W * 0.45, L * 0.08], [W * 0.45, -L * 0.37],
  [W * 0.35, -L * 0.48], [-W * 0.35, -L * 0.48], [-W * 0.45, -L * 0.37], [-W * 0.45, L * 0.08], [-W * 0.32, L * 0.33],
], 100).translate(0, 0, 0);
boat.part('floor', plan.color(floor));
boat.part('left-tube', cylinder(L, 100, 10).rotateX(90).translate(-W * 0.39, L / 2, 120).color(tube));
boat.part('right-tube', cylinder(L, 100, 10).rotateX(90).translate(W * 0.39, L / 2, 120).color(tube));
boat.part('bow-tube', cylinder(W * 0.82, 100, 10).rotateY(90).translate(-W * 0.41, L * 0.38, 120).color(tube));
boat.part('stern-transom', box(W * 0.74, 90, 260, true).translate(0, -L * 0.4, 130).color(accent));
boat.part('seat', box(W * 0.68, 150, 42, true).translate(0, -L * 0.02, 150).color(floor));
if (engine.value === 'yes') {
  boat.part('outboard-bracket', box(110, 90, 190, true).translate(0, -L * 0.43, 130).color(accent));
  boat.part('outboard-leg', cylinder(300, 24, 8).translate(0, -L * 0.48, 0).color(accent));
  boat.part('propeller', box(170, 35, 24, true).translate(0, -L * 0.48, 18).color(floor));
}
return boat.model();
