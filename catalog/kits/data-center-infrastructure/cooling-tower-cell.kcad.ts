// SPDX-License-Identifier: CC0-1.0
// Cooling tower cell: Open cooling-tower cell with basin, fan deck, fill pack, and water riser.

meta({
  name: "cooling-tower-cell",
  license: 'CC0-1.0',
  title: "Cooling tower cell",
  description: "Open cooling-tower cell with basin, fan deck, fill pack, and water riser. Knobs: overall scale; painted steel, engineering polymer. Presets: facilityStandard and highVisibility.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const steel = param('steel', '#4f7485', { label: 'Painted steel' });
const polymer = param('polymer', '#c99b35', { label: 'Engineering polymer' });

presets({
  facilityStandard: {
    steel: '#4f7485',
    polymer: '#c99b35',
  },
  highVisibility: {
    steel: '#d99b22',
    polymer: '#263e48',
  },
});

const baseZ = 0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const rb=(x:number,y:number,z:number,w:number,d:number,h:number,a:number)=>box(w,d,h,true).rotateZ(a).translate(x,y,z-baseZ+h/2).scale(scale);

const ngon = (r: number, s: number) => {
  let profile = path().moveTo(r, 0);
  for (let i = 1; i < s; i++) {
    const a = 2 * Math.PI * i / s;
    profile = profile.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return profile.close();
};
const frustum = (x: number, y: number, z: number, h: number, r0: number, r1: number, sides = 10) => {
  const bottom = ngon(r0, sides), top = ngon(r1, sides);
  return bottom.loft([top], {
    planes: [
      { plane: 'XY' as const, origin: [x, y, z - baseZ] as [number, number, number] },
      { plane: 'XY' as const, origin: [x, y, z + h - baseZ] as [number, number, number] },
    ],
    ruled: true,
  }).scale(scale);
};

const p=assembly("cooling-tower-cell");
p.part("basin", b(0, 0, 0, 1800, 1500, 300).color(steel));
p.part("fill-pack", b(0, 0, 300, 1450, 1200, 900).color(steel));
p.part("frame-post-0", b(-780, -630, 300, 85, 85, 1500).color(steel));
p.part("frame-post-1", b(780, -630, 300, 85, 85, 1500).color(steel));
p.part("frame-post-2", b(-780, 630, 300, 85, 85, 1500).color(steel));
p.part("frame-post-3", b(780, 630, 300, 85, 85, 1500).color(steel));
p.part("fan-deck", b(0, 0, 1800, 1800, 1500, 100).color(steel));
p.part("fan-stack", c(0, 0, 1900, 220, 420, 12).color(steel));
p.part("water-riser", c(650, 0, 300, 1500, 55, 10).color(steel));
p.part("fan-cowl", frustum(0, 0, 2070, 100, 430, 370, 12).color(steel));
p.part("fan-blade-0", rb(95.0, 0.0, 2170, 210, 38, 15, 14).color(polymer));
p.part("fan-blade-1", rb(5.8170722959499274e-15, 95.0, 2170, 210, 38, 15, 104).color(polymer));
p.part("fan-blade-2", rb(-95.0, 1.1634144591899855e-14, 2170, 210, 38, 15, 194).color(polymer));
p.part("fan-blade-3", rb(-1.745121688784978e-14, -95.0, 2170, 210, 38, 15, 284).color(polymer));

return p.model();
