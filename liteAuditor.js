const Validator = require("./validator.js").validator;
const auditEvent = require('./validator.js').eventEmitter;
const validator = new Validator();
const WebSocketManagement = require('./WebSocketManagement');
const GarbageCollector = require('./GarbageCollector');
const garbageCollector = new GarbageCollector();
const Broadcaster = require('ntrnetwork').Broadcaster;
const broadcaster = new Broadcaster(0x015);
const MESSAGE_CODES = require('ntrnetwork').MESSAGE_CODES;
require("./config/confTable");

class liteAuditor {
    constructor(url, apiKey, _workInProgress, _timedOut, _completedTR) {
        this.WSM = new WebSocketManagement(url, apiKey);
        this.workInProgress = _workInProgress ? _workInProgress : [];
        this.timedOut = _timedOut ? _timedOut : [];
        this.completedTR = _completedTR ? _completedTR : [];
    }

    auditNetwork() {
        validator.init()
            .then(() => {
                // Reconnecting Websocket connections to the Watchers
                try {
                    this.WSM.connectAugmentedNodeWS(validator.nodeId, this.workInProgress, this.completedTR);
                    garbageCollector.globalTimeout(this.workInProgress, this.timedOut, this.completedTR, validator.nodeId, this.WSM);
                    garbageCollector.paymentTimeout(this.workInProgress, this.timedOut, validator.nodeId, this.WSM);
                } catch (error) {
                    console.log("Error with WS or garbage collection: " + error.name + " " + error.message);
                }

                // Receive the transactions on the network 
                broadcaster.subscribe(async (message_code, transaction) => {
                    console.log("Received Event");
                    console.log(transaction);
                    if (message_code === MESSAGE_CODES.TX) {
                        try {
                            let notDuplicate = await validator.checkRequestDuplicate(this.workInProgress, transaction)
                            if (notDuplicate) {
                                this.WSM.sendActionToAugmentedNode(transaction, "subscribe", validator.nodeId, true, true)
                                validator.saveTransferRequest(this.workInProgress, transaction);
                            } else { console.log("Transfer Request is a duplicate!") }
                        } catch (error) {
                            console.log("Error: " + error.name + " " + error.message);
                        }
                    }
                    if (message_code === MESSAGE_CODES.AUDIT) {
                        try {
                            console.log("Received Audit");
                            console.log(transaction);
                            auditEvent.emit('audit', transaction);
                        } catch (error) {
                            console.log("Error: " + error.name + " " + error.message);
                        }
                    }
                });
            });
    }

    get state(){
        let _state = {
            workInProgress: this.workInProgress,
            timedOut: this.timedOut,
            completedTR: this.completedTR
        };
        return _state;
    }

    get ANWS(){
        return this.WSM
    }
}

module.exports = {
    auditor: liteAuditor,
    eventEmitter: auditEvent,
    broadcaster: broadcaster
};