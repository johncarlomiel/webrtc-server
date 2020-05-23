const uuidv4 = require('uuid/v4');
const uuidv1 = require('uuid/v1');
const events = require('events');
const queueChecker = new events.EventEmitter();

const store = {
  onQueue: [],
  rooms: []
}

function sendMessage(client, payload) {
  client.send(JSON.stringify(payload));
}

queueChecker.on('new client queuing', () => {
  console.log('store.onQueue >> ', store.onQueue.length);
  if (store.onQueue.length >= 2) {
    let newRoom = {};
    const roomId = uuidv4();

    let payload = {
      type: 'received-queue-info'
    }

    store.onQueue = store.onQueue.filter((client, clientIndex) => {
      if (clientIndex === 0) {
        const client1Username = uuidv1();
        newRoom['initiator'] = {
          client,
          username: client1Username
        };
        sendMessage(
          client,
          Object.assign(payload, {
            data: {
              role: 'initiator', roomId, username: client1Username
            }
          })
        );
      }

      if (clientIndex === 1) {
        const client2Username = uuidv1();
        newRoom['receiver'] = {
          client,
          username: client2Username
        };
        sendMessage(
          client,
          Object.assign(payload, {
            data: {
              role: 'receiver', roomId, username: client2Username
            }
          })
        );
      }

      if (clientIndex >= 2) {
        return client;
      }
    });
    store.rooms[roomId] = newRoom;
  }
});

class PeerToPeer {

  onMessage(message, client) {
    const { type, data } = message;
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
    console.log('candidate data', data);
    const oppositeRole = this.getOppositeRole(data.role);
    this.p2pRooms[data.roomId][oppositeRole].send(JSON.stringify({
      type: 'add-candidate',
      data: {
        candidate: data.candidate
      }
    }));
  }

  receiveOffer(data) {
    this.p2pRooms[data.roomId]['receiver'].send(JSON.stringify({
      type: 'offer',
      data: {
        offer: data.offer
      }
    }));
  }

  receiveAnswer(data) {
    this.p2pRooms[data.roomId]['initiator'].send(JSON.stringify({
      type: 'answer',
      data: {
        answer: data.answer
      }
    }));
  }

  //Roles: ['initiator', 'receiver']
  getOppositeRole(role) {
    return role === 'initiator' ? 'receiver' : 'initiator';
  }

  queue(client) {
    store.onQueue.push(client);
    queueChecker.emit('new client queuing');
  }


  matchAcceptOrReject(roomId, username, status) {
    const clients = Object.values(store.rooms[roomId]);
    if (status === 'accept') {
      clients.forEach((client, clientIndex) => {
        if(client.username === username) {
          const role = Object.keys(store.rooms[roomId])[clientIndex];
          store.rooms[roomId][role]['isAccepted'] = true;
        }
      });
    } 

    if(status === 'reject') {
      clients.forEach(client => {
        if(client.username !== username) {
          sendMessage(client, { type: 'break-match' })
        }
      });
    }
  }
}



module.exports = PeerToPeer;
