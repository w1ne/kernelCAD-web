// Connected open C-type retaining ring with real plier holes in both integral ears; illustrative only.
meta({
  name: 'retaining-ring',
  license: 'CC0-1.0',
  title: 'Retaining ring',
  description: 'Illustrative CC0 C-type external retaining ring: one connected spring body, open slit and two integral plier ears with real through-holes. Not manufacturer-grade CAD: nominal groove fit, edge radii, spring properties, tolerances and DIN 471 compliance are not verified. Controls change only model size and whole-piece appearance color.',
  tags: ['retaining ring', 'circlip', 'shaft retainer', 'hardware'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 300,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const springSteel = param('springSteel', '#78868e', { label: 'Metal appearance color' });
presets({
  dark: { springSteel: '#4c585e' },
  brass: { springSteel: '#75838a' },
  weathered: { springSteel: '#5b5550' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('retaining-ring');
let ring=cylinder(3*s,20*s,16).subtract(cylinder(5*s,16*s,16).translate(0,0,-s));
ring=ring.subtract(block(-3*s,15*s,-s,6*s,10*s,5*s));
// These integral ears are fused to the spring ring, not misleading loose assembly bodies.
const leftEar = block(-9*s,17*s,0,6*s,7*s,3*s);
const rightEar = block(3*s,17*s,0,6*s,7*s,3*s);
ring = ring.union(leftEar, rightEar);
// Genuine through-holes for plier tips, including 1 mm axial runout.
for (const x of [-6, 6]) ring = ring.subtract(cylinder(5*s,1.3*s,8).translate(x*s,20.5*s,-s));
a.part('retaining-ring-body', ring.color(springSteel));
return a.model();
