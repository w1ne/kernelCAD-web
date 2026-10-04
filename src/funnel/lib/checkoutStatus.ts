// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** Outcome of a Stripe Checkout, from the `?checkout=` query on /billing. */
export type CheckoutStatus = 'success' | 'cancel' | undefined;

/** Parses the `?checkout=` query that Stripe Checkout returns with. */
export function parseCheckoutStatus(v: unknown): CheckoutStatus {
  return v === 'success' || v === 'cancel' ? v : undefined;
}
