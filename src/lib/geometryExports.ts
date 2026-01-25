import * as replicad from "replicad";

export async function exportSTEP(code: string): Promise<Blob> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await import("replicad-opencascadejs");

    return new Promise((resolve, reject) => {
        try {
            const func = new Function("replicad", code);
            const result = func(replicad);
            const shape = Array.isArray(result) ? result[0] : result;

            if (!shape || typeof shape.blobSTEP !== "function") {
                throw new Error("No valid shape to export");
            }

            const blob = shape.blobSTEP();
            resolve(blob);
        } catch (err) {
            reject(err);
        }
    });
}

export async function exportSTL(code: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
        try {
            const func = new Function("replicad", code);
            const result = func(replicad);
            const shape = Array.isArray(result) ? result[0] : result;

            if (!shape || typeof shape.blobSTL !== "function") {
                throw new Error("No valid shape to export");
            }

            const blob = shape.blobSTL();
            resolve(blob);
        } catch (err) {
            reject(err);
        }
    });
}
