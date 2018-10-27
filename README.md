# liteAuditor
liteAuditor is the javascript auditing server to the Interblockchain network. It does sanity and accounting checks (including subscribing to various blockchain monitors to confirm payments) on transfer requests before transmitting its auditing results to the whole network. Client side applications will receive these audit events and provide feedback information on the status and load of the system. 

#Installation
In the liteAuditor directory, simply issue:

`npm install`

Then, the server can be started with:

`npm start`

# Use Case
For information on how to use liteAuditor, take a look at the [Interblockchain ](http://interblockchain.io/documentation/index.html#).

## Prerequisite
* node: install node from [here](https://nodejs.org/en/download/)

Prior to run, install all dependencies with `npm install`. To view dependencies, please refer to the package.json file.