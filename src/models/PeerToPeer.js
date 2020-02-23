const uuidv4 = require('uuid/v4');
class PeerToPeer {
    constructor() {
        this.onQueue = [];
        this.p2pRooms = { };
    }

    onMessage(message, client) {
        const { type, data } = message;
        console.log(type)
        switch (type) {
            case 'queue':
                this.queue(client);
                break;
            case 'add-candidate':
                this.addCandidate(data);
                break;
            case 'receive-offer':
                this.receiveOffer(data);
                break;
            case 'receive-answer':
                this.receiveAnswer(data);
                break;
            default:
                break;
        }
    }

    addCandidate(data) {
        const oppositeRole = this.getOppositeRole(data.role);
        this.p2pRooms[data.roomId][oppositeRole].send(JSON.stringify({
            type: 'add-candidate',
            candidate: data.message
        }));
    }

    receiveOffer(data) {
        this.p2pRooms[data.roomId]['receiver'].send(JSON.stringify({
            type: 'offer',
            offer: data.offer
        }));
    }

    receiveAnswer(data) {
        this.p2pRooms[data.roomId]['initiator'].send(JSON.stringify({
            type: 'answer',
            answer: data.answer
        }));
    }
    
    //Roles: ['initiator', 'receiver']
    getOppositeRole(role) {
        return role === 'initiator' ? 'receiver' : 'initiator';
    }

    queue(client) {
        this.onQueue.push(client);
        if (this.onQueue.length === 2) {
            let newRoom = {};
            const roomId = uuidv4();
            let payload = {
                type: 'received-queue-info'
            }
            this.onQueue = this.onQueue.filter((client, clientIndex) => {
                if (clientIndex === 0) {
                    newRoom['initiator'] = client;
                    this.sendMessage(
                        client,
                        Object.assign(payload, { role: 'initiator', roomId})
                    );
                }

                if (clientIndex === 1) {
                    newRoom['receiver'] = client;
                    this.sendMessage(
                        client,
                        Object.assign(payload, { role: 'receiver', roomId })
                    );
                }

                if (clientIndex >= 2) {
                    return client;
                }
            });
            this.p2pRooms[roomId] = newRoom;
        }
    }

    sendMessage(client, payload) {
        client.send(JSON.stringify(payload));
    }
}

module.exports = PeerToPeer;
