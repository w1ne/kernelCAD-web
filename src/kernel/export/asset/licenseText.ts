// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { ASSET_LICENSE_IDS } from '../../../shared/assets/assetSchema';

const LICENSE_TITLES: Record<string, string> = {
  'CC-BY-4.0': 'Creative Commons Attribution 4.0 International',
  'CC-BY-SA-4.0': 'Creative Commons Attribution-ShareAlike 4.0 International',
  'CC-BY-NC-4.0': 'Creative Commons Attribution-NonCommercial 4.0 International',
  'CC-BY-NC-SA-4.0': 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International',
  'CC0-1.0': 'Creative Commons Zero 1.0 Universal',
  MIT: 'the MIT License',
  'BSD-2-Clause': 'the BSD 2-Clause License',
  'BSD-3-Clause': 'the BSD 3-Clause License',
  'Apache-2.0': 'the Apache License 2.0',
  'MPL-2.0': 'the Mozilla Public License 2.0',
  Unlicense: 'The Unlicense',
};

const SOURCE_LICENSES = new Set<string>(ASSET_LICENSE_IDS);

/** Allowlisted SPDX asset licences permit redistributing the .kcad.ts source. */
export function licenseAllowsSource(license: string | undefined): boolean {
  return SOURCE_LICENSES.has(license ?? 'CC-BY-4.0');
}

export function renderAssetPackLicense(input: {
  readonly license?: string;
  readonly authors?: readonly string[];
  readonly year: number;
}): string {
  const id = input.license ?? 'CC-BY-4.0';
  const title = LICENSE_TITLES[id] ?? id;
  const authors = input.authors && input.authors.length > 0 ? input.authors.join(', ') : 'the asset author';
  const lines = [
    `SPDX-License-Identifier: ${id}`,
    '',
    `Copyright (c) ${input.year} ${authors}`,
    '',
    `This asset is distributed under ${title} (${id}).`,
  ];
  if (SOURCE_LICENSES.has(id)) {
    lines.push(`The licence text is published at https://spdx.org/licenses/${id}.html`);
  }
  return `${lines.join('\n')}\n`;
}
