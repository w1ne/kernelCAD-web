// Local capture-only reproduction for sew() option-key validation.
import assert from 'node:assert/strict';
import { CaptureSession } from '../../../../src/modeling/capture/captureSession';
import { createModelingApi } from '../../../../src/modeling/api';
import { KernelError } from '../../../../src/shared/intent/kernelError';

const controls: [number, number, number][][] = [
  [[0, 0, 0], [0, 10, 0]],
  [[10, 0, 0], [10, 10, 0]],
];
const surfaceOptions = { controls, degree: { u: 1, v: 1 } };

const invalidSession = new CaptureSession();
const invalidApi = createModelingApi({ session: invalidSession });
const invalidSurface = invalidApi.nurbsSurface(surfaceOptions);
const sewRecords = () => invalidSession.getRecords().filter((candidate) => candidate.kind === 'surfaceSew').length;
const before = sewRecords();
let error: KernelError | undefined;
try {
  invalidApi.sew([invalidSurface], { requireClosd: true } as never);
} catch (caught) {
  if (caught instanceof KernelError) error = caught;
  else throw caught;
}
assert.ok(error, 'misspelled requireClosed must throw KernelError');
assert.equal(error.code, 'feature.invalid-args');
assert.equal(sewRecords(), before);

const validSession = new CaptureSession();
const validApi = createModelingApi({ session: validSession });
const validSurface = validApi.nurbsSurface(surfaceOptions);
const sewn = validApi.sew([validSurface], { tolerance: 0.01, requireClosed: true });
const record = validSession.getRecords().find((candidate) => candidate.id === sewn.id);
assert.ok(record, 'valid options must capture a surfaceSew feature');
assert.equal((record.metadata as { requireClosed?: boolean }).requireClosed, true);

console.log(JSON.stringify({
  invalidCall: 'sew([surface], { requireClosd: true })',
  error: { code: error.code, message: error.message },
  sewRecordsBefore: before,
  sewRecordsAfter: sewRecords(),
  correctedCall: 'sew([surface], { tolerance: 0.01, requireClosed: true })',
  correctedRecord: {
    toleranceMm: (record.params.tolerance as { evaluated: number }).evaluated,
    requireClosed: (record.metadata as { requireClosed?: boolean }).requireClosed,
  },
  scope: 'local capture validation only; no geometry lowering',
}, null, 2));
