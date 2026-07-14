const closeDeg = param('closeDeg', 0, { min: 0, max: 30 });

const arm = assembly('generic-articulated-digit');
arm.part('palm', box(20, 50, 20, true).translate(-10, 0, 0))
  .connector('index-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 10] },
  });

joint.articulatedDigit(arm, {
  name: 'index',
  parentMount: 'palm.index-mount',
  frame: { origin: [0, 0, 10], pinAxis: [0, 0, 1], forward: [1, 0, 0] },
  clearanceMm: 3.5,
  segments: [
    { name: 'proximal', lengthMm: 60, widthMm: 14, depthMm: 14 },
    { name: 'middle', lengthMm: 45, widthMm: 12, depthMm: 14 },
    { name: 'distal', lengthMm: 28, widthMm: 10, depthMm: 12, terminal: true },
  ],
  joints: [
    { name: 'mcp', limitsDeg: [0, 30], style: { knuckleR: 10.5, forkGapY: 11, plateT: 6, pinR: 1.5, pinCapThickness: 6, holeClearance: 1 } },
    { name: 'pip', limitsDeg: [0, 23], style: { knuckleR: 8.5, forkGapY: 11, plateT: 4.5, pinR: 1.5, pinCapThickness: 4.5, holeClearance: 1 } },
    { name: 'dip', limitsDeg: [0, 15], style: { knuckleR: 7.5, forkGapY: 10, plateT: 4, pinR: 1.5, pinCapThickness: 4, holeClearance: 1 } },
  ],
});

dfmSpec({ minWall: 1.2, minClearance: 0.8, includeArticulatedMates: true });

return arm.solvedModel({
  'index-mcp': closeDeg.multiply(1),
  'index-pip': closeDeg.multiply(0.75),
  'index-dip': closeDeg.multiply(0.5),
}, { validate: 'error' });
