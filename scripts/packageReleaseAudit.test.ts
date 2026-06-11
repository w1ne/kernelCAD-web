import { describe, expect, it } from 'vitest';
import { auditPackageJsonText, auditPackageReleaseState, formatPackageAuditReport } from './packageReleaseAudit';

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
    expect(result.blockers).toContainEqual({
      kind: 'missing-prepack-build',
      message: 'package.json scripts.prepack must run npm run build:player',
    });
    expect(formatPackageAuditReport(result)).toContain('missing-prepack-build');
  });

  it('accepts a package that builds the CLI and includes the bin path', () => {
    const result = auditPackageJsonText(JSON.stringify({
      bin: { kernelcad: 'dist/cli/index.js' },
      files: ['dist/cli', 'README.md', 'LICENSE'],
      scripts: { prepack: 'npm run build:cli && npm run build:player' },
    }));

    expect(result.blockers).toEqual([]);
  });

  it('blocks package versions that outrun the checked-out stable release tags', () => {
    const result = auditPackageReleaseState({
      packageJsonText: JSON.stringify({
        version: '0.11.0',
        bin: { kernelcad: 'dist/cli/index.js' },
        files: ['dist/cli', 'README.md', 'LICENSE'],
        scripts: { prepack: 'npm run build:cli && npm run build:player' },
      }),
      tagNames: ['v0.6.1', 'v0.8.0', 'v0.9.0-rc.1'],
    });

    expect(result.blockers).toContainEqual({
      kind: 'package-version-ahead-of-local-tag',
      message: 'package.json version 0.11.0 is ahead of highest local stable tag v0.8.0',
    });
  });
});
