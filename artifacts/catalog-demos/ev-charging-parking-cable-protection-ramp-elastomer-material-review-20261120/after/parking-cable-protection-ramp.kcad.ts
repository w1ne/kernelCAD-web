// SPDX-License-Identifier: CC0-1.0
// quality-promotion: ev-charging-infrastructure 2026-11-05
// Parking cable protection ramp: a moulded rubber drive-over cable bridge. The cable run is along X and vehicles
// cross along Y, so both long flanks slope to the ground. Two hinged high-visibility polymer lids cover the cable
// channels, a sloped end cap closes each end, and bolt-down anchors stand on the flanks.
// Source convention: millimetres, Z up, base at z = 0.

meta({
  name: "parking-cable-protection-ramp",
  license: 'CC0-1.0',
  title: "Parking cable protection ramp",
  description: "Moulded rubber drive-over cable bridge with sloped flanks, two high-visibility polymer lids, sloped end caps, and bolt-down ground anchors. Knobs: overall scale and moulded rubber, polymer lid and anchor steel color controls.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const rampElastomer = param('rampElastomer', '#474b50', { label: 'Moulded rubber' });
const coverPolymer = param('coverPolymer', '#f2b824', { label: 'High-visibility polymer lid' });
const anchorSteel = param('anchorSteel', '#b5c0c2', { label: 'Galvanized anchor steel' });

presets({
  fleetReady: { rampElastomer: '#3f4a45', coverPolymer: '#f07a1a', anchorSteel: '#c2c9c8' },
  nightService: { rampElastomer: '#52565c', coverPolymer: '#e3e23c', anchorSteel: '#c8cecd' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);
const profileYZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0).rotateZ(90);
const profileXZ = (pts: [number, number][], t: number) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);

const HALF = 560; // half length of the ramp body along the cable run
const DECK = 70; // deck height
const FLANK: [number, number][] = [[-250, 0], [250, 0], [110, DECK], [-110, DECK]];
const endSlope = (dir: number) =>
  profileYZ(FLANK, 60).translate(dir * (HALF + 30), 0, 0)
    .intersect(profileXZ([[dir * HALF, 0], [dir * (HALF + 60), 0], [dir * HALF, DECK]], 500))
    .scale(scale);

const p=assembly("parking-cable-protection-ramp");
p.part("ramp-base", profileYZ(FLANK, 2 * HALF).scale(scale).color(rampElastomer));
p.part("cover-left", b(-282, 0, 66, 540, 180, 10).color(coverPolymer));
p.part("cover-right", b(282, 0, 66, 540, 180, 10).color(coverPolymer));
p.part("center-divider", b(0, 0, 66, 24, 200, 12).color(rampElastomer));
p.part("end-slope-left", endSlope(-1).color(rampElastomer));
p.part("end-slope-right", endSlope(1).color(rampElastomer));
p.part("anchor-left", c(-470, -185, 0, 46, 16, 8).color(anchorSteel));
p.part("anchor-right", c(470, -185, 0, 46, 16, 8).color(anchorSteel));
p.part("anchor-left-rear", c(-470, 185, 0, 46, 16, 8).color(anchorSteel));
p.part("anchor-right-rear", c(470, 185, 0, 46, 16, 8).color(anchorSteel));

return p.model();
