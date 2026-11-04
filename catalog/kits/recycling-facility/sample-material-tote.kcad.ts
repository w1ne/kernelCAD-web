// SPDX-License-Identifier: CC0-1.0
// Sample material tote: its skids, top cover and access. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "sample-material-tote",
  license: 'CC0-1.0',
  title: "Sample material tote",
  description: "Sample material tote: its skids, top cover and access. Low-poly visualization prop. Material controls: stainless steel, painted steel, rubber.",
  tags: ["recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
const paintedSteel = param('paintedSteel', '#60766f', { label: 'Painted steel' });
const rubber = param('rubber', '#303638', { label: 'Rubber' });
presets({
  weathered: { stainlessSteel: '#9ea7a5', paintedSteel: '#657268', rubber: '#3c403e' },
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

const p = assembly("sample-material-tote");
p.part("base-skids", b(0,0,0,1270,820,100).color(stainlessSteel));
p.part("body", b(0,0,100,1190,740,890).color(paintedSteel));
p.part("top-cover", b(0,0,990,1290,840,65).color(paintedSteel));
p.part("access-panel", b(0,-435.0,534.6,584.2,35,415.8).color(paintedSteel));
p.part("handle-left", b(-431.8,-470.0,544.5,120,45,130).color(stainlessSteel));
p.part("handle-right", b(431.8,-470.0,544.5,120,45,130).color(stainlessSteel));
p.part("left-wheel", cy(-563.0,480.0,105,70,72,10).color(rubber));
p.part("right-wheel", cy(563.0,480.0,105,70,72,10).color(rubber));
p.part("left-wheel-far", cy(-563.0,-340.0,105,70,72,10).color(rubber));
p.part("right-wheel-far", cy(563.0,-340.0,105,70,72,10).color(rubber));

return p.model();
