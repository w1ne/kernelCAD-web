import { Project } from 'ts-morph';
import { resolve, relative, dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

export interface RewriteOpts {
  /** Absolute path to the project root containing tsconfig and src/. */
  projectRoot: string;
  /** Map of POSIX-relative-to-projectRoot old path → new path. Files already moved on disk. */
  mapping: Record<string, string>;
}

/**
 * Rewrite all relative import / re-export / dynamic-import specifiers in the project
 * so that references to any source file in `mapping` point at its new location.
 *
 * Files in `mapping` MUST already be at their new locations on disk before calling.
 */
export async function rewriteImports(opts: RewriteOpts): Promise<void> {
  const tsconfig = join(opts.projectRoot, 'tsconfig.json');
  const project = existsSync(tsconfig)
    ? new Project({ tsConfigFilePath: tsconfig, skipAddingFilesFromTsConfig: true })
    : new Project({ useInMemoryFileSystem: false });

  project.addSourceFilesAtPaths(join(opts.projectRoot, 'src/**/*.{ts,tsx}'));
  // Also include test/script/cookbook locations that might import src/:
  project.addSourceFilesAtPaths(join(opts.projectRoot, 'tests/**/*.{ts,tsx}'));
  project.addSourceFilesAtPaths(join(opts.projectRoot, 'scripts/**/*.{ts,tsx,mjs}'));
  project.addSourceFilesAtPaths(join(opts.projectRoot, 'eval/**/*.{ts,tsx}'));
  // Root-level config files (vite.config.ts, vitest.config.ts, etc.) can carry
  // dynamic imports referencing src/ paths.
  project.addSourceFilesAtPaths(join(opts.projectRoot, '*.config.{ts,tsx}'));

  // Normalize mapping into absolute paths (forward: old→new and reverse: new→old).
  const absMap = new Map<string, string>();
  const reverseMap = new Map<string, string>();
  for (const [from, to] of Object.entries(opts.mapping)) {
    const fromAbs = resolve(opts.projectRoot, from);
    const toAbs = resolve(opts.projectRoot, to);
    absMap.set(fromAbs, toAbs);
    reverseMap.set(toAbs, fromAbs);
  }

  /**
   * Given an importer file (at its CURRENT location on disk) and an original
   * specifier text, return the rewritten specifier (or null if no rewrite needed).
   *
   * Specifiers in the source were written relative to the importer's ORIGINAL
   * location, so we resolve against the original directory when looking up the
   * mapping, then re-render the path relative to the importer's new directory.
   */
  function rewriteSpecifier(importerAbs: string, specifier: string): string | null {
    if (!specifier.startsWith('.')) return null; // bare/alias imports untouched
    // If the importer itself moved, the specifier was written relative to its
    // OLD location. Otherwise the importer's current location IS its old location.
    const importerOldAbs = reverseMap.get(importerAbs) ?? importerAbs;
    const importerOldDir = dirname(importerOldAbs);
    const importerMoved = importerOldAbs !== importerAbs;
    const candidatesWithoutExt = [
      resolve(importerOldDir, specifier),
      resolve(importerOldDir, specifier + '.ts'),
      resolve(importerOldDir, specifier + '.tsx'),
      resolve(importerOldDir, specifier, 'index.ts'),
      resolve(importerOldDir, specifier, 'index.tsx'),
    ];
    // First pass: find the target in the move map (moved targets).
    let newAbs: string | null = null;
    for (const cand of candidatesWithoutExt) {
      for (const ext of ['', '.ts', '.tsx']) {
        const probe = cand + ext;
        if (absMap.has(probe)) {
          newAbs = absMap.get(probe)!;
          break;
        }
      }
      if (newAbs) break;
    }
    // Second pass: if target wasn't moved BUT importer moved, the relative
    // specifier still needs rewriting because the importer's depth changed.
    // Find the target on disk so we can re-render against the new importer dir.
    if (!newAbs && importerMoved) {
      for (const cand of candidatesWithoutExt) {
        for (const ext of ['', '.ts', '.tsx']) {
          const probe = cand + ext;
          if (existsSync(probe)) {
            newAbs = probe; // target didn't move; new location = old location
            break;
          }
        }
        if (newAbs) break;
      }
    }
    if (!newAbs) return null;

    const newImporterDir = dirname(importerAbs);
    let rel = relative(newImporterDir, newAbs);
    if (!rel.startsWith('.')) rel = './' + rel;
    // Strip .ts/.tsx extension (project uses extension-less imports).
    rel = rel.replace(/\.(tsx?|jsx?)$/, '');
    return rel.split('\\').join('/'); // POSIX
  }

  for (const sf of project.getSourceFiles()) {
    const importerAbs = sf.getFilePath();
    let changed = false;

    for (const id of sf.getImportDeclarations()) {
      const spec = id.getModuleSpecifierValue();
      const next = rewriteSpecifier(importerAbs, spec);
      if (next && next !== spec) {
        id.setModuleSpecifier(next);
        changed = true;
      }
    }
    for (const ed of sf.getExportDeclarations()) {
      const spec = ed.getModuleSpecifierValue();
      if (!spec) continue;
      const next = rewriteSpecifier(importerAbs, spec);
      if (next && next !== spec) {
        ed.setModuleSpecifier(next);
        changed = true;
      }
    }
    // Dynamic imports: import('./foo')
    sf.forEachDescendant((node) => {
      if (node.getKindName() === 'CallExpression') {
        const expr = (node as any).getExpression?.();
        if (expr && expr.getKindName?.() === 'ImportKeyword') {
          const args = (node as any).getArguments?.() ?? [];
          if (args.length === 1 && args[0].getKindName() === 'StringLiteral') {
            const oldSpec = args[0].getLiteralValue();
            const next = rewriteSpecifier(importerAbs, oldSpec);
            if (next && next !== oldSpec) {
              args[0].setLiteralValue(next);
              changed = true;
            }
          }
        }
      }
    });

    if (changed) await sf.save();
  }
}
