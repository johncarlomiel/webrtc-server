const express = require('express');
const https = require('https');
const fs = require('fs');
const WebSocketServer = require('./models/WebSocketServer');
const CronJob = require('cron').CronJob;


var privateKey  = fs.readFileSync('cert/localhost-key.pem', 'utf8');
var certificate = fs.readFileSync('cert/localhost-cert.pem', 'utf8');

var credentials = {key: privateKey, cert: certificate};
var app = express();

//initialize a simple http server
var httpsServer = https.createServer(credentials, app);

const wsServer = new WebSocketServer(httpsServer);
wsServer.initialize();

//start our server
httpsServer.listen(8080,  () => console.log('port 8080'));