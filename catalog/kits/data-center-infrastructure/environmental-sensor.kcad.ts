// SPDX-License-Identifier: CC0-1.0
// Environmental sensor: Room sensor mast with compact head, directional cap, and mounting plate.

meta({
  name: "environmental-sensor",
  license: 'CC0-1.0',
  title: "Environmental sensor",
  description: "Room sensor mast with compact head, directional cap, and mounting plate. Knobs: overall scale; painted steel, engineering polymer. Presets: facilityStandard and highVisibility.",
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

const p=assembly("environmental-sensor");
p.part("mount-plate", b(0, 0, 0, 210, 210, 35).color(steel));
p.part("mast", b(0, 0, 35, 48, 48, 920).color(steel));
p.part("sensor-head", b(0, 0, 955, 220, 155, 220).color(steel));
p.part("probe-tip", c(0, -90, 915, 120, 22, 8).color(steel));
p.part("vent-cap", frustum(0, 0, 1175, 80, 95, 76, 10).color(polymer));

return p.model();
