// Distinctive geometry: Three-way T pipe fitting with a vertical run and perpendicular side branch
meta({
  name: 'pipe-tee',
  license: 'CC0-1.0',
  title: 'Pipe tee fitting',
  description: 'Illustrative CC0 low-poly three-port pipe tee with two inline openings, one side branch and continuous internal flow passages. Not a pressure-rated fitting or vendor manufacturing model. Controls: model size, steel and bronze colors.',
  tags: ['pipe tee', 'tee fitting', 'plumbing', 'pipe connector'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 520,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const bronze = param('bronze', '#98714c', { label: 'Bronze' });
presets({
  dark: { steel: '#3e484e', bronze: '#684d37' },
  brass: { steel: '#646f75', bronze: '#b0804d' },
  weathered: { steel: '#665b4d', bronze: '#6e583f' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('pipe-tee');
// Union the two perpendicular outer pipes before boring the intersecting
// passages. The side branch ends at the run centreline: extending both ways
// creates a four-port cross, not a tee. The branch bore stops inside the main
// bore and must not pierce the opposite wall.
const r=12*s;
const alongZ=cylinder(44*s,r,16);
// Point the single outlet toward the canonical camera so its bore remains visible.
const alongY=cylinder(18*s,r,16).rotateX(90).translate(0,0,22*s);
let tee=alongZ.union(alongY);
tee=tee.subtract(cylinder(46*s,8*s,16).translate(0,0,-s));
tee=tee.subtract(cylinder(20*s,8*s,16).rotateX(90).translate(0,s,22*s));
a.part('continuous-tee-fitting',tee.color(steel));
// A removable bronze coupling ring at the branch outlet is a separate part,
// not a decorative colour stripe across the flow passage.
const collar=cylinder(6*s,13*s,16)
  .subtract(cylinder(8*s,8*s,16).translate(0,0,-s))
  .rotateX(90).translate(0,-13*s,22*s);
a.part('branch-outlet-collar',collar.color(bronze));
return a.model();
