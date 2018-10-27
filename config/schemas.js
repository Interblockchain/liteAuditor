// {
//     "ticker": "tBTC",
//     "sourceNetwork": "Bitcoin Network",
//     "sourceAddress": "mjXkYdKVeV1sZynpFfsWK9wMHVQxPPJpnW",
//     "destinationNetwork": "Ethereum Network",
//     "destinationAddress": "0x130f6562d441d25a812865527761ee7246af0297",
//     "from": "",
//     "amount": 0,
//     "appID": "fc4b87a5-a75e-45c2-9b62-76400c9b3b74-1526309794375",
//     "transactionID": "338fbd5f-22d3-4f8d-a0ee-1e1ca57532b3",
//     "tokenContractAddress": "0xfc2435dfac42da6249500f87030fd18e9203829a"
//   }

//  transferRequest
module.exports.transferRequest = {
    "id": "/TransferRequest",
    "type": "object",
    "properties": {
        "transactionID": { "type": "string" },
        "sourceNetwork": { "type": "string" },
        "sourceAddress": { "type": "string" },
        "from": { "type": "string" },
        "destinationNetwork": { "type": "string" },
        "destinationAddress": { "type": "string" },
        "ticker": { "type": "string" },
        "amount": { "type": "string" },
        "appID": { "type": "string" },
        "tokenContractAddress": { "type": "string" }
    },
    "additionalProperties": false,
    "required": ["transactionID", "sourceNetwork", "sourceAddress", "amount",
        "destinationNetwork", "destinationAddress", "ticker", "appID"]
};

// Adresses
module.exports.addresses= {
"id": "/Addresses",
"type": "array",
"items": {
    "type": "object",
    "properties": {
        "address" : { "type": "string"},
        "amount": {"type": "string"}
    },
    "additionalProperties": true,
    "required": ["address", "amount"]
}
};

//  Event
module.exports.event = {
    "id": "/Event",
    "type": "object",
    "properties": {
        "messageID": { "type": "string" },
        "network": { "type": "string" },
        "timestamp": { "type": "number" },
        "blockDate": { "type": "string" },
        "blockNumber": { "type": "string" },
        "txHash": { "type": "string" },
        "nbConf": { "type": "string" },
        "addresses" : { "$ref": "/Addresses"},
        "addressFrom": { "type": "string" },
        "tokenContractAddress": { "type": "string" }
    },
    "additionalProperties": true,
    "required": ["network", "addresses", "timestamp", "blockDate",
        "blockNumber", "txHash", "nbConf"]
};