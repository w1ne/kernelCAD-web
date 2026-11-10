// A straight-through union fitting with two hollow pipe sockets, a true six-flat union nut and a visible elastomer joint seal.
meta({
  name: 'pipe-union',
  license: 'CC0-1.0',
  title: 'Pipe union',
  description: 'Straight-through pipe union with two hollow steel sockets, a six-flat brass nut and a separate rubber joint seal. Knobs: model size, steel, brass and seal rubber.',
  tags: ['pipe union', 'union fitting', 'pipe connector', 'plumbing'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 440,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const brass = param('brass', '#b28a4d', { label: 'Brass' });
const sealRubber = param('sealRubber', '#292e31', { label: 'Seal rubber' });
presets({
  dark: { steel: '#3e484e', brass: '#725938', sealRubber: '#181c1e' },
  brass: { steel: '#646f75', brass: '#c0944d', sealRubber: '#352a21' },
  weathered: { steel: '#665b4d', brass: '#8c734d', sealRubber: '#55483a' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const hex = (radius: number) => {
  let outline = path().moveTo(radius, 0);
  for (let i = 1; i < 6; i++) {
    const angle = (2 * Math.PI * i) / 6;
    outline = outline.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
  }
  return outline.close();
};
const a = assembly('pipe-union');
a.part('socket-a', cylinder(12*s, 16*s, 12).subtract(cylinder(14*s, 10*s, 12).translate(0, 0, -s)).color(steel));
a.part('union-nut', hex(19*s).extrude(12*s).translate(0, 0, 12*s)
  .subtract(cylinder(14*s, 10*s, 12).translate(0, 0, 11*s)).color(brass));
a.part('joint-seal', cylinder(1.5*s, 17.3*s, 12).translate(0, 0, 10.5*s)
  .subtract(cylinder(3.5*s, 16*s, 12).translate(0, 0, 9.5*s)).color(sealRubber));
a.part('socket-b', cylinder(12*s, 16*s, 12).subtract(cylinder(14*s, 10*s, 12).translate(0, 0, -s)).translate(0, 0, 24*s).color(steel));
return a.model();
