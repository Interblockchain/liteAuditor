const WebSocket = require('ws');
const Validator = require("./validator.js").validator;
const validator = new Validator();
require("./config/confTable");

class WebsocketManagement {

    constructor(url, apikey) { 
        this.url = url;
        this.apikey = apikey;
    }

    connectAugmentedNodeWS(nodeId, workInProgress, completedTR) {
        this.wsan = new WebSocket(this.url, { headers: { "apiKey": this.apikey } });
        this.wsan.onopen = (e) => {
            this.onOpen(e, nodeId);
        }
        this.wsan.onmessage = (e) => {
            this.onMessage(e, nodeId, workInProgress, completedTR);
        }
        this.wsan.onclose = (e) => {
            this.onClose(e, nodeId, workInProgress, completedTR);
        }
        this.wsan.onerror = (e) => {
            this.onError(e);
        }
        return this.wsan;
    }

    onOpen(openEvent, nodeId) {
        console.log('Connection to watcher opened');
        // First thing is to send your nodeId to establish long-term channel
        console.log("clientID: " + nodeId);
        this.wsan.send("clientID: " + nodeId);
    }

    async onMessage(messageEvent, nodeId, workInProgress, completedTR) {
        try {
            // The only messages we accept are JSON strings that contain
            // transactions on watched addresses. So this duplicates the
            // receiveEvents route.
            console.log("Received message" + messageEvent.data);
            let data = JSON.parse(messageEvent.data);
            validator.processEvent(workInProgress, data)
                .then(async (element) => {
                    console.log("Element: " + element);
                    if (element >= 0) {
                        completedTR.push(workInProgress[element]);
                        let presentSource = await validator.addressInWorkInProgress(workInProgress, element, workInProgress[element].transferRequest.sourceAddress);
                        let presentDest = await validator.addressInWorkInProgress(workInProgress, element, workInProgress[element].transferRequest.destinationAddress);
                        await this.sendActionToAugmentedNode(workInProgress[element].transferRequest, "unsubscribe", nodeId, !presentSource, !presentDest);
                        workInProgress.splice(element, 1);
                    }
                })
                .catch((error) => {
                    console.log("Error: wsan message " + error.name + " " + error.message);
                });
        } catch (error) {
            console.log("Error processing wsan message");
        }
    }

    onClose(e, nodeId, workInProgress, completedTR) {
        console.log("Connection to watcher closed");
        //Use random interval to prevent high server load when all clients try to reconnect
        let interval = Math.floor(10 * 1000 * Math.random());
        setTimeout(() => {
            this.connectAugmentedNodeWS(nodeId, workInProgress, completedTR);
        }, interval);
    }

    onError(e) {
        console.log("Websocket Error " + e.message);
    }

    send(data) {
        if (this.wsan.readyState === WebSocket.OPEN) {
            this.wsan.send(JSON.stringify(data));
        }
    }

    sendActionToAugmentedNode(TR, action, nodeId, publishSource, publishDest) {
        // Subscribe to source
        if (publishSource) {
            console.log("TR for send:");
            console.log(TR);
            let network = validator.getNetworkSymbol(TR.sourceNetwork);
            let data = {
                transactionID: TR.transactionID,
                action: action,
                clientURL: nodeId,
                network: network,
                address: TR.sourceAddress,
                requiredConf: confTable[network],
                onlyReqConf: TR.onlyReqConf,
            };
            this.send(data);
        }
        //Subscribe to Destination
        if (publishDest) {
            let network = validator.getNetworkSymbol(TR.destinationNetwork);
            let data = {
                transactionID: TR.transactionID,
                action: action,
                clientURL: nodeId,
                network: network,
                address: TR.destinationAddress,
                requiredConf: confTable[network],
                onlyReqConf: TR.onlyReqConf,
            };
            this.send(data);
        }
    }
}

module.exports = WebsocketManagement;