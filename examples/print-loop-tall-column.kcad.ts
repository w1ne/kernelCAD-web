// Print-loop tall column — a 180 mm part that fits the generic-fdm bed
// (220 x 220 x 250 mm) and must actually slice once the slicer is given
// `--printable-area` and `--printable-height` from the profile.
//
// Run (OrcaSlicer on PATH, or KERNELCAD_SLICER set):
//
//   npx tsx src/agent/cli/index.ts export gcode examples/print-loop-tall-column.kcad.ts \
//     -o /tmp/print-loop-tall-column.gcode --json
//
// Expected: ok:true, a real G-code file, gcodeStats.maxZMm around 180.
// A 300 mm column fails earlier with export.gcode.exceeds-bed (bed z=250).

const section = 20;
const height = 180;

return box(section, section, height);
