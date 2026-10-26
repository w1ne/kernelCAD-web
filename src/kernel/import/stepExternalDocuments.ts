// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Resolve local STEP DOCUMENT_FILE references so OCCT can read multi-file
// assemblies from one isolated virtual filesystem directory.

import { readFile, realpath } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, relative, resolve, sep, win32 } from 'node:path';
import { StepAssemblyImportError } from './stepAssemblyTypes';

function documentFileReferences(stepText: string): string[] {
  const references = new Set<string>();
  for (const match of stepText.matchAll(/\bDOCUMENT_FILE\s*\(\s*'((?:[^']|'')*)'/gi)) {
    const name = match[1].replace(/''/g, "'").trim();
    if (name !== '') references.add(name);
  }
  return [...references];
}

function canonicalReference(reference: string): string {
  const portable = reference.replaceAll('\\', '/');
  const segments = portable.split('/');
  if (
    portable.startsWith('/')
    || win32.isAbsolute(reference)
    || /^[a-z]:/i.test(reference)
  ) {
    throw new StepAssemblyImportError(
      'external-reference',
      `STEP external document reference '${reference}' must be relative to the input directory.`,
    );
  }
  const extension = extname(portable).toLowerCase();
  if (extension !== '.step' && extension !== '.stp') {
    throw new StepAssemblyImportError(
      'external-reference',
      `STEP external document '${reference}' is not a .step or .stp file.`,
    );
  }
  const normalized = segments.filter((segment) => segment !== '' && segment !== '.').join('/');
  if (normalized === '') {
    throw new StepAssemblyImportError('external-reference', `Invalid STEP external document path '${reference}'.`);
  }
  return normalized;
}

function isWithinDirectory(parent: string, candidate: string): boolean {
  const path = relative(parent, candidate);
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}

/**
 * Read transitive local DOCUMENT_FILE dependencies, keeping their normalized
 * input-directory-relative names for staging in OCCT's virtual filesystem.
 * References that escape the selected input directory are rejected.
 */
export async function readStepExternalDocuments(
  inputPath: string,
  inputBytes: Uint8Array,
): Promise<Map<string, Uint8Array>> {
  const rootDirectory = await realpath(dirname(inputPath));
  const rootFile = resolve(rootDirectory, basename(inputPath));
  const rootRealPath = await realpath(rootFile);
  const references = new Map<string, Uint8Array>();
  const processed = new Set<string>([rootFile]);
  const bytesByRealPath = new Map<string, Uint8Array>([[rootRealPath, inputBytes]]);
  const pending: Array<{ filePath: string; bytes: Uint8Array }> = [
    { filePath: rootFile, bytes: inputBytes },
  ];

  while (pending.length > 0) {
    const current = pending.shift()!;
    const currentDirectory = dirname(current.filePath);
    const sourceText = new TextDecoder().decode(current.bytes);
    for (const rawReference of documentFileReferences(sourceText)) {
      const reference = canonicalReference(rawReference);
      const unresolvedPath = resolve(currentDirectory, ...reference.split('/'));
      if (!isWithinDirectory(rootDirectory, unresolvedPath)) {
        throw new StepAssemblyImportError(
          'external-reference',
          `STEP external document '${reference}' resolves outside the input directory.`,
        );
      }
      let resolvedPath: string;
      try {
        resolvedPath = await realpath(unresolvedPath);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new StepAssemblyImportError(
          'external-reference',
          `Cannot resolve STEP external document '${reference}' referenced by '${relative(rootDirectory, current.filePath)}': ${detail}`,
        );
      }
      if (!isWithinDirectory(rootDirectory, resolvedPath)) {
        throw new StepAssemblyImportError(
          'external-reference',
          `STEP external document '${reference}' resolves outside the input directory.`,
        );
      }
      const relativeName = relative(rootDirectory, unresolvedPath).split(sep).join('/');
      if (relativeName === '' || relativeName.startsWith('../')) {
        throw new StepAssemblyImportError('external-reference', `Invalid STEP external document path '${reference}'.`);
      }
      if (resolvedPath === rootRealPath && unresolvedPath === rootFile) continue;
      let bytes = bytesByRealPath.get(resolvedPath);
      if (bytes === undefined) {
        try {
          bytes = await readFile(resolvedPath);
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          throw new StepAssemblyImportError('external-reference', `Cannot read STEP external document '${relativeName}': ${detail}`);
        }
        bytesByRealPath.set(resolvedPath, bytes);
      }
      references.set(relativeName, bytes);
      if (!processed.has(unresolvedPath)) {
        processed.add(unresolvedPath);
        pending.push({ filePath: unresolvedPath, bytes });
      }
    }
  }
  return references;
}
