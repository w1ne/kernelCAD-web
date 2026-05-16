// Param table — session-owned registry of declared symbolic parameters.
// See spec §E.5.
//
// A ParamTable maps canonical name → ParamEntry (value, type, defaults, meta).
// Validation enforced at declare AND at update (spec §G):
//   - Name matches FEATURE_NAME_REGEX (slice-2 reuse).
//   - Duplicate name = fatal.
//   - Numeric value within [min, max] when meta sets bounds.
//   - Type matches declared type.
//
// All errors fold under `feature.invalid-args` with discriminating hints
// (closed milestone-C catalog respected per discipline gate D-1).

import { FEATURE_NAME_REGEX } from '../intent/featureName';
import { KernelError } from '../intent/kernelError';

export type ParamType = 'number' | 'boolean';

export interface ParamMetadata {
  min?: number;
  max?: number;
  description?: string;
}

export interface ParamEntry {
  name: string;
  type: ParamType;
  value: number | boolean;
  defaultValue: number | boolean;
  meta?: ParamMetadata;
}

export interface SerializedParamEntry {
  name: string;
  type: ParamType;
  value: number | boolean;
  defaultValue: number | boolean;
  meta?: ParamMetadata;
}

export interface SerializedParamTable {
  // Keyed by canonical name; matches spec §E.9 schema-v3 envelope.
  [name: string]: SerializedParamEntry;
}

export class ParamTable {
  private entries = new Map<string, ParamEntry>();

  declare(
    name: string,
    type: ParamType,
    defaultValue: number | boolean,
    meta?: ParamMetadata,
  ): ParamEntry {
    if (!FEATURE_NAME_REGEX.test(name)) {
      throw new KernelError(
        'feature.invalid-args',
        `param name '${name}' must match ${FEATURE_NAME_REGEX.source}`,
        undefined,
        `invalid-args.param.invalid-name — param name '${name}' must match ${FEATURE_NAME_REGEX.source}`,
      );
    }
    if (this.entries.has(name)) {
      throw new KernelError(
        'feature.invalid-args',
        `param '${name}' already declared`,
        undefined,
        `invalid-args.param.duplicate-name — param '${name}' already declared`,
      );
    }
    if (typeof defaultValue !== (type === 'number' ? 'number' : 'boolean')) {
      throw new KernelError(
        'feature.invalid-args',
        `param '${name}' declared as ${type} but defaultValue is ${typeof defaultValue}`,
        undefined,
        `invalid-args.param.type-mismatch — param '${name}' declared as ${type} but defaultValue is ${typeof defaultValue}`,
      );
    }
    if (type === 'number') {
      assertWithinBounds(name, defaultValue as number, meta);
    }
    const entry: ParamEntry = {
      name,
      type,
      value: defaultValue,
      defaultValue,
      meta: meta ? { ...meta } : undefined,
    };
    this.entries.set(name, entry);
    return entry;
  }

  has(name: string): boolean {
    return this.entries.has(name);
  }

  get(name: string): ParamEntry {
    const entry = this.entries.get(name);
    if (!entry) {
      throw new KernelError(
        'feature.invalid-args',
        `param '${name}' not found`,
        undefined,
        `invalid-args.param.unknown-name — param '${name}' not found`,
      );
    }
    return entry;
  }

  set(name: string, value: number | boolean): ParamEntry {
    const entry = this.get(name);
    if (typeof value !== entry.type) {
      throw new KernelError(
        'feature.invalid-args',
        `param '${name}' is ${entry.type}, got ${typeof value}`,
        undefined,
        `invalid-args.param.type-mismatch — param '${name}' is ${entry.type}, got ${typeof value}`,
      );
    }
    if (entry.type === 'number') {
      assertWithinBounds(name, value as number, entry.meta);
    }
    entry.value = value;
    return entry;
  }

  list(): ParamEntry[] {
    return Array.from(this.entries.values()).map((e) => ({ ...e, meta: e.meta ? { ...e.meta } : undefined }));
  }

  size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  replaceWith(other: ParamTable): void {
    this.entries.clear();
    for (const entry of other.list()) {
      this.entries.set(entry.name, {
        name: entry.name,
        type: entry.type,
        value: entry.value,
        defaultValue: entry.defaultValue,
        meta: entry.meta ? { ...entry.meta } : undefined,
      });
    }
  }

  serialize(): SerializedParamTable {
    const out: SerializedParamTable = {};
    for (const entry of this.entries.values()) {
      out[entry.name] = {
        name: entry.name,
        type: entry.type,
        value: entry.value,
        defaultValue: entry.defaultValue,
        meta: entry.meta ? { ...entry.meta } : undefined,
      };
    }
    return out;
  }

  static deserialize(data: SerializedParamTable | undefined): ParamTable {
    const t = new ParamTable();
    if (!data) return t;
    for (const [name, entry] of Object.entries(data)) {
      // Bypass declare() to preserve current value (which may differ from default).
      t.entries.set(name, {
        name,
        type: entry.type,
        value: entry.value,
        defaultValue: entry.defaultValue,
        meta: entry.meta ? { ...entry.meta } : undefined,
      });
    }
    return t;
  }
}

function assertWithinBounds(name: string, value: number, meta: ParamMetadata | undefined): void {
  if (!meta) return;
  if (meta.min !== undefined && value < meta.min) {
    throw new KernelError(
      'feature.invalid-args',
      `param '${name}' value ${value} below min ${meta.min}`,
      undefined,
      `invalid-args.param.value-out-of-range — param '${name}' value ${value} below min ${meta.min}`,
    );
  }
  if (meta.max !== undefined && value > meta.max) {
    throw new KernelError(
      'feature.invalid-args',
      `param '${name}' value ${value} above max ${meta.max}`,
      undefined,
      `invalid-args.param.value-out-of-range — param '${name}' value ${value} above max ${meta.max}`,
    );
  }
}
