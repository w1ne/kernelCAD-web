---
id: appearance-track-led-chase
title: Animate LED colour along a strip with appearance tracks
tags: [assembly, material, render]
keywords:
  - LED strip chase light running along a path
  - animate colour emissive glow over time
  - indicator lamp turns on off in sequence
  - appearance track target channel emissive keyframes
when_to_use: >-
  A capture or playback must show parts changing colour or lighting up over
  time (status LEDs, a light pulse travelling along a strip, an energy-flow
  path) without any geometry moving.
---

```typescript
const strip = assembly('led chase');
strip.part('tape', box(80, 8, 1).finish('abs', { color: '#2b2f36' }));
const tracks = [];
for (let i = 0; i < 8; i += 1) {
  const name = `led-${i}`;
  strip.part(name, box(5, 5, 1.6).translate(2.5 + i * 10, 1.5, 1).finish('plastic-glossy', { color: '#1a1a1a' }));
  const start = i * 120;
  const keys = [
    { atMs: start, value: '#000000' },
    { atMs: start + 90, value: '#2bff88', ease: 'easeOut' as const },
    { atMs: start + 500, value: '#000000', ease: 'easeIn' as const },
  ];
  if (start > 0) keys.unshift({ atMs: 0, value: '#000000' });
  tracks.push({ target: name, channel: 'emissive' as const, keys });
}
animationView({ name: 'chase', tracks, fps: 24 });
return strip.solvedModel({});
```

Each segment is its own part, and each appearance track is the same pulse
delayed by one step, so the light travels along the strip. `target` takes the
part name (or a `*` pattern); `channel` is `emissive` (self-lit, `#000000` is
off) or `color`. `capture_animation` renders it without re-solving the model.
The tracks only colour the render. They do not simulate light falling on
neighbouring parts.
