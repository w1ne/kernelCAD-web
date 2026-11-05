// SPDX-License-Identifier: CC0-1.0
// Dry-type transformer: Ventilated transformer block with cooling fins, terminal bushings, and base rails.

meta({
  name: "dry-type-transformer",
  license: 'CC0-1.0',
  title: "Dry-type transformer",
  description: "Ventilated transformer block with cooling fins, terminal bushings, and base rails. Knobs: overall scale; painted steel, aluminum fins and panels, electrical ceramic. Presets: facilityStandard and highVisibility.",
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
const ceramic = param('ceramic', '#e2ddcf', { label: 'Electrical ceramic' });

presets({
  facilityStandard: {
    steel: '#4f7485',
    aluminum: '#b9c6ca',
    ceramic: '#e2ddcf',
  },
  highVisibility: {
    steel: '#d99b22',
    aluminum: '#dde4e5',
    ceramic: '#f0eadc',
  },
});

const baseZ = 0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);

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

const p=assembly("dry-type-transformer");
p.part("base-frame", b(0, 0, 0, 1200, 1000, 100).color(steel));
p.part("transformer-core", b(0, 0, 100, 760, 680, 800).color(steel));
p.part("cooling-fin-0", b(-500, 0, 180, 48, 880, 620).color(aluminum));
p.part("cooling-fin-1", b(-375, 0, 180, 48, 880, 620).color(aluminum));
p.part("cooling-fin-2", b(-250, 0, 180, 48, 880, 620).color(aluminum));
p.part("cooling-fin-3", b(-125, 0, 180, 48, 880, 620).color(aluminum));
p.part("cooling-fin-4", b(0, 0, 180, 48, 880, 620).color(aluminum));
p.part("cooling-fin-5", b(125, 0, 180, 48, 880, 620).color(aluminum));
p.part("cooling-fin-6", b(250, 0, 180, 48, 880, 620).color(aluminum));
p.part("cooling-fin-7", b(375, 0, 180, 48, 880, 620).color(aluminum));
p.part("cooling-fin-8", b(500, 0, 180, 48, 880, 620).color(aluminum));
p.part("terminal-cover", b(0, 0, 1050, 930, 850, 60).color(steel));
p.part("terminal-bushing-0", frustum(-250, 0, 900, 190, 72, 46, 8).color(ceramic));
p.part("terminal-bushing-1", frustum(0, 0, 900, 190, 72, 46, 8).color(ceramic));
p.part("terminal-bushing-2", frustum(250, 0, 900, 190, 72, 46, 8).color(ceramic));

return p.model();
