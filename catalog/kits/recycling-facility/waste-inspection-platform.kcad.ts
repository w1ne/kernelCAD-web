// SPDX-License-Identifier: CC0-1.0
// Waste inspection platform: an elevated inspection deck with apron, rear rail and cross-braced posts. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "waste-inspection-platform",
  license: 'CC0-1.0',
  title: "Waste inspection platform",
  description: "Waste inspection platform: an elevated inspection deck with apron, rear rail and cross-braced posts. Low-poly visualization prop. Material controls: painted steel, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#7b6f56', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#776e57', stainlessSteel: '#9ea7a5' },
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

const p = assembly("waste-inspection-platform");
p.part("platform-deck", b(0,0,620,1830.0,949.0,100).color(paintedSteel));
p.part("front-apron", b(0,-452.6,390,1769.0,70,230).color(paintedSteel));
p.part("rear-rail", b(0,445.3,720,1683.6,55,50).color(stainlessSteel));
p.part("left-post", b(-829.6,350.4,0,70,70,700).color(stainlessSteel));
p.part("right-post", b(829.6,350.4,0,70,70,700).color(stainlessSteel));
p.part("cross-brace", b(0,0,250,70,730,55).color(stainlessSteel));
p.part("level-foot-left", c(-780.8000000000001,-401.50000000000006,0,100,38,10).color(stainlessSteel));
p.part("level-foot-right", c(780.8000000000001,-401.50000000000006,0,100,38,10).color(stainlessSteel));

return p.model();
