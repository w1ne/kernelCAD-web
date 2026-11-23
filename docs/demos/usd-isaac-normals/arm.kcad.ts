// Two-link arm for the usd-isaac shading-normals demo. The base is a
// sharp-edged block with a through bore; the link has filleted long edges.
// Hard B-rep edges must shade sharp; the bore and fillets must shade smooth.
const arm = assembly('usd-isaac-normals-arm');
const baseShape = box(60, 40, 20, true)
  .translate(0, 0, 10)
  .hole('top', { u: 18, v: 0, diameter: 12, depth: 'through' });
const base = arm.part('base', baseShape, { material: 'steel' });
const link1 = arm.part('link1', box(20, 20, 100, true).fillet(4).translate(0, 0, 50), { material: 'aluminum' });

base.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [-12, 0, 20] }, axis: [0, 0, 1] });
link1.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
arm.mate('shoulder', 'base.shoulder', 'link1.shoulder', 'revolute', { limitsDeg: [-90, 90] });

return arm.model();
