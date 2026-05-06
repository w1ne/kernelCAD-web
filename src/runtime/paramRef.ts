// Symbolic parameter reference. See spec §E.1.
//
// A ParamRef is a branded handle returned by `kcad.param()` and `kcad.params({})`.
// Chain methods accept `Editable<T> = T | ParamRef<T>` for every editable opt;
// at capture time the proxy stores the symbolic ref in the FeatureRecord's
// `params` blob (via `Param.paramRef`); at lower time the dispatcher pre-resolves
// the ref through the session's ParamTable.

const PARAM_REF_BRAND = 'ParamRef' as const;

export interface ParamRef<T extends number | boolean = number | boolean> {
  readonly $param: string;
  readonly _brand: typeof PARAM_REF_BRAND;
  readonly _type: T extends number ? 'number' : 'boolean';
}

export type Editable<T extends number | boolean> = T | ParamRef<T>;

export function isParamRef(value: unknown): value is ParamRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { _brand?: unknown })._brand === PARAM_REF_BRAND &&
    typeof (value as { $param?: unknown }).$param === 'string'
  );
}

export function makeParamRef<T extends number | boolean>(
  name: string,
  type: T extends number ? 'number' : 'boolean',
): ParamRef<T> {
  return Object.freeze({
    $param: name,
    _brand: PARAM_REF_BRAND,
    _type: type,
  }) as ParamRef<T>;
}
