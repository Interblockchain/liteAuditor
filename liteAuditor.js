const Validator = require("./validator.js").validator;
const validatorEvent = require('./validator.js').eventEmitter;
const validator = new Validator();
const WebSocketManagement = require('./WebSocketManagement');
const WSM = new WebSocketManagement();
const GarbageCollector = require('./GarbageCollector');
const garbageCollector = new GarbageCollector();
const Broadcaster = require('ntrnetwork').Broadcaster;
const broadcaster = new Broadcaster(0x015);
const MESSAGE_CODES = require('ntrnetwork').MESSAGE_CODES;
require("./config/confTable");

validator.init()
    .then(() => {
        let workInProgress = [];
        let timedOut = [];
        let completedTR = [];

        // Reconnecting Websocket connections to the Watchers
        try {
            var WSObj = WSM.connectAugmentedNodeWS(validator.nodeId, workInProgress, completedTR);
            var wsUTXO = WSObj.wsUTXO;
            var wsAccount = WSObj.wsAccount;
            garbageCollector.globalTimeout(workInProgress, timedOut, completedTR, validator.nodeId, WSM);
            garbageCollector.paymentTimeout(workInProgress, timedOut, validator.nodeId, WSM);
        } catch (error) {
            console.log("Error with WS or garbage collection: " + error.name + " " + error.message);
        }

        // Receive the transactions on the network 
        broadcaster.subscribe(async (message_code, transaction) => {
            console.log("Received Event");
            console.log(transaction);
            if (message_code === MESSAGE_CODES.TX) {
                try {
                    let notDuplicate = await validator.checkRequestDuplicate(workInProgress, transaction)
                    if (notDuplicate) {
                        WSM.sendActionToAugmentedNode(transaction, "subscribe", validator.nodeId, true, true)
                        validator.saveTransferRequest(workInProgress, transaction);
                    } else { console.log("Transfer Request is a duplicate!") }
                } catch (error) {
                    console.log("Error: " + error.name + " " + error.message);
                }
            }
            if(message_code === MESSAGE_CODES.AUDIT) {
                try {
                    console.log("Received Audit");
                    console.log(transaction);
                } catch (error) {
                    console.log("Error: " + error.name + " " + error.message);
                }
            }
        });

        // Broadcast of an auditing event  
        var sendAudit = function (event) {
            console.log("Result of Audit:");
            console.log(event);
            broadcaster.publish(MESSAGE_CODES.AUDIT, event);
        }
        validatorEvent.addListener('audit', sendAudit);
    });