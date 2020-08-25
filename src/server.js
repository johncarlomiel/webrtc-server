const express = require('express');
const http = require('http');
const cors = require('cors');
const WebSocketServer = require('./models/WebSocketServer');
const store = require('./configs/store');

const app = express();

app.use(express.json());
app.use(cors());

//initialize a simple http server
const httpServer = http.createServer(app);

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

const wsServer = new WebSocketServer(httpServer);
wsServer.initialize();

//start our server
httpServer.listen(8080, () => console.log('port 8080'));