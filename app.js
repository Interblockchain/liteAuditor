const express = require('express');                   // call express 4
const bodyParser = require('body-parser');            // to parse form body variables 
const cors = require('cors');
const Routes = require("./routes.js");
const routes = new Routes();
const LiteAuditor = require("./liteAuditor.js").auditor;
const broadcaster = require("./liteAuditor.js").broadcaster;
const auditEvent = require("./liteAuditor.js").eventEmitter;
const MESSAGE_CODES = require('ntrnetwork').MESSAGE_CODES;


//let url = "ws://pushpin:7999/augmentedNode/ws-validator";
let url = "ws://138.197.169.38:7999/augmentedNode/ws-validator";
let apiKey = "42ad9bf1-1706-4104-901f-8d59d927dc5d";
const liteAuditor = new LiteAuditor(url, apiKey);
liteAuditor.auditNetwork();

// Broadcast of an auditing event  
var sendAudit = function (event) {
    console.log("Result of Audit:");
    console.log(event);
    broadcaster.publish(MESSAGE_CODES.AUDIT, event);
}
auditEvent.addListener('audit', sendAudit);

//################ EXPRESS
const app = express();                                // define our app using express
app.use(bodyParser.json());                         // this will let us get the data from a POST
app.use(cors());
const router = express.Router();                      // create modular, mountable route handler
app.use('/api/v1', router);                               // express will use the router

// Set our port
let port = 8099;

router.get("/status", (req, res) => {
    routes.statusGET(req, res, liteAuditor.ANWS.wsan, broadcaster, liteAuditor.state);
});
router.delete("/status", (req, res) => {
    routes.statusDEL(req, res, liteAuditor.ANWS.wsan, liteAuditor.state);
});
router.get("/peers", (req, res) => {
    routes.peersGET(req, res, broadcaster);
});
router.get("/trids", (req, res) => {
    routes.tridsGET(req, res, liteAuditor.state);
});

// Start the Express Client listening server
app.listen(port);
console.log('LiteAuditor server started on port: ' + port);
