meta({
  name: "rain-gauge",
  license: 'CC0-1.0',
  title: "Garden rain gauge",
  description: "Marked rain gauge on a ground stake with a clear measuring tube and broad mounting bracket. Knobs: gauge height and frame and tube colours.",
  tags: ["rain gauge", "weather station", "garden measurement", "rainfall"],
  kit: 'garden',
  category: "prop",
  origin: 'base',
  compat: ['outdoor', 'garden', 'backyard', 'farm'],
  triangleBudget: 260,
});

const height = param('height', '650', { choices: ['500', '650', '800'], label: 'Gauge height (mm)' });
const frame = param('frame', '#64704d', { label: 'Frame' });
const tube = param('tube', '#9fc6b2', { label: 'Measuring tube' });
const mark = param('mark', '#343b37', { label: 'Scale marks' });
presets({ green: { frame: '#506b48' }, clear: { tube: '#bfd9cd' } });
const H = Number(height.value);
const a = assembly('rain-gauge');
const partNames = new Map<string, number>();
const addPart = (name: string, shape: ReturnType<typeof box>) => {
  const count = partNames.get(name) ?? 0;
  partNames.set(name, count + 1);
  a.part(count === 0 ? name : `${name}-${count + 1}`, shape);
};

addPart('stake', box(45, 45, H, true).translate(0, 0, H / 2).color(frame));
addPart('mount', box(120, 140, 100, true).translate(0, -55, H - 110).color(frame));
addPart('tube', cylinder(H * 0.68, 60).translate(0, -105, H * 0.28).color(tube));
for (let i = 0; i < 6; i++) addPart(`scale-${i}`, box(70 + (i % 2) * 40, 18, 16, true).translate(38, -172, 120 + i * H * 0.095).color(mark));
addPart('top-rim', cylinder(35, 72).translate(0, -105, H * 0.28 + H * 0.68).color(frame));

return a.model();
