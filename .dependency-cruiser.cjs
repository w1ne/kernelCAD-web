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
