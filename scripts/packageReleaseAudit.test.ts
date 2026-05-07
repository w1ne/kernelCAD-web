import { describe, expect, it } from 'vitest';
import { auditPackageJsonText, formatPackageAuditReport } from './packageReleaseAudit';

describe('packageReleaseAudit', () => {
  it('requires prepack to build the CLI bundle before npm pack or publish', () => {
    const result = auditPackageJsonText(JSON.stringify({
      bin: { kernelcad: 'dist/cli/index.js' },
      files: ['dist/cli', 'README.md', 'LICENSE'],
      scripts: {},
    }));

    expect(result.blockers).toContainEqual({
      kind: 'missing-prepack-build',
      message: 'package.json scripts.prepack must run npm run build:cli',
    });
    expect(formatPackageAuditReport(result)).toContain('missing-prepack-build');
  });

  it('accepts a package that builds the CLI and includes the bin path', () => {
    const result = auditPackageJsonText(JSON.stringify({
      bin: { kernelcad: 'dist/cli/index.js' },
      files: ['dist/cli', 'README.md', 'LICENSE'],
      scripts: { prepack: 'npm run build:cli' },
    }));

    expect(result.blockers).toEqual([]);
  });
});
