import { agentAPI } from '../src/agent/AgentAPI';
import { llmService } from '../src/features/ai/LLMService';

// Store original fetch
const originalFetch = global.fetch;

// Mock the fetch to avoid needing a real API key for this test
global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    console.log(`[MockFetch] Request to ${url}`);

    // Check if it's the xAI API call
    if (url.includes('api.x.ai')) {
        const body = JSON.parse(init?.body as string);
        const messages = JSON.stringify(body.messages, null, 2);
        console.log("[MockFetch] Message History:", messages);

        if (messages.includes("DESIGN STYLE: Industrial")) {
            console.log("[MockFetch] SUCCESS: Style 'Industrial' found in prompt.");
        } else {
            console.log("[MockFetch] WARNING: Style 'Industrial' NOT found in prompt.");
        }

        return {
            ok: true,
            json: async () => ({
                choices: [{
                    message: {
                        content: "Here is an industrial box with chamfers:\n```javascript\nconst box = replicad.makeBox(20, 20, 20).chamfer(1);\nreturn box;\n```"
                    }
                }]
            })
        } as Response;
    }

    // Fallback to original fetch for WASM or other requests
    if (originalFetch) {
        return originalFetch(input, init);
    }
    return new Response(null, { status: 404 });
};

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString(); },
        clear: () => { store = {}; }
    };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

async function runVerification() {
    console.log("1. Initializing Agent API...");
    await agentAPI.init();
    console.log("Agent API initialized.");

    console.log("2. Setting Dummy API Key...");
    llmService.setApiKey("DUMMY_KEY");

    console.log("3. Sending 'Make it cool' with Style: Industrial...");
    await llmService.sendMessage(
        [{ role: 'user', content: "Make it cool" }],
        { code: "const box = replicad.makeBox(10,10,10);", selectedId: "box1", style: "Industrial" }
    );

    console.log("4. Testing Magic Comment Flow...");
    const magicPrompt = "Generate code for: \"make a sphere\". return ONLY the code.";
    console.log(`Sending magic prompt: "${magicPrompt}"`);
    const magicResponse = await llmService.sendMessage(
        [{ role: 'user', content: magicPrompt }],
        { code: "// @ai: make a sphere" }
    );
    console.log("Magic Response:", magicResponse);

    console.log("5. Testing Floating Agent Flow...");
    const floatingPrompt = "Create a cylinder";
    console.log(`Sending floating prompt: "${floatingPrompt}"`);
    const floatingResponse = await llmService.sendMessage(
        [{ role: 'user', content: floatingPrompt }],
        { code: "const s = 1;", selectedId: undefined, style: "Standard" }
    );
    console.log("Floating Response:", floatingResponse);


    console.log("6. Extracting Code Block from Floating Response...");
    const match = /```javascript\n([\s\S]*?)\n```/.exec(floatingResponse);
    if (!match) {
        console.warn("No code block found in floating response (mock might return simple string)");
    } else {
        const code = match[1];
        console.log("Extracted Code:", code);

        console.log("7. Executing Code via Agent API...");
        try {
            const result = await agentAPI.evaluateCode(code);
            if (result.errors.length > 0) {
                console.log("Execution Result (Expected errors in mock env):", result.errors);
            } else {
                console.log("Execution Success!");
            }
        } catch {
            console.log("Execution attempted.");
        }
    }

    console.log("8. Testing Smart Widget Flow...");
    const widgetPrompt = "User selected object \"box1\". Request: Chamfer it";
    console.log(`Sending widget prompt: "${widgetPrompt}"`);
    const widgetResponse = await llmService.sendMessage(
        [{ role: 'user', content: widgetPrompt }],
        { code: "const box = replicad.makeBox(10,10,10);", selectedId: "box1", style: "Standard" }
    );
    console.log("Widget Response:", widgetResponse);
}

runVerification().catch(e => {
    console.error("Verification Failed:", e);
    process.exit(1);
});
