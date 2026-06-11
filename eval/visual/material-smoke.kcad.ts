// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Visual smoke for the W1 material expansion: glass + brushed-metal + textured.
//
// Three primitives side by side, each demonstrating one new PBR archetype.
// The matte/glass/metal mean luminance must visibly differ when rendered with
// the auto-applied studio environment (Task 7).
//
// Run:
//   kernelcad render eval/visual/material-smoke.kcad.ts -o /tmp/material-smoke.png

// Glass cylinder (transmission + volume absorption + ior). The renderer
// auto-applies the bundled studio HDRI because any material here has
// `transmission > 0`. cylinder(h, r) — height first, radius second.
const glass = cylinder(30, 15)
  .translate(-40, 0, 0)
  .material({
    baseColor: '#ffffff',
    transmission: 0.9,
    ior: 1.5,
    thickness: 5,
    attenuationColor: '#88ddee',
    attenuationDistance: 10,
    roughness: 0.0,
  });

// Brushed-metal cube (anisotropic specular). box(x, y, z, centered).
const metal = box(30, 30, 30, true)
  .translate(0, 0, 0)
  .material({
    baseColor: '#b0b0b0',
    metalness: 1.0,
    roughness: 0.35,
    anisotropy: 0.9,
    anisotropyRotation: 0,
  });

// Textured-acetate slab. The path is committed alongside this file so the
// smoke is deterministic — no network fetch, no cache state.
const acetate = box(40, 30, 2, true)
  .translate(40, 0, 0)
  .material({
    baseColor: '#1a1a1a',
    roughness: 0.55,
    textures: {
      albedo: { path: './textures/acetate-1x1.png' },
    },
  });

return glass.union(metal).union(acetate);
