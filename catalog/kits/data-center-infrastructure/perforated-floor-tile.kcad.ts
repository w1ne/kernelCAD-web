// SPDX-License-Identifier: CC0-1.0
// Perforated floor tile: Airflow floor panel with a dense low-relief grille and four support feet.

meta({
  name: "perforated-floor-tile",
  license: 'CC0-1.0',
  title: "Perforated floor tile",
  description: "Airflow floor panel with a dense low-relief grille and four support feet. Knobs: overall scale; painted steel, engineering polymer. Presets: facilityStandard and highVisibility.",
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

const p=assembly("perforated-floor-tile");
p.part("tile-panel", b(0, 0, 0, 600, 600, 45).color(polymer));
p.part("edge-frame", b(0, 0, 45, 590, 590, 22).color(steel));
p.part("pedestal-0", c(-250, -250, 0, 150, 32, 8).color(steel));
p.part("pedestal-1", c(250, -250, 0, 150, 32, 8).color(steel));
p.part("pedestal-2", c(-250, 250, 0, 150, 32, 8).color(steel));
p.part("pedestal-3", c(250, 250, 0, 150, 32, 8).color(steel));
p.part("air-slot-bar-0", b(-245, 0, 68, 30, 490, 14).color(steel));
p.part("air-slot-bar-1", b(-175, 0, 68, 30, 490, 14).color(steel));
p.part("air-slot-bar-2", b(-105, 0, 68, 30, 490, 14).color(steel));
p.part("air-slot-bar-3", b(-35, 0, 68, 30, 490, 14).color(steel));
p.part("air-slot-bar-4", b(35, 0, 68, 30, 490, 14).color(steel));
p.part("air-slot-bar-5", b(105, 0, 68, 30, 490, 14).color(steel));
p.part("air-slot-bar-6", b(175, 0, 68, 30, 490, 14).color(steel));
p.part("air-slot-bar-7", b(245, 0, 68, 30, 490, 14).color(steel));
p.part("lift-ring", c(250, 250, 67, 20, 10, 8).color(steel));

return p.model();
