// SPDX-License-Identifier: CC0-1.0
// Front-load material hopper: its skid, main vessel and top collar. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "front-load-material-hopper",
  license: 'CC0-1.0',
  title: "Front-load material hopper",
  description: "Front-load material hopper: its skid, main vessel and top collar. Low-poly visualization prop. Material controls: stainless steel, painted steel.",
  tags: ["recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
const paintedSteel = param('paintedSteel', '#707b86', { label: 'Painted steel' });
presets({
  weathered: { stainlessSteel: '#9ea7a5', paintedSteel: '#707678' },
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

const p = assembly("front-load-material-hopper");
p.part("skid-left", b(-453.3333333333333,0,0,90,980,100).color(stainlessSteel));
p.part("skid-right", b(453.3333333333333,0,0,90,980,100).color(stainlessSteel));
p.part("main-vessel", c(0,0,100,1060,333.20000000000005,12).color(paintedSteel));
p.part("top-collar", c(0,0,1140,70,362.6,12).color(stainlessSteel));
p.part("access-neck", c(0,0,1210,100,140,10).color(stainlessSteel));
p.part("drain-stub", c(394.4,0,210,180,48,8).color(paintedSteel));
p.part("level-gauge", b(489.59999999999997,-156.8,250,65,40,551.2).color(stainlessSteel));

return p.model();
