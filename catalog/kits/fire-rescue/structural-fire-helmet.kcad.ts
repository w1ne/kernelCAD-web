// SPDX-License-Identifier: CC0-1.0
// Structural helmet with brim, raised shell, ear flaps, face shield and front shield plate. Material controls: shield and visor, helmet shell, chin strap; weathered and highVisibility presets.
meta({
  name: "structural-fire-helmet",
  license: 'CC0-1.0',
  title: "Structural fire helmet",
  description: "Structural helmet with brim, raised shell, ear flaps, face shield and front shield plate. Material controls: shield and visor, helmet shell, chin strap; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const shieldColor = param('shieldColor', '#9dc2c8', { label: 'Shield and visor' });
const helmetShellColor = param('helmetShellColor', '#c73530', { label: 'Helmet shell' });
const chinStrapColor = param('chinStrapColor', '#303539', { label: 'Chin strap' });
presets({
  weathered: { shieldColor: '#809ea2', helmetShellColor: '#87534d', chinStrapColor: '#424340' },
  highVisibility: { shieldColor: '#d9d4a5', helmetShellColor: '#e38426', chinStrapColor: '#303539' },
});
const p = assembly("structural-fire-helmet");
const groundOffset = -35;
const add = (name, shape, finish = helmetShellColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("helmet-brim", cylinder(32, 250, 12).translate(0, 0, 130), shieldColor);
const helmetRing = (radius: number, segments: number) => {
  let profile = path().moveTo(radius, 0);
  for (let i = 1; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    profile = profile.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
  }
  return profile.close();
};
const helmetProfiles = [helmetRing(165, 12), helmetRing(150, 12), helmetRing(85, 12), helmetRing(18, 12)];
const helmetShell = helmetProfiles[0].loft(helmetProfiles.slice(1), {
  planes: [160, 210, 290, 330].map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
  ruled: true,
});
add("helmet-shell", helmetShell, helmetShellColor);
add("front-shield", box(115, 30, 90, true).translate(0, -160, 255), shieldColor);
add("face-shield", box(185, 20, 105, true).translate(0, -190, 147.5), shieldColor);
add("ear-flap--1", box(65, 170, 120, true).translate(-185, 0, 165), shieldColor);
add("chin-strap--1", box(35, 40, 105, true).translate(-110, -15, 87.5), chinStrapColor);
add("ear-flap-1", box(65, 170, 120, true).translate(185, 0, 165), shieldColor);
add("chin-strap-1", box(35, 40, 105, true).translate(110, -15, 87.5), chinStrapColor);

return p.model();
