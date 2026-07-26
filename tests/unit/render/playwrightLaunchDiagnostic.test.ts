import { describe, expect, it } from 'vitest';
import { formatPlaywrightLaunchError } from '../../../src/agent/render/headlessRender';

describe('formatPlaywrightLaunchError', () => {
  it('maps Playwright missing-executable failures to the exact Chromium recovery command', () => {
    const cause = new Error(
      "browserType.launch: Executable doesn't exist at /cache/chrome-headless-shell\n" +
      'Please run the following command to download new browsers:\n' +
      '    npx playwright install',
    );

    const result = formatPlaywrightLaunchError(cause);

    expect(result).not.toBe(cause);
    expect(result.message).toContain('npx playwright install chromium');
    expect(result.cause).toBe(cause);
  });

  it('leaves unrelated launch failures unchanged', () => {
    const cause = new Error('browserType.launch: permission denied');

    expect(formatPlaywrightLaunchError(cause)).toBe(cause);
  });

  it('leaves non-Error values unchanged', () => {
    expect(formatPlaywrightLaunchError('launch failed')).toBe('launch failed');
  });
});
