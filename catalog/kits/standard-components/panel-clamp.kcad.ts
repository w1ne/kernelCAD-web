// CC0 scene prop, not a rated fixture. The pressure screw passes through a
// drilled overhead bridge; its pad moves toward the fixed base to clamp stock.
meta({
  name: 'panel-clamp',
  license: 'CC0-1.0',
  title: 'Panel clamp',
  description: 'Illustrative CC0 low-poly panel clamp with a fixed base, overhead bridge, bored pressure-screw guide and a separate rubber pressure pad. Not load-rated, threaded or manufacturing CAD. Controls: model size and three material colors.',
  tags: ['panel clamp', 'edge clamp', 'mounting hardware', 'fixture'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 320,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const zinc = param('zinc', '#cbd1d5', { label: 'Zinc-plated steel' });
const rubber = param('rubber', '#353a3d', { label: 'Rubber' });
presets({
  dark: { steel: '#3e484e', zinc: '#929da3', rubber: '#242729' },
  brass: { steel: '#646f75', zinc: '#c29a5c', rubber: '#2a2d2f' },
  weathered: { steel: '#665b4d', zinc: '#a19682', rubber: '#3b3935' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
// A single supported C-frame: the back upright joins the base and bridge.
const base = block(-24*s,-20*s,0,48*s,40*s,6*s);
const upright = block(-24*s,14*s,6*s,48*s,6*s,27*s);
const bridge = block(-15*s,-10*s,27*s,30*s,30*s,6*s);
const screwBore = cylinder(8*s,3.4*s,16).translate(0,-2*s,26*s);
const frame = base.union(upright).union(bridge).subtract(screwBore);
// The screw is supported inside the bridge and carries the contact pad. The
// bore is wider than the shaft, while the head rests above the bridge.
const shaft = cylinder(22*s,2.9*s,16).translate(0,-2*s,13*s);
const head = cylinder(4*s,5*s,16).translate(0,-2*s,33*s);
const pressurePad = cylinder(3*s,7*s,16).translate(0,-2*s,10*s);
const a = assembly('panel-clamp');
a.part('c-frame',frame.color(steel));
a.part('pressure-screw',shaft.union(head).color(zinc));
a.part('rubber-pad',pressurePad.color(rubber));
return a.model();
