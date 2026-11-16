// Manufacturing benchmark case 07 (#1227): a CNC linear slide with end
// stops, the prismatic mechanism case.
//
// Prompt: "A 6061 aluminium rail, 120 mm long and 10 mm tall, milled with an
// 8 mm end stop at each end and an M5 clearance hole through each stop. A
// 30 mm acetal carriage rides over the rail with 0.2 mm clearance on the
// sides and the top. It must slide from 1 mm off the near stop to 1 mm off
// the far stop without touching anything. Keep the clearances when the rail
// gets wider."
//
// Parts and interfaces the benchmark checks:
//   - `rail`: 120 x RailWidth x 10 mm bar with an 8 x RailWidth x 20 mm stop
//     at each end; one 5.5 mm M5 clearance hole through each stop, axis at
//     x = 4 and x = 116, y = RailWidth / 2; connector `track` on the x axis
//     at (9, 0, 0), 1 mm off the near stop;
//   - `carriage`: 30 x (RailWidth + 10) x 16 mm block with a
//     30 x (RailWidth + 0.4) x 10.2 mm channel, so 0.2 mm side and top
//     clearance to the rail; connector `track` at its local origin, the
//     channel's near bottom corner on the rail side y = 0;
//   - mate: `slide` (prismatic rail.track -> carriage.track, 0..72 mm), which
//     ends 1 mm off the far stop at x = 112.
// limitsMm takes numbers only, so the 72 mm travel is a literal: a rail
// length edit would also need the limit edited, and that is not checked.
// Screws, carriage wear and the slide's running friction are not modelled.
const railWidth = param('RailWidth', 20, { unit: 'mm', min: 12, max: 40 });
const railLength = 120;
const stop = 8;
const clearance = 0.2;
const carriageLength = 30;
const travel = 72;

const m5Hole = cylinder(20, 2.75);
const rail = box(railLength, railWidth, 10)
  .union(box(stop, railWidth, 20))
  .union(box(stop, railWidth, 20).translate(railLength - stop, 0, 0))
  .subtract(m5Hole.translate(stop / 2, railWidth.divide(2), 0))
  .subtract(m5Hole.translate(railLength - stop / 2, railWidth.divide(2), 0));

const carriage = box(carriageLength, railWidth.add(10), 16).translate(0, -5, 0)
  .subtract(box(carriageLength, railWidth.add(2 * clearance), 10 + clearance).translate(0, -clearance, 0));

const trackAt = (x: number) => ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value: [x, 0, 0] as [number, number, number] }, axis: [1, 0, 0] as [number, number, number] });
const slide = assembly('linear-slide-stops');
slide.part('rail', rail.color('#9aa4ad')).connector('track', trackAt(stop + 1));
slide.part('carriage', carriage.color('#2f3b45')).connector('track', trackAt(0));
slide.mate('slide', 'rail.track', 'carriage.track', 'prismatic', { limitsMm: [0, travel] });
return slide.solvedModel({}, { validate: 'error' });
