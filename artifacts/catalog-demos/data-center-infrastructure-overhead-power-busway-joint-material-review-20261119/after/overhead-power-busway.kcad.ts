// SPDX-License-Identifier: CC0-1.0
// Overhead power busway: an enclosed steel conductor run with matching steel
// joint covers, hanger bracket and end caps.

meta({
  name: "overhead-power-busway",
  license: 'CC0-1.0',
  title: "Overhead power busway",
  description: "Enclosed steel busway segment with four matching sheet-steel joint covers, hanger bracket, and end caps. Knobs: overall scale; housing steel and joint-cover steel. Presets: facilityStandard and highVisibility.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const housingSteel = param('housingSteel', '#4f7485', { label: 'Painted steel housing and fittings' });
const jointCoverSteel = param('jointCoverSteel', '#4f7485', { label: 'Sheet-steel joint covers' });

presets({
  facilityStandard: {
    housingSteel: '#4f7485',
    jointCoverSteel: '#4f7485',
  },
  highVisibility: {
    housingSteel: '#d99b22',
    jointCoverSteel: '#263e48',
  },
});

const baseZ = 0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("overhead-power-busway");
p.part("busway-housing", b(0, 0, 0, 2400, 180, 210).color(housingSteel));
// These identical covers repeat along the same steel housing, so keep their finish shared.
for (let index = 0; index < 4; index++) {
  p.part(`cover-joint-${index}`, b(-900 + index * 600, 0, 210, 55, 205, 24).color(jointCoverSteel));
}
p.part("end-cap-left", b(-1220, 0, 15, 70, 210, 180).color(housingSteel));
p.part("end-cap-right", b(1220, 0, 15, 70, 210, 180).color(housingSteel));
p.part("hanger", b(0, 0, 210, 90, 560, 250).color(housingSteel));
p.part("hanger-bolt", c(0, 0, 440, 90, 24, 8).color(housingSteel));

return p.model();
