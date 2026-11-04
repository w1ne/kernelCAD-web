// SPDX-License-Identifier: CC0-1.0
// Recycling trommel screen: a faceted rotating screen drum, feed hopper and opposed discharge chute. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "recycling-trommel-screen",
  license: 'CC0-1.0',
  title: "Recycling trommel screen",
  description: "Recycling trommel screen: a faceted rotating screen drum, feed hopper and opposed discharge chute. Low-poly visualization prop. Material controls: stainless steel, painted steel.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
const paintedSteel = param('paintedSteel', '#75656d', { label: 'Painted steel' });
presets({
  weathered: { stainlessSteel: '#9ea7a5', paintedSteel: '#736767' },
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
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => loftCylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("recycling-trommel-screen");
p.part("base-rail-left", b(-351.0,0,0,100,2280,150).color(stainlessSteel));
p.part("base-rail-right", b(351.0,0,0,100,2280,150).color(stainlessSteel));
p.part("feed-hopper", b(0,-1094.3999999999999,150,780,420,620).color(paintedSteel));
p.part("screen-drum", cy(0,798.0,520,1413.6,296.4,12).color(stainlessSteel));
p.part("drive-ring-front", cy(0,-182.4,520,115,335.4,12).color(stainlessSteel));
p.part("drive-ring-back", cy(0,1003.2,520,115,335.4,12).color(stainlessSteel));
p.part("discharge-chute", b(0,1094.3999999999999,150,561.6,380,380).color(paintedSteel));
p.part("drive-motor", c(390.0,273.59999999999997,270,400,130,10).color(paintedSteel));

return p.model();
