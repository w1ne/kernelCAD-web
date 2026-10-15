// LabWired handoff "drawbot (polargraph): ESP32 DevKitC, 2x A4988, 2x NEMA17, SG90 pen lift, 12 V DC jack (confirmed by Andrii 2026-10-15)"; all dimensions are mm.
// Placeholder convention: box dimensions are corner-anchored from (0,0,0); handoff position_mm locates that bbox corner.
// Anchor convention: <ref>.origin and bbox corner = local [0,0,0]; <ref>.bbox.center = local bbox center.
const handoffAssembly = assembly('labwired-handoff');
// A1: bbox 54.4 x 27.9 x 10 mm; source step is not fetched by import_handoff.
// Rotated bbox envelope: 54.4 x 27.9 x 10 mm; normalized so its lower corner is at local [0,0,0].
const part_A1 = handoffAssembly.part("A1", box(54.4, 27.9, 10), { at: [26.63, 53.92, 0] });
part_A1.connector('origin', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
part_A1.connector('bbox_center', { type: 'frame', origin: { kind: 'vec3', value: [27.2, 13.95, 5] } });
part_A1.connector("bbox_x_min", { type: 'frame', origin: { kind: 'vec3', value: [0, 13.95, 5] } });
part_A1.connector("bbox_x_max", { type: 'frame', origin: { kind: 'vec3', value: [54.4, 13.95, 5] } });
part_A1.connector("bbox_y_min", { type: 'frame', origin: { kind: 'vec3', value: [27.2, 0, 5] } });
part_A1.connector("bbox_y_max", { type: 'frame', origin: { kind: 'vec3', value: [27.2, 27.9, 5] } });
part_A1.connector("bbox_z_min", { type: 'frame', origin: { kind: 'vec3', value: [27.2, 13.95, 0] } });
part_A1.connector("bbox_z_max", { type: 'frame', origin: { kind: 'vec3', value: [27.2, 13.95, 10] } });
// Cut-out hint for A1 usb_micro_b on -X: "[8,4]"; dimensions are handoff hints, not a wall cut operation.
part_A1.connector("pin_3v3", { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
part_A1.connector("pin_gpio36", { type: 'frame', origin: { kind: 'vec3', value: [0, -5.08, 0] } });
part_A1.connector("pin_gpio39", { type: 'frame', origin: { kind: 'vec3', value: [0, -7.62, 0] } });
part_A1.connector("pin_gpio34", { type: 'frame', origin: { kind: 'vec3', value: [0, -10.16, 0] } });
part_A1.connector("pin_gpio35", { type: 'frame', origin: { kind: 'vec3', value: [0, -12.7, 0] } });
part_A1.connector("pin_gpio32", { type: 'frame', origin: { kind: 'vec3', value: [0, -15.24, 0] } });
part_A1.connector("pin_gpio33", { type: 'frame', origin: { kind: 'vec3', value: [0, -17.78, 0] } });
part_A1.connector("pin_gpio25", { type: 'frame', origin: { kind: 'vec3', value: [0, -20.32, 0] } });
part_A1.connector("pin_gpio26", { type: 'frame', origin: { kind: 'vec3', value: [0, -22.86, 0] } });
part_A1.connector("pin_gpio27", { type: 'frame', origin: { kind: 'vec3', value: [0, -25.4, 0] } });
part_A1.connector("pin_gpio14", { type: 'frame', origin: { kind: 'vec3', value: [0, -27.94, 0] } });
part_A1.connector("pin_gpio12", { type: 'frame', origin: { kind: 'vec3', value: [0, -30.48, 0] } });
part_A1.connector("pin_gnd", { type: 'frame', origin: { kind: 'vec3', value: [0, -33.02, 0] } });
part_A1.connector("pin_gpio13", { type: 'frame', origin: { kind: 'vec3', value: [0, -35.56, 0] } });
part_A1.connector("pin_5v", { type: 'frame', origin: { kind: 'vec3', value: [0, -45.72, 0] } });
part_A1.connector("pin_gpio15", { type: 'frame', origin: { kind: 'vec3', value: [25.44, -38.1, 0] } });
part_A1.connector("pin_gpio2", { type: 'frame', origin: { kind: 'vec3', value: [25.44, -35.56, 0] } });
part_A1.connector("pin_gpio0", { type: 'frame', origin: { kind: 'vec3', value: [25.44, -33.02, 0] } });
part_A1.connector("pin_gpio4", { type: 'frame', origin: { kind: 'vec3', value: [25.44, -30.48, 0] } });
part_A1.connector("pin_gpio16", { type: 'frame', origin: { kind: 'vec3', value: [25.44, -27.94, 0] } });
part_A1.connector("pin_gpio17", { type: 'frame', origin: { kind: 'vec3', value: [25.44, -25.4, 0] } });
part_A1.connector("pin_gpio5", { type: 'frame', origin: { kind: 'vec3', value: [25.44, -22.86, 0] } });
part_A1.connector("pin_gpio18", { type: 'frame', origin: { kind: 'vec3', value: [25.44, -20.32, 0] } });
part_A1.connector("pin_gpio19", { type: 'frame', origin: { kind: 'vec3', value: [25.44, -17.78, 0] } });
part_A1.connector("pin_gpio21", { type: 'frame', origin: { kind: 'vec3', value: [25.44, -12.7, 0] } });
part_A1.connector("pin_gpio3", { type: 'frame', origin: { kind: 'vec3', value: [25.44, -10.16, 0] } });
part_A1.connector("pin_gpio1", { type: 'frame', origin: { kind: 'vec3', value: [25.44, -7.62, 0] } });
part_A1.connector("pin_gpio22", { type: 'frame', origin: { kind: 'vec3', value: [25.44, -5.08, 0] } });
part_A1.connector("pin_gpio23", { type: 'frame', origin: { kind: 'vec3', value: [25.44, -2.54, 0] } });
// A2: bbox 15.2 x 20.3 x 13 mm; source step is not fetched by import_handoff.
// Rotated bbox envelope: 20.3 x 15.2 x 13 mm; normalized so its lower corner is at local [0,0,0].
const part_A2 = handoffAssembly.part("A2", box(15.2, 20.3, 13).rotate([0, 0, 1], 90).translate(20.3, 0, 0), { at: [3.97, 35.27, 0] });
part_A2.connector('origin', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
part_A2.connector('bbox_center', { type: 'frame', origin: { kind: 'vec3', value: [10.15, 7.6, 6.5] } });
part_A2.connector("bbox_x_min", { type: 'frame', origin: { kind: 'vec3', value: [10.15, 0, 6.5] } });
part_A2.connector("bbox_x_max", { type: 'frame', origin: { kind: 'vec3', value: [10.15, 15.2, 6.5] } });
part_A2.connector("bbox_y_min", { type: 'frame', origin: { kind: 'vec3', value: [20.3, 7.6, 6.5] } });
part_A2.connector("bbox_y_max", { type: 'frame', origin: { kind: 'vec3', value: [0, 7.6, 6.5] } });
part_A2.connector("bbox_z_min", { type: 'frame', origin: { kind: 'vec3', value: [10.15, 7.6, 0] } });
part_A2.connector("bbox_z_max", { type: 'frame', origin: { kind: 'vec3', value: [10.15, 7.6, 13] } });
part_A2.connector("pin_en", { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
part_A2.connector("pin_ms1", { type: 'frame', origin: { kind: 'vec3', value: [2.530000000000001, 0, 0] } });
part_A2.connector("pin_ms2", { type: 'frame', origin: { kind: 'vec3', value: [5.08, 0, 0] } });
part_A2.connector("pin_ms3", { type: 'frame', origin: { kind: 'vec3', value: [7.620000000000001, 0, 0] } });
part_A2.connector("pin_reset", { type: 'frame', origin: { kind: 'vec3', value: [10.16, 0, 0] } });
part_A2.connector("pin_sleep", { type: 'frame', origin: { kind: 'vec3', value: [12.700000000000001, 0, 0] } });
part_A2.connector("pin_step", { type: 'frame', origin: { kind: 'vec3', value: [15.23, 0, 0] } });
part_A2.connector("pin_dir", { type: 'frame', origin: { kind: 'vec3', value: [17.78, 0, 0] } });
part_A2.connector("pin_vmot", { type: 'frame', origin: { kind: 'vec3', value: [17.78, 12.7, 0] } });
part_A2.connector("pin_gnd", { type: 'frame', origin: { kind: 'vec3', value: [15.23, 12.7, 0] } });
part_A2.connector("pin_2b", { type: 'frame', origin: { kind: 'vec3', value: [12.700000000000001, 12.7, 0] } });
part_A2.connector("pin_2a", { type: 'frame', origin: { kind: 'vec3', value: [10.16, 12.7, 0] } });
part_A2.connector("pin_1a", { type: 'frame', origin: { kind: 'vec3', value: [7.620000000000001, 12.7, 0] } });
part_A2.connector("pin_1b", { type: 'frame', origin: { kind: 'vec3', value: [5.08, 12.7, 0] } });
part_A2.connector("pin_vdd", { type: 'frame', origin: { kind: 'vec3', value: [2.530000000000001, 12.7, 0] } });
// A3: bbox 15.2 x 20.3 x 13 mm; source step is not fetched by import_handoff.
// Rotated bbox envelope: 15.2 x 20.3 x 13 mm; normalized so its lower corner is at local [0,0,0].
const part_A3 = handoffAssembly.part("A3", box(15.2, 20.3, 13).rotate([0, 0, 1], 180).translate(15.2, 20.3, 0), { at: [21.98, 12.47, 0] });
part_A3.connector('origin', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
part_A3.connector('bbox_center', { type: 'frame', origin: { kind: 'vec3', value: [7.6, 10.15, 6.5] } });
part_A3.connector("bbox_x_min", { type: 'frame', origin: { kind: 'vec3', value: [15.2, 10.15, 6.5] } });
part_A3.connector("bbox_x_max", { type: 'frame', origin: { kind: 'vec3', value: [0, 10.15, 6.5] } });
part_A3.connector("bbox_y_min", { type: 'frame', origin: { kind: 'vec3', value: [7.6, 20.3, 6.5] } });
part_A3.connector("bbox_y_max", { type: 'frame', origin: { kind: 'vec3', value: [7.6, 0, 6.5] } });
part_A3.connector("bbox_z_min", { type: 'frame', origin: { kind: 'vec3', value: [7.6, 10.15, 0] } });
part_A3.connector("bbox_z_max", { type: 'frame', origin: { kind: 'vec3', value: [7.6, 10.15, 13] } });
part_A3.connector("pin_en", { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
part_A3.connector("pin_ms1", { type: 'frame', origin: { kind: 'vec3', value: [0, 2.539999999999999, 0] } });
part_A3.connector("pin_ms2", { type: 'frame', origin: { kind: 'vec3', value: [0, 5.08, 0] } });
part_A3.connector("pin_ms3", { type: 'frame', origin: { kind: 'vec3', value: [0, 7.620000000000001, 0] } });
part_A3.connector("pin_reset", { type: 'frame', origin: { kind: 'vec3', value: [0, 10.16, 0] } });
part_A3.connector("pin_sleep", { type: 'frame', origin: { kind: 'vec3', value: [0, 12.700000000000001, 0] } });
part_A3.connector("pin_step", { type: 'frame', origin: { kind: 'vec3', value: [0, 15.240000000000002, 0] } });
part_A3.connector("pin_dir", { type: 'frame', origin: { kind: 'vec3', value: [0, 17.78, 0] } });
part_A3.connector("pin_vmot", { type: 'frame', origin: { kind: 'vec3', value: [-12.7, 17.78, 0] } });
part_A3.connector("pin_gnd", { type: 'frame', origin: { kind: 'vec3', value: [-12.7, 15.240000000000002, 0] } });
part_A3.connector("pin_2b", { type: 'frame', origin: { kind: 'vec3', value: [-12.7, 12.700000000000001, 0] } });
part_A3.connector("pin_2a", { type: 'frame', origin: { kind: 'vec3', value: [-12.7, 10.16, 0] } });
part_A3.connector("pin_1a", { type: 'frame', origin: { kind: 'vec3', value: [-12.7, 7.620000000000001, 0] } });
part_A3.connector("pin_1b", { type: 'frame', origin: { kind: 'vec3', value: [-12.7, 5.08, 0] } });
part_A3.connector("pin_vdd", { type: 'frame', origin: { kind: 'vec3', value: [-12.7, 2.539999999999999, 0] } });
// M1: bbox 42.3 x 42.3 x 40 mm; source step is not fetched by import_handoff.
// Rotated bbox envelope: 42.3 x 42.3 x 40 mm; normalized so its lower corner is at local [0,0,0].
const part_M1 = handoffAssembly.part("M1", box(42.3, 42.3, 40), { at: [0, 0, 0] });
part_M1.connector('origin', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
part_M1.connector('bbox_center', { type: 'frame', origin: { kind: 'vec3', value: [21.15, 21.15, 20] } });
part_M1.connector("bbox_x_min", { type: 'frame', origin: { kind: 'vec3', value: [0, 21.15, 20] } });
part_M1.connector("bbox_x_max", { type: 'frame', origin: { kind: 'vec3', value: [42.3, 21.15, 20] } });
part_M1.connector("bbox_y_min", { type: 'frame', origin: { kind: 'vec3', value: [21.15, 0, 20] } });
part_M1.connector("bbox_y_max", { type: 'frame', origin: { kind: 'vec3', value: [21.15, 42.3, 20] } });
part_M1.connector("bbox_z_min", { type: 'frame', origin: { kind: 'vec3', value: [21.15, 21.15, 0] } });
part_M1.connector("bbox_z_max", { type: 'frame', origin: { kind: 'vec3', value: [21.15, 21.15, 40] } });
part_M1.connector("hole_1", { type: 'axis', origin: { kind: 'vec3', value: [5.65, 5.65, 0] }, axis: [0, 0, 1] });
part_M1.connector("hole_2", { type: 'axis', origin: { kind: 'vec3', value: [36.65, 5.65, 0] }, axis: [0, 0, 1] });
part_M1.connector("hole_3", { type: 'axis', origin: { kind: 'vec3', value: [5.65, 36.65, 0] }, axis: [0, 0, 1] });
part_M1.connector("hole_4", { type: 'axis', origin: { kind: 'vec3', value: [36.65, 36.65, 0] }, axis: [0, 0, 1] });
// Cut-out hint for M1 shaft_5mm on +Z: "[22]"; dimensions are handoff hints, not a wall cut operation.
// M2: bbox 42.3 x 42.3 x 40 mm; source step is not fetched by import_handoff.
// Rotated bbox envelope: 42.3 x 42.3 x 40 mm; normalized so its lower corner is at local [0,0,0].
const part_M2 = handoffAssembly.part("M2", box(42.3, 42.3, 40), { at: [0, 0, 0] });
part_M2.connector('origin', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
part_M2.connector('bbox_center', { type: 'frame', origin: { kind: 'vec3', value: [21.15, 21.15, 20] } });
part_M2.connector("bbox_x_min", { type: 'frame', origin: { kind: 'vec3', value: [0, 21.15, 20] } });
part_M2.connector("bbox_x_max", { type: 'frame', origin: { kind: 'vec3', value: [42.3, 21.15, 20] } });
part_M2.connector("bbox_y_min", { type: 'frame', origin: { kind: 'vec3', value: [21.15, 0, 20] } });
part_M2.connector("bbox_y_max", { type: 'frame', origin: { kind: 'vec3', value: [21.15, 42.3, 20] } });
part_M2.connector("bbox_z_min", { type: 'frame', origin: { kind: 'vec3', value: [21.15, 21.15, 0] } });
part_M2.connector("bbox_z_max", { type: 'frame', origin: { kind: 'vec3', value: [21.15, 21.15, 40] } });
part_M2.connector("hole_1", { type: 'axis', origin: { kind: 'vec3', value: [5.65, 5.65, 0] }, axis: [0, 0, 1] });
part_M2.connector("hole_2", { type: 'axis', origin: { kind: 'vec3', value: [36.65, 5.65, 0] }, axis: [0, 0, 1] });
part_M2.connector("hole_3", { type: 'axis', origin: { kind: 'vec3', value: [5.65, 36.65, 0] }, axis: [0, 0, 1] });
part_M2.connector("hole_4", { type: 'axis', origin: { kind: 'vec3', value: [36.65, 36.65, 0] }, axis: [0, 0, 1] });
// Cut-out hint for M2 shaft_5mm on +Z: "[22]"; dimensions are handoff hints, not a wall cut operation.
// M3: bbox 32.2 x 12.2 x 29 mm; source step is not fetched by import_handoff.
// Rotated bbox envelope: 12.2 x 32.2 x 29 mm; normalized so its lower corner is at local [0,0,0].
const part_M3 = handoffAssembly.part("M3", box(32.2, 12.2, 29).rotate([0, 0, 1], 90).translate(12.2, 0, 0), { at: [59.22, 21.42, 0] });
part_M3.connector('origin', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
part_M3.connector('bbox_center', { type: 'frame', origin: { kind: 'vec3', value: [6.1, 16.1, 14.5] } });
part_M3.connector("bbox_x_min", { type: 'frame', origin: { kind: 'vec3', value: [6.1, 0, 14.5] } });
part_M3.connector("bbox_x_max", { type: 'frame', origin: { kind: 'vec3', value: [6.1, 32.2, 14.5] } });
part_M3.connector("bbox_y_min", { type: 'frame', origin: { kind: 'vec3', value: [12.2, 16.1, 14.5] } });
part_M3.connector("bbox_y_max", { type: 'frame', origin: { kind: 'vec3', value: [0, 16.1, 14.5] } });
part_M3.connector("bbox_z_min", { type: 'frame', origin: { kind: 'vec3', value: [6.1, 16.1, 0] } });
part_M3.connector("bbox_z_max", { type: 'frame', origin: { kind: 'vec3', value: [6.1, 16.1, 29] } });
part_M3.connector("hole_1", { type: 'axis', origin: { kind: 'vec3', value: [6.1, 2.3, 0] }, axis: [0, 0, 1] });
part_M3.connector("hole_2", { type: 'axis', origin: { kind: 'vec3', value: [6.1, 29.9, 0] }, axis: [0, 0, 1] });
part_M3.connector("pin_pwm", { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
part_M3.connector("pin_vcc", { type: 'frame', origin: { kind: 'vec3', value: [2.539999999999999, 0, 0] } });
part_M3.connector("pin_gnd", { type: 'frame', origin: { kind: 'vec3', value: [5.079999999999999, 0, 0] } });
// Endpoint connectivity intent only for "GPIO4"; no wire solid or route is generated.
handoffAssembly.mate("wire_1_gpio4", "M3.pin_pwm", "A1.pin_gpio4", 'fastened');
// Endpoint connectivity intent only for "+5V"; no wire solid or route is generated.
handoffAssembly.mate("wire_2_5v", "M3.pin_vcc", "A1.pin_5v", 'fastened');
// Endpoint connectivity intent only for "+3V3"; no wire solid or route is generated.
handoffAssembly.mate("wire_3_3v3", "A1.pin_3v3", "A2.pin_vdd", 'fastened');
// Endpoint connectivity intent only for "+3V3"; no wire solid or route is generated.
handoffAssembly.mate("wire_4_3v3", "A1.pin_3v3", "A3.pin_vdd", 'fastened');
// Endpoint connectivity intent only for "GPIO13"; no wire solid or route is generated.
handoffAssembly.mate("wire_5_gpio13", "A1.pin_gpio13", "A2.pin_en", 'fastened');
// Endpoint connectivity intent only for "GPIO13"; no wire solid or route is generated.
handoffAssembly.mate("wire_6_gpio13", "A1.pin_gpio13", "A3.pin_en", 'fastened');
// Endpoint connectivity intent only for "GPIO14"; no wire solid or route is generated.
handoffAssembly.mate("wire_7_gpio14", "A1.pin_gpio14", "A3.pin_step", 'fastened');
// Endpoint connectivity intent only for "GPIO25"; no wire solid or route is generated.
handoffAssembly.mate("wire_8_gpio25", "A1.pin_gpio25", "A2.pin_dir", 'fastened');
// Endpoint connectivity intent only for "GPIO26"; no wire solid or route is generated.
handoffAssembly.mate("wire_9_gpio26", "A1.pin_gpio26", "A2.pin_step", 'fastened');
// Endpoint connectivity intent only for "GPIO27"; no wire solid or route is generated.
handoffAssembly.mate("wire_10_gpio27", "A1.pin_gpio27", "A3.pin_dir", 'fastened');
return handoffAssembly.model();
