// SPDX-License-Identifier: CC0-1.0
// Public drop-off canopy: a broad canopy roof carried by four open corner posts. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "public-dropoff-canopy",
  license: 'CC0-1.0',
  title: "Public drop-off canopy",
  description: "Public drop-off canopy: a broad canopy roof carried by four open corner posts. Low-poly visualization prop. Material controls: painted steel, stainless steel.",
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

const p = assembly("public-dropoff-canopy");
p.part("roof-slab", b(0,0,1270,1522.5,1134.0,110).color(paintedSteel));
p.part("roof-fascia-front", b(0,-571.2,1160,1522.5,70,180).color(paintedSteel));
p.part("roof-fascia-back", b(0,571.2,1160,1522.5,70,180).color(paintedSteel));
p.part("post-left-front", b(-609.0,-453.6,0,110,110,1160).color(stainlessSteel));
p.part("post-right-front", b(609.0,-453.6,0,110,110,1160).color(stainlessSteel));
p.part("post-left-back", b(-609.0,453.6,0,110,110,1160).color(stainlessSteel));
p.part("post-right-back", b(609.0,453.6,0,110,110,1160).color(stainlessSteel));
p.part("roof-drain", c(703.5,520.8,0,1270,28,10).color(paintedSteel));

return p.model();
