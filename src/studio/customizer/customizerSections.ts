// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Which parameter rows the customizer shows, and under which heading. The
// short view lists the key params (the first few in declaration order: the
// author puts the ones a user changes first) plus any value that is already
// changed, so a shared configuration is never hidden.

import type { CustomizerParam, CustomizerValues } from './customizerParams';

/** Rows in the short view. */
export const KEY_PARAM_COUNT = 6;

export interface CustomizerSection {
  /** Heading, or undefined for the params that declare no group. */
  group?: string;
  params: CustomizerParam[];
}

export interface CustomizerLayout {
  sections: CustomizerSection[];
  /** Rows the short view leaves out. 0 when everything is shown. */
  hiddenCount: number;
}

function isChanged(param: CustomizerParam, values: CustomizerValues): boolean {
  const value = values[param.name];
  return value !== undefined && value !== param.defaultValue;
}

/** Ungrouped params first (no heading), then each group in the order it is first declared. */
function groupSections(params: readonly CustomizerParam[]): CustomizerSection[] {
  const ungrouped: CustomizerParam[] = [];
  const groups = new Map<string, CustomizerParam[]>();
  for (const param of params) {
    if (param.group === undefined) {
      ungrouped.push(param);
      continue;
    }
    const list = groups.get(param.group) ?? [];
    list.push(param);
    groups.set(param.group, list);
  }
  const sections: CustomizerSection[] = ungrouped.length > 0 ? [{ params: ungrouped }] : [];
  for (const [group, list] of groups) sections.push({ group, params: list });
  return sections;
}

export function customizerLayout(
  params: readonly CustomizerParam[],
  values: CustomizerValues,
  showAll: boolean,
  keyCount = KEY_PARAM_COUNT,
): CustomizerLayout {
  // Hiding a single row saves nothing: show it.
  if (showAll || params.length <= keyCount + 1) return { sections: groupSections(params), hiddenCount: 0 };
  const visible = params.filter((param, index) => index < keyCount || isChanged(param, values));
  return { sections: groupSections(visible), hiddenCount: params.length - visible.length };
}
