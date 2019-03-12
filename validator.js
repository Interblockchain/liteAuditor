//------------------------------------------------------------------------------------------
// Library
//      validator
// Description:
//      - The library provides methods to subscribe to the various blockchains, to track
//        payments and do the bookkeeping and do financal accouting checks. It communicates
//        via posts with the Interblockchain WAMs at our Digital Ocean deployment
//        (http://174.138.50.251:6080/api/v1/subscribe).
//  Author:
//      - Paul Boulanger (paul.boulanger5@gmail.com)
//  Copyright:
//      - todo
//------------------------------------------------------------------------------------------

/* The request object:
 transactionID       : ID of the IBC transaction (we assign those?)
 sourceNetwork       : Blockchain of the source transaction (Etherium Network, Bitcoin Network, etc)
 sourceAddress       : interblockchain address in sourceNetwork where the user will send the tokens
 from                : in ETH: userAddress from which the user will send tokens (the from field in ETH tx)
                     : in BTC: the user address can be anything, the source address is the user identifyer
 destinationNetwork  : Blockchain of the destination transaction (Etherium Network, Bitcoin Network, etc)
 destinationAddress  : user address in destinationNetwork
 tokenContractAddress: Address of the smart contract defining the tokens
 requiredConf         : Number of confirmations to track
 onlyReqConf          : Do we only issue responses when requiredConf is reached
*/
const schemasObj = require("./config/schemas");
const objChecker = require('jsonschema').Validator;
const v = new objChecker();
const BigNumber = require('bignumber.js');
const fs = require('fs');
const path = require('path');
var events = require('events');
var eventEmitter = new events.EventEmitter();

BigNumber.set({ DECIMAL_PLACES: 3, ROUNDING_MODE: BigNumber.ROUND_DOWN });

require("./config/confTable");

class Validator {
    constructor(debug) {
        this._debug = debug ? debug : false;
     }

    async init() {
        await this.getNodeId();
    }

    saveTransferRequest(workInProgress, transferRequest) {
        const sourceNetwork = this.getNetworkSymbol(transferRequest.sourceNetwork);
        const destNetwork = this.getNetworkSymbol(transferRequest.destinationNetwork);
        const amount = this.convertAmount(transferRequest.amount, transferRequest.ticker);
        const sourceAddress = (sourceNetwork == "TETH" || sourceNetwork == "ETH") ? transferRequest.sourceAddress.toLowerCase() : transferRequest.sourceAddress;
        const destinationAddress = (destNetwork == "TETH" || destNetwork == "ETH") ? transferRequest.destinationAddress.toLowerCase() : transferRequest.destinationAddress;
        if (sourceNetwork == "TETH" || sourceNetwork == "ETH") {
            var from = (transferRequest.from != "" && transferRequest.from != "none") ? transferRequest.from.toLowerCase() : "0";
        } else {
            var from = (transferRequest.from != "" && transferRequest.from != "none") ? transferRequest.from : "0";
        }
        const sourceKey = `${sourceNetwork}:${sourceAddress}:${from}:${amount}`;
        const destKey = `${destNetwork}:${destinationAddress}:0:${amount}`;

        const transferInfo = {
            timestamp: Date().toString().substring(0, 24),
            sourceKey: sourceKey,
            destKey: destKey,
            transferRequest: transferRequest,
            sourceReqConf: confTable[sourceNetwork],
            sourceNbConf: "-1",
            sourceTxHash: "",
            destinationReqConf: confTable[destNetwork],
            destinationNbConf: "-1",
            destinationTxHash: "",
            sourceAmount: "",
            destinationAmount: "",
            sourceMessageID: "",
            destinationMessageID: ""
        };
        workInProgress.push(transferInfo);
    }

    checkRequestDuplicate(workInProgress, transferRequest) {

        let responseObj = transferRequest;
        let validationParams = v.validate(transferRequest, schemasObj.transferRequest);
        if (!validationParams.valid) {
            responseObj.success = false;
            responseObj.errors = [];
            for (let i in validationParams.errors) {
                responseObj.errors.push(validationParams.errors[i].property + " " + validationParams.errors[i].message);
                console.log(`${Date().toString().substring(0, 24)} [validator:checkRequestDuplicate] transferRequest validation error ${i}: ${validationParams.errors[i].property} ${validationParams.errors[i].message}`);
            }
            throw { name: `${Date().toString().substring(0, 24)} validator, checkRequestDuplicate: validation error`, statusCode: 400, message: responseObj }
        }

        const sourceNetwork = this.getNetworkSymbol(transferRequest.sourceNetwork);
        const destNetwork = this.getNetworkSymbol(transferRequest.destinationNetwork);
        const amount = this.convertAmount(transferRequest.amount, transferRequest.ticker);
        const sourceAddress = (sourceNetwork == "TETH" || sourceNetwork == "ETH") ? transferRequest.sourceAddress.toLowerCase() : transferRequest.sourceAddress;
        const destinationAddress = (destNetwork == "TETH" || destNetwork == "ETH") ? transferRequest.destinationAddress.toLowerCase() : transferRequest.destinationAddress;
        if (sourceNetwork == "TETH" || sourceNetwork == "ETH") {
            var from = (transferRequest.from != "" && transferRequest.from != "none") ? transferRequest.from.toLowerCase() : "0";
        } else {
            var from = (transferRequest.from != "" && transferRequest.from != "none") ? transferRequest.from : "0";
        }
        const sourceKey = `${sourceNetwork}:${sourceAddress}:${from}:${amount}`;
        const destKey = `${destNetwork}:${destinationAddress}:0:${amount}`;

        try {
            const ssElement = workInProgress.findIndex(element => element.sourceKey === sourceKey);
            const sdElement = workInProgress.findIndex(element => element.sourceKey === destKey);
            const ddElement = workInProgress.findIndex(element => element.destKey === destKey);
            const dsElement = workInProgress.findIndex(element => element.destKey === sourceKey);
            //Checking only in workInProgress to make sure TRID is unique (should we extend this to completedTR?)
            const tridElement = workInProgress.findIndex(element => element.transferRequest.transactionID === transferRequest.transactionID);

            //Check that the request does not possess a duplicate key or TRID before doing anything
            if ((ssElement < 0) && (sdElement < 0) && (ddElement < 0) && (dsElement < 0) && (tridElement < 0)) {
                return true
            } else {
                return false
            }
        } catch (err) {
            responseObj.success = false;
            responseObj.errors = err;
            throw { name: `${Date().toString().substring(0, 24)} validator, checkRequestDuplicate: findIndex error `, statusCode: 400, message: responseObj }
        };
    }

    checkRequestComplete(request) {
        //if (request.sourceTxHash != "" && request.destinationTxHash != "") {
        if (request.sourceNbConf >= request.sourceReqConf && request.destinationNbConf >= request.destinationReqConf) {
            return true
        } else { return false }
    }

    //TO DO: Add additionnal tests (check amounts) when unambiguous destination
    //Use bignumber for decimals? Integrate fees.
    auditRequest(request) {
        //console.log(request.sourceAmount + " vs " + request.destinationAmount);
        return request.sourceAmount === request.destinationAmount;
    }

    addressInWorkInProgress(workInProgress, index, address) {
        //Loop on all elements and check if address is present
        let result = false;
        for (var i = 0, len = workInProgress.length; i < len; i++) {
            if (i != index && (workInProgress[i].transferRequest.sourceAddress === address || workInProgress[i].transferRequest.destinationAddress === address)) {
                result = true
            }
        }
        return result;
    }

    async processEvent(workInProgress, eventObj) {

        let responseObj = eventObj;
        v.addSchema(schemasObj.addresses, "/Addresses");
        let validationParams = v.validate(eventObj, schemasObj.event);
        if (!validationParams.valid) {
            responseObj.success = false;
            responseObj.errors = [];
            for (let i in validationParams.errors) {
                responseObj.errors.push(validationParams.errors[i].property + " " + validationParams.errors[i].message);
                console.log(`${Date().toString().substring(0, 24)} [validator:processEvent] watcherEvent validation error ${i}: ${validationParams.errors[i].property} ${validationParams.errors[i].message}`);
            }
            throw { name: `${Date().toString().substring(0, 24)} validator, processEvent: validation error`, statusCode: 400, message: responseObj }
        }

        //Test if this transaction is a source or destination transaction
        //And do the bookeeping needed
        let requestFinished = false;
        let addressTo = "";
        let amount = "";
        let from = "0";
        let address = "";
        if (eventObj.addresses.length > 1) { throw { name: "Validator: processEvent", message: "Multiple adresses in one Event not supported yet" } }
        //This works when there is only one address
        addressTo = eventObj.addresses[0].address;
        amount = eventObj.addresses[0].amount;
        if (eventObj.network.toUpperCase() == "TETH" || eventObj.network.toUpperCase() == "ETH") {
            from = (eventObj.addressFrom && eventObj.from != "none") ? eventObj.addressFrom.toLowerCase() : "0";
            address = addressTo.toLowerCase();
        } else {
            from = (eventObj.addressFrom && eventObj.from != "none") ? eventObj.addressFrom : "0";
            address = addressTo;
        }
        let key = `${eventObj.network.toUpperCase()}:${address}:${from}:${amount}`;
        //console.log("Key source: " + key);
        let element = workInProgress.findIndex(element => element.sourceKey === key);
        if (element >= 0) {
            console.log(`${Date().toString().substring(0, 24)} [validator:processEvent] Received source transaction for TRID: ${workInProgress[element].transferRequest.transactionID}`);
            if (workInProgress[element].sourceTxHash === "") {
                workInProgress[element].sourceTxHash = eventObj.txHash;
                workInProgress[element].sourceAmount = eventObj.addresses[0].amount;
                workInProgress[element].sourceMessageID = eventObj.messageID;
            }
            if (eventObj.nbConf < workInProgress[element].sourceNbConf) {
                throw { name: "Validator: processEvent", message: "sourceNbConf decreased!" }
            }
            workInProgress[element].sourceNbConf = eventObj.nbConf;
            requestFinished = this.checkRequestComplete(workInProgress[element]);
            this._debug ? console.log(`${Date().toString().substring(0, 24)} [validator:processEvent] Request ${workInProgress[element].transferRequest.transactionID} finished? ${requestFinished}`) : null;
            if (requestFinished) {
                let requestAudited = this.auditRequest(workInProgress[element]);
                if (requestAudited) {
                    requestFinished = false;
                } else {
                    console.log(`${Date().toString().substring(0, 24)} [validator:processEvent] Audit Failed, amounts do not match!`);
                }
                let auditDetails = {
                    status: requestAudited,
                    TR: workInProgress[element]
                };
                eventEmitter.emit('audit', auditDetails);
                return element;
            }
        } else {
            key = `${eventObj.network.toUpperCase()}:${address}:0:${amount}`;
            //console.log("Key dest: " + key);
            element = workInProgress.findIndex(element => element.destKey === key);
            if (element >= 0) {
                console.log(`${Date().toString().substring(0, 24)} [validator:processEvent] Received a destination transaction for TRID: ${workInProgress[element].transferRequest.transactionID}`);
                if (workInProgress[element].destinationTxHash === "") {
                    workInProgress[element].destinationTxHash = eventObj.txHash;
                    workInProgress[element].destinationAmount = eventObj.addresses[0].amount.toString();
                    workInProgress[element].destinationMessageID = eventObj.messageID;
                }
                if (eventObj.nbConf < workInProgress[element].destinationNbConf) {
                    throw { name: "Validator: processEvent", message: "destinationNbConf decreased!" }
                }
                workInProgress[element].destinationNbConf = eventObj.nbConf;
                requestFinished = this.checkRequestComplete(workInProgress[element]);
                this._debug ? console.log(`${Date().toString().substring(0, 24)} [validator:processEvent] Request ${workInProgress[element].transferRequest.transactionID} finished? ${requestFinished}`) : null;
                if (requestFinished) {
                    let requestAudited = this.auditRequest(workInProgress[element]);
                    if (requestAudited) {
                        requestFinished = false;
                    } else {
                        console.log(`${Date().toString().substring(0, 24)} [validator:processEvent] Audit Failed, amounts do not match!`);
                    }
                    let auditDetails = {
                        status: requestAudited,
                        TR: workInProgress[element]
                    };
                    // console.log("Emitting event audit");
                    eventEmitter.emit('audit', auditDetails);
                    return element
                }
            } else {
                console.log(`${Date().toString().substring(0, 24)} [validator:processEvent] Received transaction not associated with any Request.`);
            }
        }
        return -1;
    }

    getBlockchainType(Network) {
        switch (Network.toUpperCase()) {
            case "TBTC":
            case "BTC":
            case "TLTC":
            case "LTC":
            case "BCH":
            case "TBCH":
            case "TETH":
            case "ETH":
                return "UTXO";
            case "TXLM":
            case "XLM":
            case "TXRP":
            case "XRP":
            case "EOS":
            case "TEOS":
                return "Account";
            default:
                console.log(`${Date().toString().substring(0, 24)} [validator:getBlockchainType] Network not recognized!`);
                throw { name: `${Date().toString().substring(0, 24)} validator, getBlockchainType: Network not recognized`, statusCode: 400, message: "Network not recognized!" };
        }
    }

    getNetworkSymbol(inputNetwork) {
        switch (inputNetwork.toUpperCase()) {
            case "ETHEREUM NETWORK":
            case "TETH":
            case "ETH":
                return "TETH";
            case "BITCOIN NETWORK":
            case "TBTC":
            case "BTC":
                return "TBTC";
            case "LITECOIN NETWORK":
            case "TLTC":
            case "LTC":
                return "TLTC";
            case "BITCOIN CASH NETWORK":
            case "TBCH":
            case "BCH":
                return "TBCH";
            case "STELLAR NETWORK":
            case "TXLM":
            case "XLM":
                return "TXLM";
            case "RIPPLE NETWORK":
            case "TXRP":
            case "XRP":
                return "TXRP"
            case "EOS NETWORK":
            case "EOS":
            case "TEOS":
                return "TEOS"
            default:
                console.log(`${Date().toString().substring(0, 24)} [validator:getNetworkSymbol] Network not recognized!`);
                throw { name: `${Date().toString().substring(0, 24)} validator, getNetworkSymbol: Network not recognized`, message: "Network not recognized!" };
        }
    }

    async getNodeId() {
        let file = path.join(__dirname, 'nodeId.txt');
        try {
            fs.accessSync(file, fs.constants.F_OK)
            // File exists
            this.nodeId = await fs.readFileSync(file, 'utf8');
            //console.log("Read: " + this.nodeId);
        } catch (err) {
            // File does not exist
            this.nodeId = this.uuidv4();
            fs.writeFileSync(file, this.nodeId);
            //console.log("Generating nodeId: " + this.nodeId);
        }
    }

    uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    convertAmount(amount, ticker) {
        //console.log(" Amount: " + amount + " ticker: " + ticker);

        let value = new BigNumber(amount);
        if (!value.isFinite() || value.isZero()) {
            throw { name: "convertAmount", message: "Amount is zero or not finite." }
        }
        switch (ticker.toUpperCase()) {
            // case "XLM":
            //     return value.toString()
            case "TBTC":
            case "TLTC":
            case "ITLTC":
            case "ITBTC":
            case "TBCH":
            case "ITBCH":
                //Satoshi is 10^-8 BTC
                let factor = new BigNumber("10").exponentiatedBy("8");
                return value.multipliedBy(factor).toString()
            case "TETH":
            case "ITETH":
                //Wei is 10^-18 ETH
                factor = new BigNumber("10").exponentiatedBy("18");
                return value.multipliedBy(factor).toString()
            default:
                throw { name: "convertAmount", message: "Asset not supported" };
        }

    }
}
module.exports = {
    validator: Validator,
    eventEmitter: eventEmitter
};