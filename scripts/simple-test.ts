import opencascade from 'replicad-opencascadejs';

async function test() {
    console.log("Import type:", typeof opencascade);
    let OC;
    if (typeof opencascade === 'function') {
        OC = await (opencascade as unknown as () => Promise<unknown>)();
    } else if (opencascade && typeof (opencascade as { default?: () => Promise<unknown> }).default === 'function') {
        OC = await (opencascade as { default: () => Promise<unknown> }).default();
    } else {
        throw new Error("Cannot find factory");
    }

    console.log("OC loaded.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oc = OC as any;
    try {
        const pnt = new oc.gp_Pnt(1, 2, 3);
        console.log("Point created:", pnt.X(), pnt.Y(), pnt.Z());
    } catch (e) {
        console.error("Error creating point:", e);
    }
}

test().catch(console.error);
