// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

export type Theme = 'light' | 'dark';

/**
 * The theme that applies to an element: the nearest `data-theme` ancestor,
 * light when there is none. Portaled layers (menus, tooltips, sheets) copy it
 * onto their own root, because a portal leaves the themed subtree.
 */
export function themeOf(el: Element | null | undefined): Theme {
    return el?.closest('[data-theme]')?.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}
