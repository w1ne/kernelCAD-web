import { AgentAPI } from '../src/agent/AgentAPI';

async function main() {
    console.log("Creating AgentAPI...");
    const api = new AgentAPI();

    console.log("Initializing AgentAPI...");
    await api.init();
    console.log("Initialized.");

    const code = `
        const OC = replicad.getOC();
        console.log("Inspecting OC.gp_Pnt...");
        try {
            if (OC.gp_Pnt.overloadTable) {
                console.log("Overload table:", OC.gp_Pnt.overloadTable);
                console.log("Valid arg counts:", Object.keys(OC.gp_Pnt.overloadTable));
            } else {
                console.log("No overload table. argCount:", OC.gp_Pnt.argCount);
            }
            
            return 42;
        } catch (e) {
            console.error("Inspection error:", e);
            throw e;
        }
    `;

    console.log("Executing code...");
    const result = await api.evaluateCode(code);

    console.log("Execution Result:", {
        hasShape: !!result.shape,
        logs: result.logs,
        errors: result.errors
    });

    if (result.errors.length > 0) {
        console.error("Test Failed: Errors reported");
        process.exit(1);
    }

    if (!result.shape) {
        console.error("Test Failed: No shape returned");
        process.exit(1);
    }

    console.log("Test Passed!");
}

main().catch((err) => {
    console.error("Unhandled error:", err);
    process.exit(1);
});
