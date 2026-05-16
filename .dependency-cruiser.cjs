/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
    forbidden: [
        {
            name: 'no-circular',
            severity: 'warn',
            comment: 'This dependency is part of a circular relationship.',
            from: {},
            to: {
                circular: true
            }
        },
        {
            name: 'components-cannot-import-worker',
            severity: 'error',
            comment: 'UI components should not import worker implementation details.',
            from: { path: '^src/components' },
            to: { path: '^src/lib/worker\\.ts' }
        },
        {
            name: 'contexts-cannot-import-components',
            severity: 'warn',
            comment: 'Contexts should not depend on UI components.',
            from: { path: '^src/context' },
            to: { path: '^src/components' }
        },
        {
            name: 'shared-stays-leaf',
            severity: 'error',
            comment: 'shared/ may not import from any other layer. Files with cross-layer deps stay outside shared/ until those deps are broken (e.g., captureSession.ts has a kernel/buildModel runtime-late import — carved out of PR-1, see follow-up).',
            from: { path: '^src/shared/' },
            to: { path: '^src/(kernel|modeling|authoring|agent|studio)/' }
        },
        {
            name: 'kernel-stays-pure',
            severity: 'error',
            comment: 'kernel/ may only import from kernel/ or shared/. capture/ is permitted while captureSession.ts and its bridge files await PR-3 (modeling/).',
            from: { path: '^src/kernel/' },
            to: { path: '^src/(modeling|authoring|agent|studio)/' }
        },
        {
            name: 'modeling-no-upward',
            severity: 'error',
            comment: 'modeling/ may only import from modeling/, kernel/, capture/, or shared/.',
            from: { path: '^src/modeling/' },
            to: { path: '^src/(authoring|agent|studio)/' }
        }
    ],
    options: {
        doNotFollow: {
            path: 'node_modules',
        },
        tsPreCompilationDeps: true,
        tsConfig: {
            fileName: 'tsconfig.json'
        }
    }
};
