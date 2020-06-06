const webSocket = require('ws');
const PeerToPeer = require('./PeerToPeer');

class WebSocketServer {
    constructor(httpServer) {
        this.wss = new webSocket.Server({server:httpServer});
        this.clients = [];
        this.features = {
            peerToPeer: new PeerToPeer()
        }
    }

    initialize(){
        this.wss.on('connection', (ws, req) => {
            var id = req.headers['sec-websocket-key'];
            this.clients[id] = ws;
            ws.on('message', (request) => {
                const parsedRequest = JSON.parse(request);
                this.features[parsedRequest.feature].onMessage(parsedRequest, this.clients[id], id);
            });
        });
    }
}


module.exports = WebSocketServer;