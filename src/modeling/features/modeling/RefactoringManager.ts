// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { Project } from 'ts-morph';

export class RefactoringManager {
    private project: Project;

    constructor() {
        this.project = new Project({
            useInMemoryFileSystem: true,
            compilerOptions: {
                allowJs: true,
                target: 99 // ESNext
            }
        });
    }

    /**
     * Renames a variable in the given code.
     * @param code The source code.
     * @param oldName The old variable name.
     * @param newName The new variable name.
     * @returns The modified code or original code if failure/no-op.
     */
    renameVariable(code: string, oldName: string, newName: string): string {
        try {
            const sourceFile = this.project.createSourceFile('temp.ts', code, { overwrite: true });

            // Find the variable declaration
            const variableDeclaration = sourceFile.getVariableDeclaration(oldName);

            if (variableDeclaration) {
                variableDeclaration.rename(newName);
                return sourceFile.getFullText();
            }

            // Also check for function declarations or classes if we want to cover more
            // For now, simpler CAD variables are mostly const/let

            return code; // No change
        } catch (e) {
            console.error('Refactoring failed:', e);
            return code;
        }
    }
}

export const refactoringManager = new RefactoringManager();
