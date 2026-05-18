import { describe, it, expect } from 'vitest';
import { RecomputeEngine } from '../../../../src/modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../../src/modeling/backends/occt/occtLowerer';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';

describe('RecomputeEngine.onRelower', () => {
  it('fires callback with affectedIds after params.update relower', async () => {
    const session = new CaptureSession();
    const engine = new RecomputeEngine(createOcctLowerer(session));
    const received: string[][] = [];
    const unsubscribe = engine.onRelower((affectedIds) => {
      received.push([...affectedIds]);
    });
    // Trigger a re-lower by calling the public emit helper directly
    // (full params.update integration covered in PR 3 integration test)
    engine.emitRelower(['feat_1', 'feat_2']);
    expect(received).toEqual([['feat_1', 'feat_2']]);
    unsubscribe();
    engine.emitRelower(['feat_3']);
    expect(received).toEqual([['feat_1', 'feat_2']]);
  });
});
