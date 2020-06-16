const { sendMessage } = require('../utils/index');
const { rooms } = require('../store');
const queueChecker = require('../emitters/queue');
class PeerToPeer {

  onMessage(message, client, userId) {
    const { type, data } = message;
    switch (type) {
      case 'queue':
        queueChecker.emit('new-client-queuing', client, userId);
        break;
      case 'cancel-queue':
        queueChecker.emit('cancel-queue', userId);
        break;
      case 'invitation-response':
        queueChecker.emit('respond-to-invitation', data, userId);
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
}



module.exports = PeerToPeer;
