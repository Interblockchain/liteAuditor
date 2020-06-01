const mongoose = require('mongoose');

module.exports = class Database {

  constructor(mongoUser, mongoPsw, mongoHost, mongoDB, mongoPort) {
    const self = this;
    mongoPort = (mongoPort) ? mongoPort : 27017;
    const dbURL = `mongodb://${mongoUser}:${mongoPsw}@${mongoHost}:${mongoPort}/${mongoDB}`;
    console.log(`connecting to MongoDB with : ${dbURL}`);
    mongoose.connect(dbURL, { useNewUrlParser: true, "useUnifiedTopology": true });

    mongoose.connection.on('connected', function () {
      console.log(`Mongoose connected to ${mongoHost}/${mongoDB}`);
    })
    mongoose.connection.on('error', function (err) {
      console.log("Mongoose connection error: " + err);
    })
    mongoose.connection.on('disconnected', function () {
      console.log("Mongoose disconnected");
    })

    // For nodemon restarts
    process.once('SIGUSR2', function () {
      self.gracefulShutdown('nodemon2 restart', function () {
        process.kill(process.pid, 'SIGUSR2');
      });
      // console.log(`nodemon restart ${mongoHost}:${mongoPort}/${mongoDB} after modification`);
      process.kill(process.pid, 'SIGUSR2');
    });

    // For app termination
    process.on('SIGINT', function () {
      self.gracefulShutdown('app termination', function () {
        console.log("\n gracefulShutdown");
        process.exit(0);
      });

      mongoose.connection.close(function () {
        // console.log(`Mongoose disconnected from ${mongoHost}:${mongoPort}/${mongoDB} after app termination`);
        process.exit(0);
      })

    });

  }

  // CAPTURE APP TERMINATION / RESTART EVENTS
  // To be called when process is restarted or terminated
  gracefulShutdown(msg, callback) {
    mongoose.connection.close(function () {
      console.log("Mongoose3 disconnected from " + msg);
      callback();
    })
  }
}
