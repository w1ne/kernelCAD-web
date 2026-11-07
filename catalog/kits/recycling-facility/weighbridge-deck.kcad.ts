// SPDX-License-Identifier: CC0-1.0
// Weighbridge deck: its scale deck, side beam and approach pad. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "weighbridge-deck",
  license: 'CC0-1.0',
  title: "Weighbridge deck",
  description: "Weighbridge deck: its scale deck, side beam and approach pad. Low-poly visualization prop. Material controls: painted steel, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#47758a', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#54727a', stainlessSteel: '#9ea7a5' },
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

const p = assembly("weighbridge-deck");
p.part("scale-deck", b(0,0,150,5000,2800,210).color(paintedSteel));
p.part("side-beam-left", b(-2300,0,50,180,2700,160).color(stainlessSteel));
p.part("side-beam-right", b(2300,0,50,180,2700,160).color(stainlessSteel));
p.part("approach-pad-front", b(0,-1550,0,5200,700,150).color(paintedSteel));
p.part("approach-pad-back", b(0,1550,0,5200,700,150).color(paintedSteel));
p.part("load-cell-a", c(-1850,-950,0,150,90,10).color(paintedSteel));
p.part("load-cell-b", c(1850,-950,0,150,90,10).color(paintedSteel));
p.part("load-cell-c", c(-1850,950,0,150,90,10).color(paintedSteel));
p.part("load-cell-d", c(1850,950,0,150,90,10).color(paintedSteel));

return p.model();
