// SPDX-License-Identifier: MIT
// A parameter-driven mate fixture for the assembly placement resolver check.
const mountX = param('mountX', 100, { unit: 'mm', description: 'Mount X position' });
const valveLift = param('valveLift', 27, { unit: 'mm', description: 'Valve authored Z offset' });
const arm = assembly('resolver-parity');

arm.part('mount', box(20, 20, 10, true), { at: [mountX, 0, 0] })
  .connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [4, -3, 5] } });
arm.part('valve', box(12, 6, 8, true), { at: [0, 0, valveLift] })
  .connector('base', { type: 'frame', origin: { kind: 'vec3', value: [1, 2, -4] } });
arm.mate('fastened', 'mount.seat', 'valve.base', 'fastened');

return arm.model();
