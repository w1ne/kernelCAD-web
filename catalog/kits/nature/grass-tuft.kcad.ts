// Original kernelCAD low-poly grass tuft: thin tapered triangular blades
// fanned out from a small clump, leaning outward at varied angles.

meta({
  name: 'grass-tuft',
  title: 'Grass tuft',
  description: 'Clump of tall grass made of thin pointed blades leaning outward. Knobs: blade count, height, blade and tip colours.',
  tags: ['grass', 'tuft', 'clump', 'meadow', 'field', 'plant', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'meadow', 'forest', 'grid-2m'],
  triangleBudget: 260,
});

const blades = param('blades', '9', { choices: ['5', '7', '9', '12'], label: 'Blades' });
const heightM = param('heightM', '0.4', { choices: ['0.2', '0.4', '0.7'], label: 'Height (m)' });
const grass = param('grass', '#5c9a3a', { label: 'Grass' });
const tips = param('tips', '#9cc55a', { label: 'Blade tips' });

presets({
  dry: { grass: '#a89a52', tips: '#d8c98a' },
  autumn: { grass: '#8a8a3a', tips: '#c79a3c' },
});

const h = Number(heightM.value) * 1000;
const n = Number(blades.value);

// A blade is a thin flat plate in the XZ plane: lower quad + pointed tip.
const t = Math.max(6, h * 0.015);
const lower = (w: number, len: number) =>
  extrudePolygon([[-w, 0], [w, 0], [w * 0.6, len], [-w * 0.6, len]], t).translate(0, 0, -t / 2).rotateX(90);
const tip = (w: number, len: number, z0: number) =>
  extrudePolygon([[-w * 0.6, z0], [w * 0.6, z0], [0, z0 + len]], t).translate(0, 0, -t / 2).rotateX(90);

const tuft = assembly('grass-tuft');
// Small root clump so the tuft sits exactly on the ground.
let clump = path().moveTo(h * 0.07, 0);
for (let k = 1; k < 5; k++) clump = clump.lineTo(h * 0.07 * Math.cos((2 * Math.PI * k) / 5), h * 0.07 * Math.sin((2 * Math.PI * k) / 5));
tuft.part('clump', clump.close().extrude(h * 0.05).color(grass));
for (let i = 0; i < n; i++) {
  const az = (i * 360 * 0.618) % 360;
  const len = h * (0.7 + 0.3 * Math.abs(Math.sin(i * 1.9)));
  const lean = 8 + 22 * Math.abs(Math.sin(i * 2.7));
  const w = h * 0.035;
  const r = h * 0.05 * Math.abs(Math.cos(i * 1.3));
  const place = (s: any) => s.rotateX(-lean).rotateZ(az).translate(r * Math.cos((az * Math.PI) / 180), r * Math.sin((az * Math.PI) / 180), t * 0.6);
  tuft.part(`blade-${i + 1}`, place(lower(w, len * 0.62)).color(grass));
  tuft.part(`tip-${i + 1}`, place(tip(w, len * 0.38, len * 0.62)).color(tips));
}

return tuft.model();
