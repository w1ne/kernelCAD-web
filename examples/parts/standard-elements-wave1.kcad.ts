// Reusable linear-guide slide with named standard-element connectors.

const travel = param('slide', 0, { min: 0, max: 80, unit: 'mm' });
const frameProfile = await lib.standard.aluminumExtrusion({ size: '2020', lengthMm: 350 });
const railShape = await lib.standard.linearRail({ size: 'MGN12', lengthMm: 300 });
const carriageShape = await lib.standard.linearCarriage({ size: 'MGN12H' });
const tNutShape = (await lib.standard.extrusionTNut({ size: '20-M3' })).rotate([1, 0, 0], -90);
const pulleyShape = (await lib.standard.timingPulley({ size: 'GT2-20T-5' })).rotate([0, 1, 0], -90);

const slide = assembly('standard-elements-wave1-slide');
slide.part('frame', frameProfile.rotate([0, 1, 0], 90).translate(-175, 0, -10));
slide.part('rail', railShape);
slide.part('carriage', carriageShape);
slide.part('t-nut', tNutShape);
slide.part('pulley', pulleyShape);

slide.virtualJoint('world-base', { type: 'fixed', parentFrame: 'world', childLink: 'frame' });
slide.mate('rail-seat', 'frame.slot-neg-x', 'rail.base-mount', 'fastened');
slide.mate('slide', 'rail.rail-axis', 'carriage.rail-mate', 'prismatic', {
  pose: travel,
  limitsMm: [0, 80],
});
slide.mate('t-nut-seat', 'frame.slot-pos-y', 't-nut.slot-seat', 'fastened');
slide.mate('pulley-seat', 'frame.end-b', 'pulley.hub-face', 'fastened');

return slide.solvedModel({ slide: travel });
