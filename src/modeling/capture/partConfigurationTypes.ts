// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** Source file plus configuration name. Absolute `source` is the identity. */
export interface PartConfigurationRef {
  readonly source: string;
  readonly name: string;
}

/** What one evaluated configuration applied, including params it left alone. */
export interface PartConfigurationIdentity extends PartConfigurationRef {
  /** Path the assembly script wrote, before it was resolved. */
  readonly sourceRef: string;
  readonly parameters: Readonly<Record<string, number | boolean | string>>;
  /** Sorted `name:type` list. Every configuration of one source must match. */
  readonly interfaceSignature: string;
}
