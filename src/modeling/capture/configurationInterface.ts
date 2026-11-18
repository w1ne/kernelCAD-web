// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One part file has one connector interface inside an assembly. The record
// is written only after the instance or the sub-assembly import succeeds.

import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { AssemblyState } from './assemblyState';
import type { PartConfigurationIdentity } from './partConfigurationTypes';

const MISMATCH_HINT = 'invalid-args.assembly.configuration-interface-mismatch';
const INSTANCE_EXAMPLE = "arm.instance('block', { source: './part.kcad.ts', configuration: 'compact' })";
const IMPORT_EXAMPLE = "parent.subAssembly('nest', child)";

interface RecordedConfigurationInterface {
  readonly name: string;
  readonly signature: string;
}

export interface ImportedInterfaceClaim {
  readonly source: string;
  readonly name: string;
  readonly signature: string;
}

function rejectInterfaceMismatch(
  api: string,
  example: string,
  configuration: string,
  signature: string,
  previous: RecordedConfigurationInterface,
): never {
  const shown = signature || '(none)';
  const previousShown = previous.signature || '(none)';
  invalidArgs({
    api,
    path: 'configuration',
    gotText: `configuration '${configuration}' interface ${shown}`,
    requires: `the same connector interface as configuration '${previous.name}' (${previousShown}), but '${configuration}' declares ${shown}`,
    example,
    hintSlug: MISMATCH_HINT,
  });
}

/** Read-only check. The first sight of a file, and a matching signature, do not write. */
export function assertConfigurationInterface(
  state: AssemblyState,
  source: string,
  configuration: string,
  signature: string,
  api = 'instance(name, opts)',
  example = INSTANCE_EXAMPLE,
): void {
  const previous = state.configurationInterfaces.get(source);
  if (previous !== undefined && previous.signature !== signature) {
    rejectInterfaceMismatch(api, example, configuration, signature, previous);
  }
}

/** Record the interface after the part or the import has been accepted. */
export function commitConfigurationInterface(
  state: AssemblyState,
  source: string,
  configuration: string,
  signature: string,
): void {
  if (!state.configurationInterfaces.has(source)) {
    state.configurationInterfaces.set(source, { name: configuration, signature });
  }
}

/**
 * Check every configured part in an import against the parent and against
 * the other parts in that import. Returns the interfaces the parent does
 * not yet record. Does not mutate the parent, so a mismatch leaves no parts.
 */
export function preflightImportedInterfaces(
  state: AssemblyState,
  importName: string,
  parts: readonly { readonly configuration?: PartConfigurationIdentity }[],
): readonly ImportedInterfaceClaim[] {
  const seen = new Map<string, RecordedConfigurationInterface>(state.configurationInterfaces);
  const fresh: ImportedInterfaceClaim[] = [];
  const api = `subAssembly('${importName}')`;
  for (const part of parts) {
    const configuration = part.configuration;
    if (configuration === undefined) continue;
    const previous = seen.get(configuration.source);
    if (previous !== undefined && previous.signature !== configuration.interfaceSignature) {
      rejectInterfaceMismatch(api, IMPORT_EXAMPLE, configuration.name, configuration.interfaceSignature, previous);
    }
    if (previous === undefined) {
      const claim: ImportedInterfaceClaim = {
        source: configuration.source,
        name: configuration.name,
        signature: configuration.interfaceSignature,
      };
      seen.set(configuration.source, { name: claim.name, signature: claim.signature });
      fresh.push(claim);
    }
  }
  return fresh;
}

export function commitImportedInterfaces(
  state: AssemblyState,
  claims: readonly ImportedInterfaceClaim[],
): void {
  for (const claim of claims) {
    commitConfigurationInterface(state, claim.source, claim.name, claim.signature);
  }
}
