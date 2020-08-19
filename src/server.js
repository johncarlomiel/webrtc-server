const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const WebSocketServer = require('./models/WebSocketServer');
const { cloneDeep } = require('lodash');
const CronJob = require('cron').CronJob;
const store = require('./configs/store');

var privateKey = fs.readFileSync('cert/localhost-key.pem', 'utf8');
var certificate = fs.readFileSync('cert/localhost-cert.pem', 'utf8');

var credentials = { key: privateKey, cert: certificate };
var app = express();

app.use(express.json());
app.use(cors());

//initialize a simple http server
var httpsServer = https.createServer(credentials, app);

app.get('/', (_, res) => res.json({ message: 'Hello you\'ve reach the root endpoint :) ' }));

app.get('/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = store.rooms.find((room) => room.roomId === roomId);

  if (room) {
    room.participants = room.participants.map((participant) => {
      delete participant.clientWs;
      return participant;
    });
  }

  res.json({ room });
});

const wsServer = new WebSocketServer(httpsServer);
wsServer.initialize();

//start our server
httpsServer.listen(8080, () => console.log('port 8080'));