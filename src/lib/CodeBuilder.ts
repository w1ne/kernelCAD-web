export class CodeBuilder {
    private lines: string[] = [];
    private variables: Set<string> = new Set();
    private imports: Map<string, Set<string>> = new Map();

    constructor(initialCode: string = '') {
        if (initialCode) {
            this.lines.push(initialCode.trim());
        }
    }

    /**
     * Generates a unique variable name based on a base name.
     * E.g., "box" -> "box1", "box2", etc.
     */
    getUniqueName(base: string): string {
        let name = base;
        let counter = 1;
        while (this.variables.has(name) || this.lines.some(l => l.includes(`const ${name} =`))) {
            name = `${base}${counter}`;
            counter++;
        }
        this.variables.add(name);
        return name;
    }

    /**
     * Adds an import statement. 
     * Note: This currently just tracks them; a full implementation would prepend them to the output.
     * For now, we assume standard library imports are handled globally or via existing code structure.
     */
    addImport(module: string, symbols: string[]): this {
        if (!this.imports.has(module)) {
            this.imports.set(module, new Set());
        }
        symbols.forEach(s => this.imports.get(module)!.add(s));
        return this;
    }

    /**
     * Adds a generic statement line.
     */
    addStatement(statement: string): this {
        this.lines.push(statement);
        return this;
    }

    /**
     * Adds a declaration.
     * @param variableName The name of the variable being defined.
     * @param expression The expression assigned to the variable.
     */
    addDeclaration(variableName: string, expression: string): this {
        this.variables.add(variableName);
        this.lines.push(`const ${variableName} = ${expression};`);
        return this;
    }

    /**
     * Adds an empty line for readability.
     */
    addEmptyLine(): this {
        this.lines.push('');
        return this;
    }

    /**
     * Adds a comment.
     */
    addComment(comment: string): this {
        this.lines.push(`// ${comment}`);
        return this;
    }

    /**
     * Adds a block of code (like a function body or if statement).
     * @param header The opening line of the block (e.g. "if (x) {")
     * @param bodyFn A callback to build the body of the block.
     */
    addBlock(header: string, bodyFn: (builder: CodeBuilder) => void): this {
        this.lines.push(header);
        const bodyBuilder = new CodeBuilder();
        bodyFn(bodyBuilder);
        // Indent body lines
        bodyBuilder.lines.forEach(line => {
            this.lines.push(`  ${line}`);
        });
        this.lines.push('}');
        return this;
    }

    /**
     * Helper for standard method calls on a variable.
     * e.g. base.extrude(10)
     */
    addCall(variableName: string, methodName: string, args: (string | number)[]): this {
        const argString = args.join(', ');
        this.lines.push(`${variableName}.${methodName}(${argString});`);
        return this;
    }

    /**
     * Returns the complete code string.
     */
    toString(): string {
        return this.lines.join('\n');
    }
}
