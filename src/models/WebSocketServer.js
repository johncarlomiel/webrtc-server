const webSocket = require('ws');
const PeerToPeer = require('./PeerToPeer');
const store = require('../configs/store');

class WebSocketServer {
    constructor(httpServer) {
        this.wss = new webSocket.Server({ server: httpServer });
        this.features = {
            peerToPeer: new PeerToPeer()
        }
    }

    initialize() {
        this.wss.on('connection', (ws, req) => {
            const userId = req.headers['sec-websocket-key'];
            store.addClient({ userId, ws });
            ws.on('message', (request) => {
                const parsedRequest = JSON.parse(request);
                this.features[parsedRequest.feature].onMessage(parsedRequest, ws, userId);
            });

            ws.on('close', () => {
                this.features.peerToPeer.onDisconnect(userId);
            });
        });
    }
}

module.exports = WebSocketServer;