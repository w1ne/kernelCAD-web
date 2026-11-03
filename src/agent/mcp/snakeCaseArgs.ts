// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Argument-name normalisation for MCP tool calls.
//
// Every inputSchema property is advertised as snake_case. Clients that still
// send the previous camelCase name are folded onto that canonical key at
// callMcpTool, before the sandbox guard and the handler. When both names are
// present, snake_case wins, and the camelCase alias is mirrored from it so a
// handler that still reads the pre-rename field sees the canonical value.
// Nested object and array arguments declared in the same schema are folded
// the same way. Keys that are not declared properties (free-form maps such as
// `changes`, or a param name inside one) are left untouched.

/** Canonical MCP argument name: `base_file`, not `baseFile`. */
export const SNAKE_CASE_ARG = /^[a-z][a-z0-9_]*$/;

/**
 * `baseFile` → `base_file`. Already-snake keys are unchanged.
 * A trailing acronym stays one word (`minIoU` → `min_iou`).
 */
export function camelToSnake(key: string): string {
  if (key === 'minIoU') return 'min_iou';
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Historical camelCase spellings that `snakeToCamel` does not reproduce
 * (`min_iou` → `minIou`, but the shipped argument was `minIoU`).
 */
const EXTRA_CAMEL_ALIASES: Readonly<Record<string, readonly string[]>> = {
  min_iou: ['minIoU'],
};

function camelAliases(snakeKey: string): string[] {
  const camel = snakeToCamel(snakeKey);
  const extras = EXTRA_CAMEL_ALIASES[snakeKey] ?? [];
  return [...new Set([camel, ...extras])].filter(alias => alias !== snakeKey);
}

/** `base_file` → `baseFile`, the alias clients used before the rename. */
export function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

const COMBINATOR_ARRAY = ['allOf', 'anyOf', 'oneOf', 'prefixItems'] as const;
const COMBINATOR_NODE = ['if', 'then', 'else', 'not'] as const;
const NESTED_SCHEMA = ['items', 'additionalProperties', 'contains', 'unevaluatedProperties'] as const;
const SCHEMA_MAP = ['$defs', 'definitions', 'dependentSchemas', 'patternProperties'] as const;

/**
 * Dotted property paths declared anywhere in an inputSchema.
 * Array items contribute a `[]` segment (`attempts[].visual_review`).
 * JSON Schema keywords are not property names.
 */
export function inputSchemaPropertyPaths(schema: unknown): string[] {
  const out: string[] = [];
  const walk = (node: unknown, prefix: string): void => {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, prefix);
      return;
    }
    const rec = node as Record<string, unknown>;
    const props = rec.properties;
    if (props !== null && typeof props === 'object' && !Array.isArray(props)) {
      for (const [key, sub] of Object.entries(props as Record<string, unknown>)) {
        const path = prefix === '' ? key : `${prefix}.${key}`;
        out.push(path);
        walk(sub, path);
      }
    }
    for (const key of COMBINATOR_ARRAY) {
      const list = rec[key];
      if (Array.isArray(list)) for (const sub of list) walk(sub, prefix);
    }
    for (const key of COMBINATOR_NODE) walk(rec[key], prefix);
    for (const key of NESTED_SCHEMA) {
      const sub = rec[key];
      if (sub !== null && typeof sub === 'object') walk(sub, key === 'items' && prefix !== '' ? `${prefix}[]` : prefix);
    }
    for (const key of SCHEMA_MAP) {
      const map = rec[key];
      if (map !== null && typeof map === 'object' && !Array.isArray(map)) {
        for (const sub of Object.values(map as Record<string, unknown>)) walk(sub, prefix);
      }
    }
  };
  walk(schema, '');
  return out;
}

/** Property paths whose name is not snake_case, prefixed for the failure list. */
export function snakeCasePropertyOffenders(toolName: string, schema: unknown): string[] {
  const offenders: string[] = [];
  for (const path of inputSchemaPropertyPaths(schema)) {
    const key = path.split('.').pop() ?? path;
    if (!SNAKE_CASE_ARG.test(key)) offenders.push(`${toolName}.${path}`);
  }
  return offenders;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Properties declared on this object schema, including combinator branches.
 *  Does not descend into property values — those are folded with the value. */
function directProperties(schema: unknown): Map<string, unknown> {
  const map = new Map<string, unknown>();
  const visit = (node: unknown): void => {
    if (!isPlainObject(node)) return;
    const props = node.properties;
    if (isPlainObject(props)) {
      for (const [key, sub] of Object.entries(props)) {
        const prev = map.get(key);
        map.set(key, prev === undefined ? sub : { allOf: [prev, sub] });
      }
    }
    for (const key of COMBINATOR_ARRAY) {
      const list = node[key];
      if (Array.isArray(list)) for (const sub of list) visit(sub);
    }
    for (const key of COMBINATOR_NODE) visit(node[key]);
  };
  visit(schema);
  return map;
}

function itemsSchema(schema: unknown): unknown {
  if (!isPlainObject(schema)) return undefined;
  if (schema.items !== undefined && typeof schema.items === 'object') return schema.items;
  for (const key of COMBINATOR_ARRAY) {
    const list = schema[key];
    if (!Array.isArray(list)) continue;
    for (const sub of list) {
      const items = itemsSchema(sub);
      if (items !== undefined) return items;
    }
  }
  for (const key of COMBINATOR_NODE) {
    const items = itemsSchema(schema[key]);
    if (items !== undefined) return items;
  }
  return undefined;
}

/**
 * Copy each declared camelCase alias onto its snake_case property.
 * Snake_case wins when both are present. The alias is then overwritten with
 * the canonical value. Returns a new tree; `input` is not mutated.
 */
export function foldMcpInputAliases(schema: unknown, input: unknown): unknown {
  if (Array.isArray(input)) {
    const items = itemsSchema(schema);
    if (items === undefined) return input.map(item => item);
    return input.map(item => foldMcpInputAliases(items, item));
  }
  if (!isPlainObject(input)) return input;
  const out: Record<string, unknown> = { ...input };
  for (const [key, sub] of directProperties(schema)) {
    const aliases = camelAliases(key);
    const hasSnake = input[key] !== undefined;
    let chosen = hasSnake ? input[key] : undefined;
    if (!hasSnake) {
      for (const alias of aliases) {
        if (input[alias] !== undefined) {
          chosen = input[alias];
          break;
        }
      }
    }
    if (chosen === undefined && !hasSnake) continue;
    const folded = foldMcpInputAliases(sub, chosen);
    out[key] = folded;
    for (const alias of aliases) out[alias] = folded;
  }
  return out;
}
