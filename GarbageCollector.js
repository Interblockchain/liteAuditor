const Validator = require("./validator.js").validator;
const validator = new Validator();

class garbageCollector {

    constructor() { }

    async globalTimeout(workInProgress, timedOut, completedTR, nodeId, WSM) {
        setInterval(async () => {
            workInProgress.forEach(async (element, index) => {
                let elapsed = Date.now() - Date.parse(element.timestamp);
                if (elapsed > 48 * 60 * 60 * 1000) {
                    console.log("TIMEOUT GLOBAL");
                    timedOut.push({ timestamp: Date.now(), TR: element });
                    let presentSource = await validator.addressInWorkInProgress(workInProgress, index, element.transferRequest.sourceAddress);
                    let presentDest = await validator.addressInWorkInProgress(workInProgress, index, element.transferRequest.destinationAddress);
                    await WSM.sendActionToAugmentedNode(element.transferRequest, "unsubscribe", nodeId, !presentSource, !presentDest);
                    workInProgress.splice(index, 1);
                }
            });

            timedOut.forEach((element, index) => {
                let elapsed = Date.now() - Date.parse(element.timestamp);
                if (elapsed > 48 * 60 * 60 * 1000) {
                    timedOut.splice(index, 1);
                }
            });

            completedTR.forEach((element, index) => {
                let elapsed = Date.now() - Date.parse(element.timestamp);
                if (elapsed > 48 * 60 * 60 * 1000) {
                    completedTR.splice(index, 1);
                }
            });
        }, 5 * 60 * 1000);
    }
    async paymentTimeout(workInProgress, timedOut, nodeId, WSM) {
        setInterval(async () => {
            workInProgress.forEach(async (element, index) => {
                let elapsed = Date.now() - Date.parse(element.timestamp);
                if (elapsed > 10 * 60 * 1000 && element.sourceTxHash === "") {
                    console.log("TIMEOUT ON PAYMENT");
                    timedOut.push({ timestamp: Date.now(), TR: element });
                    let presentSource = await validator.addressInWorkInProgress(workInProgress, index, element.transferRequest.sourceAddress);
                    let presentDest = await validator.addressInWorkInProgress(workInProgress, index, element.transferRequest.destinationAddress);
                    await WSM.sendActionToAugmentedNode(element.transferRequest, "unsubscribe", nodeId, !presentSource, !presentDest);
                    workInProgress.splice(index, 1);
                }
            });
        }, 15 * 1000);
    }
}

module.exports = garbageCollector;