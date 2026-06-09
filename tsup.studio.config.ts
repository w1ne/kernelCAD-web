import { defineConfig } from 'tsup';

// Bundles the Phase 1 `src/studio/index.ts` barrel into a consumable
// library that hosts (proto.cat first) install via `kernelcad/studio`.
//
// Why bundle when source-export already worked at runtime: consumers'
// strict tsc would walk our raw TSX and flag every Vite-only global
// (`import.meta.env`, `import.meta.hot`, `__APP_VERSION__`), every
// kernelCAD window augmentation, and a handful of intentionally-loose
// strict-null sites that pass under kernelcad's own tsconfig but not
// under, say, Next's. Bundling emits a self-contained `index.d.ts` so
// consumers never see the raw source.
//
// Runs against kernelcad's tsconfig — same strictness the rest of the
// repo passes today — so dts emit succeeds. Externals: everything not
// relative (i.e. every node_modules dep including react / three /
// supabase / @react-three/*). That keeps the host in charge of
// dependency versions and prevents react duplication.

export default defineConfig({
    entry: { index: 'src/studio/index.ts' },
    outDir: 'dist/studio',
    format: ['esm'],
    target: 'es2022',
    platform: 'browser',
    // Use the app-level tsconfig (`tsconfig.app.json`) for the dts pass —
    // the root tsconfig.json is project-references only and lacks `jsx`,
    // `lib`, `paths`, etc. that the source actually needs.
    tsconfig: 'tsconfig.app.json',
    dts: { resolve: false },
    // No sourcemaps in the published bundle — keeps the artifact small
    // (the source is one short branch off main on GitHub). Re-enable
    // locally with `--sourcemap` if a consumer needs to step through.
    sourcemap: false,
    clean: true,
    splitting: false,
    // Mark every non-relative import as external. Combined with our
    // bare-specifier deps (no `paths` shenanigans inside src/studio/),
    // this leaves every npm-resolved import in place and only bundles
    // our own first-party files.
    external: [/^[^./]/, /^@\//],
    treeshake: true,
    // Studio is React/TSX — JSX is preserved via swc's automatic runtime.
    esbuildOptions(opts) {
        opts.jsx = 'automatic';
    },
});
