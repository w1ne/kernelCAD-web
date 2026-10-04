// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Studio routes', () => {
  for (const route of ['index', 'studio']) {
    it(`${route} opens the Studio for local CAD without requiring sign-in`, () => {
      const source = readFileSync(`src/studio/routes/${route}.tsx`, 'utf8');
      // The Studio itself, with only header chrome (the command palette) added.
      expect(source).toMatch(/return <App( headerRight=\{<StudioCommandPalette \/>\})? \/>;/);
      expect(source).not.toContain('StudioAuthGate');
      expect(source).not.toContain('StartPage');
    });
  }
});
