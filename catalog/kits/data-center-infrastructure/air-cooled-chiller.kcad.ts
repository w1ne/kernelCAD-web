// SPDX-License-Identifier: CC0-1.0
// Air-cooled chiller: Outdoor chiller frame with multiple top fans, coil banks, and service panels.

meta({
  name: "air-cooled-chiller",
  license: 'CC0-1.0',
  title: "Air-cooled chiller",
  description: "Outdoor chiller frame with multiple top fans, coil banks, and service panels. Knobs: overall scale; painted steel, aluminum fins and panels, engineering polymer. Presets: facilityStandard and highVisibility.",
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
const polymer = param('polymer', '#c99b35', { label: 'Engineering polymer' });

presets({
  facilityStandard: {
    steel: '#4f7485',
    aluminum: '#b9c6ca',
    polymer: '#c99b35',
  },
  highVisibility: {
    steel: '#d99b22',
    aluminum: '#dde4e5',
    polymer: '#263e48',
  },
});

const baseZ = 0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const rb=(x:number,y:number,z:number,w:number,d:number,h:number,a:number)=>box(w,d,h,true).rotateZ(a).translate(x,y,z-baseZ+h/2).scale(scale);

const p=assembly("air-cooled-chiller");
p.part("chiller-skid", b(0, 0, 0, 3200, 1500, 130).color(steel));
p.part("coil-bank-left", b(-1050, 0, 130, 850, 1350, 700).color(steel));
p.part("coil-bank-right", b(1050, 0, 130, 850, 1350, 700).color(steel));
p.part("condenser-fan-0", c(-1100, -400, 830, 65, 210, 12).color(steel));
p.part("condenser-fan-1", c(0, -400, 830, 65, 210, 12).color(steel));
p.part("condenser-fan-2", c(1100, -400, 830, 65, 210, 12).color(steel));
p.part("condenser-fan-3", c(-1100, 400, 830, 65, 210, 12).color(steel));
p.part("condenser-fan-4", c(0, 400, 830, 65, 210, 12).color(steel));
p.part("condenser-fan-5", c(1100, 400, 830, 65, 210, 12).color(steel));
p.part("compressor-cover", b(0, 0, 130, 900, 1100, 580).color(steel));
p.part("refrigerant-port", c(0, 620, 220, 115, 55, 10).color(steel));
p.part("coil-fin-left-0", b(-1050, -687, 170, 735, 18, 14).color(aluminum));
p.part("coil-fin-left-1", b(-1050, -687, 222, 735, 18, 14).color(aluminum));
p.part("coil-fin-left-2", b(-1050, -687, 274, 735, 18, 14).color(aluminum));
p.part("coil-fin-left-3", b(-1050, -687, 326, 735, 18, 14).color(aluminum));
p.part("coil-fin-left-4", b(-1050, -687, 378, 735, 18, 14).color(aluminum));
p.part("coil-fin-left-5", b(-1050, -687, 430, 735, 18, 14).color(aluminum));
p.part("coil-fin-left-6", b(-1050, -687, 482, 735, 18, 14).color(aluminum));
p.part("coil-fin-left-7", b(-1050, -687, 534, 735, 18, 14).color(aluminum));
p.part("coil-fin-left-8", b(-1050, -687, 586, 735, 18, 14).color(aluminum));
p.part("coil-fin-left-9", b(-1050, -687, 638, 735, 18, 14).color(aluminum));
p.part("coil-fin-left-10", b(-1050, -687, 690, 735, 18, 14).color(aluminum));
p.part("coil-fin-left-11", b(-1050, -687, 742, 735, 18, 14).color(aluminum));
p.part("coil-fin-right-0", b(1050, -687, 170, 735, 18, 14).color(aluminum));
p.part("coil-fin-right-1", b(1050, -687, 222, 735, 18, 14).color(aluminum));
p.part("coil-fin-right-2", b(1050, -687, 274, 735, 18, 14).color(aluminum));
p.part("coil-fin-right-3", b(1050, -687, 326, 735, 18, 14).color(aluminum));
p.part("coil-fin-right-4", b(1050, -687, 378, 735, 18, 14).color(aluminum));
p.part("coil-fin-right-5", b(1050, -687, 430, 735, 18, 14).color(aluminum));
p.part("coil-fin-right-6", b(1050, -687, 482, 735, 18, 14).color(aluminum));
p.part("coil-fin-right-7", b(1050, -687, 534, 735, 18, 14).color(aluminum));
p.part("coil-fin-right-8", b(1050, -687, 586, 735, 18, 14).color(aluminum));
p.part("coil-fin-right-9", b(1050, -687, 638, 735, 18, 14).color(aluminum));
p.part("coil-fin-right-10", b(1050, -687, 690, 735, 18, 14).color(aluminum));
p.part("coil-fin-right-11", b(1050, -687, 742, 735, 18, 14).color(aluminum));
p.part("condenser-fan-blade-0-0", rb(-1038.0, -400.0, 895, 132, 24, 13, 20).color(polymer));
p.part("condenser-fan-blade-0-1", rb(-1131.0, -346.3064249653648, 895, 132, 24, 13, 140).color(polymer));
p.part("condenser-fan-blade-0-2", rb(-1131.0, -453.69357503463516, 895, 132, 24, 13, 260).color(polymer));
p.part("condenser-fan-blade-1-0", rb(62.0, -400.0, 895, 132, 24, 13, 20).color(polymer));
p.part("condenser-fan-blade-1-1", rb(-30.999999999999986, -346.3064249653648, 895, 132, 24, 13, 140).color(polymer));
p.part("condenser-fan-blade-1-2", rb(-31.00000000000003, -453.69357503463516, 895, 132, 24, 13, 260).color(polymer));
p.part("condenser-fan-blade-2-0", rb(1162.0, -400.0, 895, 132, 24, 13, 20).color(polymer));
p.part("condenser-fan-blade-2-1", rb(1069.0, -346.3064249653648, 895, 132, 24, 13, 140).color(polymer));
p.part("condenser-fan-blade-2-2", rb(1069.0, -453.69357503463516, 895, 132, 24, 13, 260).color(polymer));
p.part("condenser-fan-blade-3-0", rb(-1038.0, 400.0, 895, 132, 24, 13, 20).color(polymer));
p.part("condenser-fan-blade-3-1", rb(-1131.0, 453.6935750346352, 895, 132, 24, 13, 140).color(polymer));
p.part("condenser-fan-blade-3-2", rb(-1131.0, 346.30642496536484, 895, 132, 24, 13, 260).color(polymer));
p.part("condenser-fan-blade-4-0", rb(62.0, 400.0, 895, 132, 24, 13, 20).color(polymer));
p.part("condenser-fan-blade-4-1", rb(-30.999999999999986, 453.6935750346352, 895, 132, 24, 13, 140).color(polymer));
p.part("condenser-fan-blade-4-2", rb(-31.00000000000003, 346.30642496536484, 895, 132, 24, 13, 260).color(polymer));
p.part("condenser-fan-blade-5-0", rb(1162.0, 400.0, 895, 132, 24, 13, 20).color(polymer));
p.part("condenser-fan-blade-5-1", rb(1069.0, 453.6935750346352, 895, 132, 24, 13, 140).color(polymer));
p.part("condenser-fan-blade-5-2", rb(1069.0, 346.30642496536484, 895, 132, 24, 13, 260).color(polymer));

return p.model();
