// Print-loop example — Slice B: model -> G-code -> printer.
//
// Run (from the repo root, with OrcaSlicer or PrusaSlicer installed and on
// PATH, or KERNELCAD_SLICER set to its binary path):
//
//   npx tsx src/agent/cli/index.ts export gcode examples/print-loop-bracket.kcad.ts \
//     -o /tmp/print-loop-bracket.gcode --json
//
// Expected output (a real slicer run, numbers vary slightly by slicer
// version — this is the actual output from OrcaSlicer 2.4.2):
//
//   {
//     "ok": true,
//     "bytesWritten": <a few hundred KB>,
//     "out": "/tmp/print-loop-bracket.gcode",
//     "diagnostics": []
//   }
//
// If no slicer is installed, the command instead fails closed with
// `export.gcode.slicer-unavailable` and an install hint — never a fake
// G-code file.
//
// Then, to actually print it on a network-connected printer (OctoPrint
// example; swap protocol for 'moonraker' or 'bambu-lan'):
//
//   MCP tool call: send_to_printer
//     { gcode_path: "/tmp/print-loop-bracket.gcode", protocol: "octoprint",
//       host: "<printer-ip>", api_key: "<octoprint-api-key>" }

const width = 40;
const height = 30;
const thickness = 5;

const base = box(width, height, thickness);
const hole = cylinder(thickness + 2, 4).translate(width / 2, height / 2, -1);
return base.subtract(hole).fillet(1);
