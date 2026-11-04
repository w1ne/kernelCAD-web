// Bearing block assembly: a 608 catalog envelope, a shaft and a housing.
// The bearing geometry is an annulus, not separate races or rolling elements;
// its mate does not simulate rolling contact or establish load capacity.
// Clearance is illustrative; select actual bearing/shaft/housing fits with a
// bearing supplier. A two-screw plate retains the bearing; screws are not modeled.
const frame = (origin: [number, number, number]) => ({ type: 'frame' as const, origin: { kind: 'vec3' as const, value: origin }, axis: [0, 0, 1] as [number, number, number] });
const axis = (origin: [number, number, number]) => ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value: origin }, axis: [0, 0, 1] as [number, number, number] });
const shaftLength = param('shaftLength', 30, { min: 24, max: 50 });
const shaftDiameter = param('shaftDiameter', 7.9, { min: 7.7, max: 7.95 });
const shoulderDiameter = param('shoulderDiameter', 12, { min: 10, max: 14 });
const assemblyModel = assembly('bearing-shaft');
let housingShape = box(80, 50, 18).holes('top', {
  positions: [{u: -30, v: -15}, {u: 30, v: -15}, {u: -30, v: 15}, {u: 30, v: 15}],
  diameter: 5.5, depth: 'through',
}).hole('top', {u: 0, v: 0, diameter: 8.5, depth: 'through', counterbore: {diameter: 22.1, depth: 7.02}});
housingShape = housingShape.holes('top', {
  positions: [{u:-14,v:0}, {u:14,v:0}], diameter: 3, depth: 8,
  thread: {pitch: 0.5}, name: 'retainerTaps',
});
const bearingShape = (await lib.standard.bearing608()).translate(40, 25, 11);
const retainerShape = box(34, 30, 2).holes('top', {
  positions: [{u:-14,v:0}, {u:14,v:0}], diameter: 3.4, depth: 'through', name: 'retainerScrews',
}).hole('top', {u:0, v:0, diameter:18, depth:'through'}).translate(23, 10, 18);
// A shoulder locates the inner race axially. The 0.02 mm clearance is an
// illustrative modeling gap, not a proven bearing fit or retention system.
const shaftShape = cylinder(shaftLength, shaftDiameter.divide(2)).translate(40, 25, -4)
  .union(cylinder(2, shoulderDiameter.divide(2)).translate(40, 25, 18.02));
assemblyModel.part('housing', housingShape, {material: 'aluminum-6061'})
  .connector('seat', frame([40,25,11])).connector('retainer', frame([26,25,18]));
assemblyModel.part('bearing', bearingShape).connector('outer', frame([40,25,11])).connector('axis', axis([40,25,14.5]));
assemblyModel.part('retainer', retainerShape, {material: 'aluminum-6061'}).connector('mount', frame([26,25,18]));
assemblyModel.part('shaft', shaftShape, {material: 'mild-steel'}).connector('axis', axis([40,25,14.5]));
assemblyModel.mate('bearing-seat', 'housing.seat', 'bearing.outer', 'fastened');
assemblyModel.mate('retainer-mount', 'housing.retainer', 'retainer.mount', 'fastened');
assemblyModel.mate('shaft-rotation', 'bearing.axis', 'shaft.axis', 'revolute', {limitsDeg: [-180,180]});
assemblyModel.jointSupport('bearing-support', {mate: 'shaft-rotation', shaft: 'bearing', supports: ['bearing'], output: 'shaft'});
return assemblyModel.solvedModel({});
