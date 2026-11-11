// Compact regression model for the authored 12:48 gear coupling used by
// https://app.kernelcad.com/p/nMQXpIBa?version=1. The offset blocks excite
// gravity release so the test can observe the native scalar constraint;
// this fixture does not model involute tooth contact.
const gearModule = 1;
const smallTeeth = 12;
const largeTeeth = 48;
const ratio = -smallTeeth / largeTeeth;
const centerDistance = gearModule * (smallTeeth + largeTeeth) / 2;
const motorDeg = param('motorDeg', 0, { min: -720, max: 720 });

const car = assembly('coupled 12:48 gear physics regression');
const chassis = car.part('chassis', box(100, 60, 8, true));
const motor = car.part('motor-rotor', box(20, 6, 6, true).translate(10, 0, 0));
const axle = car.part('rear-live-axle', box(20, 6, 6, true).translate(10, 0, 0));
const axis = (origin: [number, number, number]) => ({
  type: 'axis' as const,
  origin: { kind: 'vec3' as const, value: origin },
  axis: [0, 1, 0] as [number, number, number],
});

chassis.connector('motor-axis', axis([0, 0, 0]));
chassis.connector('rear-axis', axis([centerDistance, 0, 0]));
motor.connector('axis', axis([0, 0, 0]));
axle.connector('axis', axis([0, 0, 0]));

car.mate('motor-input', 'chassis.motor-axis', 'motor-rotor.axis', 'revolute', {
  pose: motorDeg,
  limitsDeg: [-720, 720],
});
car.mate('rear-drive-output', 'chassis.rear-axis', 'rear-live-axle.axis', 'revolute', {
  limitsDeg: [-180, 180],
});
car.coupleMates('rear-drive-output', { source: 'motor-input', ratio });
car.transmission('external-12-to-48-spur', {
  kind: 'gear-pair',
  sourceMate: 'motor-input',
  drivenMates: ['rear-drive-output'],
  input: 'motor-rotor',
  output: 'rear-live-axle',
  path: ['motor-rotor', 'rear-live-axle'],
  ratio,
  notes: '1 mm module, 30 mm pitch centre distance, 4:1 reduction',
});
animationView({ name: '12:48 gear ratio sweep', tracks: [
  { param: 'motorDeg', keys: [
    { atMs: 0, value: -720 },
    { atMs: 2000, value: 0 },
    { atMs: 4000, value: 720 },
  ] },
] });
return car.solvedModel({});
