// SPDX-License-Identifier: CC0-1.0
// Picking booth module: a long belt deck with side guides, terminal rollers and a feed chute. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "picking-booth-module",
  license: 'CC0-1.0',
  title: "Picking booth module",
  description: "Picking booth module: a long belt deck with side guides, terminal rollers and a feed chute. Low-poly visualization prop. Material controls: painted steel, rubber, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#566d83', { label: 'Painted steel' });
const rubber = param('rubber', '#303638', { label: 'Rubber' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#5e6c76', rubber: '#3c403e', stainlessSteel: '#9ea7a5' },
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

const p = assembly("picking-booth-module");
p.part("base-left", b(-470.4,0,0,95,2540,150).color(paintedSteel));
p.part("base-right", b(470.4,0,0,95,2540,150).color(paintedSteel));
p.part("belt-deck", b(0,0,265,862.4,2286.0,115).color(paintedSteel));
p.part("belt-surface", b(0,0,380,784.0,2235.2,55).color(rubber));
p.part("side-rail-left", b(-411.59999999999997,0,435,55,2184.4,105).color(stainlessSteel));
p.part("side-rail-right", b(411.59999999999997,0,435,55,2184.4,105).color(stainlessSteel));
p.part("tail-support-left", b(-333.20000000000005,-914.4,150,65,65,835).color(paintedSteel));
p.part("tail-support-right", b(333.20000000000005,-914.4,150,65,65,835).color(paintedSteel));
p.part("head-support-left", b(-333.20000000000005,914.4,150,65,65,185).color(paintedSteel));
p.part("head-support-right", b(333.20000000000005,914.4,150,65,65,185).color(paintedSteel));
p.part("head-roller", cy(0,1193.8,436.59999999999997,90,411.59999999999997,10).color(stainlessSteel));
p.part("tail-roller", cy(0,-1143.0,436.59999999999997,90,411.59999999999997,10).color(stainlessSteel));
p.part("feed-chute", b(0,-1270.0,541.75,862.4,200,260).color(paintedSteel));
p.part("drive-motor", c(568.4,1016.0,180,260,90,10).color(paintedSteel));

return p.model();
