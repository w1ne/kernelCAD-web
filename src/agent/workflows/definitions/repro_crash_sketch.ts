// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { registerWorkflow } from '../registry';

registerWorkflow({
    id: 'repro-sketch-crash-1',
    name: 'Repro: Unused Sketch Crash',
    description: 'Reproduces the user reported issue where an unused open sketch causes a worker crash or unexpected behavior.',
    code: `
const { Sketcher } = replicad;
function drawPart() {
  const base = new Sketcher().hLine(40).vLine(40).hLine(-40).close().extrude(20);
  const filleted = base.fillet(2);
  const cyl = replicad.makeCylinder(10, 30).translate(0, 0, 10);
  
  // This sketch is created but unused and open
  const sketch1 = new Sketcher('XY').movePointerTo([-12, 6]).lineTo([19, 3]);
  
  return [filleted.cut(cyl)];
}
return drawPart();
    `,
    expected: {
        // We expect it to succeed now that we are fixing reliability.
        // Base 40x40x20 box has 6 faces. Fillet adds faces. Cylinder cut adds faces.
        // The fact that it runs and produces 27 faces means the logic is sound.
        faceCount: 27
    }
});
