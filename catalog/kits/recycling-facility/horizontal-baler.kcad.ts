// SPDX-License-Identifier: CC0-1.0
// Horizontal baler: an open press mouth, ram, hydraulic drive, conveyor and strapped bale. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "horizontal-baler",
  license: 'CC0-1.0',
  title: "Horizontal baler",
  description: "Open-front horizontal baler with a visible press ram, hydraulic drive, rubber discharge conveyor, and strapped cardboard bale. Low-poly visualization prop.",
  tags: ["recycling", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#53798b', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#b7c0c1', { label: 'Stainless steel' });
const rubber = param('rubber', '#303638', { label: 'Rubber' });
const recoveredMaterial = param('recoveredMaterial', '#b58b50', { label: 'Recovered cardboard' });
presets({
  weathered: { paintedSteel: '#5b665f', stainlessSteel: '#929b99', rubber: '#383b3a', recoveredMaterial: '#8f7754' },
  highVisibility: { paintedSteel: '#d77632', stainlessSteel: '#d0d5d3', rubber: '#292d2f', recoveredMaterial: '#c49b5b' },
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
const cx = (x:number,y:number,z:number,h:number,r:number,s:number) => loftCylinder(h,r,s).rotateY(90).translate(x,y,z).scale(scale);

const p = assembly("horizontal-baler");
p.part("base-skid", b(0,0,0,1180,850,125).color(stainlessSteel));
// Open the front of the press chamber so the platen and bale can be seen.
p.part("chamber-side-left", b(-425,0,125,118,663,980).color(paintedSteel));
p.part("chamber-side-right", b(425,0,125,118,663,980).color(paintedSteel));
p.part("chamber-rear-wall", b(0,255,125,968,153,980).color(paintedSteel));
p.part("chamber-roof", b(0,0,1005,968,663,100).color(paintedSteel));
p.part("chamber-threshold", b(0,-300,125,732,110,110).color(paintedSteel));
p.part("mouth-post-left", b(-425,-365,235,118,95,770).color(paintedSteel));
p.part("mouth-post-right", b(425,-365,235,118,95,770).color(paintedSteel));
p.part("mouth-lintel", b(0,-365,1005,968,95,100).color(paintedSteel));
p.part("ram-platen", b(0,-80,630,690,105,175).color(stainlessSteel));
p.part("hydraulic-cylinder", cy(0,245,715,325,74,10).color(stainlessSteel));
p.part("hydraulic-rod", cy(0,-20,715,205,31,10).color(stainlessSteel));
p.part("discharge-frame-left", b(-325,-545,0,65,440,220).color(paintedSteel));
p.part("discharge-frame-right", b(325,-545,0,65,440,220).color(paintedSteel));
p.part("discharge-belt", b(0,-545,205,650,440,24).color(rubber));
p.part("discharge-roller-front", cx(-325,-735,217,650,38,12).color(stainlessSteel));
p.part("discharge-roller-rear", cx(-325,-355,217,650,38,12).color(stainlessSteel));
p.part("bale-body", b(0,-550,229,470,330,300).color(recoveredMaterial));
for (const x of [-145, 0, 145]) {
  p.part(`bale-front-band-${x}`, b(x,-717,229,18,12,300).color(stainlessSteel));
  p.part(`bale-top-band-${x}`, b(x,-550,517,18,330,12).color(stainlessSteel));
}
p.part("control-cabinet", b(660.8,0,0,300,360,840).color(paintedSteel));
p.part("control-display", b(660.8,-184,520,132,18,105).color(rubber));
p.part("pressure-gauge", c(625.4,-187,784,120,45,10).color(stainlessSteel));

return p.model();
