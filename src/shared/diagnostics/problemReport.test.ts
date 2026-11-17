// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  MAX_ISSUE_URL_CHARS,
  MAX_LOG_LINES,
  MAX_SCREENSHOT_BYTES,
  PROBLEM_REPORT_NEW_ISSUE_URL,
  buildProblemReport,
  describeClient,
  knownDiagnosticCodesIn,
  sanitizeReportText,
  screenshotWithinBound,
} from './problemReport';

const FILLET = 'Fillet radius 12 mm exceeds the 4 mm edge.';
const TOKEN = 'sk_live_FAKEPROBLEMTOKEN';
const EMAIL = 'ada@example.com';
const PATH = '/Users/secret/part.kcad.ts';
const URL = 'https://app.kernelcad.com/p/abc?token=sekret';
const RELATIVE = 'examples/manufacturing-showcase/bearing-block.kcad.ts';

const CHROME_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.109 Safari/537.36';

describe('sanitizeReportText', () => {
  it('strips a token, an email, a local path and a query string, and keeps the fillet sentence', () => {
    const input = `${FILLET} ${TOKEN} ${EMAIL} ${PATH} ${URL}`;
    const { text, redactions } = sanitizeReportText(input);
    expect(text).toBe(`${FILLET} [redacted-token] [redacted-email] [redacted-path] https://app.kernelcad.com/p/abc`);
    expect(redactions).toBe(5);
    expect(text).not.toContain('FAKEPROBLEMTOKEN');
    expect(text).not.toContain('sekret');
    expect(text).not.toContain('ada@');
    expect(text).not.toContain('/Users/');
  });

  it('leaves ordinary geometry text, a relative example path and the word token untouched', () => {
    const input = `${FILLET} See ${RELATIVE} and code feature.fillet.failed. The word token is not a credential.`;
    const { text, redactions } = sanitizeReportText(input);
    expect(text).toBe(input);
    expect(redactions).toBe(0);
  });

  it('redacts bearer credentials and home or Windows paths', () => {
    const input = 'Authorization: Bearer abcDEF12345 ~/secret/model.kcad.ts C:\\Users\\ada\\secret.kcad.ts';
    const { text } = sanitizeReportText(input);
    expect(text).toBe('Authorization: [redacted] [redacted-path] [redacted-path]');
    expect(text).not.toContain('abcDEF12345');
    expect(text).not.toContain('secret');
  });

  it('does not treat a question mark followed by a space as a query string', () => {
    expect(sanitizeReportText('Which radius? Use 2 mm.').text).toBe('Which radius? Use 2 mm.');
  });

  it('redacts temporary access keys, secret assignments, publishable keys and URL userinfo', () => {
    const input = [
      'ASIAFAKEKEYEXAMPLE01',
      'AKIAFAKEKEYEXAMPLE01',
      'AWS_SECRET_ACCESS_KEY=fakeSecretValue123/abcd',
      'sb_secret_fakeSecretValue123',
      'sb_publishable_fakePublishable123',
      'https://ada:sekret@files.kernelcad.com/parts/plate.step?token=sekret',
    ].join(' ');
    const { text } = sanitizeReportText(input);
    expect(text).toBe([
      '[redacted-token]',
      '[redacted-token]',
      'AWS_SECRET_ACCESS_KEY=[redacted]',
      '[redacted-token]',
      '[redacted-token]',
      'https://[redacted]@files.kernelcad.com/parts/plate.step',
    ].join(' '));
    expect(text).not.toContain('FAKEKEYEXAMPLE01');
    expect(text).not.toContain('fakeSecretValue123');
    expect(text).not.toContain('fakePublishable123');
    expect(text).not.toContain('ada:sekret');
    expect(text).not.toContain('sekret');
  });

  it('leaves a place name, a short key prefix and a URL without userinfo', () => {
    const input = 'ASIA is a place name. sb_secret_short stays. https://files.kernelcad.com/parts/plate.step The word secret is not a credential.';
    expect(sanitizeReportText(input).text).toBe(input);
    expect(sanitizeReportText(input).redactions).toBe(0);
  });
});

describe('knownDiagnosticCodesIn', () => {
  it('returns a registry code that is written in the failure and ignores lookalikes', () => {
    const text = 'export produced no bytes (export.dxf.non-planar). See app.kernelcad.com and not.a.real.code.';
    expect(knownDiagnosticCodesIn(text)).toEqual(['export.dxf.non-planar']);
  });

  it('does not treat a planted token as a diagnostic code', () => {
    expect(knownDiagnosticCodesIn(`failed ${TOKEN}`)).toEqual([]);
  });
});

describe('describeClient', () => {
  it('reads Chrome on Mac OS X from a desktop user agent', () => {
    expect(describeClient(CHROME_MAC)).toEqual({
      browser: 'Chrome/120.0.6099.109',
      os: 'Mac OS X 10.15.7',
    });
  });

  it('reports unknown for an empty user agent', () => {
    expect(describeClient('')).toEqual({ browser: 'unknown', os: 'unknown' });
  });

  it('does not echo a token planted in the user agent', () => {
    const described = describeClient(`Chrome/120.0.0.0 ${TOKEN}`);
    expect(described.browser).toBe('Chrome/120.0.0.0');
    expect(JSON.stringify(described)).not.toContain('FAKEPROBLEMTOKEN');
  });
});

describe('screenshotWithinBound', () => {
  it('accepts an empty or max-sized viewport image and rejects the rest', () => {
    expect(screenshotWithinBound(0)).toBe(true);
    expect(screenshotWithinBound(MAX_SCREENSHOT_BYTES)).toBe(true);
    expect(screenshotWithinBound(MAX_SCREENSHOT_BYTES + 1)).toBe(false);
    expect(screenshotWithinBound(Number.NaN)).toBe(false);
    expect(screenshotWithinBound(-1)).toBe(false);
  });
});

describe('buildProblemReport', () => {
  const reportedAt = '2026-11-17T00:00:00.000Z';

  function filletReport(overrides: Parameters<typeof buildProblemReport>[0] = {}) {
    return buildProblemReport({
      kind: 'evaluate',
      errorMessage: `${FILLET} ${TOKEN} ${EMAIL} ${PATH}`,
      hint: 'Use a smaller radius.',
      diagnostics: [{ code: 'export.dxf.non-planar', severity: 'error', message: 'not a flat plate' }],
      logLines: [`${FILLET} ${TOKEN}`],
      appVersion: '0.17.0',
      commit: 'a37d69c72',
      userAgent: CHROME_MAC,
      userNote: 'It failed on the top edges.',
      designSource: `return box(20, 30, 10).fillet(1e9); // ${TOKEN} DESIGN_MARKER_8841`,
      includeDesign: false,
      screenshot: 'ready',
      reportedAt,
      ...overrides,
    });
  }

  it('builds the issue text from the sanitized failure and omits the design by default', () => {
    const report = filletReport();
    expect(report.title).toBe(`Studio evaluate failed: ${FILLET} [redacted-token] [redacted-email] [redacted-path]`);
    expect(report.body).toBe([
      '### KernelCAD problem report',
      '',
      'Kind: evaluate',
      'When: 2026-11-17T00:00:00.000Z',
      'App: 0.17.0',
      'Commit: a37d69c72',
      'Browser: Chrome/120.0.6099.109',
      'OS: Mac OS X 10.15.7',
      '',
      '### Error',
      `${FILLET} [redacted-token] [redacted-email] [redacted-path]`,
      '',
      '### Hint',
      'Use a smaller radius.',
      '',
      '### Diagnostics',
      '- export.dxf.non-planar (error): not a flat plate',
      '',
      '### Log',
      `- ${FILLET} [redacted-token]`,
      '',
      '### Screenshot',
      'Attach the downloaded kernelcad-viewport.png. It is the model viewport only.',
      '',
      '### Design',
      'Not included. Check "Include the design" to download it, then attach that file yourself.',
      '',
      '### Note',
      'It failed on the top edges.',
      '',
      'Review this text before submitting. The screenshot and the design are not uploaded by Studio.',
    ].join('\n'));
    expect(report.designAttachment).toBeUndefined();
    expect(report.includeDesign).toBe(false);
    expect(report.body).not.toContain('DESIGN_MARKER_8841');
    expect(report.body).not.toContain('FAKEPROBLEMTOKEN');
    expect(report.issueUrl.startsWith(`${PROBLEM_REPORT_NEW_ISSUE_URL}?title=`)).toBe(true);
    expect(decodeURIComponent(report.issueUrl)).toContain(FILLET);
    expect(report.issueUrl).not.toContain('FAKEPROBLEMTOKEN');
    expect(report.issueUrl).not.toContain('DESIGN_MARKER_8841');
  });

  it('downloads a sanitized design only after explicit opt-in and still keeps it out of the issue text', () => {
    const report = filletReport({ includeDesign: true });
    expect(report.includeDesign).toBe(true);
    expect(report.designAttachment).toBe('return box(20, 30, 10).fillet(1e9); // [redacted-token] DESIGN_MARKER_8841');
    expect(report.body).toContain('kernelcad-design.kcad.ts');
    expect(report.body).not.toContain('DESIGN_MARKER_8841');
    expect(report.body).not.toContain('FAKEPROBLEMTOKEN');
    expect(report.designAttachment).not.toContain('FAKEPROBLEMTOKEN');
  });

  it('keeps the hint on a diagnostic row and redacts a secret inside it', () => {
    const report = buildProblemReport({
      kind: 'evaluate',
      errorMessage: FILLET,
      diagnostics: [{
        code: 'feature.edge-feature.short-edges-skipped',
        severity: 'error',
        message: FILLET,
        hint: 'OCCT blend solver rejects this radius. AWS_SECRET_ACCESS_KEY=fakeSecretValue123',
      }],
      appVersion: '0.17.0',
      reportedAt,
    });
    expect(report.body).toContain(`- feature.edge-feature.short-edges-skipped (error): ${FILLET} — OCCT blend solver rejects this radius. AWS_SECRET_ACCESS_KEY=[redacted]`);
    expect(report.body).not.toContain('fakeSecretValue123');
  });

  it('uses the arguments of each call, so a later failure does not keep the earlier one', () => {
    const first = buildProblemReport({ kind: 'evaluate', errorMessage: 'first fillet failure', reportedAt, appVersion: '0.17.0' });
    const second = buildProblemReport({ kind: 'export', errorMessage: 'second export failure', reportedAt, appVersion: '0.17.0' });
    expect(first.body).toContain('Kind: evaluate');
    expect(first.body).toContain('first fillet failure');
    expect(first.body).not.toContain('second export failure');
    expect(second.body).toContain('Kind: export');
    expect(second.body).toContain('second export failure');
    expect(second.body).not.toContain('first fillet failure');
  });

  it('keeps the log tail and drops older lines, redacting a token that remains', () => {
    const lines = Array.from({ length: MAX_LOG_LINES + 10 }, (_, index) => `line-${index + 1}`);
    lines[0] = 'DROPPED_LINE_MARKER';
    lines[lines.length - 1] = `KEPT_TAIL_MARKER ${TOKEN}`;
    const report = buildProblemReport({ kind: 'export', errorMessage: 'export failed', logLines: lines, reportedAt, appVersion: '0.17.0' });
    expect(report.body).not.toContain('DROPPED_LINE_MARKER');
    expect(report.body).toContain(`- KEPT_TAIL_MARKER [redacted-token]`);
    expect(report.body).toContain(`- line-${10 + 1}`);
    expect(report.body).not.toContain('FAKEPROBLEMTOKEN');
  });

  it('drops a diagnostic code that is really a token and keeps a registry code', () => {
    const report = buildProblemReport({
      kind: 'export',
      errorMessage: 'export produced no bytes',
      diagnostics: [
        { code: TOKEN, message: 'should not survive' },
        { code: 'export.dxf.non-planar', severity: 'error', message: `flat plate ${TOKEN}` },
      ],
      reportedAt,
      appVersion: '0.17.0',
    });
    expect(report.body).toContain('- export.dxf.non-planar (error): flat plate [redacted-token]');
    expect(report.body).not.toContain('FAKEPROBLEMTOKEN');
    expect(report.body).not.toContain('should not survive');
  });

  it('rejects a version, commit or timestamp that is not the documented shape', () => {
    const report = buildProblemReport({
      kind: 'general',
      appVersion: `0.17.0+${TOKEN}`,
      commit: TOKEN,
      reportedAt: 'yesterday',
      userAgent: '',
    });
    expect(report.body).toContain('App: dev');
    expect(report.body).not.toContain('Commit:');
    expect(report.body).not.toContain('When:');
    expect(report.body).not.toContain('FAKEPROBLEMTOKEN');
  });

  it('bounds the GitHub issue URL and does not leave a token in it', () => {
    const huge = `${TOKEN}\n${'A'.repeat(20_000)}`;
    const report = buildProblemReport({
      kind: 'evaluate',
      errorMessage: huge,
      logLines: [huge],
      reportedAt,
      appVersion: '0.17.0',
    });
    expect(report.issueUrl.length).toBeLessThanOrEqual(MAX_ISSUE_URL_CHARS);
    expect(report.issueUrl).not.toContain('FAKEPROBLEMTOKEN');
    expect(decodeURIComponent(report.issueUrl)).not.toContain('FAKEPROBLEMTOKEN');
    expect(decodeURIComponent(report.issueUrl)).toContain('[redacted-token]');
  });
});
