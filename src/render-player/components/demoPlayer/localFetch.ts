// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

/** The standalone player reads only its serving origin, without product auth. */
export function fetchLocalPlayerAsset(path: string): Promise<Response> {
  const url = new URL(path, window.location.href);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== window.location.origin
    || url.username || url.password) {
    throw new Error('Player assets require a same-origin HTTP URL without credentials');
  }
  return fetch(path, { credentials: 'omit', mode: 'same-origin', redirect: 'error' });
}
