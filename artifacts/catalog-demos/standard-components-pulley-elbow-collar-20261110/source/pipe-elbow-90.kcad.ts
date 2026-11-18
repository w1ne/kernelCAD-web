// SPDX-License-Identifier: CC0-1.0
// 90-degree pipe elbow: a short swept centerline rounds the turn between
// perpendicular hollow legs. A bronze compression nut and dark elastomer
// end seal make the joint details visible in the catalog preview.
meta({
  name: 'pipe-elbow-90',
  license: 'CC0-1.0',
  title: '90 degree pipe elbow',
  description: 'Hollow 90-degree pipe elbow with a faceted quarter-turn bend, perpendicular pipe legs, bronze compression nut and elastomer end seal. Knobs: model size, steel, bronze and elastomer; dark, brass and weathered presets.',
  tags: ['pipe elbow', '90 degree elbow', 'plumbing fitting', 'tube', 'hollow bend'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 2000,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel tube and bend' });
const bronze = param('bronze', '#98714c', { label: 'Bronze compression nut' });
const elastomer = param('elastomer', '#30383b', { label: 'Elastomer seal' });
presets({
  dark: { steel: '#3e484e', bronze: '#684d37', elastomer: '#202629' },
  brass: { steel: '#646f75', bronze: '#b0804d', elastomer: '#292b2c' },
  weathered: { steel: '#665b4d', bronze: '#6e583f', elastomer: '#3b3935' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const outerR = 10 * s;
const innerR = 6 * s;
const bendR = 20 * s;
const leg = 28 * s;
const floorLift = leg + 7.295 * s;

// A swept polyline follows a quarter-circle centerline, with straight socket
// extensions at both ends. The inner sweep is subtracted once from the fused
// outer sweep so the bore stays open through each mitered turn.
const centerline = [
  [0, 0, -leg + floorLift],
  ...Array.from({ length: 5 }, (_, index) => {
    const angle = (Math.PI / 2) * index / 4;
    return [bendR * (1 - Math.cos(angle)), 0, bendR * Math.sin(angle) + floorLift];
  }),
  [bendR + leg, 0, bendR + floorLift],
];
const sweptTube = (radius: number) => path().circle(0, 0, radius, 12)
  .sweep(centerline, { spine: 'smooth' });
const pipe = sweptTube(outerR).subtract(sweptTube(innerR));

// Turn the horizontal socket away from the default catalog camera, showing
// the elbow's outside curve while keeping the bore at each end open.
const catalogAngle = (shape) => shape.rotateZ(90).translate(0, -(bendR + leg) / 2, 0);
const annulus = (height: number, ro: number, ri: number) => cylinder(height, ro, 8)
  .subtract(cylinder(height + 2 * s, ri, 8).translate(0, 0, -s));

const a = assembly('pipe-elbow-90');
a.part('continuous-hollow-elbow', catalogAngle(pipe).color(steel));
a.part('bronze-compression-nut', catalogAngle(annulus(5 * s, 14 * s, outerR + 0.4 * s)
  .rotateY(90).translate(bendR + leg - 7 * s, 0, bendR + floorLift)).color(bronze));
a.part('elastomer-end-seal', catalogAngle(annulus(2 * s, 12 * s, outerR - 0.4 * s)
  .translate(0, 0, -leg + floorLift + s)).color(elastomer));
return a.model();
