const Validator = require("./validator.js").validator;
const auditEvent = require('./validator.js').eventEmitter;
const validator = new Validator();
const WebSocketManagement = require('wsmanagement').WS;
const ANevent = require('wsmanagement').eventEmitter;
const GarbageCollector = require('./GarbageCollector');
const garbageCollector = new GarbageCollector(auditEvent);
const Broadcaster = require('ntrnetwork').Broadcaster;
const broadcaster = new Broadcaster(0x015);
const MESSAGE_CODES = require('ntrnetwork').MESSAGE_CODES;
require("./config/confTable");

class liteAuditor {
    constructor(_url, _apiKey, _workInProgress, _timedOut, _completedTR) {
        this.url = _url;
        this.apiKey = _apiKey;
        this.workInProgress = _workInProgress ? _workInProgress : [];
        this.timedOut = _timedOut ? _timedOut : [];
        this.completedTR = _completedTR ? _completedTR : [];
    }

    auditNetwork() {
        validator.init()
            .then(() => {
                // Reconnecting Websocket connections to the Watchers
                try {
                    this.WSM = new WebSocketManagement(this.url, this.apiKey, validator.nodeId);
                    this.WSM.connectAugmentedNodeWS();

                    var processResponse = (response) => {
                        console.log("Entering Response:");
                        console.log(response);
                        validator.processEvent(this.workInProgress, response)
                        .then(async (element) => {
                            console.log("Element: " + element);
                            if (element >= 0) {
                                this.completedTR.push(this.workInProgress[element]);
                                let presentSource = await validator.addressInWorkInProgress(this.workInProgress, element, this.workInProgress[element].transferRequest.sourceAddress);
                                let presentDest = await validator.addressInWorkInProgress(this.workInProgress, element, this.workInProgress[element].transferRequest.destinationAddress);
                                let sourNet = validator.getNetworkSymbol(this.workInProgress[element].transferRequest.sourceNetwork);
                                let destNet = validator.getNetworkSymbol(this.workInProgress[element].transferRequest.destinationNetwork);
                                await WSM.sendActionToAugmentedNode(this.workInProgress[element].transferRequest, confTable, sourNet, destNet, "unsubscribe", !presentSource, !presentDest);
                                this.workInProgress.splice(element, 1);
                            }
                        })
                        .catch((error) => {
                            console.log("Error: wsan message " + error.name + " " + error.message);
                        });

                    }

                    ANevent.addListener('response', processResponse);
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
                            //console.log(transaction);
                            auditEvent.emit('ntraudit', transaction);
                        } catch (error) {
                            console.log("Error: " + error.name + " " + error.message);
                        }
                    }
                });
            });
    }

    get state() {
        let _state = {
            workInProgress: this.workInProgress,
            timedOut: this.timedOut,
            completedTR: this.completedTR
        };
        return _state;
    }

    get ANWS() {
        return this.WSM
    }
}

module.exports = {
    auditor: liteAuditor,
    eventEmitter: auditEvent,
    broadcaster: broadcaster
};