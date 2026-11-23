// Distinctive geometry: Long continuous hinge with two flat leaves, alternating knuckles, and a visible stainless hinge pin.
meta({
  name: 'piano-hinge',
  license: 'CC0-1.0',
  title: 'Piano hinge',
  description: 'Illustrative CC0 low-poly scene prop; not a vendor manufacturing or load-rated model. Long continuous hinge with two flat leaves, alternating knuckles, and a visible stainless hinge pin. Knobs: model size, steel, stainless steel.',
  tags: ['piano hinge', 'continuous hinge', 'cabinet hardware', 'pivot'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 1900,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const stainless = param('stainless', '#b8c1c6', { label: 'Stainless steel' });
presets({
  dark: { steel: '#3e484e', stainless: '#7d8a91' },
  brass: { steel: '#646f75', stainless: '#b38b52' },
  weathered: { steel: '#665b4d', stainless: '#8b8275' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('piano-hinge');
// Opposing leaves run beside the common hinge pin, not end-to-end.
let left=block(-45*s,-31*s,0,90*s,27*s,3*s);
let right=block(-45*s,4*s,0,90*s,27*s,3*s);
for (const x of [-32,0,32]) {
  left=left.subtract(cylinder(5*s,2.6*s,12).translate(x*s,-18*s,-s));
  right=right.subtract(cylinder(5*s,2.6*s,12).translate(x*s,18*s,-s));
}
// Alternate knuckles belong to opposite leaves. Short integral lugs join
// each barrel to its own leaf; loose rings beside disconnected leaves are
// not a hinge. A 0.2 mm axial gap separates successive knuckles.
for (let i=0;i<10;i++) {
  const x=(-45+i*9)*s;
  const ring=cylinder(8.8*s,4*s,12).subtract(cylinder(10.8*s,2.2*s,12).translate(0,0,-s))
    .rotateY(90).translate(x,0,4*s);
  if (i % 2 === 0) {
    left=left.union(block(x,-5.5*s,0,8.8*s,3.5*s,3*s)).union(ring);
  } else {
    right=right.union(block(x,2*s,0,8.8*s,3.5*s,3*s)).union(ring);
  }
}
a.part('left-leaf',left.color(steel));
a.part('right-leaf',right.color(steel));
a.part('hinge-pin',cylinder(90*s,2*s,16).rotateY(90).translate(-45*s,0,4*s).color(stainless));
return a.model();
