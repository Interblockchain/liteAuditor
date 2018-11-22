# liteAuditor
liteAuditor is a javascript class to quickly build a lite auditing server to the Interblockchain network. It does sanity and accounting checks (including subscribing to various blockchain monitors to confirm payments) on transfer requests before transmitting its auditing results to the whole network. Client side applications will receive these audit events and provide feedback information on the status and load of the system. 

#Installation
In the liteAuditor directory, simply issue:

`npm install --save liteauditor`

# Usage

The liteAuditor class exports the class itself (named auditor), the interblockchain message broadcaster class (named broadcaster)
and an event emitter (named eventEmitter). 

```javascript
const LiteAuditor = require("./liteAuditor.js").auditor;
const broadcaster = require("./liteAuditor.js").broadcaster;
const auditEvent = require("./liteAuditor.js").eventEmitter;

const liteAuditor = new LiteAuditor(url, apiKey);
liteAuditor.auditNetwork();

// Broadcast of an auditing event  
var sendAudit = function (event) {
    console.log("Result of Audit:");
    console.log(event);
    broadcaster.publish(MESSAGE_CODES.AUDIT, event);
}
auditEvent.addListener('audit', sendAudit);
```

As can be seen in the above example, the class constructor must receive the URL and a corresponding key-auth apiKey
which gives access to an Interblockchain Augmented Node. For more information on the Augmented Node, take a look at the [Interblockchain ](http://interblockchain.io/documentation/index.html#).

Then, the Interblockchain network can be audited simply by invoking the auditNetwork method. This method connects to the Augmented node via reconnecting Websockets and then integrates the Interblockchain network using [ntrnetwork](https://www.npmjs.com/package/ntrnetwork). It will start receiving all transfer requests propagating on the network and auditing them with input coming from the Augmented node. At the conclusion of the audit, a audit event is fired and can than be published to the network.

Simultaneously, the liteAuditor will start receiving similar audit messages from other liteAuditors on the network. These audit messages fire
'ntraudit' events which can be caught and processed.

# Methods

```javascript
auditNetwork()
```
This method connects to the Augmented node via reconnecting Websockets and then integrates the Interblockchain network using [ntrnetwork](https://www.npmjs.com/package/ntrnetwork). It will start receiving all transfer requests propagating on the network and auditing them with input coming from the Augmented node. At the conclusion of the audit, a audit event is fired and can than be published to the network.

Simultaneously, the liteAuditor will start receiving similar audit messages from other liteAuditors on the network. These audit messages fire
'ntraudit' events which can be caught and processed.

```javascript
get state()
```
A simple getter which returns the state of the network. The state contains three arrays:
 - workInProgress : contains all transactions being processed
 - timedOut : contains the transactions which failed in the last 48 hours
 - completedTR : contains the transactions which succesfully completed in the last 48 hours

```javascript
get ANWS()
```
A simple getter which returns the Augmented Node WebSocket object. Can be used to directly send information to the node or query
information on the connection. 


## Prerequisite
* node: install node from [here](https://nodejs.org/en/download/)

Prior to run, install all dependencies with `npm install`. To view dependencies, please refer to the package.json file.