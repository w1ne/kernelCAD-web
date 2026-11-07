// SPDX-License-Identifier: CC0-1.0
// Enclosed roll-off container: its pallet, corner post and rail. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "enclosed-roll-off-container",
  license: 'CC0-1.0',
  title: "Enclosed roll-off container",
  description: "Enclosed roll-off container: its pallet, corner post and rail. Low-poly visualization prop. Material controls: painted steel, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#60766f', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#657268', stainlessSteel: '#9ea7a5' },
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

const p = assembly("enclosed-roll-off-container");
p.part("pallet-base", b(0,0,0,1270,900,95).color(paintedSteel));
p.part("corner-post-left-front", b(-590.0,-405.0,95,70,70,895).color(stainlessSteel));
p.part("corner-post-right-front", b(590.0,-405.0,95,70,70,895).color(stainlessSteel));
p.part("corner-post-left-back", b(-590.0,405.0,95,70,70,895).color(stainlessSteel));
p.part("corner-post-right-back", b(590.0,405.0,95,70,70,895).color(stainlessSteel));
p.part("front-rail-1", b(0,-402.0,210.0,1180,35,35).color(stainlessSteel));
p.part("rear-rail-1", b(0,402.0,210.0,1180,35,35).color(stainlessSteel));
p.part("front-rail-2", b(0,-402.0,440.0,1180,35,35).color(stainlessSteel));
p.part("rear-rail-2", b(0,402.0,440.0,1180,35,35).color(stainlessSteel));
p.part("front-rail-3", b(0,-402.0,670.0,1180,35,35).color(stainlessSteel));
p.part("rear-rail-3", b(0,402.0,670.0,1180,35,35).color(stainlessSteel));
p.part("side-rail-left", b(-587.0,0,210,35,805,35).color(stainlessSteel));
p.part("side-rail-right", b(587.0,0,210,35,805,35).color(stainlessSteel));
p.part("corner-cap-a", c(-590.0,-405.0,990,45,44,10).color(stainlessSteel));
p.part("corner-cap-b", c(590.0,405.0,990,45,44,10).color(stainlessSteel));

return p.model();
