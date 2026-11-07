// SPDX-License-Identifier: CC0-1.0
// Textile donation cage: its cart, lip and push handle. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "textile-donation-cage",
  license: 'CC0-1.0',
  title: "Textile donation cage",
  description: "Textile donation cage: its cart, lip and push handle. Low-poly visualization prop. Material controls: painted steel, stainless steel, rubber.",
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
const rubber = param('rubber', '#303638', { label: 'Rubber' });
presets({
  weathered: { paintedSteel: '#657268', stainlessSteel: '#9ea7a5', rubber: '#3c403e' },
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
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => loftCylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("textile-donation-cage");
p.part("cart-body", b(0,0,80,1131.0,735.0,712.8).color(paintedSteel));
p.part("front-lip", b(0,-411.59999999999997,712.8,1189.0,60,85).color(paintedSteel));
p.part("push-handle-left", b(-493.00000000000006,343.0,80,65,65,594.0).color(stainlessSteel));
p.part("push-handle-right", b(493.00000000000006,343.0,80,65,65,594.0).color(stainlessSteel));
p.part("handle-grip", b(0,343.0,633.6,1058.5,70,65).color(rubber));
p.part("left-wheel", cy(-467.75,407.0,76,64,76,10).color(rubber));
p.part("right-wheel", cy(467.75,407.0,76,64,76,10).color(rubber));
p.part("left-wheel-far", cy(-467.75,-279.0,76,64,76,10).color(rubber));
p.part("right-wheel-far", cy(467.75,-279.0,76,64,76,10).color(rubber));

return p.model();
