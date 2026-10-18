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
            name: 'shared-stays-leaf',
            severity: 'error',
            comment: 'shared/ may not import from any other layer. Files with cross-layer deps stay outside shared/ until those deps are broken.',
            from: { path: '^src/shared/' },
            to: { path: '^src/(kernel|modeling|authoring|agent)/' }
        },
        {
            name: 'kernel-stays-pure',
            severity: 'error',
            comment: 'kernel/ may only import from kernel/ or shared/.',
            from: { path: '^src/kernel/' },
            to: { path: '^src/(modeling|authoring|agent)/' }
        },
        {
            name: 'modeling-no-upward',
            severity: 'error',
            comment: 'modeling/ may only import from modeling/, kernel/, or shared/.',
            from: { path: '^src/modeling/' },
            to: { path: '^src/(authoring|agent)/' }
        },
        {
            name: 'authoring-no-upward',
            severity: 'error',
            comment: 'authoring/ may only import from authoring/, modeling/, kernel/, or shared/.',
            from: { path: '^src/authoring/' },
            to: { path: '^src/agent/' }
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
