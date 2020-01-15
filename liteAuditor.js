const Validator = require("./validator.js").validator;
const auditEvent = require('./validator.js').eventEmitter;
const WebSocketManagement = require('wsmanagement').WS;
const ANevent = require('wsmanagement').eventEmitter;
const GarbageCollector = require('./GarbageCollector');
const garbageCollector = new GarbageCollector(auditEvent);
const Broadcaster = require('ntrnetwork').Broadcaster;
const MESSAGE_CODES = require('ntrnetwork').MESSAGE_CODES;
const translib = new (require('translib'))();
require("./config/confTable");

class liteAuditor {
    constructor(ntrchannel, _url, _options, debug, _workInProgress, _timedOut, _completedTR) {
        this.url = _url;
        this.options = _options;
        this.workInProgress = _workInProgress ? _workInProgress : [];
        this.timedOut = _timedOut ? _timedOut : [];
        this.completedTR = _completedTR ? _completedTR : [];
        this.broadcaster = (ntrchannel) ? new Broadcaster(ntrchannel) : null;
        this._debug = debug ? debug : false;
        this.validator = new Validator(debug);
    }

    auditNetwork() {
        this.validator.init()
            .then(() => {
                // Reconnecting Websocket connections to the Watchers
                try {
                    this.WSM = new WebSocketManagement(this.url, this.validator.nodeId, this.options, this._debug);
                    this.WSM.connectAugmentedNodeWS();

                    var processResponse = (response) => {
                        this._debug ? console.log(`${translib.logTime()} [liteAuditor:auditNetwork] Entering Response:`) : null;
                        this._debug ? console.log(`${translib.logTime()} [liteAuditor:auditNetwork] ${JSON.stringify(response)}`) : null;
                        switch (response.type) {
                            case "ERROR":
                                console.log(`${translib.logTime()} [auditNetwork] augmentedNode ERROR for ${response.clientID}: ${response.message}`);
                                break;
                            case "message":
                            case "notification":
                                break;
                            case "transaction":
                                this.validator.processEvent(this.workInProgress, JSON.parse(response.message))
                                    .then(async (element) => {
                                        // console.log("Element: " + element);
                                        if (element >= 0) {
                                            this.completedTR.push({ timestamp: Date.now(), TR: this.workInProgress[element] });
                                            let presentSource = await this.validator.addressInWorkInProgress(this.workInProgress, element, this.workInProgress[element].transferRequest.sourceAddress);
                                            let presentDest = await this.validator.addressInWorkInProgress(this.workInProgress, element, this.workInProgress[element].transferRequest.destinationAddress);
                                            let sourNet = translib.getNetworkSymbol(this.workInProgress[element].transferRequest.sourceNetwork);
                                            let destNet = translib.getNetworkSymbol(this.workInProgress[element].transferRequest.destinationNetwork);
                                            await this.WSM.sendActionToAugmentedNode(this.workInProgress[element].transferRequest, confTable, sourNet, destNet, "unsubscribe", !presentSource, !presentDest);
                                            this.workInProgress.splice(element, 1);
                                        }
                                    })
                                    .catch((error) => {
                                        console.log(`${translib.logTime()} [liteAuditor:auditNetwork] Error: wsan message ${error.name} ${error.message}`);
                                    });
                                break;
                            default:
                                console.log(`${translib.logTime()} [auditNetwork] In default switch for augmentedNode response type. PROBLEM.`);
                                break;
                        }
                    }
                    ANevent.addListener('response', processResponse);
                    garbageCollector.globalTimeout(this.workInProgress, this.timedOut, this.completedTR, confTable, this.WSM);
                    garbageCollector.paymentTimeout(this.workInProgress, this.timedOut, confTable, this.WSM);
                } catch (error) {
                    console.log(`${translib.logTime()} [liteAuditor:auditNetwork] Error with WS or garbage collection: ${error.name} ${error.message}`);
                }

                // Receive the transactions on the network 
                if (this.broadcaster) {
                    this.broadcaster.subscribe(async (message_code, transaction) => {

                        if (message_code === MESSAGE_CODES.TX) {
                            try {
                                let tx = transaction.data;
                                this._debug ? console.log(`${translib.logTime()} [liteAuditor:auditNetwork] Received TR via ntrnetwork}`) : null;
                                this._debug ? console.log(`${translib.logTime()} [liteAuditor:auditNetwork] ${JSON.stringify(transaction)}`) : null;
                                let notDuplicate = await this.validator.checkRequestDuplicate(this.workInProgress, tx)
                                if (notDuplicate) {
                                    let sourNet = translib.getNetworkSymbol(tx.sourceNetwork);
                                    let destNet = translib.getNetworkSymbol(tx.destinationNetwork);
                                    await this.WSM.sendActionToAugmentedNode(tx, confTable, sourNet, destNet, "subscribe", this.validator.nodeId, true, true)
                                    this.validator.saveTransferRequest(this.workInProgress, tx);
                                } else { console.log(`${translib.logTime()} [liteAuditor:auditNetwork] Transfer Request is a duplicate!`) }
                            } catch (error) {
                                console.log(`${translib.logTime()} [liteAuditor:auditNetwork] Error for TX: ${error.name} ${error.message}`);
                            }
                        }
                        if (message_code === MESSAGE_CODES.AUDIT) {
                            try {
                                console.log(`${translib.logTime()} [liteAuditor:auditNetwork] Received Audit event: Status= ${transaction.status}, TRID= ${transaction.TR.transferRequest.transactionID}`);
                                //console.log(transaction);
                                auditEvent.emit('ntraudit', transaction);
                            } catch (error) {
                                console.log(`${translib.logTime()} [liteAuditor:auditNetwork] Error for AUDIT: ${error.name} ${error.message}`);
                            }
                        }
                    });
                }
            });
    }

    async processRequest(payload) {
        let request = payload.data;
        let response = {};
        let notDuplicate = await this.validator.checkRequestDuplicate(this.workInProgress, request);
        if (notDuplicate) {
            this.validator.saveTransferRequest(this.workInProgress, request);
            // Broadcast and process the transferRequest to all neighbour nodes
            if (this.broadcaster) { this.broadcaster.publish(MESSAGE_CODES.TX, payload); }
            request.brdcTender = true;
            //Save transferRequest in Redis for restart
            // validator.redisStoreTransferRequest(request)
            request.onlyReqConf = true;
            let sourNet = translib.getNetworkSymbol(request.sourceNetwork);
            let destNet = translib.getNetworkSymbol(request.destinationNetwork);
            await this.WSM.sendActionToAugmentedNode(request, confTable, sourNet, destNet, "subscribe", true, true)
            response.status = 200;
            response.message = "Transfer request succesfully treated";
            // } else {
            //     await validator.subscribeToEvents(request)
            //         .then(() => {
            //             response.status = 200;
            //             response.message = "Transfer request succesfully treated and sent using REST";
            //             validator.saveTransferRequest(this.workInProgress, request);
            //         })
            //         .catch((error) => {
            //             console.log("Error: " + error.name + " " + error.message);
            //             let statusCode = (error.statusCode) ? error.statusCode : 500;
            //             response.status = statusCode;
            //             response.message = error.name;
            //         });
            // }
        } else {
            console.log(`${translib.logTime()} [liteAuditor:processRequest] TR already accounted for in workInProgress`);
            response.status = 400;
            response.message = `${translib.logTime()} Transfer Request already in workInProgress`;
        }
        return response;
    }

    async processReply(reply) {
        this._debug ? console.log(`${translib.logTime()} [liteAuditor:processReply] Received Reply`) : null;
        this._debug ? console.log(`${translib.logTime()} [liteAuditor:processREply] api: ${JSON.stringify(reply, null, 2)}`) : null;
        let response = {};
        await this.validator.processEvent(this.workInProgress, reply)
            .then(async (element) => {
                response.status = 200;
                response.message = "Reply succesful!";
                if (element >= 0) {
                    this.completedTR.push({ timestamp: Date.now(), TR: this.workInProgress[element] });
                    let presentSource = await this.validator.addressInWorkInProgress(this.workInProgress, element, this.workInProgress[element].transferRequest.sourceAddress);
                    let presentDest = await this.validator.addressInWorkInProgress(this.workInProgress, element, this.workInProgress[element].transferRequest.destinationAddress);
                    let sourNet = translib.getNetworkSymbol(this.workInProgress[element].transferRequest.sourceNetwork);
                    let destNet = translib.getNetworkSymbol(this.workInProgress[element].transferRequest.destinationNetwork);
                    await WSM.sendActionToAugmentedNode(this.workInProgress[element], confTable, sourNet, destNet, "unsubscribe", !presentSource, !presentDest);
                    this.workInProgress.splice(element, 1);
                    // } else {
                    //     //Unsubscribe to the WAS
                    //     this.validator.unsubscribeToEvents(this.workInProgress, element)
                    //         .then(() => {
                    //             //Then delete the request from the workInProgress and set the boolean to false
                    //             this.workInProgress.splice(element, 1);
                    //             //delete it from redis storage
                    //             // this.redisDeleteTransferRequest(this.workInProgress[element].transferRequest);
                    //         });
                    // }
                }
                return response;
            })
            .catch((error) => {
                console.log(`${translib.logTime()} [liteAuditor:processReply] Error: ${error.name} ${error.message}`);
                let statusCode = (error.statusCode) ? error.statusCode : 500;
                let errorObj = error.message;
                errorObj.error = error.name;
                response.status = statusCode
                response.message = error.name;
                return response;
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
    nodeID: this.validator.nodeID,
    eventEmitter: auditEvent,
    validator: this.validator
};