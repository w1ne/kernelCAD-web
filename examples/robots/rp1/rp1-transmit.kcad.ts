// RP1.3.4 whole-machine import through the shipped native Parasolid reader.
// Source: /Volumes/LabWired/rp1-cad/RP1-assembly.x_t, the SolidWorks 2021
// transmit (schema SCH_3201255_32001_13006, metres). Every placement is the
// transmit's own instance transform — no pose is invented here.
//
// This script fails unless the imported shape spans more than one link, i.e.
// the bounding box covers the standing robot (both feet through the torso)
// rather than one part near the origin.
const robot = await lib.fromCAD('/Volumes/LabWired/rp1-cad/RP1-assembly.x_t', { sourceUnit: 'm' });

const box = await robot.boundingBox({ exact: true });
const span = {
  x: box.max[0] - box.min[0],
  y: box.max[1] - box.min[1],
  z: box.max[2] - box.min[2],
};
const widest = Math.max(span.x, span.y, span.z);
if (!Number.isFinite(widest) || widest < 500) {
  throw new Error(
    `RP1 transmit import spans only ${widest.toFixed(1)} mm — that is not the whole robot (feet through torso).`,
  );
}
console.log(`RP1 transmit: span ${span.x.toFixed(1)} x ${span.y.toFixed(1)} x ${span.z.toFixed(1)} mm`);
return robot;
