// A hollow through-wall bulkhead adapter: a brass barrel passes through two steel flanges, with a visible rubber seal and hex locknut at the panel face.
meta({
  name: 'bulkhead-adapter',
  license: 'CC0-1.0',
  title: 'Bulkhead adapter',
  description: 'Hollow through-wall fitting with a long brass barrel, paired stainless flanges, a sealing washer and a six-flat locknut. Knobs: size, stainless steel, brass and sealing rubber.',
  tags: ['bulkhead adapter', 'panel fitting', 'pipe adapter', 'connector'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 620,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const stainless = param('stainless', '#b8c1c6', { label: 'Stainless steel' });
const brass = param('brass', '#b28a4d', { label: 'Brass' });
const sealRubber = param('sealRubber', '#343c3e', { label: 'Sealing rubber' });
presets({
  dark: { stainless: '#7d8a91', brass: '#725938', sealRubber: '#252b2d' },
  brass: { stainless: '#b38b52', brass: '#c0944d', sealRubber: '#342d23' },
  weathered: { stainless: '#8b8275', brass: '#8c734d', sealRubber: '#4b4942' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const hexProfile = (r: number) => {
  let profile = path().moveTo(r, 0);
  for (let i = 1; i < 6; i++) {
    const angle = (2 * Math.PI * i) / 6;
    profile = profile.lineTo(r * Math.cos(angle), r * Math.sin(angle));
  }
  return profile.close();
};
const a = assembly('bulkhead-adapter');
a.part('barrel',cylinder(36*s,12*s,12).subtract(cylinder(38*s,8*s,12).translate(0,0,-s)).color(brass));
a.part('lower-flange',cylinder(5*s,21*s,14).subtract(cylinder(7*s,8*s,12).translate(0,0,-s)).color(stainless));
a.part('upper-flange',cylinder(5*s,21*s,14).subtract(cylinder(7*s,8*s,12).translate(0,0,-s)).translate(0,0,25*s).color(stainless));
a.part('sealing-washer',cylinder(1.5*s,19*s,14).subtract(cylinder(2.5*s,12.5*s,12).translate(0,0,-0.5*s)).translate(0,0,30*s).color(sealRubber));
a.part('hex-locknut',hexProfile(18*s).extrude(5*s).subtract(cylinder(7*s,12.5*s,12).translate(0,0,-s)).translate(0,0,31.5*s).color(stainless));
return a.model();
