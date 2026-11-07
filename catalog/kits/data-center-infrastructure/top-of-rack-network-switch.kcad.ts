// SPDX-License-Identifier: CC0-1.0
// Top-of-rack network switch: Rack switch body with a repeated front port row, indicator strip, and mounting ears.

meta({
  name: "top-of-rack-network-switch",
  license: 'CC0-1.0',
  title: "Top-of-rack network switch",
  description: "Rack switch body with a repeated front port row, indicator strip, and mounting ears. Knobs: overall scale; painted steel, engineering polymer. Presets: facilityStandard and highVisibility.",
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
const hx=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z-baseZ).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("top-of-rack-network-switch");
p.part("chassis-shell", b(0, 0, 0, 440, 600, 45).color(steel));
p.part("front-face", b(0, -312.0, 10, 412, 24, 25).color(steel));
p.part("left-mounting-ear", b(-244.0, 0, 0, 32, 600, 45).color(steel));
p.part("right-mounting-ear", b(244.0, 0, 0, 32, 600, 45).color(steel));
p.part("slide-rail-left", hx(0, -204.00000000000003, 35, 560, 12, 8).color(steel));
p.part("slide-rail-right", hx(0, 204.00000000000003, 35, 560, 12, 8).color(steel));
p.part("network-port-0", hy(-184.79999999999998, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-1", hy(-165.3473684210526, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-2", hy(-145.89473684210526, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-3", hy(-126.44210526315788, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-4", hy(-106.98947368421052, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-5", hy(-87.53684210526316, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-6", hy(-68.08421052631579, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-7", hy(-48.63157894736844, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-8", hy(-29.178947368421063, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-9", hy(-9.726315789473688, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-10", hy(9.72631578947366, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-11", hy(29.178947368421035, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-12", hy(48.63157894736841, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-13", hy(68.08421052631576, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-14", hy(87.5368421052631, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-15", hy(106.98947368421048, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-16", hy(126.44210526315786, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-17", hy(145.89473684210523, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-18", hy(165.3473684210526, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("network-port-19", hy(184.79999999999993, -316.0, 22.5, 26, 8, 8).color(steel));
p.part("status-control", c(167.2, -318.0, 21.599999999999998, 24, 12, 8).color(polymer));

return p.model();
