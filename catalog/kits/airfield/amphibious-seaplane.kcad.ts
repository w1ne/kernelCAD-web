meta({
  name: 'amphibious-seaplane',
  license: 'CC0-1.0',
  title: 'Amphibious seaplane',
  description: 'Twin-engine seaplane with a high wing, twin floats and water-ready hull profile.',
  tags: ['airfield', 'aviation', 'airport', 'low poly', 'scene prop', 'CC0'],
  kit: 'airfield',
  category: 'prop',
  origin: 'base',
  compat: ['airfield', 'airport', 'aviation', 'transport', 'scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const color = param('color', '#688b82', { label: 'Asset color' });
const p = assembly("amphibious-seaplane");
p.part("fuselage", sphere(52).scale([9.712, 1, 0.72]).translate(0, 0, 190).scale(scale).color(color));
p.part("cockpit-canopy", sphere(32.24).scale([1.05, 0.82, 0.6]).translate(171.7, 0, 222.198).scale(scale).color(color));
p.part("main-wing", extrudePolygon([[-202, -640], [141.4, -640], [20.2, 0], [141.4, 640], [-202, 640], [-60.6, 0]], 16).translate(0, 0, 203.478).scale(scale).color(color));
p.part("tailplane", extrudePolygon([[-353.5, -217.6], [-222.2, -217.6], [-272.7, 0], [-222.2, 217.6], [-353.5, 217.6], [-313.1, 0]], 14).translate(0, 0, 208.72).scale(scale).color(color));
p.part("vertical-tail", box(161.6, 16, 83.2, true).translate(-343.4, 0, 231.184).scale(scale).color(color));
p.part("left-wing-strut", box(12, 12, 71.136, true).translate(-30.3, -230.4, 182.512).scale(scale).color(color));
p.part("right-wing-strut", box(12, 12, 71.136, true).translate(-30.3, 230.4, 182.512).scale(scale).color(color));
p.part("engine-1", sphere(18.72).scale([1.25, 0.7, 0.7]).translate(20.2, -435.2, 168.478).scale(scale).color(color));
p.part("engine-1-prop-hub", sphere(8.84).scale([0.72, 0.72, 0.72]).translate(95.95, -435.2, 168.478).scale(scale).color(color));
p.part("engine-1-blade-1", box(8, 79.04, 10, true).rotate([1, 0, 0], 0).translate(95.95, -435.2, 168.478).scale(scale).color(color));
p.part("engine-1-blade-2", box(8, 79.04, 10, true).rotate([1, 0, 0], 120).translate(95.95, -435.2, 168.478).scale(scale).color(color));
p.part("engine-1-blade-3", box(8, 79.04, 10, true).rotate([1, 0, 0], 240).translate(95.95, -435.2, 168.478).scale(scale).color(color));
p.part("engine-2", sphere(18.72).scale([1.25, 0.7, 0.7]).translate(20.2, 435.2, 168.478).scale(scale).color(color));
p.part("engine-2-prop-hub", sphere(8.84).scale([0.72, 0.72, 0.72]).translate(95.95, 435.2, 168.478).scale(scale).color(color));
p.part("engine-2-blade-1", box(8, 79.04, 10, true).rotate([1, 0, 0], 0).translate(95.95, 435.2, 168.478).scale(scale).color(color));
p.part("engine-2-blade-2", box(8, 79.04, 10, true).rotate([1, 0, 0], 120).translate(95.95, 435.2, 168.478).scale(scale).color(color));
p.part("engine-2-blade-3", box(8, 79.04, 10, true).rotate([1, 0, 0], 240).translate(95.95, 435.2, 168.478).scale(scale).color(color));
p.part("left-float", sphere(22.88).scale([3.4, 0.48, 0.48]).translate(-30.3, -243.2, 62).scale(scale).color(color));
p.part("left-float-strut", box(12, 12, 130.496, true).translate(-20.2, -243.2, 138.23).scale(scale).color(color));
p.part("right-float", sphere(22.88).scale([3.4, 0.48, 0.48]).translate(-30.3, 243.2, 62).scale(scale).color(color));
p.part("right-float-strut", box(12, 12, 130.496, true).translate(-20.2, 243.2, 138.23).scale(scale).color(color));
p.part("nose-gear-strut", box(12, 12, 124.56, true).translate(313.1, 0, 96.28).scale(scale).color(color));
p.part("nose-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(313.1, 9, 17).scale(scale).color(color));
p.part("left-main-gear-strut", box(14, 14, 173.478, true).translate(-70.7, -179.2, 120.739).scale(scale).color(color));
p.part("left-main-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(-70.7, -170.2, 17).scale(scale).color(color));
p.part("right-main-gear-strut", box(14, 14, 173.478, true).translate(-70.7, 179.2, 120.739).scale(scale).color(color));
p.part("right-main-wheel", cylinder(18, 17, 8).rotate([1, 0, 0], 90).translate(-70.7, 188.2, 17).scale(scale).color(color));

return p.model();
