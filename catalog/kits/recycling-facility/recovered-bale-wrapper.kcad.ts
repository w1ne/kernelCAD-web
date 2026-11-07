// SPDX-License-Identifier: CC0-1.0
// Recovered-material bale wrapper: its machine, access door and feed chute. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "recovered-bale-wrapper",
  license: 'CC0-1.0',
  title: "Recovered-material bale wrapper",
  description: "Recovered-material bale wrapper: its machine, access door and feed chute. Low-poly visualization prop. Material controls: painted steel, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#5f7380', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#647074', stainlessSteel: '#9ea7a5' },
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

const p = assembly("recovered-bale-wrapper");
p.part("base-frame", b(0,0,0,1050,990,140).color(paintedSteel));
p.part("machine-body", b(0,0,140,861.0,772.2,952.0000000000001).color(paintedSteel));
p.part("front-access-door", b(0,-415.8,220,546.0,60,616.0).color(paintedSteel));
p.part("feed-chute", b(0,-534.6,756.0,756.0,260,489.99999999999994).color(paintedSteel));
p.part("outlet-chute", b(0,495.0,160,483.0,210,504.0).color(paintedSteel));
p.part("service-panel", b(525.0,0,392.00000000000006,75,396.0,476.00000000000006).color(paintedSteel));
p.part("control-pedestal", b(609.0,-297.0,0,240,260,784.0000000000001).color(paintedSteel));
p.part("drive-drum", c(-577.5,0,588.0,370,120,10).color(stainlessSteel));
p.part("transfer-roller", cy(0,-376.2,403.0,100,378.0,10).color(stainlessSteel));

return p.model();
