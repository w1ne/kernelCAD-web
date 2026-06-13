import { addSketchTextTool } from './addSketchText';
import { embossTextTool } from './embossText';

/** The text-authoring mode. Each value maps 1:1 to a dedicated authoring tool. */
export type TextMode = 'sketch' | 'emboss';

export interface AddTextInput {
  mode: TextMode;
  /**
   * Mode-specific params, forwarded verbatim to the selected authoring tool:
   * - sketch: { code, content, size, font?, align?, position?, rotation?, bindAs? }
   * - emboss: { code, target, textContent, size, depth, face, fontFamily?, align?, anchorU?, anchorV?, rotation?, scaleMode?, bindAs? }
   * Each tool fails closed on its own missing required params.
   */
  [key: string]: unknown;
}

/**
 * Unified text-authoring entrypoint. Replaces add_sketch_text and emboss_text.
 *
 * Pure routing layer: dispatches on `mode` and forwards all other params to the
 * underlying authoring tool unchanged. The tools' behavior is untouched.
 */
export function addTextTool(input: AddTextInput): Promise<unknown> {
  const { mode, ...rest } = input;
  switch (mode) {
    case 'sketch':
      return addSketchTextTool(rest as unknown as Parameters<typeof addSketchTextTool>[0]);
    case 'emboss':
      return embossTextTool(rest as unknown as Parameters<typeof embossTextTool>[0]);
    default:
      // Reject (not sync-throw) so the function honors its Promise return type
      // for every input — callers can rely on `.catch(...)`.
      return Promise.reject(
        new Error(`Unknown add_text mode: ${String(mode)}. Valid: sketch, emboss.`),
      );
  }
}
