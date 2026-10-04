// Desktop arm built with the mate vocabulary: base yaw + shoulder pitch +
// elbow pitch, 120 mm upper arm and 100 mm forearm. `fore.tip` is the
// forearm's far end. Fixture for tests/unit/kinematic/checkReachableMates.test.ts.
const arm = assembly('desk-arm');
const base = arm.part('base', cylinder(40, 50).translate(0, 0, 0));
const turret = arm.part('turret', box(40, 40, 30, true).translate(0, 0, 15));
const upper = arm.part('upper', box(120, 20, 20, true).translate(60, 0, 0));
const fore = arm.part('fore', box(100, 16, 16, true).translate(50, 0, 0));
base.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 40] }, axis: [0, 0, 1] });
turret.connector('yaw', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });
turret.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 30] }, axis: [0, 1, 0] });
upper.connector('shoulder', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
upper.connector('elbow', { type: 'axis', origin: { kind: 'vec3', value: [120, 0, 0] }, axis: [0, 1, 0] });
fore.connector('elbow', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 1, 0] });
fore.connector('tip', { type: 'frame', origin: { kind: 'vec3', value: [100, 0, 0] } });
arm.mate('base-yaw', 'base.yaw', 'turret.yaw', 'revolute', { limitsDeg: [-170, 170] });
arm.mate('shoulder', 'turret.shoulder', 'upper.shoulder', 'revolute', { limitsDeg: [-90, 90] });
arm.mate('elbow', 'upper.elbow', 'fore.elbow', 'revolute', { limitsDeg: [-135, 135] });
return arm.model();
