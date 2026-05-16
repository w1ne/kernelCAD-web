import { Command, type CommandContext } from '../Command';
import { insertShape } from '../../../shared/codeGeneration/ast';

export class InsertShapeCommand extends Command {
    private statement: string;
    private labelString: string;

    constructor(
        statement: string,
        labelString: string = "Insert Shape"
    ) {
        super();
        this.statement = statement;
        this.labelString = labelString;
    }

    get label() { return this.labelString; }

    execute(context: CommandContext) {
        this.previousCode = context.code;
        try {
            const newCode = insertShape(context.code, this.statement);
            context.setCode(newCode);
        } catch (e) {
            console.error("Failed to insert shape via AST:", e);
            throw e;
        }
    }
}
