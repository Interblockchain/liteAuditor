const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');

mongoose.set('useCreateIndex', true);

// define the schema for our user model
const transferSchema = mongoose.Schema({
    timestamp: { type: String, require: true },
    sourceKey: { type: String, require: true },
    destKey: { type: String, require: true },
    transferRequest: {
        accountID: { type: String, require: true },
        amount: { type: String, require: true },
        sourceNbConf: { type: Number, default: 1, minimum: 0 },
        destNbConf: { type: Number, default: 1, minimum: 0 },
        destinationAddress: { type: String, require: true },
        destinationNetwork: { type: String, require: true },
        from: { type: String, require: true },
        sourceAddress: { type: String, require: true },
        sourceNetwork: { type: String, require: true },
        ticker: { type: String, require: true },
        timestamp: { type: Number, default: 1, minimum: 0 },
        appID: { type: String, require: true },
        transactionID: { type: String, require: true },
        deviceID: { type: String, require: true },
        brdcTender: { type: Boolean, require: true },
        onlyReqConf: { type: Boolean, require: true }
    },
    sourceReqConf: { type: Number, default: 1, minimum: 0 },
    sourceNbConf: { type: Number, default: 1, minimum: -1 },
    sourceTxHash: { type: String, require: true },
    destinationReqConf: { type: Number, default: 1, minimum: 0 },
    destinationNbConf: { type: Number, default: 1, minimum: -1 },
    destinationTxHash: { type: String, require: true },
    sourceAmount: { type: String, require: true },
    destinationAmount: { type: String, require: true },
    sourceMessageID: { type: String, require: true },
    destinationMessageID: { type: String, require: true },
    incomeFees: { type: String, require: true },
    networkFees: { type: String, require: true }
});

transferSchema.plugin(mongoosePaginate);
transferSchema.index({ "transferRequest.transactionID": 1 }, { unique: true });
transferSchema.index({ "transferRequest.accountID": 1 });

// create the model for wallet and expose it to our app
module.exports = mongoose.model('Transfer', transferSchema);