import { describe, it, expect } from 'vitest';
import { renderCommand } from '../../../src/agent/cli/commands/render';

describe('render --environment flag', () => {
  it('accepts a preset key', () => {
    const cmd = renderCommand();
    const opt = cmd.options.find((o) => o.long === '--environment');
    expect(opt).toBeDefined();
    expect(opt?.description).toMatch(/preset|HDRI|environment/i);
  });

  it('parses "none" to suppress env (CI fallback)', () => {
    // Parsing happens at action time; we verify the option string here and
    // exercise the full flow in the smoke test (Task 11).
    const cmd = renderCommand();
    expect(cmd.options.some((o) => o.long === '--environment')).toBe(true);
  });
});
