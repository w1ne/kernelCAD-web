import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { CaptureSession } from '../../../src/modeling/capture/captureSession';
import { createApi } from '../../../src/modeling/api';

const PNG_1X1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c62000000000005000150fdb88e0000000049454e44ae426082',
  'hex',
);

describe('virtual feature capture records', () => {
  it('exports byte-stable virtual feature records', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'kernelcad-virtual-records-'));
    try {
      const imgPath = join(tmpDir, 'overlay.png');
      writeFileSync(imgPath, PNG_1X1);

      const session = new CaptureSession();
      session.scriptDir = tmpDir;
      const api = createApi({ session });

      api.param('angleDeg', 0, { min: 0, max: 180 });
      api.referenceImage('./overlay.png', {
        plane: 'xz',
        anchor: [1, 2, 3],
        scale: 42,
        opacity: 1.5,
        flipU: true,
      });
      api.setRenderEnvironment({ preset: 'studio', intensity: 2.5, rotation: 45 });
      api.setCameraTarget(1, 2, 3);
      api.setCameraDistance(250);
      api.animationView({
        tracks: [{ param: 'angleDeg', keys: [{ atMs: 300, value: 30 }, { atMs: 0, value: 0 }] }],
        fps: 24,
      });

      const virtualRecords = session.exportSession().records.filter((record) => (
        record.kind === 'referenceImage' ||
        record.kind === 'renderEnvironment' ||
        record.kind === 'cameraTarget' ||
        record.kind === 'animationView'
      ));

      expect(virtualRecords).toEqual([
        {
          id: 'referenceImage_1',
          kind: 'referenceImage',
          params: {},
          inputs: {},
          transforms: [],
          suppressed: false,
          metadata: {
            virtual: true,
            path: imgPath,
            plane: 'xz',
            anchor: [1, 2, 3],
            scale: 42,
            opacity: 1,
            flipU: true,
            flipV: false,
            pixelWidth: 1,
            pixelHeight: 1,
          },
        },
        {
          id: 'renderEnvironment_1',
          kind: 'renderEnvironment',
          params: {},
          inputs: {},
          transforms: [],
          suppressed: false,
          metadata: {
            virtual: true,
            preset: 'studio',
            intensity: 2.5,
            rotation: 45,
          },
        },
        {
          id: 'cameraTarget_1',
          kind: 'cameraTarget',
          params: {},
          inputs: {},
          transforms: [],
          suppressed: false,
          metadata: {
            virtual: true,
            target: [1, 2, 3],
          },
        },
        {
          id: 'cameraTarget_2',
          kind: 'cameraTarget',
          params: {},
          inputs: {},
          transforms: [],
          suppressed: false,
          metadata: {
            virtual: true,
            target: [1, 2, 3],
            distance: 250,
          },
        },
        {
          id: 'animationView_1',
          kind: 'animationView',
          params: {},
          inputs: {},
          transforms: [],
          suppressed: false,
          metadata: {
            virtual: true,
            fps: 24,
            durationMs: 300,
            tracks: [{
              param: 'angleDeg',
              keys: [
                { atMs: 0, value: 0, ease: 'linear' },
                { atMs: 300, value: 30, ease: 'linear' },
              ],
            }],
          },
        },
      ]);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('keeps virtual feature construction outside CaptureSession', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/modeling/capture/captureSession.ts'),
      'utf8',
    );

    expect(source).toContain("from './virtualFeatureRecords'");
    expect(source).not.toContain("from 'node:fs'");
    expect(source).not.toContain("from 'node:path'");
    expect(source).not.toContain("from './imageDimensions'");
    expect(source).not.toContain('isHdriPresetKey');
    expect(source).not.toContain('normalizeAnimationView');
    expect(source).not.toContain('ANIMATION_EASES');
  });
});
