// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "battery-buffer-charger-container",
  license: 'CC0-1.0',
  title: "Battery-buffer charger container",
  description: "Containerized buffer cabinet with access doors, vent banks, and a cable service side. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#66716b", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("battery-buffer-charger-container");
p.part("container-skid", b(0, 0, 0, 3200, 1700, 160).color(color));
p.part("container-body", b(0, 0, 160, 3000, 1500, 2250).color(color));
p.part("roof-cap", b(0, 0, 2410, 3080, 1580, 85).color(color));
p.part("front-service-door", b(0, -770, 250, 980, 22, 2040).color(color));
p.part("right-service-door", b(780, -770, 250, 420, 22, 2040).color(color));
p.part("vent-louver-1", b(-920, -790, 480, 180, 40, 100).color(color));
p.part("vent-louver-2", b(-680, -790, 480, 180, 40, 100).color(color));
p.part("vent-louver-3", b(-440, -790, 480, 180, 40, 100).color(color));
p.part("vent-louver-4", b(-200, -790, 480, 180, 40, 100).color(color));
p.part("vent-louver-5", b(-920, -790, 760, 180, 40, 100).color(color));
p.part("vent-louver-6", b(-680, -790, 760, 180, 40, 100).color(color));
p.part("vent-louver-7", b(-440, -790, 760, 180, 40, 100).color(color));
p.part("vent-louver-8", b(-200, -790, 760, 180, 40, 100).color(color));
p.part("cable-port-left", c(-1380, -785, 175, 190, 62, 8).color(color));
p.part("cable-port-right", c(1380, -785, 175, 190, 62, 8).color(color));

return p.model();
