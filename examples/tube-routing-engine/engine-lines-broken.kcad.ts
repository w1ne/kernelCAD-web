// examples/tube-routing-engine/engine-lines-broken.kcad.ts
//
// engine-lines.kcad.ts with one corner moved: the second corner of hyd-b sits
// 8 mm lower, toward the fuel lines that run under it. Nothing else differs.
// Directions are as in engine-lines.kcad.ts: forward is -X, aft is +X, the
// accessory side is -Y.
//
// Run with (after `npm run build:cli`):
//   node dist/cli/index.js evaluate examples/tube-routing-engine/engine-lines-broken.kcad.ts --json
//
// The evaluation fails with one error:
//
//   tube.clearance.violated: tube 'fuel-b' is 11.24 mm from 'hyd-b'; the rule needs 12.00 mm. Closest point on the tube: [101.40, -195.01, -133.97].
//
// A pair of tubes is reported once, on the tube declared first, so the message
// names fuel-b although the corner that moved belongs to hyd-b. The fix is to
// put the corner back: `[act2X, -190, hydRunZ]`.

const pumpX = param('PumpX', 60, { unit: 'mm', description: 'fuel pump station along the case axis' });
const manifoldX = param('ManifoldX', -80, { unit: 'mm', description: 'hydraulic manifold station along the case axis' });
const act1X = param('Actuator1X', -200, { unit: 'mm', description: 'forward actuator station' });
const act2X = param('Actuator2X', 130, { unit: 'mm', description: 'aft actuator station' });
const fuelBlockX = param('FuelBlockX', 235, { unit: 'mm', description: 'fuel inlet block station' });
const hydRunZ = param('HydRunZ', -112, { unit: 'mm', description: 'height of the hydraulic run along the case' });
const fuelRunZ = param('FuelRunZ', -140, { unit: 'mm', description: 'height of the fuel run along the case' });

const CASE_R = 150;
const xCyl = (r: number, x0: number, x1: number) => cylinder(x1 - x0, r).rotateY(90).translate(x0, 0, 0);
const zCyl = (r: number, x: number, y: number, z0: number, z1: number) => cylinder(z1 - z0, r).translate(x, y, z0);
const yCyl = (r: number, y0: number, y1: number) => cylinder(y1 - y0, r).rotateX(-90).translate(0, y0, 0);

const asm = assembly('engine-lines');

// Case: axis along X, 300 mm diameter, 600 mm long, with end flanges, a split
// flange, an inlet lip and a nozzle. The pads that carry the gearbox, the
// actuators and the fuel block are part of the case and follow the parameters.
const caseShape = xCyl(CASE_R, -300, 300)
  .union(xCyl(166, -300, -286), xCyl(166, 286, 300), xCyl(160, -6, 6), xCyl(125, -340, -300), xCyl(105, 300, 380))
  .union(box(140, 120, 50).translate(-70, -60, -170))
  .union(box(40, 40, 30).translate(-20, -165, -15).translate(act1X, 0, 0))
  .union(box(40, 40, 30).translate(-20, -165, -15).translate(act2X, 0, 0))
  .union(box(60, 35, 38).translate(-30, -160, -50).translate(fuelBlockX, 0, 0))
  .union(zCyl(9, 215, 0, -162, -140))
  .color('#b9bec5');
const engineCase = asm.part('case', caseShape, { at: [0, 0, 0] })
  .connector('oil-in', { type: 'axis', origin: { kind: 'vec3', value: [215, 0, -162] }, axis: [0, 0, -1], port: { system: 'oil', od: 6.35 } });

// Gearbox under the case, with an oil boss and a cover on its aft face.
const gearboxShape = box(300, 260, 160).translate(-150, -130, -330)
  .union(xCyl(9, 150, 162).translate(0, -100, -250), xCyl(48, 150, 158).translate(0, 40, -250))
  .color('#6f7782');
const gearbox = asm.part('gearbox', gearboxShape, { at: [0, 0, 0] })
  .connector('oil-out', { type: 'axis', origin: { kind: 'vec3', value: [162, -100, -250] }, axis: [1, 0, 0], port: { system: 'oil', od: 6.35 } });

// Fuel pump on the accessory side of the gearbox: two outlets on top.
const pumpShape = yCyl(38, -90, 0)
  .union(yCyl(46, -10, 0), yCyl(28, -105, -90), zCyl(11, 0, -42, 0, 50), zCyl(11, 0, -67, 0, 50))
  .color('#a8742c');
const pump = asm.part('pump', pumpShape, { at: [pumpX, -130, -282] })
  .connector('out-a', { type: 'axis', origin: { kind: 'vec3', value: [0, -42, 50] }, axis: [0, 0, 1], port: { system: 'fuel', od: 12.7 } })
  .connector('out-b', { type: 'axis', origin: { kind: 'vec3', value: [0, -67, 50] }, axis: [0, 0, 1], port: { system: 'fuel', od: 12.7 } });

// Hydraulic manifold on the accessory side of the gearbox: one outlet per actuator.
const manifoldShape = box(90, 75, 60).translate(-45, -75, -30)
  .union(zCyl(10, -20, -60, 30, 42), zCyl(10, 20, -60, 30, 42))
  .color('#3d4654');
const manifold = asm.part('manifold', manifoldShape, { at: [manifoldX, -130, -220] })
  .connector('a', { type: 'axis', origin: { kind: 'vec3', value: [-20, -60, 42] }, axis: [0, 0, 1], port: { system: 'hydraulic', od: 9.525 } })
  .connector('b', { type: 'axis', origin: { kind: 'vec3', value: [20, -60, 42] }, axis: [0, 0, 1], port: { system: 'hydraulic', od: 9.525 } });

// Two actuators on the accessory side of the case, rod forward, port underneath.
const actuatorShape = () => xCyl(25, -55, 55)
  .union(xCyl(8, -95, -55), xCyl(28, 45, 55), zCyl(10, 0, 0, -37, 0))
  .color('#8a9099');
const act1 = asm.part('actuator-1', actuatorShape(), { at: [act1X, -190, 0] })
  .connector('in', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, -37] }, axis: [0, 0, -1], port: { system: 'hydraulic', od: 9.525 } });
const act2 = asm.part('actuator-2', actuatorShape(), { at: [act2X, -190, 0] })
  .connector('in', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, -37] }, axis: [0, 0, -1], port: { system: 'hydraulic', od: 9.525 } });

// Fuel inlet block on its pad on the accessory side of the case, two inlets underneath.
const fuelBlockShape = box(60, 50, 38).translate(-30, -210, -50)
  .union(zCyl(11, 0, -172, -65, -50), zCyl(11, 0, -197, -65, -50))
  .color('#8a9099');
const fuelBlock = asm.part('fuel-block', fuelBlockShape, { at: [fuelBlockX, 0, 0] })
  .connector('in-a', { type: 'axis', origin: { kind: 'vec3', value: [0, -172, -65] }, axis: [0, 0, -1], port: { system: 'fuel', od: 12.7 } })
  .connector('in-b', { type: 'axis', origin: { kind: 'vec3', value: [0, -197, -65] }, axis: [0, 0, -1], port: { system: 'fuel', od: 12.7 } });

tubeSpec({ clearance: { default: 6, pairs: [{ a: 'fuel', b: 'hydraulic', min: 12 }] } });

const FUEL = '#d9822b';
const HYD = '#2f6fb5';
const OIL = '#d4b106';

const fuelA = tube('fuel-a', {
  from: pump.port('out-a'), to: fuelBlock.port('in-a'),
  via: [[pumpX, -172, fuelRunZ], [fuelBlockX, -172, fuelRunZ]],
  wall: 0.89, bendRadius: 38.1, material: 'stainless-304', density: 7900,
  flow: { lpm: 10, fluid: 'jet-a' },
}).color(FUEL);
const fuelB = tube('fuel-b', {
  from: pump.port('out-b'), to: fuelBlock.port('in-b'),
  via: [[pumpX, -197, fuelRunZ], [fuelBlockX, -197, fuelRunZ]],
  wall: 0.89, bendRadius: 38.1, material: 'stainless-304', density: 7900,
  flow: { lpm: 10, fluid: 'jet-a' },
}).color(FUEL);
const hydA = tube('hyd-a', {
  from: manifold.port('a'), to: act1.port('in'),
  via: [[manifoldX.add(-20), -190, hydRunZ], [act1X, -190, hydRunZ]],
  wall: 0.89, bendRadius: 28.6, material: 'stainless-304', density: 7900,
  flow: { lpm: 8, fluid: 'mil-prf-83282' },
}).color(HYD);
const hydB = tube('hyd-b', {
  from: manifold.port('b'), to: act2.port('in'),
  // The broken corner: 8 mm below the run height.
  via: [[manifoldX.add(20), -190, hydRunZ], [act2X, -190, hydRunZ.add(-8)]],
  wall: 0.89, bendRadius: 28.6, material: 'stainless-304', density: 7900,
  flow: { lpm: 8, fluid: 'mil-prf-83282' },
}).color(HYD);
const oil = tube('oil-feed', {
  from: gearbox.port('oil-out'), to: engineCase.port('oil-in'),
  via: [[215, -100, -250], [215, 0, -250]],
  wall: 0.71, bendRadius: 19.05, material: 'stainless-304', density: 7900,
  flow: { lpm: 2, fluid: 'mil-prf-23699' },
}).color(OIL);

asm.part('fuel-a', fuelA);
asm.part('fuel-b', fuelB);
asm.part('hyd-a', hydA);
asm.part('hyd-b', hydB);
asm.part('oil-feed', oil);

return asm.model();
