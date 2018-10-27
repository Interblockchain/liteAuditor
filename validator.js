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
const axios = require("axios");
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

// ########### Tendermint stuff ####################
// const TenderVal = require('./tenderVal');
// const tenderVal = new TenderVal();
//###################################################

// Use the fourth Redis record for the Stellar WAM.
// var Redis = require('ioredis');
// var redis = new Redis({
//     port: environment.redisPort,   // Redis port
//     host: environment.redisHost,   // Redis host
//     family: 4,           // 4 (IPv4) or 6 (IPv6)
//     db: environment.redisDb
// });

//###### TODO: put all that stuff in a config file or use existing values #
const IBCaugmentedNodeURL = "http://206.189.191.247:8000/";
//###########################################################################

class Validator {
    constructor() { }

    async init() {
        let externalIP = await this.getIP();
        this.validatorAddress = "http://" + externalIP + ":8099/api/v1/receiveEvents";
        //console.log(this.validatorAddress);
        await this.getNodeId();
    }

    async subscribeToEvents(transferRequest) {
        await this.watchEvent(transferRequest.transactionID,
            transferRequest.sourceAddress,
            transferRequest.sourceNetwork.toUpperCase(),
            transferRequest.onlyReqConf);

        // setTimeout(async () => {
        await this.watchEvent(transferRequest.transactionID,
            transferRequest.destinationAddress,
            transferRequest.destinationNetwork.toUpperCase(),
            transferRequest.onlyReqConf);
        // }, 3000);
        return
    }

    async unsubscribeToEvents(workInProgress, element) {
        // console.log("Testing unsubscribe:");
        // console.log(workInProgress.transferRequest);
        //Add a check that the address is not present in another workInProgress
        let present = await this.addressInWorkInProgress(workInProgress, element, workInProgress[element].transferRequest.sourceAddress);
        if (!present) {
            await this.stopWatchingEvent(workInProgress[element].transferRequest.transactionID,
                workInProgress[element].transferRequest.sourceAddress,
                workInProgress[element].transferRequest.sourceNetwork.toUpperCase(),
                workInProgress[element].transferRequest.onlyReqConf);
        }

        present = await this.addressInWorkInProgress(workInProgress, element, workInProgress[element].transferRequest.destinationAddress);
        if (!present) {
            await this.stopWatchingEvent(workInProgress[element].transferRequest.transactionID,
                workInProgress[element].transferRequest.destinationAddress,
                workInProgress[element].transferRequest.destinationNetwork.toUpperCase(),
                workInProgress[element].transferRequest.onlyReqConf);
        }
        return
    }

    // Method subscribing to the distpatcher in order to watch for events 
    // pertaining to an address on a network. In here we also do all the verifications
    // and formatting 
    async watchEvent(transactionID, Address, Network, onlyReqConf) {
        try {
            let network = this.getNetworkSymbol(Network);

            const authOptions = {
                method: 'POST',
                url: IBCaugmentedNodeURL + network + "net/subscribe",
                headers: {
                    'apikey': '42ad9bf1-1706-4104-901f-8d59d927dc5d',
                    'Content-Type': 'application/json',
                },
                data: {
                    transactionID: transactionID,
                    clientURL: this.validatorAddress,
                    network: network,
                    address: Address,
                    requiredConf: confTable[network],
                    onlyReqConf: onlyReqConf,
                    action: "subscribe"
                }
            };

            let responseObj = authOptions;
            // Request to dispatcher
            console.log("1) OUT dispatcher METHOD: " + authOptions.method);
            console.log("1) OUT dispatcherURL: " + authOptions.url);
            //console.log("1) OUT requestObj headers: ", JSON.stringify(authOptions.headers, null, 2)); 
            //console.log("1) OUT requestObj: ", JSON.stringify(authOptions.data, null, 2)); 
            await axios(authOptions)
                .then(function (response) {
                    console.log(`${Date().toString().substring(0, 24)} 2) Axios Response  ${JSON.stringify(response.data, null, 2)}`);
                })
                .catch((error) => {
                    console.log(`${Date().toString().substring(0, 24)} validator, WatchEvent: axios ${error}`);
                    console.log("error.name: " + error.name);
                    console.log("error.statusCode: " + error.statusCode);
                    console.log("error.message: " + JSON.stringify(error.message, null, 2));
                    let statusCode;
                    if (error.response) {
                        responseObj = error.response.data;      // custom error
                        statusCode = (error.response.status) ? error.response.status : 500;
                    } else {
                        responseObj.error = "server error";     // node error
                        statusCode = 500;
                    }
                    throw { name: `${Date().toString().substring(0, 24)} validator, watchEvent: server error`, statusCode: statusCode, message: responseObj };
                });
        } catch (error) {
            console.log(`${Date().toString().substring(0, 24)} 3) ${error}`);
            throw { name: `${Date().toString().substring(0, 24)} validator, watchEvent: `, statusCode: 500, message: "Axios communication error" };
        };
    }

    async stopWatchingEvent(transactionID, Address, Network, onlyReqConf) {
        try {
            let network = this.getNetworkSymbol(Network);

            const authOptions = {
                method: 'POST',
                url: IBCaugmentedNodeURL + network + "net/unsubscribe",
                headers: {
                    'apikey': '42ad9bf1-1706-4104-901f-8d59d927dc5d',
                    'Content-Type': 'application/json',
                },
                data: {
                    transactionID: transactionID,
                    clientURL: this.validatorAddress,
                    network: network,
                    address: Address,
                    requiredConf: confTable[network],
                    onlyReqConf: onlyReqConf,
                    action: "unsubscribe"
                }
            };

            let responseObj = authOptions;
            // Request to dispatcher
            console.log("1) OUT dispatcher METHOD: " + authOptions.method);
            console.log("1) OUT dispatcherURL: " + authOptions.url);
            //console.log("1) OUT requestObj headers: ", JSON.stringify(authOptions.headers, null, 2)); 
            //console.log("1) OUT requestObj: ", JSON.stringify(authOptions.data, null, 2)); 
            await axios(authOptions)
                .then(function (response) {
                    console.log(`${Date().toString().substring(0, 24)} 2) Axios Response  ${JSON.stringify(response.data, null, 2)}`);
                })
                .catch(function (error) {
                    console.log(`${Date().toString().substring(0, 24)} 2) Axios error  ${JSON.stringify(error.response, null, 2)}`);
                    console.log(`${Date().toString().substring(0, 24)} validator, stopWatchingEvent: axios ${error}`);
                    console.log("error.name: " + error.name);
                    console.log("error.statusCode: " + error.statusCode);
                    console.log("error.message: " + JSON.stringify(error.message, null, 2));
                    let statusCode;
                    if (error.response) {
                        responseObj = error.response.data;      // custom error
                        statusCode = (error.response.status) ? error.response.status : 500;
                    } else {
                        responseObj.error = "server error";     // node error
                        statusCode = 500;
                    }
                    throw { name: `${Date().toString().substring(0, 24)} validator, stopWatchingEvent: server error`, statusCode: statusCode, message: responseObj }
                });
        }
        catch (error) {
            console.log(`${Date().toString().substring(0, 24)} 3) ${error}`)
            throw { name: `${Date().toString().substring(0, 24)} validator, stopWatchingEvent: `, statusCode: 400, message: error };
        };
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

    // redisStoreTransferRequest(transferRequest) {
    //     // Only use sourceKey for storing in Redis because it is chosen unique in
    //     // checkDuplicate for every TR
    //     const sourceNetwork = this.getNetworkSymbol(transferRequest.sourceNetwork);
    //     const amount = this.convertAmount(transferRequest.amount, transferRequest.ticker);
    //     const sourceAddress = (sourceNetwork == "TETH" || sourceNetwork == "ETH") ? transferRequest.sourceAddress.toLowerCase() : transferRequest.sourceAddress;
    //     if (sourceNetwork == "TETH" || sourceNetwork == "ETH") {
    //         var from = (transferRequest.from != "" && transferRequest.from != "none") ? transferRequest.from.toLowerCase() : 0;
    //     } else {
    //         var from = (transferRequest.from != "" && transferRequest.from != "none") ? transferRequest.from : 0;
    //     }
    //     const key = `${sourceNetwork}:${sourceAddress}:${from}:${amount}`;

    //     let value = {
    //         timestamp: Date.now(),
    //         transferRequest: transferRequest
    //     };
    //     redis.set(key, JSON.stringify(value))
    //         .catch((error) => {
    //             throw { name: `Redis set error`, statusCode: 500, message: error }
    //         })
    // }

    // redisDeleteTransferRequest(transferRequest) {
    //     // Only use sourceKey for storing in Redis because it is chosen unique in
    //     // checkDuplicate for every TR
    //     const sourceNetwork = this.getNetworkSymbol(transferRequest.sourceNetwork);
    //     const amount = this.convertAmount(transferRequest.amount, transferRequest.ticker);
    //     const sourceAddress = (sourceNetwork == "TETH" || sourceNetwork == "ETH") ? transferRequest.sourceAddress.toLowerCase() : transferRequest.sourceAddress;
    //     if (sourceNetwork == "TETH" || sourceNetwork == "ETH") {
    //         var from = (transferRequest.from != "" && transferRequest.from != "none") ? transferRequest.from.toLowerCase() : 0;
    //     } else {
    //         var from = (transferRequest.from != "" && transferRequest.from != "none") ? transferRequest.from : 0;
    //     }
    //     const key = `${sourceNetwork}:${sourceAddress}:${from}:${amount}`;
    //     redis.del(key)
    //         .catch((error) => {
    //             throw { name: `Redis del error`, statusCode: 500, message: error }
    //         })
    // }

    // async restartValidator(workInProgress) {
    //     let keys = await redis.keys("*")
    //         .catch((error) => {
    //             content.error = error;
    //             content.success = false;
    //             console.log(`${Date().toString().substring(0, 24)} Validator: restartValidator ${err}`);
    //             throw { name: "Redis keys error", statusCode: 500, message: content }
    //         });
    //     keys.forEach(async (key, i) => {
    //         //Each key should have just one member
    //         let stored = await redis.get(key.toString())
    //             .catch((error) => {
    //                 content.error = error;
    //                 content.success = false;
    //                 console.log(`${Date().toString().substring(0, 24)} Validator: restartValidator ${err}`);
    //                 throw { name: "Redis get error", statusCode: 500, message: content }
    //             });
    //         let storedObj = JSON.parse(stored);
    //         //What to do with the timestamp? Or if the transaction is already passed?
    //         await this.processTransferRequest(workInProgress, storedObj.transferRequest)
    //         //this.saveTransferRequest(workInProgress, storedObj.transferRequest)
    //     });
    // }

    checkRequestDuplicate(workInProgress, transferRequest) {

        let responseObj = transferRequest;
        let validationParams = v.validate(transferRequest, schemasObj.transferRequest);
        if (!validationParams.valid) {
            responseObj.success = false;
            responseObj.errors = [];
            for (let i in validationParams.errors) {
                responseObj.errors.push(validationParams.errors[i].property + " " + validationParams.errors[i].message);
                console.log("Validator: transferRequest validation error " + i + ": " + validationParams.errors[i].property + " " + validationParams.errors[i].message);
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

            //Check that the request does not possess a duplicate key before doing anything
            if ((ssElement < 0) && (sdElement < 0) && (ddElement < 0) && (dsElement < 0)) {
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
                console.log("Validator: watcherEvent validation error " + i + ": " + validationParams.errors[i].property + " " + validationParams.errors[i].message);
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
            console.log("This is a source transaction");
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
            console.log("Request finished? " + requestFinished);
            if (requestFinished) {
                let requestAudited = this.auditRequest(workInProgress[element]);
                if (requestAudited) {
                    // //Dispatch the request to the block in tendermint
                    // if (workInProgress[element].transferRequest.brdcTender) {
                    //     tenderVal.broadcastValidatedRequest(workInProgress[element]);
                    // }
                    requestFinished = false;
                } else {
                    //The amounts are not consistent, should return an error message and
                    //contact police
                    console.log("Audit Failed, amounts do not match!");
                }
                let auditDetails ={
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
                console.log("This is a destination transaction.");
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
                console.log("Request finished? " + requestFinished);
                if (requestFinished) {
                    let requestAudited = this.auditRequest(workInProgress[element]);
                    if (requestAudited) {
                        //Dispatch the request to the block in tendermint
                        // if (workInProgress[element].transferRequest.brdcTender) {
                        //     tenderVal.broadcastValidatedRequest(workInProgress[element]);
                        // }
                        requestFinished = false;        
                    } else {
                        //The amounts are not consistent, should return an error message and
                        //contact police
                        console.log("Audit Failed, amounts do not match!");
                    }
                    let auditDetails ={
                        status: requestAudited,
                        TR: workInProgress[element]
                    };
                    console.log("Emitting event audit");
                    eventEmitter.emit('audit', auditDetails);
                    return element
                }
            } else {
                console.log(`${Date().toString().substring(0, 24)} Transaction not associated with any Request.`);
            
            }
        }
        return -1; //If it did not return before, no element was found.
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
                console.log("Network not recognized!");
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
            default:
                console.log("Network not recognized!");
                throw { name: `${Date().toString().substring(0, 24)} validator, getNetworkSymbol: Network not recognized`, message: "Network not recognized!" };
        }
    }

    async getIP() {
        try {
            let response = await axios.get("http://api.ipify.org/");
            console.log("External IP address: " + response.data);
            return response.data
        } catch (err) {
            console.error(error);
            throw { name: `${Date().toString().substring(0, 24)} validator, getIP: Axios error`, message: err };
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