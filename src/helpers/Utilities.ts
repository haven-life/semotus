// Q Replacement Helpers

export function delay(ms: number) {
    return new Promise(_ => setTimeout(_, ms));
}

export function defer() {
    const result: { promise?: any, resolve?: any, reject?: any } = {};
    result.promise = new Promise(function (resolve, reject) {
        result.resolve = resolve;
        result.reject = reject;
    });
    return result;
}