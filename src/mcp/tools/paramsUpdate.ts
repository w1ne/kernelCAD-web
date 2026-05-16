import type { ShapeBackend } from '../../kernel/backends/backend';
import { isKernelError } from '../../intent/kernelError';
import type { SoftWarning } from '../../runtime/softWarning';
import { getActiveMcpSession, setActiveMcpSession } from '../activeSession';

export interface ParamsUpdateInput {
  edits: Array<{ name: string; value: number | boolean }>;
}

export interface SerializedShapePreview {
  featureId: string;
  volume: number;
  surfaceArea: number;
  bbox: { min: [number, number, number]; max: [number, number, number] };
}

export type ParamsUpdateOutput =
  | {
      ok: true;
      shape: SerializedShapePreview;
      relowered: string[];
      skipped: string[];
      warnings: SoftWarning[];
    }
  | {
      ok: false;
      error: string;
      errorCode?: string;
      errorHint?: string;
    };

export async function paramsUpdateTool(input: ParamsUpdateInput): Promise<ParamsUpdateOutput> {
  const active = getActiveMcpSession();
  if (!active) {
    return {
      ok: false,
      error: 'No active kernelCAD session. Run evaluate_script successfully before calling kcad.params.update.',
      errorCode: 'feature.invalid-args',
      errorHint: 'invalid-args.session.no-active-session',
    };
  }

  try {
    const result = await active.session.params.update(input.edits);
    const tailId = active.session.getRecords().at(-1)?.id ?? active.tailId ?? '<unknown>';
    setActiveMcpSession({
      session: active.session,
      tailId,
      tailShape: result.shape,
    });
    return {
      ok: true,
      shape: serializeShapePreview(result.shape, tailId),
      relowered: result.relowered,
      skipped: result.skipped,
      warnings: result.warnings,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      errorCode: isKernelError(e) ? e.code : undefined,
      errorHint: isKernelError(e) ? e.hint : undefined,
    };
  }
}

function serializeShapePreview(shape: ShapeBackend, featureId: string): SerializedShapePreview {
  const bbox = shape.boundingBox();
  return {
    featureId,
    volume: shape.volume(),
    surfaceArea: shape.surfaceArea(),
    bbox: { min: bbox.min, max: bbox.max },
  };
}
