// SPDX-License-Identifier: CC0-1.0
// Liquid waste IBC tank: its pallet skid, inner tank and top cap. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "liquid-waste-ibc-tank",
  license: 'CC0-1.0',
  title: "Liquid waste IBC tank",
  description: "Liquid waste IBC tank: its pallet skid, inner tank and top cap. Low-poly visualization prop. Material controls: stainless steel, polymer, painted steel.",
  tags: ["recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
const polymer = param('polymer', '#9cbab0', { label: 'Polymer' });
const paintedSteel = param('paintedSteel', '#707b86', { label: 'Painted steel' });
presets({
  weathered: { stainlessSteel: '#9ea7a5', polymer: '#94aca0', paintedSteel: '#707678' },
  highVisibility: { paintedSteel: '#d77632' },
});
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const ngon = (r:number,s:number) => {
  let p = path().moveTo(r * Math.cos(Math.PI / 2), r * Math.sin(Math.PI / 2));
  for (let k = 1; k < s; k++) {
    const a = Math.PI / 2 + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const loftCylinder = (h:number,r:number,s:number) => {
  const levels = [0, h * 0.06, h * 0.94, h];
  const radii = [r * 0.9, r, r, r * 0.9];
  const profiles = levels.map((_, i) => ngon(radii[i], s));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
};
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => loftCylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("liquid-waste-ibc-tank");
p.part("pallet-skid", b(0,0,0,950,980,120).color(stainlessSteel));
p.part("inner-tank", b(0,0,120,741.0,764.4,1072.8).color(polymer));
p.part("top-cap", b(0,0,1192.8,779.0,803.5999999999999,65).color(paintedSteel));
p.part("fill-neck", c(0,0,1257.8,110,90,10).color(stainlessSteel));
p.part("cage-post--1--1", b(-418.0,-431.2,120,48,48,1072.8).color(stainlessSteel));
p.part("cage-post--1-1", b(-418.0,431.2,120,48,48,1072.8).color(stainlessSteel));
p.part("cage-post-1--1", b(418.0,-431.2,120,48,48,1072.8).color(stainlessSteel));
p.part("cage-post-1-1", b(418.0,431.2,120,48,48,1072.8).color(stainlessSteel));
p.part("cage-rail-front-0", b(0,-421.4,220.0,798.0,35,30).color(stainlessSteel));
p.part("cage-rail-back-0", b(0,421.4,220.0,798.0,35,30).color(stainlessSteel));
p.part("cage-rail-front-1", b(0,-421.4,577.5999999999999,798.0,35,30).color(stainlessSteel));
p.part("cage-rail-back-1", b(0,421.4,577.5999999999999,798.0,35,30).color(stainlessSteel));
p.part("cage-rail-front-2", b(0,-421.4,935.1999999999999,798.0,35,30).color(stainlessSteel));
p.part("cage-rail-back-2", b(0,421.4,935.1999999999999,798.0,35,30).color(stainlessSteel));
p.part("valve-guard", b(0,-450.8,150,250,55,170).color(stainlessSteel));
p.part("outlet-valve", c(0,-480.2,145,90,48,10).color(stainlessSteel));

return p.model();
