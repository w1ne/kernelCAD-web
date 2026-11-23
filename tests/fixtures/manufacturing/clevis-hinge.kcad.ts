// Manufacturing benchmark case 03 (#1227): a pinned clevis hinge, the small
// multi-part mechanism case.
//
// Prompt: "A 6061 aluminium clevis on a 40 x 30 mm base plate holds a 9 mm
// thick arm on a 5 mm steel pin. The arm must swing +/-90 degrees about the
// pin without touching the cheeks or the base. Use a 5.2 mm clearance bore in
// the cheeks and the arm. The arm must stay on the pin when the pivot height
// or the arm length changes."
//
// Parts and interfaces the benchmark checks:
//   - `clevis`: base plate with two 5 mm cheeks and a 10 mm slot; one
//     5.2 mm through bore along X in each cheek, axis at y = 15,
//     z = PivotHeight in the world; connector `pivot` on that axis at the
//     slot centre (x = 20);
//   - `arm`: 9 mm thick, 10 mm wide, 5.2 mm bore at its local origin,
//     length ArmLength above the bore centre; connector `pivot`;
//   - `pin`: 5 mm x 24 mm cylinder along X centred on its connector `seat`;
//   - mates: `hinge` (revolute clevis.pivot -> arm.pivot, +/-90 degrees) and
//     `retain` (fastened clevis.seat -> pin.seat, both on the pivot point).
// The arm has 0.5 mm side clearance to each cheek and the pin 0.1 mm radial
// clearance in each bore.
const pivotHeight = param('PivotHeight', 20, { unit: 'mm', min: 15, max: 40 });
const armLength = param('ArmLength', 60, { unit: 'mm', min: 30, max: 120 });

const boreAlongX = (length: number) => cylinder(length, 2.6).rotate([0, 1, 0], 90);

// Every part is authored with its connector at the local origin: mate
// connector origins take numbers only, so the clevis pivot height reaches the
// world through the clevis `at` instead of through its connector.
let clevis = box(40, 30, 5).translate(-20, -15, pivotHeight.negate())
  .union(box(5, 30, pivotHeight.add(5)).translate(-10, -15, pivotHeight.negate()))
  .union(box(5, 30, pivotHeight.add(5)).translate(5, -15, pivotHeight.negate()));
clevis = clevis.subtract(boreAlongX(22).translate(-11, 0, 0));

const arm = box(9, 10, armLength.add(5))
  .translate(-4.5, -5, -5)
  .subtract(boreAlongX(11).translate(-5.5, 0, 0));

const pin = cylinder(24, 2.5).rotate([0, 1, 0], 90).translate(-12, 0, 0);

const axisX = { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] } as const;
const seat = { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } } as const;
const hinge = assembly('clevis-hinge');
hinge.part('clevis', clevis.color('#9aa4ad'), { at: [20, 15, pivotHeight] })
  .connector('pivot', axisX)
  .connector('seat', seat);
hinge.part('arm', arm.color('#d08a2b')).connector('pivot', axisX);
hinge.part('pin', pin.color('#5c6670')).connector('seat', seat);
hinge.mate('hinge', 'clevis.pivot', 'arm.pivot', 'revolute', { limitsDeg: [-90, 90] });
hinge.mate('retain', 'clevis.seat', 'pin.seat', 'fastened');
hinge.jointSupport('hinge-support', { mate: 'hinge', shaft: 'pin', supports: ['clevis'], output: 'arm' });
return hinge.solvedModel({}, { validate: 'error' });
