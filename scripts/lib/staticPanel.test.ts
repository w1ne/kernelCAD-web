import { describe, it, expect } from 'vitest';
import { tmpdir } from 'node:os';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { composeStaticPanel } from './staticPanel';
import sharp from 'sharp';

describe('composeStaticPanel', () => {
  it('produces a 1920x1080 PNG with 4 quadrants of expected size', async () => {
    const dir = join(tmpdir(), `static-panel-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });

    // Create a fake hero frame (1920x1080 solid color)
    const hero = await sharp({
      create: { width: 1920, height: 1080, channels: 3, background: { r: 50, g: 80, b: 120 } },
    })
      .png()
      .toBuffer();

    const panelPath = join(dir, 'panel.png');
    await composeStaticPanel({
      promptText: 'Build a bracket with one hole.',
      scriptSource: 'const w = 60; box(w, 40, 5);',
      heroFramePngBuffer: hero,
      score: { passed: true, value: 1.0, criteria: ['volume', 'face-count'] },
      outputPath: panelPath,
    });

    expect(existsSync(panelPath)).toBe(true);
    const meta = await sharp(panelPath).metadata();
    expect(meta.width).toBe(1920);
    expect(meta.height).toBe(1080);
  });
});
