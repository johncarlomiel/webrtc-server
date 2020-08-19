const { sendMessage } = require('../utils/index');
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
      case 'ready-handshake':
        queueChecker.emit('ready-handshake', data, userId);
        break;
      case 'add-candidate':
        queueChecker.emit('add-candidate', data, userId);
        break;
      case 'receive-offer':
        queueChecker.emit('receive-offer', data, userId);
        break;
      case 'receive-answer':
        queueChecker.emit('receive-answer', data, userId);
        break;
      default:
        break;
    }
  }

  onDisconnect(userId) {
    queueChecker.emit('disconnect', userId);
  }
  
}

module.exports = PeerToPeer;
