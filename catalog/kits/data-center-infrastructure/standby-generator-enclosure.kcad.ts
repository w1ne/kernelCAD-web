// SPDX-License-Identifier: CC0-1.0
// Standby generator enclosure: Packaged generator skid with acoustic canopy, exhaust stack, and service doors.

meta({
  name: "standby-generator-enclosure",
  license: 'CC0-1.0',
  title: "Standby generator enclosure",
  description: "Packaged generator skid with acoustic canopy, exhaust stack, and service doors. Knobs: overall scale; painted steel, aluminum fins and panels. Presets: facilityStandard and highVisibility.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const steel = param('steel', '#4f7485', { label: 'Painted steel' });
const aluminum = param('aluminum', '#b9c6ca', { label: 'Aluminum fins and panels' });

presets({
  facilityStandard: {
    steel: '#4f7485',
    aluminum: '#b9c6ca',
  },
  highVisibility: {
    steel: '#d99b22',
    aluminum: '#dde4e5',
  },
});

const baseZ = 0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z-baseZ).scale(scale);

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

const p=assembly("standby-generator-enclosure");
p.part("skid", b(0, 0, 0, 2600, 1150, 130).color(steel));
p.part("acoustic-canopy", b(0, 0, 130, 2400, 1000, 1300).color(steel));
p.part("service-door-left", b(-700, -520, 260, 420, 35, 1040).color(steel));
p.part("service-door-right", b(350, -520, 260, 420, 35, 1040).color(steel));
p.part("engine-block", hx(-120, 0, 440, 1450, 260, 12).color(steel));
p.part("alternator", hx(700, 0, 440, 650, 310, 12).color(steel));
p.part("service-filter", c(-800, 0, 1450, 220, 95, 10).color(steel));
p.part("exhaust-stack", frustum(900, 300, 1430, 400, 65, 48, 10).color(steel));
p.part("radiator-fin-0", b(-820, -535, 360, 24, 22, 650).color(aluminum));
p.part("radiator-fin-1", b(-730, -535, 360, 24, 22, 650).color(aluminum));
p.part("radiator-fin-2", b(-640, -535, 360, 24, 22, 650).color(aluminum));
p.part("radiator-fin-3", b(-550, -535, 360, 24, 22, 650).color(aluminum));
p.part("radiator-fin-4", b(-460, -535, 360, 24, 22, 650).color(aluminum));
p.part("radiator-fin-5", b(-370, -535, 360, 24, 22, 650).color(aluminum));
p.part("radiator-fin-6", b(-280, -535, 360, 24, 22, 650).color(aluminum));
p.part("radiator-fin-7", b(-190, -535, 360, 24, 22, 650).color(aluminum));
p.part("radiator-fin-8", b(-100, -535, 360, 24, 22, 650).color(aluminum));
p.part("radiator-fin-9", b(-10, -535, 360, 24, 22, 650).color(aluminum));

return p.model();
