// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { defineConfig, mergeConfig } from 'vite';
import studio from './vite.config';

// Package the existing Studio unchanged, with backend calls kept on loopback.
// Local viewer builds must never inherit the deployment's API/auth endpoints.
export default defineConfig(env => mergeConfig(studio(env), {
  base: '/',
  define: {
    'import.meta.env.VITE_API_BASE_URL': '""',
    'import.meta.env.VITE_KERNELCAD_API_BASE': '""',
    'import.meta.env.VITE_SUPABASE_URL': '""',
    'import.meta.env.VITE_SUPABASE_ANON_KEY': '""',
  },
  build: { outDir: 'dist/mcp-viewer' },
}));
