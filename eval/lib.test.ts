import { describe, it, expect } from 'vitest';
import { extractScript } from './lib';

describe('extractScript', () => {
  it('extracts a typescript-fenced block', () => {
    const input = 'Here is the script:\n```typescript\nreturn box(10, 10, 10);\n```\nDone.';
    expect(extractScript(input)).toBe('return box(10, 10, 10);');
  });

  it('extracts a ts-fenced block', () => {
    const input = '```ts\nreturn box(1,2,3);\n```';
    expect(extractScript(input)).toBe('return box(1,2,3);');
  });

  it('extracts a kcad-fenced block', () => {
    const input = '```kcad\nreturn sphere(5);\n```';
    expect(extractScript(input)).toBe('return sphere(5);');
  });

  it('extracts a fenced block with no language tag', () => {
    const input = '```\nreturn cylinder(10, 5);\n```';
    expect(extractScript(input)).toBe('return cylinder(10, 5);');
  });

  it('uses the first fence when multiple are present', () => {
    const input = '```typescript\nreturn box(1,1,1);\n```\nNo wait:\n```typescript\nreturn box(2,2,2);\n```';
    expect(extractScript(input)).toBe('return box(1,1,1);');
  });

  it('returns the whole text when no fence is present', () => {
    expect(extractScript('return box(3,3,3);')).toBe('return box(3,3,3);');
  });

  it('returns null on empty input', () => {
    expect(extractScript('')).toBeNull();
    expect(extractScript('   \n\n  ')).toBeNull();
  });

  it('ignores fences with unrecognised language tags', () => {
    const input = '```python\nprint("nope")\n```\n```typescript\nreturn box(1,1,1);\n```';
    expect(extractScript(input)).toBe('return box(1,1,1);');
  });
});
