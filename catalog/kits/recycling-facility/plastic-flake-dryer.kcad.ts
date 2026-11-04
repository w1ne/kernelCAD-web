// SPDX-License-Identifier: CC0-1.0
// Plastic flake dryer: its wash, process tank and top cover. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "plastic-flake-dryer",
  license: 'CC0-1.0',
  title: "Plastic flake dryer",
  description: "Plastic flake dryer: its wash, process tank and top cover. Low-poly visualization prop. Material controls: painted steel, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "glass plastics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#5e6982', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#646a75', stainlessSteel: '#9ea7a5' },
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

const p = assembly("plastic-flake-dryer");
p.part("wash-frame-left", b(-550.1999999999999,0,0,85,1130,852.5000000000001).color(paintedSteel));
p.part("wash-frame-right", b(550.1999999999999,0,0,85,1130,852.5000000000001).color(paintedSteel));
p.part("process-tank", b(0,0,240,916.9999999999999,836.2,589.0).color(paintedSteel));
p.part("top-cover", b(0,0,961.0,1021.8000000000001,904.0,90).color(paintedSteel));
p.part("feed-hopper", b(0,-508.5,1054.0,655.0,260,350).color(paintedSteel));
p.part("outlet-chute", b(0,485.9,140,628.8,270,380).color(paintedSteel));
p.part("agitation-drum", cy(0,0,589.0,734.5,393.0,12).color(stainlessSteel));
p.part("pump", c(681.2,-282.5,0,330,110,10).color(paintedSteel));
p.part("pipe-run", b(641.9,0,744.0,100,120,620.0).color(stainlessSteel));

return p.model();
