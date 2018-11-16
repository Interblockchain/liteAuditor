class routes {
    constructor() {}

    //See the transferRequests currently being handled
    statusGET(req, res, ws, broadcaster, state) {
        let workInProgress = state.workInProgress;
        let timedOut = state.timedOut;
        let completedTR = state.completedTR;
        let TRID = req.query.id;
        if (TRID) {
            let objJSON = {};
            //First search the current workInProgress
            let current = workInProgress.findIndex(element => element.transferRequest.transactionID === TRID);
            if (current >= 0) {
                objJSON = {
                    ws: ws.readyState,
                    requestStatus: "Processing",
                    request: workInProgress[current]
                };
                res.send(objJSON);
                return
            }
            // Then check in completedTR
            let completed = completedTR.findIndex(element => element.transferRequest.transactionID === TRID);
            if (completed >= 0) {
                objJSON = {
                    ws: ws.readyState,
                    requestStatus: "Completed",
                    request: completedTR[completed]
                };
                res.send(objJSON);
                return
            }
            //Finally check in the timedOut
            let rejected = timedOut.findIndex(element => element.TR.transferRequest.transactionID === TRID);
            if (rejected >= 0) {
                objJSON = {
                    ws: ws.readyState,
                    requestStatus: "Timed Out",
                    request: timedOut[rejected]
                };
                res.send(objJSON);
                return
            }
            //TR not found so say so
            objJSON = {
                ws: ws.readyState,
                requestStatus: "Not Found",
            };
            res.send(objJSON);
        } else {
            let lastHourTO = 0;
            let last12HoursTO = 0;
            let last24HoursTO = 0;
            timedOut.forEach((to) => {
                if ((Date.now() - to.timestamp) < 60 * 60 * 1000) {
                    lastHourTO += 1;
                } else if ((Date.now() - to.timestamp) > 60 * 60 * 1000 && (Date.now() - to.timestamp) < 12 * 60 * 60 * 1000) {
                    last12HoursTO += 1;
                } else if ((Date.now() - to.timestamp) > 12 * 60 * 60 * 1000 && (Date.now() - to.timestamp) < 24 * 60 * 60 * 1000) {
                    last24HoursTO += 1;
                }
            });
            let dispto = {
                "total": timedOut.length,
                "last hour": lastHourTO,
                "last 12 hours": last12HoursTO,
                "last 24 hours": last24HoursTO
            };
            let lastHour = 0;
            let last12Hours = 0;
            let last24Hours = 0;
            completedTR.forEach((comp) => {
                if ((Date.now() - comp.timestamp) < 60 * 60 * 1000) {
                    lastHour += 1;
                } else if ((Date.now() - comp.timestamp) > 60 * 60 * 1000 && (Date.now() - comp.timestamp) < 12 * 60 * 60 * 1000) {
                    last12Hours += 1;
                } else if ((Date.now() - comp.timestamp) > 12 * 60 * 60 * 1000 && (Date.now() - comp.timestamp) < 24 * 60 * 60 * 1000) {
                    last24Hours += 1;
                }
            });
            let dispc = {
                "total": completedTR.length,
                "last hour": lastHour,
                "last 12 hours": last12Hours,
                "last 24 hours": last24Hours
            };
            let objJSON = {
                ws: ws.readyState,
                peersNTR: broadcaster.slots,
                numberOfCompleted: dispc,
                numberOfTimedOut: dispto,
                numberOfRequests: workInProgress.length,
                workInProgress: workInProgress
            };
            res.send(objJSON);
        }
    }

    statusDEL(req, res, ws, state) {
        state.workInProgress.length = 0;
        state.timedOut.length = 0;
        state.completedTR.length = 0;
        let dispto = {
            "total": 0,
            "last hour": 0,
            "last 12 hours": 0,
            "last 24 hours": 0
        };
        let dispc = {
            "total": 0,
            "last hour": 0,
            "last 12 hours": 0,
            "last 24 hours": 0
        }
        let objJSON = {
            action: "Deleted workInProgress",
            ws: ws.readyState,
            numberOfCompleted: dispc,
            numberOfTimedOut: dispto,
            numberOfRequests: state.workInProgress.length,
            workInProgress: state.workInProgress
        };
        res.send(objJSON);
    }

    peersGET(req, res, broadcaster) {
        const queueLength = broadcaster.peersQueue.length;
        const queueLength2 = broadcaster.peersQueue.filter((o) => o.ts <= Date.now()).length;
        let reply = {
            version: environment.version,
            status: `${Date().toString().substring(0, 24)} Total nodes in DPT: ${broadcaster.dptSize}, open slots: ${broadcaster.OpenSlots}, queue: ${queueLength} / ${queueLength2}`,
            slots: {
                open: broadcaster.OpenSlots,
                size: broadcaster.peerSize,
                list: broadcaster.slots
            },
            'active peers': {
                maxPeers: broadcaster.maxPeers,
                list: broadcaster.peers
            },
            '_peers': {
                Size: broadcaster.peerSize,
                list: broadcaster._peers
            },
            peersQueue: broadcaster.peersQueue,
            dpt: {
                size: broadcaster.dptSize,
                list: broadcaster.dptList
            },
        }
        res.status(200).send(reply);
    }

    tridsGET(req, res, workInProgress, completedTR, timedOut) {
        let inProgress = [];
        let completed = [];
        let timed = [];
        for (let tr of workInProgress) {
            inProgress.push(tr.transferRequest.transactionID);
        }
        for (let tr of timedOut) {
            timed.push(tr.TR.transferRequest.transactionID);
        }
        for (let tr of completedTR) {
            completed.push(tr.transferRequest.transactionID);
        }
        let reply = {
            "inProgress": inProgress,
            "completed": completed,
            "timedOut": timed
        };
        res.status(200).send(reply);
    }
}

module.exports = routes;
