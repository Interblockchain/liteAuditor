const translib = new (require('translib'))();
const axios = require('axios');

module.exports = class AxiosController {
  constructor() { }

  async axiosGET(route, headers) {
    let responseObj = await axios.get(route, headers)
      .catch(function (error) {
        if (error.response) {
          // The request was made and the server responded with a status code that falls out of the range of 2xx
          // error.response = {status, headers, data}
          if(error.response.status != 304 && route !== "http://142.93.60.68:8082/verifyToken") console.log(`${translib.logTime()} [axiosGET] For ${route}, server responded with ${error.response.status} => ${JSON.stringify(error.response.data)}`);
          throw { name: error.response.name, statusCode: error.response.status, message: error.response.data };
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of http.ClientRequest in node.js
          console.log(`${translib.logTime()} [axiosGET] For ${route}, problem with axios request: No response`);
          throw { name: `Communication Error`, statusCode: 500, message: "No response" };
        } else {
          // Something happened in setting up the request that triggered an Error
          console.log(`${translib.logTime()} [axiosGET] For ${route}, axios setup error: ${error.message}`);
          throw { name: `Server Error`, statusCode: 500, message: error.message };
        }
      });
    // To prevent memory leaks, delete all unused properties from the axios response object
    delete responseObj.res;
    delete responseObj.path;
    delete responseObj.method;
    delete responseObj.socketPath;
    delete responseObj.agent;
    delete responseObj["_onPendingData"];
    delete responseObj.connection;
    delete responseObj["_header"];
    delete responseObj.request;
    delete responseObj.config;
    delete responseObj.headers;
    delete responseObj.statusText;
    delete responseObj.status;
    return responseObj.data;
  }

  async axiosDELETE(route, headers) {
    let responseObj = await axios.delete(route, headers)
      .catch(function (error) {
        if (error.response) {
          // The request was made and the server responded with a status code that falls out of the range of 2xx
          // error.response = {status, headers, data}
          if(error.response.status != 304) console.log(`${translib.logTime()} [axiosDELETE] For ${route}, server responded with ${error.response.status} => ${JSON.stringify(error.response.data)}`);
          throw { name: error.response.name, statusCode: error.response.status, message: error.response.data };
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of http.ClientRequest in node.js
          console.log(`${translib.logTime()} [axiosDELETE] For ${route}, problem with axios request: No response`);
          throw { name: `Communication Error`, statusCode: 500, message: "No response" };
        } else {
          // Something happened in setting up the request that triggered an Error
          console.log(`${translib.logTime()} [axiosDELETE] For ${route}, axios setup error: ${error.message}`);
          throw { name: `Server Error`, statusCode: 500, message: error.message };
        }
      });
    // To prevent memory leaks, delete all unused properties from the axios response object
    delete responseObj.res;
    delete responseObj.path;
    delete responseObj.method;
    delete responseObj.socketPath;
    delete responseObj.agent;
    delete responseObj["_onPendingData"];
    delete responseObj.connection;
    delete responseObj["_header"];
    delete responseObj.request;
    delete responseObj.config;
    delete responseObj.headers;
    delete responseObj.statusText;
    delete responseObj.status;
    return responseObj.data;
  }

  async axiosPOST(route, data, headers) {
    let responseObj = await axios.post(route, data, headers)
      .catch(function (error) {
        if (error.response) {
          // The request was made and the server responded with a status code that falls out of the range of 2xx
          // error.response = {status, headers, data}
          if(error.response.status != 304) console.log(`${translib.logTime()} [axiosPOST] For ${route}, server responded with ${error.response.status} => ${JSON.stringify(error.response.data)}`);
          throw { name: error.response.name, statusCode: error.response.status, message: error.response.data };
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of http.ClientRequest in node.js
          console.log(`${translib.logTime()} [axiosPOST] For ${route}, problem with axios request: No response`);
          throw { name: `Communication Error`, statusCode: 500, message: "No response" };
        } else {
          // Something happened in setting up the request that triggered an Error
          console.log(`${translib.logTime()} [axiosPOST] Axios setup error: ${error.message}`);
          throw { name: `Server Error`, statusCode: 500, message: error.message };
        }
      });
    // To prevent memory leaks, delete all unused properties from the axios response object
    delete responseObj.res;
    delete responseObj.path;
    delete responseObj.method;
    delete responseObj.socketPath;
    delete responseObj.agent;
    delete responseObj["_onPendingData"];
    delete responseObj.connection;
    delete responseObj["_header"];
    delete responseObj.request;
    delete responseObj.config;
    delete responseObj.headers;
    delete responseObj.statusText;
    delete responseObj.status;
    return responseObj.data;
  }

  async axiosPUT(route, data, headers) {
    let responseObj = await axios.put(route, data, headers)
      .catch(function (error) {
        if (error.response) {
          // The request was made and the server responded with a status code that falls out of the range of 2xx
          // error.response = {status, headers, data}
          if(error.response.status != 304) console.log(`${translib.logTime()} [axiosPUT] For ${route}, server responded with ${error.response.status} => ${JSON.stringify(error.response.data)}`);
          throw { name: error.response.name, statusCode: error.response.status, message: error.response.data };
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of http.ClientRequest in node.js
          console.log(`${translib.logTime()} [axiosPUT] For ${route}, problem with axios request: No response`);
          throw { name: `Communication Error`, statusCode: 500, message: "No response" };
        } else {
          // Something happened in setting up the request that triggered an Error
          console.log(`${translib.logTime()} [axiosPUT] Axios setup error: ${error.message}`);
          throw { name: `Server Error`, statusCode: 500, message: error.message };
        }
      });
    // To prevent memory leaks, delete all unused properties from the axios response object
    delete responseObj.res;
    delete responseObj.path;
    delete responseObj.method;
    delete responseObj.socketPath;
    delete responseObj.agent;
    delete responseObj["_onPendingData"];
    delete responseObj.connection;
    delete responseObj["_header"];
    delete responseObj.request;
    delete responseObj.config;
    delete responseObj.headers;
    delete responseObj.statusText;
    delete responseObj.status;
    return responseObj.data;
  }
}